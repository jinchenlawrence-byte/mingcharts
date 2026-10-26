// 伙伴自助出报告（第 34 轮 · V2）
//
// 解决一件事：V1 的「入账自动、扣减手动」——伙伴要出报告，必须等我们跑脚本扣额度。
// V2 把这条链收进站点：伙伴登录 → 选品类 → 填生辰 → 自动扣 1 份 → 生成 → 拿到分享链接。
//
// 三条不可退让的纪律（HANDOFF-伙伴自助V2 §3-3 / §六）：
//   ① 顺序固定：伙伴判定 → 幂等短路 → 余额 → AI 预算 → 落 pending → 扣份 → 生成。
//      先扣后生成，才能防「生成成功但余额为 0」的白嫖；生成失败必须退。
//   ② 同一 requestId 只扣一次：应用层只做短路与 23505 兜底，
//      最终裁决是 reports(user_id, request_id) 的部分唯一索引（supabase/partner-v2.sql）。
//   ③ 退额走 partnerCredits.adjustPartnerUnits(reason='refund')，账本保持单一写入口；
//      不在这里直写 partner_credits。
//
// ★ 本文件仅服务端使用（import 了 paipan / AI 生成 / node:crypto 系模块）。
import type { SupabaseClient } from '@supabase/supabase-js'
import { checkAiBudget } from './aiBudget'
import { generateAnalysis, type AnalyzableChart } from './analysis'
import { generateAIAnalysis } from './aiAnalysis'
import { paipan, getWangShuai, getGeJu, type PaipanInput } from './paipan'
import { hehun } from './hemun'
import { generateAIHemun, fallbackHemunText } from './aiHemun'
import { resolveBirthFromBody } from './birthRequest'
import { searchSimilarCases } from './caseSearch'
import { checkDSTTransition } from './solarTime'
import {
  getPartnerBalance,
  spendPartnerUnits,
  adjustPartnerUnits,
  type SpendResult,
} from './partnerCredits'
import { deriveReportTitle } from './reportSave'
import {
  generateShareToken,
  shareExpiryFrom,
  shareUrl,
  isShareActive,
  SHARE_TTL_DAYS,
} from './reportShare'
import type { OutputLocale } from './locale'

// ───────── 品类白名单（§3-4：只开命书与合婚）─────────
export const PARTNER_REPORT_KINDS = ['fatebook', 'hemun'] as const
export type PartnerReportKind = (typeof PARTNER_REPORT_KINDS)[number]

/** 纯函数：品类是否对伙伴开放（ziwei/annual/geo → null → 400） */
export function resolvePartnerKind(kind: unknown): PartnerReportKind | null {
  return typeof kind === 'string' && (PARTNER_REPORT_KINDS as readonly string[]).includes(kind)
    ? (kind as PartnerReportKind)
    : null
}

/** 伙伴每次生成消耗的份数（固定 1 份） */
export const PARTNER_REPORT_UNITS = 1

/** 纯函数：余额是否不足（<1 即拒绝，绝不允许先出报告后补钱） */
export function shouldRejectBalance(balance: number): boolean {
  return !Number.isFinite(balance) || balance < PARTNER_REPORT_UNITS
}

/** 纯函数：失败退额的幂等键（带前缀，避免与支付单号共用 refund 索引时撞号） */
export function refundRef(reportId: string): string {
  return `refund:${reportId}`
}

// ───────── 品牌位（§3-5：只收两个文本字段）─────────
export const BRAND_NAME_MAX = 24
export const BRAND_CONTACT_MAX = 40

export interface NormalizedBrand {
  brandName: string | null
  brandContact: string | null
  error?: string
}

export function normalizeBrandFields(brandName: unknown, brandContact: unknown): NormalizedBrand {
  const name = typeof brandName === 'string' ? brandName.trim() : ''
  const contact = typeof brandContact === 'string' ? brandContact.trim() : ''
  if (name.length > BRAND_NAME_MAX) {
    return { brandName: null, brandContact: null, error: `品牌名最多 ${BRAND_NAME_MAX} 字` }
  }
  if (contact.length > BRAND_CONTACT_MAX) {
    return { brandName: null, brandContact: null, error: `联系方式最多 ${BRAND_CONTACT_MAX} 字` }
  }
  return { brandName: name || null, brandContact: contact || null }
}

// ───────── 对外结果类型（结构化 code，不让前端接裸异常）─────────
export interface PartnerReportSuccess {
  ok: true
  report: {
    id: string
    kind: PartnerReportKind
    title: string
    status: 'ready'
    shareToken: string
    shareUrl: string
  }
  balance: number
  duplicate: boolean
}

