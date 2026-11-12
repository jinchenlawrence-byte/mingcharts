import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { SHENGXIAO, getShengXiao } from '@/lib/shengxiaoData'
import { toHant } from '@/lib/hant'
import {
  AGE_REF_YEAR,
  ageRangeText,
  animalAgeRange,
  neighborAnimals,
  zodiacAgeRows,
} from '@/lib/ageData'
import { AgeTable } from '@/components/age/AgeTable'

export const revalidate = 86400

export function generateStaticParams() {
  return SHENGXIAO.map((s) => ({ animal: s.slug }))
}

function firstSentence(text: string, max = 90): string {
  const cut = text.split('。')[0] ?? text
  return cut.length > max ? `${cut.slice(0, max)}…` : `${cut}。`
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ animal: string }>
}): Promise<Metadata> {
  const { animal } = await params
  const sx = getShengXiao(animal)
  if (!sx) return { title: '生肖未找到' }
  const name = toHant(sx.name)
  const range = animalAgeRange(animal)
  return {
    title: `屬${name}今年幾歲？${AGE_REF_YEAR} 年${name}年齡對照（虛歲／實歲、民國年次）`,
    description: `${AGE_REF_YEAR} 年屬${name}者實歲約 ${range.min}–${range.max} 歲、虛歲 ${range.xuMin}–${range.xuMax} 歲。附 1928–2024 出生年份、民國年次對照，以及生肖按立春或農曆初一分界的說明。`,
    alternates: { canonical: `/tw/shengxiao/${sx.slug}/age` },
    openGraph: {
      title: `屬${name}今年幾歲？${AGE_REF_YEAR} 年齡對照表`,
      description: `屬${name}的出生年份、實歲、虛歲與民國年次一次查清。`,
    },
  }
}

