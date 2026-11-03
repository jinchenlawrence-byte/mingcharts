import type { Metadata } from 'next'
import { hantAlternates } from '@/lib/hant-seo'

export const metadata: Metadata = {
  title: '帳戶設定',
  description: '管理明理帳號的密碼與登入狀態。',
  alternates: { canonical: '/tw/account', languages: hantAlternates('/account') },
}

export default function HantAccountLayout({ children }: { children: React.ReactNode }) {
  return children
}
