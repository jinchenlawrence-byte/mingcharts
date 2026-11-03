import type { Metadata } from 'next'

// page.tsx 为 'use client' 不能导出 metadata，由本服务端 layout 提供
export const metadata: Metadata = {
  title: '支付结果：命书解锁状态确认中',
  robots: { index: false, follow: false },
}

export default function CheckoutSuccessLayout({ children }: { children: React.ReactNode }) {
  return children
}
