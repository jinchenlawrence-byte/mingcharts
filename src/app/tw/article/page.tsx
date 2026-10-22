import type { Metadata } from 'next'
import Link from 'next/link'
import { articles, ARTICLE_CATEGORIES } from '@/lib/articles'
import { hantAlternates } from '@/lib/hant-seo'
import { toHant } from '@/lib/hant'

// 繁体文章索引（/tw/article）
// 内容同源 articles.ts，正文一律过 toHant；结构与简体索引保持一致，便于两边读者互换。
export const metadata: Metadata = {
  title: '八字命理知識大全：入門、十神、格局、五行、神煞詳解',
  description: '系統學習八字命理知識，涵蓋八字入門、十神詳解、格局分析、五行天干、神煞查法等内容，基於《子平真詮》《滴天髓》等經典整理。',
  alternates: {
    canonical: '/tw/article',
    languages: hantAlternates('/article'),
  },
}

export default function HantArticleIndex() {
  return (
    <div className="hw-wrap hw-c-pg">
      <div className="max-w-4xl mx-auto">
        <nav className="hw-c-back">
          <Link href="/tw">首頁</Link>
          <span className="mx-2">›</span>
          <span>命理知識</span>
        </nav>

        <h1 className="hw-c-h1">八字命理知識大全</h1>
        <p className="hw-lede">
          共 {articles.length} 篇文章，基於《子平真詮》《滴天髓》《窮通寶鑑》《淵海子平》《三命通會》《千里命稿》六本經典整理。
        </p>

        {ARTICLE_CATEGORIES.map((cat) => {
          const list = articles.filter((a) => a.category === cat.slug)
          if (list.length === 0) return null
          return (
            <section key={cat.slug} className="mb-10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="hw-c-secTitle">{toHant(cat.name)}</h2>
                <Link href={`/tw/article/${cat.slug}`} className="hw-c-link">
                  查看全部 →
                </Link>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                {list.map((a) => (
                  <Link
                    key={a.slug}
                    href={`/tw/article/${a.slug}`}
                    className="hw-c-box p-5! hover:shadow-md transition-shadow block"
                  >
                    <h3 className="font-bold text-ink mb-2 leading-snug">{toHant(a.title)}</h3>
                    <p className="text-sm text-ink-light line-clamp-2">{toHant(a.description)}</p>
                  </Link>
                ))}
              </div>
            </section>
          )
        })}

        <div className="hw-c-box bg-gold/5! mt-8 text-center">
          <h2 className="hw-c-secTitle">想要親自排盤驗證？</h2>
          <p className="text-sm text-ink/70 mb-4">
            學完理論知識，輸入您的出生時辰，獲取屬於自己的八字命盤和完整命理分析。
          </p>
          <Link href="/bazi" className="hw-c-btnBig">立即免費排盤 →</Link>
        </div>
      </div>
    </div>
  )
}
