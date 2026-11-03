import type { Metadata } from 'next'
import Link from 'next/link'
import Nav from '@/components/Nav'
import TaisuiTable, { TaisuiLegend } from '@/components/TaisuiTable'
import { hantAlternates } from '@/lib/hant-seo'
import { LIUNIAN_YEARS } from '@/lib/shengxiaoData'

// 十二生肖 × 流年太岁关系对照表（2026-10-23）
// 定位：可被引用的资产页 —— 写流年文章的人需要「一页看完 12 个生肖谁犯太岁」。

export const metadata: Metadata = {
  title: `十二生肖太岁对照表：${LIUNIAN_YEARS[0]}–${LIUNIAN_YEARS[LIUNIAN_YEARS.length - 1]} 谁犯太岁一眼看完`,
  description:
    '十二生肖 × 2024–2031 流年太岁关系对照表：值太岁、冲太岁、害太岁、刑太岁、合太岁一次看完，每格可点进对应年份的详细运势。',
  alternates: {
    canonical: '/liunian/taisui-biao',
    languages: hantAlternates('/liunian/taisui-biao'),
  },
}

export default function TaisuiTablePage() {
  const first = LIUNIAN_YEARS[0]
  const last = LIUNIAN_YEARS[LIUNIAN_YEARS.length - 1]
  return (
    <main className="hw-page">
      <Nav />
      <div className="hw-wrap hw-c-pg">
        <Link href="/liunian" className="hw-c-back">‹ 年运报告</Link>

        <section className="hw-c-box mb-6 mt-2">
          <h1 className="hw-c-h1">十二生肖太岁对照表（{first}–{last}）</h1>
          <p className="hw-c-lede">
            同一行是同一个生肖，同一列是同一年。格子里写的是那一年它与太岁的关系：
            值太岁（本命年）、冲太岁、害太岁、刑太岁、合太岁，或与太岁无犯。
            每一格都能点进去看那一年的详细运势。
          </p>
          <TaisuiTable hant={false} />
          <TaisuiLegend hant={false} />
          <p className="text-xs text-ink-light/60 mt-3">
            今年那一列会高亮。查往年的对不上也可以点进去看 ——
            有人拿它验证「应期」，这也是一种用法。
          </p>
          <p className="text-xs mt-2">
            <a href="/taisui-biao.png" download className="hw-c-link">
              下载图片版（1200×1040，可自由引用，注明来源即可）↓
            </a>
          </p>
        </section>

        <section className="hw-c-box mb-6">
          <h2 className="hw-c-secTitle">这张表怎么用</h2>
          <ul className="text-sm text-ink-light space-y-2">
            <li>• <strong className="text-ink">先看是不是犯太岁</strong>：值／冲／害／刑四种属犯太岁，传统上宜审慎；合太岁与无犯则相对平稳。</li>
            <li>• <strong className="text-ink">再看是哪一种</strong>：值太岁是本命年，冲太岁主变动，害太岁多口舌，刑太岁多纠缠 —— 四种应对方式不同。</li>
            <li>• <strong className="text-ink">最后别只看生肖</strong>：生肖只是年支一支，完整八字要看四柱、大运与流年三者的关系。</li>
          </ul>
          <p className="text-sm text-ink-light mt-3">
            想看自己这一年的完整情况：<Link href="/" className="hw-c-link">排一次盘 →</Link>
          </p>
          <p className="text-sm text-ink-light mt-2">
            只看 2027 丁未年：<Link href="/liunian/2027" className="hw-c-link">2027 年运势总览（谁犯太岁、各是什么关系）→</Link>
          </p>
        </section>

        <p className="text-center text-xs text-ink-light/40">
          本表为传统命理民俗内容，仅供参考娱乐，不构成任何决策建议。
        </p>
      </div>
    </main>
  )
}
