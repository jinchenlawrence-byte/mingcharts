'use client'

// 语言同步（2026-10-21 建立；2026-10-26 补 documentElement.lang；2026-11-03 支持英文树）
//
// 做两件事：
//   ① 把当前语言写进 cookie（path=/），供 API route 的 localeFromRequest 读取
//      —— 为什么是客户端：App Router 的 Server Component 不能渲染期写 cookie（Next 15+ 禁止）。
//   ② 按当前语言树修正 <html lang>，卸载时还原为挂载前的值。
//      ★ 服务端首屏 lang 由各自 root layout 正确输出；这里只是客户端双保险。
import { useEffect } from 'react'
import { LOCALE_COOKIE, type OutputLocale } from '@/lib/locale'

export default function LocaleSync({ locale }: { locale: OutputLocale }) {
  useEffect(() => {
    // ① cookie：一年期；SameSite=Lax 与站点其余 cookie 口径一致
    document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`

    // ② <html lang>：按当前树修正；卸载时还原为挂载前的值
    const html = document.documentElement
    const prev = html.getAttribute('lang') ?? 'zh-CN'
    const next = locale === 'zh-Hant' ? 'zh-Hant' : locale === 'en' ? 'en' : 'zh-CN'
    if (html.getAttribute('lang') !== next) html.setAttribute('lang', next)
    return () => {
      if (prev) html.setAttribute('lang', prev)
    }
  }, [locale])
  return null
}
