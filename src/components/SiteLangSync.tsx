'use client'

// 把当前语言写进 <html lang> 与 mc_lang cookie（浏览器端渐进修正）。
// 根布局的 <html lang="zh-CN"> 无法按路由变化（App Router 限制），
// 这里对 /en 与 /tw 做渐进修正；服务端语言信号仍由 hreflang + JSON-LD 承担。
import { useEffect } from 'react'
import { LANG_COOKIE, type SiteLang } from '@/lib/lang'
import { LOCALE_COOKIE } from '@/lib/locale'

export default function SiteLangSync({ lang }: { lang: SiteLang }) {
  useEffect(() => {
    document.documentElement.lang = lang
    // 用户手动切换过的 cookie 以切换器为准；这里只补写同值，不覆盖成别语言
    document.cookie = `${LANG_COOKIE}=${lang}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`
    // AI 报告与收银台的语言（与站点语言同源）：英文树必须写 en，否则命书会出中文
    document.cookie = `${LOCALE_COOKIE}=${lang}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`
  }, [lang])

  return null
}
