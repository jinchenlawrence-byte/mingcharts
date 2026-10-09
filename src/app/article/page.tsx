import Link from 'next/link'
import { articles, ARTICLE_CATEGORIES } from '@/lib/articles'

export const metadata = {
  title: '八字命理知识大全：入门、十神、格局、五行、神煞详解',
  description: '系统学习八字命理知识，涵盖八字入门、十神详解、格局分析、五行天干、神煞查法等内容，基于《子平真诠》《滴天髓》等经典整理。'
}

export default function ArticleIndex() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <nav className="text-sm text-gray-500 mb-4">
          <Link href="/" className="hover:text-amber-700">首页</Link>
          <span className="mx-2">›</span>
          <span className="text-amber-900">命理知识</span>
        </nav>

        <h1 className="text-3xl font-bold text-amber-900 mb-2">八字命理知识大全</h1>
        <p className="text-gray-600 mb-8">
          共 {articles.length} 篇文章，基于《子平真诠》《滴天髓》《穷通宝鉴》《渊海子平》《三命通会》《千里命稿》六本经典整理。
        </p>

        {ARTICLE_CATEGORIES.map(cat => {
          const list = articles.filter(a => a.category === cat.slug)
          if (list.length === 0) return null
          return (
            <section key={cat.slug} className="mb-10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-amber-800">{cat.name}</h2>
                <Link href={`/article/${cat.slug}`} className="text-sm text-amber-600 hover:text-amber-800">
                  查看全部 →
                </Link>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                {list.map(a => (
                  <Link
                    key={a.slug}
                    href={`/article/${a.slug}`}
                    className="bg-white rounded-lg shadow p-5 hover:shadow-md transition-shadow block"
                  >
                    <h3 className="font-bold text-amber-900 mb-2 leading-snug">{a.title}</h3>
                    <p className="text-sm text-gray-600 line-clamp-2">{a.description}</p>
                  </Link>
                ))}
              </div>
            </section>
          )
        })}

        <div className="bg-amber-50 rounded-lg p-6 mt-8">
          <h2 className="text-xl font-bold text-amber-800 mb-2">想要亲自排盘验证？</h2>
          <p className="text-sm text-gray-700 mb-4">
            学完理论知识，输入您的出生时辰，获取属于自己的八字命盘和完整命理分析。
          </p>
          <Link
            href="/"
            className="inline-block bg-amber-600 text-white px-6 py-2 rounded-md font-semibold hover:bg-amber-700 transition-colors"
          >
            立即免费排盘 →
          </Link>
        </div>
      </div>
    </main>
  )
}
