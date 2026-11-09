import Link from 'next/link'
import Nav from '@/components/Nav'
import { getYearPageData } from '@/lib/yearPageData'

export function generateStaticParams() {
  const years: { year: string }[] = []
  for (let y = 1950; y <= 2010; y++) {
    years.push({ year: String(y) })
  }
  return years
}

export const revalidate = 86400 // 1天

export async function generateMetadata({ params }: { params: Promise<{ year: string }> }) {
  const { year } = await params
  const yearNum = parseInt(year, 10)
  const d = getYearPageData(yearNum)
  return {
    title: `${year}年${d.ganZhi}年：属${d.zodiacName}人八字算命 · ${year}年出生命理分析`,
    description: `${year}年（${d.ganZhi}年，属${d.zodiacName}）出生人的八字命理分析：年柱纳音、${year}年二十四节气与月令、各月出生查询、生肖性格与常见问答。`,
    alternates: { canonical: `/bazi/${year}` },
  }
}

export default async function YearPage({ params }: { params: Promise<{ year: string }> }) {
  const { year } = await params
  const yearNum = parseInt(year, 10)
  const d = getYearPageData(yearNum)

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: d.faqs.map(f => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }

  return (
    <main className="hw-page">
      <Nav />
      <script
        type="application/ld+json"
        // 静态派生自程序计算结果，不含用户输入
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <div className="hw-wrap hw-c-pg">
        <nav className="hw-c-back">
          <Link href="/">首页</Link>
          <span className="mx-2">›</span>
          <Link href="/bazi">八字算命</Link>
          <span className="mx-2">›</span>
          <span>{year}年</span>
        </nav>

        <h1 className="hw-c-h1">
          {year}年出生的人命运如何？
        </h1>
        <p className="hw-lede">
          {d.summary}
        </p>

        <div className="hw-c-box mb-6">
          <h2 className="hw-c-secTitle">{year}年年柱与五行</h2>
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3 text-sm">
            <div>
              <dt className="text-ink-light">年柱干支</dt>
              <dd className="font-semibold text-ink">{d.ganZhi}</dd>
            </div>
            <div>
              <dt className="text-ink-light">天干</dt>
              <dd className="font-semibold text-ink">{d.gan}（{d.ganElement}）</dd>
            </div>
            <div>
              <dt className="text-ink-light">地支</dt>
              <dd className="font-semibold text-ink">{d.zhi}（{d.zhiElement}）</dd>
            </div>
            <div>
              <dt className="text-ink-light">生肖</dt>
              <dd className="font-semibold text-ink">{d.zodiacName}</dd>
            </div>
            <div>
              <dt className="text-ink-light">纳音</dt>
              <dd className="font-semibold text-ink">{d.naYin}（{d.naYinElement}）</dd>
            </div>
            <div>
              <dt className="text-ink-light">公历年度</dt>
              <dd className="font-semibold text-ink">{year}年全年 {d.daysInYear} 天</dd>
            </div>
            <div>
              <dt className="text-ink-light">元旦</dt>
              <dd className="font-semibold text-ink">星期{d.jan1Weekday}</dd>
            </div>
            <div>
              <dt className="text-ink-light">闰年</dt>
              <dd className="font-semibold text-ink">{d.isLeapYear ? '是（2 月 29 天）' : '否（2 月 28 天）'}</dd>
            </div>
            <div>
              <dt className="text-ink-light">立春</dt>
              <dd className="font-semibold text-ink">{d.lichun.dateLabel}</dd>
            </div>
          </dl>
          <p className="text-sm text-ink/70 mt-4">
            {d.ganTrait}
          </p>
          <p className="text-sm text-ink/70 mt-2">
            {d.zhiTrait}
          </p>
          <p className="text-sm text-ink/70 mt-2">
            {d.relationTrait}
          </p>
        </div>

        <div className="hw-c-box mb-6">
          <h2 className="hw-c-secTitle">{year}年二十四节气与月令</h2>
          <p className="text-sm text-ink/70 mb-4">
            下表按公历 {year} 年列出 24 个节气的交节日期（程序按天文历计算，非固定日期），
            其中 12 个“节”是月令的换月节点。立春（{d.lichun.dateLabel}）为年柱与生肖的分界：
            立春前出生按 {d.prevGanZhi} 年计，立春后按 {d.ganZhi} 年计。
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gold/20 text-ink-light">
                  <th className="text-left py-2 pr-3 font-medium">节气</th>
                  <th className="text-left py-2 pr-3 font-medium">公历日期</th>
                  <th className="text-left py-2 pr-3 font-medium">类型</th>
                  <th className="text-left py-2 font-medium">月令</th>
                </tr>
              </thead>
              <tbody>
                {d.jieqi.map(j => (
                  <tr key={j.name} className="border-b border-gold/10">
                    <td className="py-2 pr-3 text-ink">{j.name}</td>
                    <td className="py-2 pr-3 text-ink/80">{j.dateLabel}</td>
                    <td className="py-2 pr-3 text-ink/80">{j.type}</td>
                    <td className="py-2 text-ink/80">
                      {j.monthZhi ? `${j.monthZhi}月（${j.monthName}）` : '不换月令（中气）'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="hw-c-box mb-6">
          <h2 className="hw-c-secTitle">{year}年出生者的年柱共性</h2>
          <p className="text-sm text-ink/70">
            {d.naYinTrait}
          </p>
          <p className="text-sm text-ink/70 mt-3">
            关于 {year} 年年柱，以上仅为传统取象；同一年出生的人，月、日、时三柱各不相同，八字组合千差万别，年柱不能单独决定性格或运势，本站不作吉凶预测，具体分析需以完整四柱为准。
          </p>
          <p className="text-sm text-ink/70 mt-3">
            {year} 年的 {d.ganZhi} 年柱每隔 60 年循环一次。
            {d.sameGanZhiYears.length > 0
              ? `本归档区间（1950–2010）内，${d.sameGanZhiYears.join('、')} 年同为 ${d.ganZhi} 年，年柱与纳音相同，但节气日期、元旦星期与农历月序并不相同。`
              : `本归档区间（1950–2010）内，只有 ${year} 年对应 ${d.ganZhi} 年柱。`}
          </p>
        </div>

        <div className="hw-c-box mb-6">
          <h2 className="hw-c-secTitle">{year}年各月出生查询（含节气分界）</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {d.months.map(m => (
              <Link
                key={m.month}
                href={m.href}
                className="block bg-gold/5 hover:bg-gold/10 border border-gold/20 rounded-lg p-4 transition-colors"
              >
                <div className="font-semibold text-ink mb-1">
                  {year}年{m.month}月出生查询 →
                </div>
                <p className="text-xs text-ink/70 leading-relaxed">
                  {m.description}
                </p>
              </Link>
            ))}
          </div>
        </div>

        <div className="hw-c-box mb-6">
          <h2 className="hw-c-secTitle">关于{year}年的常见问题</h2>
          <div className="space-y-4">
            {d.faqs.map((f, i) => (
              <div key={i}>
                <h3 className="font-semibold text-ink text-sm mb-1">{f.q}</h3>
                <p className="text-sm text-ink/70">{f.a}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="hw-c-box bg-gold/5! text-sm">
          <p className="font-semibold text-ink mb-2">{year}年属{d.zodiacName}人总览</p>
          <p className="text-ink/70">
            {year}年出生的人生肖属{d.zodiacName}，五行属{d.zhiElement}，纳音为{d.naYin}。
            本命佛为{d.benmingfo}，常佩戴或供奉可保平安。
            属{d.zodiacName}的人性格{d.zhiElement === '金' ? '刚毅果断，重义气' : d.zhiElement === '木' ? '仁慈宽厚，有上进心' : d.zhiElement === '水' ? '聪明机灵，善于应变' : d.zhiElement === '火' ? '热情奔放，光明磊落' : '忠厚稳重，值得信赖'}。
          </p>
        </div>

        <nav className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3 text-sm">
          <Link href="/bazi" className="hw-c-back">
            ← 返回八字算命索引（1950–2010 年）
          </Link>
          {yearNum > 1950 && (
            <Link href={`/bazi/${yearNum - 1}`} className="text-ink/70 hover:text-ink">
              ← {yearNum - 1}年
            </Link>
          )}
          {yearNum < 2010 && (
            <Link href={`/bazi/${yearNum + 1}`} className="text-ink/70 hover:text-ink">
              {yearNum + 1}年 →
            </Link>
          )}
          <Link href="/" className="hw-c-back">
            输入精确出生时辰查看详细八字排盘 →
          </Link>
        </nav>
      </div>
    </main>
  )
}
