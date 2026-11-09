import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { JIEQI_EN, getJieqiEn, type JieQiSeasonEn } from '@/lib/jieqiEn'
import { triAlternates } from '@/lib/lang'

export function generateStaticParams() {
  return JIEQI_EN.map((j) => ({ name: j.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ name: string }>
}): Promise<Metadata> {
  const { name } = await params
  const jq = getJieqiEn(name)
  if (!jq) return { title: 'Solar term not found' }
  return {
    title: `${jq.name} (${jq.dateRange}): meaning, phases, customs and the Bazi month`,
    description: `${jq.name} is one of the 24 Chinese solar terms (${jq.dateRange}). Its meaning, three five-day phases, traditional customs, seasonal wellness, and its place in the Bazi month pillar.`,
    keywords: [
      jq.name,
      `${jq.name} solar term`,
      `${jq.name} customs`,
      `${jq.name} wellness`,
      `${jq.name} Bazi`,
      'Chinese solar terms',
      'jieqi',
    ],
    alternates: {
      canonical: `/en/jieqi/${jq.slug}`,
      languages: triAlternates(`/jieqi/${jq.slug}`),
    },
  }
}

const SEASON_ACCENT: Record<JieQiSeasonEn, { bg: string; light: string }> = {
  Spring: { bg: 'bg-green-600', light: 'bg-green-50 border-green-200 text-green-700' },
  Summer: { bg: 'bg-red-600', light: 'bg-red-50 border-red-200 text-red-700' },
  Autumn: { bg: 'bg-amber-600', light: 'bg-amber-50 border-amber-200 text-amber-700' },
  Winter: { bg: 'bg-blue-600', light: 'bg-blue-50 border-blue-200 text-blue-700' },
}

const PHASE_LABEL = ['First phase', 'Second phase', 'Third phase']

export default async function EnJieQiPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params
  const jq = getJieqiEn(name)
  if (!jq) notFound()

  const idx = JIEQI_EN.findIndex((j) => j.slug === jq.slug)
  const prev = idx > 0 ? JIEQI_EN[idx - 1] : null
  const next = idx < JIEQI_EN.length - 1 ? JIEQI_EN[idx + 1] : null
  const accent = SEASON_ACCENT[jq.season]

  return (
    <main className="hw-page">
      <div className="hw-wrap hw-c-pg">
        <div className="max-w-[45ch] mx-auto">
          <nav className="hw-c-back">
            <Link href="/en">‹ Home</Link>
            <span className="mx-2">›</span>
            <Link href="/en/jieqi">Solar terms</Link>
            <span className="mx-2">›</span>
            <span>{jq.name}</span>
          </nav>

          <div className="hw-c-box overflow-hidden mb-6 p-0!">
            <div className={`${accent.bg} px-6 py-8 text-white`}>
              <div className="flex items-center gap-3 mb-2 text-sm opacity-90 flex-wrap">
                <span>{jq.dateRange}</span>
                <span>·</span>
                <span>{jq.season}</span>
                <span>·</span>
                <span>{jq.type === 'Node' ? 'Month-changing node' : 'Middle qi'}</span>
              </div>
              <h1 className="text-4xl font-bold mb-3">{jq.name}</h1>
              <p className="leading-relaxed text-white/95">{jq.meaning}</p>
            </div>

            {jq.type === 'Node' && jq.monthName && (
              <div className="px-6 py-3 bg-amber-50 border-b border-amber-100 text-sm text-ink">
                <strong>Bazi note:</strong> from {jq.name} the month turns into {jq.monthName};
                anyone born from this point takes {jq.monthZhi} as the month branch.
              </div>
            )}
          </div>

          <div className="hw-c-box mb-4">
            <h2 className="hw-c-secTitle">The three phases of {jq.name}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {jq.hou.map((h, i) => (
                <div key={i} className={`border rounded-lg p-4 text-center ${accent.light}`}>
                  <div className="text-xs mb-2 opacity-70">{PHASE_LABEL[i]}</div>
                  <div className="font-semibold">{h}</div>
                </div>
              ))}
            </div>
            <p className="text-xs text-ink-light mt-3">
              A hou is a five-day phase of natural observation recorded by the ancients. Three hou
              make fifteen days, the length of one solar term.
            </p>
          </div>

          <Block title="Traditional customs">
            <p className="hw-c-body">{jq.custom}</p>
          </Block>

          <Block title="Seasonal wellness">
            <p className="hw-c-body">{jq.yangsheng}</p>
          </Block>

          <div className="hw-c-box bg-gold/5! mb-6">
            <h2 className="hw-c-secTitle">{jq.name} and Bazi</h2>
            <p className="hw-c-body">{jq.bazi}</p>
            <div className="mt-4 p-4 bg-white rounded-lg">
              <p className="text-sm text-ink-light leading-relaxed">
                Want to know whether you were born around {jq.name}, and what your month command and
                Useful God are?{' '}
                <Link href="/en/chart" className="hw-c-link">
                  Cast your chart free →
                </Link>
              </p>
            </div>
          </div>

          <div className="flex justify-between mb-8 text-sm">
            {prev ? (
              <Link href={`/en/jieqi/${prev.slug}`} className="hw-c-back">
                ← {prev.name}
              </Link>
            ) : (
              <span />
            )}
            {next ? (
              <Link href={`/en/jieqi/${next.slug}`} className="hw-c-back">
                {next.name} →
              </Link>
            ) : (
              <span />
            )}
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
