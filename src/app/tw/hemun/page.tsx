import type { Metadata } from 'next'
import HantHemunClient from './Client'
import { hantAlternates } from '@/lib/hant-seo'

// 八字合婚配對（繁體）—— metadata 由伺服器頁提供，表單與結果由 Client 渲染。
export const metadata: Metadata = {
  title: '八字合婚配對：日柱夫妻宮 · 生肖 · 五行互補',
  description:
    '輸入雙方出生資訊，以日柱夫妻宮為核心，合參年柱生肖、配偶星、五行互補、十神互見與大運節奏，給出分項依據與相處建議。結果僅供參考娛樂。',
  keywords: ['八字合婚', '合婚配對', '夫妻宮', '生肖配對', '五行互補'],
  alternates: { canonical: '/tw/hemun', languages: hantAlternates('/hemun') },
}

export default function HantHemunPage() {
  return <HantHemunClient />
}
