import type { Metadata } from 'next'
import Link from 'next/link'
import { triAlternates } from '@/lib/lang'

// English Geomancy entry page. The interactive city map is still in the Chinese edition.
export const metadata: Metadata = {
  title: 'Geomancy · city directions',
  description:
    'Geomancy reads favourable directions and cities from the Five Elements of the chart, and assesses the current city against the birthplace.',
  alternates: { canonical: '/en/geo', languages: triAlternates('/geo') },
}

export default function EnGeoEntry() {
  return (
    <div className="hw-wrap hw-c-pg">
      <Link href="/en" className="hw-c-back">‹ Home</Link>
      <section className="hw-c-box mb-6 mt-2">
        <h1 className="hw-c-h1">Geomancy · city directions</h1>
        <p className="hw-c-lede">
          Geomancy reads favourable directions and cities from the chart's Five Elements and the
          relation between the current city and the birthplace. City data is a product convention,
          not a classical rule; treat it as a structured prompt for reflection.
        </p>
        <ul className="text-sm text-ink-light space-y-2 mt-4">
          <li>• Favourable and unfavourable directions</li>
          <li>• Wealth, career, benefactor and talent cities</li>
          <li>• Current-city impact against the birthplace</li>
        </ul>
        <div className="flex flex-wrap items-center gap-3 mt-5">
          <Link href="/tw/geo" className="hw-c-btnBig">Open the interactive city map →</Link>
          <Link href="/en/pricing" className="hw-c-btnBig">See pricing →</Link>
        </div>
        <p className="text-xs text-ink-light/60 mt-4">
          The interactive map is currently in the Traditional Chinese edition. The AI report body is
          generated in English when the English locale is used; a fully English form is queued for
          the next batch.
        </p>
      </section>
      <p className="text-center text-xs text-ink-light/40 mt-6">
        Traditional astrology content, for reference and entertainment only. Not a basis for any decision.
      </p>
    </div>
  )
}
