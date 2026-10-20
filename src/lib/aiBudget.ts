// AI 全局日预算「熔断」（token 防盗用第三档，2026-10-20）——成本的【天花板】。
// 一档堵匿名、二档堵单用户滥刷；本档是最后一道：全站当日 AI 生成量超预算即【全站降级】。
//
// ★★★★★ 与 ENTITLEMENT_ENFORCE / RATE_LIMIT_ENFORCE 同范式的开关：
//   AI_BUDGET_ENFORCE（服务端 env，默认 false）。生产【不设】⇒ false ⇒ 不查库、不计数（内测放行）。
//   三条守护断言见 scripts/test-enforce-guard.mjs（无 NEXT_PUBLIC_ 前缀 / 不设⇒false / .example 注释掉）。
//
// ★★ 预算按【日活用户（DAU）】设定（用户拍板）：budget = max(昨日 DAU, 下限) × 每人日均 AI 配额。
//   · 用【昨日】DAU 而非今日实时计数 —— DAU 是回溯指标：早晨今日计数远低于实际，
//     据今日算会让早预算过低、晚又虚高（自引用陷阱）。用昨日投影更稳。
//   · 数据源：reports 表昨日【去重 user_id 数】（= 昨日生成过报告的人，正是 AI 成本相关人群）。
//   · 下限：昨日 0 活跃（新站/冷启动）时不可使预算为 0（会全站停摆）——按 AI_DAU_FLOOR 兜底。
//   · 可显式覆盖：AI_DAILY_BUDGET（绝对上限，设置后不再按 DAU 投影）。
//
// ★★★ 语义（与限流【相反】）：
//   · 限流超限 → 该用户 429（fail-open on infra）；
//   · 预算超限 → 【全站 AI 降级为规则版】（200 但无 AI 文本），这是成本天花板，绝不放行新 AI 生成。
//   · 但「计数基础设施故障」（函数缺失/网络错）→ 保守放行 + 告警（不因基建故障阻断全体用户）。
//   · 本档是 fail-closed（针对"超额"）＋ fail-open（针对"基建故障"），两者刻意区分。
import type { SupabaseClient } from '@supabase/supabase-js'

/** ★★★★★ 预算熔断总开关（生产不设 ⇒ false） */
export const AI_BUDGET_ENFORCE = process.env.AI_BUDGET_ENFORCE === 'true'

/** 昨日 DAU 下限：防昨日 0 活跃致预算为 0、全站停摆 */
export const AI_DAU_FLOOR = 20
/** 每活跃用户每日 AI 生成配额（含合规重试；远高于真实人均，只作上限） */
export const AI_PER_USER_DAILY_BUDGET = 10

/** 全局计数桶/键（复用 rate_limits 表与 bump_rate_limit 原子自增函数，无需新表） */
export const GLOBAL_AI_BUCKET = 'ai_global_day'
export const GLOBAL_AI_KEY = 'global'

const DAY_MS = 86_400_000

/**
 * 纯函数：按 DAU 投影算当日全局 AI 生成预算。
 * budget = max(dau, AI_DAU_FLOOR) × AI_PER_USER_DAILY_BUDGET。
 */
export function dailyBudgetFor(dau: number): number {
  const d = Number.isFinite(dau) && dau > 0 ? Math.floor(dau) : 0
  return Math.max(d, AI_DAU_FLOOR) * AI_PER_USER_DAILY_BUDGET
}

/** 预算解析：显式 AI_DAILY_BUDGET 优先；否则按昨日 DAU 投影（纯函数，供断言传假 env） */
export function resolveDailyBudget(
  dau: number,
  env: Record<string, string | undefined> = process.env
): number {
  const explicit = Number(env.AI_DAILY_BUDGET)
  if (Number.isFinite(explicit) && explicit > 0) return Math.floor(explicit)
  return dailyBudgetFor(dau)
}

/** 当日窗口起点（UTC 日）——与限流窗口同口径，保证计数天然按日归零 */
export function dayWindowStart(now: number): number {
  return Math.floor(now / DAY_MS) * DAY_MS
}

/**
 * 昨日 DAU 投影：昨日（UTC 日）在 reports 表里出现过的【去重 user_id 数】。
 * 读失败 → 0（由 dailyBudgetFor 的 floor 兜底；不阻断）。
 */
export async function yesterdayReportDau(admin: SupabaseClient, now: number): Promise<number> {
  const todayStart = dayWindowStart(now)
  const from = new Date(todayStart - DAY_MS).toISOString()
  const to = new Date(todayStart).toISOString()
  const { data, error } = await admin
    .from('reports')
    .select('user_id')
    .gte('created_at', from)
    .lt('created_at', to)
  if (error) {
    console.error('[aiBudget] 昨日 DAU 查询失败:', error.code, error.message)
    return 0
  }
  return new Set((data ?? []).map((r) => (r as { user_id?: string }).user_id)).size
}

// ── 30 秒 TTL 内存缓存：避免每次 AI 请求都查 DAU ──
// serverless 多实例各自缓存 30 秒是可接受的精度损失（预算本就粗粒度）。
const DAU_TTL_MS = 30_000
let dauCache: { at: number; value: number } | null = null

/** 清空 DAU 缓存（断言用） */
export function clearDauCache(): void {
  dauCache = null
}

async function dauCached(admin: SupabaseClient, now: number): Promise<number> {
  if (dauCache && now - dauCache.at < DAU_TTL_MS) return dauCache.value
  const value = await yesterdayReportDau(admin, now)
  dauCache = { at: now, value }
  return value
}

export interface AiBudgetState {
  /** 开关是否开启 */
  enforce: boolean
  /** 当日已消耗的 AI 生成计数 */
  spent: number
  /** 当日预算（按 DAU 投影或显式覆盖） */
  budget: number
  /** 是否已超预算（超 → 全站 AI 降级为规则版） */
  exhausted: boolean
}

/**
 * 判定当日预算是否已耗尽（并原子记一次用量）。调用点：AI 生成【之前】。
 * ★ 开关关闭 / 无客户端 → 直接放行、不计数（内测/匿名零影响）。
 * ★ 基建故障（计数或 DAU 查询失败）→ 放行 + 告警（fail-open）。
 */
export async function checkAiBudget(
  admin: SupabaseClient | null,
  now: number = Date.now()
): Promise<AiBudgetState> {
  if (!AI_BUDGET_ENFORCE) return { enforce: false, spent: 0, budget: 0, exhausted: false }
  if (!admin) return { enforce: true, spent: 0, budget: 0, exhausted: false }

  const dau = await dauCached(admin, now)
  const budget = resolveDailyBudget(dau)

  const { data, error } = await admin.rpc('bump_rate_limit', {
    p_bucket: GLOBAL_AI_BUCKET,
    p_key: GLOBAL_AI_KEY,
    p_window_start: new Date(dayWindowStart(now)).toISOString(),
  })
  if (error) {
    console.error('[aiBudget] 计数失败，放行本次（fail-open，基建故障不阻断）:', error.code, error.message)
    return { enforce: true, spent: 0, budget, exhausted: false }
  }
  const spent = Number(data)
  return { enforce: true, spent: Number.isFinite(spent) ? spent : 0, budget, exhausted: Number.isFinite(spent) && spent > budget }
}