export interface PartnerReportFailure {
  ok: false
  status: 400 | 403 | 409 | 429 | 500
  code: string
  error: string
  needPurchase?: boolean
  balance?: number
  reportId?: string
}

export type PartnerReportResult = PartnerReportSuccess | PartnerReportFailure

// ───────── 可注入依赖（生产走默认实现；离线验收注入假账本/假生成器）─────────
export interface PreparedPartnerReport {
  kind: PartnerReportKind
  title: string
  /** 落 reports.input 的存档（命书=单人出生；合婚=双方出生） */
  reportInput: unknown
  /** 排盘输入（命书 1 个；合婚 [男, 女]） */
  births: PaipanInput[]
}

export interface PartnerReportDeps {
  hasPartnerRow: (admin: SupabaseClient, userId: string) => Promise<boolean>
  getBalance: (admin: SupabaseClient, userId: string) => Promise<number>
  spend: (
    admin: SupabaseClient,
    input: { userId: string; units: number; ref: string }
  ) => Promise<SpendResult>
  refund: (admin: SupabaseClient, input: { userId: string; reportId: string }) => Promise<void>
  checkBudget: (admin: SupabaseClient, nowMs: number) => Promise<{ exhausted: boolean }>
  generate: (
    kind: PartnerReportKind,
    prepared: PreparedPartnerReport,
    locale?: OutputLocale
  ) => Promise<{ result: unknown }>
  now: () => Date
  logError: (message: string) => void
}

// ───────── 出生信息解析（复用 /api/hemun 的校验口径）─────────
interface ResolvedBirth {
  data?: PaipanInput
  error?: string
}

async function prepareBirth(raw: unknown, expectGender: 1 | 0): Promise<ResolvedBirth> {
  if (!raw || typeof raw !== 'object') return { error: '出生信息缺失' }
  const r = raw as Record<string, unknown>
  const toInt = (v: unknown): number => {
    if (v === undefined || v === null || v === '') return NaN
    return parseInt(String(v), 10)
  }
  const year = toInt(r.year), month = toInt(r.month), day = toInt(r.day), hour = toInt(r.hour)
  const minute = r.minute === undefined || r.minute === null || r.minute === ''
    ? 0 : parseInt(String(r.minute), 10)
  if ([year, month, day, hour, minute].some(Number.isNaN)) {
    return { error: '出生信息不完整' }
  }
  if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) {
    return { error: `日期不合法：${year}-${month}-${day}` }
  }
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return { error: `时间不合法：${hour}:${minute}` }
  }
  const gender: 1 | 0 = r.gender === 1 || r.gender === '1' ? 1
    : r.gender === 0 || r.gender === '0' ? 0 : expectGender

  // 出生地：城市 id / 旧版城市名 / 手动时区（含进阶经度）；与其它入口共用同一解析
  const birth = await resolveBirthFromBody({ year, month, day, hour, minute }, {
    birthCityId: r.birthCityId,
    birthplace: r.birthplace,
    birthLng: r.birthLng,
    birthZone: r.birthZone,
  })
  if (birth.error) return { error: birth.error }
  const ref = birth.data?.ref

  return {
    data: {
      year, month, day, hour, minute, gender,
      birthLng: ref?.lng,
      birthZone: ref?.zone,
    },
  }
}

type PrepareResult = { prepared?: PreparedPartnerReport; error?: string }

async function preparePartnerInput(kind: PartnerReportKind, input: unknown): Promise<PrepareResult> {
  if (kind === 'fatebook') {
    const birth = await prepareBirth(input, 1)
    if (birth.error || !birth.data) return { error: birth.error ?? '出生信息不完整' }
    const b = birth.data
    return {
      prepared: {
        kind,
        title: deriveReportTitle('fatebook', {
          year: b.year, month: b.month, day: b.day, hour: b.hour, gender: b.gender,
        }),
        reportInput: b,
        births: [b],
      },
    }
  }

  const o = (input && typeof input === 'object') ? (input as Record<string, unknown>) : {}
  const [male, female] = await Promise.all([
    prepareBirth(o.male, 1),
    prepareBirth(o.female, 0),
  ])
  if (male.error || !male.data) return { error: `男方信息：${male.error ?? '不完整'}` }
  if (female.error || !female.data) return { error: `女方信息：${female.error ?? '不完整'}` }
  const m = male.data, f = female.data
  return {
    prepared: {
      kind,
      title: deriveReportTitle('hemun', {
        year: m.year, month: m.month, day: m.day, hour: m.hour, gender: m.gender,
        partnerYear: f.year, partnerMonth: f.month, partnerDay: f.day, partnerGender: f.gender,
      }),
      reportInput: { male: m, female: f },
      births: [m, f],
    },
  }
}

