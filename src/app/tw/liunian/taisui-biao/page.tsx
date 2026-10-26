import type { Metadata } from 'next'
import Link from 'next/link'
import TaisuiTable, { TaisuiLegend } from '@/components/TaisuiTable'
import { hantAlternates } from '@/lib/hant-seo'
import { toHant } from '@/lib/hant'
import { LIUNIAN_YEARS } from '@/lib/shengxiaoData'

// 繁體版（2026-10-23）：與 /liunian/taisui-biao 同源，表格由共用組件渲染，
// 關係詞一律 toHant 派生，不在這裡寫第二份繁體詞表。

export const metadata: Metadata = {
  title: toHant(`十二生肖太岁对照表：${LIUNIAN_YEARS[0]}–${LIUNIAN_YEARS[LIUNIAN_YEARS.length - 1]} 谁犯太岁一眼看完`),
  description: toHant(
    '十二生肖 × 2024–2031 流年太岁关系对照表：值太岁、冲太岁、害太岁、刑太岁、合太岁一次看完，每格可点进对应年份的详细运势。'
  ),
  alternates: {
    canonical: '/tw/liunian/taisui-biao',
    languages: hantAlternates('/liunian/taisui-biao'),
  },
}

export default function HantTaisuiTablePage() {
  const first = LIUNIAN_YEARS[0]
  const last = LIUNIAN_YEARS[LIUNIAN_YEARS.length - 1]
  return (
    <div className="hw-wrap hw-c-pg">
      <Link href="/tw/liunian" className="hw-c-back">‹ 年運報告</Link>

      <section className="hw-c-box mb-6 mt-2">
        <h1 className="hw-c-h1">十二生肖太歲對照表（{first}–{last}）</h1>
        <p className="hw-c-lede">
          同一行是同一個生肖，同一列是同一年。格子裡寫的是那一年它與太歲的關係：
          值太歲（本命年）、沖太歲、害太歲、刑太歲、合太歲，或與太歲無犯。
          每一格都能點進去看那一年的詳細運勢。
        </p>
        <TaisuiTable hant />
        <TaisuiLegend hant />
        <p className="text-xs text-ink-light/60 mt-3">
          今年那一列會高亮。查往年的對不上也可以點進去看 ——
          有人拿它驗證「應期」，這也是一種用法。
        </p>
        <p className="text-xs mt-2">
          <a href="/taisui-biao.png" download className="hw-c-link">
            下載圖片版（1200×1040，可自由引用，註明來源即可）↓
          </a>
        </p>
      </section>

      <section className="hw-c-box mb-6">
        <h2 className="hw-c-secTitle">這張表怎麼用</h2>
        <ul className="text-sm text-ink-light space-y-2">
          <li>• <strong className="text-ink">先看是不是犯太歲</strong>：值／沖／害／刑四種屬犯太歲，傳統上宜審慎；合太歲與無犯則相對平穩。</li>
          <li>• <strong className="text-ink">再看是哪一種</strong>：值太歲是本命年，沖太歲主變動，害太歲多口舌，刑太歲多糾纏 —— 四種應對方式不同。</li>
          <li>• <strong className="text-ink">最後別只看生肖</strong>：生肖只是年支一支，完整八字要看四柱、大運與流年三者的關係。</li>
        </ul>
        <p className="text-sm text-ink-light mt-3">
          想看自己這一年的完整情況：<Link href="/" className="hw-c-link">排一次盤 →</Link>
          <span className="text-xs text-ink-light/60 ml-2">排盤頁目前為簡體版</span>
        </p>
      </section>

      <p className="text-center text-xs text-ink-light/40">
        本表為傳統命理民俗內容，僅供參考娛樂，不構成任何決策建議。
      </p>
    </div>
  )
}
