import type { Metadata } from 'next'
import Link from 'next/link'
import { triAlternates } from '@/lib/lang'

// English Bazi Synastry entry page. The interactive two-chart form is still in the Chinese
// edition; the AI report pipeline already accepts locale=en, so the English report body is ready.
export const metadata: Metadata = {
  title: 'Bazi Synastry · compare two charts',
  description:
    'Bazi synastry compares two Four Pillars charts: day-pillar spouse palace, spouse stars, Five Elements support, Ten Gods and Luck Pillar rhythm.',
  alternates: { canonical: '/en/hemun', languages: triAlternates('/hemun') },
}

export default function EnHemunEntry() {
  return (
    <div className="hw-wrap hw-c-pg">
      <Link href="/en" className="hw-c-back">‹ Home</Link>
      <section className="hw-c-box mb-6 mt-2">
        <h1 className="hw-c-h1">Bazi Synastry</h1>
        <p className="hw-c-lede">
          Synastry reads two charts together. The day-pillar spouse palace is the core; the spouse
          star, Five Elements support, Ten Gods and the rhythm of both Luck Pillars are read around it.
          The result describes tendencies and practical ways to work with differences, not a verdict
          on the relationship.
        </p>
        <ul className="text-sm text-ink-light space-y-2 mt-4">
          <li>• Day-pillar spouse palace and the six clash/union relationships</li>
          <li>• Spouse star, Ten Gods and Five Elements complementarity</li>
          <li>• Practical communication and pacing advice</li>
        </ul>
        <div className="flex flex-wrap items-center gap-3 mt-5">
          <Link href="/tw/hemun" className="hw-c-btnBig">Open the interactive synastry form →</Link>
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
