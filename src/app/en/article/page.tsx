import type { Metadata } from 'next'
import Link from 'next/link'
import { articlesEn, ARTICLE_CATEGORIES_EN, articlesInCategoryEn } from '@/lib/articlesEn'
import { triAlternates } from '@/lib/lang'

export const metadata: Metadata = {
  title: 'Bazi & Chinese metaphysics: a complete article guide',
  description:
    'Learn Bazi (Four Pillars of Destiny), the Ten Gods, chart patterns, the Five Elements, shensha stars, compatibility, Zi Wei Dou Shu and annual fortune, drawn from the six classical texts. English edition.',
  alternates: { canonical: '/en/article', languages: triAlternates('/article') },
}

// 英文文章索引：与 /article、/tw/article 一一对应（分类与 slug 均由简体数据推导）
export default function EnArticleIndex() {
  return (
    <div className="hw-wrap hw-c-pg">
      <div className="max-w-4xl mx-auto">
        <nav className="hw-c-back">
          <Link href="/en">Home</Link>
          <span className="mx-2">›</span>
          <span>Articles</span>
        </nav>

        <h1 className="hw-c-h1">Bazi and Chinese metaphysics</h1>
        <p className="hw-lede">
          {articlesEn.length} articles, adapted from six classical texts: <em>Zi Ping Zhen Quan</em>,{' '}
          <em>Di Tian Sui</em>, <em>Qiong Tong Bao Jian</em>, <em>Yuan Hai Zi Ping</em>,{' '}
          <em>San Ming Tong Hui</em> and <em>Qian Li Ming Gao</em>.
        </p>

        {ARTICLE_CATEGORIES_EN.map((cat) => {
          const list = articlesInCategoryEn(cat.slug)
          if (list.length === 0) return null
          return (
            <section key={cat.slug} className="mb-10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="hw-c-secTitle">{cat.name}</h2>
                <Link href={`/en/article/${cat.slug}`} className="hw-c-link">
                  View all →
                </Link>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                {list.map((a) => (
                  <Link
                    key={a.slug}
                    href={`/en/article/${a.slug}`}
                    className="hw-c-box p-5! hover:shadow-md transition-shadow block"
                  >
                    <h3 className="font-bold text-ink mb-2 leading-snug">{a.title}</h3>
                    <p className="text-sm text-ink-light line-clamp-2">{a.description}</p>
                  </Link>
                ))}
              </div>
            </section>
          )
        })}

        <div className="hw-c-box bg-gold/5! mt-8 text-center">
          <h2 className="hw-c-secTitle">Want to check this against your own chart?</h2>
          <p className="text-sm text-ink/70 mb-4">
            Enter your birth date and time to get your Four Pillars chart with strength, pattern and
            luck-cycle analysis.
          </p>
          <Link href="/en/chart" className="hw-c-btnBig">
            Cast my chart free →
          </Link>
        </div>
      </div>
    </div>
  )
}
