// 报告缓存（HANDOFF-年运披露与报告缓存 §三）—— 可复用模块，下一轮接命书/合婚/紫微/地理时不重写
//
// 三原则（§〇-3/4/5，验收红线）：
//   ① 【只存内容，不存权益状态】：写入前剥掉 locked（stripEntitlementState）；
//      读取后 locked / ai / aiSource 一律按当前权益重算（recomputeEntitlementFields）。
//      —— 这样「先试吃、后付费」才正确：试吃期写入的空内容（ai=null）读取时视为未命中，
//         下次请求重新生成并覆盖，缓存自愈，绝不会把锁定版发给已解锁用户（反之亦然）。
//   ② 【缓存键显式含算法版本】：改 AI prompt / 判据 / 排盘算法任一时必须手动 +1，
//      否则旧缓存会与新规则矛盾。
//   ③ 【覆盖写，不新增行】：同一 (user_id, kind, cache_key) 只保留一行——
//      落库走 reportSave.saveReport 的 cacheKey 分支（查到同键行则 update，否则 insert），
//      顺带修掉「重复点击堆积重复行」的现存问题。
//
// 缓存键构成（§3.2）：kind + v{版本} + targetYear + 八字时间参数全量 的稳定摘要。
// ★ 八字参数不止年月日时——还有 分钟 / 时区 / 经度（真太阳时）：
//   用户补填出生地后四柱可能变化，键若不变会命中错误缓存，故全量入键；
//   nowYear 也入键：流年窗口（-8..+2）随年份滚动，跨年后旧缓存自然失效。
import { createHash } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * ★★ 改动【AI prompt / 判据 / 排盘算法】任一时必须 +1（否则旧缓存与新规则矛盾）。
 * 本任务书 §〇-4 明文要求；下一轮接其它报告模块时各起各的版本常量。
 */
// ★ 2：2026-10-22 流月由「仅当年」扩为「当年/明年/后年」+ prompt 增预测措辞条款（纪律要求 +1）
export const ANNUAL_CACHE_VERSION = 2

/**
 * ★★ 合婚/紫微/地理的缓存版本（同上纪律：改 AI prompt / 判据 / 排盘算法必须 +1）。
 *   这三个模块本轮只为「覆盖写」引入 cacheKey（同一请求参数重复生成不堆积重复行），
 *   读取侧仍由详情页 reportGate 按当前权益重算。
 */
export const HEMUN_CACHE_VERSION = 1
// ★ 2：2026-10-18 紫微 6 板块 → 12 板块（prompt 结构改写，纪律要求 +1）
export const ZIWEI_CACHE_VERSION = 2
export const GEO_CACHE_VERSION = 1

/** 年运缓存的入键参数全量（route 的 reportInput 与此同源） */
export interface AnnualCacheInput {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  gender: number
  targetYear: number
  /** 出生地时区（无出生地为 null）——真太阳时入键，防补填出生地后命中错误缓存 */
  birthZone: string | null
  /** 出生地经度（无出生地为 null） */
  birthLng: number | null
  /** 请求当年——流年窗口随年份滚动，入键使跨年旧缓存自然失效 */
  nowYear: number
}

/** 稳定序列化：键排序后拼接（对象字段顺序不影响摘要） */
function stableStringify(v: unknown): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v) ?? 'null'
  if (Array.isArray(v)) return '[' + v.map(stableStringify).join(',') + ']'
  const obj = v as Record<string, unknown>
  return '{' + Object.keys(obj).sort()
    .map(k => JSON.stringify(k) + ':' + stableStringify(obj[k])).join(',') + '}'
}

/** 年运缓存键：annual:v{版本}:y{目标年}:{参数全量摘要}（摘要取 sha1 前 16 位） */
export function annualCacheKey(input: AnnualCacheInput): string {
  const digest = createHash('sha1').update(stableStringify(input)).digest('hex').slice(0, 16)
  return `annual:v${ANNUAL_CACHE_VERSION}:y${input.targetYear}:${digest}`
}

/** 通用报告缓存键：{kind}:v{版本}:{参数全量摘要}（摘要取 sha1 前 16 位，字段顺序无关） */
export function reportCacheKey(kind: string, version: number, input: unknown): string {
  const digest = createHash('sha1').update(stableStringify(input)).digest('hex').slice(0, 16)
  return `${kind}:v${version}:${digest}`
}

/**
 * 写缓存前剥掉权益状态（locked / preview 都是派生字段，入缓存即违反原则①）。
 * ★ preview 也必须剥：试读期写下 only=true 后用户付费，命中缓存时若沿用旧标记会把
 *   已购用户渲染成锁定形态（与「付费后仍显示未解锁」同型事故）。
 */
export function stripEntitlementState<T extends object>(data: T): Omit<T, 'locked' | 'preview'> {
  const content = { ...data } as Record<string, unknown>
  delete content.locked
  delete content.preview
  return content as Omit<T, 'locked' | 'preview'>
}

/**
 * 缓存内容是否可用：ai 为 null 的缓存 = 试吃期写入的空内容（原则①的推论），
 * 视为未命中 → 重新生成并覆盖（缓存自愈），确保已解锁请求永远拿得到全文。
 */
export function isCacheContentUsable(content: unknown): boolean {
  return !!content && typeof content === 'object'
    && (content as { ai?: unknown }).ai != null
}

