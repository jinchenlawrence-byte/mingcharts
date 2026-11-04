import type { Metadata } from 'next'
import '@/app/globals.css'
import LocaleSync from '@/components/LocaleSync'
import SiteChrome from '@/components/SiteChrome'
import SiteHeader from '@/components/SiteHeader'
import SiteLangSync from '@/components/SiteLangSync'
import { triAlternates } from '@/lib/lang'
import { rootFontClassName } from '@/lib/site-fonts'
import { sharedMetadata, sharedOpenGraph, siteViewport } from '@/lib/site-meta'

// 繁体树 root layout（顶层 app/layout.tsx 已移除，/tw 是独立根）。
// ★ 服务端首屏 <html lang="zh-Hant">：不能再依赖客户端 SiteLangSync 兜底，
//   否则 Google 首屏按 zh-CN 处理，前面 hreflang 白写。
export const metadata: Metadata = {
  ...sharedMetadata,
  title: {
    default: '明理 · 免費八字排盤與生肖流年（繁體）',
    template: '%s | 明理',
  },
  description:
    '明理繁體版：生肖性格與流年運勢、八字命理知識。提供免費八字排盤、紫微斗數、合婚配對與萬字命書詳批。',
  alternates: {
    canonical: '/tw',
    languages: triAlternates('/'),
  },
  openGraph: {
    ...sharedOpenGraph,
    locale: 'zh_TW',
    siteName: '明理 mingcharts.com',
  },
}

export const viewport = siteViewport

export default function HantRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant" className={rootFontClassName}>
      <body className="min-h-full flex flex-col bg-paper text-ink">
        <main className="hw-page" lang="zh-Hant">
          {/* 把语言写进 mc_locale：后续 AI 命书与收银台据此出繁体（见 lib/locale.ts） */}
          <LocaleSync locale="zh-Hant" />
          {/* 客户端双保险：服务端 lang 已正确，这里只修正极端缓存/注入场景 */}
          <SiteLangSync lang="zh-Hant" />
          {/* ★ 不再在根 layout 输出 WebPage JSON-LD：它会把每个子页都标成 /tw 首页。
              站点级 Organization/WebSite 由 SiteChrome 输出，页面语言由 <html lang> 与 hreflang 表达。 */}
          {/* ★ 导航由三棵树共用的 SiteHeader 渲染（传 locale，链接清单来自 lib/site-nav.ts）。
              不再在本文件手写 13 条链接；登录态胶囊、语言切换、移动端横向滚动行为与简体一致。 */}
          <SiteHeader locale="zh-Hant" />
          {children}
        </main>
        <SiteChrome lang="zh-Hant" />
      </body>
    </html>
  )
}
