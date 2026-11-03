import Link from 'next/link'
import Nav from '@/components/Nav'
import { notFound } from 'next/navigation'
import { articles, ARTICLE_CATEGORIES } from '@/lib/articles'
import { SKUS, formatPriceUSD } from '@/lib/pricing'
import { hantAlternates } from '@/lib/hant-seo'

export function generateStaticParams() {
  const articleParams = articles.map(a => ({ slug: a.slug }))
  const categoryParams = ARTICLE_CATEGORIES.map(c => ({ slug: c.slug }))
  return [...articleParams, ...categoryParams]
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const article = articles.find(a => a.slug === slug)
  const category = ARTICLE_CATEGORIES.find(c => c.slug === slug)
  // hreflang：与 /tw/article/<slug> 双向互指（矩阵由 lib/hant-seo 单一生成）
  const languages = hantAlternates(`/article/${slug}`)
  if (article) {
    return {
      title: article.title,
      description: article.description,
      keywords: article.keywords.join(','),
      alternates: { canonical: `/article/${slug}`, languages },
    }
  }
  if (category) {
    return {
      title: `${category.name}文章大全 - 八字命理知识`,
      description: `${category.name}相关的八字命理文章，系统讲解${category.name}的核心概念、查法与命理应用。`,
      alternates: { canonical: `/article/${slug}`, languages },
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
      <main className="hw-page">
        <Nav />
        <div className="hw-wrap hw-c-pg">
          <div className="max-w-4xl mx-auto">
            <nav className="hw-c-back">
              <Link href="/">首页</Link>
              <span className="mx-2">›</span>
              <Link href="/article">命理知识</Link>
              <span className="mx-2">›</span>
              <span>{category.name}</span>
            </nav>

            <h1 className="hw-c-h1">{category.name}</h1>
            <p className="hw-lede">共 {list.length} 篇文章</p>

            <div className="space-y-4">
              {list.map(a => (
                <Link
                  key={a.slug}
                  href={`/article/${a.slug}`}
                  className="hw-c-box p-5! hover:shadow-md transition-shadow block"
                >
                  <h2 className="font-bold text-ink mb-2 text-lg">{a.title}</h2>
                  <p className="text-sm text-ink-light">{a.description}</p>
                </Link>
              ))}
            </div>

            <div className="mt-8">
              <Link href="/article" className="hw-c-back">
                ← 返回全部命理知识
              </Link>
            </div>
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
  const cta = article.cta

  // 结构化数据：Article + BreadcrumbList（提升富摘要与品牌实体识别）
  const BASE = 'https://www.mingcharts.com'
  const articleUrl = `${BASE}/article/${article.slug}`
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article',
        '@id': `${articleUrl}#article`,
        headline: article.title,
        description: article.description,
        inLanguage: 'zh-CN',
        mainEntityOfPage: { '@type': 'WebPage', '@id': articleUrl },
        author: { '@type': 'Organization', name: '明理 MingCharts', url: BASE },
        publisher: { '@id': `${BASE}/#org` },
        isPartOf: { '@id': `${BASE}/#site` },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: '首页', item: BASE },
          { '@type': 'ListItem', position: 2, name: '命理知识', item: `${BASE}/article` },
          { '@type': 'ListItem', position: 3, name: catName, item: `${BASE}/article/${article.category}` },
          { '@type': 'ListItem', position: 4, name: article.title, item: articleUrl },
        ],
      },
    ],
  }

  return (
    <main className="hw-page">
      <Nav />
      <script
        type="application/ld+json"
        // 静态派生自 articles.ts，不含用户输入
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="hw-wrap hw-c-pg">
        <div className="max-w-3xl mx-auto">
          <nav className="hw-c-back">
            <Link href="/">首页</Link>
            <span className="mx-2">›</span>
            <Link href="/article">命理知识</Link>
            <span className="mx-2">›</span>
            <Link href={`/article/${article.category}`}>{catName}</Link>
            <span className="mx-2">›</span>
            <span>正文</span>
          </nav>

          <article className="hw-c-box p-6! md:p-8! mb-6">
            <div className="mb-4">
              <span className="inline-block bg-gold/10 text-ink/70 text-xs px-2 py-1 rounded">
                {catName}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-ink mb-4 leading-tight">
              {article.title}
            </h1>
            <p className="text-ink-light/60 text-sm border-b border-amber-100 pb-4 mb-6">
              {article.description}
            </p>

            <div className="prose prose-amber max-w-none">
              {article.sections.map((section, i) => (
                <section key={i} className="mb-6">
                  <h2 className="text-xl font-bold text-ink mb-3">{section.heading}</h2>
                  {section.body.map((p, j) => (
                    <p key={j} className="text-ink/70 leading-loose mb-3 text-[15px]">{p}</p>
                  ))}
                </section>
              ))}
            </div>

            <div className="mt-8 pt-6 border-t border-amber-100 text-sm text-ink-light/60">
              <p>声明：本文为命理知识科普，内容基于传统命理经典整理，仅供学习参考，不构成人生决策建议。</p>
            </div>
          </article>

          {/* CTA：文章可自带（缺省为免费排盘）；价格一律按 priceSku 从 pricing.ts 派生 */}
          <div className="hw-c-cta mb-6">
            <h2 className="hw-c-secTitle">{cta?.title ?? '学以致用，排盘看看自己的八字'}</h2>
            <p className="hw-c-dx">
              {cta?.desc ?? '输入出生时辰，获取您的八字命盘、格局旺衰、大运流年完整分析'}
            </p>
            <Link href={cta?.href ?? '/'} className="hw-c-btnBig">
              {cta?.text ?? '免费排盘'} →
            </Link>
            {cta?.priceSku && (
              <p className="mt-3 text-xs text-ink-light/60">
                {formatPriceUSD(SKUS[cta.priceSku].priceUSD)} · 一次性购买，解锁后永久回看
              </p>
            )}
          </div>

          {/* 相关文章 */}
          {related.length > 0 && (
            <div className="hw-c-box p-6!">
              <h2 className="hw-c-secTitle">相关文章</h2>
              <ul className="space-y-2">
                {related.map(a => (
                  <li key={a.slug}>
                    <Link href={`/article/${a.slug}`} className="hw-c-link text-sm">
                      • {a.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
