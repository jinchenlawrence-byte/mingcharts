'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase'
import { SKUS, formatPriceUSD, type SkuId } from '@/lib/pricing'
import type { PlanId } from '@/lib/membership'

interface MembershipButtonProps {
  plan?: PlanId
  className?: string
  label?: string
}

/** 旧 PlanId → 订阅 SKU（价格只从 pricing.ts 单一事实源取） */
const PLAN_SKU: Record<PlanId, SkuId> = {
  monthly: 'member_monthly',
  yearly: 'member_yearly'
}

/**
 * 开通会员按钮：未登录跳转 /auth，已登录调用 POST /api/membership。
 * 成功后显示到期时间；再次点击会续期叠加。
 */
export default function MembershipButton({
  plan = 'monthly',
  className = '',
  label,
}: MembershipButtonProps) {
  const router = useRouter()
  const p = SKUS[PLAN_SKU[plan]]
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [done, setDone] = useState(false)

  const handleSubscribe = async () => {
    const supabase = getSupabase()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/auth')
      return
    }

    setLoading(true)
    setMessage('')
    try {
      const res = await fetch('/api/membership', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: session.access_token, plan }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || '开通失败')

      setDone(true)
      const expire = new Date(data.data.expiresAt)
      setMessage(
        `开通成功！有效期至 ${expire.toLocaleDateString('zh-CN')}${plan === 'yearly' ? '' : '，可续期叠加'}`
      )
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '开通失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <button
        onClick={handleSubscribe}
        disabled={loading || done}
        className={
          className ||
          'w-full bg-amber-600 text-white py-2.5 rounded-md font-semibold hover:bg-amber-700 transition disabled:opacity-60'
        }
      >
        {loading
          ? '开通中...'
          : done
            ? '已开通 ✓'
            : label || `开通会员 ${formatPriceUSD(p.priceUSD)}${plan === 'monthly' ? '/月' : '/年'}`}
      </button>
      {message && (
        <p className={`text-xs mt-2 text-center ${done ? 'text-green-600' : 'text-red-600'}`}>
          {message}
        </p>
      )}
    </div>
  )
}
