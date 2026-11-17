// 先付款后注册 · 游客订单凭证与输入指纹（阶段 A：纯工具，暂不接路由）
//
// 为什么单独成文件：认领令牌的「生成/哈希/有效期」、指印刷新口径、商户单号格式
// 会被结账页、webhook、认领页、cron 清理和验收脚本五处用到 —— 必须单一事实源，
// 各处手写必然漂移（同 reportShare.ts 的取舍）。
//
// ★ 仅服务端：本文件用 node:crypto，不得被客户端组件 import。
import { createHash, randomBytes } from 'node:crypto'

/** 认领窗口：付款后 30 天内可认领（对应 guest_orders.claim_expires_at） */
export const CLAIM_TTL_DAYS = 30

/** 未认领保留期：90 天后清空报告内容并作废令牌（对应 cron 清理口径） */
export const UNCLAIMED_RETENTION_DAYS = 90

/** 令牌字节数：32 字节 → base64url 43 字符（256 bit，不可猜测） */
export const CLAIM_TOKEN_BYTES = 32

/**
 * 数据库 guest_orders.sku 的 check 允许值（与 supabase/guest-checkout-M2.sql 保持一致）。
 * 注意：这是「表能存什么」，不是「游客能买什么」——开放名单见 GUEST_OPEN_SKUS。
 */
export const GUEST_ORDER_SKUS = [
  'fatebook',
  'annual_report',
  'hemun',
  'ziwei_deep',
  'geo',
] as const

export type GuestOrderSku = (typeof GUEST_ORDER_SKUS)[number]

/**
 * 首期对游客开放的 SKU：只有命书。
 * 其余 4 个报告与 bundle3 仍要求先登录（认领物化逻辑不同、或涉及多份报告）。
 */
export const GUEST_OPEN_SKUS: readonly GuestOrderSku[] = ['fatebook']

/** 游客是否可买该 SKU（结账入口与 webhook 都走这一处判断） */
export function isGuestSkuOpen(sku: unknown): sku is GuestOrderSku {
  return typeof sku === 'string' && (GUEST_OPEN_SKUS as readonly string[]).includes(sku)
}

/** 合法令牌形状：base64url 字母表，长度固定 43 */
const CLAIM_TOKEN_RE = /^[A-Za-z0-9_-]{43}$/

/**
 * 商户单号格式：MCG-<guestOrderId>-<13 位时间戳>。
 * ★ 不能沿用 MC-<userId>-<ts>：waffo-events 的 parseMerchantOrderId 会把 MC- 后的
 *   第一段当成 userId，游客单没有 userId，混用会被解析成不存在的用户。
 */
const MERCHANT_ID_RE =
  /^MCG-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})-(\d{13})$/i

/** 生成认领令牌原文（只出现在邮件链接里，绝不落库） */
export function generateClaimToken(): string {
  return randomBytes(CLAIM_TOKEN_BYTES).toString('base64url')
}

/**
 * 令牌哈希（落库用）。只存 SHA-256：库被读也无法还原出可用链接。
 * ★ 令牌是 256 bit 随机串，不需要加盐/慢哈希——加盐反而让「按哈希查一行」失效。
 */
export function hashClaimToken(rawToken: string): string {
  return createHash('sha256').update(rawToken, 'utf8').digest('hex')
}

/** 粗校验：形状不对就不必查库（省一次 service_role 查询，也少一条日志噪音） */
export function isClaimTokenShape(token: unknown): token is string {
  return typeof token === 'string' && CLAIM_TOKEN_RE.test(token)
}

/** 从 now 起算的认领过期时间（ISO 字符串，直接写库） */
export function claimExpiryFrom(now: Date = new Date(), days: number = CLAIM_TTL_DAYS): string {
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString()
}

export interface ClaimStateRow {
  claim_token_hash?: string | null
  claim_expires_at?: string | null
  claim_revoked_at?: string | null
}

/**
 * 认领窗口是否仍开放。
 * ★ 顺序与 isShareActive 一致：吊销优先，再看过期，最后看有没有令牌哈希。
 *   否则「已吊销但哈希还在」的行会被误判为可认领。
 */
export function isClaimWindowOpen(row: ClaimStateRow | null | undefined, now: Date = new Date()): boolean {
  if (!row || !row.claim_token_hash) return false
  if (row.claim_revoked_at) return false
  if (row.claim_expires_at) {
    const exp = new Date(row.claim_expires_at).getTime()
    if (Number.isFinite(exp) && exp <= now.getTime()) return false
  }
  return true
}

/** 生成商户单号（webhook 用它反查 guest_orders） */
export function buildGuestMerchantOrderId(guestOrderId: string, ts: number = Date.now()): string {
  return `MCG-${guestOrderId}-${ts}`
}

/**
 * 解析游客商户单号。
 * ★ 只认 MCG- 前缀；现有 MC-<userId>-<ts> 一律返回 null，避免把登录用户订单误当游客单。
 */
export function parseGuestMerchantOrderId(
  orderMerchantExternalId: unknown
): { guestOrderId: string; timestamp: number } | null {
  if (typeof orderMerchantExternalId !== 'string') return null
  const m = MERCHANT_ID_RE.exec(orderMerchantExternalId)
  if (!m) return null
  return { guestOrderId: m[1].toLowerCase(), timestamp: Number(m[2]) }
}

/** 是否游客单号（webhook 分流用，不看内容合法性细节） */
export function isGuestMerchantOrderId(orderMerchantExternalId: unknown): boolean {
  return parseGuestMerchantOrderId(orderMerchantExternalId) !== null
}

/** 邮箱归一：认领时买家邮箱与登录邮箱的比较口径（库里按 lower(buyer_email) 建了索引） */
export function normalizeEmail(email: unknown): string | null {
  if (typeof email !== 'string') return null
  const trimmed = email.trim().toLowerCase()
  return trimmed.length > 0 ? trimmed : null
}

/** 稳定序列化：键排序后拼接（对象字段顺序不影响摘要，与 reportCache 同口径） */
function stableStringify(v: unknown): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v) ?? 'null'
  if (Array.isArray(v)) return '[' + v.map(stableStringify).join(',') + ']'
  const obj = v as Record<string, unknown>
  return (
    '{' +
    Object.keys(obj)
      .sort()
      .map((k) => JSON.stringify(k) + ':' + stableStringify(obj[k]))
      .join(',') +
    '}'
  )
}

/**
 * 输入指纹：sha256(sku + 规范化后的报告输入)，用于同一邮箱重复提交时查重。
 * 付款前只提示、不硬拦（支付已发生后再拦会让 webhook 报错）。
 */
export function guestInputFingerprint(sku: string, input: unknown): string {
  return createHash('sha256')
    .update(stableStringify({ sku, input }), 'utf8')
    .digest('hex')
}
