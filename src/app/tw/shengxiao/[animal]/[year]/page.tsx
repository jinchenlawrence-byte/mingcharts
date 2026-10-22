import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { SHENGXIAO, getShengXiao, getLiunian, LIUNIAN_YEARS, LIUNIAN_2027_DETAIL } from '@/lib/shengxiaoData'
import { hantAlternates } from '@/lib/hant-seo'
import { toHant, hantTaiSui } from '@/lib/hant'
import { pickBySlug, LIUNIAN_ARTICLE_SLUGS } from '@/lib/relatedArticles'
import { SKUS, formatPriceUSD } from '@/lib/pricing'

// 繁体流年页（/tw/shengxiao/<属相>/<年>，96 页）
//
// 与简体页的关系：内容同源（shengxiaoData 的 LiunianAnalysis），正文一律过 toHant；
// 页面结构按繁体读者习惯重写标签，不复用简体 JSX —— 简体页是当前 SEO 主力，
// 不为翻译去动它的渲染（改一处坏一片的地方不碰）。
//
// ★ 干支全部经 toHant 保护：转换器不会把「甲子」改成别的字（lib/hant 有占位保护）。

export function generateStaticParams() {
  const params: { animal: string; year: string }[] = []
  for (const sx of SHENGXIAO) {
    for (const y of LIUNIAN_YEARS) {
      params.push({ animal: sx.slug, year: String(y) })
    }
  }
  return params
}

const TONE_WORD: Record<string, string> = { '吉': '吉運年', '凶': '謹慎年', '动': '變動年', '平': '平穩年' }
const TONE_BADGE: Record<string, string> = {
  '吉': 'bg-green-100 text-green-700',
  '凶': 'bg-red-100 text-red-700',
  '动': 'bg-orange-100 text-orange-700',
  '平': 'bg-paper-dark/40 text-ink-light',
}

export async function generateMetadata({ params }: { params: Promise<{ animal: string; year: string }> }): Promise<Metadata> {
  const { animal, year } = await params
  const sx = getShengXiao(animal)
  if (!sx) return { title: '頁面未找到' }
  const ln = getLiunian(sx, Number(year))
  const name = toHant(sx.name)
  const taiSuiWord = { '值': '本命年值太歲', '冲': '沖太歲', '害': '害太歲', '刑': '刑太歲', '合': '合太歲', '平': '運勢' }[ln.relation]
  return {
    title: `${year}年屬${name}運勢詳解：${taiSuiWord}，事業財運感情健康全解`,
    description: `${year}${ln.ganZhi}年屬${name}人運勢如何？${toHant(ln.relationText)}詳解屬${name}${year}年事業、財運、感情婚姻、健康注意事項與開運化解建議。`,
    alternates: {
      canonical: `/tw/shengxiao/${sx.slug}/${year}`,
      languages: hantAlternates(`/shengxiao/${sx.slug}/${year}`),
    },
  }
}

