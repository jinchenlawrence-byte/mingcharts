'use client'

// 命书游客结账入口（先付款后注册 · 阶段 B，2026-11-17）
//
// 位置：/chart 首屏付费条 ChartPaywallBar 内、现有「解锁完整命书」按钮下方。
// 纪律：
//   · 只有【未登录】才渲染：挂载后查 session，登录用户看不到任何多余入口（DOM 都不出现）
//   · 只收一个字段：邮箱（Waffo 预填 + 认领凭证收件）；命盘取 localStorage 的 currentChart
//   · 默认关闭：NEXT_PUBLIC_GUEST_CHECKOUT_ENABLED 未开时直接返回 null
//   · 不碰现有 CheckoutButton / /api/checkout / webhook —— 登录用户链路逐字不变
import { useEffect, useState } from 'react'
import { getSupabase } from '@/lib/supabase'
import { SKUS, formatPriceUSD } from '@/lib/pricing'
import { track } from '@/lib/track'
import { paywallClick } from '@/components/paywallTrack'
import { GUEST_ENTRY_COPY } from '@/lib/guestCheckoutCopy'
import type { SiteLang } from '@/lib/lang'

const COPY = GUEST_ENTRY_COPY

function guestEnabledOnClient(): boolean {
  const v = process.env.NEXT_PUBLIC_GUEST_CHECKOUT_ENABLED?.trim().toLowerCase()
  return v === '1' || v === 'true'
}

export default function GuestCheckout({
  locale,
  available,
}: {
  locale: SiteLang
  available: boolean
}) {
  const copy = COPY[locale]
  const [visible, setVisible] = useState(false)
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // 登录用户不显示游客入口（未确定前一律不渲染，避免闪一下再消失）
  useEffect(() => {
    if (!guestEnabledOnClient()) return
    let cancelled = false
    ;(async () => {
      try {
        const {
          data: { session },
        } = await getSupabase().auth.getSession()
        if (!cancelled && !session) setVisible(true)
      } catch {
        // 取 session 失败按未登录处理也无害；这里选择不显示，宁可少一个入口
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (!guestEnabledOnClient() || !visible) return null

  const price = formatPriceUSD(SKUS.fatebook.priceUSD)

  const handleSubmit = async () => {
    if (loading) return
    setError('')
    const trimmed = email.trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError(copy.errEmail)
      return
    }

    let chart: unknown = null
    try {
      const stored = localStorage.getItem('currentChart')
      if (stored) chart = JSON.parse(stored)
    } catch {
      chart = null
    }
    if (!chart || typeof chart !== 'object') {
      setError(copy.errChart)
      return
    }

    setLoading(true)
    try {
      track('pay_click', { sku: 'fatebook', guest: true, locale })
      const res = await fetch('/api/guest/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed, locale, chart }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setError(data?.error ?? copy.errNetwork)
        setLoading(false)
        return
      }
      if (data?.ref) {
        try {
          sessionStorage.setItem('waffo_checkout_ref', data.ref)
        } catch {
          // 隐私模式写入失败可忽略：成功页主来源是 successUrl 里的 ?ref=
        }
      }
      window.location.href = data.checkoutUrl
    } catch {
      setError(copy.errNetwork)
      setLoading(false)
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        data-guest-checkout
        onClick={() => {
          paywallClick('fatebook', locale, 'fatebook', 'chart_top')
          setOpen(true)
        }}
        className="mt-2 text-xs text-ink/70 underline hover:text-ink"
      >
        {copy.toggle}
      </button>
    )
  }

  return (
    <div data-guest-checkout className="mt-3 w-full text-left">
      <p className="text-sm font-bold text-ink">{copy.title}</p>
      <p className="mt-1 text-xs text-ink-light leading-relaxed">{copy.desc}</p>
      <label htmlFor="guest-email" className="mt-3 block text-xs font-medium text-ink/80">
        {copy.emailLabel}
      </label>
      <input
        id="guest-email"
        type="email"
        inputMode="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={copy.emailPlaceholder}
        disabled={loading}
        className="mt-1 w-full rounded-lg border border-gold/25 bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-ink/40"
      />
      <button
        type="button"
        onClick={handleSubmit}
        disabled={loading || !available}
        className="mt-2 w-full rounded-full bg-ink py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
      >
        {!available ? copy.unavailable : loading ? `${copy.pay}…` : `${copy.pay} · ${price}`}
      </button>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      <p className="mt-1.5 text-[11px] text-ink/70">{copy.note}</p>
    </div>
  )
}
