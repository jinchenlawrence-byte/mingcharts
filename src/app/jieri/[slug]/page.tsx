import Link from 'next/link'
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
    <main className="min-h-screen ">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <nav className="text-sm text-ink-light/60 mb-4">
          <Link href="/" className="hover:text-ink/70">首页</Link>
          <span className="mx-2">›</span>
          <Link href="/jieri" className="hover:text-ink/70">传统节日</Link>
          <span className="mx-2">›</span>
          <span className="text-ink">{jr.name}</span>
        </nav>

        {/* 头部 */}
        <div className="paper-card rounded-lg overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-red-600 to-amber-600 px-6 py-8 text-white">
            <div className="text-sm opacity-90 mb-2">
              {jr.lunarDate} · {jr.solarRange} · 别称：{jr.alias}
            </div>
            <h1 className="text-4xl font-bold mb-3">{jr.name}</h1>
            <p className="leading-relaxed text-white/95">{jr.intro}</p>
          </div>
        </div>

        {/* 传统习俗 */}
        <div className="paper-card rounded-lg p-6 mb-4">
          <h2 className="text-xl font-bold text-ink mb-4">{jr.name}的传统习俗</h2>
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
        <div className="bg-gold/5 border border-gold/20 rounded-lg shadow p-6 mb-4">
          <h2 className="text-xl font-bold text-ink mb-3">🔮 {jr.name}的命理讲究</h2>
          <p className="text-ink/70 leading-loose text-[15px]">{jr.bazi}</p>
        </div>

        {/* 开运建议 */}
        <div className="paper-card rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-ink mb-3">🧧 {jr.name}开运建议</h2>
          <p className="text-ink/70 leading-loose text-[15px]">{jr.lucky}</p>
          <p className="text-xs text-ink-light/40 mt-4">
            民俗讲究重在传承文化、寄托美好愿望，心存善念、行善积德才是最好的开运之道。
          </p>
        </div>

        {/* 其他节日导航 */}
        <div className="paper-card rounded-lg p-6 mb-6">
          <h2 className="text-lg font-bold text-ink mb-3">其他传统节日</h2>
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
        <div className="bg-gradient-to-r from-amber-500 to-amber-600 rounded-lg shadow-lg p-6 text-white text-center">
          <h2 className="text-xl font-bold mb-2">看看自己的八字命理</h2>
          <p className="text-amber-100 text-sm mb-4">
            输入出生时辰，了解您的四柱八字、五行喜忌与流年运势
          </p>
          <Link
            href="/"
            className="inline-block bg-white text-ink/70 px-8 py-2.5 rounded-md font-bold hover:bg-gold/5 transition-colors"
          >
            免费排盘 →
          </Link>
        </div>
      </div>
    </main>
  )
}
