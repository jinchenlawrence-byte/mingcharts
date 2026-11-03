import Link from 'next/link'
import Nav from '@/components/Nav'
import { notFound } from 'next/navigation'
import { JIERI, getJieRi } from '@/lib/jieriData'

export function generateStaticParams() {
  return JIERI.map(j => ({ slug: j.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const jr = getJieRi(slug)
  if (!jr) return { title: '节日未找到' }
  return {
    title: `${jr.name}（${jr.lunarDate}）：由来、习俗、禁忌与开运讲究`,
    description: `${jr.name}又称${jr.alias}，时间为${jr.lunarDate}（${jr.solarRange}）。详解${jr.name}的由来、传统习俗、注意事项与命理开运讲究。`,
    keywords: [jr.name, `${jr.name}习俗`, `${jr.name}的由来`, `${jr.name}几月几号`, `${jr.name}禁忌`, jr.alias]
  }
}

export default async function JieRiPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const jr = getJieRi(slug)
  if (!jr) notFound()

  return (
    <main className="hw-page">
      <Nav />
      <div className="hw-wrap hw-c-pg">
        <div className="max-w-3xl mx-auto">
        <nav className="hw-c-back">
          <Link href="/">首页</Link>
          <span className="mx-2">›</span>
          <Link href="/jieri">传统节日</Link>
          <span className="mx-2">›</span>
          <span>{jr.name}</span>
        </nav>

        {/* 头部 */}
        <div className="hw-c-box overflow-hidden mb-6 p-0!">
          <div className="bg-gradient-to-r from-red-600 to-amber-600 px-6 py-8 text-white">
            <div className="text-sm opacity-90 mb-2">
              {jr.lunarDate} · {jr.solarRange} · 别称：{jr.alias}
            </div>
            <h1 className="text-4xl font-bold mb-3">{jr.name}</h1>
            <p className="leading-relaxed text-white/95">{jr.intro}</p>
          </div>
        </div>

        {/* 传统习俗 */}
        <div className="hw-c-box mb-4">
          <h2 className="hw-c-secTitle">{jr.name}的传统习俗</h2>
          <ul className="space-y-3">
            {jr.customs.map((c, i) => (
              <li key={i} className="flex gap-3 text-ink/70 leading-relaxed text-[15px]">
                <span className="text-amber-500 font-bold shrink-0">◆</span>
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* 命理讲究 */}
        <div className="hw-c-box bg-gold/5! mb-4">
          <h2 className="hw-c-secTitle">🔮 {jr.name}的命理讲究</h2>
          <p className="hw-c-body">{jr.bazi}</p>
        </div>

        {/* 开运建议 */}
        <div className="hw-c-box mb-6">
          <h2 className="hw-c-secTitle">🧧 {jr.name}开运建议</h2>
          <p className="hw-c-body">{jr.lucky}</p>
          <p className="text-xs text-ink-light/40 mt-4">
            民俗讲究重在传承文化、寄托美好愿望，心存善念、行善积德才是最好的开运之道。
          </p>
        </div>

        {/* 其他节日导航 */}
        <div className="hw-c-box mb-6">
          <h2 className="hw-c-secTitle">其他传统节日</h2>
          <div className="flex flex-wrap gap-2">
            {JIERI.filter(j => j.slug !== jr.slug).map(j => (
              <Link
                key={j.slug}
                href={`/jieri/${j.slug}`}
                className="bg-gold/5 hover:bg-gold/10 border border-gold/20 rounded-full px-4 py-1.5 text-sm text-ink transition-colors"
              >
                {j.name}
              </Link>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="hw-c-cta">
          <h2 className="hw-c-secTitle">看看自己的八字命理</h2>
          <p className="hw-c-dx">
            输入出生时辰，了解您的四柱八字、五行喜忌与流年运势
          </p>
          <Link href="/" className="hw-c-btnBig">
            免费排盘 →
          </Link>
        </div>
        </div>
      </div>
    </main>
  )
}
