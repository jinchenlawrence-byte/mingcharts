import type { Metadata } from 'next'
import Link from 'next/link'
import { triAlternates } from '@/lib/lang'

// English Zi Wei Dou Shu entry page. The interactive chart is still in the Chinese edition.
export const metadata: Metadata = {
  title: 'Zi Wei Dou Shu · Purple Star Astrology',
  description:
    'Zi Wei Dou Shu (Purple Star Astrology) builds a twelve-palace chart with fourteen major stars and the Four Transformations, read by decade and by year.',
  alternates: { canonical: '/en/ziwei', languages: triAlternates('/ziwei') },
}

export default function EnZiweiEntry() {
  return (
    <div className="hw-wrap hw-c-pg">
      <Link href="/en" className="hw-c-back">‹ Home</Link>
      <section className="hw-c-box mb-6 mt-2">
        <h1 className="hw-c-h1">Zi Wei Dou Shu</h1>
        <p className="hw-c-lede">
          Zi Wei Dou Shu, also called Purple Star Astrology, uses the lunar birth hour to place
          twelve palaces. Fourteen major stars, the Four Transformations and the decade/year
          periods are read palace by palace.
        </p>
        <ul className="text-sm text-ink-light space-y-2 mt-4">
          <li>• Twelve palaces and fourteen major stars</li>
          <li>• Four Transformations and structural patterns</li>
          <li>• Decade and annual periods</li>
        </ul>
        <div className="flex flex-wrap items-center gap-3 mt-5">
          <Link href="/tw/ziwei" className="hw-c-btnBig">Open the interactive Zi Wei chart →</Link>
          <Link href="/en/pricing" className="hw-c-btnBig">See pricing →</Link>
        </div>
        <p className="text-xs text-ink-light/60 mt-4">
          The interactive form is currently in the Traditional Chinese edition. The AI report body
          is generated in English when the English locale is used; a fully English form is queued for
          the next batch.
        </p>
      </section>
      <p className="text-center text-xs text-ink-light/40 mt-6">
        Traditional astrology content, for reference and entertainment only. Not a basis for any decision.
      </p>
    </div>
  )
}
