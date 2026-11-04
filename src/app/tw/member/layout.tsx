import type { Metadata } from 'next'
import { hantAlternates } from '@/lib/hant-seo'

export const metadata: Metadata = {
  title: '會員中心',
  description: '查看明理會員狀態並管理訂閱。',
  alternates: { canonical: '/tw/member', languages: hantAlternates('/member') },
  robots: { index: false, follow: true },
}

export default function HantMemberLayout({ children }: { children: React.ReactNode }) {
  return children
}
