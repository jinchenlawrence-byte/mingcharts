import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '付款完成',
  robots: { index: false, follow: false },
}

export default function HantCheckoutSuccessLayout({ children }: { children: React.ReactNode }) {
  return children
}
