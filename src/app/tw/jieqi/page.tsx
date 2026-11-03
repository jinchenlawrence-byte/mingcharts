import Link from 'next/link'
import { JIEQI, SEASONS } from '@/lib/jieqiData'
import { toHant } from '@/lib/hant'
import { hantAlternates } from '@/lib/hant-seo'
import type { Metadata } from 'next'

// 二十四節氣索引（繁體）：與 /jieqi 同源，資料經 toHant 派生。
const H = (s: string) => toHant(s)

export const metadata: Metadata = {
  title: '二十四節氣詳解：節氣與八字命理、月令更替、節氣養生',
  description: '二十四節氣完整介紹：立春、驚蟄、清明等 24 節氣的含義、三候物候、傳統習俗、節氣養生，以及節氣與八字月令、生肖分界（立春換年）的命理關係。',
  alternates: { canonical: '/tw/jieqi', languages: hantAlternates('/jieqi') },
}

const SEASON_STYLE = {
  '春': 'border-green-200 bg-green-50/50',
  '夏': 'border-red-200 bg-red-50/40',
  '秋': 'border-gold/20 bg-gold/5/50',
  '冬': 'border-blue-200 bg-blue-50/40'
} as const

const SEASON_NAME_STYLE = {
  '春': 'text-green-700',
  '夏': 'text-red-700',
  '秋': 'text-ink/70',
  '冬': 'text-blue-700'
} as const

export default function HantJieQiIndex() {
  return (
    <main className="hw-page">
      <div className="hw-wrap hw-c-pg">
        <nav className="hw-c-back">
          <Link href="/tw">{H('首頁')}</Link>
          <span className="mx-2">›</span>
          <span>{H('二十四節氣')}</span>
        </nav>

        <h1 className="hw-c-h1">{H('二十四節氣與命理養生')}</h1>
        <p className="hw-lede">
          {H('點擊任一款節氣，查看其含義、三候物候、傳統習俗、養生方法，以及與八字月令更替、調候用神的關係。')}
        </p>

        <div className="bg-gold/10/60 border border-amber-300 rounded-lg p-5 mb-10">
          <h2 className="font-bold text-ink mb-2">{H('📌 節氣與八字的關係（命理必知）')}</h2>
          <p className="text-sm text-ink/70 leading-relaxed">
            {H('八字的月柱按「節氣」劃分，而非農曆初一。二十四節氣中，12 個「節」（立春、驚蟄、清明、立夏、芒種、小暑、立秋、白露、寒露、立冬、大雪、小寒）是月令更替的節點；12 個「中氣」不換月。更重要的是，生肖以立春為界——公曆 1 月 1 日至立春前出生的人，生肖和年柱仍屬上一年。')}
          </p>
        </div>

        <div className="space-y-8">
          {SEASONS.map(s => {
            const list = JIEQI.filter(j => j.season === s.key)
            return (
              <section key={s.key}>
                <div className="flex items-baseline gap-3 mb-4">
                  <h2 className={`text-2xl font-bold ${SEASON_NAME_STYLE[s.key]}`}>{H(s.label)}</h2>
                  <span className="text-sm text-ink-light/60">{H(s.desc)}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                  {list.map(j => (
                    <Link
                      key={j.slug}
                      href={`/tw/jieqi/${j.slug}`}
                      className={`border rounded-lg p-3 text-center hover:shadow-md transition-shadow ${SEASON_STYLE[s.key]}`}
                    >
                      <div className="font-bold text-ink">{H(j.name)}</div>
                      <div className="text-xs text-ink-light/60 mt-1">{H(j.dateRange.replace('公历', ''))}</div>
                      {j.type === '节' ? (
                        <div className="text-xs text-amber-600 mt-1 font-medium">{H('換月 ·')} {H(j.monthZhi ?? '')}{H('月')}</div>
                      ) : (
                        <div className="text-xs text-ink-light/40 mt-1">{H('中氣')}</div>
                      )}
                    </Link>
                  ))}
                </div>
              </section>
            )
          })}
        </div>

        <div className="hw-c-box mt-10">
          <h2 className="hw-c-secTitle">{H('傳統節日與開運')}</h2>
          <p className="text-sm text-ink-light mb-4">
            {H('除二十四節氣外，春節、元宵、清明、端午、中秋、重陽等傳統節日也各有命理講究與開運習俗。')}
          </p>
          <div className="flex flex-wrap gap-2">
            {['春節', '元宵節', '端午節', '七夕', '中秋節', '重陽節', '臘八節', '除夕'].map(f => (
              <Link
                key={f}
                href="/tw/jieri"
                className="bg-gold/5 hover:bg-gold/10 border border-gold/20 rounded-full px-4 py-1.5 text-sm text-ink transition-colors"
              >
                {H(f)}
              </Link>
            ))}
            <Link href="/tw/jieri" className="hw-c-link text-sm self-center ml-1">
              {H('查看全部 →')}
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
