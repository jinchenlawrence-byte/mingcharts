import type { Metadata } from 'next'
import HomeClient from './HomeClient'
import { triAlternates } from '@/lib/lang'

// 首頁：page.tsx 只做 metadata（客戶端組件不能導出 metadata），表單在 HomeClient。
export const metadata: Metadata = {
  title: '明理 - 免费八字排盘与命书详批',
  description:
    '免费四柱排盘：十神、藏干、起运一次看全，另有万字命书与紫微斗数、合婚、方位解读。',
  alternates: { canonical: '/', languages: triAlternates('/') },
}

export default function HomePage() {
  return <HomeClient />
}
