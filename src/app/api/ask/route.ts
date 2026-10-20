import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase'
import { ENTITLEMENT_ENFORCE, getAskRemaining } from '@/lib/entitlement'
import { RATE_LIMIT_ENFORCE, checkRateLimit, clientKey, rateLimitedBody, USER_RULES } from '@/lib/rateLimit'
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

// AI 追问（ask_pack）—— 单条问答端点。写入走 service_role；额度判定走 entitlement 单一事实源。
//
// ★ 顺序（成本与合规优先）：
//   ① 校验 token / 参数 → ② 【调 AI 之前】硬拒答判定（命中直接返回，不调 AI、不扣额）
//   → ③ ENFORCE 开启时额度硬校验（≤0 返 402）→ ④ 生成（AI + 合规重试）→ ⑤ 成功才写 ask_messages、扣 1 次。
// ★ ENTITLEMENT_ENFORCE=false（生产默认/内测）：只记录、不拦额度（结构就位），与全站口径一致。
//   开启（收费）后才按剩余次数硬校验——此为刻意选择，非疏漏。

/** 追问剩余次数（供面板展示；GET 走此路径） */
export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token')
    if (!token) return NextResponse.json({ error: '缺少 token' }, { status: 400 })
    const admin = createServerSupabase()
    const { data: { user }, error } = await admin.auth.getUser(token)
    if (error || !user) return NextResponse.json({ error: '登录无效，请重新登录' }, { status: 401 })
    const remaining = await getAskRemaining(admin, user.id)
    // ★ enforced 一并下发（2026-10-21）：前端据此决定「剩余 0 时是否显示购买入口」。
    //   内测期 ENFORCE=false ⇒ 额度为 0 也能照常提问，此时不该催用户买；
    //   开关口径仍以本文件（服务端）为单一事实源，前端不自行判断 env。
    return NextResponse.json({ remaining, enforced: ENTITLEMENT_ENFORCE })
  } catch (e) {
    console.error('追问额度查询失败:', e)
    return NextResponse.json({ error: '追问额度查询失败' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { token, chartId, chart, question } = await request.json()

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

    const remaining = await getAskRemaining(admin, user.id)

    // ★ 速率限制（token 防盗用第二档）：默认关闭（内测放行）；开启后按 u:<id> 固定窗口计数，超限返 429。
    //   与其它 AI 端点共用 ai_user_min/ai_user_day 桶 ⇒ 全站每用户 AI 总频次共享（5/分 + 50/日）。
    const rl = await checkRateLimit(admin, clientKey(user.id, request), USER_RULES)
    if (!rl.allowed) return NextResponse.json(rateLimitedBody(rl), { status: 429 })

    // ② 硬拒答：在调用 AI 之前判定（零成本、可逐条审核、不扣额度）
    const refusedCategory = classifyAskQuestion(q)
    if (refusedCategory) {
      return NextResponse.json({
        answer: refusalText(refusedCategory),
        disclaimer: ASK_DISCLAIMER,
        refused: true,
        category: refusedCategory,
        remaining,
      })
    }

    // ③ 额度硬校验（仅 ENFORCE 开启时）
    if (ENTITLEMENT_ENFORCE && remaining <= 0) {
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
        remaining,
      })
    }

    // ④ 生成（AI + 合规重试）；失败 → 合规兜底、不扣额
    const answer = await generateAskAnswer(chart as AnalyzableChart, q)
    if (!answer) {
      return NextResponse.json({
        answer: ASK_FALLBACK_TEXT,
        disclaimer: ASK_DISCLAIMER,
        failed: true,
        remaining,
      })
    }

    // ⑤ 成功才落库（本表行数 === 已消耗次数）；拒答/失败不落行、不扣额
    const { error: insertError } = await admin.from('ask_messages').insert({
      user_id: user.id,
      chart_id: chartId ?? null,
      question: q,
      answer,
    })
    // ★ 落库失败不阻断用户拿到答案（但留痕）；next 次 remaining 会据表重新派生
    if (insertError) console.error('追问落库失败:', insertError.code, insertError.message)

    return NextResponse.json({
      answer,
      disclaimer: ASK_DISCLAIMER,
      remaining: Math.max(0, remaining - 1),
    })
  } catch (e) {
    console.error('追问失败:', e)
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: `追问失败：${msg}` }, { status: 500 })
  }
}
