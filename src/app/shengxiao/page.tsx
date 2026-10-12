import Link from 'next/link'
import { SHENGXIAO } from '@/lib/shengxiaoData'

export const metadata = {
  title: '十二生肖运势大全：属相性格、财运、婚姻、配对、本命佛查询',
  description: '十二生肖命理详解：属鼠、属牛、属虎、属兔、属龙、属蛇、属马、属羊、属猴、属鸡、属狗、属猪的性格、事业、财运、婚姻、配对、本命佛、幸运颜色数字查询。'
}

export default function ShengXiaoIndex() {
  return (
    <main className="min-h-screen ">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <nav className="text-sm text-ink-light/60 mb-4">
          <Link href="/" className="hover:text-ink/70">首页</Link>
          <span className="mx-2">›</span>
          <span className="text-ink">十二生肖</span>
        </nav>

        <h1 className="text-3xl font-bold text-ink mb-2">十二生肖运势大全</h1>
        <p className="text-ink-light mb-8">
          点击您的属相，查看性格、事业、财运、婚姻、配对、本命佛、幸运颜色与数字，以及逐年流年运势。
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-10">
          {SHENGXIAO.map(sx => (
            <Link
              key={sx.slug}
              href={`/shengxiao/${sx.slug}`}
              className="paper-card rounded-lg hover:shadow-md transition-shadow p-5 text-center group"
            >
              <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center text-3xl font-bold text-ink group-hover:from-amber-200 group-hover:to-amber-300 transition-colors">
                {sx.name}
              </div>
              <div className="font-bold text-ink">属{sx.name}</div>
              <div className="text-xs text-ink-light/60 mt-1">{sx.zhi} · {sx.wuxing} · 本命佛{sx.benmingfo.replace('菩萨', '')}</div>
            </Link>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="paper-card rounded-lg p-6">
            <h2 className="text-xl font-bold text-ink mb-3">生肖是怎么来的？</h2>
            <p className="text-sm text-ink/70 leading-relaxed">
              十二生肖又称属相，是中国传统以十二地支配十二种动物的纪年方式：子鼠、丑牛、寅虎、卯兔、辰龙、巳蛇、午马、未羊、申猴、酉鸡、戌狗、亥猪。
              生肖以每年立春为界（非公历1月1日），决定一个人的属相。命理中通过生肖地支之间的六合、三合、相冲、相害、相刑关系，
              可推断婚配好坏与流年运势。
            </p>
          </div>
          <div className="paper-card rounded-lg p-6">
            <h2 className="text-xl font-bold text-ink mb-3">生肖与八字的关系</h2>
            <p className="text-sm text-ink/70 leading-relaxed mb-3">
              生肖只是八字中"年支"一个字，看性格运势以完整八字（年月日时四柱）更为准确。
              生肖运势适合作为通俗参考，而重大决策建议结合完整八字命盘综合分析。
            </p>
            <Link
              href="/"
              className="inline-block bg-amber-600 text-white px-5 py-2 rounded-md font-semibold text-sm hover:bg-amber-700 transition-colors"
            >
              输入时辰看完整八字 →
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
