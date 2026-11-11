import { NextRequest, NextResponse } from 'next/server'
import { paipan, getWangShuai, getGeJu } from '@/lib/paipan'
import type { PaipanInput } from '@/lib/paipan'
import { hehun } from '@/lib/hemun'
import { generateAIHemun, fallbackHemunText } from '@/lib/aiHemun'
import type { AnalyzableChart } from '@/lib/analysis'
import { checkDSTTransition } from '@/lib/solarTime'
import { resolveBirthFromBody } from '@/lib/birthRequest'
import { getEntitlements, EMPTY_ENTITLEMENTS } from '@/lib/entitlement'
import { reportUnlocked, previewPayload } from '@/lib/reportPreview'
import { createServerSupabase } from '@/lib/supabase'
import type { SupabaseClient } from '@supabase/supabase-js'
import { RATE_LIMIT_ENFORCE, checkRateLimit, clientKey, rateLimitedBody, USER_RULES } from '@/lib/rateLimit'
import { checkAiBudget } from '@/lib/aiBudget'
import { saveReport, deriveReportTitle } from '@/lib/reportSave'
import { stripEntitlementState, reportCacheKey, readReportCache, resolveModuleCachedHit, HEMUN_CACHE_VERSION } from '@/lib/reportCache'
import { aiSourceCode, type AiFailure } from '@/lib/aiReason'
import { logAiRun } from '@/lib/aiRuns'
import { localeFromRequest } from '@/lib/locale'
import { isRegenRequest, regenGate } from '@/lib/regenPolicy'
import { toHant } from '@/lib/hant'

/** 未解锁时的 preview（入库剥离、命中重算时共用，避免两处文案漂移） */
// ★ 2026-11-09 免费分层文案：写清免费开放哪几项、付费后补哪几项，不用「解锁更多」。
const HEMUN_LOCKED_PREVIEW = '免费试读开放 3 个维度：生肖配对、日柱夫妻宫、五行互补。付费后可看其余 6 个维度：年柱干支、年柱纳音、配偶星、婚姻宫稳定度、十神互见、大运同步，以及九维合婚 AI 深度解读与追问。'
const HEMUN_LOCKED_PREVIEW_EN = 'The free preview covers three dimensions: zodiac pairing, the day-pillar spouse palace and Five Elements support. The paid report adds the other six — year pillars, Nayin, spouse star, marriage-palace stability, Ten Gods and Luck Pillar alignment — plus the full AI synastry reading and follow-up questions.'

interface RawBirth {
  year?: unknown; month?: unknown; day?: unknown
  hour?: unknown; minute?: unknown; gender?: unknown
  birthCityId?: unknown; birthplace?: unknown
  birthLng?: unknown; birthZone?: unknown
}

// ★ 2026-11-11 三柱模式：时辰允许留空。留空时绝不按 12:00 伪造时柱参与判断，
//   只在排盘时借用 12:00 取年/月/日，然后立刻把时柱置 null，并只算三柱可成立的维度。
const HEMUN_LOCKED_PREVIEW_3P = '补上出生时辰后，可看完整九维：五行互补、配偶星旺衰、婚姻宫稳定度、十神互见、大运同步、子女宫，以及九维合婚 AI 深度解读与追问。现在这三条判断不以时辰为前提，所以免费给全。'

