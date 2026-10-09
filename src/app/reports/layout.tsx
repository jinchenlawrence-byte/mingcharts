import type { Metadata } from 'next'

// page.tsx 为 'use client' 不能导出 metadata，由本服务端 layout 提供
export const metadata: Metadata = {
  title: '我的报告：已保存的命理报告资产',
  description: '登录后查看与管理已生成的付费报告：合婚详批、紫微深度、地理方位、年运报告，随时回看完整内容。',
}

export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  return children
}
