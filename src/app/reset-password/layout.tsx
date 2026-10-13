import type { Metadata } from 'next'

// page.tsx 为 'use client' 不能导出 metadata，由本服务端 layout 提供
export const metadata: Metadata = {
  title: '设置新密码',
  description: '通过邮件重置链接设置新密码。',
}

export default function ResetPasswordLayout({ children }: { children: React.ReactNode }) {
  return children
}
