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
      // ★ 2026-11-05（修正）：日页【不要】在这里 Disallow。
      //   原因：日页本身是 noindex。若 robots 挡住抓取，Google 就读不到那个 noindex，
      //   已收录的 URL 会长期卡在「已编入索引，但被 robots.txt 屏蔽」这个最难清理的状态。
      //   正确顺序是：先让 noindex 被读到、页面干净退出索引。省 CPU 靠 ISR，不靠 robots。
      disallow: ['/api/', '/charts', '/auth']
    },
    sitemap: `${BASE_URL}/sitemap.xml`
  }
}
