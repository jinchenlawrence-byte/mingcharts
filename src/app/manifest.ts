import type { MetadataRoute } from 'next'

// PWA manifest（Next 元数据路由 → /manifest.webmanifest）
// 配色与站点一致：宣纸底 #FAF7F2、朱砂主题色 #A62B1F
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '明理 · 免费八字排盘与命书详批',
    short_name: '明理',
    description:
      '专业八字命理平台：免费四柱排盘、十神格局分析，命书报告万字详批；订阅会员每日收到日运更新提醒。',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    lang: 'zh-CN',
    dir: 'ltr',
    background_color: '#FAF7F2',
    theme_color: '#A62B1F',
    icons: [
      { src: '/pwa/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/pwa/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/pwa/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
