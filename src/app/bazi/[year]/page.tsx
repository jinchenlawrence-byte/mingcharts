import Link from 'next/link'
import { getYearGanZhi, getZodiac, getNaYin } from '@/lib/baziData'

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
  const ganZhi = getYearGanZhi(yearNum)
  const zodiac = getZodiac(ganZhi[1])
  return {
    title: `${year}年${ganZhi}年：属${zodiac}人八字算命 · ${year}年出生命理分析`,
    description: `${year}年（${ganZhi}年，属${zodiac}）出生人的八字命理分析：流年干支、生肖运势、纳音、性格财运婚姻详解。选择月份查看每日八字。`,
  }
}

export default async function YearPage({ params }: { params: Promise<{ year: string }> }) {
  const { year } = await params
  const yearNum = parseInt(year, 10)
  const ganZhi = getYearGanZhi(yearNum)
  const zodiac = getZodiac(ganZhi[1])
  const naYin = getNaYin(ganZhi)

  const months = Array.from({ length: 12 }, (_, i) => i + 1)

  return (
    <main className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <nav className="text-sm text-gray-500 mb-4">
          <Link href="/" className="hover:text-amber-700">首页</Link>
          <span className="mx-2">›</span>
          <Link href="/bazi" className="hover:text-amber-700">八字算命</Link>
          <span className="mx-2">›</span>
          <span className="text-amber-900">{year}年</span>
        </nav>

        <h1 className="text-3xl font-bold text-amber-900 mb-2">
          {year}年出生的人命运如何？
        </h1>
        <p className="text-gray-600 mb-6">
          {year}年为{ganZhi}年，生肖属{zodiac.name}，纳音{naYin}。本命佛：{zodiac.benmingfo}。
        </p>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold text-amber-800 mb-4">选择出生月份</h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {months.map(m => (
              <Link
                key={m}
                href={`/bazi/${year}/${String(m).padStart(2, '0')}`}
                className="bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg p-4 text-center transition-colors"
              >
                <div className="text-2xl font-bold text-amber-800">{m}</div>
                <div className="text-xs text-gray-500 mt-1">月</div>
              </Link>
            ))}
          </div>
        </div>

        <div className="bg-amber-50 rounded-lg p-4 text-sm text-gray-700">
          <p className="font-semibold text-amber-900 mb-2">{year}年属{zodiac.name}人总览</p>
          <p>
            {year}年出生的人生肖属{zodiac.name}，五行属{zodiac.element}，纳音为{naYin}。
            本命佛为{zodiac.benmingfo}，常佩戴或供奉可保平安。
            属{zodiac.name}的人性格{zodiac.element === '金' ? '刚毅果断，重义气' : zodiac.element === '木' ? '仁慈宽厚，有上进心' : zodiac.element === '水' ? '聪明机灵，善于应变' : zodiac.element === '火' ? '热情奔放，光明磊落' : '忠厚稳重，值得信赖'}。
          </p>
        </div>

        <div className="mt-8">
          <Link href="/" className="text-amber-700 hover:text-amber-900">
            ← 返回首页，输入精确出生时辰查看详细八字排盘
          </Link>
        </div>
      </div>
    </main>
  )
}
