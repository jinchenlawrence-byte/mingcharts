import Link from 'next/link'
import { JIERI } from '@/lib/jieriData'

export const metadata = {
  title: '中国传统节日大全：春节、元宵、端午、七夕、中秋、除夕的习俗与开运',
  description: '中国传统节日完整介绍：春节、元宵节、清明节、端午节、七夕节、中元节、中秋节、重阳节、腊八节、小年、除夕的日期、由来、习俗禁忌与命理开运讲究。'
}

export default function JieRiIndex() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <nav className="text-sm text-gray-500 mb-4">
          <Link href="/" className="hover:text-amber-700">首页</Link>
          <span className="mx-2">›</span>
          <span className="text-amber-900">传统节日</span>
        </nav>

        <h1 className="text-3xl font-bold text-amber-900 mb-2">中国传统节日与开运习俗</h1>
        <p className="text-gray-600 mb-8">
          点击节日名称，查看其日期、由来、传统习俗、禁忌讲究与命理开运建议。
        </p>

        {/* 重要提醒 */}
        <div className="bg-amber-100/60 border border-amber-300 rounded-lg p-5 mb-8">
          <p className="text-sm text-gray-700 leading-relaxed">
            <strong className="text-amber-900">📌 命理提醒：</strong>
            春节（正月初一）<strong>不是生肖的分界线</strong>，生肖和八字年柱以每年的
            <Link href="/jieqi/lichun" className="text-amber-700 font-semibold underline">立春</Link>
            节气为准。很多人排盘时搞错了这一点，导致年柱和生肖算错。
          </p>
        </div>

        <div className="space-y-4">
          {JIERI.map(j => (
            <Link
              key={j.slug}
              href={`/jieri/${j.slug}`}
              className="bg-white rounded-lg shadow p-5 hover:shadow-md transition-shadow block"
            >
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 className="text-lg font-bold text-amber-900">{j.name}</h2>
                <span className="text-xs text-gray-500">{j.lunarDate} · {j.alias}</span>
              </div>
              <p className="text-sm text-gray-600 mt-2 leading-relaxed">{j.intro}</p>
            </Link>
          ))}
        </div>

        <div className="bg-white rounded-lg shadow p-6 mt-8 text-center">
          <h2 className="text-lg font-bold text-amber-800 mb-2">节气与节日有什么区别？</h2>
          <p className="text-sm text-gray-600 mb-4 leading-relaxed">
            二十四节气依据太阳黄经划分，属阳历，日期在公历中相对固定，是八字排定月柱的依据；
            传统节日依据农历（阴阳合历），日期在公历中每年浮动。
            清明节既是节气又是传统节日，较为特殊。
          </p>
          <Link href="/jieqi" className="text-amber-700 font-semibold hover:underline">
            查看二十四节气详解 →
          </Link>
        </div>
      </div>
    </main>
  )
}
