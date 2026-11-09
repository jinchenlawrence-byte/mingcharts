import type { Metadata } from 'next'
import Link from 'next/link'
import CheckoutButton from '@/components/CheckoutButton'
import { SKUS, formatPriceUSD } from '@/lib/pricing'
import { waffoProductId } from '@/lib/waffo-products'
import { triAlternates } from '@/lib/lang'

// 英文命書介紹頁（第一批）：與 /mingshu 同資訊量；購買按鈕走既有 CheckoutButton。
// ★ 命書正文目前由中文 AI 產出；英文版報告生成尚未上線（見回執的待拍板项）。
export const metadata: Metadata = {
  title: `Fate Book: full Bazi reading · ${formatPriceUSD(SKUS.fatebook.priceUSD)}`,
  description:
    'The Fate Book is a full-length Bazi reading: chart overview, temperament, useful god, structure, seasonal adjustment, Luck and Annual Pillars, career, marriage, children and health, written by an AI astrologer drawing on six classics.',
  alternates: { canonical: '/en/mingshu', languages: triAlternates('/mingshu') },
}

const SECTIONS: Array<{ title: string; desc: string }> = [
  { title: 'Chart overview', desc: 'Day Master, month command, strength, structure and Five Elements balance.' },
  { title: 'Temperament & gifts', desc: 'The Day Master element and Ten Gods combination: strengths, blind spots, talent.' },
  { title: 'Useful God', desc: 'The useful god, favorable and unfavorable elements, with direction, colour and industry notes.' },
  { title: 'Structure outcomes', desc: 'Structure read through Zi Ping Zhen Quan: supporting god, hidden or exposed unfavorable gods, level.' },
  { title: 'Seasonal adjustment', desc: 'Cold, heat, dryness and dampness read through Qiong Tong Bao Jian, and the remedy.' },
  { title: 'Luck & Annual Pillars', desc: 'Each decade assessed, with the current Luck Pillar and the next three Annual Pillars expanded.' },
  { title: 'Career & wealth', desc: 'Structure, useful god and wealth/officer configuration; industry direction and wealth level.' },
  { title: 'Marriage & relationships', desc: 'Spouse star and spouse palace: attachment pattern, partner traits, cautions.' },
  { title: 'Children & kin', desc: 'Children star and palace, plus relationships with parents and siblings.' },
  { title: 'Health notes', desc: 'Organs associated with strong or weak elements, and lifestyle suggestions.' },
]

const FAQS = [
  { q: 'How is the Fate Book produced?', a: 'The engine computes the Four Pillars, Ten Gods, Luck Pillars, strength and structure deterministically. An AI astrologer then writes the ten sections against your specific chart, drawing on six classics. It is not a generic template.' },
  { q: 'What do I need to provide?', a: 'Birth year, month, day, hour (to the minute), gender, and ideally the birth place for True Solar Time correction.' },
  { q: 'How long does it take?', a: 'Usually about 30 seconds. If the AI service is unavailable, the rule engine still produces all ten sections.' },
  { q: 'Is it saved?', a: 'Yes — it is stored in your account under "My Charts" and can be reviewed on any device after signing in.' },
  { q: 'Is it guaranteed?', a: 'No. It describes tendencies and is not a substitute for medical, legal, financial or mental-health advice.' },
]

export default function EnMingShuPage() {
  return (
    <main className="hw-page">
      <div className="hw-wrap hw-c-pg">
        <Link href="/en" className="hw-c-back">‹ Home</Link>

        <header className="max-w-[45ch] mx-auto text-center py-8">
          <span className="inline-block bg-gold/10 text-ink text-xs font-semibold px-3 py-1 rounded-full mb-4">
            Six classics · AI in-depth reading
          </span>
          <h1 className="hw-c-h1">Fate Book</h1>
          <p className="text-xl text-ink font-medium mb-3">
            A full-length reading that makes your Bazi chart readable
          </p>
          <p className="hw-lede mx-auto!">
            Chart first, reading second. The engine computes your Four Pillars, Ten Gods, strength
            and structure; the AI astrologer then explains the relationships in clear, restrained
            language — personality, career, marriage, health, all at once.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-4">
            <CheckoutButton sku="fatebook" available={waffoProductId('fatebook', 'en') !== null} highlight authPath="/en/auth" locale="en" returnTo="/en/checkout/success">
              Buy the Fate Book · {formatPriceUSD(SKUS.fatebook.priceUSD)}
            </CheckoutButton>
            <Link href="/en" className="bg-white text-ink px-8 py-3 rounded-full font-semibold border border-gold/20 hover:bg-gold/5 transition">
              Cast a free chart first
            </Link>
          </div>
          <p className="text-xs text-ink-light mt-3">
            The chart page and AI-written reports are in English. If the AI service is unavailable,
            the ten sections are produced by the English rule-engine fallback.
          </p>
        </header>

        <section className="hw-wrap py-8">
          <h2 className="hw-c-secTitle hw-c-h2C mb-6">Ten sections</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {SECTIONS.map((s, i) => (
              <div key={s.title} className="hw-c-box p-5!">
                <div className="text-amber-600 font-bold text-sm mb-2">{String(i + 1).padStart(2, '0')}</div>
                <div className="font-bold text-ink mb-1">{s.title}</div>
                <p className="text-xs text-ink-light leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="max-w-[45ch] mx-auto py-8">
          <h2 className="hw-c-secTitle hw-c-h2C mb-6">FAQ</h2>
          <div className="space-y-3">
            {FAQS.map((f) => (
              <details key={f.q} className="hw-c-box p-5! group">
                <summary className="font-semibold text-ink cursor-pointer list-none flex justify-between items-center">
                  {f.q}
                  <span className="text-amber-500 group-open:rotate-45 transition-transform">＋</span>
                </summary>
                <p className="mt-3 text-sm text-ink-light leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <p className="text-center text-xs text-ink-light pb-10">
          All content is traditional Chinese metaphysics, for reference and entertainment only; it is
          not life, medical, legal or financial advice.
        </p>
      </div>
    </main>
  )
}
