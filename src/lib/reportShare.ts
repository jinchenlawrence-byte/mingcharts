// 报告分享令牌（命理师白标 v1）
//
// 为什么单独成文件：令牌的「生成/有效性判定/路径」必须单一事实源 ——
// 页面、运维脚本、验收断言三处都要用同一套规则，手写必然漂移。
//
// ★ 仅服务端：本文件用 node:crypto，不得被客户端组件 import。
import { randomBytes } from 'node:crypto'

/** 默认有效期（天）。伙伴把链接发给客户，90 天足够看完；过期后客户点开会看到明确提示。 */
export const SHARE_TTL_DAYS = 90

/** 令牌字节数：32 字节 → base64url 43 字符（不可猜测，够用） */
export const SHARE_TOKEN_BYTES = 32

/** 合法令牌形状：base64url 字母表，长度固定 43 */
const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/

/** 生成新令牌（base64url，URL 安全，无填充） */
export function generateShareToken(): string {
  return randomBytes(SHARE_TOKEN_BYTES).toString('base64url')
}

/** 粗校验：形状不对就不必查库（省一次 service_role 查询，也少一条日志噪音） */
export function isShareTokenShape(token: unknown): token is string {
  return typeof token === 'string' && TOKEN_RE.test(token)
}

/** 从 now 起算的过期时间（ISO 字符串，直接写库） */
export function shareExpiryFrom(now: Date = new Date(), days: number = SHARE_TTL_DAYS): string {
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString()
}

export interface ShareStateRow {
  share_token?: string | null
  share_expires_at?: string | null
  share_revoked_at?: string | null
}

/**
 * 链接是否仍然有效。
 * ★ 顺序有讲究：吊销优先（先判 revoked），再看是否过期，最后看有没有令牌。
 *   否则「已吊销但未清空 token」的行会被误判为有效。
 */
export function isShareActive(row: ShareStateRow | null | undefined, now: Date = new Date()): boolean {
  if (!row || !row.share_token) return false
  if (row.share_revoked_at) return false
  if (row.share_expires_at) {
    const exp = new Date(row.share_expires_at).getTime()
    if (Number.isFinite(exp) && exp <= now.getTime()) return false
  }
  return true
}

/** 失效原因（给客户看的文案分三种，别一律 404） */
export function shareInactiveReason(
  row: ShareStateRow | null | undefined,
  now: Date = new Date()
): 'revoked' | 'expired' | 'missing' {
  if (!row || !row.share_token) return 'missing'
  if (row.share_revoked_at) return 'revoked'
  if (row.share_expires_at) {
    const exp = new Date(row.share_expires_at).getTime()
    if (Number.isFinite(exp) && exp <= now.getTime()) return 'expired'
  }
  return 'missing'
}

/** 分享路径（页脚/话术/脚本共用，避免三处手写 `/r/`） */
export function sharePath(token: string): string {
  return `/r/${token}`
}

/** 分享用的绝对地址（伙伴要把链接贴进 LINE/微信，必须是绝对地址） */
export function shareUrl(token: string, origin = 'https://www.mingcharts.com'): string {
  return `${origin.replace(/\/$/, '')}${sharePath(token)}`
}
