// 游客命书生成（先付款后注册 · 阶段 C，2026-11-17）
//
// 触发：webhook 落账后 after() 立即跑一次；失败/卡住由 /api/cron/guest-orders 重试。
// 纪律：
//   · 生成物只写 guest_orders.report_result，【不写 reports】——认领时才物化
//   · 乐观锁（status + generation_attempts 双条件）保证 webhook 与 cron 不会重复生成
//   · 失败最多 MAX_ATTEMPTS 次；用尽后 status=failed、写审计事件与 error 日志，
//     由 v_guest_orders_unclaimed 暴露给人工跟进
import { createServerSupabase } from '@/lib/supabase'
import { generateAnalysis, type AnalyzableChart } from '@/lib/analysis'
import { buildEnPaidAnalysis } from '@/lib/enAnalysis'
import { generateAIAnalysis } from '@/lib/aiAnalysis'
import { searchSimilarCases } from '@/lib/caseSearch'
import { checkAiBudget } from '@/lib/aiBudget'
import { deriveReportTitle } from '@/lib/reportSave'
import { sendClaimEmail } from '@/lib/guestClaimMail'
import type { OutputLocale } from '@/lib/locale'

type Admin = ReturnType<typeof createServerSupabase>

/** 最多尝试次数：首次 + 两次重试 */
export const GUEST_GENERATION_MAX_ATTEMPTS = 3

export type GenerateOutcome = 'ready' | 'failed' | 'skipped' | 'busy' | 'missing' | 'exhausted'

interface GuestOrderRow {
  id: string
  sku: string
  status: string
  locale: string
  chart_snapshot: Record<string, unknown> | null
  report_input: Record<string, unknown> | null
  generation_attempts: number | null
}

/**
 * 生成一份游客命书。
 * 返回 ready 表示已写 report_result；failed 表示本次失败（等待 cron 或已用尽）；
 * skipped 表示状态不允许（未付款/已认领/已退款）；busy 表示并发被别的执行者抢先。
 */
export async function generateGuestFatebookReport(
  admin: Admin,
  guestOrderId: string,
): Promise<GenerateOutcome> {
  const { data, error } = await admin
    .from('guest_orders')
    .select('id, sku, status, locale, chart_snapshot, report_input, generation_attempts')
    .eq('id', guestOrderId)
    .maybeSingle()
  if (error) throw error
  const order = data as GuestOrderRow | null
  if (!order) return 'missing'
  if (order.sku !== 'fatebook') return 'skipped'
  if (!['paid', 'failed', 'generating'].includes(order.status)) return 'skipped'
  if (!order.chart_snapshot) {
    // 永久性错误：没有命盘快照永远生成不了。直接终结，避免 cron 无限重试。
    await admin
      .from('guest_orders')
      .update({ status: 'failed', last_error: 'chart_snapshot missing' })
      .eq('id', guestOrderId)
    await audit(admin, guestOrderId, 'generation_failed', {
      attempt: (order.generation_attempts ?? 0) + 1,
      final: true,
      error: 'chart_snapshot missing',
    })
    console.error(`[guest-report] ★游客订单缺少命盘快照（需人工补单或退款） guest=${guestOrderId}`)
    return 'failed'
  }

  const attempts = order.generation_attempts ?? 0
  if (attempts >= GUEST_GENERATION_MAX_ATTEMPTS) return 'exhausted'

  // ★ 乐观锁占位：只有本次读到的 status + attempts 仍成立时才由我执行
  const { data: claimed, error: claimErr } = await admin
    .from('guest_orders')
    .update({ status: 'generating', generation_attempts: attempts + 1, last_error: null })
    .eq('id', guestOrderId)
    .eq('status', order.status)
    .eq('generation_attempts', attempts)
    .select('id')
  if (claimErr) throw claimErr
  if (!claimed || claimed.length === 0) return 'busy'

  await audit(admin, guestOrderId, 'generation_started', { attempt: attempts + 1 })

  try {
    const chart = order.chart_snapshot as unknown as AnalyzableChart
    const locale = (order.locale === 'en' || order.locale === 'zh-Hant' ? order.locale : 'zh-Hans') as OutputLocale
    const input = (chart as { input?: { year?: number; month?: number; day?: number; hour?: number; gender?: number } }).input ?? {}

    // 预算熔断时仍交付规则引擎版本（不因 AI 额度把已付款用户晾着）
    const budget = await checkAiBudget(admin, Date.now())
    const rulePaid = locale === 'en' ? buildEnPaidAnalysis(chart) : generateAnalysis(chart)
    const aiPaid = budget.exhausted ? null : await generateAIAnalysis(chart, { locale })
    const similarCases = locale === 'en' ? undefined : searchSimilarCases(chart)
    const paid = aiPaid
      ? { ...aiPaid, luckCycles: rulePaid.luckCycles, similarCases }
      : { ...rulePaid, similarCases }
    const chartData = {
      ...chart,
      analysis: { ...(chart as { analysis?: Record<string, unknown> }).analysis, isPaid: true, paid },
    }

    const title = deriveReportTitle('fatebook', {
      year: input.year as number,
      month: input.month as number,
      day: input.day as number,
      hour: input.hour,
      gender: input.gender,
    })

    const { error: saveErr } = await admin
      .from('guest_orders')
      .update({
        status: 'ready',
        report_title: title,
        // ★ 认领时由服务端物化 charts 并复制 analysis；这里不写 reports
        report_result: { analysis: paid, chartData } as never,
        last_error: null,
      })
      .eq('id', guestOrderId)
    if (saveErr) throw saveErr

    await audit(admin, guestOrderId, 'generation_succeeded', { attempt: attempts + 1, ai: Boolean(aiPaid) })

    // 阶段 D：报告一就绪就发认领邮件。缺凭据时 sendClaimEmail 会写
    // claim_email_failed（不抛），由 cron 在配置补齐后继续补发。
    try {
      await sendClaimEmail(admin, guestOrderId)
    } catch (mailErr) {
      console.warn('[guest-report] 认领邮件发送异常（不影响报告）:', mailErr)
    }
    return 'ready'
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    const finalAttempt = attempts + 1 >= GUEST_GENERATION_MAX_ATTEMPTS
    await admin
      .from('guest_orders')
      .update({
        status: 'failed',
        // 保留可诊断信息，不写堆栈；长度截断避免撑爆列
        last_error: msg.slice(0, 500),
      })
      .eq('id', guestOrderId)
    await audit(admin, guestOrderId, 'generation_failed', {
      attempt: attempts + 1,
      final: finalAttempt,
      error: msg.slice(0, 300),
    })
    if (finalAttempt) {
      console.error(
        `[guest-report] ★命书生成连续失败已达上限（需人工补发或退款） guest=${guestOrderId}: ${msg}`,
      )
    } else {
      console.warn(`[guest-report] 命书生成失败，等待重试 guest=${guestOrderId} attempt=${attempts + 1}: ${msg}`)
    }
    return 'failed'
  }
}

async function audit(
  admin: Admin,
  guestOrderId: string,
  event: 'generation_started' | 'generation_succeeded' | 'generation_failed',
  detail: Record<string, unknown>,
): Promise<void> {
  try {
    await admin.from('guest_order_events').insert({
      guest_order_id: guestOrderId,
      event,
      detail,
    })
  } catch (e) {
    console.warn('[guest-report] 写审计流水失败（不阻断）:', e)
  }
}
