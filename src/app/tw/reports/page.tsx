import type { Metadata } from 'next'
import HantReportsClient from './Client'
import { hantAlternates } from '@/lib/hant-seo'

// 我的報告（繁體）—— metadata 由伺服器頁提供；列表需登入。
export const metadata: Metadata = {
  title: '我的報告 · 合婚 · 紫微 · 地理 · 年運',
  description: '登入後查看已生成的合婚、紫微、地理、年運報告與已購命書，隨時回看。',
  alternates: { canonical: '/tw/reports', languages: hantAlternates('/reports') },
  robots: { index: false, follow: true },
}

export default function HantReportsPage() {
  return <HantReportsClient />
}
