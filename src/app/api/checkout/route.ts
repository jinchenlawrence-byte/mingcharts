import { NextRequest, NextResponse } from 'next/server'
import { WaffoPancakeError } from '@waffo/pancake-ts'
import { createServerSupabase } from '@/lib/supabase'
import {
  getWaffo,
  getWaffoStoreId,
  getAppUrl,
  buildCheckoutParams,
} from '@/lib/waffo'
import { waffoProductId } from '@/lib/waffo-products'
import { makeMerchantOrderId } from '@/lib/waffo-events'
import type { SkuId } from '@/lib/pricing'

// POST /api/checkout { token, sku }
// 创建 Waffo 托管收银台会话并返回跳转地址。幂等：每次点击生成新的业务单号
// （未支付的旧会话 45 分钟自动取消，不产生费用）。
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    const token = typeof body?.token === 'string' ? body.token.trim() : ''
    const sku = typeof body?.sku === 'string' ? (body.sku as SkuId) : ''
    if (!token || !sku) {
      return NextResponse.json({ error: '参数缺失或格式错误' }, { status: 400 })
    }

    // SKU → Waffo productId 未登记 → 明确的业务错误（不是 500，前端显示「即将推出」）
    const productId = waffoProductId(sku)
    if (!productId) {
      return NextResponse.json(
        { error: '该商品尚未开放购买', code: 'SKU_UNAVAILABLE' },
        { status: 400 },
      )
    }

    const admin = createServerSupabase()
    const {
      data: { user },
      error: authError,
    } = await admin.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: '登录无效，请重新登录' }, { status: 401 })
    }
    const buyerEmail = (user.email ?? '').trim()
    if (!buyerEmail) {
      return NextResponse.json(
        { error: '当前账号缺少邮箱，无法发起支付，请先在账号设置中绑定邮箱' },
        { status: 400 },
      )
    }

    const orderMerchantExternalId = makeMerchantOrderId(user.id)
    const params = buildCheckoutParams({
      productId,
      orderMerchantExternalId,
      buyerEmail,
      userId: user.id,
      sku,
      appUrl: getAppUrl(),
      storeId: getWaffoStoreId(),
    })

    const session = await getWaffo().checkout.createSession(params)
    return NextResponse.json({
      checkoutUrl: session.checkoutUrl,
      sessionId: session.sessionId,
      ref: orderMerchantExternalId,
    })
  } catch (error) {
    // 配置缺失（env 未填）/ appUrl 非 https：服务未就绪，503 而非裸 500
    const msg = error instanceof Error ? error.message : String(error)
    if (msg.includes('Waffo 支付未配置') || msg.includes('必须是 https')) {
      console.error('[checkout] Waffo 未就绪:', msg)
      return NextResponse.json(
        { error: '支付服务尚未开放，请稍后再试', code: 'WAFFO_UNCONFIGURED' },
        { status: 503 },
      )
    }
    if (error instanceof WaffoPancakeError) {
      // 4xx（参数/鉴权）透传为 400 不重试；5xx 透传为 502（渠道侧故障）
      const status = error.status >= 500 ? 502 : 400
      console.error(`[checkout] Waffo 渠道错误 ${error.status}:`, error.errors)
      return NextResponse.json(
        { error: `支付渠道错误：${error.errors?.[0]?.message ?? '未知错误'}` },
        { status },
      )
    }
    console.error('[checkout] 创建支付会话失败:', error)
    return NextResponse.json({ error: `创建支付会话失败：${msg}` }, { status: 500 })
  }
}
