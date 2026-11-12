import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  AGE_REF_YEAR,
  ROC_FROM,
  ROC_TO,
  rocNeighborhood,
  rocRange,
  rocRow,
  yearFromRoc,
} from '@/lib/ageData'
import { AgeTable } from '@/components/age/AgeTable'

export const revalidate = 86400

export function generateStaticParams() {
  return rocRange().map((roc) => ({ roc: String(roc) }))
}

function parseRoc(raw: string): number | null {
  if (!/^\d{1,3}$/.test(raw)) return null
  const n = Number(raw)
  return n >= ROC_FROM && n <= ROC_TO ? n : null
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ roc: string }>
}): Promise<Metadata> {
  const { roc: raw } = await params
  const roc = parseRoc(raw)
  if (roc == null) return { title: '民國年次未找到' }
  const r = rocRow(roc)
  const ageText = r.ageMin === r.ageMax ? `${r.ageMax}` : `${r.ageMin}–${r.ageMax}`
  return {
    title: `民國${roc}年次幾歲？${r.year}年出生，${AGE_REF_YEAR}年實歲${ageText}、虛歲${r.xu}`,
    description: `民國 ${roc} 年次等於西元 ${r.year} 年，生肖屬${r.name}。${AGE_REF_YEAR} 年實歲 ${ageText} 歲、虛歲 ${r.xu} 歲，附民國與西元換算公式及前後年次對照。`,
    alternates: { canonical: `/tw/age/${roc}` },
  }
}

