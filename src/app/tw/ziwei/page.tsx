import type { Metadata } from 'next'
import HantZiweiClient from './Client'
import ZiweiIntro from '@/components/tools/ZiweiIntro'
import { triAlternates } from '@/lib/lang'

// 紫微斗數（繁體）—— metadata 由伺服器頁提供。
export const metadata: Metadata = {
  title: '紫微斗數：十四主星 · 四化飛星 · 十二宮命理分析',
  description:
    '免費紫微斗數排盤：依農曆出生時辰起十二宮，十四主星、四化飛星、大限流年逐宮解讀；深度解讀由 AI 結合傳統斗數體系撰寫。',
  keywords: ['紫微斗數', '紫微斗數排盤', '十四主星', '四化', '十二宮'],
  alternates: { canonical: '/tw/ziwei', languages: triAlternates('/ziwei') },
}

export default function HantZiweiPage() {
  return (
    <HantZiweiClient>
      <ZiweiIntro locale="zh-Hant" />
    </HantZiweiClient>
  )
}
