import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase'
import { ENTITLEMENT_ENFORCE, getAskRemaining } from '@/lib/entitlement'
import { RATE_LIMIT_ENFORCE, checkRateLimit, clientKey, rateLimitedBody, USER_RULES, ASK_RULES } from '@/lib/rateLimit'
import { checkAiBudget } from '@/lib/aiBudget'
import type { AnalyzableChart } from '@/lib/analysis'
import {
  classifyAskQuestion,
  refusalText,
  generateAskAnswer,
  ASK_DISCLAIMER,
  ASK_FALLBACK_TEXT,
  ASK_MAX_QUESTION_LEN,
} from '@/lib/aiAsk'
import { localeFromRequest } from '@/lib/locale'

// AI 追问（ask_pack）—— 单条问答端点。写入走 service_role；额度判定走 entitlement 单一事实源。
//
// ★ 顺序（成本与合规优先）：
//   ① 校验 token / 参数 → ② 付费内容门槛（未买过任何东西 → 403）
//   → ③ 【调 AI 之前】硬拒答判定（命中直接返回，不调 AI、不扣额）
//   → ④ ENFORCE 开启时额度硬校验（≤0 返 402）→ ⑤ 生成（AI + 合规重试）→ ⑥ 成功才写 ask_messages、扣 1 次。
// ★ ENTITLEMENT_ENFORCE=false（生产默认/内测）：只记录、不拦额度（结构就位），与全站口径一致。
//   开启（收费）后才按剩余次数硬校验——此为刻意选择，非疏漏。
// ★ 付费内容门槛不受 ENFORCE 影响（2026-10-21 用户口径）：追问与付费内容绑定，
//   只要有任一付费内容（会员 / 任一报告 / 追问包）即可追问，否则不开放入口。

