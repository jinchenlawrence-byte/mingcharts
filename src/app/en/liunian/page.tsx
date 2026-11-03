import type { Metadata } from 'next'
import { triAlternates } from '@/lib/lang'
import EnLiunianClient from './Client'

// English Annual Report page: full form and English AI sections.
export const metadata: Metadata = {
  title: 'Annual Report · Annual Pillars reading',
  description:
    'A personal Annual Pillar report covering this year, next year and the year after, with monthly rhythm, read against your full Bazi chart.',
  alternates: { canonical: '/en/liunian', languages: triAlternates('/liunian') },
}

export default function EnLiunianPage() {
  return <EnLiunianClient />
}
