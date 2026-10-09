import type { Metadata } from 'next'

// page.tsx 为 'use client' 不能导出 metadata，由本服务端 layout 提供
export const metadata: Metadata = {
  title: '报告详情：完整报告内容回看',
  description: '查看已保存报告的完整内容：合婚详批、紫微深度、地理方位、年运流年详批，随时反复回看。',
}

export default function ReportDetailLayout({ children }: { children: React.ReactNode }) {
  return children
}
