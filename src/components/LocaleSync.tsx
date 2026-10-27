'use client'

// 语言同步（2026-10-21 建立；2026-10-26 补 documentElement.lang）
//
// 做两件事：
//   ① 把当前语言写进 cookie（path=/），供 API route 的 localeFromRequest 读取
//      —— 为什么是客户端：App Router 的 Server Component 不能渲染期写 cookie（Next 15+ 禁止），
//         而中间件改写会给全站加一层不必要的分支。只在繁体树挂载即可（简体是缺省）。
//   ② ★ 把 <html lang> 设为 zh-Hant，卸载时还原
//      —— 根布局的 <html lang="zh-CN"> 是固定的（App Router 里只有根布局能渲染 <html>），
//         要按路由改必须把全部路由搬进两个 route group，对 1300 个静态页不划算。
//         故此处做「渐进修正」：不执行 JS 的抓取看到初始 HTML，执行 JS 的浏览器看到正确值。
//      ★ 真正的语言信号由服务端 JSON-LD 承担（WebPageJsonLd: inLanguage=zh-Hant），
//        不依赖 JS —— 这条才是给搜索引擎看的。
import { useEffect } from 'react'
import { LOCALE_COOKIE, type OutputLocale } from '@/lib/locale'

export default function LocaleSync({ locale }: { locale: OutputLocale }) {
  useEffect(() => {
    // ① cookie：一年期；SameSite=Lax 与站点其余 cookie 口径一致
    document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`

    // ② <html lang>：繁体树设 zh-Hant；离开（客户端导航）时还原，避免简体页顶着 zh-Hant
    const html = document.documentElement
    const prev = html.getAttribute('lang') ?? 'zh-CN'
    const next = locale === 'zh-Hant' ? 'zh-Hant' : 'zh-CN'
    if (html.getAttribute('lang') !== next) html.setAttribute('lang', next)
    return () => {
      html.setAttribute('lang', 'zh-CN')
    }
  }, [locale])
  return null
}