/** DST 切换点提示（各按本方时区与时刻；与 /api/hemun 同口径） */
function dstNoticeOf(b: PaipanInput): string | null {
  return b.birthZone
    ? checkDSTTransition(b.birthZone, {
        year: b.year, month: b.month, day: b.day, hour: b.hour, minute: b.minute,
      })?.message || null
    : null
}

// ───────── 默认生成器 ─────────
async function defaultGenerate(
  kind: PartnerReportKind,
  prepared: PreparedPartnerReport,
  locale?: OutputLocale
): Promise<{ result: unknown }> {
  if (kind === 'fatebook') {
    const birth = prepared.births[0]
    const chart = paipan(birth)
    const analyzable: AnalyzableChart = Object.assign(chart, {
      analysis: {
        wangShuai: getWangShuai(chart),
        geJu: getGeJu(chart),
        isPaid: true,
      },
    })
    const rulePaid = generateAnalysis(analyzable)
    const aiPaid = await generateAIAnalysis(analyzable, { locale })
    const similarCases = searchSimilarCases(analyzable)
    // AI 失败 → 规则版兜底（不因此把整份报告判失败：伙伴已扣的份数不该为一次超时作废）
    const paid = aiPaid
      ? { ...aiPaid, luckCycles: rulePaid.luckCycles, similarCases }
      : { ...rulePaid, similarCases }
    // ★ 不写 charts 行（R4）：伙伴生成的客户命盘不该出现在伙伴的「我的命盘」里，
    //   也不该产生 charts.is_paid 的副作用。分享页按 reports.result.paid 回退读取（见 r/[token]）。
    return { result: { source: 'fatebook', paid } }
  }

  const [m, f] = prepared.births
  const maleChart = paipan(m)
  const femaleChart = paipan(f)
  const male: AnalyzableChart = Object.assign(maleChart, {
    analysis: { wangShuai: getWangShuai(maleChart), geJu: getGeJu(maleChart), isPaid: true },
  })
  const female: AnalyzableChart = Object.assign(femaleChart, {
    analysis: { wangShuai: getWangShuai(femaleChart), geJu: getGeJu(femaleChart), isPaid: true },
  })
  const result = hehun(male, female)
  const aiReport = await generateAIHemun(male, female, result, { locale })
  const rawAi = aiReport || fallbackHemunText(result)
  const aiSource = aiReport ? 'AI 深度解读' : '规则版（AI 结果未过合规校验或未配置密钥）'
  return {
    result: {
      male, female, result, ai: rawAi, aiSource,
      dstNotices: { male: dstNoticeOf(m), female: dstNoticeOf(f) },
    },
  }
}

// ───────── 默认依赖 ─────────
/** 身份判定（§3-1）：partner_credits 存在该 user_id 任意一行即伙伴 */
export async function hasPartnerCreditsRow(admin: SupabaseClient, userId: string): Promise<boolean> {
  const { data, error } = await admin
    .from('partner_credits')
    .select('id')
    .eq('user_id', userId)
    .limit(1)
  if (error) throw new Error(`伙伴身份查询失败：${error.message}`)
  return (data ?? []).length > 0
}

export const defaultPartnerReportDeps: PartnerReportDeps = {
  hasPartnerRow: hasPartnerCreditsRow,
  getBalance: (admin, userId) => getPartnerBalance(admin, userId),
  spend: (admin, input) => spendPartnerUnits(admin, input),
  refund: async (admin, { userId, reportId }) => {
    // ★ 账本单一写入口（R2）：退额也走 adjustPartnerUnits(reason='refund')
    const r = await adjustPartnerUnits(admin, {
      userId,
      units: 1,
      ref: refundRef(reportId),
      reason: 'refund',
    })
    if (!r.ok) throw new Error(r.error ?? '退额失败')
  },
  checkBudget: (admin, nowMs) => checkAiBudget(admin, nowMs),
  generate: defaultGenerate,
  now: () => new Date(),
  logError: (message) => console.error(message),
}

// ───────── 主流程 ─────────
export interface CreatePartnerReportInput {
  userId: string
  kind: unknown
  input: unknown
  brandName?: unknown
  brandContact?: unknown
  requestId?: unknown
  locale?: OutputLocale
}

