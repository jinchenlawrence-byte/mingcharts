import { NextRequest, NextResponse } from 'next/server'
import { paipanZiwei, analyzeZiwei } from '@/lib/ziwei'
import { generateAIZiwei, fallbackZiweiText } from '@/lib/aiZiwei'
import { checkDSTTransition } from '@/lib/solarTime'
import { resolveBirthFromBody } from '@/lib/birthRequest'
import { getEntitlements, EMPTY_ENTITLEMENTS } from '@/lib/entitlement'
import { reportUnlocked, previewPayload } from '@/lib/reportPreview'
import { createServerSupabase } from '@/lib/supabase'
import type { SupabaseClient } from '@supabase/supabase-js'
import { RATE_LIMIT_ENFORCE, checkRateLimit, clientKey, rateLimitedBody, USER_RULES } from '@/lib/rateLimit'
import { checkAiBudget } from '@/lib/aiBudget'
import { saveReport, deriveReportTitle } from '@/lib/reportSave'
import { stripEntitlementState, reportCacheKey, readReportCache, resolveModuleCachedHit, ZIWEI_CACHE_VERSION } from '@/lib/reportCache'

/** 未解锁时的 preview（入库剥离、命中重算时共用，避免两处文案漂移） */
const ZIWEI_LOCKED_PREVIEW = '紫微十二宫深度解读（命格、性格、十二宫导读、事业、财运、婚姻、健康、生年四化、格局成败、大限十年、流年流月、趋避建议）解锁后可见。'

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
    // ★ 身份/门禁先解析（§8.5.1 单一判定）——先于 AI 调用，供下方成本护栏使用。
    // ★ 报告门禁按【是否持有 SKU】判定（reportUnlocked → grantsCover），不依赖 ENTITLEMENT_ENFORCE：
    //   未购用户一律进入试读（免费板块全文 + 其余锁定 + 不生成 AI）。
    const token = typeof body.token === 'string' ? body.token : ''
    let ent = EMPTY_ENTITLEMENTS
    let userId: string | null = null
    let admin: SupabaseClient | null = null
    if (token) {
      admin = createServerSupabase()
      const { data: { user } } = await admin.auth.getUser(token)
      if (user) { userId = user.id; ent = await getEntitlements(admin, user.id) }
    }
    const unlocked = reportUnlocked(ent, 'ziwei_deep')

    // ★ 报告缓存短路读取（token 防盗用第三档）：登录用户的【同参数重复请求】直接命中存量全文，
    //   零 AI、零限流、零预算（放在限流/预算/AI 之前）。命中处置全在 resolveModuleCachedHit：
    //   只短路【真·AI 结果】—— AI 失败/预算熔断的规则兜底视为未命中 → 重生成覆盖（缓存自愈）。
    //   ★ 本模块每盘 12 次 AI 调用，是缓存收益最大、也最该保护的路径。
    // ★ 出生地/城市入键（原则②）：真太阳时与城市不同则内容不同，键不入会互相覆盖（丢报告）。
    const reportInput = {
      year, month, day, hour, minute, gender,
      birthZone: ref?.zone ?? null,
      birthLng: ref?.lng ?? null,
      birthCity: city?.name ?? null
    }
    const cacheKey = reportCacheKey('ziwei', ZIWEI_CACHE_VERSION, reportInput)
    if (userId && admin) {
      const hit = await readReportCache(admin, userId, 'ziwei', cacheKey)
      const resolved = hit
        ? resolveModuleCachedHit(hit, { unlocked, skus: ['ziwei_deep'], lockedPreview: ZIWEI_LOCKED_PREVIEW })
        : null
      if (resolved) {
        // ★ 缓存命中也要带同一试读标记，避免免费用户从存量全文缓存拿到完整渲染路径
        const data = { ...resolved.data, preview: previewPayload('ziwei_deep', unlocked) }
        return NextResponse.json({ success: true, data, reportId: resolved.reportId, cached: true })
      }
    }

    // ★ 速率限制（token 防盗用第二档）：默认关闭（内测放行）；开启后按 u:<id>/ip:<hash> 固定窗口计数，
    //   超限返 429。放在 AI 生成【之前】（本模块每盘 12 次调用，是最贵的路径之一）。
    const rl = await checkRateLimit(
      admin ?? (RATE_LIMIT_ENFORCE ? createServerSupabase() : null),
      clientKey(userId, request),
      USER_RULES
    )
    if (!rl.allowed) return NextResponse.json(rateLimitedBody(rl), { status: 429 })

    const analysis = analyzeZiwei(chart, new Date())
    // ★★ 全局日预算熔断（token 防盗用第三档）：仅【真要生成 AI】时检查（不生成则不计、不拦）。
    //   超额 → 全站当日降级为规则版（200 无 AI 文本，区别于限流的 429），次日恢复；
    //   基建故障 → 放行（fail-open）。本模块每盘 12 次调用，是预算熔断的重点保护对象。
    const budget = userId ? await checkAiBudget(admin, Date.now()) : null
    const aiBlocked = budget?.exhausted ?? false
    // ★★ 成本护栏（token 防盗用第一档）：仅【登录用户】才生成 AI（本模块每盘 12 次调用）——
    //   匿名（含外部脚本）不再触发；登录用户照常全量生成并入库，回看者必然已登录 ⇒ 不触回看事故。
    // ★ 未解锁（试读）不调 AI：本模块每盘 12 次调用，未购用户不再产生成本。
    const aiReport = userId && unlocked && !aiBlocked ? await generateAIZiwei(chart, analysis) : null

    // ★ 入库只存【内容】（locked 剥掉、ai 存全量全文）；门禁只作用于【响应】——
    //   读取侧按当前权益重算（详情页 reportGate），试吃→付费即刻生效。
    const rawAi = aiReport || fallbackZiweiText(chart, analysis)
    const rawAiSource = aiReport ? 'AI 深度解读'
      : aiBlocked ? '规则版（当日 AI 额度已用尽，次日恢复）'
      : userId ? '规则版（AI结果未过合规校验）'
      : '规则版（登录后可见 AI 深度解读）'
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
        preview: ZIWEI_LOCKED_PREVIEW
      },
      preview: previewPayload('ziwei_deep', unlocked),
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
    // ★ reportInput / cacheKey 已在读取短路前构造（出生地/城市入键，原则②）。
    const reportId = await saveReport(token || undefined, {
      kind: 'ziwei',
      title: deriveReportTitle('ziwei', reportInput),
      input: reportInput,
      result: { ...stripEntitlementState(data), ai: rawAi, aiSource: rawAiSource } as never,
      cacheKey
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
