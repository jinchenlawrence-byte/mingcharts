'use client'

// 定价页 SKU 定位：读取 ?sku=，在页面顶部给出「你要解锁的是：…」，
// 并给目标商品卡打上持久高亮（滚动交给链接自带的 #sku-<id> 锚点）。
// ★ 不用 next/navigation 的 search-params hook：静态页会在构建期触发 Suspense bailout；直接读 location.search。
// ★ 滚动交给浏览器原生锚点（链接自带 #sku-<id>，配合 CSS scroll-margin-top 避开吸顶条）：
//   Next 水合期间用 JS scrollTo 会被重置/抢滚动，反而落到页面底部；这里只负责高亮。
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

    let cancelled = false
    const mark = () => {
      if (cancelled) return
      const el = document.getElementById(skuAnchorId(raw))
      if (!el) return
      el.classList.add('hw-sku-focus')
      el.closest('.hw-c-plan')?.classList.add('hw-sku-focus-card')
    }

    // 确认语条是在 effect 里挂上去的，会让目标下移一点点；再补一次标记（幂等）。
    const raf = window.requestAnimationFrame(mark)
    const retry = window.setTimeout(mark, 500)
    return () => {
      cancelled = true
      window.cancelAnimationFrame(raf)
      window.clearTimeout(retry)
    }
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
