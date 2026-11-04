import type { Metadata } from 'next'
import { triAlternates } from '@/lib/lang'

export const metadata: Metadata = {
  title: 'Member centre',
  description: 'View your MingCharts membership status and manage the subscription.',
  alternates: { canonical: '/en/member', languages: triAlternates('/member') },
  robots: { index: false, follow: true },
}

export default function EnMemberLayout({ children }: { children: React.ReactNode }) {
  return children
}
