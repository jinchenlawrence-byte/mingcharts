import Link from 'next/link'
import { notFound } from 'next/navigation'
import { JIEQI, getJieqi } from '@/lib/jieqiData'
import { toHant } from '@/lib/hant'
import { hantAlternates } from '@/lib/hant-seo'
import type { Metadata } from 'next'

// 節氣詳情（繁體）：與 /jieqi/[name] 同源，資料經 toHant 派生。
const H = (s: string) => toHant(s)

export function generateStaticParams() {
  return JIEQI.map(j => ({ name: j.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ name: string }> }): Promise<Metadata> {
  const { name } = await params
  const jq = getJieqi(name)
  if (!jq) return { title: H('節氣未找到') }
  return {
    title: H(`${jq.name}節氣（${jq.dateRange}）：含義、三候、習俗、養生與八字月令`),
    description: H(`${jq.name}是二十四節氣之一（${jq.dateRange}）。詳解${jq.name}的含義由來、三候物候、傳統習俗、節氣養生方法，以及${jq.type === '节' ? `${jq.name}換${jq.monthName}、` : ''}與八字命理調候的關係。`),
    alternates: { canonical: `/tw/jieqi/${jq.slug}`, languages: hantAlternates(`/jieqi/${jq.slug}`) },
  }
}

const SEASON_ACCENT = {
  '春': { bg: 'bg-green-600', light: 'bg-green-50 border-green-200 text-green-700' },
  '夏': { bg: 'bg-red-600', light: 'bg-red-50 border-red-200 text-red-700' },
  '秋': { bg: 'bg-amber-600', light: 'bg-gold/5 border-gold/20 text-ink/70' },
  '冬': { bg: 'bg-blue-600', light: 'bg-blue-50 border-blue-200 text-blue-700' }
} as const

export default async function HantJieQiPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params
  const jq = getJieqi(name)
  if (!jq) notFound()

  const idx = JIEQI.findIndex(j => j.slug === jq.slug)
  const prev = idx > 0 ? JIEQI[idx - 1] : null
  const next = idx < JIEQI.length - 1 ? JIEQI[idx + 1] : null
  const accent = SEASON_ACCENT[jq.season]

  return (
    <main className="hw-page">
      <div className="hw-wrap hw-c-pg">
        <div className="max-w-3xl mx-auto">
        <nav className="hw-c-back">
          <Link href="/tw">{H('首頁')}</Link>
          <span className="mx-2">›</span>
          <Link href="/tw/jieqi">{H('二十四節氣')}</Link>
          <span className="mx-2">›</span>
          <span>{H(jq.name)}</span>
        </nav>

        <div className="hw-c-box overflow-hidden mb-6 p-0!">
          <div className={`${accent.bg} px-6 py-8 text-white`}>
            <div className="flex items-center gap-3 mb-2 text-sm opacity-90">
              <span>{H(jq.dateRange)}</span>
              <span>·</span>
              <span>{H(jq.season)}{H('季')}</span>
              <span>·</span>
              <span>{jq.type === '节' ? H('節（月令更替）') : H('中氣')}</span>
            </div>
            <h1 className="text-4xl font-bold mb-3">{H(jq.name)}</h1>
            <p className="leading-relaxed text-white/95">{H(jq.meaning)}</p>
          </div>

          {jq.type === '节' && jq.monthName && (
            <div className="px-6 py-3 bg-gold/5 border-b border-amber-100 text-sm text-ink">
              <strong>{H('命理提醒：')}</strong>{H(jq.name)}{H('起進入')}{H(jq.monthName ?? '')}{H('，此後出生者月柱為')}{H(jq.monthZhi ?? '')}{H('月。')}
            </div>
          )}
        </div>

        <div className="hw-c-box mb-4">
          <h2 className="hw-c-secTitle">{H(jq.name)}{H('三候')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {jq.hou.map((h, i) => (
              <div key={i} className={`border rounded-lg p-4 text-center ${accent.light}`}>
                <div className="text-xs mb-2 opacity-70">{H('第')}{i + 1}{H('候')}</div>
                <div className="font-semibold">{H(h.replace(/^[一二三]候/, ''))}</div>
                <div className="text-xs mt-1 opacity-70">{H(h.match(/^[一二三]候/)?.[0] ?? '')}</div>
              </div>
            ))}
          </div>
          <p className="text-xs text-ink-light/40 mt-3">
            {H('「候」是古人以五日為一候觀察到的物候現象，三候共十五日，構成一個節氣。')}
          </p>
        </div>

        <Block title={H('傳統習俗')}>
          <p className="hw-c-body">{H(jq.custom)}</p>
        </Block>

        <Block title={H('節氣養生')}>
          <p className="hw-c-body">{H(jq.yangsheng)}</p>
        </Block>

        <div className="hw-c-box bg-gold/5! mb-6">
          <h2 className="hw-c-secTitle">🔮 {H(jq.name)}{H('與八字命理')}</h2>
          <p className="hw-c-body">{H(jq.bazi)}</p>
          <div className="mt-4 p-4 bg-white rounded-lg">
            <p className="text-sm text-ink-light leading-relaxed">
              {H('想知道自己是否出生在')}{H(jq.name)}{H('前後、月令與調候用神是什麼？')}
              <Link href="/tw" className="hw-c-link">{H('輸入出生時辰免費排盤 →')}</Link>
            </p>
          </div>
        </div>

        <div className="flex justify-between mb-8 text-sm">
          {prev ? (
            <Link href={`/tw/jieqi/${prev.slug}`} className="hw-c-back">
              ← {H(prev.name)}
            </Link>
          ) : <span />}
          {next ? (
            <Link href={`/tw/jieqi/${next.slug}`} className="hw-c-back">
              {H(next.name)} →
            </Link>
          ) : <span />}
        </div>
        </div>
      </div>
    </main>
  )
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="hw-c-box mb-4">
      <h2 className="hw-c-secTitle">{title}</h2>
      {children}
    </div>
  )
}
