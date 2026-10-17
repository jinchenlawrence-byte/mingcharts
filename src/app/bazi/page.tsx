import Link from 'next/link'
import Nav from '@/components/Nav'

export const metadata = {
  title: '八字算命 · 出生日期查询：1950-2010 每日八字命理分析',
  description: '按出生日期查询八字：选择出生年份，查看该年出生人的生辰八字、干支、生肖、纳音、命理分析与流年运势。1950-2010 年每日八字详解。',
}

export default function BaziIndex() {
  const decades = [
    { label: '1950年代', start: 1950 },
    { label: '1960年代', start: 1960 },
    { label: '1970年代', start: 1970 },
    { label: '1980年代', start: 1980 },
    { label: '1990年代', start: 1990 },
    { label: '2000年代', start: 2000 }
  ]

  return (
    <main className="hw-page">
      <Nav />
      <div className="hw-wrap hw-c-pg">
        <nav className="hw-c-back">
          <Link href="/">首页</Link>
          <span className="mx-2">›</span>
          <span>八字算命</span>
        </nav>

        <h1 className="hw-c-h1">八字算命 · 出生日期查询</h1>
        <p className="hw-lede">
          选择您的出生年份，查看该年出生的人的生辰八字、命理分析、生肖运势等信息。
        </p>

        <div className="hw-c-box mb-6">
          <h2 className="hw-c-secTitle">选择出生年代</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {decades.map(d => (
              <div key={d.start}>
                <h3 className="font-semibold text-ink/70 mb-2">{d.label}</h3>
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: 10 }, (_, i) => d.start + i).map(y => (
                    <Link
                      key={y}
                      href={`/bazi/${y}`}
                      className="bg-gold/5 hover:bg-gold/10 border border-gold/20 rounded px-3 py-1 text-sm text-ink transition-colors"
                    >
                      {y}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="hw-c-box bg-gold/5!">
          <h2 className="hw-c-secTitle">关于八字算命</h2>
          <p className="hw-c-body mb-3">
            八字算命，又称四柱命理，是中国传统命理学的核心。根据出生的年、月、日、时四个时间点，
            每个点对应一个天干和一个地支，共八个字，故称"八字"。通过分析八字的五行生克、十神配置、
            格局成败、调候用神等，可以推断一个人的性格、事业、财运、婚姻、健康等方面的趋势。
          </p>
          <p className="hw-c-body">
            本站基于《子平真诠》《滴天髓》《穷通宝鉴》等六本经典命理著作，
            结合现代编程技术，为您提供专业的八字排盘和命理分析服务。
          </p>
          <p className="mt-4">
            <Link href="/" className="hw-c-btnBig">
              输入精确出生时辰 → 获取完整八字排盘
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
