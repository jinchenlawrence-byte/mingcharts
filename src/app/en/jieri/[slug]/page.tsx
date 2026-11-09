import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { JIERI_EN, getJieRiEn } from '@/lib/jieriEn'
import { triAlternates } from '@/lib/lang'

export function generateStaticParams() {
  return JIERI_EN.map((j) => ({ slug: j.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const jr = getJieRiEn(slug)
  if (!jr) return { title: 'Festival not found' }
  return {
    title: `${jr.name} (${jr.lunarDate}): origins, customs and luck`,
    description: `${jr.name}, also called ${jr.alias}, falls on ${jr.lunarDate} (${jr.solarRange}). Its origins, traditional customs, points to note and metaphysical advice for good fortune.`,
    keywords: [
      jr.name,
      `${jr.name} customs`,
      `${jr.name} origins`,
      `${jr.name} taboos`,
      jr.alias,
      'Chinese festivals',
    ],
    alternates: {
      canonical: `/en/jieri/${jr.slug}`,
      languages: triAlternates(`/jieri/${jr.slug}`),
    },
  }
}

export default async function EnJieRiPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const jr = getJieRiEn(slug)
  if (!jr) notFound()

  return (
    <main className="hw-page">
      <div className="hw-wrap hw-c-pg">
        <div className="max-w-[45ch] mx-auto">
          <nav className="hw-c-back">
            <Link href="/en">‹ Home</Link>
            <span className="mx-2">›</span>
            <Link href="/en/jieri">Festivals</Link>
            <span className="mx-2">›</span>
            <span>{jr.name}</span>
          </nav>

          <div className="hw-c-box overflow-hidden mb-6 p-0!">
            <div className="bg-gradient-to-r from-red-600 to-amber-600 px-6 py-8 text-white">
              <div className="text-sm opacity-90 mb-2">
                {jr.lunarDate} · {jr.solarRange} · Also called: {jr.alias}
              </div>
              <h1 className="text-4xl font-bold mb-3">{jr.name}</h1>
              <p className="leading-relaxed text-white/95">{jr.intro}</p>
            </div>
          </div>

          <div className="hw-c-box mb-4">
            <h2 className="hw-c-secTitle">Customs of {jr.name}</h2>
            <ul className="space-y-3">
              {jr.customs.map((c, i) => (
                <li key={i} className="flex gap-3 text-ink/70 leading-relaxed text-[15px]">
                  <span className="text-amber-500 font-bold shrink-0">◆</span>
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="hw-c-box bg-gold/5! mb-4">
            <h2 className="hw-c-secTitle">{jr.name} and Bazi</h2>
            <p className="hw-c-body">{jr.bazi}</p>
          </div>

          <div className="hw-c-box mb-6">
            <h2 className="hw-c-secTitle">{jr.name}: inviting good fortune</h2>
            <p className="hw-c-body">{jr.lucky}</p>
            <p className="text-xs text-ink-light mt-4">
              Folk observances are chiefly about carrying culture forward and expressing good
              wishes. A kind heart and good deeds are the best way to invite fortune.
            </p>
          </div>

          <div className="hw-c-box mb-6">
            <h2 className="hw-c-secTitle">Other traditional festivals</h2>
            <div className="flex flex-wrap gap-2">
              {JIERI_EN.filter((j) => j.slug !== jr.slug).map((j) => (
                <Link
                  key={j.slug}
                  href={`/en/jieri/${j.slug}`}
                  className="bg-gold/5 hover:bg-gold/10 border border-gold/20 rounded-full px-4 py-1.5 text-sm text-ink transition-colors"
                >
                  {j.name}
                </Link>
              ))}
            </div>
          </div>

          <div className="hw-c-cta">
            <h2 className="hw-c-secTitle">See your own Bazi chart</h2>
            <p className="hw-c-dx">
              Enter your birth time to see your Four Pillars, favourable elements and current-year
              trends.
            </p>
            <Link href="/en/chart" className="hw-c-btnBig">
              Cast your chart free →
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