export default async function HantRocYearPage({
  params,
}: {
  params: Promise<{ roc: string }>
}) {
  const { roc: raw } = await params
  const roc = parseRoc(raw)
  if (roc == null) notFound()

  const r = rocRow(roc)
  const year = yearFromRoc(roc)
  const ageText = r.ageMin === r.ageMax ? `${r.ageMax}` : `${r.ageMin}–${r.ageMax}`
  const neighborhood = rocNeighborhood(roc)
  const prev = roc > ROC_FROM ? roc - 1 : null
  const next = roc < ROC_TO ? roc + 1 : null

  const faqs = [
    {
      q: `民國${roc}年次是幾年出生？`,
      a: `民國 ${roc} 年次等於西元 ${year} 年。換算方式是民國年次加 1911：${roc} + 1911 = ${year}。`,
    },
    {
      q: `民國${roc}年次今年幾歲？`,
      a: `${AGE_REF_YEAR} 年時，民國 ${roc} 年次者的實歲為 ${ageText} 歲（生日已過取上限、未過取下限），虛歲為 ${r.xu} 歲。`,
    },
    {
      q: `民國${roc}年次虛歲幾歲？`,
      a: `虛歲算法是「今年 − 出生年 + 1」，也就是 ${AGE_REF_YEAR} − ${year} + 1 = ${r.xu} 歲。虛歲不看生日，出生當年即算 1 歲。`,
    },
    {
      q: `民國${roc}年次屬什麼生肖？`,
      a: `民國 ${roc} 年次（${year} 年）屬${r.name}。生肖以立春為界，若出生在當年立春之前（約 2 月 3 日至 5 日），則屬上一個生肖，需以實際出生日期為準。`,
    },
  ]

  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }

  return (
    <div className="hw-wrap hw-c-pg">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />

      <nav className="text-xs text-ink-light mb-3">
        <Link href="/tw" className="hover:text-ink">首頁</Link>
        <span className="mx-1">›</span>
        <Link href="/tw/age" className="hover:text-ink">民國年次年齡</Link>
        <span className="mx-1">›</span>
        <span>民國 {roc} 年次</span>
      </nav>

      <h1 className="hw-c-h1">民國 {roc} 年次（{year} 年出生）今年幾歲？</h1>
      <p className="hw-lede">
        民國 {roc} 年次就是西元 {year} 年出生，生肖屬{r.name}。以 {AGE_REF_YEAR} 年計算，實歲 {ageText} 歲、虛歲 {r.xu} 歲。以下把換算、歲數與同世代對照一次列出。
      </p>

      <div className="hw-c-box mb-6">
        <h2 className="hw-c-secTitle">民國 {roc} 年次答案卡</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="border border-gold/20 rounded-lg p-4 bg-gold/5">
            <div className="text-xs text-ink-light">西元</div>
            <div className="text-xl font-bold text-ink mt-1">{year} 年</div>
          </div>
          <div className="border border-gold/20 rounded-lg p-4 bg-gold/5">
            <div className="text-xs text-ink-light">{AGE_REF_YEAR} 年實歲</div>
            <div className="text-xl font-bold text-ink mt-1">{ageText} 歲</div>
          </div>
          <div className="border border-gold/20 rounded-lg p-4 bg-gold/5">
            <div className="text-xs text-ink-light">虛歲</div>
            <div className="text-xl font-bold text-ink mt-1">{r.xu} 歲</div>
          </div>
          <div className="border border-gold/20 rounded-lg p-4 bg-gold/5">
            <div className="text-xs text-ink-light">生肖</div>
            <div className="text-xl font-bold text-ink mt-1">屬{r.name}</div>
          </div>
        </div>
        <p className="hw-c-body mt-4">
          實歲為什麼是一個區間？因為換算只知道出生年份、不知道生日。若生日已過，實歲取上限 {r.ageMax} 歲；生日尚未到，則是 {r.ageMin} 歲。虛歲不看出生月日，固定為 {r.xu} 歲。
        </p>
      </div>

      <div className="hw-c-box mb-6">
        <h2 className="hw-c-secTitle">民國年次怎麼換算西元？</h2>
        <p className="hw-c-body">
          公式只有一條：西元 = 民國 + 1911。以本頁為例，{roc} + 1911 = {year}。反向換算時，西元 − 1911 = 民國年次，例如 {year} − 1911 = {roc}。
        </p>
        <p className="hw-c-body mt-3">
          要注意的是，民國年次對應的是「出生年份」，不是「現在民國幾年」。許多人會把兩者混在一起，結果算出的歲數差了一年。歲數請以本頁答案卡為準，或直接用下面的對照表。
        </p>
        <p className="hw-c-body mt-3">
          台灣的身分證、學籍、勞保年資與兵役資料，多半仍以民國紀年登記；香港、馬來西亞與海外華人則慣用西元。若您手上只有其中一種年份，用上面的公式就能互相換算，不需要再查表。
        </p>
      </div>

      <div className="hw-c-box mb-6">
        <h2 className="hw-c-secTitle">同世代年次對照（民國 {neighborhood[0]?.roc}–{neighborhood[neighborhood.length - 1]?.roc} 年次）</h2>
        <p className="hw-c-body mb-4">
          下表把前後五個年次並排，方便比較同學、同事或家人的歲數差距。目前查詢的年次以底色標出。
        </p>
        <AgeTable rows={neighborhood} highlightRoc={roc} />
      </div>

      <div className="hw-c-box mb-6">
        <h2 className="hw-c-secTitle">民國 {roc} 年次屬{r.name}：進一步看生肖與流年</h2>
        <p className="hw-c-body">
          年次只決定生肖，不決定命運。屬{r.name}者的性格、事業、財運與婚姻，還要用完整八字（年、月、日、時四柱）才看得準。若您只想先看生肖層面的說法，可以從下面兩個入口進去。
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
          <Link
            href={`/tw/shengxiao/${r.animal}/age`}
            className="block border border-gold/20 rounded-lg p-4 hover:bg-gold/5 transition"
          >
            <div className="font-bold text-ink">屬{r.name}今年幾歲？</div>
            <div className="text-xs text-ink-light mt-1">完整出生年份、實歲與虛歲對照表</div>
          </Link>
          <Link
            href={`/tw/shengxiao/${r.animal}/2026`}
            className="block border border-gold/20 rounded-lg p-4 hover:bg-gold/5 transition"
          >
            <div className="font-bold text-ink">2026 年屬{r.name}流年</div>
            <div className="text-xs text-ink-light mt-1">太歲關係、事業、財運、感情與健康</div>
          </Link>
        </div>
      </div>

      <div className="hw-c-box mb-6">
        <h2 className="hw-c-secTitle">常見問題</h2>
        <div className="space-y-4">
          {faqs.map((f) => (
            <div key={f.q}>
              <h3 className="font-semibold text-ink mb-1">{f.q}</h3>
              <p className="hw-c-body">{f.a}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-6 text-sm">
        {prev != null && (
          <Link href={`/tw/age/${prev}`} className="hw-c-link">
            ← 民國 {prev} 年次幾歲
          </Link>
        )}
        <Link href="/tw/age" className="hw-c-link mx-auto">
          回年次總表
        </Link>
        {next != null && (
          <Link href={`/tw/age/${next}`} className="hw-c-link">
            民國 {next} 年次幾歲 →
          </Link>
        )}
      </div>

      <div className="hw-c-cta">
        <h2 className="hw-c-secTitle">年次換算完，再看看自己的命盤</h2>
        <p className="hw-c-dx">
          同一年次的人，八字可能完全不同。輸入完整出生時辰，查看四柱、五行喜忌與未來流年。
        </p>
        <Link href="/tw" className="hw-c-btnBig">
          免費排盤 →
        </Link>
      </div>
    </div>
  )
}
