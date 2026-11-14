import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  articlesEn,
  ARTICLE_CATEGORIES_EN,
  CATEGORY_INTRO_EN,
  getArticleEn,
  categoryNameEn,
  articlesInCategoryEn,
} from '@/lib/articlesEn'
import type { ArticleCategorySlug } from '@/lib/articlesEn/types'
import { triAlternates } from '@/lib/lang'

export function generateStaticParams() {
  return [
    ...ARTICLE_CATEGORIES_EN.map((c) => ({ slug: c.slug })),
    ...articlesEn.map((a) => ({ slug: a.slug })),
  ]
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const article = getArticleEn(slug)
  const category = ARTICLE_CATEGORIES_EN.find((c) => c.slug === slug)
  // hreflang：与 /article/<slug>、/tw/article/<slug> 三向互指（矩阵由 lib/lang 单一生成）
  const languages = triAlternates(`/article/${slug}`)
  if (article) {
    return {
      title: article.title,
      description: article.description,
      keywords: article.keywords.join(','),
      alternates: { canonical: `/en/article/${slug}`, languages },
    }
  }
  if (category) {
    return {
      title: `${category.name} articles`,
      description: `${category.name}: a series of articles on the core concepts, lookup rules and practical use of this subject in Chinese metaphysics. English edition.`,
      alternates: { canonical: `/en/article/${slug}`, languages },
    }
  }
  return { title: 'Article not found' }
}

// 文末 CTA：只指向 /en 树（不链回中文页）
const CTA: Record<ArticleCategorySlug, { href: string; title: string; desc: string; text: string }> = {
  bazi: {
    href: '/en/chart',
    title: 'Put the theory on your own chart',
    desc: 'Enter your birth time to get your Four Pillars, Day Master strength, chart pattern and luck cycles.',
    text: 'Cast my chart free',
  },
  shishen: {
    href: '/en/chart',
    title: 'See which Ten Gods your chart carries',
    desc: 'A full chart shows every stem and branch, its Ten God, and how those roles interact.',
    text: 'Cast my chart free',
  },
  geju: {
    href: '/en/chart',
    title: 'Find the pattern in your own chart',
    desc: 'The pattern is decided by the month branch and how the chart supports or breaks the dominant role.',
    text: 'Cast my chart free',
  },
  wuxing: {
    href: '/en/chart',
    title: 'Count the Five Elements in your chart',
    desc: 'See which element is strong, which is missing, and what the season says about balance.',
    text: 'Cast my chart free',
  },
  shensha: {
    href: '/en/chart',
    title: 'Check which shensha your chart carries',
    desc: 'A full chart lists the auxiliary stars and where they sit, so you can judge them in context.',
    text: 'Cast my chart free',
  },
  hemun: {
    href: '/en/hemun',
    title: 'Compare two charts directly',
    desc: 'Enter both birthdays to read the spouse palace, the two Day Masters and the spouse star side by side.',
    text: 'Start a compatibility reading',
  },
  ziwei: {
    href: '/en/ziwei',
    title: 'Read the same moment as a Zi Wei chart',
    desc: 'Zi Wei Dou Shu maps the birth moment onto twelve palaces and a different set of stars.',
    text: 'Open the Zi Wei reading',
  },
  liunian: {
    href: '/en/liunian',
    title: 'Read the year against your chart',
    desc: 'See the annual pillar, its clashes and combinations with your natal chart, and the Tai Sui relationship.',
    text: 'Open the annual reading',
  },
}

