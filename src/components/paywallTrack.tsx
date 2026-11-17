'use client'

// 付费墙曝光/点击埋点（2026-11-17）
// 背景：11-13～11-16 有 7 个可确认的外部会话排盘成功并到达 /chart，但 0 次试读、0 次购买点击。
// 旧口径里「付费入口渲染出来」（preview_view）与「真的点了购买」（pay_click）混在一起，
// 无法判断是没人看见入口，还是看见了不买——这里把「看见」和「点击」拆成两个事件。
// 取舍：曝光用 IntersectionObserver（50% 进入视口才算看见），一次挂载只记一次；
//      点击单独记，避免把「渲染了」当成「看到了」。
import { useEffect, useRef } from 'react'
import { track } from '@/lib/track'
import type { SiteLang } from '@/lib/lang'

/** 付费墙归属模块：与审计里的五类命盘一一对应 */
export type PaywallModule = 'fatebook' | 'annual_report' | 'ziwei' | 'geo' | 'hemun'

/** 入口位置：首屏条 / 页尾解锁区 / 报告锁定区 */
export type PaywallSlot = 'chart_top' | 'chart_bottom' | 'report_locked'

/** 从 SKU 反推模块：不新增配置层，价格与商品仍以 SKUS 为单一事实源 */
export function paywallModuleOf(sku: string): PaywallModule {
  if (sku.startsWith('ziwei')) return 'ziwei'
  if (sku === 'annual_report') return 'annual_report'
  if (sku === 'hemun') return 'hemun'
  if (sku === 'geo') return 'geo'
  return 'fatebook'
}

export function paywallClick(module: PaywallModule, locale: SiteLang, sku: string, slot: PaywallSlot): void {
  track('chart_paywall_click', { module, locale, sku, slot })
}

/**
 * 付费入口「被看见」：元素 50% 进入视口时记一次 chart_paywall_view。
 * 不支持 IntersectionObserver 的环境不记（宁可少一条曝光，也不把渲染当看见）。
 */
export function usePaywallView<T extends HTMLElement>(
  module: PaywallModule,
  locale: SiteLang,
  sku: string,
  slot: PaywallSlot
) {
  const ref = useRef<T | null>(null)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    let seen = false
    const io = new IntersectionObserver(
      (entries) => {
        if (seen) return
        if (entries.some((e) => e.isIntersecting && e.intersectionRatio >= 0.5)) {
          seen = true
          track('chart_paywall_view', { module, locale, sku, slot })
          io.disconnect()
        }
      },
      { threshold: [0.5] }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [module, locale, sku, slot])
  return ref
}
