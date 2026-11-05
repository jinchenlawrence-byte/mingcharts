import Link from 'next/link'
import { JIERI } from '@/lib/jieriData'
import { toHant } from '@/lib/hant'
import { hantAlternates } from '@/lib/hant-seo'
import type { Metadata } from 'next'

// 傳統節日索引（繁體）：與 /jieri 同源，資料經 toHant 派生。
const H = (s: string) => toHant(s)

export const metadata: Metadata = {
  title: '中國傳統節日大全：春節、元宵、端午、七夕、中秋、除夕的習俗與開運',
  description: '中國傳統節日完整介紹：春節、元宵節、清明節、端午節、七夕節、中元節、中秋節、重陽節、臘八節、小年、除夕的日期、由來、習俗禁忌與命理開運講究。',
  alternates: { canonical: '/tw/jieri', languages: hantAlternates('/jieri') },
}

export default function HantJieRiIndex() {
  return (
    <main className="hw-page">
      <div className="hw-wrap hw-c-pg">
        <nav className="hw-c-back">
          <Link href="/tw">{H('首頁')}</Link>
          <span className="mx-2">›</span>
          <span>{H('傳統節日')}</span>
        </nav>

        <h1 className="hw-c-h1">{H('中國傳統節日與開運習俗')}</h1>
        <p className="hw-lede">
          {H('點擊節日名稱，查看其日期、由來、傳統習俗、禁忌講究與命理開運建議。')}
        </p>

        <div className="bg-gold/10/60 border border-amber-300 rounded-lg p-5 mb-8">
          <p className="text-sm text-ink/70 leading-relaxed">
            <strong className="text-ink">{H('📌 命理提醒：')}</strong>
            {H('春節（正月初一）不是生肖的分界線，生肖和八字年柱以每年的')}
            <Link href="/tw/jieqi/lichun" className="hw-c-link">{H('立春')}</Link>
            {H('節氣為準。很多人排盤時搞錯了這一點，導致年柱和生肖算錯。')}
          </p>
        </div>

        <div className="space-y-4">
          {JIERI.map(j => (
            <Link
              key={j.slug}
              href={`/tw/jieri/${j.slug}`}
              className="hw-c-box p-5! hover:shadow-md transition-shadow block"
            >
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 className="text-lg font-bold text-ink">{H(j.name)}</h2>
                <span className="text-xs text-ink-light">{H(j.lunarDate)} · {H(j.alias)}</span>
              </div>
              <p className="text-sm text-ink-light mt-2 leading-relaxed">{H(j.intro)}</p>
            </Link>
          ))}
        </div>

        <div className="hw-c-box mt-8 text-center">
          <h2 className="hw-c-secTitle">{H('節氣與節日有什麼區別？')}</h2>
          <p className="text-sm text-ink-light mb-4 leading-relaxed">
            {H('二十四節氣依據太陽黃經劃分，屬陽曆，日期在公曆中相對固定，是八字排定月柱的依據；傳統節日依據農曆（陰陽合曆），日期在公曆中每年浮動。清明節既是節氣又是傳統節日，較為特殊。')}
          </p>
          <Link href="/tw/jieqi" className="hw-c-link">
            {H('查看二十四節氣詳解 →')}
          </Link>
        </div>
      </div>
    </main>
  )
}
