'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getSupabase } from '@/lib/supabase'
import { SKUS, formatPriceUSD, type SkuId } from '@/lib/pricing'
import { waffoProductId } from '@/lib/waffo-products'
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
 * 开通会员按钮（档 C，2026-10-18 接入真实订阅支付）。
 *
 * ★ 合规要点（托管收银台不可改文案，故必须放这里）：
 *   ① 自动续费复选框【默认不勾】；未勾选时按钮【禁用】—— 明确同意才能下单
 *   ② 按钮旁披露：站内自助取消入口（/member）、退款政策（/terms）、AIGC 内容标注
 * ★ 开闸判据 = 该 SKU 的 PROD_ 是否登记（waffo-products.ts 唯一登记处）：
 *   未登记 → 显示「即将推出」，不发请求；已登记 → 走服务端返回的托管收银台地址。
 */
export default function MembershipButton({
  plan = 'monthly',
  className = '',
  label,
}: MembershipButtonProps) {
  const router = useRouter()
  const p = SKUS[PLAN_SKU[plan]]
  const available = waffoProductId(PLAN_SKU[plan]) !== null
  // ★ 默认不勾选：不得预勾（合规硬要求）
  const [agreed, setAgreed] = useState(false)
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
        // 服务端会二次校验；未勾选时按钮本就禁用，这里再兜一层（绝不发 true 以外的值）
        body: JSON.stringify({ token: session.access_token, plan, agreeAutoRenew: agreed === true }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || '开通失败')

      // ★ 已登记 PROD_ → 服务端建好托管收银台会话，跳转支付。
      //   本页【不落库】：会员权益与支付流水由 Waffo webhook 写入（真实权益的唯一来源）。
      if (data.data?.checkoutUrl) {
        window.location.href = data.data.checkoutUrl
        return
      }

      // 内测期免费开放（PROD_ 未登记）：如实告知，不谎称「已购买」
      setDone(true)
      setMessage(data.data?.message ?? '内测期免费开放，未产生任何扣费')
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '开通失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  // 未登记 → 沿用「即将推出」（不展示同意框：没得买就不用同意）
  if (!available) {
    return (
      <div>
        <div className="block text-center py-2.5 rounded-full font-semibold bg-paper-dark/40 text-ink-light/40 cursor-not-allowed">
          即将推出
        </div>
        <p className="text-xs mt-2 text-center text-ink-light/60">
          会员权益即将上线，暂未开放购买
        </p>
      </div>
    )
  }

  return (
    <div>
      <label className="flex items-start gap-2 text-xs text-ink-light leading-relaxed mb-2 cursor-pointer">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-0.5 shrink-0"
        />
        <span>
          我同意开通后<strong className="text-ink">按期自动扣费续订</strong>（
          {formatPriceUSD(p.priceUSD)}
          {plan === 'monthly' ? '/月' : '/年'}，可随时取消），并已阅读
          <Link href="/terms" className="text-[#3a66ff] hover:underline">服务条款与退款政策</Link>。
        </span>
      </label>

      <button
        onClick={handleSubscribe}
        disabled={loading || done || !agreed}
        className={
          className ||
          'w-full bg-amber-600 text-white py-2.5 rounded-md font-semibold hover:bg-amber-700 transition disabled:opacity-60 disabled:cursor-not-allowed'
        }
      >
        {loading
          ? '开通中...'
          : done
            ? '已开通 ✓'
            : label || `开通会员 ${formatPriceUSD(p.priceUSD)}${plan === 'monthly' ? '/月' : '/年'}`}
      </button>

      <p className="text-xs mt-2 text-ink-light/70 leading-relaxed">
        取消：可在
        <Link href="/member" className="text-[#3a66ff] hover:underline">会员中心</Link>
        一键自助取消，取消后本计费周期内仍可使用；也可通过收银台邮件入口联系客服。
        <br />
        AIGC 提示：会员内容由 AI 结合传统命理资料生成，仅供参考，不构成任何决策建议。
      </p>

      {message && (
        <p className={`text-xs mt-2 text-center ${done ? 'text-green-600' : 'text-red-600'}`}>
          {message}
        </p>
      )}
    </div>
  )
}
