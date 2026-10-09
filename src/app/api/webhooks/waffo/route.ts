import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase'
import { verifyWaffoEvent } from '@/lib/waffo'
import { createWaffoRepo } from '@/lib/waffo-repo'
import { handleWaffoEvent } from '@/lib/waffo-events'

// POST /api/webhooks/waffo —— Waffo 支付回调（本任务核心）
//
// 顺序固定：① 取【原始】body → ② 验签（不过即 401）→ ③ 幂等落库 → ④ 回 200。
// 对未处理事件也必须回 200：回非 2xx 只会触发官方无意义重试（3 次后丢弃）。
export async function POST(request: NextRequest) {
  // ★★★ 必须是 request.text() 原文：签名是对原始字节算的，
  // request.json() 再 JSON.stringify 会改变空白/键序，验签必挂。
  const rawBody = await request.text()
  const signature = request.headers.get('x-waffo-signature')

  let event
  try {
    event = verifyWaffoEvent(rawBody, signature ?? '')
  } catch (e) {
    console.warn('[waffo-webhook] 验签失败:', e instanceof Error ? e.message : String(e))
    return new NextResponse('Invalid signature', { status: 401 })
  }

  // 直接 await 而非 after() 后台处理：落库只有两条快速 INSERT（远小于官方 10s 窗口），
  // 且 DB 故障时需要让响应为 5xx 触发 Waffo 重试——先回 200 再后台失败会永久丢事件。
  try {
    const repo = createWaffoRepo(createServerSupabase())
    const result = await handleWaffoEvent(event, repo)
    const { eventType, eventId } = event
    const orderId = event.data?.orderId
    switch (result.kind) {
      case 'inserted':
        console.info(`[waffo-webhook] 支付已落账 ${eventType}/${eventId} order=${orderId}`)
        break
      case 'duplicate':
        console.info(`[waffo-webhook] 重复事件已忽略 ${eventType}/${eventId}`)
        break
      case 'payment_conflict':
        // 不同 eventId 但同一 PAY_ 单号：已授过权益，安全跳过
        console.warn(`[waffo-webhook] 交易号冲突，视为重复授予 ${eventType}/${eventId}`)
        break
      case 'ignored_missing_user':
        // ★ 告警级别：metadata 与业务单号都拿不到用户，无法补单。
        // 处置：人工按日志里的 eventId/orderId 在 Waffo Dashboard 查买家邮箱，
        // 对账后手工 INSERT payments（任务书 §5.3 ②）。
        console.error(
          `[waffo-webhook] ★需人工补单：事件缺少用户归属 ${eventType}/${eventId} order=${orderId}`,
        )
        break
      case 'ignored_invalid_payload':
        console.error(
          `[waffo-webhook] ★需人工核查：载荷异常（${result.reason}） ${eventType}/${eventId} order=${orderId}`,
        )
        break
      case 'ignored_event':
        // 订阅/退款/未知事件：本轮无订阅业务，只留日志。
        // ★ 下一轮做订阅时必读 src/lib/waffo-events.ts 中 §3.4 两个陷阱的注释
        // （activated+payment_succeeded 双发；canceling 不撤销、canceled 才撤销；
        //   refund.failed 不撤销）。
        console.info(`[waffo-webhook] 未处理事件类型，仅记录 ${eventType}/${eventId} order=${orderId}`)
        break
    }
  } catch (e) {
    // DB/基础设施故障：返 5xx 让 Waffo 按其策略重试
    console.error('[waffo-webhook] 处理失败（将依赖平台重试）:', e)
    return NextResponse.json({ error: 'processing failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
