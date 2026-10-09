import type { Metadata } from 'next'

// page.tsx 为 'use client' 不能导出 metadata，由本服务端 layout 提供
export const metadata: Metadata = {
  title: '八字排盘结果：四柱十神大运流年详解',
  description: '在线八字排盘结果页：四柱干支、十神、藏干、旺衰格局、大运流年一览，并可选配 AI 命书深度解读。',
}

export default function ChartLayout({ children }: { children: React.ReactNode }) {
  return children
}
