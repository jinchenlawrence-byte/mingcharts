import type { Metadata } from 'next'

// page.tsx 为 'use client' 不能导出 metadata，由本服务端 layout 提供
export const metadata: Metadata = {
  title: '会员中心：日运、流月、交运与古籍命例对照',
  description: '登录并保存命盘后，查看个性化日运、流月提示、交运提醒、历史日运回看与相似古籍命例对照等会员专属内容。',
}

export default function MemberLayout({ children }: { children: React.ReactNode }) {
  return children
}
