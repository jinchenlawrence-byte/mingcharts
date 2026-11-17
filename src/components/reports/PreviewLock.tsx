﻿'use client'

// 报告试读锁定卡（合婚/紫微/年运/方位共用）
// ★ 只有标题与灰条占位：绝不把锁定板块的真实正文放进 DOM（防从 DOM 读到付费内容）。
import { useEffect } from 'react'
import { SKUS, formatPriceUSD } from '@/lib/pricing'
import CheckoutButton from '@/components/CheckoutButton'
import { track } from '@/lib/track'
import { paywallClick, paywallModuleOf, usePaywallView } from '@/components/paywallTrack'
import { localize } from '@/lib/hant'
import type { SiteLang } from '@/lib/lang'

/** 单个锁定板块：标题可见 + 3 根模糊灰条 + 琥珀标签 */
export function LockedCard({ title, locale = 'zh-Hans', chip }: { title: string; locale?: SiteLang; chip?: string }) {
  return (
    <div className="hw-lk-card">
      <h3 className="hw-c-h3">{title}</h3>
      <div className="hw-lk-bars" aria-hidden="true">
        <span /><span /><span />
      </div>
      <span className="hw-lk-chip">{chip ?? localize('会员/购买后查看全文', locale)}</span>
    </div>
  )
}

/** 锁定区末尾的统一解锁按钮（文案与既有收银台保持一致） */
export function UnlockCta({ skus, preview, locale = 'zh-Hans', returnTo = '/reports' }: {
  skus: string[]
  preview?: string
  locale?: SiteLang
  returnTo?: string
}) {
  // 流量漏斗：渲染出解锁区 = 用户已读到免费试读末尾（四个模块共用这一个锚点）
  // 依赖用字符串而不是数组：数组每次渲染都是新引用，会导致 effect 反复触发
  const skuKey = skus.join(',')
  useEffect(() => {
    track('preview_view', { skus: skuKey })
  }, [skuKey])

  // 付费墙口径（2026-11-17）：旧 preview_view 只说明「渲染」，这里另记「真的滚到并看见」
  // 与「点了购买」，module 由 SKU 反推（紫微/年运/方位/合婚），供漏斗分模块对比。
  const module = paywallModuleOf(skus[0] ?? 'fatebook')
  const ref = usePaywallView<HTMLDivElement>(module, locale, skuKey, 'report_locked')

  return (
    <div className="hw-lk-cta" ref={ref}>
      {preview && <p className="hw-lk-note">{preview}</p>}
      {skus.map((skuId) => {
        const sku = SKUS[skuId as keyof typeof SKUS]
        if (!sku) return null
        return (
          <div
            key={skuId}
            className="max-w-xs mx-auto mb-2"
            onClickCapture={(e) => {
              if ((e.target as HTMLElement).closest('button')) paywallClick(module, locale, skuId, 'report_locked')
            }}
          >
            <CheckoutButton sku={sku.id} available requireChart={false} returnTo={returnTo}>
              {localize('解锁', locale)} {localize(sku.name, locale)} {formatPriceUSD(sku.priceUSD)}
            </CheckoutButton>
          </div>
        )
      })}
    </div>
  )
}
