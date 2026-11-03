import type { Metadata } from 'next'
import '@/app/globals.css'
import SiteChrome from '@/components/SiteChrome'
import { rootFontClassName } from '@/lib/site-fonts'
import { sharedMetadata, siteViewport } from '@/lib/site-meta'

// 简体语言树的 root layout（路由组 (zh) 不影响 URL）。
// ◆ 为什么拆路由组：App Router 只有 root layout 能渲染 <html>；
//   用 headers()/cookies() 会把 1300+ 静态页全部变成动态，不可接受。
//   多 root layout（(zh) / tw / en 各自一个）能让服务端 HTML 首屏 lang 正确，
//   同时保持每棵树静态生成。
export const metadata: Metadata = {
  ...sharedMetadata,
  title: {
    default: '明理 - 免费八字排盘与命书详批',
    template: '%s | 明理',
  },
  description:
    '专业八字命理平台：免费四柱排盘、十神格局分析，命书报告万字详批（八字总览、性格、用神、格局、调候、大运、事业、婚姻、子女、健康），生肖运势与命理知识大全。',
}

export const viewport = siteViewport

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className={rootFontClassName}>
      <body className="min-h-full flex flex-col bg-paper text-ink">
        {children}
        <SiteChrome lang="zh-Hans" />
      </body>
    </html>
  )
}
