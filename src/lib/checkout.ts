// 收银台会话创建（服务端共享件，档 C 2026-10-18）
//   一次性购买（/api/checkout）与会员订阅（/api/membership）共用本函数 ——
//   两者走【同一个】client.checkout.createSession，区别只在 productId 与 returnTo。
//   （已核实：SDK 的 createSession 同时支持一次性商品与订阅商品，无需第二套收银台。）
// ★ 仅服务端：本文件 import 了含私钥的 waffo.ts，禁止任何客户端组件引用。
// ─────────────────────────────────────────────────────────────
import { buildCheckoutParams, getAppUrl, getWaffo, getWaffoStoreId } from './waffo'

export interface CheckoutSessionInput {
  productId: string
  orderMerchantExternalId: string // MC-<userId>-<ts>
  buyerEmail: string
  userId: string
  sku: string
  chartId?: string
  returnTo?: string
  /** 收银台语言：省略即 zh-Hans（与旧行为一致）；繁体入口传 zh-Hant */
  locale?: unknown
}

export interface CheckoutSession {
  checkoutUrl: string
  sessionId: string
  ref: string // = orderMerchantExternalId（前端对账标识；绝不含渠道订阅单号 ORD_）
}

export async function createCheckoutSession(input: CheckoutSessionInput): Promise<CheckoutSession> {
  const params = buildCheckoutParams({
    productId: input.productId,
    orderMerchantExternalId: input.orderMerchantExternalId,
    buyerEmail: input.buyerEmail,
    userId: input.userId,
    sku: input.sku,
    chartId: input.chartId || undefined, // 空串=未关联，metadata 里落空串
    returnTo: input.returnTo || undefined, // 空串=不回跳指定页（成功页走默认 /chart）
    locale: input.locale,
    appUrl: getAppUrl(),
    storeId: getWaffoStoreId(),
  })
  const session = await getWaffo().checkout.createSession(params)
  return {
    checkoutUrl: session.checkoutUrl,
    sessionId: session.sessionId,
    ref: input.orderMerchantExternalId,
  }
}
