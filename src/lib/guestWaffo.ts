// 游客订单的 Waffo 事件处理（先付款后注册 · 阶段 C，2026-11-17）
//
// 位置：webhook 路由在【登录链路之前】调用本模块；游客事件永远不进 handleWaffoEvent，
// 因此登录用户/订阅/退款的既有判定逐字不变。
//
// 职责：
//   · order.completed  → payments 写一行 user_id=NULL、guest_order_id=…；guest_orders 置 paid
//   · refund.succeeded → payments 置 refunded；guest_orders 置 refunded 并吊销认领令牌
//   · 幂等：与登录链路共用 processed_webhooks（先占位，失败撤回，渠道重试可重做）
//   · 生成不在这里做（AI 远超渠道 10s 窗口），由路由 after() + cron 补偿触发
import type { WebhookEvent, WebhookEventData } from '@waffo/pancake-ts'
import type { WaffoPaymentRepository } from '@/lib/waffo-events'
import {
  normalizePaymentMethod,
  normalizePaymentMethodBrand,
} from '@/lib/waffo-events'
import { parseGuestMerchantOrderId, normalizeEmail } from '@/lib/guestOrder'
import { createServerSupabase } from '@/lib/supabase'
import { insertGuestPaidPayment, markGuestPaymentRefunded } from '@/lib/waffo-repo'

type Admin = ReturnType<typeof createServerSupabase>
type IdempotencyRepo = Pick<WaffoPaymentRepository, 'markEventProcessed' | 'unmarkEventProcessed'>

export interface GuestOrderRef {
  guestOrderId: string
  ref: string
}

export type GuestEventRead =
  | { kind: 'guest'; order: GuestOrderRef }
  | { kind: 'guest_invalid'; reason: string }
  | null

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * 判断一个事件是否属于游客订单，并解析出订单 id。
 * 判定依据（任一）：
 *   · orderMetadata.mode === 'guest'
 *   · orderMetadata.guestOrderId 是合法 UUID
 *   · orderMerchantExternalId 是 MCG-<uuid>-<ts>
 * 两者同时存在但不一致 → 视为非法（防 metadata 被篡改后张冠李戴）。
 * 返回 null = 与游客无关，路由继续走原登录链路。
 */
export function readGuestOrderEvent(event: WebhookEvent<WebhookEventData>): GuestEventRead {
  const md = event.data?.orderMetadata ?? {}
  const metaMode = typeof md.mode === 'string' ? md.mode : ''
  const metaId = typeof md.guestOrderId === 'string' ? md.guestOrderId.trim() : ''
  const parsed = parseGuestMerchantOrderId(event.data?.orderMerchantExternalId)

  const looksGuest = metaMode === 'guest' || metaId.length > 0 || parsed !== null
  if (!looksGuest) return null

  if (metaId && !UUID_RE.test(metaId)) {
    return { kind: 'guest_invalid', reason: 'metadata.guestOrderId 不是合法 UUID' }
  }
  if (metaId && parsed && parsed.guestOrderId !== metaId.toLowerCase()) {
    return { kind: 'guest_invalid', reason: 'metadata.guestOrderId 与业务单号不一致' }
  }
  const guestOrderId = metaId ? metaId.toLowerCase() : parsed?.guestOrderId ?? ''
  if (!guestOrderId) {
    return { kind: 'guest_invalid', reason: '游客事件缺少可解析的订单号' }
  }
  // 单号必须能构成 MCG- 格式；只有 metadata 时用 '' 占位（退款事件可能不带单号）
  const ref = parsed ? event.data.orderMerchantExternalId! : `MCG-${guestOrderId}-0`
  return { kind: 'guest', order: { guestOrderId, ref } }
}

export interface GuestPaymentRow {
  user_id: null
  guest_order_id: string
  buyer_email: string | null
  amount: number
  payment_type: 'single'
  sku: string
  payment_method: string | null
  payment_method_brand: string | null
  status: 'paid'
  transaction_id: string
  order_merchant_external_id: string | null
  paid_at: string
}

