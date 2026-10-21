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
      disallow: ['/api/', '/charts', '/auth']
    },
    sitemap: `${BASE_URL}/sitemap.xml`
  }
}
