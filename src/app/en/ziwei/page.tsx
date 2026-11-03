import type { Metadata } from 'next'
import { triAlternates } from '@/lib/lang'
import EnZiweiClient from './Client'

// English Zi Wei Dou Shu page. Form and AI sections are English; rule-engine palace tables stay
// in the Chinese edition, so no Chinese dynamic content is rendered here.
export const metadata: Metadata = {
  title: 'Zi Wei Dou Shu · Purple Star Astrology',
  description:
    'Zi Wei Dou Shu (Purple Star Astrology) builds a twelve-palace chart with fourteen major stars and the Four Transformations, read by decade and by year.',
  alternates: { canonical: '/en/ziwei', languages: triAlternates('/ziwei') },
}

export default function EnZiweiPage() {
  return <EnZiweiClient />
}
