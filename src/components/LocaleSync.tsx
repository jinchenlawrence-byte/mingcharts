'use client'

// 语言同步：把当前语言写进 cookie（path=/），供 API route 的 localeFromRequest 读取。
//
// 为什么是客户端组件：App Router 的 Server Component 不能在渲染期写 cookie（Next 15+ 明确禁止），
// 而中间件改写会给全站加一层不必要的分支。只在繁体树挂载即可 —— 简体是缺省值，不需要写。
import { useEffect } from 'react'
import { LOCALE_COOKIE, type OutputLocale } from '@/lib/locale'

export default function LocaleSync({ locale }: { locale: OutputLocale }) {
  useEffect(() => {
    // 一年期；SameSite=Lax 与站点其余 cookie 口径一致
    document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`
  }, [locale])
  return null
}
