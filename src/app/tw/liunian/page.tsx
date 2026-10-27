import type { Metadata } from 'next'
import Link from 'next/link'
import { hantAlternates } from '@/lib/hant-seo'
import { SKUS, formatPriceUSD } from '@/lib/pricing'

// 繁體年運報告入口頁（2026-10-23 第 33 輪）
//
// 為什麼要有它：/tw/shengxiao/* 與 /tw/article/* 一直在拿點擊，但繁體側沒有年運報告的落點，
// 流年頁那句「或直接生成 {year} 年年運報告（$…）」只能是純文字，點不動。
// 本頁只做「能轉化的入口」，【不複製】簡體頁的表單與結果視圖 ——
// 理由：表單搬過來但結果頁仍是簡體，會造出半成品；真正的繁體排盤另開一輪。
//
// 價格一律從 SKUS 取，禁止寫死（與站內其它頁同一事實源）。

export const metadata: Metadata = {
  title: '年運報告 · 流年詳批（繁體）',
  description:
    '個人年運報告：以完整八字（四柱、大運、流年）推算，覆蓋今年、明年、後年三年，各含流月節奏。逐條註明所引經典，由命理師解讀。',
  alternates: {
    canonical: '/tw/liunian',
    languages: hantAlternates('/liunian'),
  },
}

export default function HantLiunianEntry() {
  const price = formatPriceUSD(SKUS.annual_report.priceUSD)
  return (
    <div className="hw-wrap hw-c-pg">
      <Link href="/tw" className="hw-c-back">‹ 回首頁</Link>

      <section className="hw-c-box mb-6 mt-2">
        <h1 className="hw-c-h1">年運報告 · 流年詳批</h1>
        <p className="hw-c-lede">
          生肖運勢是十二分之一的共性參考。年運報告以完整八字（四柱、大運、流年）推算，
          覆蓋今年、明年、後年三年，各含流月節奏，逐條註明所引經典。
        </p>

        <ul className="text-sm text-ink-light space-y-2 mt-4">
          <li>• 三年一次算清：今年／明年／後年，不用每年重買</li>
          <li>• 每一年含四個維度（事業、財運、感情、健康）與流月節奏</li>
          <li>• 斷語逐條標註典籍出處，由命理師解讀</li>
        </ul>

        <div className="flex flex-wrap items-center gap-3 mt-5">
          <Link href="/" className="hw-c-btnBig">前往排盤 →</Link>
          <span className="text-sm text-ink-light/70">{price}/次 · 解鎖後永久回看</span>
        </div>
        <p className="text-xs text-ink-light/60 mt-2">
          排盤頁目前為簡體版；命盤與報告內容與本頁所述一致。
        </p>
        {/* ★ 2027 窗口期入口（第 35 轮）：年度总览页 + 太岁对照表，构成"看今年"的两条主路径
            第 36 轮补 2028：GSC 实测 2028 生肖页已在拿点击，缺 hub 收口 */}
        <p className="text-sm mt-4">
          <Link href="/tw/liunian/2027" className="hw-c-link">2027 丁未年運勢總覽 →</Link>
          <span className="text-ink-light/40 mx-2">·</span>
          <Link href="/tw/liunian/2028" className="hw-c-link">2028 戊申年運勢總覽 →</Link>
          <span className="text-ink-light/40 mx-2">·</span>
          <Link href="/tw/liunian/taisui-biao" className="hw-c-link">十二生肖太歲對照表 →</Link>
        </p>
      </section>

      <section className="hw-c-box mb-6">
        <h2 className="hw-c-secTitle">為什麼要看成完整八字</h2>
        <p className="text-sm text-ink-light leading-relaxed">
          同一個生肖，十二種性格被壓成一種，這是共性參考。流年是對「這一個命盤」說的：
          日主強弱、用神喜忌、大運走到哪一步，決定了同一年的吉凶落在不同人身上並不一樣。
          完整的四柱與大運，才看得出這一年對你意味著什麼。
        </p>
      </section>

      <p className="text-center text-xs text-ink-light/40 mt-6">
        本文為傳統命理民俗內容，僅供參考娛樂，不構成任何決策建議。
      </p>
    </div>
  )
}
