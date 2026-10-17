import Link from 'next/link'
import Nav from '@/components/Nav'
import { JIEQI, SEASONS } from '@/lib/jieqiData'

export const metadata = {
  title: '二十四节气详解：节气与八字命理、月令更替、节气养生',
  description: '二十四节气完整介绍：立春、惊蛰、清明等24节气的含义、三候物候、传统习俗、节气养生，以及节气与八字月令、生肖分界（立春换年）的命理关系。'
}

const SEASON_STYLE = {
  '春': 'border-green-200 bg-green-50/50',
  '夏': 'border-red-200 bg-red-50/40',
  '秋': 'border-gold/20 bg-gold/5/50',
  '冬': 'border-blue-200 bg-blue-50/40'
} as const

const SEASON_NAME_STYLE = {
  '春': 'text-green-700',
  '夏': 'text-red-700',
  '秋': 'text-ink/70',
  '冬': 'text-blue-700'
} as const

export default function JieQiIndex() {
  return (
    <main className="hw-page">
      <Nav />
      <div className="hw-wrap hw-c-pg">
        <nav className="hw-c-back">
          <Link href="/">首页</Link>
          <span className="mx-2">›</span>
          <span>二十四节气</span>
        </nav>

        <h1 className="hw-c-h1">二十四节气与命理养生</h1>
        <p className="hw-lede">
          点击任一节气，查看其含义、三候物候、传统习俗、养生方法，以及与八字月令更替、调候用神的关系。
        </p>

        {/* 命理提示卡 */}
        <div className="bg-gold/10/60 border border-amber-300 rounded-lg p-5 mb-10">
          <h2 className="font-bold text-ink mb-2">📌 节气与八字的关系（命理必知）</h2>
          <p className="text-sm text-ink/70 leading-relaxed">
            八字的<strong>月柱按"节气"划分，而非农历初一</strong>。二十四节气中，12个"节"（立春、惊蛰、清明、立夏、芒种、小暑、立秋、白露、寒露、立冬、大雪、小寒）是月令更替的节点；12个"中气"不换月。
            更重要的是，<strong>生肖以立春为界</strong>——公历1月1日至立春前出生的人，生肖和年柱仍属上一年。
          </p>
        </div>

        {/* 四季分组 */}
        <div className="space-y-8">
          {SEASONS.map(s => {
            const list = JIEQI.filter(j => j.season === s.key)
            return (
              <section key={s.key}>
                <div className="flex items-baseline gap-3 mb-4">
                  <h2 className={`text-2xl font-bold ${SEASON_NAME_STYLE[s.key]}`}>{s.label}</h2>
                  <span className="text-sm text-ink-light/60">{s.desc}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                  {list.map(j => (
                    <Link
                      key={j.slug}
                      href={`/jieqi/${j.slug}`}
                      className={`border rounded-lg p-3 text-center hover:shadow-md transition-shadow ${SEASON_STYLE[s.key]}`}
                    >
                      <div className="font-bold text-ink">{j.name}</div>
                      <div className="text-xs text-ink-light/60 mt-1">{j.dateRange.replace('公历', '')}</div>
                      {j.type === '节' ? (
                        <div className="text-xs text-amber-600 mt-1 font-medium">换月 · {j.monthZhi}月</div>
                      ) : (
                        <div className="text-xs text-ink-light/40 mt-1">中气</div>
                      )}
                    </Link>
                  ))}
                </div>
              </section>
            )
          })}
        </div>

        {/* 传统节日入口 */}
        <div className="hw-c-box mt-10">
          <h2 className="hw-c-secTitle">传统节日与开运</h2>
          <p className="text-sm text-ink-light mb-4">
            除二十四节气外，春节、元宵、清明、端午、中秋、重阳等传统节日也各有命理讲究与开运习俗。
          </p>
          <div className="flex flex-wrap gap-2">
            {['春节', '元宵节', '端午节', '七夕', '中秋节', '重阳节', '腊八节', '除夕'].map(f => (
              <Link
                key={f}
                href="/jieri"
                className="bg-gold/5 hover:bg-gold/10 border border-gold/20 rounded-full px-4 py-1.5 text-sm text-ink transition-colors"
              >
                {f}
              </Link>
            ))}
            <Link href="/jieri" className="hw-c-link text-sm self-center ml-1">
              查看全部 →
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