export default async function HantShengXiaoLiunian({ params }: { params: Promise<{ animal: string; year: string }> }) {
  const { animal, year } = await params
  const yearNum = Number(year)
  const sx = getShengXiao(animal)
  if (!sx || !LIUNIAN_YEARS.includes(yearNum)) notFound()

  const ln = getLiunian(sx, yearNum)
  const name = toHant(sx.name)
  const idx = LIUNIAN_YEARS.indexOf(yearNum)
  const prevYear = LIUNIAN_YEARS[idx - 1]
  const nextYear = LIUNIAN_YEARS[idx + 1]
  const isFanTaiSui = ['值', '冲', '害', '刑'].includes(ln.relation)
  const detail = yearNum === 2027 ? LIUNIAN_2027_DETAIL[sx.slug] : undefined
  const relatedReading = pickBySlug([...LIUNIAN_ARTICLE_SLUGS])

  return (
    <div className="hw-wrap hw-c-pg">
      <div className="hw-narrow">
        <nav className="hw-c-back">
          <Link href="/tw">首頁</Link>
          <span className="mx-2">›</span>
          <Link href="/tw/shengxiao">十二生肖</Link>
          <span className="mx-2">›</span>
          <Link href={`/tw/shengxiao/${sx.slug}`}>屬{name}</Link>
          <span className="mx-2">›</span>
          <span>{year}年運勢</span>
        </nav>

        <div className="hw-c-box mb-6">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
            <h1 className="text-2xl md:text-3xl font-bold text-ink">{year}年屬{name}運勢詳解</h1>
            <span className={`text-sm px-3 py-1 rounded-full font-semibold ${TONE_BADGE[ln.tone]}`}>
              {TONE_WORD[ln.tone]} · {hantTaiSui(ln.relation)}太歲
            </span>
          </div>
          <p className="text-ink-light leading-relaxed">{toHant(ln.relationText)}</p>
          {isFanTaiSui && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
              {year}年屬{name}
              {ln.relation === '值' ? '正值本命年（值太歲）' : `${hantTaiSui(ln.relation)}太歲`}，
              民俗認為犯太歲之年宜安太歲、拜太歲、多行善事，重大決策宜審慎。
              犯太歲不等於必有災禍，心存敬畏、積極應對即可。
            </div>
          )}
        </div>

        <Section title="全年總運" body={toHant(ln.overview)} />
        <Section title="事業運勢" body={toHant(ln.career)} />
        <Section title="財運運勢" body={toHant(ln.wealth)} />
        <Section title="感情婚姻" body={toHant(ln.relationship)} />
        <Section title="健康運勢" body={toHant(ln.health)} />

        {detail && (
          <div className="hw-c-box mb-4">
            <h2 className="hw-c-secTitle">2027 丁未年 · 屬{name}的具體落點</h2>
            <p className="hw-c-body mb-3">{toHant(detail.focus)}</p>
            <p className="hw-c-body">{toHant(detail.action)}</p>
          </div>
        )}

        <div className="hw-c-box mb-6">
          <h2 className="hw-c-secTitle">{year}年開運建議</h2>
          <p className="hw-c-body">{toHant(ln.advice)}</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4 text-sm">
            <Lucky label="幸運顏色" value={toHant(sx.luckyColor.split('、')[0])} />
            <Lucky label="幸運數字" value={sx.luckyNumber} />
            <Lucky label="本命佛" value={sx.benmingfo} />
          </div>
        </div>

        <div className="hw-c-box mb-6">
          <h2 className="hw-c-secTitle">{year}年屬{name}常見問題</h2>
          <div className="space-y-4 text-sm">
            <div>
              <h3 className="font-semibold text-gray-800 mb-1">{year}年屬{name}犯太歲嗎？</h3>
              <p className="text-ink-light leading-relaxed">
                {isFanTaiSui
                  ? `${year}${ln.ganZhi}年，屬${name}為${hantTaiSui(ln.relation)}太歲，屬於犯太歲的一種。犯太歲主變動、波動，建議年初拜太歲、全年謹慎行事，多行善積德，平穩度過。`
                  : `${year}${ln.ganZhi}年，屬${name}與太歲無刑沖${ln.relation === '合' ? '，且為合太歲，是得貴人相助的年份' : '害關係，整體運勢平穩'}，不屬於犯太歲。`}
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 mb-1">{year}年屬{name}財運怎麼樣？</h3>
              <p className="text-ink-light leading-relaxed">{toHant(ln.wealth)}</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 mb-1">屬{name}{year}年適合結婚／轉職／創業嗎？</h3>
              <p className="text-ink-light leading-relaxed">
                {ln.tone === '吉'
                  ? '合太歲之年整體順利、貴人相助，是適合推進婚戀、合作與事業布局的年份，可順勢而為、把握機遇。'
                  : ln.tone === '动'
                    ? '沖太歲之年變動本身多，重大決定（結婚、轉職、創業）需充分準備、深思熟慮，主動規劃的「變」優於被動的「變」。'
                    : `這一年整體${ln.tone === '凶' ? '宜守不宜攻' : '平穩'}，重大決定建議結合個人完整八字與實際情況理性判斷，不宜僅因生肖運勢衝動決策。`}
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-between mb-6">
          {prevYear ? (
            <Link href={`/tw/shengxiao/${sx.slug}/${prevYear}`} className="hw-c-back">← {prevYear}年屬{name}運勢</Link>
          ) : <span />}
          {nextYear ? (
            <Link href={`/tw/shengxiao/${sx.slug}/${nextYear}`} className="hw-c-back">{nextYear}年屬{name}運勢 →</Link>
          ) : <span />}
        </div>

        <div className="hw-c-box mb-6">
          <h2 className="hw-c-secTitle">延伸閱讀</h2>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href={`/tw/shengxiao/${sx.slug}`} className="hw-c-link">
                • 屬{name}的性格、事業、財運、婚姻與配對表
              </Link>
            </li>
            <li>
              <Link href="/tw/shengxiao" className="hw-c-link">
                • 十二生肖流年運勢總覽（2024–2031）
              </Link>
            </li>
            {/* 流年方法论与犯太岁专题：给 96 个流年页一条通向文章库的路 */}
            {relatedReading.map((a) => (
              <li key={a.slug}>
                <Link href={`/tw/article/${a.slug}`} className="hw-c-link">• {toHant(a.title)}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="hw-c-cta">
          <h2 className="hw-c-secTitle">想看更準確的{year}年個人運勢？</h2>
          <p className="hw-c-dx">
            生肖運勢是十二分之一的共性參考；結合完整八字（四柱、大運、流年）分析的個人運勢才精準。
          </p>
          <Link href="/bazi" className="hw-c-btnBig">輸入時辰，排我的八字 →</Link>
          <p className="mt-4 text-sm text-ink-light/70">
            或直接生成 {year} 年年運報告（{formatPriceUSD(SKUS.annual_report.priceUSD)}，一次覆蓋今年／明年／後年三年，各含流月節奏）
          </p>
        </div>

        <p className="text-center text-xs text-ink-light/40 mt-6">
          本文為傳統命理民俗內容，僅供參考娛樂，不構成任何決策建議。
        </p>
      </div>
    </div>
  )
}

function Section({ title, body }: { title: string; body: string }) {
  return (
    <div className="hw-c-box mb-4">
      <h2 className="hw-c-secTitle">{title}</h2>
      <p className="hw-c-body">{body}</p>
    </div>
  )
}

function Lucky({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gold/5 rounded p-3 text-center">
      <div className="text-xs text-ink-light/60">{label}</div>
      <div className="font-semibold text-ink mt-1">{value}</div>
    </div>
  )
}
