// ─────────────────────────────────────────────────────────────
// 英文商品文案（名称 / 描述）的唯一事实源。
//   · /en/pricing 展示与 scripts/create-en-products.mjs 建品共用本文件，避免两处漂移；
//   · 价格、类型、权益仍取 src/lib/pricing.ts 的 SKUS（那里才是价格单一事实源）；
//   · ★ 商品名不加 " · EN" 后缀：渠道后台靠 PROD_ ID 区分中英文商品。
// ─────────────────────────────────────────────────────────────
import { ASK_PACK_SIZE, MEMBER_ASK_PER_MONTH, type SkuId } from './pricing'

export interface EnProductCopy {
  name: string
  desc: string
}

export const SKU_EN: Record<SkuId, EnProductCopy> = {
  fatebook: {
    name: 'Fate Book',
    desc: 'A full-length reading that shows the whole chart at a glance',
  },
  annual_report: {
    name: 'Annual report',
    desc: 'Three years of Annual Pillars with monthly rhythm — this year, next year and the year after',
  },
  hemun: {
    name: 'Bazi synastry',
    desc: 'Two-chart compatibility across nine dimensions, graded by classics, classical method and folk custom',
  },
  ziwei_deep: {
    name: 'Zi Wei Dou Shu in depth',
    desc: 'Full twelve-palace chart plus twelve written sections: chart overview, temperament, palaces, career, wealth, marriage, health, Four Transformations, structure, decadal cycle, annual cycle and guidance',
  },
  geo: {
    name: 'Location & Direction · Cities of wealth',
    desc: 'Directional Five Elements and city qi, with five city recommendations',
  },
  bundle3: {
    name: 'Fate Book bundle',
    desc: 'Fate Book + Zi Wei Dou Shu + Location & Direction in one purchase',
  },
  member_monthly: {
    name: 'Monthly membership',
    desc: `Daily personal reading + monthly rhythm + ${MEMBER_ASK_PER_MONTH} AI questions per month`,
  },
  member_yearly: {
    name: 'Annual membership',
    desc: `Daily personal reading + monthly rhythm + ${MEMBER_ASK_PER_MONTH} AI questions per month, at a better annual rate`,
  },
  ask_pack: {
    name: 'Question pack',
    desc: `${ASK_PACK_SIZE} AI astrologer questions`,
  },
  // 伙伴批量包不在英文渠道建品（本节仅供 /en 页面类型完整）。
  partner_credits_10: { name: 'Partner report pack · 10', desc: 'Ten client reports for professional readers.' },
  partner_credits_50: { name: 'Partner report pack · 50', desc: 'Fifty client reports for professional readers.' },
  partner_credits_200: { name: 'Partner report pack · 200', desc: 'Two hundred client reports for professional readers.' },
}

/**
 * 需要在 Waffo 建英文商品的 9 个 SKU（伙伴包不建）。
 * 顺序：一次性报告 → 追问包 → 两个订阅。
 */
export const EN_PRODUCT_SKUS: SkuId[] = [
  'fatebook', 'annual_report', 'hemun', 'ziwei_deep', 'geo', 'bundle3',
  'ask_pack', 'member_monthly', 'member_yearly',
]
