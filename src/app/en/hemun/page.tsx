import type { Metadata } from 'next'
import { triAlternates } from '@/lib/lang'
import EnHemunClient from './Client'

// English Bazi Synastry page. The form and AI sections are English; rule-engine tables stay in
// the Chinese edition, so this page never renders Chinese dynamic content.
export const metadata: Metadata = {
  title: 'Bazi Synastry · compare two charts',
  description:
    'Bazi synastry compares two Four Pillars charts: day-pillar spouse palace, spouse stars, Five Elements support, Ten Gods and Luck Pillar rhythm.',
  alternates: { canonical: '/en/hemun', languages: triAlternates('/hemun') },
}

export default function EnHemunPage() {
  return <EnHemunClient />
}
