import type { Metadata } from 'next'
import '@/app/globals.css'
import LocaleSync from '@/components/LocaleSync'
import SiteChrome from '@/components/SiteChrome'
import SiteHeader from '@/components/SiteHeader'
import SiteLangSync from '@/components/SiteLangSync'
import { triAlternates } from '@/lib/lang'
import { rootFontClassName } from '@/lib/site-fonts'
import { sharedMetadata, sharedOpenGraph, siteViewport } from '@/lib/site-meta'

// 英文树 root layout（顶层 app/layout.tsx 已移除，/en 是独立根）。
// ★ 服务端首屏 <html lang="en">，不依赖客户端修正。
export const metadata: Metadata = {
  ...sharedMetadata,
  title: {
    default: 'MingCharts · Free Bazi & Four Pillars of Destiny',
    template: '%s | MingCharts',
  },
  description:
    'MingCharts English edition: Bazi (Four Pillars of Destiny) charting, Ten Gods, Day Master, Luck Pillars, Annual Pillars, Zi Wei Dou Shu and Bazi synastry.',
  alternates: {
    canonical: '/en',
    languages: triAlternates('/'),
  },
  openGraph: {
    ...sharedOpenGraph,
    locale: 'en_US',
    siteName: 'MingCharts',
  },
}

export const viewport = siteViewport

export default function EnRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={rootFontClassName}>
      <body className="min-h-full flex flex-col bg-paper text-ink">
        <main className="hw-page" lang="en">
          {/* 把语言写进 mc_locale：AI 命书与收银台据此出英文 */}
          <LocaleSync locale="en" />
          {/* 客户端双保险：服务端 lang 已正确 */}
          <SiteLangSync lang="en" />
          {/* ★ 不再在根 layout 输出 WebPage JSON-LD：它会把每个子页都标成 /en 首页。
              站点级 Organization/WebSite 由 SiteChrome 输出，页面语言由 <html lang> 与 hreflang 表达。 */}
          {/* ★ 导航由三棵树共用的 SiteHeader 渲染（传 locale，链接清单来自 lib/site-nav.ts）。
              此前英文树的 10 条硬编码链接与两个写死的语言链接在此一并收口。 */}
          <SiteHeader locale="en" />
          {children}
        </main>
        <SiteChrome lang="en" />
      </body>
    </html>
  )
}
