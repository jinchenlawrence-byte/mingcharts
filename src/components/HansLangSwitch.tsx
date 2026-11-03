'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { twinPath } from '@/lib/hant'
import { pathForLang, LANG_COOKIE } from '@/lib/lang'

// 簡體頁的語言切換（繁體 + English）
// ★ 點擊時寫 mc_lang cookie：此後根路徑的 IP 導向以 cookie 為準，不再被地理覆蓋。
function remember(lang: 'zh-Hant' | 'en') {
  document.cookie = `${LANG_COOKIE}=${lang}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`
}

export default function HansLangSwitch({ className }: { className?: string }) {
  const pathname = usePathname() || '/'
  const hantHref = twinPath(pathname, 'zh-Hant')
  const enHref = pathForLang(pathname, 'en')
  return (
    <span className={className ?? 'text-ink-light/40'}>
      <Link href={hantHref} onClick={() => remember('zh-Hant')} className="hover:text-ink">
        繁體
      </Link>
      <span className="mx-1 opacity-40">/</span>
      <Link href={enHref} onClick={() => remember('en')} className="hover:text-ink">
        English
      </Link>
    </span>
  )
}
