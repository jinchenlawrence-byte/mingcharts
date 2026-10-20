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
import type { MembershipPatch, PaidPaymentRow, WaffoPaymentRepository } from './waffo-events'

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

    // ★ 撤回幂等占位（2026-10-19「先打标后干活」顺序缺陷修复）：
    //   工作失败时删掉这一行，使渠道重试能真正重做（见 waffo-events.ts 的 gatedWork）。
    async unmarkEventProcessed(eventType: string, eventId: string): Promise<void> {
      const { error } = await admin
        .from('processed_webhooks')
        .delete()
        .eq('event_type', eventType)
        .eq('event_id', eventId)
      if (error) throw new Error(`processed_webhooks 撤回失败: ${error.code} ${error.message}`)
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
        // ★ 订阅单号审计列（档 C，需先跑 supabase/subscription.sql）；一次性订单为 null
        order_id: row.order_id ?? null,
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

    // ★ 退款到账（2026-10-21）：一次性流水置 'refunded' → 权益自动失效（判定只认 'paid'）。
    //   只改 payment_type='single'（会员失效由 subscription.canceled 决定，见接口注释）。
    //   不写 status='paid' 前置条件：重复投递仍能命中（天然幂等），避免把「已退款」误报成「找不到」。
    async markPaymentRefunded(match: {
      transactionId: string | null
      orderMerchantExternalId: string | null
    }): Promise<number> {
      let q = admin
        .from('payments')
        .update({ status: 'refunded' })
        .eq('payment_type', 'single')
      if (match.transactionId) q = q.eq('transaction_id', match.transactionId)
      else if (match.orderMerchantExternalId) q = q.eq('order_merchant_external_id', match.orderMerchantExternalId)
      else return 0
      // select('id') 拿回受影响行数（PostgREST 的 update 默认不返回 body）
      const { data, error } = await q.select('id')
      if (error) throw new Error(`payments 退款标记失败: ${error.code} ${error.message}`)
      return data?.length ?? 0
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

    // ── 会员列读写（档 C，2026-10-18）──────────────────────────
    // ★ 仅 renew 的「取 max」需要读现有到期时间；这不是判重（判重仍只靠唯一约束）。
    async findMemberExpiry(userId: string): Promise<string | null> {
      const { data, error } = await admin
        .from('profiles')
        .select('member_expire_at')
        .eq('id', userId)
        .maybeSingle()
      if (error) {
        throw new Error(`profiles 查询失败: ${error.code} ${error.message}`)
      }
      return (data?.member_expire_at as string | null) ?? null
    },

    // ★ 写会员列（service_role 绕 RLS）。契约（见 MembershipPatch）：
    //   · 省略的字段【保持不变】，显式 null 才清空 —— 故只把 patch 里出现过的键放进 update
    //   · is_member 恒置 true：本补丁只在订阅【有效态】写入（激活/续期/已请求取消/已恢复），
    //     失效由 member_expire_at 自然表达（getMembership 比对当下时间），绝不在 canceling 时清掉
    async patchMembership(userId: string, patch: MembershipPatch): Promise<void> {
      const update: Record<string, unknown> = { is_member: true }
      if ('plan' in patch) update.member_plan = patch.plan ?? null
      if ('orderId' in patch) update.member_order_id = patch.orderId ?? null
      if ('expireAt' in patch) update.member_expire_at = patch.expireAt ?? null
      if ('autoRenew' in patch) update.member_auto_renew = patch.autoRenew ?? null
      if ('cancelAt' in patch) update.member_cancel_at = patch.cancelAt ?? null

      const { error } = await admin.from('profiles').update(update).eq('id', userId)
      if (error) throw new Error(`profiles 会员写入失败: ${error.code} ${error.message}`)
    },
  }
}
