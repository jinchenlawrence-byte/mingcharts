import type { Metadata } from 'next'
import MingShuContent from './MingShuContent'
import { SKUS, formatPriceUSD } from '@/lib/pricing'

export const metadata: Metadata = {
  title: `命书报告 · 八字详批 ${formatPriceUSD(SKUS.fatebook.priceUSD)} · AI 深度解读`,
  description:
    '命书报告：免费排盘后解锁万字八字深度详批。AI 命理师结合《子平真诠》《滴天髓》《穷通宝鉴》等六书，解读八字总览、性格天赋、用神喜忌、格局成败、调候、大运流年、事业财运、婚姻感情、子女六亲与健康提示。',
}

export default function MingShuPage() {
  return <MingShuContent />
}
