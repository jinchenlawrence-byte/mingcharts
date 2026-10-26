import type { Metadata } from 'next'

// page.tsx 为 'use client' 不能导出 metadata，由本服务端 layout 提供。
// ★ 伙伴工作台是内部工具页：不进搜索索引。
export const metadata: Metadata = {
  title: '伙伴工作台：合作命理师自助出报告',
  description: '合作命理师登录后自助生成命书与合婚报告，使用剩余额度、复制分享链接。',
  robots: { index: false, follow: false },
}

export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  return children
}
