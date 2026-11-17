import type { Metadata } from 'next'
import ClaimClient from '@/components/claim/ClaimClient'

// 認領頁（繁體）：token 在 URL 裡，頁面本身不索引。
export const metadata: Metadata = {
  title: '領取命書',
  description: '用購買時的郵箱登入，把已付款的命書歸入你的帳號。',
  robots: { index: false, follow: false },
}

export default function HantClaimPage() {
  return <ClaimClient locale="zh-Hant" />
}
