import type { Metadata } from 'next'
import { renderLegal } from '@/lib/legalContent'
import { triAlternates } from '@/lib/lang'

// English Privacy Policy. The legal body is already English in src/content/legal/privacy.md.
export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'MingCharts Privacy Policy — data collection, storage, cross-border transfer and user rights.',
  alternates: { canonical: '/en/privacy', languages: triAlternates('/privacy') },
}

export default function EnPrivacyPage() {
  const html = renderLegal('privacy.md')
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="legal-content" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  )
}
