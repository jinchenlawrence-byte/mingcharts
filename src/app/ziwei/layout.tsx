import type { Metadata } from 'next'

// page.tsx 为 'use client' 不能导出 metadata，由本服务端 layout 提供
export const metadata: Metadata = {
  title: '紫微斗数排盘：十四主星四化与十二宫详解',
  description: '在线紫微斗数命盘：十二宫星曜、庙旺落陷、生年四化、大限流年与格局标签，附 AI 深度解读与规则版兜底。',
}

export default function ZiweiLayout({ children }: { children: React.ReactNode }) {
  return children
}
