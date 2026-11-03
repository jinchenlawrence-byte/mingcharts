import type { Metadata } from 'next'
import EnChartClient from './Client'
import { triAlternates } from '@/lib/lang'

// 英文排盤結果—— metadata 由伺服器頁提供；結果讀 localStorage。
export const metadata: Metadata = {
  title: 'Bazi chart · Four Pillars, Ten Gods & Luck Pillars',
  description:
    'Your Bazi chart: four pillars, Ten Gods, Hidden Stems, Five Elements, strength and structure, palaces and Luck Pillars, with a free English Fate Book preview.',
  alternates: { canonical: '/en/chart', languages: triAlternates('/chart') },
}

export default function EnChartPage() {
  return <EnChartClient />
}
