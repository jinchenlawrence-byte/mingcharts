import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase'
import { isGuestMerchantOrderId, parseGuestMerchantOrderId } from '@/lib/guestOrder'

// GET /api/guest/order?ref=MCG-<guestOrderId>-<ts>
//
// 先付款后注册 · 游客订单状态（阶段 B，2026-11-17）
//   成功页在【未登录】时用它轮询：只返回状态与打码邮箱，绝不返回报告内容。
//   单号里带 UUID v4，不可枚举；返回字段固定，避免把订单行整行吐出去。

function guestEnabled(): boolean {
  const v = process.env.GUEST_CHECKOUT_ENABLED?.trim().toLowerCase()
  return v === '1' || v === 'true'
}

/** 邮箱打码：a***@example.com（成功页只需让用户认出是哪个邮箱） */
function maskEmail(email: string | null): string | null {
  if (!email) return null
  const [name, domain] = email.split('@')
  if (!name || !domain) return null
  const head = name.slice(0, 1)
  return `${head}${'*'.repeat(Math.min(Math.max(name.length - 1, 1), 4))}@${domain}`
}

// 只暴露这些状态；未知状态一律按 pending 处理，不泄露内部枚举
const PUBLIC_STATUSES = new Set([
  'created',
  'paid',
  'generating',
  'ready',
  'failed',
  'claimed',
  'refunded',
  'expired',
])

export async function GET(request: NextRequest) {
  if (!guestEnabled()) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const ref = request.nextUrl.searchParams.get('ref')?.trim() ?? ''
  const parsed = parseGuestMerchantOrderId(ref)
  if (!parsed) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const admin = createServerSupabase()
  const { data, error } = await admin
    .from('guest_orders')
    .select('order_merchant_external_id, status, sku, buyer_email, paid_at, claim_expires_at')
    .eq('id', parsed.guestOrderId)
    .maybeSingle()

  if (error) {
    console.error('[guest-order] 查询失败:', error.code, error.message)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
  // 单号必须与订单行完全一致（防"知道 UUID 就能窥探"的构造单号）
  if (!data || data.order_merchant_external_id !== ref) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const status = PUBLIC_STATUSES.has(data.status) ? data.status : 'created'
  return NextResponse.json(
    {
      status,
      sku: data.sku,
      emailMasked: maskEmail(data.buyer_email),
      paidAt: data.paid_at,
      claimExpiresAt: data.claim_expires_at,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