export default async function EnArticleOrCategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const category = ARTICLE_CATEGORIES_EN.find((c) => c.slug === slug)

  // ===== 分类索引 =====
  if (category) {
    const list = articlesInCategoryEn(category.slug)
    return (
      <div className="hw-wrap hw-c-pg">
        <div className="max-w-4xl mx-auto">
          <nav className="hw-c-back">
            <Link href="/en">Home</Link>
            <span className="mx-2">›</span>
            <Link href="/en/article">Articles</Link>
            <span className="mx-2">›</span>
            <span>{category.name}</span>
          </nav>

          <h1 className="hw-c-h1">{category.name}</h1>
          <p className="hw-lede">
            {list.length} {list.length === 1 ? 'article' : 'articles'}
          </p>

          <div className="hw-c-box mb-6 mt-4">
            <p className="hw-c-body">{CATEGORY_INTRO_EN[category.slug]}</p>
          </div>

          <div className="space-y-4">
            {list.map((a) => (
              <Link
                key={a.slug}
                href={`/en/article/${a.slug}`}
                className="hw-c-box p-5! hover:shadow-md transition-shadow block"
              >
                <h2 className="font-bold text-ink mb-2 text-lg">{a.title}</h2>
                <p className="text-sm text-ink-light">{a.description}</p>
              </Link>
            ))}
          </div>

          <div className="mt-8">
            <Link href="/en/article" className="hw-c-back">
              ← All articles
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // ===== 文章详情 =====
  const article = getArticleEn(slug)
  if (!article) notFound()

  const catName = categoryNameEn(article.category)
  const cta = CTA[article.category]
  const related = articlesInCategoryEn(article.category)
    .filter((a) => a.slug !== article.slug)
    .slice(0, 4)

  // 结构化数据：Article + BreadcrumbList（全部指向 /en 树）
  const BASE = 'https://www.mingcharts.com'
  const articleUrl = `${BASE}/en/article/${article.slug}`
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article',
        '@id': `${articleUrl}#article`,
        headline: article.title,
        description: article.description,
        inLanguage: 'en',
        mainEntityOfPage: { '@type': 'WebPage', '@id': articleUrl },
        author: { '@type': 'Organization', name: 'MingCharts', url: BASE },
        publisher: { '@id': `${BASE}/#org` },
        isPartOf: { '@id': `${BASE}/#site` },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${BASE}/en` },
          { '@type': 'ListItem', position: 2, name: 'Articles', item: `${BASE}/en/article` },
          { '@type': 'ListItem', position: 3, name: catName, item: `${BASE}/en/article/${article.category}` },
          { '@type': 'ListItem', position: 4, name: article.title, item: articleUrl },
        ],
      },
    ],
  }

  return (
    <div className="hw-wrap hw-c-pg">
      <script
        type="application/ld+json"
        // 静态派生自 articlesEn，不含用户输入
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="max-w-[45ch] mx-auto">
        <nav className="hw-c-back">
          <Link href="/en">Home</Link>
          <span className="mx-2">›</span>
          <Link href="/en/article">Articles</Link>
          <span className="mx-2">›</span>
          <Link href={`/en/article/${article.category}`}>{catName}</Link>
          <span className="mx-2">›</span>
          <span>Article</span>
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
          <p className="text-ink-light text-sm border-b border-amber-100 pb-4 mb-6">
            {article.description}
          </p>

          <div className="prose prose-amber max-w-none">
            {article.sections.map((section, i) => (
              <section key={i} className="mb-6">
                <h2 className="text-xl font-bold text-ink mb-3">{section.heading}</h2>
                {section.body.map((p, j) => (
                  <p key={j} className="text-ink/70 leading-loose mb-3 text-[15px]">
                    {p}
                  </p>
                ))}
              </section>
            ))}
          </div>

          <div className="mt-8 pt-6 border-t border-amber-100 text-sm text-ink-light">
            <p>
              Disclaimer: this article is educational content drawn from classical Chinese
              metaphysics. It is for study and reference only and is not life advice.
            </p>
          </div>
        </article>

        <div className="hw-c-cta mb-6">
          <h2 className="hw-c-secTitle">{cta.title}</h2>
          <p className="hw-c-dx">{cta.desc}</p>
          <Link href={cta.href} className="hw-c-btnBig">
            {cta.text} →
          </Link>
        </div>

        {related.length > 0 && (
          <div className="hw-c-box p-6!">
            <h2 className="hw-c-secTitle">Related articles</h2>
            <ul className="space-y-2">
              {related.map((a) => (
                <li key={a.slug}>
                  <Link href={`/en/article/${a.slug}`} className="hw-c-link text-sm">
                    • {a.title}
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
