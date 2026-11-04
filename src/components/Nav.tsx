'use client'

// 简体树的导航入口（保留原文件名，供 (zh) 下各页 <Nav /> 调用）
//
// 2026-11-04 统一第一批：真正的实现在 SiteHeader（三棵树共用，接 locale）。
// 本文件只是“简体树传 locale=zh-Hans”的一行接线，不再维护任何链接清单。

import SiteHeader from '@/components/SiteHeader'

export default function Nav() {
  return <SiteHeader locale="zh-Hans" />
}
