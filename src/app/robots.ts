import type { MetadataRoute } from 'next'

// 线上必须给搜索引擎可抓的绝对地址：环境变量若缺失或仍是 localhost，一律回退正式域名。
// 否则 robots/sitemap 会把 localhost 交给爬虫，导致整站无法被收录。
const RAW_URL = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || ''
const BASE_URL = RAW_URL && !RAW_URL.includes('localhost') ? RAW_URL.replace(/\/$/, '') : 'https://www.mingcharts.com'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // ★ 2026-11-05：日页（/bazi/{year}/{MM}/{DD}，约 2.2 万条）已是 noindex，
      //   但 noindex 只阻止「收录」，不阻止「抓取」——爬虫会顺着月页的日页链接抓一遍，
      //   而日页是 force-dynamic，每抓一次就 SSR 渲染一次，直接烧 Fluid Active CPU
      //   （Hobby 仅 4h / 滚动 30 天，超了会暂停项目）。故补 disallow：
      //   零 SEO 损失（本来就不收录），换来爬虫不再触发渲染。
      disallow: ['/api/', '/charts', '/auth', '/bazi/*/*/*']
    },
    sitemap: `${BASE_URL}/sitemap.xml`
  }
}
