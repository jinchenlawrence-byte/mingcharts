import type { Metadata } from 'next'
import HantChartsClient from './Client'
import { hantAlternates } from '@/lib/hant-seo'

// 我的命盤（繁體）—— metadata 由伺服器頁提供；列表需登入。
export const metadata: Metadata = {
  title: '我的命盤 · 已保存的八字命盤',
  description: '登入後查看已保存的八字命盤，隨時回看四柱、十神、大運與命書報告。',
  alternates: { canonical: '/tw/charts', languages: hantAlternates('/charts') },
  robots: { index: false, follow: true },
}

export default function HantChartsPage() {
  return <HantChartsClient />
}
