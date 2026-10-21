import { NextRequest, NextResponse } from 'next/server'
import { paipan, getWangShuai } from '@/lib/paipan'
import { analyzeGeo } from '@/lib/geo'
import citiesData from '@/data/geo-cities.json'
import { checkDSTTransition } from '@/lib/solarTime'
import { resolveBirthFromBody } from '@/lib/birthRequest'
import { findCityById } from '@/lib/worldCitiesServer'
import { generateAIGeo, fallbackGeoText } from '@/lib/aiGeo'
import { tiaoHouWuxing } from '@/lib/analysis'
import { getEntitlements, EMPTY_ENTITLEMENTS } from '@/lib/entitlement'
import { reportUnlocked, previewPayload } from '@/lib/reportPreview'
import { createServerSupabase } from '@/lib/supabase'
import type { SupabaseClient } from '@supabase/supabase-js'
import { RATE_LIMIT_ENFORCE, checkRateLimit, clientKey, rateLimitedBody, USER_RULES } from '@/lib/rateLimit'
import { checkAiBudget } from '@/lib/aiBudget'
import { saveReport, deriveReportTitle } from '@/lib/reportSave'
import { stripEntitlementState, reportCacheKey, readReportCache, resolveModuleCachedHit, GEO_CACHE_VERSION } from '@/lib/reportCache'
import type { WX } from '@/lib/geo'

