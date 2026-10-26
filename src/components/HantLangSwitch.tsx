'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { twinPath } from '@/lib/hant'

// 繁體頁的「简体」切換器（2026-10-23 第 33 輪）
//
// 修的是什麼：原本寫死 href="/shengxiao"，在 /tw 首頁點「简体」會跳到生肖頁而不是簡體首頁。
// 為什麼是客戶端組件：伺服器 layout 拿不到當前路徑，twinPath 需要 usePathname。
// 映射規則仍由 lib/hant.twinPath 單一決定（與 hreflang 同一套），這裡不重寫規則。

export default function HantLangSwitch() {
  const pathname = usePathname() || '/tw'
  const hansHref = twinPath(pathname, 'zh-Hans')
  return (
    <Link href={hansHref} className="text-ink-light/40 hover:text-ink">
      简体
    </Link>
  )
}
