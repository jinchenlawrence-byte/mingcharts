import type { Metadata } from 'next'
import MingShuContent from './MingShuContent'
import { SKUS, formatPriceUSD } from '@/lib/pricing'
import { triAlternates } from '@/lib/lang'

// 命書報告（繁體）：與 /mingshu 同構、同資訊量；價格取自 SKUS 單一事實源。
export const metadata: Metadata = {
  title: `命書報告 · 八字詳批 ${formatPriceUSD(SKUS.fatebook.priceUSD)} · AI 深度解讀`,
  description:
    '命書報告：免費排盤後解鎖萬字八字深度詳批。AI 命理師結合《子平真詮》《滴天髓》《窮通寶鑑》等六書，解讀八字總覽、性格天賦、用神喜忌、格局成敗、調候、大運流年、事業財運、婚姻感情、子女六親與健康提示。',
  alternates: { canonical: '/tw/mingshu', languages: triAlternates('/mingshu') },
}

export default function HantMingShuPage() {
  return <MingShuContent />
}
