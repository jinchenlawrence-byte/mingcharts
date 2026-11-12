import type { Metadata } from 'next'
import HantHemunClient from './Client'
import { triAlternates } from '@/lib/lang'

// 八字合婚配對（繁體）—— metadata 由伺服器頁提供，表單與結果由 Client 渲染。
export const metadata: Metadata = {
  // ★ 2026-11-12 A 階段：與簡體同口徑——免費 + 只要生日 + 沒時辰也能合。
  //   帶品牌後綴（ | 明理 ）合計 28 字，仍守「≤30 字」的舊規矩。
  title: '八字合婚免費配對：只要雙方生日，沒時辰也能合',
  description:
    '只填雙方生日就能合婚，不用出生時辰。給出三項判斷：夫妻宮沖合害刑、雙方日干五行、配偶星有沒有顯現在年月日上；缺時辰的項目標註「未計算」。',
  keywords: ['八字合婚', '合婚配對', '夫妻宮', '生肖配對', '五行互補'],
  alternates: { canonical: '/tw/hemun', languages: triAlternates('/hemun') },
}

export default function HantHemunPage() {
  return <HantHemunClient />
}
