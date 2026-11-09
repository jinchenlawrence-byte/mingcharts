import type { Metadata } from 'next'
import Link from 'next/link'
import { JIEQI_EN, SEASONS_EN, type JieQiSeasonEn } from '@/lib/jieqiEn'
import { JIERI_EN } from '@/lib/jieriEn'
import { triAlternates } from '@/lib/lang'

export const metadata: Metadata = {
  title: 'The 24 Solar Terms: meaning, phases, customs and Bazi months',
  description:
    'A complete guide to the 24 Chinese solar terms: Start of Spring, Awakening of Insects, Clear and Bright and the rest — meaning, three phases, customs, seasonal wellness, and how the month-changing nodes set the Bazi month pillar.',
  keywords: [
    '24 solar terms',
    'jieqi',
    'Chinese solar terms',
    'Bazi month pillar',
    'Start of Spring',
    'Lichun',
    'solar terms and Bazi',
  ],
  alternates: { canonical: '/en/jieqi', languages: triAlternates('/jieqi') },
}

const SEASON_STYLE: Record<JieQiSeasonEn, string> = {
  Spring: 'border-green-200 bg-green-50/50',
  Summer: 'border-red-200 bg-red-50/40',
  Autumn: 'border-amber-200 bg-amber-50/50',
  Winter: 'border-blue-200 bg-blue-50/40',
}

const SEASON_NAME_STYLE: Record<JieQiSeasonEn, string> = {
  Spring: 'text-green-700',
  Summer: 'text-red-700',
  Autumn: 'text-amber-700',
  Winter: 'text-blue-700',
}

export default function EnJieQiIndex() {
  return (
    <main className="hw-page">
      <div className="hw-wrap hw-c-pg">
        <nav className="hw-c-back">
          <Link href="/en">‹ Home</Link>
          <span className="mx-2">›</span>
          <span>Solar terms</span>
        </nav>

        <h1 className="hw-c-h1">The 24 Solar Terms and the Bazi year</h1>
        <p className="hw-lede">
          Open any solar term for its meaning, three five-day phases, traditional customs, seasonal
          wellness, and how it relates to the Bazi month pillar and the Useful God.
        </p>

        <div className="bg-amber-50 border border-amber-300 rounded-lg p-5 mb-10">
          <h2 className="font-bold text-ink mb-2">Why solar terms matter in Bazi</h2>
          <p className="text-sm text-ink/70 leading-relaxed">
            The <strong>month pillar is set by solar terms, not by the lunar new year</strong>. Twelve
            of the 24 terms are month-changing nodes — Start of Spring, Awakening of Insects, Clear and
            Bright, Start of Summer, Grain in Ear, Minor Heat, Start of Autumn, White Dew, Cold Dew,
            Start of Winter, Major Snow and Minor Cold. The other twelve are middle qi and do not
            change the month. More importantly, <strong>the zodiac animal changes at Start of
            Spring</strong>: anyone born between 1 January and that moment still belongs to the
            previous animal and year pillar.
          </p>
        </div>

        <div className="space-y-8">
          {SEASONS_EN.map((s) => {
            const list = JIEQI_EN.filter((j) => j.season === s.key)
            return (
              <section key={s.key}>
                <div className="flex items-baseline gap-3 mb-4 flex-wrap">
                  <h2 className={`text-2xl font-bold ${SEASON_NAME_STYLE[s.key]}`}>{s.label}</h2>
                  <span className="text-sm text-ink-light">{s.desc}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                  {list.map((j) => (
                    <Link
                      key={j.slug}
                      href={`/en/jieqi/${j.slug}`}
                      className={`border rounded-lg p-3 text-center hover:shadow-md transition-shadow ${SEASON_STYLE[s.key]}`}
                    >
                      <div className="font-bold text-ink">{j.name}</div>
                      <div className="text-xs text-ink-light mt-1">{j.dateRange}</div>
                      {j.type === 'Node' ? (
                        <div className="text-xs text-amber-600 mt-1 font-medium">
                          Month change · {j.monthZhi ?? 'node'}
                        </div>
                      ) : (
                        <div className="text-xs text-ink-light mt-1">Middle qi</div>
                      )}
                    </Link>
                  ))}
                </div>
              </section>
            )
          })}
        </div>

        <div className="hw-c-box mt-10">
          <h2 className="hw-c-secTitle">Traditional festivals</h2>
          <p className="text-sm text-ink-light mb-4">
            Beyond the solar terms, the Spring Festival, Lantern Festival, Clear and Bright, Dragon
            Boat Festival, Mid-Autumn Festival and Double Ninth each carry their own customs and
            metaphysical observances.
          </p>
          <div className="flex flex-wrap gap-2">
            {JIERI_EN.map((f) => (
              <Link
                key={f.slug}
                href="/en/jieri"
                className="bg-gold/5 hover:bg-gold/10 border border-gold/20 rounded-full px-4 py-1.5 text-sm text-ink transition-colors"
              >
                {f.name}
              </Link>
            ))}
            <Link href="/en/jieri" className="hw-c-link text-sm self-center ml-1">
              View all →
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
