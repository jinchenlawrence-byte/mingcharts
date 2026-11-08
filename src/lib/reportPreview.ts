// 付费报告「试读」统一口径（合婚 / 紫微深度 / 年运 / 方位）
//
// ★ 判定只看【是否持有对应 SKU 权益】，与 ENTITLEMENT_ENFORCE 无关：
//   内测期 canView 恒真，不能再用它做报告门禁（否则未购用户永远拿到全文）。
//   唯一判定仍是 entitlement.grantsCover（含 bundle3 隐式覆盖）——本文件只是它的报告侧命名。
//
// 试读形态：
//   · 未持有 → 只展示 PREVIEW_FREE 列出的规则引擎确定性板块全文，
//     其余规则板块与全部 AI 板块只给「标题 + 模糊占位 + 解锁按钮」；
//     route 同时不生成、不下发 AI 全文（省成本）。
//   · 已持有 → only=false，渲染路径与未改前完全一致。
import { grantsCover } from './entitlement'
import type { SkuId, GrantId } from './pricing'

export type ReportModule = 'hemun' | 'ziwei_deep' | 'annual_report' | 'geo'

/**
 * 紫微锁定区文案（模块页 route 与详情页同源）。
 * ★ 必须写清「付费后能看到哪些模块」，不许用「解锁更多」这类空话。
 */
export const ZIWEI_LOCKED_PREVIEW =
  '免费试读含「命格总论」「性格底色」两个模块的规则版。付费后可看完整版其余 10 个模块：十二宫导读、事业格局、财富财运、感情婚姻、身心安康、生年四化专题、格局成败、大限十年、流年与流月、趋避建议（AI 深度解读，逐条给出星曜依据）。'
export const ZIWEI_LOCKED_PREVIEW_EN =
  'The free preview covers two modules: chart overview and temperament, in rule-based form. The full report adds the remaining ten modules — the twelve palaces, career, wealth, marriage, health, the Four Transformations, patterns, the decade, the annual and monthly periods, and practical guidance — each read by AI with star-level reasoning.'

/** 免费可见的板块 key（2–3 个），其余一律锁定 */
export const PREVIEW_FREE: Record<ReportModule, string[]> = {
  hemun: ['yearZodiac', 'day', 'wuxing'],          // 生肖配对、日柱夫妻宫、五行互补
  // ★ 2026-11-09 用户更正：紫微免费层 = 深度解读列表的【前两个模块】（命格总论、性格底色），
  //   付费墙从第三个模块（十二宫导读）开始；不是按页面顶层区块截前两个。
  ziwei_deep: ['overview', 'personality'],
  annual_report: ['overview', 'liuNian'],          // 四柱/喜忌/当前大运概览 + 三年流年概览
  // ★ 现居城市不属于 categories（其 key 只有 wealth/career/patron/home/talent），
  //   在渲染层常显；此处只列类别白名单，避免出现匹配不到任何类别的幽灵 key。
  geo: ['career'],                                 // 事业之城（+ 现居城市常显）
}

/**
 * 从全量板块对象中只挑出免费板块（其余键不进入响应 / DOM）。
 * 未解锁用户拿到的是规则版内容的前 N 个模块，付费模块一个字符都不下发。
 */
export function pickPreviewSections<T extends Record<string, unknown>>(
  ai: T | null | undefined,
  keys: string[]
): T | null {
  if (!ai) return null
  const out: Record<string, unknown> = {}
  for (const key of keys) {
    const v = ai[key]
    if (typeof v === 'string' && v.trim().length > 0) out[key] = v
  }
  return Object.keys(out).length > 0 ? (out as T) : null
}

/** 门禁只需权益集（页面对应 /api/entitlements 的返回形态） */
export interface PreviewEntitlements {
  memberSkus: SkuId[]
  ownedSkus: Set<SkuId> | SkuId[]
}

/** 是否已持有该报告权益（报告门禁用；与详情页 reportGate 的 grantsCover 同源） */
export function reportUnlocked(ent: PreviewEntitlements, grant: GrantId): boolean {
  return grantsCover(ent, grant)
}

/** 是否处于「试读（未购买）」状态 */
export function previewOnly(ent: PreviewEntitlements, grant: GrantId): boolean {
  return !reportUnlocked(ent, grant)
}

/** 响应里的试读标记（only = !unlocked；keys = 免费板块） */
export function previewPayload(
  module: ReportModule,
  unlocked: boolean
): { only: boolean; keys: string[] } {
  return { only: !unlocked, keys: [...PREVIEW_FREE[module]] }
}
