import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { SHENGXIAO, getShengXiao, getPeiDui } from '@/lib/shengxiaoData'
import { hantAlternates } from '@/lib/hant-seo'
import { toHant } from '@/lib/hant'
import { articles } from '@/lib/articles'
import { pickBySlug, SHENGXIAO_ARTICLE_SLUGS } from '@/lib/relatedArticles'

export function generateStaticParams() {
  return SHENGXIAO.map((s) => ({ animal: s.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ animal: string }> }): Promise<Metadata> {
  const { animal } = await params
  const sx = getShengXiao(animal)
  if (!sx) return { title: '生肖未找到' }
  const name = toHant(sx.name)
  return {
    title: `屬${name}的命運詳解：${sx.years.slice(-4).join('、')}年屬${name}人性格財運婚姻運勢`,
    description: `屬${name}（地支${sx.zhi}、五行屬${toHant(sx.wuxing)}）人命理解析：性格特點、事業財運、婚姻配對、健康養生、本命佛${sx.benmingfo}、幸運數字顏色，以及 2024-2031 流年運勢。`,
    alternates: {
      canonical: `/tw/shengxiao/${sx.slug}`,
      languages: hantAlternates(`/shengxiao/${sx.slug}`),
    },
  }
}

const ZHI_WX_CLASS: Record<string, string> = {
  '子': 'water', '亥': 'water',
  '寅': 'wood', '卯': 'wood',
  '巳': 'fire', '午': 'fire',
  '申': 'metal', '酉': 'metal',
  '辰': 'earth', '戌': 'earth', '丑': 'earth', '未': 'earth',
}

export default async function HantShengXiaoDetail({ params }: { params: Promise<{ animal: string }> }) {
  const { animal } = await params
  const sx = getShengXiao(animal)
  if (!sx) notFound()
  const name = toHant(sx.name)
  const relatedReading = pickBySlug([...SHENGXIAO_ARTICLE_SLUGS])

  return (
    <div className="hw-wrap hw-c-pg">
      <nav className="hw-c-back">
        <Link href="/tw">首頁</Link>
        <span className="mx-2">›</span>
        <Link href="/tw/shengxiao">十二生肖</Link>
        <span className="mx-2">›</span>
        <span>屬{name}</span>
      </nav>

      <div className="hw-c-box mb-6">
        <div className="flex items-center gap-5 mb-4">
          <div className={`hw-zx w-20! h-20! text-4xl! hw-${ZHI_WX_CLASS[sx.zhi] ?? 'earth'}`}>
            {name}
          </div>
          <div>
            <h1 className="hw-c-h1">屬{name}人命運詳解</h1>
            <p className="hw-c-meta">
              地支{sx.zhi} · 五行屬{toHant(sx.wuxing)} · 本命佛{sx.benmingfo}
            </p>
            <p className="text-ink-light/40 text-xs mt-1">
              出生年份（以立春為界）：{sx.years.join('、')}年
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
          <Relation label="六合貴人" value={`屬${toHant(sx.liuHe)}`} tone="good" />
          <Relation label="三合" value={`屬${toHant(sx.sanHe[0])}、${toHant(sx.sanHe[1])}`} tone="good" />
          <Relation label="六沖" value={`屬${toHant(sx.liuChong)}`} tone="bad" />
          <Relation label="六害" value={`屬${toHant(sx.liuHai)}`} tone="bad" />
          <Relation label="相刑" value={sx.sanXing.map((x) => `屬${toHant(x)}`).join('、')} tone="warn" />
        </div>
      </div>

      <Section title="性格特點" body={toHant(sx.personality)} />
      <Section title="事業運" body={toHant(sx.career)} />
      <Section title="財運" body={toHant(sx.wealth)} />
      <Section title="婚姻感情" body={toHant(sx.marriage)} />
      <Section title="健康養生" body={toHant(sx.health)} />

      <div className="hw-c-box mb-6">
        <h2 className="hw-c-secTitle">屬{name}幸運物與開運指南</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <LuckyItem label="幸運數字" value={sx.luckyNumber} />
          <LuckyItem label="幸運顏色" value={toHant(sx.luckyColor)} />
          <LuckyItem label="有利方位" value={toHant(sx.luckyDirection)} />
          <LuckyItem label="本命佛" value={sx.benmingfo} />
          <LuckyItem label="吉祥花卉" value={toHant(sx.luckyFlower)} />
          <LuckyItem label="幸運寶石" value={toHant(sx.luckyStone)} />
        </div>
        <p className="text-xs text-ink-light/40 mt-4">
          提示：幸運物為傳統民俗參考，最上等的改運之道是修心積德、勤奮努力。
        </p>
      </div>

      <div className="hw-c-box mb-6">
        <h2 className="hw-c-secTitle">屬{name}生肖配對表</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {SHENGXIAO.map((other) => {
            const pd = getPeiDui(sx, other.name)
            const good = pd.level.includes('上等')
            return (
              <div
                key={other.slug}
                className={`border rounded p-3 text-sm ${good ? 'border-green-200 bg-green-50' : pd.level.includes('中等') ? 'border-gold/15' : 'border-red-100 bg-red-50/40'}`}
              >
                <div className="flex justify-between items-center mb-1">
                  <Link href={`/tw/shengxiao/${other.slug}`} className="font-bold hw-c-link">
                    {name} + {toHant(other.name)}
                  </Link>
                  <span className={`text-xs px-2 py-0.5 rounded ${good ? 'bg-green-100 text-green-700' : pd.level.includes('中等') ? 'bg-paper-dark/40 text-ink-light' : 'bg-red-100 text-red-600'}`}>
                    {toHant(pd.level)}
                  </span>
                </div>
                <p className="text-xs text-ink-light leading-relaxed">{toHant(pd.desc)}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* 相關命理知識：给属相页一条通向文章库的路（原来只有属相互链，孤立在生肖子图里） */}
      <div className="hw-c-box mb-6">
        <h2 className="hw-c-secTitle">相關命理知識</h2>
        <ul className="space-y-1.5 text-sm">
          {relatedReading.map((a) => (
            <li key={a.slug}>
              <Link href={`/tw/article/${a.slug}`} className="hw-c-link">• {toHant(a.title)}</Link>
            </li>
          ))}
          <li>
            <Link href="/tw/article" className="hw-c-link">• 八字命理知識大全（{articles.length} 篇）</Link>
          </li>
        </ul>
      </div>

      <div className="hw-c-cta">
        <h2 className="hw-c-secTitle">生肖只是年支，八字更精準</h2>
        <p className="hw-c-dx">
          相同生肖的人命運千差萬別，因為完整八字包含年、月、日、時四柱。輸入精確的出生時辰，查看專屬命盤。
        </p>
        <Link href="/bazi" className="hw-c-btnBig">免費排盤 →</Link>
      </div>

      <p className="text-center text-xs text-ink-light/40 mt-6">
        以上內容為傳統命理民俗文化，僅供參考娛樂，不構成任何決策依據。
      </p>
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

function LuckyItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 bg-gold/5 rounded p-3">
      <span className="text-ink-light/60 shrink-0">{label}</span>
      <span className="font-semibold text-ink">{value}</span>
    </div>
  )
}

function Relation({ label, value, tone }: { label: string; value: string; tone: 'good' | 'bad' | 'warn' }) {
  const box =
    tone === 'good' ? 'bg-green-50 border-green-200' :
    tone === 'bad' ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-200'
  const text = tone === 'good' ? 'text-green-700' : tone === 'bad' ? 'text-red-700' : 'text-orange-700'
  return (
    <div className={`${box} border rounded p-2 text-center`}>
      <div className="text-xs text-ink-light/60">{label}</div>
      <div className={`font-bold ${text}`}>{value}</div>
    </div>
  )
}
