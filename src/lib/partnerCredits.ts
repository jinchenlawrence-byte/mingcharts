// 伙伴额度账本（白标 v1）
//
// 单位是【报告份数】，不是货币。余额 = SUM(delta)，没有第二个真相。
//
// 三条纪律：
//   ① 幂等靠数据库唯一索引，不靠"先查再加"（并发下必错，webhook 又会重试）
//   ② 扣减失败一律返回原因，不静默 —— 不能让伙伴交了钱却在交付时"少一份"而无告知
//   ③ 价格校验在入账时做（收单方 create 接口无读回，这是唯一能抓出"商品标错价"的地方）
import type { SupabaseClient } from '@supabase/supabase-js'
import { SKUS, PARTNER_PACK_UNITS, isPartnerPack, type SkuId } from './pricing'

export type PartnerCreditReason = 'purchase' | 'consume' | 'refund' | 'adjust'

export interface PartnerCreditRow {
  id: string
  user_id: string
  delta: number
  reason: PartnerCreditReason
  ref: string | null
  created_at: string
}

/** 某 SKU 对应的份数；不是伙伴包返回 null */
export function unitsForSku(sku: string): number | null {
  return isPartnerPack(sku) ? PARTNER_PACK_UNITS[sku] : null
}

/** 余额 = delta 之和（纯函数，便于断言负数与空账本） */
export function balanceOf(rows: Pick<PartnerCreditRow, 'delta'>[]): number {
  return rows.reduce((sum, r) => sum + (Number.isFinite(r.delta) ? r.delta : 0), 0)
}

/** 金额比对容差（分）：收单方可能带小数位抖动 */
const AMOUNT_TOLERANCE = 0.01

/** 实付金额与 SKU 标价是否一致 —— 用来抓「收单方商品标错价」 */
export function amountMatchesSku(sku: SkuId, paidUSD: number): boolean {
  const expected = SKUS[sku]?.priceUSD
  if (typeof expected !== 'number') return false
  return Math.abs(paidUSD - expected) <= AMOUNT_TOLERANCE
}

export async function getPartnerBalance(admin: SupabaseClient, userId: string): Promise<number> {
  const { data, error } = await admin
    .from('partner_credits')
    .select('delta')
    .eq('user_id', userId)
  if (error) throw new Error(`读取伙伴余额失败：${error.message}`)
  return balanceOf((data ?? []) as Pick<PartnerCreditRow, 'delta'>[])
}

export interface CreditPurchaseResult {
  /** 本次入账份数（重复支付单为 0） */
  credited: number
  /** 重复回调（同一支付单已入账） */
  duplicate: boolean
  /** 实付金额与标价不符时给出说明（仍然入账：钱已收，不能不发货，但要告警） */
  priceWarning?: string
  balance: number
}

/**
 * 支付成功入账。
 * @param ref 支付单号（PAY_xxx）—— 幂等键
 * ★ 价格不符仍然入账，但返回 priceWarning 让调用方大声记日志：
 *   宁可多给伙伴几份，也不能收了钱不给东西；价格问题要人工去收单方改。
 */
export async function creditPartnerPurchase(
  admin: SupabaseClient,
  input: { userId: string; sku: SkuId; ref: string; paidUSD: number }
): Promise<CreditPurchaseResult> {
  const units = unitsForSku(input.sku)
  if (units === null) throw new Error(`不是伙伴包 SKU：${input.sku}`)

  const priceWarning = amountMatchesSku(input.sku, input.paidUSD)
    ? undefined
    : `实付 $${input.paidUSD} 与标价 $${SKUS[input.sku]?.priceUSD} 不符（sku=${input.sku}）—— 请核对收单方商品价格`

  const { error } = await admin.from('partner_credits').insert({
    user_id: input.userId,
    delta: units,
    reason: 'purchase',
    ref: input.ref,
  } as never)

  // 23505 = 唯一索引冲突 = 这笔支付已入账（webhook 重试）→ 视为成功，不重复加
  if (error && (error as { code?: string }).code !== '23505') {
    throw new Error(`伙伴额度入账失败：${error.message}`)
  }

  const duplicate = Boolean(error && (error as { code?: string }).code === '23505')
  const balance = await getPartnerBalance(admin, input.userId)
  return { credited: duplicate ? 0 : units, duplicate, priceWarning, balance }
}

export interface SpendResult {
  ok: boolean
  balance: number
  error?: string
}

/**
 * 交付一份报告时扣减。
 * @param ref 报告 id —— 幂等键（同一份报告只扣一次）
 * ★ 余额不足直接失败，不允许扣成负数（负数余额会让对账永远对不平）
 */
