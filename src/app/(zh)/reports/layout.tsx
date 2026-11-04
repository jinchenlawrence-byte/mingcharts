import type { Metadata } from 'next'
import { hantAlternates } from '@/lib/hant-seo'

// page.tsx 为 'use client' 不能导出 metadata，由本服务端 layout 提供
export const metadata: Metadata = {
  title: '我的报告：已保存的命理报告资产',
  description: '登录后查看与管理已生成的付费报告：合婚详批、紫微深度、地理方位、年运报告，随时回看完整内容。',
  alternates: { canonical: '/reports', languages: hantAlternates('/reports') },
  // 登录后页面：不进索引（内容依赖账号，对爬虫是空壳）。/tw 侧此前已设，简繁英三边统一。
  robots: { index: false, follow: true },
}

export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  return children
}
