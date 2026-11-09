import type { Metadata } from 'next'
import Link from 'next/link'
import { JIERI_EN } from '@/lib/jieriEn'
import { triAlternates } from '@/lib/lang'

export const metadata: Metadata = {
  title: 'Traditional Chinese Festivals: customs, taboos and Bazi observances',
  description:
    'A guide to the ten traditional Chinese festivals — Spring Festival, Lantern Festival, Dragon Boat, Qixi, Zhongyuan, Mid-Autumn, Double Ninth, Laba, Little New Year and New Year’s Eve — with dates, origins, customs and metaphysical observances.',
  keywords: [
    'Chinese festivals',
    'traditional Chinese festivals',
    'Spring Festival',
    'Lantern Festival',
    'Dragon Boat Festival',
    'Mid-Autumn Festival',
    'Bazi festivals',
  ],
  alternates: { canonical: '/en/jieri', languages: triAlternates('/jieri') },
}

export default function EnJieRiIndex() {
  return (
    <main className="hw-page">
      <div className="hw-wrap hw-c-pg">
        <nav className="hw-c-back">
          <Link href="/en">‹ Home</Link>
          <span className="mx-2">›</span>
          <span>Festivals</span>
        </nav>

        <h1 className="hw-c-h1">Traditional Chinese Festivals and Their Observances</h1>
        <p className="hw-lede">
          Open any festival for its date, origin, traditional customs, points to note and
          metaphysical advice for inviting good fortune.
        </p>

        <div className="bg-amber-50 border border-amber-300 rounded-lg p-5 mb-8">
          <p className="text-sm text-ink/70 leading-relaxed">
            <strong className="text-ink">Bazi note:</strong> the Spring Festival on the first day of
            the first lunar month is <strong>not the boundary of the zodiac animal</strong>. The
            animal and the year pillar follow the{' '}
            <Link href="/en/jieqi/lichun" className="hw-c-link">
              Start of Spring
            </Link>{' '}
            solar term. Many people get this wrong when casting a chart, which throws off both the
            year pillar and the animal.
          </p>
        </div>

        <div className="space-y-4">
          {JIERI_EN.map((j) => (
            <Link
              key={j.slug}
              href={`/en/jieri/${j.slug}`}
              className="hw-c-box p-5! hover:shadow-md transition-shadow block"
            >
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 className="text-lg font-bold text-ink">{j.name}</h2>
                <span className="text-xs text-ink-light">
                  {j.lunarDate} · {j.alias}
                </span>
              </div>
              <p className="text-sm text-ink-light mt-2 leading-relaxed">{j.intro}</p>
            </Link>
          ))}
        </div>

        <div className="hw-c-box mt-8 text-center">
          <h2 className="hw-c-secTitle">Solar terms or festivals — what is the difference?</h2>
          <p className="text-sm text-ink-light mb-4 leading-relaxed">
            The 24 solar terms are divided by solar longitude, follow the sun, fall on fairly fixed
            dates in the Gregorian calendar, and are the basis for setting the Bazi month pillar.
            Traditional festivals follow the lunar calendar, so their Gregorian dates shift each
            year. Clear and Bright is unusual in being both a solar term and a festival.
          </p>
          <Link href="/en/jieqi" className="hw-c-link">
            Read the guide to the 24 solar terms →
          </Link>
        </div>
      </div>
    </main>
  )
}
