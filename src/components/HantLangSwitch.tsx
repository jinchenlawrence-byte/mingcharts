'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { twinPath } from '@/lib/hant'
import { pathForLang, LANG_COOKIE } from '@/lib/lang'

// 繁體頁的語言切換（简体 + English）；切換即寫 cookie（後續不受 IP 影響）。
function remember(lang: 'zh-Hans' | 'en') {
  document.cookie = `${LANG_COOKIE}=${lang}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`
}

export default function HantLangSwitch() {
  const pathname = usePathname() || '/tw'
  const hansHref = twinPath(pathname, 'zh-Hans')
  const enHref = pathForLang(pathname, 'en')
  return (
    <span className="text-ink-light/40">
      <Link href={hansHref} onClick={() => remember('zh-Hans')} className="hover:text-ink">
        简体
      </Link>
      <span className="mx-1 opacity-40">/</span>
      <Link href={enHref} onClick={() => remember('en')} className="hover:text-ink">
        English
      </Link>
    </span>
  )
}
