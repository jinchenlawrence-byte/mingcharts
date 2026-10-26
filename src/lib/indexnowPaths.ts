// IndexNow 默认提交集合（纯函数，单一数据源＝articles.ts + 硬编码路由树）
//
// 为什么要有这个模块（2026-10-23 第 30 轮）：
//   旧 scripts/indexnow.mjs 的 DEFAULT_PATHS 是手工维护的路径列表 —— 新增文章不会自动进去，
//   第 29 轮的 haiwai-chusheng-paipan 就漏了，只能人工补提交。
//   本模块把「哪些 URL 该通知」改成从文章库派生：新增文章＝自动进入提交队列，是结构保证而非纪律。
// ★ 纪律：只做拼装，不读文件系统、不读 .next、不跑 git、不发网络请求。
//   默认集合与真实 URL 树的一致性由 scripts/test-indexnow.mjs 守护（离线）。
import { articles, ARTICLE_CATEGORIES } from './articles'

export const INDEXNOW_BASE = 'https://www.mingcharts.com'

/** 12 生肖 slug（与 /shengxiao/<animal>/<year> 路由一致；顺序固定，便于 diff） */
export const INDEXNOW_ANIMALS = [
  'shu', 'niu', 'hu', 'tu', 'long', 'she', 'ma', 'yang', 'hou', 'ji', 'gou', 'zhu'
] as const

/** 默认通知的流年页年份（年底至春节的「来年运势」窗口） */
export const INDEXNOW_LIUNIAN_YEAR = 2027

/** 核心入口（简体 4 条 + 繁体 3 条，顺序固定）
 *  ★ 繁体侧没有流年索引页：/tw/liunian 线上 404，第 31 轮已剔除（勿补回，除非该页真的上线）。 */
const CORE_PATHS = [
  '/', '/partners', '/shengxiao', '/liunian',
  '/tw', '/tw/partners', '/tw/shengxiao'
]

/** 结构化的最小入参：只要 slug，便于测试注入假数据做牙口自检 */
export interface IndexnowSlugItem { slug: string }

/**
 * 拼装默认集合（绝对 URL，已去重）。
 * @param articleList    默认 articles（可注入假数据，供测试验证「少一篇文章会红」）
 * @param categoryList   默认 ARTICLE_CATEGORIES
 */
export function buildIndexnowPaths(
  articleList: ReadonlyArray<IndexnowSlugItem>,
  categoryList: ReadonlyArray<IndexnowSlugItem>
): string[] {
  const paths = [
    ...CORE_PATHS,
    // 文章：简体 + 繁体（繁体侧此前从未被主动通知，全靠 sitemap 被动发现）
    ...articleList.flatMap((a) => [`/article/${a.slug}`, `/tw/article/${a.slug}`]),
    // 分类：只从 ARTICLE_CATEGORIES 取，不塞不存在的 URL
    ...categoryList.flatMap((c) => [`/article/${c.slug}`, `/tw/article/${c.slug}`]),
    // 生肖树：12 × 2027，简繁各一条
    ...INDEXNOW_ANIMALS.flatMap((a) => [
      `/shengxiao/${a}/${INDEXNOW_LIUNIAN_YEAR}`,
      `/tw/shengxiao/${a}/${INDEXNOW_LIUNIAN_YEAR}`
    ])
  ]
  // 去重：同一路径只保留首次出现（顺序因此仍是核心→文章→分类→生肖）
  return [...new Set(paths)].map((p) => `${INDEXNOW_BASE}${p}`)
}

/** 生产入口：直接使用文章库与分类表的当前值 */
export function indexnowDefaultPaths(): string[] {
  return buildIndexnowPaths(articles, ARTICLE_CATEGORIES)
}
