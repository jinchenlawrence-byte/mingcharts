import Link from 'next/link'
import Nav from '@/components/Nav'
import { articles, ARTICLE_CATEGORIES } from '@/lib/articles'

export const metadata = {
  title: '八字命理知识大全：入门、十神、格局、五行、神煞详解',
  description: '系统学习八字命理知识，涵盖八字入门、十神详解、格局分析、五行天干、神煞查法等内容，基于《子平真诠》《滴天髓》等经典整理。'
}

export default function ArticleIndex() {
  return (
    <main className="hw-page">
      <Nav />
      <div className="hw-wrap hw-c-pg">
        <div className="max-w-4xl mx-auto">
          <nav className="hw-c-back">
            <Link href="/">首页</Link>
            <span className="mx-2">›</span>
            <span>命理知识</span>
          </nav>

          <h1 className="hw-c-h1">八字命理知识大全</h1>
          <p className="hw-lede">
            共 {articles.length} 篇文章，基于《子平真诠》《滴天髓》《穷通宝鉴》《渊海子平》《三命通会》《千里命稿》六本经典整理。
          </p>

          {ARTICLE_CATEGORIES.map(cat => {
            const list = articles.filter(a => a.category === cat.slug)
            if (list.length === 0) return null
            return (
              <section key={cat.slug} className="mb-10">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="hw-c-secTitle">{cat.name}</h2>
                  <Link href={`/article/${cat.slug}`} className="hw-c-link">
                    查看全部 →
                  </Link>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  {list.map(a => (
                    <Link
                      key={a.slug}
                      href={`/article/${a.slug}`}
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
            <h2 className="hw-c-secTitle">想要亲自排盘验证？</h2>
            <p className="text-sm text-ink/70 mb-4">
              学完理论知识，输入您的出生时辰，获取属于自己的八字命盘和完整命理分析。
            </p>
            <Link href="/" className="hw-c-btnBig">
              立即免费排盘 →
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
