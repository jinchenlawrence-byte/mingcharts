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

/** 免费可见的板块 key（2–3 个），其余一律锁定 */
export const PREVIEW_FREE: Record<ReportModule, string[]> = {
  hemun: ['yearZodiac', 'day', 'wuxing'],          // 生肖配对、日柱夫妻宫、五行互补
  ziwei_deep: ['patterns', 'transforms'],          // 格局成败、生年四化（星盘本身常显）
  annual_report: ['overview', 'liuNian'],          // 四柱/喜忌/当前大运概览 + 三年流年概览
  geo: ['current', 'career'],                      // 现居城市 + 事业之城
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
