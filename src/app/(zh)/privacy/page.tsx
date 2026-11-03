import { renderLegal } from '@/lib/legalContent'
import { hantAlternates } from '@/lib/hant-seo'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: '明理隐私政策 — 数据收集、存储、跨境传输与用户权利',
  alternates: {
    canonical: '/privacy',
    languages: hantAlternates('/privacy'),
  },
}

export default function PrivacyPage() {
  const html = renderLegal('privacy.md')
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div
        className="legal-content"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  )
}
