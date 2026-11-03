import type { Metadata } from 'next'
import { triAlternates } from '@/lib/lang'
import EnGeoClient from './Client'

// English Geomancy page. Form and AI sections are English; rule-engine city tables stay in the
// Chinese edition, so no Chinese dynamic content is rendered here.
export const metadata: Metadata = {
  title: 'Geomancy · city directions',
  description:
    'Geomancy reads favourable directions and cities from the Five Elements of the chart, and assesses the current city against the birthplace.',
  alternates: { canonical: '/en/geo', languages: triAlternates('/geo') },
}

export default function EnGeoPage() {
  return <EnGeoClient />
}
