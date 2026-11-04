import type { Metadata } from 'next'
import { triAlternates } from '@/lib/lang'

export const metadata: Metadata = {
  title: 'My reports',
  description: 'Saved MingCharts reports in your account.',
  alternates: { canonical: '/en/reports', languages: triAlternates('/reports') },
  robots: { index: false, follow: true },
}

export default function EnReportsLayout({ children }: { children: React.ReactNode }) {
  return children
}
