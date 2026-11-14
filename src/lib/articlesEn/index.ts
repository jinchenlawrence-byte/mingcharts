// 英文文章库聚合入口
//
// 为什么按分类拆文件：每篇正文都是完整翻译（不是摘要），单文件会膨胀到几十万字符，
// 也不利于分批评审。分类文件名与简体 ARTICLE_CATEGORIES 的 slug 一一对应。
import type { ArticleCategorySlug, ArticleEn } from './types'
import { baziEn } from './bazi'
import { shishenEn } from './shishen'
import { gejuEn } from './geju'
import { wuxingEn } from './wuxing'
import { shenshaEn } from './shensha'
import { hemunEn } from './hemun'
import { ziweiEn } from './ziwei'
import { liunianEn } from './liunian'

/** 与简体 ARTICLE_CATEGORIES 同序同名位；name 为英文分类名 */
export const ARTICLE_CATEGORIES_EN: { slug: ArticleCategorySlug; name: string }[] = [
  { slug: 'bazi', name: 'Bazi Basics' },
  { slug: 'shishen', name: 'The Ten Gods' },
  { slug: 'geju', name: 'Chart Patterns' },
  { slug: 'wuxing', name: 'Five Elements & Stems' },
  { slug: 'shensha', name: 'Shensha Stars' },
  { slug: 'hemun', name: 'Bazi Compatibility' },
  { slug: 'ziwei', name: 'Zi Wei Dou Shu' },
  { slug: 'liunian', name: 'Annual Fortune' },
]

export const articlesEn: ArticleEn[] = [
  ...baziEn,
  ...shishenEn,
  ...gejuEn,
  ...wuxingEn,
  ...shenshaEn,
  ...hemunEn,
  ...ziweiEn,
  ...liunianEn,
]

/** 分类页导语：英文原创说明，与简体同名分类一一对应 */
export const CATEGORY_INTRO_EN: Record<ArticleCategorySlug, string> = {
  bazi:
    'Bazi (Eight Characters) is the core of Chinese destiny analysis: a birth moment written as four pillars of Heavenly Stems and Earthly Branches. These guides walk through how a chart is cast, how strength is judged, and how the reading is layered.',
  shishen:
    'The Ten Gods describe how every other character in a chart relates to the Day Master — the role it plays in a life. Each of the ten has a distinct logic for character, career, money and relationships.',
  geju:
    'A chart pattern is the structural skeleton of a reading: which role dominates, whether it is supported or broken, and what kind of life the structure tends to produce. These articles explain the classical patterns one by one.',
  wuxing:
    'The Five Elements and the Heavenly Stems are the alphabet of Bazi. Understanding how Wood, Fire, Earth, Metal and Water generate and control one another is what makes the rest of the system readable.',
  shensha:
    'Shensha are the auxiliary stars of classical Bazi — nobles, peach blossom, travelling horse, canopy and dozens more. These guides give the lookup rules, the traditional meanings, and the limits of what each star can tell you.',
  hemun:
    'Bazi compatibility compares two charts to read a relationship: the spouse palace, the two Day Masters, and the spouse star. It is a structural comparison, not a verdict on whether a couple should stay together.',
  ziwei:
    'Zi Wei Dou Shu is a separate star-based system that maps a birth moment onto twelve palaces. This guide explains what the system is, how it differs from Bazi, and how a chart is read.',
  liunian:
    'Annual fortune reads the year against the chart: the Annual Pillar, its clashes and combinations with the natal chart, and the Tai Sui relationship. These articles cover both method and the specific year ahead.',
}

const bySlug = new Map(articlesEn.map((a) => [a.slug, a]))

export function getArticleEn(slug: string): ArticleEn | undefined {
  return bySlug.get(slug)
}

export function categoryNameEn(slug: ArticleCategorySlug): string {
  return ARTICLE_CATEGORIES_EN.find((c) => c.slug === slug)?.name ?? ''
}

export function articlesInCategoryEn(slug: ArticleCategorySlug): ArticleEn[] {
  return articlesEn.filter((a) => a.category === slug)
}
