import type { SkuId } from './pricing'

// 客户付款门户（改卡 / 查账单 / 取消订阅）。
// ★ 这是【公开链接、非密钥】，故放在本同构模块中，客户端组件可直接引用。
// 出处：Waffo 功能文档 Consumer Portal；任务书 §3.6 提到两处指南 URL 不一致，
// 统一采用此入口（不带 email 参数的登录页，由用户自行输邮箱核验身份）。
export const WAFFO_PORTAL_URL = 'https://pancake.waffo.ai/consumer/portal/login'

// ─────────────────────────────────────────────────────────────
// Waffo 商品映射（productId 由 Dashboard「一次性商品」创建后得到，形态如 PROD_xxx）
//
// ★ 本文件【不含任何密钥】，可被服务端组件与客户端安全引用。
// ★ productId 一个都不许硬编码写死（任务书 §10.4）：
//   待用户在 Dashboard 建好商品、把 productId 填进 .env.local 后，
//   优先在下方映射中登记（正式形态）；映射为空的 SKU 购买入口显示「即将推出」。
//
// 登记示例（拿到 productId 后取消注释）：
//   fatebook: 'PROD_xxxxxxxxxxxxxxxx',
// ─────────────────────────────────────────────────────────────
export const WAFFO_PRODUCTS: Partial<Record<SkuId, string>> = {
  // fatebook: '',
}

// 返回某 SKU 对应的 Waffo productId；未登记则返回 null（购买入口据此显示「即将推出」）
export function waffoProductId(sku: SkuId): string | null {
  const id = WAFFO_PRODUCTS[sku]
  return typeof id === 'string' && id.length > 0 ? id : null
}
