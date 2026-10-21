'use client'

// 报告试读锁定卡（合婚/紫微/年运/方位共用）
// ★ 只有标题与灰条占位：绝不把锁定板块的真实正文放进 DOM（防从 DOM 读到付费内容）。
import { useEffect } from 'react'
import { SKUS, formatPriceUSD } from '@/lib/pricing'
import CheckoutButton from '@/components/CheckoutButton'
import { track } from '@/lib/track'

/** 单个锁定板块：标题可见 + 3 根模糊灰条 + 琥珀标签 */
export function LockedCard({ title }: { title: string }) {
  return (
    <div className="hw-lk-card">
      <h3 className="hw-c-h3">{title}</h3>
      <div className="hw-lk-bars" aria-hidden="true">
        <span /><span /><span />
      </div>
      <span className="hw-lk-chip">会员/购买后查看全文</span>
    </div>
  )
}

/** 锁定区末尾的统一解锁按钮（文案与既有收银台保持一致） */
export function UnlockCta({ skus, preview }: { skus: string[]; preview?: string }) {
  // 流量漏斗：渲染出解锁区 = 用户已读到免费试读末尾（四个模块共用这一个锚点）
  // 依赖用字符串而不是数组：数组每次渲染都是新引用，会导致 effect 反复触发
  const skuKey = skus.join(',')
  useEffect(() => {
    track('preview_view', { skus: skuKey })
  }, [skuKey])

  return (
    <div className="hw-lk-cta">
      {preview && <p className="hw-lk-note">{preview}</p>}
      {skus.map((skuId) => {
        const sku = SKUS[skuId as keyof typeof SKUS]
        if (!sku) return null
        return (
          <div key={skuId} className="max-w-xs mx-auto mb-2">
            <CheckoutButton sku={sku.id} available requireChart={false} returnTo="/reports">
              解锁 {sku.name} {formatPriceUSD(sku.priceUSD)}
            </CheckoutButton>
          </div>
        )
      })}
    </div>
  )
}