/**
 * 缓存命中后按【当前权益】重算派生字段，绝不复用缓存中的 locked/ai/aiSource：
 *   · 未解锁 → ai 置空、locked 给 preview（即使缓存里带了全文也不外泄）
 *   · 已解锁 → locked 置 null、ai 用缓存全文
 */
export function recomputeEntitlementFields<C extends Record<string, unknown>>(
  cached: C,
  opts: { unlocked: boolean; skus: string[]; lockedPreview: string }
): C & { locked: { skus: string[]; preview: string } | null } {
  return {
    ...cached,
    locked: opts.unlocked ? null : { skus: opts.skus, preview: opts.lockedPreview },
    ai: opts.unlocked ? cached.ai : null,
    aiSource: opts.unlocked ? (cached.aiSource ?? null) : '未解锁'
  }
}

/** 从缓存内容取目标流年项（locked preview 需要流年干支） */
export function cachedTargetOf(
  content: Record<string, unknown>,
  targetYear: number
): { ganZhi?: string } | null {
  const arr = content.liuNian
  if (!Array.isArray(arr)) return null
  return (arr as Array<{ year?: number; ganZhi?: string }>).find(y => y.year === targetYear) ?? null
}

/** 缓存命中行（reports 表复用：结果即缓存，方案 A） */
export interface ReportCacheHit {
  reportId: string
  content: Record<string, unknown>
}

/**
 * ★ 缓存命中的完整处置（REPLY-23 复核 发现①）：判可用 → 按当前权益重算 → 组装响应数据，
 *   全部收进一个纯函数，route 只剩一行调用（接线风险降到最低）。
 *   抽纯函数的原因：ENTITLEMENT_ENFORCE=false 期间 canView 恒 true，路由层【造不出】
 *   未解锁请求——「未解锁命中带全文的缓存」这一安全方向只能靠断言直接喂数据守护：
 *   未解锁时必须 ai=null 且 locked 非 null（缓存里的付费全文绝不外泄）。
 *   牙口注入点：函数体改回直接下发 hit.content（不重算）→ 断言⑦翻红。
 *   （preview 文案目前是年运口径；接其它模块时把 preview 生成参数化即可，函数骨架通用。）
 * @returns null = 缓存不可用（ai 为空的试吃期内容 → 调用方走重生成，缓存自愈）
 */
export function resolveCachedHit(
  hit: ReportCacheHit,
  opts: { unlocked: boolean; skus: string[]; targetYear: number }
): { reportId: string; data: Record<string, unknown> } | null {
  if (!isCacheContentUsable(hit.content)) return null
  const cachedItem = cachedTargetOf(hit.content, opts.targetYear)
  const data = recomputeEntitlementFields(hit.content, {
    unlocked: opts.unlocked,
    skus: opts.skus,
    lockedPreview: `${opts.targetYear}年（${cachedItem?.ganZhi ?? ''}年）流年详批：事业/财运/感情/健康分维度深度解读解锁后可见。`
  })
  return { reportId: hit.reportId, data }
}

/**
 * ★ 真·AI 结果标记：只有 aiSource 等于它的缓存才允许被【短路读取】。
 *   规则兜底（AI 失败 / 当日预算熔断降级）写出的内容虽 ai≠null，但属【降级内容】；
 *   若也短路读取，预算熔断当天写下的规则版会被后续请求永久读走，AI 恢复后用户仍拿降级版——
 *   故这类缓存一律视为未命中 → 调用方重新生成并覆盖（与「试吃空内容」同样的自愈路径）。
 */
export const GENUINE_AI_SOURCE = 'AI 深度解读'

/**
 * ★ 通用报告模块（紫微/合婚/地理）的缓存命中处置：与年运 resolveCachedHit 同源，但无需 targetYear。
 *   判可用（ai 非空）→ 判【真·AI 结果】（aiSource 为 GENUINE_AI_SOURCE）→ 按当前权益重算
 *   locked/ai/aiSource 组装响应；任一不满足返回 null（走重生成，缓存自愈）。
 *   牙口注入点：去掉「aiSource 判真」这一行 → 断言⑩（降级内容不短路）翻红。
 */
export function resolveModuleCachedHit(
  hit: ReportCacheHit,
  opts: { unlocked: boolean; skus: string[]; lockedPreview: string }
): { reportId: string; data: Record<string, unknown> } | null {
  if (!isCacheContentUsable(hit.content)) return null
  if (hit.content.aiSource !== GENUINE_AI_SOURCE) return null
  const data = recomputeEntitlementFields(hit.content, {
    unlocked: opts.unlocked,
    skus: opts.skus,
    lockedPreview: opts.lockedPreview
  })
  return { reportId: hit.reportId, data }
}

/** 读取缓存（service_role 客户端由调用方传入；查不到/出错一律返回 null，不阻断主流程） */
export async function readReportCache(
  admin: SupabaseClient,
  userId: string,
  kind: string,
  cacheKey: string
): Promise<ReportCacheHit | null> {
  const { data, error } = await admin
    .from('reports')
    .select('id, result')
    .eq('user_id', userId)
    .eq('kind', kind)
    .eq('cache_key', cacheKey)
    // ★ 第 34 轮：只把 ready 行当缓存命中（伙伴自助的 pending/failed 行 result={} 不可复用）
    .eq('status', 'ready')
    .maybeSingle()
  if (error || !data) return null
  return {
    reportId: data.id as string,
    content: (data.result ?? {}) as Record<string, unknown>
  }
}
