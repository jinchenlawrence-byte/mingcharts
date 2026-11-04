import type { Metadata } from 'next'
import Link from 'next/link'
import '@/app/globals.css'
import LocaleSync from '@/components/LocaleSync'
import SiteChrome from '@/components/SiteChrome'
import SiteLangSync from '@/components/SiteLangSync'
import HantLangSwitch from '@/components/HantLangSwitch'
import WebPageJsonLd from '@/components/WebPageJsonLd'
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
          {/* 页面级语言信号。站点实体 JSON-LD 不写 inLanguage，避免在三种语言树里声明单一语言。 */}
          <WebPageJsonLd
            name="明理 · 免費八字排盤與生肖流年（繁體）"
            path="/tw"
            inLanguage="zh-Hant"
          />
          <header className="border-b border-gold/15">
            <div className="hw-wrap flex items-center justify-between gap-3 py-3">
              <Link href="/tw" className="shrink-0 font-bold text-lg text-ink">
                明理
              </Link>
              <nav className="flex min-w-0 flex-1 flex-nowrap items-center justify-end gap-4 overflow-x-auto whitespace-nowrap text-sm text-ink-light [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <Link href="/tw" className="hover:text-ink">排盤</Link>
                <Link href="/tw/shengxiao" className="hover:text-ink">生肖</Link>
                <Link href="/tw/hemun" className="hover:text-ink">合婚</Link>
                <Link href="/tw/ziwei" className="hover:text-ink">紫微</Link>
                <Link href="/tw/geo" className="hover:text-ink">方位城市</Link>
                <Link href="/tw/liunian" className="hover:text-ink">年運報告</Link>
                <Link href="/tw/mingshu" className="hover:text-ink">命書</Link>
                <Link href="/tw/article" className="hover:text-ink">命理知識</Link>
                <Link href="/tw/pricing" className="hover:text-ink">價目</Link>
                <Link href="/tw/charts" className="hover:text-ink">我的命盤</Link>
                <Link href="/tw/reports" className="hover:text-ink">我的報告</Link>
                <Link href="/tw/member" className="hover:text-ink">會員</Link>
                <Link href="/tw/account" className="hover:text-ink">帳戶</Link>
                <Link href="/tw/auth" className="hover:text-ink">登入</Link>
                {/* 语言切换：由 lib/hant.twinPath 按当前路径推导 */}
                <HantLangSwitch />
              </nav>
            </div>
          </header>
          {children}
        </main>
        <SiteChrome lang="zh-Hant" />
      </body>
    </html>
  )
}