/**
 * 构造游客支付流水（纯函数，便于断言）。
 * ★ user_id 必须是 null：游客没有账号，不得借用站主/客服 id 占位。
 */
export function buildGuestPaymentRow(
  event: WebhookEvent<WebhookEventData>,
  order: GuestOrderRef,
  nowIso: string,
): GuestPaymentRow | null {
  const d = event.data
  const paymentId = typeof d?.paymentId === 'string' ? d.paymentId : ''
  if (!paymentId.startsWith('PAY_')) return null
  const charged = Number(d?.chargedAmount ?? d?.amount)
  if (!Number.isFinite(charged) || charged < 0) return null
  const sku = typeof d?.orderMetadata?.sku === 'string' ? d.orderMetadata.sku : ''
  if (!sku) return null
  return {
    user_id: null,
    guest_order_id: order.guestOrderId,
    buyer_email: normalizeEmail(d?.buyerEmail),
    amount: charged,
    payment_type: 'single',
    sku,
    payment_method: normalizePaymentMethod(d?.paymentMethod),
    payment_method_brand: normalizePaymentMethodBrand((d as { paymentMethodBrand?: unknown })?.paymentMethodBrand),
    status: 'paid',
    transaction_id: paymentId,
    order_merchant_external_id: parseGuestMerchantOrderId(d?.orderMerchantExternalId) ? d.orderMerchantExternalId! : null,
    paid_at: d?.paymentDate || nowIso,
  }
}

export type GuestHandleResult =
  | { kind: 'guest_paid'; guestOrderId: string; inserted: boolean; amountMismatch: boolean }
  | { kind: 'guest_refunded'; guestOrderId: string; affected: number }
  | { kind: 'guest_duplicate' }
  | { kind: 'guest_ignored'; eventType: string }
  | { kind: 'guest_invalid'; reason: string }

async function markResolution(
  admin: Admin,
  eventType: string,
  eventId: string,
  patch: Record<string, unknown>,
): Promise<void> {
  try {
    await admin
      .from('processed_webhooks')
      .update(patch)
      .eq('event_type', eventType)
      .eq('event_id', eventId)
  } catch (e) {
    console.warn('[guest-waffo] 回填 processed_webhooks 失败（不阻断）:', e)
  }
}

/**
 * 处理一个【已验签】的游客事件。
 * 幂等闸口与登录链路同型：先 markEventProcessed，工作失败则撤回占位。
 */
