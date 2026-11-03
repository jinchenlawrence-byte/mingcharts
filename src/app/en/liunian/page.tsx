import type { Metadata } from 'next'
import Link from 'next/link'
import { triAlternates } from '@/lib/lang'
import { SKUS, formatPriceUSD } from '@/lib/pricing'

// English Annual Report entry page. The interactive annual report remains in the Chinese edition
// for now; this page explains the product and routes English users to the English chart / pricing.
export const metadata: Metadata = {
  title: 'Annual Report · Annual Pillars reading',
  description:
    'A personal Annual Pillar report covering this year, next year and the year after, with monthly rhythm, read against your full Bazi chart.',
  alternates: { canonical: '/en/liunian', languages: triAlternates('/liunian') },
}

export default function EnLiunianEntry() {
  const price = formatPriceUSD(SKUS.annual_report.priceUSD)
  return (
    <div className="hw-wrap hw-c-pg">
      <Link href="/en" className="hw-c-back">‹ Home</Link>

      <section className="hw-c-box mb-6 mt-2">
        <h1 className="hw-c-h1">Annual Report · Annual Pillars reading</h1>
        <p className="hw-c-lede">
          A zodiac horoscope is a one-in-twelve general reference. The Annual Report reads the year
          against your full Bazi chart — Four Pillars, Day Master, Luck Pillar and Annual Pillar —
          covering this year, next year and the year after, with a monthly rhythm.
        </p>

        <ul className="text-sm text-ink-light space-y-2 mt-4">
          <li>• Three years in one report: this year, next year and the year after</li>
          <li>• Four dimensions each year: career, wealth, relationships and health, plus monthly rhythm</li>
          <li>• Every statement is grounded in the chart, not in a generic zodiac sign</li>
        </ul>

        <div className="flex flex-wrap items-center gap-3 mt-5">
          <Link href="/en" className="hw-c-btnBig">Cast your Bazi chart →</Link>
          <span className="text-sm text-ink-light/70">{price}/report · keep access after unlock</span>
        </div>

        <p className="text-xs text-ink-light/60 mt-4">
          The interactive annual report form is currently available in the Traditional Chinese edition.
          The English report body is generated in English; the entry form will be added in the next batch.
        </p>
        <p className="text-sm mt-3">
          <Link href="/tw/liunian" className="hw-c-link">Open the Traditional Chinese annual report →</Link>
        </p>
      </section>

      <section className="hw-c-box mb-6">
        <h2 className="hw-c-secTitle">Why the full chart matters</h2>
        <p className="text-sm text-ink-light leading-relaxed">
          The same zodiac sign flattens twelve temperaments into one. An Annual Pillar is read
          against one specific chart: Day Master strength, favourable elements and the current Luck
          Pillar decide how the same year lands for different people. Only the full Four Pillars and
          Luck Pillars show what the year means for you.
        </p>
      </section>

      <p className="text-center text-xs text-ink-light/40 mt-6">
        Traditional astrology content, for reference and entertainment only. Not a basis for any decision.
      </p>
    </div>
  )
}
