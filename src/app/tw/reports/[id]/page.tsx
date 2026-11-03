import type { Metadata } from 'next'
import HantReportDetailClient from './Client'
import { hantAlternates } from '@/lib/hant-seo'

// 報告詳情（繁體）—— metadata 由伺服器頁提供；需登入且受 RLS 限制。
export const metadata: Metadata = {
  title: '報告詳情',
  description: '查看你的合婚、紫微、地理、年運報告與命書全文。',
  alternates: { canonical: '/tw/reports', languages: hantAlternates('/reports') },
  robots: { index: false, follow: true },
}

export default function HantReportDetailPage() {
  return <HantReportDetailClient />
}
