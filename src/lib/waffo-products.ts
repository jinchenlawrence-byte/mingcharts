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
// ★★ 登记规则：productId 【只在本映射这一处登记】——
//    映射可静态分析（SSR 即知是否开放购买），且【客户端组件读得到】；
//    env 方案做不到这两点，故不采用 env（见任务书待拍板①）。
// ★ 映射为空的 SKU，购买入口显示「即将推出」（见 waffoProductId 与 pricing 页）。
// ─────────────────────────────────────────────────────────────
export const WAFFO_PRODUCTS: Partial<Record<SkuId, string>> = {
  // 命书报告（29.99 USD 一次性）—— Dashboard 商品 ID
  fatebook: 'PROD_1H2rQWsIKwlqkHG3xMR01v',
  // ★ 2026-10-15 KYB 前建齐的 5 个单次商品（一次性 · USD）：
  //   清掉定价页「即将推出」占位（Waffo 驳回原因之一），同时铺开收费 SKU
  annual_report: 'PROD_20CtFwrNYJQhg8MzIlSjW7',   // 年运报告 19.99
  hemun: 'PROD_5kh2QzFYoJe5yT5d1otzNf',           // 合婚详批 29.99
  ziwei_deep: 'PROD_7GDUSvdGALlj7Qcs14sa4Z',      // 紫微深度 24.99
  geo: 'PROD_6q01k9z1RWAL6WtmNvTpgp',             // 地理财富之城 19.99
  bundle3: 'PROD_28gtfik2BVN7O3m6KX2PVG',         // 三合一套餐 59.99
  // ★ 会员订阅（档 C 2026-10-18 建档，2026-10-19 登记）：由 scripts/create-subscription-products.mjs
  //   创建并发布（subscriptionProducts.create + publish），已向渠道复核价格/周期/状态均为 active。
  //   登记规则不变：productId 只在【本映射这一处】登记。
  //   ★ 登记即开闸：购买入口由「即将推出」切换为可购，POST /api/membership 改为创建真实收银台会话。
  member_monthly: 'PROD_0BmnFGAMCcVqmxmhTKbqfZ',  // 月度会员 9.90 USD / monthly
  member_yearly: 'PROD_2SKD8c2E4RmOD7I0NdebXq',   // 年度会员 49.00 USD / yearly
  // ★ 追问包（ask_pack，$4.99 / ASK_PACK_SIZE 次）—— 2026-10-20 登记：由
  //   scripts/create-onetime-products.mjs 创建并发布（onetimeProducts.create + publish）。
  //   登记即开闸：pricing 页与 /chart 追问面板的购买入口由「即将推出」切换为可购。
  ask_pack: 'PROD_46MgOElCSTRpOGA3eJCJh0',        // 追问包 4.99 USD 一次性
}

// 返回某 SKU 对应的 Waffo productId；未登记则返回 null（购买入口据此显示「即将推出」）
export function waffoProductId(sku: SkuId): string | null {
  const id = WAFFO_PRODUCTS[sku]
  return typeof id === 'string' && id.length > 0 ? id : null
}
