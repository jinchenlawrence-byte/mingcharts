'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { twinPath } from '@/lib/hant'

// 簡體頁的「繁體」切換器（2026-10-30 第 36 輪）
//
// 修的是什麼：繁體樹的頁面裡有「简体」切換鈕，但【反方向沒有】——
//   簡體頁（Nav、頁腳、首頁）完全沒有通往繁體的入口。
//   後果：台灣/香港用戶從分享連結或品牌搜索落到簡體頁後，無路可走，只能關掉。
//   而 GSC 顯示 5 個點擊裡 4 個落在 /tw —— 說明繁體用戶是存在的，只是被擋在門外。
//
// 為什麼是客戶端組件：與 HantLangSwitch 同理 —— 伺服器 layout 拿不到當前路徑。
// 映射規則仍由 lib/hant.twinPath 單一決定（與 hreflang 同一套），這裡不重寫。
//
// ★ 已知：部分頁面沒有繁體對應（例如 /pricing、/member 在 /tw 下是 404）。
//   twinPath 仍會給出 /tw/pricing —— 這是誠實的「這裡還沒有繁體版」，
//   由目標頁的 404 或簡體內容承接，不做假切換。

export default function HansLangSwitch({ className }: { className?: string }) {
  const pathname = usePathname() || '/'
  const hantHref = twinPath(pathname, 'zh-Hant')
  return (
    <Link href={hantHref} className={className ?? 'text-ink-light/40 hover:text-ink'}>
      繁體
    </Link>
  )
}