export async function handleGuestOrderEvent(
  event: WebhookEvent<WebhookEventData>,
  order: GuestOrderRef,
  admin: Admin,
  repo: IdempotencyRepo,
  nowIso: string = new Date().toISOString(),
): Promise<GuestHandleResult> {
  const { eventType, eventId } = event

  const firstTime = await repo.markEventProcessed(eventType, eventId)
  if (!firstTime) return { kind: 'guest_duplicate' }

  try {
    const result = await work()
    return result
  } catch (err) {
    try {
      await repo.unmarkEventProcessed(eventType, eventId)
    } catch {
      // best-effort：撤回失败不影响原始错误上抛（渠道仍会重试）
    }
    throw err
  }

  async function work(): Promise<GuestHandleResult> {
    const d = event.data

    if (eventType === 'order.completed') {
      const row = buildGuestPaymentRow(event, order, nowIso)
      if (!row) {
        console.error(`[guest-waffo] ★游客事件载荷异常（需人工核查） ${eventType}/${eventId}`)
        await markResolution(admin, eventType, eventId, {
          resolution: 'guest_error',
          notes: '游客事件载荷异常：paymentId/chargedAmount/sku 缺失或非法',
        })
        return { kind: 'guest_invalid', reason: '游客事件载荷异常' }
      }

      const { data: guest, error: guestErr } = await admin
        .from('guest_orders')
        .select('id, status, amount, buyer_email')
        .eq('id', order.guestOrderId)
        .maybeSingle()
      if (guestErr) throw guestErr
      if (!guest) {
        console.error(`[guest-waffo] ★游客订单不存在（需人工核查） ${eventType}/${eventId} guest=${order.guestOrderId}`)
        await markResolution(admin, eventType, eventId, {
          resolution: 'guest_order_missing',
          notes: 'guest_orders 中找不到该订单；可能建单失败或单号被篡改',
        })
        return { kind: 'guest_invalid', reason: '游客订单不存在' }
      }

      // 幂等闸口 (b)：transaction_id UNIQUE，23505 = 已记过账（写入者在 waffo-repo，架构约束）
      const inserted = await insertGuestPaidPayment(admin, row)

      const amountMismatch = Math.abs(Number(guest.amount) - row.amount) > 0.005
      if (amountMismatch) {
        console.error(
          `[guest-waffo] ★金额不符（按实际收款入账，人工复核） guest=${order.guestOrderId} 订单=${guest.amount} 实收=${row.amount}`,
        )
      }
      const paidAtIso = Number.isFinite(Date.parse(row.paid_at)) ? new Date(row.paid_at).toISOString() : nowIso

      // 只把 created/paid 推进到 paid；已 ready/claimed/refunded 不被回调降级
      const { error: patchErr } = await admin
        .from('guest_orders')
        .update({
          status: 'paid',
          paid_at: paidAtIso,
          buyer_email: row.buyer_email ?? guest.buyer_email ?? null,
          amount_mismatch: amountMismatch,
          last_error: null,
        })
        .eq('id', order.guestOrderId)
        .in('status', ['created', 'paid'])
      if (patchErr) throw patchErr

      await admin.from('guest_order_events').insert({
        guest_order_id: order.guestOrderId,
        event: 'paid',
        detail: {
          event_id: eventId,
          payment_id: row.transaction_id,
          amount: row.amount,
          amount_mismatch: amountMismatch,
          inserted,
        },
      })

      await markResolution(admin, eventType, eventId, {
        order_id: d?.orderId ?? null,
        payment_id: row.transaction_id,
        order_merchant_external_id: row.order_merchant_external_id,
        buyer_email: row.buyer_email,
        amount: row.amount,
        resolution: 'guest_paid',
        notes: amountMismatch ? '金额不符，已按实收入账' : null,
      })

      return { kind: 'guest_paid', guestOrderId: order.guestOrderId, inserted, amountMismatch }
    }

    if (eventType === 'refund.succeeded') {
      const paymentId = typeof d?.paymentId === 'string' ? d.paymentId : null
      const omer = typeof d?.orderMerchantExternalId === 'string' ? d.orderMerchantExternalId : null

      const affected = await markGuestPaymentRefunded(admin, {
        guestOrderId: order.guestOrderId,
        paymentId,
        orderMerchantExternalId: omer,
      })

      const { error: guestErr } = await admin
        .from('guest_orders')
        .update({
          status: 'refunded',
          refunded_at: nowIso,
          claim_revoked_at: nowIso,
        })
        .eq('id', order.guestOrderId)
        .neq('status', 'claimed')
      if (guestErr) throw guestErr

      await admin.from('guest_order_events').insert({
        guest_order_id: order.guestOrderId,
        event: 'refunded',
        detail: { event_id: eventId, payment_id: paymentId, affected },
      })
      await markResolution(admin, eventType, eventId, {
        payment_id: paymentId,
        order_merchant_external_id: omer,
        amount: d?.refundedAmount ?? null,
        resolution: 'guest_refunded',
      })
      return { kind: 'guest_refunded', guestOrderId: order.guestOrderId, affected }
    }

    await markResolution(admin, eventType, eventId, { resolution: 'guest_ignored' })
    return { kind: 'guest_ignored', eventType }
  }
}
