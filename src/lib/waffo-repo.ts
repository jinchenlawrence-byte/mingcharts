// ─────────────────────────────────────────────────────────────
// WaffoPaymentRepository 的 Supabase 实现（服务端专用）
//
// 幂等全部依赖【数据库唯一约束】：
//   · processed_webhooks  PRIMARY KEY (event_type, event_id)
//   · payments            payments_transaction_id_key UNIQUE (transaction_id)
// PostgREST 对唯一冲突返回 PG 错误码 23505 —— 捕获它即「重复」，
// 绝不做「先 SELECT 看在不在，再 INSERT」（并发下两个请求会同时穿过）。
// ─────────────────────────────────────────────────────────────
import type { SupabaseClient } from '@supabase/supabase-js'
import type { PaidPaymentRow, WaffoPaymentRepository } from './waffo-events'

const PG_UNIQUE_VIOLATION = '23505'

export function createWaffoRepo(admin: SupabaseClient): WaffoPaymentRepository {
  return {
    async markEventProcessed(eventType: string, eventId: string): Promise<boolean> {
      const { error } = await admin
        .from('processed_webhooks')
        .insert({ event_type: eventType, event_id: eventId })
      if (!error) return true
      if (error.code === PG_UNIQUE_VIOLATION) return false
      throw new Error(`processed_webhooks 写入失败: ${error.code} ${error.message}`)
    },

    async insertPaidPayment(row: PaidPaymentRow): Promise<boolean> {
      const { error } = await admin.from('payments').insert({
        user_id: row.user_id,
        chart_id: row.chart_id,
        amount: row.amount,
        sku: row.sku, // ★ 权益归集的唯一依据（2026-10-18）：绝不省略
        payment_type: row.payment_type,
        payment_method: row.payment_method,
        status: row.status,
        transaction_id: row.transaction_id,
        order_merchant_external_id: row.order_merchant_external_id,
        paid_at: row.paid_at,
      })
      if (!error) return true
      if (error.code === PG_UNIQUE_VIOLATION) return false
      throw new Error(`payments 写入失败: ${error.code} ${error.message}`)
    },

    async findPaidByExternalId(externalId: string): Promise<PaidPaymentRow | null> {
      const { data, error } = await admin
        .from('payments')
        .select(
          'user_id,chart_id,amount,sku,payment_type,payment_method,status,transaction_id,order_merchant_external_id,paid_at',
        )
        .eq('order_merchant_external_id', externalId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) {
        throw new Error(`payments 查询失败: ${error.code} ${error.message}`)
      }
      if (!data) return null
      return {
        user_id: data.user_id as string,
        // ★ 返回库里的真实关联值（HANDOFF-命书一份一付 §三）：写死 null 会让快路径
        //   查回的行丢失命盘关联，按盘判定（§四）就无从谈起。
        chart_id: (data.chart_id as string | null) ?? null,
        amount: Number(data.amount),
        // ★ 空 sku（列上线前的老流水）原样返回 null→''：归集层按历史行为兜底 fatebook，
        //   并由 reconcilePayment 在能反查到远端 sku 时回填（见 updatePaymentSku）。
        sku: (data.sku as string | null) ?? '',
        payment_type: data.payment_type as PaidPaymentRow['payment_type'],
        payment_method: data.payment_method as PaidPaymentRow['payment_method'],
        status: data.status as PaidPaymentRow['status'],
        transaction_id: data.transaction_id as string,
        order_merchant_external_id: data.order_merchant_external_id as string,
        paid_at: data.paid_at as string,
      }
    },

    // ★ SKU 回填（2026-10-18）：把列上线前落库的空 sku 补成远端真实值（权益归集依赖它）。
    //   仅由 reconcilePayment 在发现 sku 为空时调用；失败按仓库层统一约定抛错（调用方决定是否降级）。
    async updatePaymentSku(externalId: string, sku: string): Promise<void> {
      const { error } = await admin
        .from('payments')
        .update({ sku })
        .eq('order_merchant_external_id', externalId)
      if (error) throw new Error(`payments sku 回填失败: ${error.code} ${error.message}`)
    },

    // ★ 命盘归属校验（HANDOFF-命书一份一付 §3.2）：查 charts 表该行的 user_id；不存在 → null
    async findChartUserId(chartId: string): Promise<string | null> {
      const { data, error } = await admin
        .from('charts')
        .select('user_id')
        .eq('id', chartId)
        .maybeSingle()
      if (error) {
        throw new Error(`charts 查询失败: ${error.code} ${error.message}`)
      }
      return (data?.user_id as string | undefined) ?? null
    },
  }
}
