import type { Metadata } from 'next'
import HantChartClient from './Client'
import { triAlternates } from '@/lib/lang'

// 排盤結果（繁體）—— metadata 由伺服器頁提供；結果頁本身讀 localStorage。
export const metadata: Metadata = {
  title: '八字命盤 · 四柱十神 · 大運流年',
  description:
    '八字排盤結果：四柱干支、十神、藏干、十二長生、神煞、空亡、五行分布、格局旺衰、胎元命宮與九步大運；可解鎖萬字命書詳批。',
  alternates: { canonical: '/tw/chart', languages: triAlternates('/chart') },
}

export default function HantChartPage() {
  return <HantChartClient />
}