export default async function HantZodiacAgePage({
  params,
}: {
  params: Promise<{ animal: string }>
}) {
  const { animal } = await params
  const sx = getShengXiao(animal)
  if (!sx) notFound()

  const name = toHant(sx.name)
  const rows = zodiacAgeRows(sx.slug)
  const range = animalAgeRange(sx.slug)
  const recent = rows.slice(-3).reverse()
  const neighbors = neighborAnimals(sx.slug)
  const prevSx = getShengXiao(neighbors.prev)
  const nextSx = getShengXiao(neighbors.next)
  const liunianYears = [2026, 2027, 2028]

  const faqs = [
    {
      q: `屬${name}今年幾歲？`,
      a: `${AGE_REF_YEAR} 年屬${name}者的實歲約為 ${range.min}–${range.max} 歲，虛歲為 ${range.xuMin}–${range.xuMax} 歲。實際歲數取決於出生年份，以及今年生日是否已過：生日已過取上限，生日未過取下限。`,
    },
    {
      q: `屬${name}的虛歲怎麼算？`,
      a: `虛歲的算法是「今年年份 − 出生年份 + 1」。例如 ${recent[0]?.year ?? 2012} 年出生，${AGE_REF_YEAR} 年的虛歲就是 ${recent[0]?.xu ?? 15} 歲；實歲則要再看生日是否已過。`,
    },
    {
      q: `屬${name}的出生年份有哪些？`,
      a: `屬${name}的出生年份每 12 年一輪，本頁列出 ${rows[0]?.year ?? 1928} 至 ${rows[rows.length - 1]?.year ?? 2024} 年共 ${rows.length} 個年份。若您的出生年份不在表內，往前或往後加減 12 年即可。`,
    },
    {
      q: `生肖是按立春還是農曆初一算？`,
      a: `命理排盤採立春分界，民俗習慣則常用農曆正月初一。兩者最多相差幾天到半個月，因此 1 月至 2 月上旬出生的人，兩種算法可能得到不同生肖。本頁採立春口徑；若您習慣農曆年，請以出生當年的正月初一為界。`,
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
        <Link href="/tw/shengxiao" className="hover:text-ink">十二生肖</Link>
        <span className="mx-1">›</span>
        <Link href={`/tw/shengxiao/${sx.slug}`} className="hover:text-ink">屬{name}</Link>
        <span className="mx-1">›</span>
        <span>年齡對照</span>
      </nav>

      <h1 className="hw-c-h1">屬{name}今年幾歲？{AGE_REF_YEAR} 年虛歲與實歲對照</h1>
      <p className="hw-lede">
        以 {AGE_REF_YEAR} 年計算，屬{name}者分布在 {range.min} 至 {range.max} 歲之間。這一頁把出生年份、實歲、虛歲與民國年次排成同一張表，方便您直接對號入座，不必自己換算。
      </p>

      <div className="hw-c-box mb-6" data-section="zodiac-age-answer">
        <h2 className="hw-c-secTitle">{AGE_REF_YEAR} 年屬{name}幾歲？</h2>
        <p className="hw-c-body">
          屬{name}者的實歲落在 <strong className="text-ink">{range.min}–{range.max} 歲</strong>，虛歲為{' '}
          <strong className="text-ink">{range.xuMin}–{range.xuMax} 歲</strong>。區間來自兩個變數：出生年份，以及今年生日是否已過。
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
          {recent.map((r) => (
            <div key={r.year} className="border border-gold/20 rounded-lg p-4 bg-gold/5">
              <div className="text-xs text-ink-light">{r.year} 年（民國 {r.roc} 年）</div>
              <div className="text-2xl font-bold text-ink mt-1">
                {ageRangeText(r)} <span className="text-sm font-normal">歲</span>
              </div>
              <div className="text-xs text-ink-light mt-1">虛歲 {r.xu} 歲</div>
            </div>
          ))}
        </div>
        <p className="text-xs text-ink-light mt-3">
          上面三張卡是最接近現在的三輪出生年；完整 {rows.length} 輪請見下方表格。
        </p>
      </div>

      <div className="hw-c-box mb-6" data-section="zodiac-age-table">
        <h2 className="hw-c-secTitle">屬{name}出生年份與年齡對照表</h2>
        <p className="hw-c-body mb-4">
          表內年份以立春為界，每 12 年一輪。出生年份可點進對應的民國年次頁，查看該年次的完整換算與生肖。
        </p>
        <AgeTable rows={rows} />
        <p className="text-xs text-ink-light mt-3">
          註：實歲欄位寫成「48–49」表示生日未過為 48 歲、生日已過為 49 歲；虛歲一律比實歲上限多 1。
        </p>
      </div>

      <div className="hw-c-box mb-6" data-section="zodiac-boundary">
        <h2 className="hw-c-secTitle">生肖的分界：立春，不是元旦</h2>
        <p className="hw-c-body">
          生肖的界線不是國曆 1 月 1 日，也不是農曆正月初一，而是二十四節氣中的立春。立春每年大約落在 2 月 3 日至 5 日，因此 1 月到 2 月上旬出生的人，常會遇到「身分證年份」與「生肖年份」差一年的情況。
        </p>
        <p className="hw-c-body mt-3">
          本頁採命理排盤慣用的立春口徑；台灣民間也有以農曆正月初一換生肖的習慣，兩種算法最多相差半個月。若您要拿這張表去對八字盤，請以立春為準；若只是家族裡討論歲數，用農曆年通常也能對上。
        </p>
      </div>

      <div className="hw-c-box mb-6" data-section="zodiac-age-persona">
        <h2 className="hw-c-secTitle">屬{name}這個年齡層的處境</h2>
        <p className="hw-c-body">
          {toHant(firstSentence(sx.personality, 100))}
        </p>
        <p className="hw-c-body mt-3">
          {toHant(firstSentence(sx.career, 100))}
        </p>
        <p className="text-xs text-ink-light mt-3">
          以上為生肖層面的通性，實際仍要看完整八字。相同生肖、不同出生年份，年柱與月柱都不同，際遇差異很大。
        </p>
      </div>

      <div className="hw-c-box mb-6" data-section="zodiac-age-liunian">
        <h2 className="hw-c-secTitle">屬{name}近三年流年</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {liunianYears.map((y) => (
            <Link
              key={y}
              href={`/tw/shengxiao/${sx.slug}/${y}`}
              className="block border border-gold/20 rounded-lg p-4 hover:bg-gold/5 transition"
            >
              <div className="text-lg font-bold text-ink">{y} 年</div>
              <div className="text-xs text-ink-light mt-1">屬{name}流年運勢與注意事項</div>
            </Link>
          ))}
        </div>
      </div>

      <div className="hw-c-box mb-6" data-section="zodiac-age-faq">
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

      <div className="hw-c-box mb-6" data-section="zodiac-age-siblings">
        <h2 className="hw-c-secTitle">其他生肖的年齡對照</h2>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-sm">
          {SHENGXIAO.map((other) => (
            <Link
              key={other.slug}
              href={`/tw/shengxiao/${other.slug}/age`}
              className={`text-center border rounded py-2 transition hover:bg-gold/5 ${
                other.slug === sx.slug ? 'border-gold/40 bg-gold/10 font-semibold' : 'border-gold/15'
              }`}
            >
              屬{toHant(other.name)}
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap gap-3 mt-4 text-sm">
          {prevSx && (
            <Link href={`/tw/shengxiao/${prevSx.slug}/age`} className="hw-c-link">
              ← 屬{toHant(prevSx.name)}今年幾歲
            </Link>
          )}
          {nextSx && (
            <Link href={`/tw/shengxiao/${nextSx.slug}/age`} className="hw-c-link ml-auto">
              屬{toHant(nextSx.name)}今年幾歲 →
            </Link>
          )}
        </div>
      </div>

      <div className="hw-c-cta">
        <h2 className="hw-c-secTitle">年齡只是年支，八字要看四柱</h2>
        <p className="hw-c-dx">
          同一個生肖、同一年出生，月柱與日柱仍可能完全不同。想知道自己的五行喜忌與流年走向，請用完整出生時辰排盤。
        </p>
        <Link href="/tw" className="hw-c-btnBig">
          免費排盤 →
        </Link>
      </div>
    </div>
  )
}
