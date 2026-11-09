import type { Metadata } from 'next'
import HantGeoClient from './Client'
import GeoIntro from '@/components/tools/GeoIntro'
import { triAlternates } from '@/lib/lang'

// 方位地理（繁體）—— metadata 由伺服器頁提供。
export const metadata: Metadata = {
  title: '方位地理 · 城市解析：財富之城 · 事業之城 · 貴人之城',
  description:
    '按八字喜用五行與相對出生地的方位，推薦財富之城、事業之城、貴人之城、才華之城，並評估現居城市的影響。',
  keywords: ['方位城市', '財富之城', '事業之城', '五行方位', '遷居'],
  alternates: { canonical: '/tw/geo', languages: triAlternates('/geo') },
}

export default function HantGeoPage() {
  return (
    <HantGeoClient>
      <GeoIntro locale="zh-Hant" />
    </HantGeoClient>
  )
}
