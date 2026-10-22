import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase'
import { verifyWaffoEvent } from '@/lib/waffo'
import { createWaffoRepo } from '@/lib/waffo-repo'
import { handleWaffoEvent, buildPaidPaymentRow } from '@/lib/waffo-events'
import { ensureFatebookReportByAdmin } from '@/lib/reportSave'
import { isPartnerPack } from '@/lib/pricing'
import { creditPartnerPurchase } from '@/lib/partnerCredits'

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
      case 'inserted': {
        console.info(`[waffo-webhook] 支付已落账 ${eventType}/${eventId} order=${orderId}`)
        // ★ 已购命书进「我的报告」（2026-10-18）：落账成功后把命书以 kind=fatebook
        //   行写入 reports（cache_key=chartId 幂等）。查 charts 行取出生信息拼标题；
        //   失败仅记日志不阻断（对账兜底：unlock 回写时还会补插）。
        try {
          const { userId, chartId } = result
          if (userId && chartId) {
            const admin = createServerSupabase()
            const { data: chartRow } = await admin
              .from('charts')
              .select('gender,birth_year,birth_month,birth_day,birth_hour')
              .eq('id', chartId)
              .maybeSingle()
            if (chartRow) {
              await ensureFatebookReportByAdmin(admin, userId, chartId, {
                year: chartRow.birth_year,
                month: chartRow.birth_month,
                day: chartRow.birth_day,
                hour: chartRow.birth_hour,
                gender: chartRow.gender
              })
            }
          }
        } catch (reportErr) {
          console.warn('[waffo-webhook] reports 命书行写入失败（不阻断）:', reportErr)
        }

        // ★ 伙伴报告包入账（白标 v1，2026-10-22）：买的是"份数"，不是报告权益。
        //   幂等键 = 支付单号（PAY_xxx），webhook 重试不会重复加额度。
        //   ★ 入账失败必须记 error 级日志：这是"钱收了、额度没记"的唯一信号，
        //     且这里【不抛错】—— 抛错会让 Waffo 重试并被 processed_webhooks 判为已处理，
        //     反而更难补。处置方式是按日志里的 eventId/orderId 人工补账。
        try {
          const paidRow = buildPaidPaymentRow(event.data)
          const sku = paidRow?.sku ?? ''
          if (paidRow?.user_id && isPartnerPack(sku)) {
            const credited = await creditPartnerPurchase(createServerSupabase(), {
              userId: paidRow.user_id,
              sku,
              ref: paidRow.transaction_id,
              paidUSD: paidRow.amount,
            })
            if (credited.priceWarning) {
              console.error(`[waffo-webhook] ★价格不符：${credited.priceWarning} order=${orderId}`)
            }
            console.info(
              `[waffo-webhook] 伙伴额度入账 ${sku} +${credited.credited} 份` +
              `${credited.duplicate ? '（重复回调，未重复加）' : ''} · 余额 ${credited.balance}`,
            )
          }
        } catch (creditErr) {
          console.error(
            `[waffo-webhook] ★伙伴额度入账失败（需人工补账）${eventType}/${eventId} order=${orderId}:`,
            creditErr instanceof Error ? creditErr.message : creditErr,
          )
        }
        break
      }
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
        // 无需动库的事件（退款/终止/逾期/套餐变更…）：只留日志。
        // ★ 订阅行为判定集中在 src/lib/waffo-events.ts 的 subscriptionStateFromEvent
        //   （activated+payment_succeeded 双发；canceling 不撤销、canceled 才撤销；
        //    refund.failed 不撤销 —— 三条陷阱均有注释与断言守护）。
        console.info(`[waffo-webhook] 未处理事件类型，仅记录 ${eventType}/${eventId} order=${orderId}`)
        break
      case 'payment_refunded': {
        // ★ 2026-10-21 退款域：一次性流水已置 refunded → 权益自动失效。
        //   affected=0 需人工核查：可能是订阅扣款的退款（不撤会员，属预期），
        //   或退款事件早于 order.completed 到达（渠道乱序，需补处理）。
        if (result.affected > 0) {
          console.info(
            `[waffo-webhook] 退款已撤销权益 ${eventType}/${eventId} affected=${result.affected} order=${orderId}`,
          )
        } else {
          console.warn(
            `[waffo-webhook] ★退款未匹配到一次性流水（可能为订阅退款或事件乱序） ${eventType}/${eventId} order=${orderId}`,
          )
        }
        break
      }
      // ★ 档 C（2026-10-18）订阅事件动库结果
      case 'membership_updated':
        console.info(
          `[waffo-webhook] 会员变更已落库 ${eventType}/${eventId} action=${result.action} user=${result.userId} order=${orderId}`,
        )
        break
      case 'membership_recorded':
        console.info(
          `[waffo-webhook] 订阅扣款已落账 ${eventType}/${eventId} plan=${result.plan} user=${result.userId} order=${orderId}`,
        )
        break
    }
  } catch (e) {
    // DB/基础设施故障：返 5xx 让 Waffo 按其策略重试
    console.error('[waffo-webhook] 处理失败（将依赖平台重试）:', e)
    return NextResponse.json({ error: 'processing failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
