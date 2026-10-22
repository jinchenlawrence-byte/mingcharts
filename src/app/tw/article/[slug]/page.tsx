import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { articles, ARTICLE_CATEGORIES } from '@/lib/articles'
import { hantAlternates } from '@/lib/hant-seo'
import { toHant } from '@/lib/hant'
import { SKUS, formatPriceUSD } from '@/lib/pricing'

// 繁体文章详情 / 分类（/tw/article/<slug>）
// 与简体页同构：一个 [slug] 路由同时承担「分类列表」与「文章详情」两种形态。
export function generateStaticParams() {
  return [
    ...articles.map((a) => ({ slug: a.slug })),
    ...ARTICLE_CATEGORIES.map((c) => ({ slug: c.slug })),
  ]
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const article = articles.find((a) => a.slug === slug)
  const category = ARTICLE_CATEGORIES.find((c) => c.slug === slug)
  const languages = hantAlternates(`/article/${slug}`)
  if (article) {
    return {
      title: toHant(article.title),
      description: toHant(article.description),
      alternates: { canonical: `/tw/article/${slug}`, languages },
    }
  }
  if (category) {
    return {
      title: `${toHant(category.name)}文章大全 - 八字命理知識`,
      description: `${toHant(category.name)}相關的八字命理文章，系統講解${toHant(category.name)}的核心概念、查法與命理應用。`,
      alternates: { canonical: `/tw/article/${slug}`, languages },
    }
  }
  return { title: '文章未找到' }
}

export default async function HantArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const category = ARTICLE_CATEGORIES.find((c) => c.slug === slug)

  // ===== 分类列表 =====
  if (category) {
    const list = articles.filter((a) => a.category === category.slug)
    return (
      <div className="hw-wrap hw-c-pg">
        <div className="max-w-4xl mx-auto">
          <nav className="hw-c-back">
            <Link href="/tw">首頁</Link>
            <span className="mx-2">›</span>
            <Link href="/tw/article">命理知識</Link>
            <span className="mx-2">›</span>
            <span>{toHant(category.name)}</span>
          </nav>
          <h1 className="hw-c-h1">{toHant(category.name)}</h1>
          <p className="hw-lede">共 {list.length} 篇文章</p>
          <div className="space-y-4">
            {list.map((a) => (
              <Link
                key={a.slug}
                href={`/tw/article/${a.slug}`}
                className="hw-c-box p-5! hover:shadow-md transition-shadow block"
              >
                <h2 className="font-bold text-ink mb-2 text-lg">{toHant(a.title)}</h2>
                <p className="text-sm text-ink-light">{toHant(a.description)}</p>
              </Link>
            ))}
          </div>
          <div className="mt-8">
            <Link href="/tw/article" className="hw-c-back">← 返回全部命理知識</Link>
          </div>
        </div>
      </div>
    )
  }

  // ===== 文章详情 =====
  const article = articles.find((a) => a.slug === slug)
  if (!article) notFound()

  const related = articles.filter((a) => a.category === article.category && a.slug !== article.slug).slice(0, 4)
  const catName = toHant(ARTICLE_CATEGORIES.find((c) => c.slug === article.category)?.name ?? '')
  const cta = article.cta

  const BASE = 'https://www.mingcharts.com'
  const articleUrl = `${BASE}/tw/article/${article.slug}`
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article',
        '@id': `${articleUrl}#article`,
        headline: toHant(article.title),
        description: toHant(article.description),
        // ★ 与简体页区分：繁体页声明 zh-Hant，否则结构化数据与 hreflang 自相矛盾
        inLanguage: 'zh-Hant',
        mainEntityOfPage: { '@type': 'WebPage', '@id': articleUrl },
        author: { '@type': 'Organization', name: '明理 MingCharts', url: BASE },
        publisher: { '@id': `${BASE}/#org` },
        isPartOf: { '@id': `${BASE}/#site` },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: '首頁', item: `${BASE}/tw` },
          { '@type': 'ListItem', position: 2, name: '命理知識', item: `${BASE}/tw/article` },
          { '@type': 'ListItem', position: 3, name: catName, item: `${BASE}/tw/article/${article.category}` },
          { '@type': 'ListItem', position: 4, name: toHant(article.title), item: articleUrl },
        ],
      },
    ],
  }

  return (
    <div className="hw-wrap hw-c-pg">
      <div className="max-w-3xl mx-auto">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <nav className="hw-c-back">
          <Link href="/tw">首頁</Link>
          <span className="mx-2">›</span>
          <Link href="/tw/article">命理知識</Link>
          <span className="mx-2">›</span>
          <Link href={`/tw/article/${article.category}`}>{catName}</Link>
          <span className="mx-2">›</span>
          <span>正文</span>
        </nav>

        <article className="hw-c-box p-6! md:p-8! mb-6">
          <div className="mb-4">
            <span className="inline-block bg-gold/10 text-ink/70 text-xs px-2 py-1 rounded">{catName}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-ink mb-4 leading-tight">{toHant(article.title)}</h1>
          <p className="text-ink-light/60 text-sm border-b border-amber-100 pb-4 mb-6">{toHant(article.description)}</p>

          <div className="prose prose-amber max-w-none">
            {article.sections.map((section, i) => (
              <section key={i} className="mb-6">
                <h2 className="text-xl font-bold text-ink mb-3">{toHant(section.heading)}</h2>
                {section.body.map((p, j) => (
                  <p key={j} className="text-ink/70 leading-loose mb-3 text-[15px]">{toHant(p)}</p>
                ))}
              </section>
            ))}
          </div>

          <div className="mt-8 pt-6 border-t border-amber-100 text-sm text-ink-light/60">
            <p>聲明：本文為命理知識科普，內容基於傳統命理經典整理，僅供學習參考，不構成人生決策建議。</p>
          </div>
        </article>

        <div className="hw-c-cta mb-6">
          <h2 className="hw-c-secTitle">{cta ? toHant(cta.title) : '學以致用，排盤看看自己的八字'}</h2>
          <p className="hw-c-dx">
            {cta ? toHant(cta.desc) : '輸入出生時辰，獲取您的八字命盤、格局旺衰、大運流年完整分析'}
          </p>
          <Link href={cta?.href ?? '/bazi'} className="hw-c-btnBig">{cta ? toHant(cta.text) : '免費排盤'} →</Link>
          {cta?.priceSku && (
            <p className="mt-3 text-xs text-ink-light/60">
              {formatPriceUSD(SKUS[cta.priceSku].priceUSD)} · 一次性購買，解鎖後永久回看
            </p>
          )}
        </div>

        {related.length > 0 && (
          <div className="hw-c-box p-6!">
            <h2 className="hw-c-secTitle">相關文章</h2>
            <ul className="space-y-2">
              {related.map((a) => (
                <li key={a.slug}>
                  <Link href={`/tw/article/${a.slug}`} className="hw-c-link text-sm">
                    • {toHant(a.title)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
