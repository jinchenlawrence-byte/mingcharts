import type { Metadata } from 'next'
import Link from 'next/link'
import '@/app/globals.css'
import SiteChrome from '@/components/SiteChrome'
import SiteLangSync from '@/components/SiteLangSync'
import WebPageJsonLd from '@/components/WebPageJsonLd'
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
          {/* 客户端双保险：服务端 lang 已正确 */}
          <SiteLangSync lang="en" />
          <WebPageJsonLd
            name="MingCharts · Free Bazi & Four Pillars of Destiny"
            path="/en"
            inLanguage="en"
          />
          <header className="border-b border-gold/15">
            <div className="hw-wrap flex flex-wrap items-center justify-between gap-3 py-3">
              <Link href="/en" className="font-bold text-lg text-ink">
                MingCharts
              </Link>
              <nav className="flex flex-wrap items-center gap-4 text-sm text-ink-light">
                <Link href="/en" className="hover:text-ink">Bazi chart</Link>
                <Link href="/en/pricing" className="hover:text-ink">Pricing</Link>
                <Link href="/en/mingshu" className="hover:text-ink">Fate Book</Link>
                <Link href="/en/auth" className="hover:text-ink">Sign in</Link>
                <Link href="/tw" className="hover:text-ink">繁體</Link>
                <Link href="/" className="hover:text-ink">简体</Link>
              </nav>
            </div>
          </header>
          {children}
          <footer className="border-t border-gold/15 mt-10">
            <div className="hw-wrap py-6 text-xs text-ink-light/50 space-y-2">
              <p>
                English edition. Traditional Chinese and Simplified Chinese versions are available
                via the language links above; hreflang declares all three.
              </p>
              <p>
                Content is traditional Chinese metaphysics, offered for reference and entertainment only.
              </p>
            </div>
          </footer>
        </main>
        <SiteChrome lang="en" />
      </body>
    </html>
  )
}
