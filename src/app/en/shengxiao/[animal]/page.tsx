import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { SHENGXIAO, getShengXiao, LIUNIAN_YEARS } from '@/lib/shengxiaoData'
import {
  SHENGXIAO_EN,
  getShengXiaoEn,
  pairKindOf,
  PAIR_EN,
  yearNotesEn,
  elementClass,
} from '@/lib/shengxiaoEn'
import { branchEn, zodiacEn } from '@/lib/enTerms'
import { triAlternates } from '@/lib/lang'

export function generateStaticParams() {
  return SHENGXIAO.map((s) => ({ animal: s.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ animal: string }>
}): Promise<Metadata> {
  const { animal } = await params
  const sx = getShengXiao(animal)
  const copy = getShengXiaoEn(animal)
  if (!sx || !copy) return { title: 'Zodiac sign not found' }
  return {
    title: `${copy.name} (${branchEn(sx.zhi)}): personality, career, wealth and compatibility`,
    description: `The ${copy.name} in the Chinese zodiac: personality, career, money, marriage, compatibility, Six Harmony and Three Harmony pairings, guardian buddha ${copy.buddha}, lucky items and the 2024–2031 annual pillars.`,
    alternates: {
      canonical: `/en/shengxiao/${sx.slug}`,
      languages: triAlternates(`/shengxiao/${sx.slug}`),
    },
  }
}

// Green = harmony, red = harm or punishment, orange = clash, grey = steady.
const TONE_BOX: Record<string, string> = {
  favourable: 'bg-green-50 border-green-200',
  caution: 'bg-red-50 border-red-200',
  changing: 'bg-orange-50 border-orange-200',
  steady: 'bg-paper-dark/30 border-gold/15',
}
const TONE_TX: Record<string, string> = {
  favourable: 'text-green-700',
  caution: 'text-red-700',
  changing: 'text-orange-700',
  steady: 'text-ink-light',
}

export default async function EnShengXiaoAnimal({
  params,
}: {
  params: Promise<{ animal: string }>
}) {
  const { animal } = await params
  const sx = getShengXiao(animal)
  const copy = getShengXiaoEn(animal)
  if (!sx || !copy) notFound()

  const notes = yearNotesEn(sx, LIUNIAN_YEARS)

  return (
    <div className="hw-wrap hw-c-pg">
      <nav className="hw-c-back">
        <Link href="/en">Home</Link>
        <span className="mx-2">›</span>
        <Link href="/en/shengxiao">Chinese zodiac</Link>
        <span className="mx-2">›</span>
        <span>{copy.name}</span>
      </nav>

      {/* Header: branch badge, sign name, element and guardian buddha */}
      <div className="hw-c-box mb-6">
        <div className="flex items-center gap-5 mb-4">
          <div className={`hw-zx w-20! h-20! text-2xl! hw-${elementClass(sx.zhi)}`}>
            {branchEn(sx.zhi)}
          </div>
          <div>
            <h1 className="hw-c-h1">
              {copy.name} ({branchEn(sx.zhi)}): personality, career, wealth and compatibility
            </h1>
            <p className="hw-c-meta">
              Branch {branchEn(sx.zhi)} · Element {elementClassWord(sx.zhi)} · Guardian buddha {copy.buddha}
            </p>
            <p className="text-ink-light text-xs mt-1">
              Birth years (the year changes at Li Chun): {sx.years.join(', ')}
            </p>
          </div>
        </div>

        {/* Branch relations */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
          <div className="bg-green-50 border border-green-200 rounded p-2 text-center">
            <div className="text-xs text-ink-light">Six Harmony (Liu He)</div>
            <div className="font-bold text-green-700">{zodiacEn(sx.liuHe)}</div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded p-2 text-center">
            <div className="text-xs text-ink-light">Three Harmony (San He)</div>
            <div className="font-bold text-green-700">{sx.sanHe.map(zodiacEn).join(', ')}</div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded p-2 text-center">
            <div className="text-xs text-ink-light">Six Clash (Liu Chong)</div>
            <div className="font-bold text-red-700">{zodiacEn(sx.liuChong)}</div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded p-2 text-center">
            <div className="text-xs text-ink-light">Six Harm (Liu Hai)</div>
            <div className="font-bold text-red-700">{zodiacEn(sx.liuHai)}</div>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded p-2 text-center col-span-2 md:col-span-1">
            <div className="text-xs text-ink-light">Punishment (Xing)</div>
            <div className="font-bold text-orange-700">{sx.sanXing.map(zodiacEn).join(', ')}</div>
          </div>
        </div>
      </div>

      {/* Five reading sections, one paragraph each — the same five as the Chinese page */}
      <Section title="Personality" body={copy.personality} />
      <Section title="Career" body={copy.career} />
      <Section title="Wealth" body={copy.wealth} />
      <Section title="Marriage and relationships" body={copy.marriage} />
      <Section title="Health" body={copy.health} />

      {/* Lucky items */}
      <div className="hw-c-box mb-6">
        <h2 className="hw-c-secTitle">{copy.name} lucky items and luck guidance</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <LuckyItem label="Lucky numbers" value={copy.luckyNumber} />
          <LuckyItem label="Lucky colours" value={copy.luckyColor} />
          <LuckyItem label="Favourable directions" value={copy.luckyDirection} />
          <LuckyItem label="Guardian buddha" value={copy.buddha} />
          <LuckyItem label="Auspicious flowers" value={copy.luckyFlower} />
          <LuckyItem label="Lucky gemstones" value={copy.luckyStone} />
        </div>
        <p className="text-xs text-ink-light mt-4">
          Note: lucky items are a traditional folk reference. The most reliable way to change your luck
          is to keep your conduct clean, learn steadily and work honestly.
        </p>
      </div>

      {/* Compatibility table */}
      <div className="hw-c-box mb-6">
        <h2 className="hw-c-secTitle">{copy.name} compatibility</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {SHENGXIAO.map((other) => {
            const kind = pairKindOf(sx, other.name)
            const pair = PAIR_EN[kind]
            const good = kind === 'liuHe' || kind === 'sanHe'
            const neutral = kind === 'neutral'
            const otherCopy = SHENGXIAO_EN.find((s) => s.slug === other.slug)
            return (
              <div
                key={other.slug}
                className={`border rounded p-3 text-sm ${good ? 'border-green-200 bg-green-50' : neutral ? 'border-gold/15' : 'border-red-100 bg-red-50/40'}`}
              >
                <div className="flex justify-between items-center mb-1">
                  <Link href={`/en/shengxiao/${other.slug}`} className="font-bold hw-c-link">
                    {copy.name} + {otherCopy?.name ?? zodiacEn(other.name)}
                  </Link>
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${good ? 'bg-green-100 text-green-700' : neutral ? 'bg-paper-dark/40 text-ink-light' : 'bg-red-100 text-red-600'}`}
                  >
                    {pair.level}
                  </span>
                </div>
                <p className="text-xs text-ink-light leading-relaxed">{pair.desc}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Annual pillars */}
      <div className="hw-c-box mb-6">
        <h2 className="hw-c-secTitle">{copy.name} annual pillars (2024–2031)</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {notes.map((n) => (
            <div key={n.year} className={`border rounded-lg p-3 text-center ${TONE_BOX[n.tone]}`}>
              <div className="font-bold text-lg">{n.year}</div>
              <div className={`text-xs mt-0.5 ${TONE_TX[n.tone]}`}>
                {n.ganZhi} · {n.relationText}
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-ink-light mt-3">
          Green marks a harmonious year, red a harm or punishment year, orange a clash year and grey a
          steady year. Year-by-year English pages are not published yet; this table is the summary for
          each year.
        </p>
      </div>

      {/* CTA */}
      <div className="hw-c-cta">
        <h2 className="hw-c-secTitle">A sign is only the year branch — the full chart is sharper</h2>
        <p className="hw-c-dx">
          People born under the same sign can lead completely different lives, because a Bazi chart
          includes the year, month, day and hour pillars. Enter your exact birth time to read your own
          chart.
        </p>
        <Link href="/en" className="hw-c-btnBig">
          Cast my Bazi chart →
        </Link>
      </div>

      <p className="hw-alert hw-alert--note text-center mt-6">
        This material follows traditional Chinese folk practice and is offered for reference and
        entertainment only. It is not a basis for financial, medical or legal decisions.
      </p>
    </div>
  )
}

function Section({ title, body }: { title: string; body: string }) {
  return (
    <div className="hw-c-box mb-4">
      <h2 className="hw-c-secTitle">{title}</h2>
      <p className="hw-c-body">{body}</p>
    </div>
  )
}

function LuckyItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 bg-gold/5 rounded p-3">
      <span className="text-ink-light shrink-0">{label}</span>
      <span className="font-semibold text-ink">{value}</span>
    </div>
  )
}

function elementClassWord(zhi: string): string {
  const words: Record<string, string> = {
    water: 'Water',
    wood: 'Wood',
    fire: 'Fire',
    metal: 'Metal',
    earth: 'Earth',
  }
  return words[elementClass(zhi)] ?? 'Earth'
}
