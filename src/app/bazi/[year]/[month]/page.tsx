import Link from 'next/link'
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
    <main className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <nav className="text-sm text-gray-500 mb-4">
          <Link href="/" className="hover:text-amber-700">首页</Link>
          <span className="mx-2">›</span>
          <Link href="/bazi" className="hover:text-amber-700">八字算命</Link>
          <span className="mx-2">›</span>
          <Link href={`/bazi/${year}`} className="hover:text-amber-700">{year}年</Link>
          <span className="mx-2">›</span>
          <span className="text-amber-900">{monthNum}月</span>
        </nav>

        <h1 className="text-3xl font-bold text-amber-900 mb-2">
          {year}年{monthNum}月出生的人命运如何？
        </h1>
        <p className="text-gray-600 mb-6">
          {year}年{ganZhi}年属{zodiac.name}，{monthNum}月出生。本月涵盖星座：{constellations.join('、')}。
        </p>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold text-amber-800 mb-4">选择出生日期</h2>
          <div className="grid grid-cols-5 sm:grid-cols-7 md:grid-cols-10 gap-2">
            {days.map(d => (
              <Link
                key={d}
                href={`/bazi/${year}/${month}/${String(d).padStart(2, '0')}`}
                className="bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded p-2 text-center transition-colors"
              >
                <div className="font-bold text-amber-800">{d}</div>
                <div className="text-xs text-gray-400">日</div>
              </Link>
            ))}
          </div>
        </div>

        <div className="bg-amber-50 rounded-lg p-4 text-sm text-gray-700">
          <p className="font-semibold text-amber-900 mb-2">{year}年{monthNum}月出生总览</p>
          <p>
            {year}年{monthNum}月出生的人，生肖属{zodiac.name}。农历{monthNum}月为{['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '冬', '腊'][monthNum - 1]}月，
            此月出生之人{monthNum >= 3 && monthNum <= 5 ? '正值春季，木气旺盛，性格仁慈有活力' : monthNum >= 6 && monthNum <= 8 ? '正值夏季，火气旺盛，性格热情开朗' : monthNum >= 9 && monthNum <= 11 ? '正值秋季，金气旺盛，性格刚毅果断' : '正值冬季，水气旺盛，性格聪明内敛'}。
          </p>
        </div>

        <div className="mt-8">
          <Link href={`/bazi/${year}`} className="text-amber-700 hover:text-amber-900">
            ← 返回{year}年
          </Link>
        </div>
      </div>
    </main>
  )
}
