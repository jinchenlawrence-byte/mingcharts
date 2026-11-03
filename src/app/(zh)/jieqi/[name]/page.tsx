import Link from 'next/link'
import Nav from '@/components/Nav'
import { notFound } from 'next/navigation'
import { JIEQI, getJieqi } from '@/lib/jieqiData'

export function generateStaticParams() {
  return JIEQI.map(j => ({ name: j.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params
  const jq = getJieqi(name)
  if (!jq) return { title: '节气未找到' }
  return {
    title: `${jq.name}节气（${jq.dateRange}）：含义、三候、习俗、养生与八字月令`,
    description: `${jq.name}是二十四节气之一（${jq.dateRange}）。详解${jq.name}的含义由来、三候物候、传统习俗、节气养生方法，以及${jq.type === '节' ? `${jq.name}换${jq.monthName}、` : ''}与八字命理调候的关系。`,
    keywords: [jq.name, `${jq.name}节气`, `${jq.name}养生`, `${jq.name}习俗`, `${jq.name}八字`, `${jq.name}几月几日`, `${jq.name}三候`]
  }
}

const SEASON_ACCENT = {
  '春': { bg: 'bg-green-600', light: 'bg-green-50 border-green-200 text-green-700' },
  '夏': { bg: 'bg-red-600', light: 'bg-red-50 border-red-200 text-red-700' },
  '秋': { bg: 'bg-amber-600', light: 'bg-gold/5 border-gold/20 text-ink/70' },
  '冬': { bg: 'bg-blue-600', light: 'bg-blue-50 border-blue-200 text-blue-700' }
} as const

export default async function JieQiPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params
  const jq = getJieqi(name)
  if (!jq) notFound()

  const idx = JIEQI.findIndex(j => j.slug === jq.slug)
  const prev = idx > 0 ? JIEQI[idx - 1] : null
  const next = idx < JIEQI.length - 1 ? JIEQI[idx + 1] : null
  const accent = SEASON_ACCENT[jq.season]

  return (
    <main className="hw-page">
      <Nav />
      <div className="hw-wrap hw-c-pg">
        <div className="max-w-3xl mx-auto">
        <nav className="hw-c-back">
          <Link href="/">首页</Link>
          <span className="mx-2">›</span>
          <Link href="/jieqi">二十四节气</Link>
          <span className="mx-2">›</span>
          <span>{jq.name}</span>
        </nav>

        {/* 头部 */}
        <div className="hw-c-box overflow-hidden mb-6 p-0!">
          <div className={`${accent.bg} px-6 py-8 text-white`}>
            <div className="flex items-center gap-3 mb-2 text-sm opacity-90">
              <span>{jq.dateRange}</span>
              <span>·</span>
              <span>{jq.season}季</span>
              <span>·</span>
              <span>{jq.type === '节' ? '节（月令更替）' : '中气'}</span>
            </div>
            <h1 className="text-4xl font-bold mb-3">{jq.name}</h1>
            <p className="leading-relaxed text-white/95">{jq.meaning}</p>
          </div>

          {jq.type === '节' && jq.monthName && (
            <div className="px-6 py-3 bg-gold/5 border-b border-amber-100 text-sm text-ink">
              <strong>命理提醒：</strong>{jq.name}起进入{jq.monthName}，此后出生者月柱为{jq.monthZhi}月。
            </div>
          )}
        </div>

        {/* 三候 */}
        <div className="hw-c-box mb-4">
          <h2 className="hw-c-secTitle">{jq.name}三候</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {jq.hou.map((h, i) => (
              <div key={i} className={`border rounded-lg p-4 text-center ${accent.light}`}>
                <div className="text-xs mb-2 opacity-70">第{i + 1}候</div>
                <div className="font-semibold">{h.replace(/^[一二三]候/, '')}</div>
                <div className="text-xs mt-1 opacity-70">{h.match(/^[一二三]候/)?.[0]}</div>
              </div>
            ))}
          </div>
          <p className="text-xs text-ink-light/40 mt-3">
            "候"是古人以五日为一候观察到的物候现象，三候共十五日，构成一个节气。
          </p>
        </div>

        {/* 习俗 */}
        <Block title="传统习俗">
          <p className="hw-c-body">{jq.custom}</p>
        </Block>

        {/* 养生 */}
        <Block title="节气养生">
          <p className="hw-c-body">{jq.yangsheng}</p>
        </Block>

        {/* 命理 */}
        <div className="hw-c-box bg-gold/5! mb-6">
          <h2 className="hw-c-secTitle">🔮 {jq.name}与八字命理</h2>
          <p className="hw-c-body">{jq.bazi}</p>
          <div className="mt-4 p-4 bg-white rounded-lg">
            <p className="text-sm text-ink-light leading-relaxed">
              想知道自己是否出生在{jq.name}前后、月令与调候用神是什么？
              <Link href="/" className="hw-c-link">输入出生时辰免费排盘 →</Link>
            </p>
          </div>
        </div>

        {/* 上一/下一节气 */}
        <div className="flex justify-between mb-8 text-sm">
          {prev ? (
            <Link href={`/jieqi/${prev.slug}`} className="hw-c-back">
              ← {prev.name}
            </Link>
          ) : <span />}
          {next ? (
            <Link href={`/jieqi/${next.slug}`} className="hw-c-back">
              {next.name} →
            </Link>
          ) : <span />}
        </div>
        </div>
      </div>
    </main>
  )
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="hw-c-box mb-4">
      <h2 className="hw-c-secTitle">{title}</h2>
      {children}
    </div>
  )
}
