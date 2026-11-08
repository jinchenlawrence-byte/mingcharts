import type { Metadata } from 'next'
import { ShengXiaoIndex } from '@/components/shengxiao/ShengXiaoIndex'
import { triAlternates } from '@/lib/lang'

export const metadata: Metadata = {
  title: '十二生肖性格與流年運勢（繁體）：屬鼠、屬牛、屬虎…',
  description:
    '十二生肖完整解讀：性格特點、事業財運、婚姻配對、六合六沖六害相刑，以及 2024–2031 流年太歲關係。繁體中文，台灣／香港用語。',
  alternates: {
    canonical: '/tw/shengxiao',
    languages: triAlternates('/shengxiao'),
  },
}

// 繁体索引页体例：与简/英共用 components/shengxiao/ShengXiaoIndex（2026-11-09 收敛）
export default function HantShengXiaoIndex() {
  return <ShengXiaoIndex locale="zh-Hant" />
}