/** 追问剩余次数（供面板展示；GET 走此路径） */
export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token')
    if (!token) return NextResponse.json({ error: '缺少 token' }, { status: 400 })
    const admin = createServerSupabase()
    const { data: { user }, error } = await admin.auth.getUser(token)
    if (error || !user) return NextResponse.json({ error: '登录无效，请重新登录' }, { status: 401 })
    const quota = await getAskRemaining(admin, user.id)
    // ★ enforced 一并下发（2026-10-21）：前端据此决定「剩余 0 时是否显示购买入口」。
    //   内测期 ENFORCE=false ⇒ 额度为 0 也能照常提问，此时不该催用户买；
    //   开关口径仍以本文件（服务端）为单一事实源，前端不自行判断 env。
    // ★ 明细一并下发：会员每月额度 / 报告赠送 / 已购追问包分开，便于前端展示来源。
    //   allowed=是否买过任意付费内容（前端据此决定是否渲染追问面板）。
    return NextResponse.json({
      remaining: quota.total,
      memberRemaining: quota.member,
      reportRemaining: quota.report,
      inviteRemaining: quota.invite,
      packRemaining: quota.pack,
      allowed: quota.allowed,
      enforced: ENTITLEMENT_ENFORCE,
    })
  } catch (e) {
    console.error('追问额度查询失败:', e)
    return NextResponse.json({ error: '追问额度查询失败' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, chartId, chart, question } = body
    // 输出语言：body.locale ＞ cookie ＞ 默认简体；追问应与所问那份报告同语言
    const locale = localeFromRequest(request, body)

    if (!token) return NextResponse.json({ error: '缺少 token' }, { status: 400 })
    if (!chart?.input || !chart?.pillars) {
      return NextResponse.json({ error: '缺少命盘数据（追问需围绕一份命盘）' }, { status: 400 })
    }
    const q = typeof question === 'string' ? question.trim() : ''
    if (!q) return NextResponse.json({ error: '请输入你的问题' }, { status: 400 })
    if (q.length > ASK_MAX_QUESTION_LEN) {
      return NextResponse.json({ error: `问题过长（最多 ${ASK_MAX_QUESTION_LEN} 字）` }, { status: 400 })
    }

    const admin = createServerSupabase()
    const { data: { user }, error: authError } = await admin.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: '登录无效，请重新登录' }, { status: 401 })

    const quota = await getAskRemaining(admin, user.id)

    // ★ 付费内容门槛（2026-10-21）：追问与付费内容绑定——会员 / 任一报告 / 追问包，
    //   买过任意一项才开放。未买过 → 403，不调 AI、不扣额、不留痕。
    if (!quota.allowed) {
      return NextResponse.json(
        {
          error: '追问需先购买任一报告、开通会员，或邀请好友注册',
          code: 'ASK_REQUIRES_PAID',
          remaining: 0,
        },
        { status: 403 }
      )
    }

    // ★ 速率限制（token 防盗用第二档）：默认关闭（内测放行）；开启后按 u:<id> 固定窗口计数，超限返 429。
    //   与其它 AI 端点共用 ai_user_min/ai_user_day 桶 ⇒ 全站每用户 AI 总频次共享（5/分 + 50/日）；
    //   另叠加 ai_ask_day（30/日）单独收紧追问——追问额度可囤积，不与长报告挤占同一日额度。
    const rl = await checkRateLimit(admin, clientKey(user.id, request), [...ASK_RULES, ...USER_RULES])
    if (!rl.allowed) return NextResponse.json(rateLimitedBody(rl), { status: 429 })

    // ③ 硬拒答：在调用 AI 之前判定（零成本、可逐条审核、不扣额度）
    const refusedCategory = classifyAskQuestion(q)
    if (refusedCategory) {
      return NextResponse.json({
        answer: refusalText(refusedCategory),
        disclaimer: ASK_DISCLAIMER,
        refused: true,
        category: refusedCategory,
        remaining: quota.total,
      })
    }

    // ④ 额度硬校验（仅 ENFORCE 开启时）
    if (ENTITLEMENT_ENFORCE && quota.total <= 0) {
      return NextResponse.json(
        {
          error: '追问次数已用完，可购买追问包继续提问',
          code: 'ASK_QUOTA_EXHAUSTED',
          remaining: 0,
        },
        { status: 402 }
      )
    }

    // ★★ 全局日预算熔断（token 防盗用第三档）：超额 → 全站当日降级（不调 AI、不扣额，返兜底话术）。
    //   置于拒答/额度校验【之后】—— 拒答与额度不足本就不调 AI，无需计入预算。
    const budget = await checkAiBudget(admin, Date.now())
    if (budget.exhausted) {
      return NextResponse.json({
        answer: ASK_FALLBACK_TEXT,
        disclaimer: ASK_DISCLAIMER,
        failed: true,
        remaining: quota.total,
      })
    }

    // ⑤ 生成（AI + 合规重试）；失败 → 合规兜底、不扣额
    const answer = await generateAskAnswer(chart as AnalyzableChart, q, { locale })
    if (!answer) {
      return NextResponse.json({
        answer: ASK_FALLBACK_TEXT,
        disclaimer: ASK_DISCLAIMER,
        failed: true,
        remaining: quota.total,
      })
    }

    // ⑥ 成功才落库（本表行数 === 已消耗次数）；拒答/失败不落行、不扣额
    // ★ 来源标记（2026-10-21）：会员本月 → 报告赠送 → 邀请奖励 → 追问包，依次扣减。
    //   额度重算完全依赖本列：pack/report/invite 终身累计、member 只计本自然月。
    const creditSource =
      quota.member > 0 ? 'member' : quota.report > 0 ? 'report' : quota.invite > 0 ? 'invite' : 'pack'
    const { error: insertError } = await admin.from('ask_messages').insert({
      user_id: user.id,
      chart_id: chartId ?? null,
      question: q,
      answer,
      credit_source: creditSource,
    })
    // ★ 落库失败不阻断用户拿到答案（但留痕）；next 次 remaining 会据表重新派生
    if (insertError) console.error('追问落库失败:', insertError.code, insertError.message)

    return NextResponse.json({
      answer,
      disclaimer: ASK_DISCLAIMER,
      remaining: Math.max(0, quota.total - 1),
      // ★ 明细随扣减更新：本次扣的是会员额度 / 报告赠送 / 追问包，前端据此刷新展示
      memberRemaining: Math.max(0, quota.member - (creditSource === 'member' ? 1 : 0)),
      reportRemaining: Math.max(0, quota.report - (creditSource === 'report' ? 1 : 0)),
      inviteRemaining: Math.max(0, quota.invite - (creditSource === 'invite' ? 1 : 0)),
      packRemaining: Math.max(0, quota.pack - (creditSource === 'pack' ? 1 : 0)),
    })
  } catch (e) {
    console.error('追问失败:', e)
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: `追问失败：${msg}` }, { status: 500 })
  }
}
