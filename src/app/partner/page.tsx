import type { Metadata } from 'next'
import PartnerWorkspace from '@/components/partner/PartnerWorkspace'

// 伙伴工作台（简体）。繁体版在 /tw/partner —— 港台伙伴要走繁体。
// 内部工具页：不进搜索索引。
export const metadata: Metadata = {
  title: '伙伴工作台：合作命理师自助出报告',
  description: '合作命理师登录后自助生成命书与合婚报告，使用剩余额度、复制分享链接。',
  robots: { index: false, follow: false },
  alternates: {
    canonical: '/partner',
    languages: { 'zh-Hans': '/partner', 'zh-Hant': '/tw/partner', 'x-default': '/partner' },
  },
}

export default function PartnerPage() {
  return <PartnerWorkspace locale="zh-Hans" />
}
