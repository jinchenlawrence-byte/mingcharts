import type { Metadata, Viewport } from 'next'

// 多 root layout 的公共 metadata。
// 以前这些字段挂在 app/layout.tsx，全站继承；拆成三个 root layout 后必须各自显式带上，
// 否则 /tw、/en 会丢 metadataBase / manifest / OG 图。

// ★ 与 sitemap.ts 同样的兜底：本地/预览环境若把 NEXT_PUBLIC_APP_URL 设成 localhost，
//   这里会把它变成全站 canonical / og:url 的域名 —— 这是最伤收录的一类事故。
const RAW_APP_URL = process.env.NEXT_PUBLIC_APP_URL
export const siteMetadataBase = new URL(
  RAW_APP_URL && !RAW_APP_URL.includes('localhost') ? RAW_APP_URL : 'https://www.mingcharts.com',
)

export const siteViewport: Viewport = {
  themeColor: '#A62B1F',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

// ★ 不在这里写死 title / description：
//   layout 级 openGraph 一旦带 title，子页的 og:title 会被永久钉成这段简体文案，
//   /en、/tw 页面于是在社交分享里显示中文简体标题（与页面语言、hreflang 打架）。
//   留空后由 Next 按每页 metadata.title / description 回填，三棵树各自正确。
export const sharedOpenGraph = {
  siteName: '明理 mingcharts.com',
  type: 'website' as const,
  images: [{ url: '/og.png', width: 1200, height: 630, alt: 'MingCharts 明理' }],
}

export const sharedMetadata: Metadata = {
  metadataBase: siteMetadataBase,
  manifest: '/manifest.webmanifest',
  openGraph: sharedOpenGraph,
  twitter: {
    card: 'summary_large_image',
    images: ['/og.png'],
  },
}
