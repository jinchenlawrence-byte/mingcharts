import { NextRequest, NextResponse } from 'next/server'
import { paipanZiwei, analyzeZiwei } from '@/lib/ziwei'
import { generateAIZiwei, fallbackZiweiText } from '@/lib/aiZiwei'
import { checkDSTTransition } from '@/lib/solarTime'
import { resolveBirthFromBody } from '@/lib/birthRequest'
import { getEntitlements, canView, EMPTY_ENTITLEMENTS } from '@/lib/entitlement'
import { createServerSupabase } from '@/lib/supabase'
import { saveReport, deriveReportTitle } from '@/lib/reportSave'
import { stripEntitlementState, reportCacheKey, ZIWEI_CACHE_VERSION } from '@/lib/reportCache'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const toInt = (v: unknown, def = 0): number => {
      if (v === undefined || v === null || v === '') return def
      const n = parseInt(String(v), 10)
      return Number.isNaN(n) ? def : n
    }

    const year = toInt(body.year, -1)
    const month = toInt(body.month, -1)
    const day = toInt(body.day, -1)
    const hour = toInt(body.hour)
    const minute = toInt(body.minute)
    const gender: 1 | 0 = body.gender === 1 || body.gender === '1' ? 1 : 0

    if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) {
      return NextResponse.json(
        { error: `日期不合法：${year}-${month}-${day}` },
        { status: 400 }
      )
    }
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
      return NextResponse.json(
        { error: `时间不合法：${hour}:${minute}` },
        { status: 400 }
      )
    }

    // 出生地：城市 id / 旧版城市名 / 手动时区；共用 birthRequest 解析
    const birth = await resolveBirthFromBody(
      { year, month, day, hour, minute },
      body
    )
    if (birth.error) {
      return NextResponse.json({ error: birth.error }, { status: 400 })
    }
    const { ref, city } = birth.data!

    // 排盘 → 规则分析 → AI 解读（失败回退规则版）
    const chart = paipanZiwei({
      year, month, day, hour, minute, gender,
      birthLng: ref?.lng,
      birthZone: ref?.zone
    })
    const analysis = analyzeZiwei(chart, new Date())
    const aiReport = await generateAIZiwei(chart, analysis)

    // ★ 门禁判定统一走 entitlement（§8.5.1）
    const token = typeof body.token === 'string' ? body.token : ''
    let ent = EMPTY_ENTITLEMENTS
    if (token) {
      const admin = createServerSupabase()
      const { data: { user } } = await admin.auth.getUser(token)
      if (user) ent = await getEntitlements(admin, user.id)
    }
    const unlocked = canView(ent, 'ziwei_deep')
    // ★ 全量 AI 文本（无条件生成，见上）；门禁只作用于【响应】，不作用于【入库】——
    //   入库置空会让付费用户回看「我的报告」永远读到锁定版（2026-10-18 真实事故）。
    const rawAi = aiReport || fallbackZiweiText(chart, analysis)
    const rawAiSource = aiReport ? 'AI 深度解读' : '规则版（AI结果未过合规校验）'
    const ai = unlocked ? rawAi : null
    const aiSource = !unlocked ? '未解锁' : rawAiSource
    const dstNotice = ref ? checkDSTTransition(ref.zone, { year, month, day, hour, minute }) : null

    const data = {
      chart,
      analysis,
      // ★ free 层保留结构化星盘数据；ai 在未解锁时为 null
      free: { chart, analysis },
      locked: unlocked ? null : {
        skus: ['ziwei_deep'],
        preview: '紫微十二宫深度解读（命格总论、事业、财运、感情、健康、大限流年）解锁后可见。'
      },
      ai,
      aiSource,
      trueSolar: ref
        ? {
            birthplace: city?.name || null,
            lng: ref.lng,
            zone: ref.zone,
            offsetMin: chart.timezoneOffsetApplied,
            dstNotice: dstNotice?.message || null
          }
        : null
    }

    // 登录用户：报告作为账户资产自动保存（静默降级，不阻断主流程）
    // ★ 入库只存【内容】（2026-10-18）：locked 剥掉、ai 存全量全文 ——
    //   读取侧按当前权益重算（详情页 reportGate.gateReportForDetail），试吃→付费即刻生效。
    //   cacheKey 覆盖写：同一 (user_id, kind, cache_key) 只保留一行，重复点击不堆积。
    // ★ 出生地/城市入键（原则②）：真太阳时与城市不同则内容不同，键不入会互相覆盖（丢报告）
    const reportInput = {
      year, month, day, hour, minute, gender,
      birthZone: ref?.zone ?? null,
      birthLng: ref?.lng ?? null,
      birthCity: city?.name ?? null
    }
    const reportId = await saveReport(token || undefined, {
      kind: 'ziwei',
      title: deriveReportTitle('ziwei', reportInput),
      input: reportInput,
      result: { ...stripEntitlementState(data), ai: rawAi, aiSource: rawAiSource } as never,
      cacheKey: reportCacheKey('ziwei', ZIWEI_CACHE_VERSION, reportInput)
    })

    return NextResponse.json({ success: true, data, reportId })
  } catch (error) {
    console.error('紫微排盘错误:', error)
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: `紫微排盘失败：${msg}` },
      { status: 500 }
    )
  }
}
