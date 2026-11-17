import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { WaffoPancakeError } from '@waffo/pancake-ts'
import { createServerSupabase } from '@/lib/supabase'
import { createCheckoutSession } from '@/lib/checkout'
import { waffoProductId } from '@/lib/waffo-products'
import { SKUS } from '@/lib/pricing'
import { localeFromRequest, type OutputLocale } from '@/lib/locale'
import {
  CLAIM_TTL_DAYS,
  buildGuestMerchantOrderId,
  claimExpiryFrom,
  generateClaimToken,
  guestInputFingerprint,
  hashClaimToken,
  normalizeEmail,
} from '@/lib/guestOrder'
import { checkRateLimit, clientKey, rateLimitedBody } from '@/lib/rateLimit'

// POST /api/guest/checkout { email, locale, chart }
//
// 先付款后注册 · 游客结账入口（阶段 B，2026-11-17）
//   ① 只开命书（fatebook）：SkuId 不外传，服务端写死，前端传什么都不认
//   ② 价格取 SKUS 单一事实源，不信任前端金额
//   ③ 跳收银台【之前】先落 guest_orders：付款回调只带单号，没有输入快照就生成不了报告
//   ④ 单号 MCG-<guestOrderId>-<ts>，与登录用户 MC-<userId>-<ts> 区分
//   ⑤ 默认关闭：GUEST_CHECKOUT_ENABLED 未开时一律 503，线上零变化
//
// ★ 认领令牌在这里只落【哈希】：raw token 不落库、不出现在响应里。
//   这枚令牌不会发给任何人（此时还没付款）；等报告 ready、真要发认领邮件时，
//   由阶段 D 的服务端重新生成一枚并覆盖 claim_token_hash（见设计文档 §5.4）。

/** 游客结账总开关（服务端 env；默认关） */
function guestEnabled(): boolean {
  const v = process.env.GUEST_CHECKOUT_ENABLED?.trim().toLowerCase()
  return v === '1' || v === 'true'
}

interface ChartInputLike {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  gender: number
}

/** 命盘快照校验：只要能支撑后续生成的最小结构 + 数值范围 */
function readChartSnapshot(value: unknown): { input: ChartInputLike; snapshot: Record<string, unknown> } | null {
  if (!value || typeof value !== 'object') return null
  const chart = value as Record<string, unknown>
  const raw = chart.input as Record<string, unknown> | undefined
  if (!raw || typeof raw !== 'object') return null
  if (!chart.pillars || typeof chart.pillars !== 'object') return null

  const int = (v: unknown, min: number, max: number): number | null => {
    const n = typeof v === 'number' ? v : Number(v)
    return Number.isInteger(n) && n >= min && n <= max ? n : null
  }
  const year = int(raw.year, 1900, 2100)
  const month = int(raw.month, 1, 12)
  const day = int(raw.day, 1, 31)
  const hour = int(raw.hour, 0, 23)
  const minute = int(raw.minute, 0, 59)
  const gender = int(raw.gender, 0, 1)
  if (year === null || month === null || day === null || hour === null || minute === null || gender === null) {
    return null
  }
  return {
    input: { year, month, day, hour, minute, gender },
    snapshot: chart,
  }
}

