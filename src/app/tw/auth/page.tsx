import type { Metadata } from 'next'
import HantAuthClient from './Client'
import { hantAlternates } from '@/lib/hant-seo'

// 登入／註冊（繁體）—— metadata 由伺服器頁提供。
export const metadata: Metadata = {
  title: '登入 / 註冊',
  description: '登入明理帳號，保存命盤與命書報告，隨時回看。',
  alternates: { canonical: '/tw/auth', languages: hantAlternates('/auth') },
  robots: { index: false, follow: true },
}

export default function HantAuthPage() {
  return <HantAuthClient />
}
