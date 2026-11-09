// ─────────────────────────────────────────────────────────────
// 定价页 SKU 定位（三语单一事实源）
//   起因（2026-11-09）：英文紫微免费报告的解锁按钮裸跳 /en/pricing，
//   落地中心是 Fate Book，用户想买紫微却容易买错。
//   · 免费态解锁 CTA 一律用 pricingFocusHref() 带上 ?sku= 与 #sku-<id>；
//   · 定价页 PricingFocus 读取该参数 → 顶部确认语 + 目标卡持续高亮；
//   · 参数非法/缺失 = 默认版面（调用方用 isFocusSku 先判，不做任何降级处理）。
//   价格与名称仍取 pricing.ts / pricingEn.ts，本文件不存第二份文案。
// ─────────────────────────────────────────────────────────────
import { SKUS, formatPriceUSD } from './pricing'
import { pathForLang, type SiteLang } from './lang'
import { toHant } from './hant'
import { SKU_EN } from './pricingEn'

/**
 * 可在定价页定位的商品（消费者 SKU）。
 * 与 ONE_TIME_SKUS + MEMBER_SKUS + ask_pack 逐项一致（test-pricing-focus 断言）；
 * 伙伴批量包不面向消费者定价页，故不在其中。
 */
export const FOCUS_SKUS = [
  'fatebook',
  'annual_report',
  'hemun',
  'ziwei_deep',
  'geo',
  'bundle3',
  'member_monthly',
  'member_yearly',
  'ask_pack',
] as const

export type FocusSku = (typeof FOCUS_SKUS)[number]

/** 严格校验（不接受空格/大小写变体/伙伴包）——非法即回退默认版面 */
export function isFocusSku(v: string | null | undefined): v is FocusSku {
  return typeof v === 'string' && (FOCUS_SKUS as readonly string[]).includes(v)
}

/** 定价页商品卡的锚点 id */
export function skuAnchorId(sku: string): string {
  return `sku-${sku}`
}

/** 免费态解锁 CTA → 定价页定向链接（三语路径由 pathForLang 决定） */
export function pricingFocusHref(locale: SiteLang, sku: FocusSku): string {
  return `${pathForLang('/pricing', locale)}?sku=${sku}#${skuAnchorId(sku)}`
}

/** 确认语里的商品名（与定价页展示同源：英文取 SKU_EN，繁中转写） */
export function skuFocusName(sku: FocusSku, locale: SiteLang): string {
  if (locale === 'en') return SKU_EN[sku].name
  const name = SKUS[sku].name
  return locale === 'zh-Hant' ? toHant(name) : name
}

/** 确认语里的价格（USD 单一事实源） */
export function skuFocusPrice(sku: FocusSku): string {
  return formatPriceUSD(SKUS[sku].priceUSD)
}
