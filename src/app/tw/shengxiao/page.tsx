import type { Metadata } from 'next'
import Link from 'next/link'
import { SHENGXIAO, LIUNIAN_YEARS, getLiunian } from '@/lib/shengxiaoData'
import { hantAlternates } from '@/lib/hant-seo'
import { toHant } from '@/lib/hant'

export const metadata: Metadata = {
  title: '十二生肖性格與流年運勢（繁體）：屬鼠、屬牛、屬虎…',
  description:
    '十二生肖完整解讀：性格特點、事業財運、婚姻配對、六合六沖六害相刑，以及 2024–2031 流年太歲關係。繁體中文，台灣／香港用語。',
  alternates: {
    canonical: '/tw/shengxiao',
    languages: hantAlternates('/shengxiao'),
  },
}

const TONE_WORD: Record<string, string> = { '吉': '吉', '凶': '慎', '动': '動', '平': '平' }

export default function HantShengXiaoIndex() {
  return (
    <div className="hw-wrap hw-c-pg">
      <nav className="hw-c-back">
        <Link href="/tw">首頁</Link>
        <span className="mx-2">›</span>
        <span>十二生肖</span>
      </nav>

      <h1 className="hw-c-h1">十二生肖性格與流年運勢</h1>
      <p className="hw-c-lede">
        生肖即年支，是八字四柱裡的一支。以下為十二屬相的性格、事業財運、婚姻配對與流年太歲關係。
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
        {SHENGXIAO.map((sx) => {
          const liunian = LIUNIAN_YEARS.map((y) => ({ y, ln: getLiunian(sx, y) }))
          return (
            <div key={sx.slug} className="hw-c-box">
              <div className="flex items-center justify-between mb-2">
                <Link href={`/tw/shengxiao/${sx.slug}`} className="font-bold text-lg text-ink hover:underline">
                  屬{sx.name}
                </Link>
                <span className="text-xs text-ink-light/60">
                  地支{sx.zhi} · 五行屬{sx.wuxing}
                </span>
              </div>
              <p className="text-xs text-ink-light/60 mb-2">
                出生年份（以立春為界）：{sx.years.join('、')}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {liunian.map(({ y, ln }) => (
                  <span
                    key={y}
                    className="text-xs px-2 py-0.5 rounded bg-gold/10 text-ink-light"
                    title={`${ln.ganZhi}年 · ${toHant(ln.relation)}太歲`}
                  >
                    {y} {TONE_WORD[ln.tone] ?? ln.tone}
                  </span>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <div className="hw-c-cta mt-8">
        <h2 className="hw-c-secTitle">生肖是共性，八字才看個人</h2>
        <p className="hw-c-dx">
          同一屬相的人命運差別很大，因為年月日時四柱各不相同。輸入精確出生時辰，看專屬命盤。
        </p>
        <Link href="/bazi" className="hw-c-btnBig">免費排盤 →</Link>
      </div>

      <p className="text-center text-xs text-ink-light/40 mt-6">
        內容為傳統命理民俗文化，僅供參考娛樂，不構成任何決策依據。
      </p>
    </div>
  )
}
