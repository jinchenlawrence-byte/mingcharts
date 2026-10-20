// 速率限制「唯一判定入口」（AI token 防盗用第二档，2026-10-20）。
// 目的：门禁之前，AI 端点的最大敞口是【已登录用户无限次】触发；本层对 AI 端点做
//   per-user（登录）+ per-IP（匿名）固定窗口限流，超限返 429。
//
// ★★★★★ 开关（与 ENTITLEMENT_ENFORCE 同范式）：RATE_LIMIT_ENFORCE（服务端 env，默认 false）。
//   · 生产【不设】⇒ false ⇒ checkRateLimit 直接放行、不查库（内测期/本地/测试零影响）。
//   · 仅 Preview / 本地验证设 true 才开启按窗口硬校验。
//   ★ 必须【服务端】变量：不加 NEXT_PUBLIC_（否则进客户端 bundle）。三条守护断言见
//     scripts/test-enforce-guard.mjs（缺一不可，与 ENTITLEMENT_ENFORCE 同规格）。
//
// ★ 存储用 Supabase 表 rate_limits + 原子自增函数 bump_rate_limit（见 supabase/rate-limits.sql）——
//   部署在 Vercel（serverless 多实例、无粘性会话），内存计数跨实例不可靠，故必须共享存储。
// ★ 判定只此一处：路由不得各自写计数/判定（§8.5.1 同型错误防护）。
import type { SupabaseClient } from '@supabase/supabase-js'
import { createHash } from 'node:crypto'

/** ★★★★★ 限流总开关（与 ENTITLEMENT_ENFORCE 同范式：生产不设 ⇒ false） */
export const RATE_LIMIT_ENFORCE = process.env.RATE_LIMIT_ENFORCE === 'true'

/** 窗口长度常量 */
export const RATE_WINDOW = {
  minute: 60_000,
  hour: 3_600_000,
  day: 86_400_000,
} as const

export interface RateRule {
  /** 计数桶名（同一 key 在不同 bucket 独立计数） */
  bucket: string
  /** 窗口内允许的最大次数 */
  max: number
  /** 窗口长度（毫秒） */
  windowMs: number
}

/**
 * 登录用户（AI 端点）：5 次/分 + 50 次/日。
 * ★ 阈值是"产品配额"级护栏，不是精确速率——先挡脚本级突发与批量刷。
 */
export const USER_RULES: RateRule[] = [
  { bucket: 'ai_user_min', max: 5, windowMs: RATE_WINDOW.minute },
  { bucket: 'ai_user_day', max: 50, windowMs: RATE_WINDOW.day },
]

/** 匿名（AI 端点）：按 IP 哈希 5 次/分 + 30 次/日（第一档后匿名已零 AI 成本，此为兜底） */
export const ANON_RULES: RateRule[] = [
  { bucket: 'ai_anon_min', max: 5, windowMs: RATE_WINDOW.minute },
  { bucket: 'ai_anon_day', max: 30, windowMs: RATE_WINDOW.day },
]

/**
 * force=true（liunian 绕过缓存重算）：单独收紧为 3 次/时 + 10 次/日（登录用户）。
 * ★ 与 USER_RULES 叠加使用（force 请求既是 AI 请求，也占普通额度）。
 */
export const FORCE_RULES: RateRule[] = [
  { bucket: 'ai_force_hour', max: 3, windowMs: RATE_WINDOW.hour },
  { bucket: 'ai_force_day', max: 10, windowMs: RATE_WINDOW.day },
]

/** 固定窗口起点（纯函数，可断言）：floor(now / windowMs) * windowMs */
export function fixedWindowStart(now: number, windowMs: number): number {
  return Math.floor(now / windowMs) * windowMs
}

export interface RateResult {
  allowed: boolean
  /** 超限时建议的重试等待秒数（到窗口结束） */
  retryAfterSec: number
  /** 命中的超限规则桶（诊断用） */
  bucket?: string
}

/**
 * 固定窗口计数判定：对每条规则做原子自增并读回计数，任一超限即拒。
 * ★ 开关关闭（默认）/ 无客户端 / 计数失败 → 一律【放行】：限流是防护不是功能，
 *   绝不能让"计数基础设施故障"阻断正常业务（fail-open，失败留痕）。
 */
export async function checkRateLimit(
  admin: SupabaseClient | null,
  key: string,
  rules: RateRule[],
  now: number = Date.now()
): Promise<RateResult> {
  if (!RATE_LIMIT_ENFORCE) return { allowed: true, retryAfterSec: 0 }
  if (!admin) return { allowed: true, retryAfterSec: 0 }
  for (const rule of rules) {
    const windowStart = new Date(fixedWindowStart(now, rule.windowMs)).toISOString()
    const { data, error } = await admin.rpc('bump_rate_limit', {
      p_bucket: rule.bucket,
      p_key: key,
      p_window_start: windowStart,
    })
    if (error) {
      // ★ 计数失败：放行 + 留痕（例如迁移未跑 = 函数缺失）
      console.error('[rateLimit] 计数失败，放行本次:', error.code, error.message)
      return { allowed: true, retryAfterSec: 0 }
    }
    const count = typeof data === 'number' ? data : Number(data)
    if (Number.isFinite(count) && count > rule.max) {
      const resetAt = fixedWindowStart(now, rule.windowMs) + rule.windowMs
      return {
        allowed: false,
        retryAfterSec: Math.max(1, Math.ceil((resetAt - now) / 1000)),
        bucket: rule.bucket,
      }
    }
  }
  return { allowed: true, retryAfterSec: 0 }
}

/**
 * 客户端标识键：登录用户 → `u:<userId>`；匿名 → `ip:<sha256 前 16 位>`（不落原始 IP）。
 * ★ Vercel 上客户端 IP 取 x-forwarded-for 首段（x-real-ip 作为回退）。
 * ★ 防御式读取：headers 缺失（如断言直接以 mock 对象调用路由）一律归为 `ip:<hash('unknown')>`，
 *   绝不抛错（限流是防护不是功能，不能因取键失败阻断业务）。
 */
export function clientKey(
  userId: string | null,
  request: { headers?: { get(name: string): string | null } | null } | null | undefined
): string {
  if (userId) return `u:${userId}`
  const h = request?.headers
  const xff = (h?.get?.('x-forwarded-for') || h?.get?.('x-real-ip') || '')
  const ip = xff.split(',')[0].trim() || 'unknown'
  const hash = createHash('sha256').update(ip).digest('hex').slice(0, 16)
  return `ip:${hash}`
}

/** 限流响应体（429）：各路由统一用它构造响应，避免各处自写字面量 */
export function rateLimitedBody(result: RateResult): { error: string; code: string; retryAfter: number } {
  return {
    error: `请求过于频繁，请在 ${result.retryAfterSec} 秒后重试`,
    code: 'RATE_LIMITED',
    retryAfter: result.retryAfterSec,
  }
}