async function parseBirth(raw: RawBirth, expectGender: 1 | 0): Promise<{ data?: PaipanInput; error?: string; hourKnown?: boolean }> {
  const toInt = (v: unknown): number => {
    if (v === undefined || v === null || v === '') return NaN
    return parseInt(String(v), 10)
  }
  const year = toInt(raw.year), month = toInt(raw.month), day = toInt(raw.day)
  const rawHour = toInt(raw.hour)
  const hourKnown = !Number.isNaN(rawHour)
  const hour = hourKnown ? rawHour : 12
  const minute = raw.minute === undefined || raw.minute === null || raw.minute === ''
    ? 0 : parseInt(String(raw.minute), 10)
  if ([year, month, day, minute].some(Number.isNaN)) {
    return { error: '出生信息不完整' }
  }
  if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) {
    return { error: `日期不合法：${year}-${month}-${day}` }
  }
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return { error: `时间不合法：${hour}:${minute}` }
  }
  // 性别以表单选择为准，缺失时用合婚默认（男左女右）
  const gender: 1 | 0 = raw.gender === 1 || raw.gender === '1' ? 1
    : raw.gender === 0 || raw.gender === '0' ? 0 : expectGender

  // 出生地：城市 id / 旧版城市名 / 手动时区（含进阶经度）；与其它入口共用同一解析
  const birth = await resolveBirthFromBody({ year, month, day, hour, minute }, raw)
  if (birth.error) return { error: birth.error }
  const { ref } = birth.data!

  return {
    data: {
      year, month, day, hour, minute, gender,
      birthLng: ref?.lng,
      birthZone: ref?.zone
    },
    hourKnown
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const locale = localeFromRequest(body)
    const lockedPreview = locale === 'en'
      ? HEMUN_LOCKED_PREVIEW_EN
      : locale === 'zh-Hant' ? toHant(HEMUN_LOCKED_PREVIEW) : HEMUN_LOCKED_PREVIEW
    const lockedPreview3p = locale === 'zh-Hant' ? toHant(HEMUN_LOCKED_PREVIEW_3P) : HEMUN_LOCKED_PREVIEW_3P
    const [m, f] = await Promise.all([
      parseBirth(body.male || {}, 1),
      parseBirth(body.female || {}, 0)
    ])
    if (m.error) return NextResponse.json({ error: `男方信息：${m.error}` }, { status: 400 })
    if (f.error) return NextResponse.json({ error: `女方信息：${f.error}` }, { status: 400 })

    // ★ 三柱模式：任一方缺时辰即降级；时柱在排盘后立刻置 null，
    //   引擎据此只算三柱可成立的维度（DIM_REQUIRES 过滤，计算函数不执行）
    const hourKnown = m.hourKnown !== false && f.hourKnown !== false
    const maleChart = paipan(m.data!)
    const femaleChart = paipan(f.data!)
    if (!hourKnown) {
      ;(maleChart.pillars as unknown as { hour: unknown }).hour = null
      ;(femaleChart.pillars as unknown as { hour: unknown }).hour = null
    }

    // 夏令时切换点提示（gap/重复时刻），各按本方时区与时刻
    const dstOf = (d: PaipanInput) =>
      d.birthZone
        ? checkDSTTransition(d.birthZone, {
            year: d.year, month: d.month, day: d.day, hour: d.hour, minute: d.minute
          })?.message || null
        : null
    const dstNotices = { male: dstOf(m.data!), female: dstOf(f.data!) }

    const male: AnalyzableChart = Object.assign(maleChart, {
      analysis: hourKnown
        ? { wangShuai: getWangShuai(maleChart), geJu: getGeJu(maleChart), isPaid: false }
        : { wangShuai: '', geJu: '', isPaid: false }
    })
    const female: AnalyzableChart = Object.assign(femaleChart, {
      analysis: hourKnown
        ? { wangShuai: getWangShuai(femaleChart), geJu: getGeJu(femaleChart), isPaid: false }
        : { wangShuai: '', geJu: '', isPaid: false }
    })

    // 规则引擎：全部干支事实与评分（三柱模式由引擎自行过滤，不传 12:00 参与判断）
    const result = hehun(male, female, new Date(), { hourKnown })

    // ★ 身份/门禁先解析（§8.5.1 单一判定）——先于 AI 调用，供下方成本护栏使用。
    // ★ 报告门禁按【是否持有 SKU】判定（reportUnlocked → grantsCover），不依赖 ENTITLEMENT_ENFORCE：
    //   未购用户一律进入试读（规则免费板块全文 + 其余锁定 + 不生成 AI）。
    const token = typeof body.token === 'string' ? body.token : ''
    let ent = EMPTY_ENTITLEMENTS
    let userId: string | null = null
    let admin: SupabaseClient | null = null
    if (token) {
      admin = createServerSupabase()
      const { data: { user } } = await admin.auth.getUser(token)
      if (user) { userId = user.id; ent = await getEntitlements(admin, user.id) }
    }
    // ★ 三柱模式一律按试读处理：不接受付费解锁（九维需要时辰），也不调 AI
    const unlocked = hourKnown && reportUnlocked(ent, 'hemun')

    // ★ 接口层重新生成门槛（2026-11-09）：未购买却声明 regen → 402；付费规则版不限次数
    const regen = isRegenRequest(body) || request.nextUrl?.searchParams?.get('regen') === '1'
    const regenBlocked = regenGate(regen, unlocked, locale)
    if (regenBlocked) return regenBlocked

    // ★ 报告缓存短路读取（token 防盗用第三档）：登录用户的【同参数重复请求】直接命中存量全文，
    //   零 AI、零限流、零预算（放在限流/预算/AI 之前）。命中处置全在 resolveModuleCachedHit：
    //   只短路【真·AI 结果】—— AI 失败/预算熔断的规则兜底视为未命中 → 重生成覆盖（缓存自愈）。
    // ★ 双方出生地入键（原则②）：真太阳时不同则内容不同，键不入会互相覆盖（丢报告）。
    const reportInput = {
      year: m.data!.year, month: m.data!.month, day: m.data!.day, hour: m.data!.hour,
      minute: m.data!.minute, gender: m.data!.gender,
      hourKnown,
      birthZone: m.data!.birthZone ?? null, birthLng: m.data!.birthLng ?? null,
      partnerYear: f.data!.year, partnerMonth: f.data!.month, partnerDay: f.data!.day,
      partnerHour: f.data!.hour, partnerMinute: f.data!.minute, partnerGender: f.data!.gender,
      partnerBirthZone: f.data!.birthZone ?? null, partnerBirthLng: f.data!.birthLng ?? null
    }
    // ★ 2026-11-05：缓存键必须含 locale（否则跨语言命中同一份缓存）
    const cacheKey = reportCacheKey('hemun', HEMUN_CACHE_VERSION, { ...reportInput, locale })
    if (userId && admin) {
      const hit = await readReportCache(admin, userId, 'hemun', cacheKey)
      const resolved = hit
        ? resolveModuleCachedHit(hit, { unlocked, skus: ['hemun'], lockedPreview: hourKnown ? lockedPreview : lockedPreview3p })
        : null
      if (resolved) {
        // ★ 缓存命中也要带同一试读标记，避免免费用户从存量全文缓存拿到完整渲染路径
        const data = { ...resolved.data, preview: previewPayload('hemun', unlocked) }
        return NextResponse.json({ success: true, data, reportId: resolved.reportId, cached: true })
      }
    }

    // ★ 速率限制（token 防盗用第二档）：默认关闭（内测放行）；开启后按 u:<id>/ip:<hash> 固定窗口计数，
    //   超限返 429。放在 AI 生成【之前】。
    const rl = await checkRateLimit(
      admin ?? (RATE_LIMIT_ENFORCE ? createServerSupabase() : null),
      clientKey(userId, request),
      USER_RULES
    )
    if (!rl.allowed) return NextResponse.json(rateLimitedBody(rl), { status: 429 })

    // ★★ 全局日预算熔断（token 防盗用第三档）：仅【真要生成 AI】时检查（不生成则不计、不拦）。
    //   超额 → 全站当日降级为规则版（200 无 AI 文本，区别于限流的 429），次日恢复；
    //   基建故障 → 放行（fail-open）。
    const budget = userId ? await checkAiBudget(admin, Date.now()) : null
    const aiBlocked = budget?.exhausted ?? false
    // AI 深度文字解读；失败回退规则版
    // ★★ 成本护栏（token 防盗用第一档）：仅【登录用户】才生成 AI ——
    //   匿名（含外部脚本）不再触发；登录用户照常全量生成并入库，回看者必然已登录 ⇒ 不触回看事故。
    // ★ 未解锁（试读）不调 AI：报告全文不下发，调了也丢弃且成本最高。
    const aiAttempted = !!userId && unlocked && !aiBlocked
    const aiStartedAt = Date.now()
    // ★ 用对象承载失败原因：回调内赋值，避免 TS 把 let 变量窄化成 null
    const aiRun: { failure: AiFailure | null } = { failure: null }
    const aiReport = aiAttempted
      ? await generateAIHemun(male, female, result, { locale, onFailure: (f) => { aiRun.failure = f } })
      : null

    // ★ 入库只存【内容】（locked 剥掉、ai 存全量全文）；门禁只作用于【响应】——
    //   读取侧按当前权益重算（详情页 reportGate），试吃→付费即刻生效。
    const rawAi = aiReport || fallbackHemunText(result)
    const rawAiSource = aiReport ? 'AI 深度解读'
      : aiBlocked ? '规则版（当日 AI 额度已用尽，次日恢复）'
      : userId ? aiSourceCode(aiRun.failure)
      : '规则版（登录后可见 AI 深度解读）'
    const ai = unlocked ? rawAi : null
    const aiSource = !unlocked ? '未解锁' : rawAiSource

    const data = {
      male, female, result, ai, aiSource, dstNotices,
      // ★ 2026-11-09 失败原因可见化：reason 与命中词随报告入库，展示层按 locale 出三语文案
      aiReason: unlocked && !aiReport ? aiRun.failure?.code ?? null : null,
      aiReasonDetail: unlocked && !aiReport ? aiRun.failure?.detail ?? null : null,
      aiHits: unlocked && !aiReport ? aiRun.failure?.hits ?? [] : [],
      // ★ free 层保留结构化干支事实与评分；ai 在未解锁时为 null
      free: { male, female, result },
      locked: unlocked ? null : {
        skus: ['hemun'],
        preview: hourKnown ? lockedPreview : lockedPreview3p
      },
      preview: previewPayload('hemun', unlocked)
    }

    // 登录用户：报告作为账户资产自动保存（静默降级，不阻断主流程）
    // ★ 入库只存【内容】（2026-10-18）：locked 剥掉、ai 存全量全文 ——
    //   读取侧按当前权益重算（详情页 reportGate.gateReportForDetail），试吃→付费即刻生效。
    // ★ reportInput / cacheKey 已在读取短路前构造（双方出生地入键，原则②）。
    const reportId = await saveReport(token || undefined, {
      kind: 'hemun',
      title: deriveReportTitle('hemun', reportInput),
      input: reportInput,
      result: { ...stripEntitlementState(data), ai: rawAi, aiSource: rawAiSource } as never,
      cacheKey
    })

    // ★ ai_runs 观测：成功与失败都落一条（失败路径的 usage 不再丢弃）
    if (aiAttempted) {
      await logAiRun(admin, {
        module: 'hemun',
        locale,
        outcome: aiReport ? 'success' : 'failure',
        reason: aiReport ? null : aiRun.failure?.code ?? 'unknown',
        hits: aiReport ? [] : aiRun.failure?.hits ?? [],
        usage: aiReport?._usage ?? aiRun.failure?.usage ?? null,
        durationMs: aiReport ? Date.now() - aiStartedAt : aiRun.failure?.durationMs ?? Date.now() - aiStartedAt,
        requestId: reportId
      })
    }

    return NextResponse.json({ success: true, data, reportId })
  } catch (error) {
    console.error('合婚错误:', error)
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: `合婚失败：${msg}` }, { status: 500 })
  }
}
