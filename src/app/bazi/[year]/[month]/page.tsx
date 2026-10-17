import Link from 'next/link'
import Nav from '@/components/Nav'
import { getYearGanZhi, getZodiac, getConstellation } from '@/lib/baziData'

export function generateStaticParams() {
  const params: { year: string; month: string }[] = []
  for (let y = 1950; y <= 2010; y++) {
    for (let m = 1; m <= 12; m++) {
      params.push({ year: String(y), month: String(m).padStart(2, '0') })
    }
  }
  return params
}

export const revalidate = 86400

export async function generateMetadata({ params }: { params: Promise<{ year: string; month: string }> }) {
  const { year, month } = await params
  const yearNum = parseInt(year, 10)
  const ganZhi = getYearGanZhi(yearNum)
  const zodiac = getZodiac(ganZhi[1])
  return {
    title: `${year}年${month}月八字算命 · ${ganZhi}年属${zodiac}每日八字查询`,
    description: `${year}年${month}月每日八字查询：${ganZhi}年（属${zodiac}），按日查看生辰八字、干支十神、命理分析与生肖运势。`,
  }
}

export default async function MonthPage({ params }: { params: Promise<{ year: string; month: string }> }) {
  const { year, month } = await params
  const yearNum = parseInt(year, 10)
  const monthNum = parseInt(month, 10)

  const ganZhi = getYearGanZhi(yearNum)
  const zodiac = getZodiac(ganZhi[1])
  const daysInMonth = new Date(yearNum, monthNum, 0).getDate()

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  // 该月包含的星座
  const constellations: string[] = []
  for (let d = 1; d <= daysInMonth; d++) {
    const c = getConstellation(monthNum, d)
    if (!constellations.includes(c)) constellations.push(c)
  }

  return (
    <main className="hw-page">
      <Nav />
      <div className="hw-wrap hw-c-pg">
        <nav className="hw-c-back">
          <Link href="/">首页</Link>
          <span className="mx-2">›</span>
          <Link href="/bazi">八字算命</Link>
          <span className="mx-2">›</span>
          <Link href={`/bazi/${year}`}>{year}年</Link>
          <span className="mx-2">›</span>
          <span>{monthNum}月</span>
        </nav>

        <h1 className="hw-c-h1">
          {year}年{monthNum}月出生的人命运如何？
        </h1>
        <p className="hw-lede">
          {year}年{ganZhi}年属{zodiac.name}，{monthNum}月出生。本月涵盖星座：{constellations.join('、')}。
        </p>

        <div className="hw-c-box mb-6">
          <h2 className="hw-c-secTitle">选择出生日期</h2>
          <div className="grid grid-cols-5 sm:grid-cols-7 md:grid-cols-10 gap-2">
            {days.map(d => (
              <Link
                key={d}
                href={`/bazi/${year}/${month}/${String(d).padStart(2, '0')}`}
                className="bg-gold/5 hover:bg-gold/10 border border-gold/20 rounded p-2 text-center transition-colors"
              >
                <div className="font-bold text-ink">{d}</div>
                <div className="text-xs text-ink-light/40">日</div>
              </Link>
            ))}
          </div>
        </div>

        <div className="hw-c-box bg-gold/5! text-sm">
          <p className="font-semibold text-ink mb-2">{year}年{monthNum}月出生总览</p>
          <p className="text-ink/70">
            {year}年{monthNum}月出生的人，生肖属{zodiac.name}。农历{monthNum}月为{['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '冬', '腊'][monthNum - 1]}月，
            此月出生之人{monthNum >= 3 && monthNum <= 5 ? '正值春季，木气旺盛，性格仁慈有活力' : monthNum >= 6 && monthNum <= 8 ? '正值夏季，火气旺盛，性格热情开朗' : monthNum >= 9 && monthNum <= 11 ? '正值秋季，金气旺盛，性格刚毅果断' : '正值冬季，水气旺盛，性格聪明内敛'}。
          </p>
        </div>

        <div className="mt-8">
          <Link href={`/bazi/${year}`} className="hw-c-back">
            ← 返回{year}年
          </Link>
        </div>
      </div>
    </main>
  )
}
