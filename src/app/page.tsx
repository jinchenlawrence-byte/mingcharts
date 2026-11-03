import type { Metadata } from 'next'
import HomeClient from './HomeClient'
import { triAlternates } from '@/lib/lang'

// 首頁：page.tsx 只做 metadata（客戶端組件不能導出 metadata），表單在 HomeClient。
export const metadata: Metadata = {
  title: 'Free Bazi Chart · Four Pillars of Destiny',
  description:
    'Free Four Pillars of Destiny (Bazi) chart: Ten Gods, Hidden Stems, Luck Pillars and Annual Pillars in one view, plus a full-length Fate Book and Zi Wei Dou Shu, synastry and geomancy readings.',
  alternates: { canonical: '/', languages: triAlternates('/') },
}

export default function HomePage() {
  return <HomeClient />
}
