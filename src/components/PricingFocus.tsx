'use client'

// 定价页 SKU 定位：读取 ?sku=，在页面顶部给出「你要解锁的是：…」，
// 并把目标商品卡持久高亮 + 滚动到位。
// ★ 不用 next/navigation 的 search-params hook：静态页会在构建期触发 Suspense bailout；直接读 location.search。
// ★ 非法/缺失参数一律安静回退默认版面（不报错、不改 DOM）。
import { useEffect, useState } from 'react'
import type { SiteLang } from '@/lib/lang'
import { isFocusSku, skuAnchorId, skuFocusName, skuFocusPrice, type FocusSku } from '@/lib/pricingFocus'

const LABEL: Record<SiteLang, string> = {
  'zh-Hans': '你要解锁的是：',
  'zh-Hant': '你要解鎖的是：',
  en: 'You are unlocking: ',
}

export default function PricingFocus({ locale }: { locale: SiteLang }) {
  const [sku, setSku] = useState<FocusSku | null>(null)

  useEffect(() => {
    const raw = new URLSearchParams(window.location.search).get('sku')
    if (!isFocusSku(raw)) return
    setSku(raw)
    const el = document.getElementById(skuAnchorId(raw))
    if (!el) return
    el.classList.add('hw-sku-focus')
    el.closest('.hw-c-plan')?.classList.add('hw-sku-focus-card')
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [])

  if (!sku) return null

  return (
    <div className="hw-skuFocusBar" role="status" aria-live="polite">
      <span className="hw-skuFocusLabel">{LABEL[locale]}</span>
      <strong className="hw-skuFocusName">
        {skuFocusName(sku, locale)} · {skuFocusPrice(sku)}
      </strong>
    </div>
  )
}
