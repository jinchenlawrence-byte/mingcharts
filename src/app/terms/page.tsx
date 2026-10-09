import { renderLegal } from '@/lib/legalContent'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'MingCharts Terms of Service — 会员订阅、退款政策、AIGC 合规条款',
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