/** 邮箱格式（够用即可：非空、单 @、域名带点、总长 ≤254） */
function isValidEmail(email: string): boolean {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const locale: OutputLocale = localeFromRequest(body)
  // 错误文案跟入口语言走（与 /api/checkout 同口径）
  const t = (zh: string, hant: string, eng: string) =>
    locale === 'en' ? eng : locale === 'zh-Hant' ? hant : zh

  if (!guestEnabled()) {
    return NextResponse.json(
      { error: t('游客购买暂未开放', '訪客購買暫未開放', 'Guest checkout is not open yet'), code: 'GUEST_CLOSED' },
      { status: 503 },
    )
  }

  try {
    const email = normalizeEmail((body as { email?: unknown } | null)?.email)
    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { error: t('请输入有效的邮箱地址', '請輸入有效的郵箱地址', 'Please enter a valid email address') },
        { status: 400 },
      )
    }

    // ★ 只开命书：sku 不由前端决定
    const sku = 'fatebook'
    const productId = waffoProductId(sku, locale)
    if (!productId) {
      return NextResponse.json(
        { error: t('该商品尚未开放购买', '該商品尚未開放購買', 'This product is not available for purchase yet'), code: 'SKU_UNAVAILABLE' },
        { status: 400 },
      )
    }

    const chart = readChartSnapshot((body as { chart?: unknown } | null)?.chart)
    if (!chart) {
      return NextResponse.json(
        {
          error: t(
            '命盘数据不完整，请先完成排盘再购买',
            '命盤資料不完整，請先完成排盤再購買',
            'Chart data is incomplete. Cast your chart first, then come back.',
          ),
          code: 'CHART_INVALID',
        },
        { status: 400 },
      )
    }

    const admin = createServerSupabase()

    // 公开接口：按 IP 限流（RATE_LIMIT_ENFORCE 关闭时恒放行，不改变现状）
    const limit = await checkRateLimit(admin, clientKey(null, request), [
      { bucket: 'guest_checkout_hour', max: 10, windowMs: 60 * 60 * 1000 },
    ])
    if (!limit.allowed) {
      return NextResponse.json(rateLimitedBody(limit), { status: 429 })
    }

    const guestOrderId = randomUUID()
    const ref = buildGuestMerchantOrderId(guestOrderId)
    const fingerprint = guestInputFingerprint(sku, chart.input)
    const placeholderTokenHash = hashClaimToken(generateClaimToken())

    const { error: insertError } = await admin.from('guest_orders').insert({
      id: guestOrderId,
      order_merchant_external_id: ref,
      buyer_email: email,
      locale,
      sku,
      amount: SKUS[sku].priceUSD,
      currency: 'USD',
      status: 'created',
      report_input: chart.input,
      chart_snapshot: chart.snapshot,
      input_fingerprint: fingerprint,
      claim_token_hash: placeholderTokenHash,
      claim_expires_at: claimExpiryFrom(new Date(), CLAIM_TTL_DAYS),
    })
    if (insertError) {
      console.error('[guest-checkout] 建立游客订单失败:', insertError.code, insertError.message)
      return NextResponse.json(
        { error: t('创建订单失败，请稍后再试', '建立訂單失敗，請稍後再試', 'Could not create your order. Please try again.') },
        { status: 500 },
      )
    }

    // 审计流水：失败不影响主流程
    const { error: eventError } = await admin.from('guest_order_events').insert({
      guest_order_id: guestOrderId,
      event: 'created',
      detail: { sku, locale, email },
    })
    if (eventError) console.warn('[guest-checkout] 写审计流水失败:', eventError.message)

    const successPath =
      locale === 'en' ? '/en/checkout/success' : locale === 'zh-Hant' ? '/tw/checkout/success' : '/checkout/success'

    const session = await createCheckoutSession({
      productId,
      orderMerchantExternalId: ref,
      buyerEmail: email,
      guestOrderId,
      sku,
      successPath,
      locale,
    })

    return NextResponse.json({ checkoutUrl: session.checkoutUrl, ref })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    if (msg.includes('Waffo 支付未配置') || msg.includes('必须是 https')) {
      console.error('[guest-checkout] Waffo 未就绪:', msg)
      return NextResponse.json(
        { error: t('支付服务尚未开放，请稍后再试', '支付服務尚未開放，請稍後再試', 'Payments are not open yet. Please try again later.'), code: 'WAFFO_UNCONFIGURED' },
        { status: 503 },
      )
    }
    if (error instanceof WaffoPancakeError) {
      const status = error.status >= 500 ? 502 : 400
      console.error(`[guest-checkout] Waffo 渠道错误 ${error.status}:`, error.errors)
      return NextResponse.json(
        {
          error:
            t('支付渠道错误：', '支付渠道錯誤：', 'Payment provider error: ') +
            (error.errors?.[0]?.message ?? t('未知错误', '未知錯誤', 'unknown error')),
        },
        { status },
      )
    }
    console.error('[guest-checkout] 创建支付会话失败:', error)
    return NextResponse.json(
      { error: t('发起支付失败，请稍后再试', '發起支付失敗，請稍後再試', 'Could not start checkout. Please try again.') },
      { status: 500 },
    )
  }
}
