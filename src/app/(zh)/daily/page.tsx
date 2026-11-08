import type { Metadata } from 'next'
import Nav from '@/components/Nav'
import DailyView from '@/components/daily/DailyView'
import { triAlternates } from '@/lib/lang'

export const metadata: Metadata = {
  title: '每日日签：今日干支与一省之语',
  description:
    '每天一签，按当日干支取历法意象，给自己一面自省的小镜子。日签按所在时区归日，晚子时（23:00）起算次日。',
  alternates: { canonical: '/daily', languages: triAlternates('/daily') },
}

// 每日日签：三语共用 components/daily/DailyView（2026-11-09 收敛）
export default async function DailyPage({
  searchParams,
}: {
  searchParams: Promise<{ zone?: string }>
}) {
  const sp = await searchParams
  return (
    <main className="hw-page">
      <Nav />
      <DailyView locale="zh-Hans" rawZone={sp.zone ?? null} />
    </main>
  )
}
