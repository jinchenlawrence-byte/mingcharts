import type { Metadata, Viewport } from 'next'

// 多 root layout 的公共 metadata。
// 以前这些字段挂在 app/layout.tsx，全站继承；拆成三个 root layout 后必须各自显式带上，
// 否则 /tw、/en 会丢 metadataBase / manifest / OG 图。

export const siteMetadataBase = new URL(
  process.env.NEXT_PUBLIC_APP_URL || 'https://www.mingcharts.com',
)

export const siteViewport: Viewport = {
  themeColor: '#A62B1F',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export const sharedOpenGraph = {
  title: '明理 · 免费八字排盘，一眼就看懂',
  description:
    '免费生成四柱命盘，十神、藏干、起运一次看全。想再深一步，万字命书引经据典，也说人话。',
  siteName: '明理 mingcharts.com',
  type: 'website' as const,
  images: [{ url: '/og.png', width: 1200, height: 630, alt: '明理 · 免费八字排盘' }],
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
