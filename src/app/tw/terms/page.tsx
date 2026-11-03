import { renderLegal } from '@/lib/legalContent'
import { toHant } from '@/lib/hant'
import { hantAlternates } from '@/lib/hant-seo'
import type { Metadata } from 'next'

// 服務條款（繁體）：與 /terms 同一份 markdown 源，經 toHant 派生，不寫第二份。
// ★ 法律主體名 MingCharts 為專名，轉換器不會動它；條款編號與英文標題同樣原樣保留。
export const metadata: Metadata = {
  title: 'Terms of Service',
  description: '明理服務條款 — 會員訂閱、退款政策、AIGC 合規條款',
  alternates: {
    canonical: '/tw/terms',
    languages: hantAlternates('/terms'),
  },
}

export default function HantTermsPage() {
  const html = toHant(renderLegal('terms.md'))
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div
        className="legal-content"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  )
}
