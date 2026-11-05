import type { Metadata } from 'next'
import { triAlternates } from '@/lib/lang'
import EnChartsClient from './Client'

// My charts (English). Sign-in required; the list itself is client-side.
export const metadata: Metadata = {
  title: 'My charts · saved Bazi charts',
  description:
    'Sign in to see your saved Bazi charts and reopen the Four Pillars, Ten Gods, luck pillars and the full reading at any time.',
  alternates: { canonical: '/en/charts', languages: triAlternates('/charts') },
}

export default function EnChartsPage() {
  return <EnChartsClient />
}
