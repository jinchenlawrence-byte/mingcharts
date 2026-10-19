// ─────────────────────────────────────────────────────────────
// PushRepository 的 Supabase 实现（服务端专用）
//
// 幂等全部依赖【数据库唯一约束】：
//   · push_subscriptions.idx_push_subs_endpoint UNIQUE(endpoint)  —— 同设备换账号即覆盖归属
//   · push_logs.idx_push_logs_dedupe UNIQUE(user_id, kind, dedupe_key) —— 每日每人每 kind 至多一次
// PostgREST 对唯一冲突返回 PG 错误码 23505 —— 捕获它即「重复」，
// 绝不做「先 SELECT 看在不在，再 INSERT」（并发下两个请求会同时穿过）。
//
// ★ user_id 一律由调用方（route 从 access token 解析）传入，绝不接受客户端 body 值。
// ─────────────────────────────────────────────────────────────
import type { SupabaseClient } from '@supabase/supabase-js'

const PG_UNIQUE_VIOLATION = '23505'

/** 浏览器 PushSubscription 的三要素（endpoint 是可发推凭据） */
export interface PushSubInput {
  endpoint: string
  p256dh: string
  auth: string
}

/** 出库的一行活跃订阅（供发送端使用） */
export interface PushSubRow extends PushSubInput {
  id: string
  user_id: string
}

export function createPushRepo(admin: SupabaseClient) {
  return {
    /** 登记/覆盖订阅：同 endpoint 换账号 → user_id 被覆盖；重新订阅 → 清 disabled_at */
    async upsertSubscription(
      userId: string,
      sub: PushSubInput,
      userAgent?: string | null
    ): Promise<void> {
      const { error } = await admin.from('push_subscriptions').upsert(
        {
          user_id: userId,
          endpoint: sub.endpoint,
          p256dh: sub.p256dh,
          auth: sub.auth,
          user_agent: userAgent ?? null,
          disabled_at: null,
        },
        { onConflict: 'endpoint' }
      )
      if (error) throw new Error(`push_subscriptions 写入失败: ${error.code} ${error.message}`)
    },

    /** 退订：按 endpoint 停用（可带 userId 限定归属，防越权停用他人设备） */
    async deactivate(endpoint: string, userId?: string): Promise<void> {
      let q = admin
        .from('push_subscriptions')
        .update({ disabled_at: new Date().toISOString() })
        .eq('endpoint', endpoint)
      if (userId) q = q.eq('user_id', userId)
      const { error } = await q
      if (error) throw new Error(`push_subscriptions 停用失败: ${error.code} ${error.message}`)
    },

    /**
     * 有效会员的 userId 列表（只读 profiles；member_expire_at > now）。
     * 会员判定只读，绝不改写任何会员列。
     */
    async listActiveMemberIds(nowIso: string): Promise<string[]> {
      const { data, error } = await admin
        .from('profiles')
        .select('id')
        .eq('is_member', true)
        .gt('member_expire_at', nowIso)
      if (error) throw new Error(`profiles 查询失败: ${error.code} ${error.message}`)
      return (data ?? []).map((r) => r.id as string)
    },

    /** 给定用户集合下的活跃订阅（disabled_at IS NULL） */
    async listActiveSubsFor(userIds: string[]): Promise<PushSubRow[]> {
      if (userIds.length === 0) return []
      const { data, error } = await admin
        .from('push_subscriptions')
        .select('id,user_id,endpoint,p256dh,auth')
        .in('user_id', userIds)
        .is('disabled_at', null)
      if (error) throw new Error(`push_subscriptions 查询失败: ${error.code} ${error.message}`)
      return (data ?? []) as PushSubRow[]
    },

    /**
     * 占位当日发送名额（幂等核心）。返回 true = 本次为首发，可发送；false = 今日已占用。
     * ★ 禁止先查后写：直接 INSERT，靠 (user_id, kind, dedupe_key) UNIQUE 拦重复。
     */
    async claimDailyLog(userId: string, kind: string, dedupeKey: string): Promise<{ ok: boolean; id?: number }> {
      const { data, error } = await admin
        .from('push_logs')
        .insert({ user_id: userId, kind, dedupe_key: dedupeKey, status: 'claimed' })
        .select('id')
        .single()
      if (!error) return { ok: true, id: (data as { id: number }).id }
      if (error.code === PG_UNIQUE_VIOLATION) return { ok: false }
      throw new Error(`push_logs 写入失败: ${error.code} ${error.message}`)
    },

    /** 回写发送结果（status/http_status/error） */
    async finishLog(id: number, patch: { status: string; httpStatus?: number | null; error?: string | null }): Promise<void> {
      const { error } = await admin
        .from('push_logs')
        .update({ status: patch.status, http_status: patch.httpStatus ?? null, error: patch.error ?? null })
        .eq('id', id)
      if (error) throw new Error(`push_logs 回写失败: ${error.code} ${error.message}`)
    },
  }
}