interface ExistingReportRow {
  id: string
  kind: string
  title: string
  status: string
  share_token: string | null
  share_expires_at: string | null
  share_revoked_at: string | null
}

function fail(
  status: PartnerReportFailure['status'],
  code: string,
  error: string,
  extra?: { needPurchase?: boolean; balance?: number; reportId?: string }
): PartnerReportFailure {
  return { ok: false, status, code, error, ...extra }
}

async function findExistingReport(
  admin: SupabaseClient,
  userId: string,
  requestId: string
): Promise<ExistingReportRow | null> {
  const { data, error } = await admin
    .from('reports')
    .select('id,kind,title,status,share_token,share_expires_at,share_revoked_at')
    .eq('user_id', userId)
    .eq('request_id', requestId)
    .maybeSingle()
  if (error) throw new Error(`幂等查询失败：${error.message}`)
  return (data as ExistingReportRow | null) ?? null
}

/** 幂等短路：ready 直接返回该报告；pending/failed 返回 409 并带 reportId（不再扣费、不再生成） */
async function resolveExisting(
  admin: SupabaseClient,
  deps: PartnerReportDeps,
  userId: string,
  existing: ExistingReportRow
): Promise<PartnerReportResult> {
  if (existing.status === 'ready') {
    const active = isShareActive(existing, deps.now())
    const token = existing.share_token ?? ''
    return {
      ok: true,
      duplicate: true,
      balance: await deps.getBalance(admin, userId),
      report: {
        id: existing.id,
        kind: (resolvePartnerKind(existing.kind) ?? 'fatebook') as PartnerReportKind,
        title: existing.title,
        status: 'ready',
        shareToken: token,
        shareUrl: token && active ? shareUrl(token) : '',
      },
    }
  }
  return fail(
    409,
    existing.status === 'pending' ? 'REQUEST_IN_PROGRESS' : 'REQUEST_FAILED',
    existing.status === 'pending'
      ? '该请求正在生成中，请稍候刷新'
      : '该请求上次生成失败（额度已退回），请换一个请求号重新提交',
    { reportId: existing.id }
  )
}

/**
 * 伙伴自助出报告（§3-3 全流程）。
 * @param admin service_role 客户端（调用方已用 token 验过 user）
 * 不抛裸异常：所有失败都返回结构化 { ok:false, status, code, error }。
 */
