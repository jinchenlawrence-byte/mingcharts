// 会员订阅：套餐定义与状态查询
import type { SupabaseClient } from '@supabase/supabase-js'
import { SKUS } from './pricing'

export type PlanId = 'monthly' | 'yearly'

export interface Plan {
  id: PlanId
  name: string
  price: number // USD（派生自 pricing.ts 单一事实源）
  days: number
}

// ★ 兼容导出：旧 PlanId → 新订阅 SKU，数据只此一份在 pricing.ts，不再有第二份价目
export const PLANS: Record<PlanId, Plan> = {
  monthly: {
    id: 'monthly', name: SKUS.member_monthly.name,
    price: SKUS.member_monthly.priceUSD, days: SKUS.member_monthly.durationDays!
  },
  yearly: {
    id: 'yearly', name: SKUS.member_yearly.name,
    price: SKUS.member_yearly.priceUSD, days: SKUS.member_yearly.durationDays!
  },
}

export interface MembershipStatus {
  active: boolean
  plan: PlanId | null
  expiresAt: string | null
}

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * 读取当前会员状态。会员「有效」= is_member 为真且未过期。
 * 用 service_role 客户端调用，绕过 RLS。
 */
export async function getMembership(admin: SupabaseClient, userId: string): Promise<MembershipStatus> {
  const { data, error } = await admin
    .from('profiles')
    .select('is_member, member_plan, member_expire_at')
    .eq('id', userId)
    .maybeSingle()

  // ★ 读路径必须暴露错误（2026-10-19 修复）：旧实现忽略 error，schema 漂移（如生产库缺
  //   member_plan 列 → 42703）时 data=null → 静默恒判「非会员」，全站会员权益无声失效
  //   （真实事故：一次迁移漏跑 = 所有会员都被当成非会员）。现直接抛错，调用方返 500 让问题可见。
  //   ★ 注意「无此行」是合法情形：data=null 且 error=null（未开通会员）→ 下面仍按非会员返回。
  if (error) throw new Error(`profiles 会员状态查询失败: ${error.code} ${error.message}`)

  const isMember = data?.is_member === true
  const expireMs = data?.member_expire_at ? new Date(data.member_expire_at).getTime() : NaN
  const active = isMember && !Number.isNaN(expireMs) && expireMs > Date.now()

  return {
    active,
    plan: active ? ((data?.member_plan as PlanId) || null) : null,
    expiresAt: active ? new Date(expireMs).toISOString() : null,
  }
}

/** 是否处于有效会员期（unlock 接口用它判断会员免单） */
export async function isActiveMember(admin: SupabaseClient, userId: string): Promise<boolean> {
  return (await getMembership(admin, userId)).active
}

/** 计算会员到期时间：仍在有效期内则从原到期日续期叠加，否则从现在起算 */
export function computeExpiry(current: MembershipStatus, plan: Plan): Date {
  const base = current.active && current.expiresAt ? new Date(current.expiresAt) : new Date()
  return new Date(base.getTime() + plan.days * DAY_MS)
}
