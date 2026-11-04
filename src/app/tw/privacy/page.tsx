import { renderLegal } from '@/lib/legalContent'
import { toHant } from '@/lib/hant'
import { triAlternates } from '@/lib/lang'
import type { Metadata } from 'next'

// 隱私政策（繁體）：與 /privacy 同一份 markdown 源，經 toHant 派生，不寫第二份。
export const metadata: Metadata = {
  title: '隱私政策',
  description: '明理隱私政策 — 資料蒐集、儲存、跨境傳輸與使用者權利',
  alternates: {
    canonical: '/tw/privacy',
    languages: triAlternates('/privacy'),
  },
}

export default function HantPrivacyPage() {
  const html = toHant(renderLegal('privacy.md'))
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div
        className="legal-content"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  )
}
