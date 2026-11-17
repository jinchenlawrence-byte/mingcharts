import type { Metadata } from 'next'
import ClaimClient from '@/components/claim/ClaimClient'

// 认领页（简体）：token 在 URL 里，页面本身不索引。
// 具体流程在 ClaimClient（三棵树共用）。
export const metadata: Metadata = {
  title: '领取命书',
  description: '用购买时的邮箱登录，把已付款的命书归入你的账号。',
  robots: { index: false, follow: false },
}

export default function ClaimPage() {
  return <ClaimClient locale="zh-Hans" />
}
