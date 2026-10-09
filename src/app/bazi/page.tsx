import Link from 'next/link'

export const metadata = {
  title: '八字算命 · 出生日期查询：1950-2010 每日八字命理分析',
  description: '按出生日期查询八字：选择出生年份，查看该年出生人的生辰八字、干支、生肖、纳音、命理分析与流年运势。1950-2010 年每日八字详解。',
}

export default function BaziIndex() {
  const years = Array.from({ length: 11 }, (_, i) => 2000 + i) // 2000-2010
  const decades = [
    { label: '1950年代', start: 1950 },
    { label: '1960年代', start: 1960 },
    { label: '1970年代', start: 1970 },
    { label: '1980年代', start: 1980 },
    { label: '1990年代', start: 1990 },
    { label: '2000年代', start: 2000 }
  ]

  return (
    <main className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <nav className="text-sm text-gray-500 mb-4">
          <Link href="/" className="hover:text-amber-700">首页</Link>
          <span className="mx-2">›</span>
          <span className="text-amber-900">八字算命</span>
        </nav>

        <h1 className="text-3xl font-bold text-amber-900 mb-2">八字算命 · 出生日期查询</h1>
        <p className="text-gray-600 mb-8">
          选择您的出生年份，查看该年出生的人的生辰八字、命理分析、生肖运势等信息。
        </p>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold text-amber-800 mb-4">选择出生年代</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {decades.map(d => (
              <div key={d.start}>
                <h3 className="font-semibold text-amber-700 mb-2">{d.label}</h3>
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: 10 }, (_, i) => d.start + i).map(y => (
                    <Link
                      key={y}
                      href={`/bazi/${y}`}
                      className="bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded px-3 py-1 text-sm text-amber-800 transition-colors"
                    >
                      {y}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-amber-50 rounded-lg p-6">
          <h2 className="text-xl font-bold text-amber-800 mb-3">关于八字算命</h2>
          <p className="text-sm text-gray-700 leading-relaxed mb-3">
            八字算命，又称四柱命理，是中国传统命理学的核心。根据出生的年、月、日、时四个时间点，
            每个点对应一个天干和一个地支，共八个字，故称"八字"。通过分析八字的五行生克、十神配置、
            格局成败、调候用神等，可以推断一个人的性格、事业、财运、婚姻、健康等方面的趋势。
          </p>
          <p className="text-sm text-gray-700 leading-relaxed">
            本站基于《子平真诠》《滴天髓》《穷通宝鉴》等六本经典命理著作，
            结合现代编程技术，为您提供专业的八字排盘和命理分析服务。
          </p>
          <div className="mt-4">
            <Link
              href="/"
              className="inline-block bg-amber-600 text-white px-6 py-2 rounded-md font-semibold hover:bg-amber-700 transition-colors"
            >
              输入精确出生时辰 → 获取完整八字排盘
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
