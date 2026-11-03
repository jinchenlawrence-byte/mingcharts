import type { Metadata } from 'next'
import { renderLegal } from '@/lib/legalContent'
import { triAlternates } from '@/lib/lang'

// English Terms of Service. The legal body is already English in src/content/legal/terms.md;
// this route gives the English tree its own canonical URL instead of linking to the Chinese tree.
export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'MingCharts Terms of Service — subscriptions, refunds and AIGC compliance.',
  alternates: { canonical: '/en/terms', languages: triAlternates('/terms') },
}

export default function EnTermsPage() {
  const html = renderLegal('terms.md')
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="legal-content" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  )
}
