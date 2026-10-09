import type { Metadata } from 'next'

// page.tsx 为 'use client' 不能导出 metadata，由本服务端 layout 提供
export const metadata: Metadata = {
  title: '登录 / 注册',
  description: '登录或注册账号，保存命盘、查看已购命书报告与会员权益。',
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children
}
