import type { Metadata } from 'next'
import Link from 'next/link'
import SiteLangSync from '@/components/SiteLangSync'
import WebPageJsonLd from '@/components/WebPageJsonLd'
import { triAlternates } from '@/lib/lang'

// 英文樹根佈局：lang="en"；頁面級 JSON-LD 聲明 inLanguage=en。
export const metadata: Metadata = {
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
    locale: 'en_US',
    type: 'website',
    siteName: 'MingCharts',
  },
}

export default function EnLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="hw-page" lang="en">
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
  )
}
