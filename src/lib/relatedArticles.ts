// 繁体侧内链选择器
//
// 为什么要单独一个文件：208 个繁体页之间的连通性决定 Google 的抓取优先级，
// 而「相关文章」如果各处各写一套（取同分类前 4 篇），会出现两种问题：
//   ① 边缘分类只有 1–2 篇 → 相关块空缺，页面成为孤岛
//   ② 选择逻辑用了随机/时间 → SSG 每次构建产物不同，无法断言
//
// 本文件只做【确定性】选择：同分类优先 → 关键词重合 → 稳定的兜底顺序（按 slug 字典序）。
// 纯函数，不碰 IO，便于 scripts 里直接断言。
import { articles, ARTICLE_CATEGORIES, type Article } from './articles'

/** 关键词重合度（用于跨分类补位） */
function overlap(a: Article, b: Article): number {
  const sa = new Set(a.keywords)
  return b.keywords.reduce((n, k) => n + (sa.has(k) ? 1 : 0), 0)
}

/**
 * 取相关文章：同分类优先，不足则按关键词重合补，最后按 slug 字典序兜底。
 * @param limit 总条数（含同分类）
 */
export function relatedHantArticles(article: Article, limit = 6): Article[] {
  const picked: Article[] = []
  const push = (a: Article) => {
    if (a.slug === article.slug) return
    if (picked.some((p) => p.slug === a.slug)) return
    if (picked.length < limit) picked.push(a)
  }

  // ① 同分类（保持 articles.ts 里的既定顺序，稳定）
  for (const a of articles) if (a.category === article.category) push(a)

  // ② 跨分类补位：关键词重合降序 + slug 升序（全确定，无随机）
  const rest = articles
    .filter((a) => a.category !== article.category && a.slug !== article.slug)
    .map((a) => ({ a, score: overlap(article, a) }))
    .sort((x, y) => y.score - x.score || x.a.slug.localeCompare(y.a.slug))
  for (const { a } of rest) push(a)

  return picked
}

/** 分类页用：某分类下的文章（无则有空数组） */
export function articlesInCategory(slug: string): Article[] {
  return articles.filter((a) => a.category === slug)
}

/** 落地页/属相页用：按 slug 优先取，缺失则跳过（防某篇被删导致 500） */
export function pickBySlug(slugs: string[]): Article[] {
  return slugs
    .map((s) => articles.find((a) => a.slug === s))
    .filter((a): a is Article => Boolean(a))
}

/** 取前 N 个分类（含文章数），落地页入口用 */
export function categoriesWithCount(limit = ARTICLE_CATEGORIES.length) {
  return ARTICLE_CATEGORIES
    .slice(0, limit)
    .map((c) => ({ ...c, count: articlesInCategory(c.slug).length }))
}

/**
 * 属相页的「相關命理知識」入口：优先命理基础类文章，再兜底前 4 篇。
 * ★ 不用随机，否则每次构建的 HTML 都不同。
 */
export const SHENGXIAO_ARTICLE_SLUGS = [
  'shenme-shi-bazi',
  'shenwang-shenruo-zenme-panduan',
  'wuxing-queshenme-zenmebu',
  'shishang-ge',
] as const

/** 流年页的「延伸閱讀」：流年方法论 + 犯太岁安置（有则链，没有就不链） */
export const LIUNIAN_ARTICLE_SLUGS = [
  'liunian-zenme-kan',
  '2027-fantaishui',
  '2027-dingwei-nian-yunshi',
] as const
