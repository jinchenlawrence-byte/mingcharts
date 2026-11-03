import type { Metadata } from 'next'
import { triAlternates } from '@/lib/lang'

export const metadata: Metadata = {
  title: 'Report detail',
  description: 'Read a saved MingCharts report.',
  alternates: { canonical: '/en/reports', languages: triAlternates('/reports') },
  robots: { index: false, follow: true },
}

export default function EnReportDetailLayout({ children }: { children: React.ReactNode }) {
  return children
}
