import Link from 'next/link'
import { notFound } from 'next/navigation'
import { JIERI, getJieRi } from '@/lib/jieriData'
import { toHant } from '@/lib/hant'
import { hantAlternates } from '@/lib/hant-seo'
import type { Metadata } from 'next'

// 節日詳情（繁體）：與 /jieri/[slug] 同源，資料經 toHant 派生。
const H = (s: string) => toHant(s)

export function generateStaticParams() {
  return JIERI.map(j => ({ slug: j.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const jr = getJieRi(slug)
  if (!jr) return { title: H('節日未找到') }
  return {
    title: H(`${jr.name}（${jr.lunarDate}）：由來、習俗、禁忌與開運講究`),
    description: H(`${jr.name}又稱${jr.alias}，時間為${jr.lunarDate}（${jr.solarRange}）。詳解${jr.name}的由來、傳統習俗、注意事項與命理開運講究。`),
    alternates: { canonical: `/tw/jieri/${jr.slug}`, languages: hantAlternates(`/jieri/${jr.slug}`) },
  }
}

export default async function HantJieRiPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const jr = getJieRi(slug)
  if (!jr) notFound()

  return (
    <main className="hw-page">
      <div className="hw-wrap hw-c-pg">
        <div className="max-w-3xl mx-auto">
        <nav className="hw-c-back">
          <Link href="/tw">{H('首頁')}</Link>
          <span className="mx-2">›</span>
          <Link href="/tw/jieri">{H('傳統節日')}</Link>
          <span className="mx-2">›</span>
          <span>{H(jr.name)}</span>
        </nav>

        <div className="hw-c-box overflow-hidden mb-6 p-0!">
          <div className="bg-gradient-to-r from-red-600 to-amber-600 px-6 py-8 text-white">
            <div className="text-sm opacity-90 mb-2">
              {H(jr.lunarDate)} · {H(jr.solarRange)} · {H('別稱：')}{H(jr.alias)}
            </div>
            <h1 className="text-4xl font-bold mb-3">{H(jr.name)}</h1>
            <p className="leading-relaxed text-white/95">{H(jr.intro)}</p>
          </div>
        </div>

        <div className="hw-c-box mb-4">
          <h2 className="hw-c-secTitle">{H(jr.name)}{H('的傳統習俗')}</h2>
          <ul className="space-y-3">
            {jr.customs.map((c, i) => (
              <li key={i} className="flex gap-3 text-ink/70 leading-relaxed text-[15px]">
                <span className="text-amber-500 font-bold shrink-0">◆</span>
                <span>{H(c)}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="hw-c-box bg-gold/5! mb-4">
          <h2 className="hw-c-secTitle">🔮 {H(jr.name)}{H('的命理講究')}</h2>
          <p className="hw-c-body">{H(jr.bazi)}</p>
        </div>

        <div className="hw-c-box mb-6">
          <h2 className="hw-c-secTitle">🧧 {H(jr.name)}{H('開運建議')}</h2>
          <p className="hw-c-body">{H(jr.lucky)}</p>
          <p className="text-xs text-ink-light/40 mt-4">
            {H('民俗講究重在傳承文化、寄託美好願望，心存善念、行善積德才是最好的開運之道。')}
          </p>
        </div>

        <div className="hw-c-box mb-6">
          <h2 className="hw-c-secTitle">{H('其他傳統節日')}</h2>
          <div className="flex flex-wrap gap-2">
            {JIERI.filter(j => j.slug !== jr.slug).map(j => (
              <Link
                key={j.slug}
                href={`/tw/jieri/${j.slug}`}
                className="bg-gold/5 hover:bg-gold/10 border border-gold/20 rounded-full px-4 py-1.5 text-sm text-ink transition-colors"
              >
                {H(j.name)}
              </Link>
            ))}
          </div>
        </div>

        <div className="hw-c-cta">
          <h2 className="hw-c-secTitle">{H('看看自己的八字命理')}</h2>
          <p className="hw-c-dx">
            {H('輸入出生時辰，了解您的四柱八字、五行喜忌與流年運勢')}
          </p>
          <Link href="/tw" className="hw-c-btnBig">
            {H('免費排盤 →')}
          </Link>
        </div>
        </div>
      </div>
    </main>
  )
}
