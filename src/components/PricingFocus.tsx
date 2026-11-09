'use client'

// 定价页 SKU 定位：读取 ?sku=，在页面顶部给出「你要解锁的是：…」，
// 并把目标商品卡持久高亮 + 滚动到位。
// ★ 不用 next/navigation 的 search-params hook：静态页会在构建期触发 Suspense bailout；直接读 location.search。
// ★ 非法/缺失参数一律安静回退默认版面（不报错、不改 DOM）。
// ★ 滚动做两次（rAF + 500ms 兜底）：Next 水合/字体加载可能把滚动位置重置回顶部；
//   用户一旦自己滚动/按键/触摸就取消兜底，避免抢滚动。
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
    const onUserMove = () => { cancelled = true }
    const opts = { passive: true, once: true } as const
    window.addEventListener('wheel', onUserMove, opts)
    window.addEventListener('touchstart', onUserMove, opts)
    window.addEventListener('keydown', onUserMove, { once: true })

    const jump = () => {
      if (cancelled) return
      const el = document.getElementById(skuAnchorId(raw))
      if (!el) return
      el.classList.add('hw-sku-focus')
      el.closest('.hw-c-plan')?.classList.add('hw-sku-focus-card')
      const bar = document.querySelector('.hw-skuFocusBar') as HTMLElement | null
      const offset = (bar?.getBoundingClientRect().height ?? 0) + 24
      window.scrollTo({
        top: el.getBoundingClientRect().top + window.scrollY - offset,
        behavior: 'smooth',
      })
    }

    const raf = window.requestAnimationFrame(jump)
    const retry = window.setTimeout(jump, 500)
    return () => {
      cancelled = true
      window.cancelAnimationFrame(raf)
      window.clearTimeout(retry)
      window.removeEventListener('wheel', onUserMove)
      window.removeEventListener('touchstart', onUserMove)
      window.removeEventListener('keydown', onUserMove)
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
