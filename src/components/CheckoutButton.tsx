'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase'
import type { SkuId } from '@/lib/pricing'

// 购买按钮：登录 → POST /api/checkout → 跳转 Waffo 托管收银台。
// productId 未登记（available=false）时渲染灰色「即将推出」，绝不跳到坏页面。
export default function CheckoutButton({
  sku,
  available,
  highlight = false,
  children,
}: {
  sku: SkuId
  available: boolean
  highlight?: boolean
  children: React.ReactNode
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!available) {
    return (
      <div className="block text-center py-2.5 rounded-md font-semibold bg-gray-100 text-gray-400 cursor-not-allowed">
        即将推出
      </div>
    )
  }

  const handleClick = async () => {
    if (loading) return
    setError('')
    setLoading(true)
    try {
      const supabase = getSupabase()
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) {
        router.push('/auth')
        return
      }

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sku, token: session.access_token }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setError(data?.error ?? '发起支付失败，请稍后再试')
        setLoading(false)
        return
      }

      // sessionStorage 仅作成功页的【补充】来源；主来源是 successUrl 里的 ?ref=（跨设备可用）
      if (data.ref) {
        try {
          sessionStorage.setItem('waffo_checkout_ref', data.ref)
        } catch {
          // 隐私模式等场景下写入失败可忽略
        }
      }
      window.location.href = data.checkoutUrl
    } catch (e) {
      setError(e instanceof Error ? e.message : '网络异常，请稍后再试')
      setLoading(false)
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className={`w-full block text-center py-2.5 rounded-md font-semibold transition disabled:opacity-60 ${
          highlight
            ? 'bg-amber-600 text-white hover:bg-amber-700'
            : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
        }`}
      >
        {loading ? '正在跳转支付…' : children}
      </button>
      {error && <p className="text-xs text-red-600 mt-2 text-center">{error}</p>}
    </div>
  )
}
