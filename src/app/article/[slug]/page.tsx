import Link from 'next/link'
import { notFound } from 'next/navigation'
import { articles, ARTICLE_CATEGORIES } from '@/lib/articles'

export function generateStaticParams() {
  const articleParams = articles.map(a => ({ slug: a.slug }))
  const categoryParams = ARTICLE_CATEGORIES.map(c => ({ slug: c.slug }))
  return [...articleParams, ...categoryParams]
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const article = articles.find(a => a.slug === slug)
  const category = ARTICLE_CATEGORIES.find(c => c.slug === slug)
  if (article) {
    return {
      title: article.title,
      description: article.description,
      keywords: article.keywords.join(',')
    }
  }
  if (category) {
    return {
      title: `${category.name}文章大全 - 八字命理知识`,
      description: `${category.name}相关的八字命理文章，系统讲解${category.name}的核心概念、查法与命理应用。`
    }
  }
  return { title: '文章未找到' }
}

export default async function ArticleOrCategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const category = ARTICLE_CATEGORIES.find(c => c.slug === slug)

  // ===== 分类列表页 =====
  if (category) {
    const list = articles.filter(a => a.category === category.slug)
    return (
      <main className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <nav className="text-sm text-gray-500 mb-4">
            <Link href="/" className="hover:text-amber-700">首页</Link>
            <span className="mx-2">›</span>
            <Link href="/article" className="hover:text-amber-700">命理知识</Link>
            <span className="mx-2">›</span>
            <span className="text-amber-900">{category.name}</span>
          </nav>

          <h1 className="text-3xl font-bold text-amber-900 mb-2">{category.name}</h1>
          <p className="text-gray-600 mb-8">共 {list.length} 篇文章</p>

          <div className="space-y-4">
            {list.map(a => (
              <Link
                key={a.slug}
                href={`/article/${a.slug}`}
                className="bg-white rounded-lg shadow p-5 hover:shadow-md transition-shadow block"
              >
                <h2 className="font-bold text-amber-900 mb-2 text-lg">{a.title}</h2>
                <p className="text-sm text-gray-600">{a.description}</p>
              </Link>
            ))}
          </div>

          <div className="mt-8">
            <Link href="/article" className="text-amber-700 hover:text-amber-900">
              ← 返回全部命理知识
            </Link>
          </div>
        </div>
      </main>
    )
  }

  // ===== 文章详情页 =====
  const article = articles.find(a => a.slug === slug)
  if (!article) notFound()

  const related = articles
    .filter(a => a.category === article.category && a.slug !== article.slug)
    .slice(0, 4)

  const catName = ARTICLE_CATEGORIES.find(c => c.slug === article.category)?.name || ''

  return (
    <main className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <nav className="text-sm text-gray-500 mb-4">
          <Link href="/" className="hover:text-amber-700">首页</Link>
          <span className="mx-2">›</span>
          <Link href="/article" className="hover:text-amber-700">命理知识</Link>
          <span className="mx-2">›</span>
          <Link href={`/article/${article.category}`} className="hover:text-amber-700">{catName}</Link>
          <span className="mx-2">›</span>
          <span className="text-amber-900">正文</span>
        </nav>

        <article className="bg-white rounded-lg shadow p-6 md:p-8 mb-6">
          <div className="mb-4">
            <span className="inline-block bg-amber-100 text-amber-700 text-xs px-2 py-1 rounded">
              {catName}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-amber-900 mb-4 leading-tight">
            {article.title}
          </h1>
          <p className="text-gray-500 text-sm border-b border-amber-100 pb-4 mb-6">
            {article.description}
          </p>

          <div className="prose prose-amber max-w-none">
            {article.sections.map((section, i) => (
              <section key={i} className="mb-6">
                <h2 className="text-xl font-bold text-amber-800 mb-3">{section.heading}</h2>
                {section.body.map((p, j) => (
                  <p key={j} className="text-gray-700 leading-loose mb-3 text-[15px]">{p}</p>
                ))}
              </section>
            ))}
          </div>

          <div className="mt-8 pt-6 border-t border-amber-100 text-sm text-gray-500">
            <p>声明：本文为命理知识科普，内容基于传统命理经典整理，仅供学习参考，不构成人生决策建议。</p>
          </div>
        </article>

        {/* CTA */}
        <div className="bg-gradient-to-r from-amber-500 to-amber-600 rounded-lg shadow-lg p-6 text-white text-center mb-6">
          <h2 className="text-xl font-bold mb-2">学以致用，排盘看看自己的八字</h2>
          <p className="text-amber-100 text-sm mb-4">
            输入出生时辰，获取您的八字命盘、格局旺衰、大运流年完整分析
          </p>
          <Link
            href="/"
            className="inline-block bg-white text-amber-700 px-8 py-2.5 rounded-md font-bold hover:bg-amber-50 transition-colors"
          >
            免费排盘 →
          </Link>
        </div>

        {/* 相关文章 */}
        {related.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-bold text-amber-800 mb-4">相关文章</h2>
            <ul className="space-y-2">
              {related.map(a => (
                <li key={a.slug}>
                  <Link href={`/article/${a.slug}`} className="text-gray-700 hover:text-amber-700 text-sm">
                    • {a.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </main>
  )
}
