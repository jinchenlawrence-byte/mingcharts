// ─────────────────────────────────────────────────────────────
// Waffo Pancake 支付 SDK 服务端封装（@waffo/pancake-ts@0.25.0）
//
// ★★ 本文件【仅限服务端】：
//   · 只允许被 app/api/** 的 route handler / server-only 模块 import；
//   · WAFFO_PRIVATE_KEY 绝不能进客户端 bundle，因此本文件不允许任何 client
//     component 引用，也绝不要把环境变量加 NEXT_PUBLIC_ 前缀。
// ─────────────────────────────────────────────────────────────
import { WaffoPancake, verifyWebhook } from '@waffo/pancake-ts'
import type {
  CreateCheckoutSessionParams,
  PaymentMethod,
  WebhookEvent,
  WebhookEventData,
} from '@waffo/pancake-ts'

// 双保险：万一被误打进客户端，模块加载即炸（不泄露任何密钥）
if (typeof window !== 'undefined') {
  throw new Error('src/lib/waffo.ts 仅限服务端使用，禁止在客户端引用')
}

// 客户付款门户（改卡/查账单），任务书 §5.7 统一入口；定义在同构模块 waffo-products.ts
export { WAFFO_PORTAL_URL } from './waffo-products'

// Webhook 时间窗：任务书 §7.2 要求 45 分钟（2700000ms）。
// SDK 0.25.0 类型默认值已是 2700000，但这里显式钉死，不依赖默认值漂移。
export const WAFFO_WEBHOOK_TOLERANCE_MS = 45 * 60 * 1000

interface WaffoConfig {
  merchantId: string
  privateKey: string
  storeId: string
  appUrl: string
}

// 读取并校验配置；缺任一项即【明确报错】，不允许裸 500 静默继续
function readWaffoConfig(): WaffoConfig {
  const merchantId = process.env.WAFFO_MERCHANT_ID?.trim()
  const privateKey = process.env.WAFFO_PRIVATE_KEY?.trim()
  const storeId = process.env.WAFFO_STORE_ID?.trim()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim()
  const missing: string[] = []
  if (!merchantId) missing.push('WAFFO_MERCHANT_ID')
  if (!privateKey) missing.push('WAFFO_PRIVATE_KEY')
  if (!storeId) missing.push('WAFFO_STORE_ID')
  if (!appUrl) missing.push('NEXT_PUBLIC_APP_URL')
  if (missing.length > 0) {
    throw new Error(
      `Waffo 支付未配置：缺少环境变量 ${missing.join('、')}。请在 .env.local（本地）或 Vercel 后台（线上）补齐，见 .env.example。`,
    )
  }
  // 上面已逐项校验非空，这里断言收窄
  return {
    merchantId: merchantId as string,
    privateKey: privateKey as string,
    storeId: storeId as string,
    appUrl: appUrl as string,
  }
}

let client: WaffoPancake | null = null

// SDK 单例；首次使用时才构造（测试模式身份由 API Key 自行决定，无需额外参数）
export function getWaffo(): WaffoPancake {
  if (client) return client
  const cfg = readWaffoConfig()

  // 服务端出口按【显式设置】走代理（与 createServerSupabase 同理：Node 默认不吃系统代理，直连被墙）
  // ★ 绝不写死本地地址 fallback（HANDOFF-24）：setGlobalDispatcher 指向不存在的代理时
  //   本身不抛错，但之后所有请求 ECONNREFUSED（2026-10-12 实测确认）；
  //   Vercel 上没有 7897 端口 → 写死 fallback 上线即全挂。本机开发设 HTTPS_PROXY，生产绝不设。
  const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY
  if (typeof window === 'undefined' && proxyUrl) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { ProxyAgent, setGlobalDispatcher } = require('undici')
      setGlobalDispatcher(new ProxyAgent(proxyUrl))
    } catch (e) {
      console.warn('[waffo] undici 代理配置失败，将直连:', (e as Error).message)
    }
  }

  client = new WaffoPancake({
    merchantId: cfg.merchantId,
    privateKey: cfg.privateKey,
  })
  return client
}

export function getWaffoStoreId(): string {
  return readWaffoConfig().storeId
}

export function getAppUrl(): string {
  return readWaffoConfig().appUrl
}

// ── Webhook 验签（任务书 §7.2）──────────────────────────────
// 必须由调用方传入【原始 request.text() 字符串】，禁止 request.json() 后重序列化。
// 公钥由 SDK 按事件 mode 自动选择（省略 options 时先试 prod 再 test），
// 同时支持经环境变量覆盖（WAFFO_WEBHOOK_TEST_PUBLIC_KEY / ..._PROD_...）。
export function verifyWaffoEvent(
  rawBody: string,
  signatureHeader: string,
): WebhookEvent<WebhookEventData> {
  return verifyWebhook(rawBody, signatureHeader, {
    // 对称 ±45 分钟时钟窗（SDK 默认 futureToleranceMs 仅 60 秒，会误伤时钟略快的投递；
    // 任务书 §7.2 明确要求 ±45min 容差，故两侧都钉成 45 分钟）
    toleranceMs: WAFFO_WEBHOOK_TOLERANCE_MS,
    futureToleranceMs: WAFFO_WEBHOOK_TOLERANCE_MS,
  })
}

// ── createSession 入参构造（纯函数，便于离线行为断言）─────────
export interface CheckoutParamsInput {
  productId: string
  orderMerchantExternalId: string // MC-<userId>-<ts>，≤128 字符（SDK 会校验）
  buyerEmail: string
  userId: string
  sku: string
  appUrl: string
  storeId: string
}

export type WaffoCheckoutParams = CreateCheckoutSessionParams & {
  // SDK 0.25.0 的 .d.ts 漏声明 storeId，但运行时 create-session 原样透传，
  // 且同包资源（auth 等）均接收 STO_ 前缀 storeId；任务书要求显式带上店铺身份。
  storeId?: string
}

export function buildCheckoutParams(input: CheckoutParamsInput): WaffoCheckoutParams {
  const base = new URL(input.appUrl)
  const isLoopback = ['localhost', '127.0.0.1', '::1'].includes(base.hostname)
  // 生产/隧道必须是 https；仅允许本机 http 开发地址例外
  if (base.protocol !== 'https:' && !isLoopback) {
    throw new Error(
      `NEXT_PUBLIC_APP_URL 必须是 https 绝对地址（当前：${input.appUrl}）；本地联调请填 cloudflared/ngrok 的 https 隧道地址。`,
    )
  }
  const successUrl = `${base.origin}/checkout/success?ref=${encodeURIComponent(input.orderMerchantExternalId)}`
  const cardOnly: PaymentMethod[] = ['card']
  return {
    storeId: input.storeId,
    productId: input.productId,
    currency: 'USD',
    buyerEmail: input.buyerEmail.trim().toLowerCase(),
    language: 'zh-Hans',
    includePaymentMethods: cardOnly,
    orderMerchantExternalId: input.orderMerchantExternalId,
    metadata: {
      // metadata 值必须是字符串（SDK 类型 Record<string,string>）
      userId: input.userId,
      sku: input.sku,
    },
    successUrl,
  }
}
