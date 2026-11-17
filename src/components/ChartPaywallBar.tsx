'use client'

// /chart 首屏付费入口（2026-11-17）
// 位置：四柱 + 五行图例之后、命盘档案之前——用户刚看到自己命盘的瞬间，
// 且在桌面/手机首屏高度内，不需要往下滑才找得到购买入口。
// 纪律：只新增这一条紧凑横条，原有页面内容与页尾解锁区一律保留；
//      价格取自 SKUS，不硬编码；配色沿用现有 gold/paper 令牌，不引入新色。
import type { ReactNode } from 'react'
import CheckoutButton from '@/components/CheckoutButton'
import GuestCheckout from '@/components/guest/GuestCheckout'
import { SKUS, formatPriceUSD } from '@/lib/pricing'
import type { SiteLang } from '@/lib/lang'
import { usePaywallView, paywallClick, type PaywallModule, type PaywallSlot } from '@/components/paywallTrack'

const COPY: Record<SiteLang, { title: string; sub: string; cta: string }> = {
  'zh-Hans': {
    title: '完整命书 · 十卷 AI 精批',
    sub: '一次购买 · 永久回看',
    cta: '解锁完整命书',
  },
  'zh-Hant': {
    title: '完整命書 · 十卷 AI 精批',
    sub: '一次購買 · 永久回看',
    cta: '解鎖完整命書',
  },
  en: {
    title: 'Full Fate Book · ten AI-written volumes',
    sub: 'One-time purchase · lifetime access',
    cta: 'Unlock the full Fate Book',
  },
}

/** 首屏付费条：能买什么（十卷命书）、多少钱（SKUS 实时价）、点哪里（同一个按钮） */
export default function ChartPaywallBar({
  locale,
  chartId,
  available,
  authPath,
  returnTo,
}: {
  locale: SiteLang
  chartId?: string
  available: boolean
  authPath?: string
  returnTo?: string
}) {
  const copy = COPY[locale]
  const price = formatPriceUSD(SKUS.fatebook.priceUSD)
  const ref = usePaywallView<HTMLDivElement>('fatebook', locale, 'fatebook', 'chart_top')

  return (
    <div
      ref={ref}
      onClickCapture={(e) => {
        // 只认按钮：条款链接在 CheckoutButton 内部，点它不算购买点击
        // ★ 游客入口有自己的埋点，别被父级再记一次（否则展开/支付各多一次 paywall 点击）
        const el = e.target as HTMLElement
        if (el.closest('[data-guest-checkout]')) return
        if (el.closest('button')) paywallClick('fatebook', locale, 'fatebook', 'chart_top')
      }}
      className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-3 rounded-xl border border-gold/25 bg-paper-dark/20 px-4 py-3"
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-ink">{copy.title}</p>
        <p className="text-xs text-ink-light">{copy.sub}</p>
      </div>
      <div className="w-full sm:w-[260px] sm:shrink-0">
        <CheckoutButton
          sku="fatebook"
          available={available}
          chartId={chartId}
          authPath={authPath}
          returnTo={returnTo}
          locale={locale}
        >
          {copy.cta} · {price}
        </CheckoutButton>
      </div>
      {/* ★ 游客入口（2026-11-17）：只对未登录显示，登录用户 DOM 里不会出现；
          默认由 NEXT_PUBLIC_GUEST_CHECKOUT_ENABLED 关闭，不影响现有登录用户链路。 */}
      <div className="w-full text-center">
        <GuestCheckout locale={locale} available={available} />
      </div>
    </div>
  )
}

/** 给既有付费区补「被看见 / 被点击」埋点，不改变原有 DOM 样式与内容 */
export function PaywallViewTracker({
  module,
  locale,
  sku,
  slot,
  children,
}: {
  module: PaywallModule
  locale: SiteLang
  sku: string
  slot: PaywallSlot
  children: ReactNode
}) {
  const ref = usePaywallView<HTMLDivElement>(module, locale, sku, slot)
  return (
    <div
      ref={ref}
      onClickCapture={(e) => {
        if ((e.target as HTMLElement).closest('button')) paywallClick(module, locale, sku, slot)
      }}
    >
      {children}
    </div>
  )
}
