'use client'

// 把当前语言写进 <html lang> 与 mc_locale（AI 输出 / 收银台语言）。
// ★ 不写 mc_lang：mc_lang 只由用户显式点语言切换时写入。
//   否则访问过 /tw 就会被自动种上 mc_lang=zh-Hant，之后回到根路径不再按地区导向。
import { useEffect } from 'react'
import { type SiteLang } from '@/lib/lang'
import { LOCALE_COOKIE } from '@/lib/locale'

export default function SiteLangSync({ lang }: { lang: SiteLang }) {
  useEffect(() => {
    document.documentElement.lang = lang
    // AI 报告与收银台的语言（与站点语言同源）：英文树必须写 en，否则命书会出中文
    document.cookie = `${LOCALE_COOKIE}=${lang}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`
  }, [lang])

  return null
}
