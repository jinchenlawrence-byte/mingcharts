import { renderLegal } from '@/lib/legalContent'
import { triAlternates } from '@/lib/lang'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '服务条款',
  description: '明理服务条款 — 会员订阅、退款政策、AIGC 合规条款',
  alternates: {
    canonical: '/terms',
    languages: triAlternates('/terms'),
  },
}

export default function TermsPage() {
  const html = renderLegal('terms.md')
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div
        className="legal-content"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  )
}
