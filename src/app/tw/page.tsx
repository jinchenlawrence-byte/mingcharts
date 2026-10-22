import Link from 'next/link'
import { SHENGXIAO } from '@/lib/shengxiaoData'
import { toHant } from '@/lib/hant'
import { categoriesWithCount, pickBySlug } from '@/lib/relatedArticles'

// 繁体落地页：文案直接用繁体写（不做转换），因为这是新增内容而非镜像内容。
//
// ★ 内链：这里必须给出通向 208 个繁体页的入口 —— 落地页只链 12 属相时，
//   96 个流年页与 97 个文章页之间没有横向通路，Google 只能靠 sitemap 慢慢摸。
const FEATURED_ARTICLES = [
  'shenme-shi-bazi',
  'shishang-ge',
  'shenwang-shenruo-zenme-panduan',
  'liunian-zenme-kan',
] as const

export default function HantHome() {
  const categories = categoriesWithCount()
  const featured = pickBySlug([...FEATURED_ARTICLES])
  return (
    <div className="hw-wrap hw-c-pg">
      <section className="hw-c-box mb-6">
        <h1 className="hw-c-h1">生肖流年 · 免費八字排盤</h1>
        <p className="hw-c-lede">
          命理古籍講究「四柱八字」，生肖只是年支一支。這裡先提供生肖的性格、六合六沖與流年運勢，
          想更精準再看完整命盤：四柱、十神、藏干、大運、流年，一次算清。
        </p>
        <div className="flex flex-wrap gap-3 mt-4">
          <Link href="/bazi" className="hw-c-btnBig">免費排八字 →</Link>
          <Link href="/tw/shengxiao" className="hw-c-back self-center">先看生肖 →</Link>
        </div>
      </section>

      <section className="hw-c-box mb-6">
        <h2 className="hw-c-secTitle">十二生肖 · 性格與配對</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {SHENGXIAO.map((sx) => (
            <Link
              key={sx.slug}
              href={`/tw/shengxiao/${sx.slug}`}
              className="border border-gold/20 rounded-lg p-3 hover:bg-gold/5 transition"
            >
              <div className="font-bold text-ink">屬{sx.name}</div>
              <div className="text-xs text-ink-light mt-1">
                地支{sx.zhi} · 五行屬{sx.wuxing}
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="hw-c-box mb-6">
        <h2 className="hw-c-secTitle">繁體版目前提供什麼</h2>
        <ul className="text-sm text-ink-light space-y-2">
          <li>• 十二生肖的性格、事業、財運、婚姻、健康，與六合／三合／六沖／六害／相刑關係</li>
          <li>• 屬相配對表（上等／中等／需磨合三級）</li>
          <li>• 2024–2031 流年太歲關係（值／沖／害／刑／合）</li>
          <li>• 排盤、紫微斗數、合婚、万字命書等工具目前為簡體介面，正在逐步繁體化</li>
        </ul>
        <p className="text-xs text-ink-light/50 mt-3">
          內容為傳統命理民俗文化，僅供參考娛樂，不構成任何決策依據。
        </p>
      </section>

      <section className="hw-c-box mb-6">
        <h2 className="hw-c-secTitle">命理知識（{categories.length} 個分類）</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          {categories.map((c) => (
            <Link
              key={c.slug}
              href={`/tw/article/${c.slug}`}
              className="border border-gold/20 rounded p-2 text-center text-sm hover:bg-gold/5 transition"
            >
              <div className="font-semibold text-ink">{toHant(c.name)}</div>
              <div className="text-xs text-ink-light/60">{c.count} 篇</div>
            </Link>
          ))}
        </div>
        <ul className="space-y-1.5 text-sm">
          {featured.map((a) => (
            <li key={a.slug}>
              <Link href={`/tw/article/${a.slug}`} className="hw-c-link">
                • {toHant(a.title)}
              </Link>
            </li>
          ))}
        </ul>
        <p className="text-xs text-ink-light/50 mt-3">
          <Link href="/tw/article" className="hw-c-link">查看全部命理知識 →</Link>
        </p>
      </section>

      <section className="hw-c-box">
        <h2 className="hw-c-secTitle">為什麼生肖只是「年支」</h2>
        <p className="hw-c-body">
          {toHant('相同生肖的人命运千差万别，因为完整八字包含年、月、日、时四柱：年柱看祖上与少年，月柱看父母与事业环境，日柱看自身与配偶，时柱看子女与晚年。生肖只取年支一个地支，占八个字里的一个字。')}
        </p>
      </section>
    </div>
  )
}
