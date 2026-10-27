import type { Metadata } from 'next'
import Link from 'next/link'
import LocaleSync from '@/components/LocaleSync'
import HantLangSwitch from '@/components/HantLangSwitch'
import WebPageJsonLd from '@/components/WebPageJsonLd'
import { HANT_HREFLANG, hantAlternates } from '@/lib/hant-seo'

// 繁体树根布局：lang 必须与内容一致（zh-Hant），否则 Google 会按 zh-CN 处理，
// 前面的 hreflang 也就白写了。
export const metadata: Metadata = {
  title: {
    default: '明理 · 免費八字排盤與生肖流年（繁體）',
    template: '%s | 明理',
  },
  description:
    '明理繁體版：生肖性格與流年運勢、八字命理知識。提供免費八字排盤、紫微斗數、合婚配對與萬字命書詳批。',
  alternates: {
    canonical: '/tw',
    languages: hantAlternates('/'),
  },
  openGraph: {
    locale: 'zh_TW',
    type: 'website',
    siteName: '明理 mingcharts.com',
  },
}

export default function HantLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="hw-page" lang="zh-Hant">
      {/* 把语言写进 cookie：后续 AI 命书与收银台据此出繁体（见 lib/locale.ts） */}
      <LocaleSync locale="zh-Hant" />
      {/* ★ 第 35 轮：页面级语言信号。根布局的 WebSite 已去掉 inLanguage（那会在
          208 个繁体页里声明 zh-CN），改由这里逐页声明 zh-Hant。
          路径级的 name 取不到（布局拿不到子页 metadata），故用站点名 + 繁体标识；
          页面自身的标题仍由 metadata 输出，不影响搜索结果标题。 */}
      <WebPageJsonLd
        name="明理 · 免費八字排盤與生肖流年（繁體）"
        path="/tw"
        inLanguage="zh-Hant"
      />
      <header className="border-b border-gold/15">
        <div className="hw-wrap flex items-center justify-between py-3">
          <Link href="/tw" className="font-bold text-lg text-ink">
            明理
          </Link>
          <nav className="flex items-center gap-4 text-sm text-ink-light">
            <Link href="/tw/shengxiao" className="hover:text-ink">生肖</Link>
            <Link href="/" className="hover:text-ink">排盤</Link>
            <Link href="/article" className="hover:text-ink">命理知識</Link>
            {/* 语言切换：由 lib/hant.twinPath 按当前路径推导（第 33 轮修：原写死 /shengxiao） */}
            <HantLangSwitch />
          </nav>
        </div>
      </header>
      {children}
      <footer className="border-t border-gold/15 mt-10">
        <div className="hw-wrap py-6 text-xs text-ink-light/50 space-y-2">
          <p>
            {HANT_HREFLANG.length} 語系 hreflang 已宣告：本頁同時提供簡體與繁體版本，
            以 <code className="text-ink-light/70">zh-Hant</code> 為繁體語系標識（涵蓋台灣／香港／澳門）。
          </p>
          <p>以上內容為傳統命理民俗文化，僅供參考娛樂，不構成任何決策依據。</p>
        </div>
      </footer>
    </main>
  )
}
