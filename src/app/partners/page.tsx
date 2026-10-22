import type { Metadata } from 'next'
import Nav from '@/components/Nav'
import PartnerLanding from '@/components/partners/PartnerLanding'
import { hantAlternates } from '@/lib/hant-seo'

export const metadata: Metadata = {
  title: '命理师合作：万字命书批发，挂你自己的品牌',
  description:
    '命理师白标合作：我们出万字命书（十卷、注明典籍出处），你排盘、定价、收款、面对客户。批发按份计价，首单送 2 份试用。',
  alternates: {
    canonical: '/partners',
    languages: hantAlternates('/partners'),
  },
}

export default function PartnersPage() {
  return (
    <main className="hw-page">
      <Nav />
      <div className="hw-wrap hw-c-pg">
        <PartnerLanding locale="zh-Hans" />
      </div>
    </main>
  )
}
