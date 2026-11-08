import type { Metadata } from 'next'
import DailyView from '@/components/daily/DailyView'
import { triAlternates } from '@/lib/lang'

export const metadata: Metadata = {
  title: '每日日籤：今日干支與一省之語',
  description:
    '每天一籤，按當日干支取曆法意象，給自己一面自省的小鏡子。日籤按所在時區歸日，晚子時（23:00）起算次日。',
  alternates: { canonical: '/tw/daily', languages: triAlternates('/daily') },
}

// 每日日籤：與簡/英共用 components/daily/DailyView（2026-11-09 收敛）
export default async function HantDailyPage({
  searchParams,
}: {
  searchParams: Promise<{ zone?: string }>
}) {
  const sp = await searchParams
  return <DailyView locale="zh-Hant" rawZone={sp.zone ?? null} />
}