/** 未解锁时的 preview（入库剥离、命中重算时共用，避免两处文案漂移） */
const GEO_LOCKED_PREVIEW = '方位总论 · 现居城市影响 · 财富/事业/贵/安居/才华五城解读 · 迁居开运建议（AI 深度解读，共 8 节）解锁后可见。'

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

    // 出生地：城市 id / 旧版城市名 / 手动时区（含进阶经度）；与其它入口共用同一解析
    const birth = await resolveBirthFromBody(
      { year, month, day, hour, minute },
      body
    )
    if (birth.error) {
      return NextResponse.json({ error: birth.error }, { status: 400 })
    }
    const { ref, city } = birth.data!

    // 排盘 → 旺衰（地理分析的喜忌基准）；偏移在 paipan 内按 tzdata 历史值计算
    const chart = paipan({
      year, month, day, hour, minute, gender,
      birthLng: ref?.lng,
      birthZone: ref?.zone
    })
    const wangShuai = getWangShuai(chart)

    // 夏令时切换点检测（gap/重复时刻），仅作提示
    const dstNotice = ref ? checkDSTTransition(ref.zone, { year, month, day, hour, minute }) : null

    // 相对方位：仅当选中具体城市时有意义（仅时区无坐标，不做方位分析；但真太阳时仍校正）
    const birthplace = city

    // 现居城市（可选；评估当前居住地影响）。
    //   新路径：currentCityId → 全球库（3.2 万城，前端搜索选择）；
    //   兼容旧客户端：currentCity 名称 → 旧推荐库精确匹配。
    let currentCity: { name: string; lat: number; lng: number } | null = null
    const currentCityId = typeof body.currentCityId === 'string' ? body.currentCityId.trim() : ''
    if (currentCityId) {
      const c = await findCityById(currentCityId)
      if (c) currentCity = { name: c.name, lat: c.lat, lng: c.lng }
    } else {
      const currentName = typeof body.currentCity === 'string' ? body.currentCity.trim() : ''
      const currentRef =
        (citiesData as unknown as Array<{ name: string; lat: number; lng: number }>).find(
          (c) => c.name === currentName
        )
      if (currentRef) currentCity = { name: currentRef.name, lat: currentRef.lat, lng: currentRef.lng }
    }

    // ★ 身份/门禁先解析（§8.5.1 单一判定）——先于 AI 调用，供下方成本护栏使用。
    // ★ 报告门禁按【是否持有 SKU】判定（reportUnlocked → grantsCover），不依赖 ENTITLEMENT_ENFORCE：
    //   未购用户一律进入试读（现居城市/事业之城全文 + 其余锁定 + 不生成 AI）。
    const token = typeof body.token === 'string' ? body.token : ''
    let ent = EMPTY_ENTITLEMENTS
    let userId: string | null = null
    let admin: SupabaseClient | null = null
    if (token) {
      admin = createServerSupabase()
      const { data: { user } } = await admin.auth.getUser(token)
      if (user) { userId = user.id; ent = await getEntitlements(admin, user.id) }
    }
    const unlocked = reportUnlocked(ent, 'geo')

    // ★ 报告缓存短路读取（token 防盗用第三档）：登录用户的【同参数重复请求】直接命中存量全文，
    //   零 AI、零限流、零预算（必须放在限流/预算/AI 之前）。命中处置全在纯函数 resolveModuleCachedHit：
    //   只短路【真·AI 结果】（aiSource='AI 深度解读'）—— AI 失败/当日预算熔断写下的规则兜底视为未命中，
    //   重新生成并覆盖（缓存自愈），绝不把降级内容永久留给用户（否则「继续做」会伤到用户）。
    //   ★ 出生地与现居城市入键（原则②）：地理报告依赖两者，键不入会互相覆盖（丢报告）。
    const reportInput = {
      year, month, day, hour, minute, gender,
      birthZone: ref?.zone ?? null,
      birthLng: ref?.lng ?? null,
      birthCity: city?.name ?? null,
      currentCity: currentCity?.name ?? null
    }
    const cacheKey = reportCacheKey('geo', GEO_CACHE_VERSION, reportInput)
    if (userId && admin) {
      const hit = await readReportCache(admin, userId, 'geo', cacheKey)
      const resolved = hit
        ? resolveModuleCachedHit(hit, { unlocked, skus: ['geo'], lockedPreview: GEO_LOCKED_PREVIEW })
        : null
      if (resolved) {
        // ★ 缓存命中也要带同一试读标记，避免免费用户从存量全文缓存拿到完整渲染路径
        const data = { ...resolved.data, preview: previewPayload('geo', unlocked) }
        return NextResponse.json({ success: true, data, reportId: resolved.reportId, cached: true })
      }
    }

    // ★ 速率限制（token 防盗用第二档）：默认关闭（内测放行）；开启后按 u:<id>/ip:<hash> 固定窗口计数，
    //   超限返 429。放在 AI 生成【之前】—— 只有真要生成时才算额度（借阅见下 unlocked/userId 守卫）。
    const rl = await checkRateLimit(
      admin ?? (RATE_LIMIT_ENFORCE ? createServerSupabase() : null),
      clientKey(userId, request),
      USER_RULES
    )
    if (!rl.allowed) return NextResponse.json(rateLimitedBody(rl), { status: 429 })

    // 规则引擎 → AI 解读（失败回退规则版）
    const analysis = analyzeGeo({
      dayMaster: chart.dayMaster,
      wangShuai,
      // 调候用神五行（《穷通宝鉴》）：月令 → 气候之药，参与城市评分
      tiaoHou: tiaoHouWuxing(chart.dayMaster, chart.pillars.month.zhi) as WX[],
      birthplace,
      currentCity
    })
    // ★★ 全局日预算熔断（token 防盗用第三档）：仅【真要生成 AI】时检查（不生成则不计、不拦）。
    //   超额 → 全站当日降级为规则版（200 无 AI 文本，区别于限流的 429），次日恢复；
    //   基建故障（计数/DAU 查询失败）→ 放行（fail-open，不因基建故障阻断业务）。
    const budget = userId ? await checkAiBudget(admin, Date.now()) : null
    const aiBlocked = budget?.exhausted ?? false
    // ★★ 成本护栏（token 防盗用第一档）：仅【登录用户】才生成 AI ——
    //   匿名（含外部脚本）不再触发本端点的 AI 调用（无账号、命中不了缓存，是最大敞口）；
    //   登录用户照常全量生成并入库全文，回看者必然已登录 ⇒ 不触「回看读到锁定版」事故。
    // ★ 未解锁（试读）不调 AI：8 节全文不下发，未购用户不再产生成本。
    const aiReport = userId && unlocked && !aiBlocked ? await generateAIGeo(analysis) : null

    // ★ 入库只存【内容】（locked 剥掉、ai 存全量全文）；门禁只作用于【响应】——
    //   读取侧按当前权益重算（详情页 reportGate），试吃→付费即刻生效。
    const rawAi = aiReport || fallbackGeoText(analysis)
    const rawAiSource = aiReport ? 'AI 深度解读'
      : aiBlocked ? '规则版（当日 AI 额度已用尽，次日恢复）'
      : userId ? '规则版（AI结果未过合规校验）'
      : '规则版（登录后可见 AI 深度解读）'
    // ★ free 层保留结构化城市推荐与指数（试吃本意）；ai 在未解锁时为 null
    const ai = unlocked ? rawAi : null
    const aiSource = !unlocked ? '未解锁' : rawAiSource

    const data = {
      chart: { ...chart, analysis: { wangShuai, isPaid: false } },
      geo: analysis,
      // ★ free 层保留【结构化的城市推荐与指数】—— 这是"试吃"：让用户看到有什么
      free: {
        chart: { ...chart, analysis: { wangShuai, isPaid: false } },
        geo: analysis
      },
      // ★★ locked 在已解锁时为 null（与现在一致 ✓）；未解锁时给 preview 与 skus
      locked: unlocked ? null : {
        skus: ['geo'],
        preview: GEO_LOCKED_PREVIEW
      },
      preview: previewPayload('geo', unlocked),
      trueSolar: ref
        ? {
            birthplace: city?.name || null,
            lng: ref.lng,
            zone: ref.zone,
            offsetMin: chart.timezoneOffsetApplied,
            dstNotice: dstNotice?.message || null
          }
        : null,
      ai,
      aiSource
    }

    // 登录用户：报告作为账户资产自动保存（静默降级，不阻断主流程）
    // ★ 入库只存【内容】（2026-10-18）：locked 剥掉、ai 存全量全文 ——
    //   读取侧按当前权益重算（详情页 reportGate.gateReportForDetail），试吃→付费即刻生效。
    // ★ reportInput / cacheKey 已在读取短路前构造（出生地与现居城市入键，原则②）。
    const reportId = await saveReport(token || undefined, {
      kind: 'geo',
      title: deriveReportTitle('geo', reportInput),
      input: reportInput,
      result: { ...stripEntitlementState(data), ai: rawAi, aiSource: rawAiSource } as never,
      cacheKey
    })

    return NextResponse.json({ success: true, data, reportId })
  } catch (error) {
    console.error('地理位置解析错误:', error)
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: `地理位置解析失败：${msg}` },
      { status: 500 }
    )
  }
}
