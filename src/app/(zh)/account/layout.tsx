import type { Metadata } from 'next'

// page.tsx 为 'use client' 不能导出 metadata，由本服务端 layout 提供
export const metadata: Metadata = {
  title: '账号设置',
  description: '查看登录邮箱并修改账号密码。',
}

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return children
}