export async function spendPartnerUnits(
  admin: SupabaseClient,
  input: { userId: string; units: number; ref: string }
): Promise<SpendResult> {
  if (!Number.isInteger(input.units) || input.units <= 0) {
    return { ok: false, balance: await getPartnerBalance(admin, input.userId), error: '扣减份数必须是正整数' }
  }

  const before = await getPartnerBalance(admin, input.userId)
  if (before < input.units) {
    return { ok: false, balance: before, error: `余额不足（当前 ${before} 份，需要 ${input.units} 份）` }
  }

  const { error } = await admin.from('partner_credits').insert({
    user_id: input.userId,
    delta: -input.units,
    reason: 'consume',
    ref: input.ref,
  } as never)

  if (error) {
    if ((error as { code?: string }).code === '23505') {
      // 已扣过：按幂等成功返回（重复调用不报错）
      return { ok: true, balance: await getPartnerBalance(admin, input.userId) }
    }
    return { ok: false, balance: before, error: `扣减失败：${error.message}` }
  }
  return { ok: true, balance: await getPartnerBalance(admin, input.userId) }
}

/** 人工调整的 reason：adjust=运营补发/纠错；refund=伙伴报告生成失败退额（第 34 轮） */
export type PartnerAdjustReason = 'adjust' | 'refund'

/**
 * 人工调整（送试用额度 / 补发 / 纠错 / 伙伴报告失败退额），ref 写原因便于审计。
 * ★ 第 34 轮扩展 reason：伙伴自助 V2 的失败退额也走这里（账本保持单一写入口），
 *   reason='refund' 与购买退款共用 idx_partner_credits_refund_ref 幂等索引，
 *   ref 必须带前缀（如 `refund:<reportId>`）避免与支付单号撞号。
 *   不传 reason 时行为与旧版完全一致（reason='adjust'、ref=note）。
 */
export async function adjustPartnerUnits(
  admin: SupabaseClient,
  input: { userId: string; units: number; note?: string; ref?: string; reason?: PartnerAdjustReason }
): Promise<{ ok: boolean; balance: number; error?: string }> {
  if (!Number.isInteger(input.units) || input.units === 0) {
    return { ok: false, balance: await getPartnerBalance(admin, input.userId), error: '调整份数必须是非零整数' }
  }
  const { error } = await admin.from('partner_credits').insert({
    user_id: input.userId,
    delta: input.units,
    reason: input.reason ?? 'adjust',
    ref: input.ref ?? input.note ?? null,
  } as never)
  if (error) {
    return { ok: false, balance: await getPartnerBalance(admin, input.userId), error: `调整失败：${error.message}` }
  }
  return { ok: true, balance: await getPartnerBalance(admin, input.userId) }
}

export interface ClawbackResult {
  ok: boolean
  /** 冲抵份数（重复退款事件为 0） */
  clawed: number
  duplicate: boolean
  balance: number
  /** 冲抵后余额为负：说明伙伴已经用掉了一部分，属于欠账，需要人工跟进 */
  negative: boolean
  error?: string
}

/**
 * 退款冲抵（refund.succeeded）。
 * ★ 与 spendPartnerUnits 的关键区别：**允许扣成负数**。
 *   退款是客户拿回钱，不管伙伴有没有把额度用掉，这笔账都必须记下来 ——
 *   拒绝扣减会让余额凭空多出一笔，比负数更难查。
 *   负数余额 = 欠账，由运维跟进（`--grant/--adjust` 补回或停用）。
 * ★ 幂等键 = 原支付单号：退款事件重投不会重复冲抵。
 */
export async function clawbackPartnerUnits(
  admin: SupabaseClient,
  input: { userId: string; sku: string; ref: string }
): Promise<ClawbackResult> {
  const units = unitsForSku(input.sku)
  if (units === null) {
    return { ok: false, clawed: 0, duplicate: false, balance: await getPartnerBalance(admin, input.userId), negative: false, error: `不是伙伴包 SKU：${input.sku}` }
  }

  const { error } = await admin.from('partner_credits').insert({
    user_id: input.userId,
    delta: -units,
    reason: 'refund',
    ref: input.ref,
  } as never)

  if (error && (error as { code?: string }).code !== '23505') {
    return { ok: false, clawed: 0, duplicate: false, balance: await getPartnerBalance(admin, input.userId), negative: false, error: `退款冲抵失败：${error.message}` }
  }

  const duplicate = Boolean(error && (error as { code?: string }).code === '23505')
  const balance = await getPartnerBalance(admin, input.userId)
  return { ok: true, clawed: duplicate ? 0 : units, duplicate, balance, negative: balance < 0 }
}