export async function createPartnerReport(
  admin: SupabaseClient,
  raw: CreatePartnerReportInput,
  deps: PartnerReportDeps = defaultPartnerReportDeps
): Promise<PartnerReportResult> {
  const { userId } = raw

  // ② 伙伴判定（普通用户 → 403；不建角色表，见 §3-1）
  if (!(await deps.hasPartnerRow(admin, userId))) {
    return fail(403, 'NOT_PARTNER', '非伙伴账号：该功能仅对合作命理师开放')
  }

  // 品类白名单（§3-4）
  const kind = resolvePartnerKind(raw.kind)
  if (!kind) return fail(400, 'KIND_NOT_ALLOWED', '该品类暂未对伙伴开放')

  // 请求号：缺了就失去防重复扣费的依据，必须拒
  const requestId = typeof raw.requestId === 'string' ? raw.requestId.trim() : ''
  if (!requestId) return fail(400, 'REQUEST_ID_REQUIRED', '缺少请求号 requestId（用于防重复扣费）')
  if (requestId.length > 128) return fail(400, 'REQUEST_ID_INVALID', '请求号过长')

  // 品牌位（只收两个文本字段；不替伙伴收集客户联系方式）
  const brand = normalizeBrandFields(raw.brandName, raw.brandContact)
  if (brand.error) return fail(400, 'BRAND_INVALID', brand.error)

  // ③ 幂等短路
  const existing = await findExistingReport(admin, userId, requestId)
  if (existing) return resolveExisting(admin, deps, userId, existing)

  // 参数校验放在扣费之前：出生信息不合法时不该消耗额度
  const prepared = await preparePartnerInput(kind, raw.input)
  if (prepared.error || !prepared.prepared) {
    return fail(400, 'INPUT_INVALID', prepared.error ?? '出生信息不合法')
  }
  const preparedReport = prepared.prepared

  // ④ 余额闸门（<1 → 409 + needPurchase）
  const balance = await deps.getBalance(admin, userId)
  if (shouldRejectBalance(balance)) {
    return fail(409, 'NEED_PURCHASE', '余额不足，请先购买额度', { needPurchase: true, balance })
  }

  // ⑤ AI 预算闸门（伙伴不是免检通道）
  const now = deps.now()
  const budget = await deps.checkBudget(admin, now.getTime())
  if (budget.exhausted) {
    return fail(429, 'AI_BUDGET_EXHAUSTED', '今日 AI 生成预算已用尽，请明天再试', { balance })
  }

  // ⑥ 先落 pending 行：拿到 reportId 作为扣费的幂等键
  const insert = await admin
    .from('reports')
    .insert({
      user_id: userId,
      kind,
      title: preparedReport.title,
      input: preparedReport.reportInput as never,
      result: {} as never,
      status: 'pending',
      request_id: requestId,
      brand_name: brand.brandName,
      brand_contact: brand.brandContact,
    } as never)
    .select('id')
    .single()

  if (insert.error) {
    // 23505 = 并发 loser：另一个同 requestId 的请求已落行 → 按幂等结果返回，绝不二次扣费
    if ((insert.error as { code?: string }).code === '23505') {
      const again = await findExistingReport(admin, userId, requestId)
      if (again) return resolveExisting(admin, deps, userId, again)
    }
    return fail(500, 'PENDING_INSERT_FAILED', `报告落库失败：${insert.error.message}`)
  }
  const reportId = (insert.data as { id: string }).id

  // ⑦ 扣 1 份（ref=reportId；重复调用由 consume_ref 唯一索引兜底）
  const spend = await deps.spend(admin, { userId, units: PARTNER_REPORT_UNITS, ref: reportId })
  if (!spend.ok) {
    // 扣费失败（如并发扣光）：本请求作废，不退额（根本没扣）
    await admin.from('reports').update({ status: 'failed' } as never).eq('id', reportId)
    return fail(409, 'SPEND_FAILED', spend.error ?? '额度扣减失败', { balance: spend.balance, reportId })
  }

  // ⑧ 生成
  let generated: { result: unknown }
  try {
    generated = await deps.generate(kind, preparedReport, raw.locale)
  } catch (e) {
    await failAndRefund(admin, deps, userId, reportId, e)
    return fail(500, 'GENERATION_FAILED', '报告生成失败，额度已退回，请稍后重试', {
      balance: await deps.getBalance(admin, userId),
      reportId,
    })
  }

  // ⑨ 成功：ready + 分享令牌 + 90 天
  const shareToken = generateShareToken()
  const expiresAt = shareExpiryFrom(now, SHARE_TTL_DAYS)
  const update = await admin
    .from('reports')
    .update({
      result: generated.result as never,
      status: 'ready',
      share_token: shareToken,
      share_expires_at: expiresAt,
      share_revoked_at: null,
    } as never)
    .eq('id', reportId)

  if (update.error) {
    await failAndRefund(admin, deps, userId, reportId, update.error)
    return fail(500, 'READY_UPDATE_FAILED', '报告保存失败，额度已退回，请稍后重试', {
      balance: await deps.getBalance(admin, userId),
      reportId,
    })
  }

  return {
    ok: true,
    duplicate: false,
    report: {
      id: reportId,
      kind,
      title: preparedReport.title,
      status: 'ready',
      shareToken,
      shareUrl: shareUrl(shareToken),
    },
    balance: await deps.getBalance(admin, userId),
  }
}

/**
 * 失败处置：置 failed + 退 1 份 + 大声记日志。
 * ★ 退额失败时不能谎称「已退额」——改用另一条告警文案，让运维去补账。
 */
async function failAndRefund(
  admin: SupabaseClient,
  deps: PartnerReportDeps,
  userId: string,
  reportId: string,
  cause: unknown
): Promise<void> {
  const detail = cause instanceof Error ? cause.message : String(cause)
  try {
    await admin.from('reports').update({ status: 'failed' } as never).eq('id', reportId)
  } catch (e) {
    deps.logError(`[partner-report] 置 failed 失败（${reportId}）：${e instanceof Error ? e.message : String(e)}`)
  }

  let refunded = false
  try {
    await deps.refund(admin, { userId, reportId })
    refunded = true
  } catch (e) {
    deps.logError(
      `★伙伴报告生成失败且退额失败，需人工补账：${reportId}（${e instanceof Error ? e.message : String(e)}）`
    )
  }

  if (refunded) deps.logError(`★伙伴报告生成失败已退额，需核查：${reportId}`)
  deps.logError(`[partner-report] 生成失败详情（${reportId}）：${detail}`)
}
