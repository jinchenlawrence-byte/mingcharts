import type { Metadata } from 'next'
import { triAlternates } from '@/lib/lang'

export const metadata: Metadata = {
  title: 'Account settings',
  description: 'Manage your MingCharts password and sign out.',
  alternates: { canonical: '/en/account', languages: triAlternates('/account') },
}

export default function EnAccountLayout({ children }: { children: React.ReactNode }) {
  return children
}
