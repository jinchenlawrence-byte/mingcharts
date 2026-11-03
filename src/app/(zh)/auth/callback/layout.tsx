import type { Metadata } from 'next'

// page.tsx 为 'use client' 不能导出 metadata，由本服务端 layout 提供
export const metadata: Metadata = {
  title: '邮箱验证',
  description: '正在验证邮箱链接，验证通过后即可进入明理。',
}

export default function AuthCallbackLayout({ children }: { children: React.ReactNode }) {
  return children
}
