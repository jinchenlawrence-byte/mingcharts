import type { MetadataRoute } from 'next'
import { articles, ARTICLE_CATEGORIES } from '@/lib/articles'
import { SHENGXIAO, LIUNIAN_YEARS } from '@/lib/shengxiaoData'
import { JIEQI } from '@/lib/jieqiData'
import { JIERI } from '@/lib/jieriData'

// 与 robots.ts 同一口径：环境变量缺失或为 localhost 时回退正式域名，绝不把 localhost 交给爬虫。
const RAW_URL = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || ''
const BASE_URL = RAW_URL && !RAW_URL.includes('localhost') ? RAW_URL.replace(/\/$/, '') : 'https://www.mingcharts.com'

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()

  // 固定页面
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${BASE_URL}/bazi`, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${BASE_URL}/article`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE_URL}/shengxiao`, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${BASE_URL}/jieqi`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE_URL}/jieri`, changeFrequency: 'yearly', priority: 0.6 },
    // 工具型入口页（表单即内容）：搜索「合婚/紫微/年运/方位」时可直接落地
    { url: `${BASE_URL}/hemun`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE_URL}/ziwei`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE_URL}/liunian`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE_URL}/geo`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE_URL}/daily`, changeFrequency: 'daily', priority: 0.7 }
  ]

  // 节气节日页：24节气 + 10节日
  const seasonPages: MetadataRoute.Sitemap = [
    ...JIEQI.map(j => ({
      url: `${BASE_URL}/jieqi/${j.slug}`,
      changeFrequency: 'yearly' as const,
      priority: 0.6
    })),
    ...JIERI.map(j => ({
      url: `${BASE_URL}/jieri/${j.slug}`,
      changeFrequency: 'yearly' as const,
      priority: 0.6
    }))
  ]

  // 生肖页：12总览 + 96流年
  const shengxiaoPages: MetadataRoute.Sitemap = [
    ...SHENGXIAO.map(s => ({
      url: `${BASE_URL}/shengxiao/${s.slug}`,
      changeFrequency: 'monthly' as const,
      priority: 0.8
    })),
    ...SHENGXIAO.flatMap(s =>
      LIUNIAN_YEARS.map(y => ({
        url: `${BASE_URL}/shengxiao/${s.slug}/${y}`,
        changeFrequency: 'yearly' as const,
        priority: 0.7
      }))
    )
  ]

  // 出生日期聚合页（1950-2010 年/月）
  // 注：不再收录 /bazi/{y}/{m}/{d} 每日页（约 2.2 万条薄内容，已设为 noindex），
  // 只保留年、月两级聚合页，避免 sitemap 被大量低质 URL 稀释。
  const baziPages: MetadataRoute.Sitemap = []
  for (let y = 1950; y <= 2010; y++) {
    baziPages.push({
      url: `${BASE_URL}/bazi/${y}`,
      changeFrequency: 'yearly',
      priority: 0.6
    })
    for (let m = 1; m <= 12; m++) {
      const mm = String(m).padStart(2, '0')
      baziPages.push({
        url: `${BASE_URL}/bazi/${y}/${mm}`,
        changeFrequency: 'yearly',
        priority: 0.5
      })
    }
  }

  // 文章分类页与文章页
  const articlePages: MetadataRoute.Sitemap = [
    ...ARTICLE_CATEGORIES.map(c => ({
      url: `${BASE_URL}/article/${c.slug}`,
      changeFrequency: 'weekly' as const,
      priority: 0.7
    })),
    ...articles.map(a => ({
      url: `${BASE_URL}/article/${a.slug}`,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
      lastModified: now
    }))
  ]

  return [...staticPages, ...seasonPages, ...shengxiaoPages, ...baziPages, ...articlePages]
}
