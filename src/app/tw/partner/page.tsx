import type { Metadata } from 'next'
import PartnerWorkspace from '@/components/partner/PartnerWorkspace'

// 伙伴工作台（繁體）。與 /partner 同一套元件，只換 locale：
//   文案不寫第二份 —— 簡體為源，繁體經 lib/hant 的 localize 派生。
// ★ 這一頁對港台伙伴是硬需求：他們要拿這個工具服務繁體客戶。
export const metadata: Metadata = {
  title: '夥伴工作台：合作命理師自助出報告',
  description: '合作命理師登入後自助生成命書與合婚報告，使用剩餘額度、複製分享連結。',
  robots: { index: false, follow: false },
  alternates: {
    canonical: '/tw/partner',
    languages: { 'zh-Hans': '/partner', 'zh-Hant': '/tw/partner', 'x-default': '/partner' },
  },
}

export default function HantPartnerPage() {
  return <PartnerWorkspace locale="zh-Hant" />
}
