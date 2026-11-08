import type { MetadataRoute } from 'next'
import { articles, ARTICLE_CATEGORIES } from '@/lib/articles'
import { SHENGXIAO, LIUNIAN_YEARS } from '@/lib/shengxiaoData'
import { JIEQI } from '@/lib/jieqiData'
import { JIERI } from '@/lib/jieriData'

// 与 robots.ts 同一口径：环境变量缺失或为 localhost 时回退正式域名，绝不把 localhost 交给爬虫。
const RAW_URL = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || ''
const BASE_URL = RAW_URL && !RAW_URL.includes('localhost') ? RAW_URL.replace(/\/$/, '') : 'https://www.mingcharts.com'

/**
 * ★ 2026-11 收录整治：732 个月页（/bazi/{year}/{MM}）暂缓提交 sitemap。
 *
 * 这些页面本身仍然 200、仍然可索引（不是 noindex），只是先不主动提交，
 * 让 Google 先把抓取预算集中在 61 个已补独有内容的年页上。
 * 等 GSC 中年页的「已编入索引 / 抓取请求」数据稳定后，再决定是否把此开关打开。
 * 恢复提交只需要把 false 改成 true，不要顺手删掉这段注释。
 */
export const INCLUDE_BAZI_MONTHLY_IN_SITEMAP = false

