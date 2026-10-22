import type { Metadata } from 'next'
import PartnerLanding from '@/components/partners/PartnerLanding'
import { hantAlternates } from '@/lib/hant-seo'

export const metadata: Metadata = {
  title: '命理師合作：萬字命書批發，掛你自己的品牌',
  description:
    '命理師白標合作：我們出萬字命書（十卷、註明典籍出處），你排盤、定價、收款、面對客戶。批發按份計價，首單送 2 份試用。',
  alternates: {
    canonical: '/tw/partners',
    languages: hantAlternates('/partners'),
  },
}

export default function HantPartnersPage() {
  return (
    <div className="hw-wrap hw-c-pg">
      <PartnerLanding locale="zh-Hant" />
    </div>
  )
}