export default function sitemap(): MetadataRoute.Sitemap {
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
    // 可引用资产页：12 生肖 × 8 年太岁对照表（第 33 轮新增，写得流年文的人会引这张表）
    { url: `${BASE_URL}/liunian/taisui-biao`, changeFrequency: 'yearly', priority: 0.7 },
    // 2027 丁未年落地页（第 35 轮）：窗口期主落地页，春节前搜索高峰集中在这里
    { url: `${BASE_URL}/liunian/2027`, changeFrequency: 'monthly', priority: 0.9 },
    // 2028 戊申年落地页（第 36 轮）：GSC 实测 2028 生肖页已在拿点击，补 hub 收口
    { url: `${BASE_URL}/liunian/2028`, changeFrequency: 'monthly', priority: 0.9 },
    // 神煞总目录（第 36 轮）：53 个查法一页看完 —— 命理师会收藏的工具页
    { url: `${BASE_URL}/shensha`, changeFrequency: 'monthly', priority: 0.8 },
    // 免費查神煞（第 36 輪）：C 端免費鉤子，承接社媒與搜索的衝動流量
    { url: `${BASE_URL}/shensha/check`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE_URL}/geo`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE_URL}/daily`, changeFrequency: 'daily', priority: 0.7 },
    // 简体侧核心商业页此前缺席 sitemap（繁体/英文侧都已提交），补上以保证三棵树对等。
    { url: `${BASE_URL}/mingshu`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE_URL}/pricing`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE_URL}/terms`, changeFrequency: 'yearly', priority: 0.4 },
    { url: `${BASE_URL}/privacy`, changeFrequency: 'yearly', priority: 0.4 }
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
  // 注：不再收录 /bazi/{y}/{m}/{d} 每日页（约 2.2 万条薄内容，已设为 noindex）。
  // 月页（732 条）仍可访问、可索引，只是暂不从 sitemap 提交，避免稀释年页权重。
  const baziPages: MetadataRoute.Sitemap = []
  for (let y = 1950; y <= 2010; y++) {
    baziPages.push({
      url: `${BASE_URL}/bazi/${y}`,
      changeFrequency: 'yearly',
      priority: 0.6
    })
    if (INCLUDE_BAZI_MONTHLY_IN_SITEMAP) {
      for (let m = 1; m <= 12; m++) {
        const mm = String(m).padStart(2, '0')
        baziPages.push({
          url: `${BASE_URL}/bazi/${y}/${mm}`,
          changeFrequency: 'yearly',
          priority: 0.5
        })
      }
    }
  }

  // 文章分类页与文章页
  const articlePages: MetadataRoute.Sitemap = [
    ...ARTICLE_CATEGORIES.map(c => ({
      url: `${BASE_URL}/article/${c.slug}`,
      changeFrequency: 'weekly' as const,
      priority: 0.7
    })),
    // 文章数据没有真实发布/修改时间；此前用请求时刻作 lastmod 会每次变化，
    // Google 会判定该字段不可信并整体忽略。宁可省略。
    ...articles.map(a => ({
      url: `${BASE_URL}/article/${a.slug}`,
      changeFrequency: 'monthly' as const,
      priority: 0.8
    }))
  ]

  // 繁体树（/tw）：方案 C 第一版只镜像生肖常青页 + 落地页（详见 docs/推广-繁体化改造清单.md）
  // ★ 与简体页一一对应，hreflang 双向；不要在这里放未镜像的路径（会出现「声明了但没有页」）
  const hantPages: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/tw`, changeFrequency: 'monthly', priority: 0.8 },
    // 繁體工具／內容頁（與簡體同名路由一一對應，hreflang 雙向）
    // ★ 帳戶／交易頁（/tw/auth、/tw/charts、/tw/reports、/tw/chart）不進 sitemap（noindex）
    { url: `${BASE_URL}/tw/hemun`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE_URL}/tw/ziwei`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE_URL}/tw/geo`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE_URL}/tw/mingshu`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE_URL}/tw/mingshu/demo`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE_URL}/tw/daily`, changeFrequency: 'daily', priority: 0.7 },
    { url: `${BASE_URL}/tw/pricing`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE_URL}/tw/terms`, changeFrequency: 'yearly', priority: 0.4 },
    { url: `${BASE_URL}/tw/privacy`, changeFrequency: 'yearly', priority: 0.4 },
    // 節氣 / 節日（繁體）：與簡體同名路由一一對應（24 + 10 + 2 個索引）
    { url: `${BASE_URL}/tw/jieqi`, changeFrequency: 'monthly', priority: 0.7 },
    ...JIEQI.map(j => ({
      url: `${BASE_URL}/tw/jieqi/${j.slug}`,
      changeFrequency: 'yearly' as const,
      priority: 0.6,
    })),
    { url: `${BASE_URL}/tw/jieri`, changeFrequency: 'yearly', priority: 0.6 },
    ...JIERI.map(j => ({
      url: `${BASE_URL}/tw/jieri/${j.slug}`,
      changeFrequency: 'yearly' as const,
      priority: 0.6,
    })),
    { url: `${BASE_URL}/tw/shengxiao`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE_URL}/tw/liunian`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE_URL}/tw/liunian/taisui-biao`, changeFrequency: 'yearly', priority: 0.7 },
    // 2027 丁未年落地页（繁体，第 35 轮）：台湾／香港的搜索高峰在 12 月中到 1 月底
    { url: `${BASE_URL}/tw/liunian/2027`, changeFrequency: 'monthly', priority: 0.9 },
    // 2028 戊申年落地页（繁體，第 36 轮）：与 2027 同级，2028 生肖页的权重向此收口
    { url: `${BASE_URL}/tw/liunian/2028`, changeFrequency: 'monthly', priority: 0.9 },
    // 神煞總目錄（繁體，第 36 輪）
    { url: `${BASE_URL}/tw/shensha`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE_URL}/tw/shensha/check`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE_URL}/tw/partners`, changeFrequency: 'monthly', priority: 0.7 },
    ...SHENGXIAO.map(s => ({
      url: `${BASE_URL}/tw/shengxiao/${s.slug}`,
      changeFrequency: 'monthly' as const,
      priority: 0.8
    })),
    // 繁体流年页（96 页）：与简体 /shengxiao/<属相>/<年> 一一对应
    ...SHENGXIAO.flatMap(s =>
      LIUNIAN_YEARS.map(y => ({
        url: `${BASE_URL}/tw/shengxiao/${s.slug}/${y}`,
        changeFrequency: 'yearly' as const,
        priority: 0.7
      }))
    ),
    // 繁体文章库：索引 + 分类 + 全部文章（与简体 /article/* 一一对应）
    { url: `${BASE_URL}/tw/article`, changeFrequency: 'weekly', priority: 0.8 },
    ...ARTICLE_CATEGORIES.map(c => ({
      url: `${BASE_URL}/tw/article/${c.slug}`,
      changeFrequency: 'weekly' as const,
      priority: 0.7
    })),
    ...articles.map(a => ({
      url: `${BASE_URL}/tw/article/${a.slug}`,
      changeFrequency: 'monthly' as const,
      priority: 0.7
    }))
  ]

  // 英文樹（/en）：英文首页、排盘结果、价目、命书介绍、年运入口、条款/隐私；登录页 noindex 不收录。
  // 合婚 / 紫微 / 方位已有英文入口页，但交互表单暂走中文版（页面内已注明）。
  const enPages: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/en`, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${BASE_URL}/en/chart`, changeFrequency: 'monthly', priority: 0.7 },
    // 英文生肖：索引 + 12 属相页（与 /shengxiao、/tw/shengxiao 一一对应，hreflang 三向）
    { url: `${BASE_URL}/en/shengxiao`, changeFrequency: 'monthly', priority: 0.8 },
    ...SHENGXIAO.map(s => ({
      url: `${BASE_URL}/en/shengxiao/${s.slug}`,
      changeFrequency: 'monthly' as const,
      priority: 0.8
    })),
    // 我的命盘（英文）：需登录，低优先级提交；与 /charts、/tw/charts 互指
    { url: `${BASE_URL}/en/charts`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/en/pricing`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE_URL}/en/mingshu`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE_URL}/en/liunian`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE_URL}/en/hemun`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE_URL}/en/ziwei`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE_URL}/en/geo`, changeFrequency: 'monthly', priority: 0.7 },
    // 英文每日日签：2026-11-09 补齐，与 /daily、/tw/daily hreflang 三向互指
    { url: `${BASE_URL}/en/daily`, changeFrequency: 'daily', priority: 0.7 },
    { url: `${BASE_URL}/en/terms`, changeFrequency: 'yearly', priority: 0.4 },
    { url: `${BASE_URL}/en/privacy`, changeFrequency: 'yearly', priority: 0.4 },
  ]

  // 伙伴招募（白标 v1）：独立于内容页，优先级低但它必须可被搜到
  const partnerPages: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/partners`, changeFrequency: 'monthly', priority: 0.6 },
  ]

  return [...staticPages, ...seasonPages, ...shengxiaoPages, ...baziPages, ...articlePages, ...hantPages, ...enPages, ...partnerPages]
}
