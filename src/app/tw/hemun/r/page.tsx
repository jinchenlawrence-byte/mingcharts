import type { Metadata } from 'next'
import Link from 'next/link'
import HemunShareCard from '@/components/reports/HemunShareCard'
import { verifyPayload } from '@/lib/hemunShare'

interface Props {
  searchParams: Promise<{ d?: string; e?: string; s?: string }>
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const sp = await searchParams
  const qs = `d=${sp.d ?? ''}&e=${sp.e ?? ''}&s=${sp.s ?? ''}`
  return {
    title: '合婚分享卡',
    description: '一張只含日支與日主的合婚摘要卡，不含出生資訊。',
    robots: { index: false, follow: true },
    alternates: { canonical: '/tw/hemun/r' },
    openGraph: {
      title: '合婚分享卡',
      description: '夫妻宮、雙方日干、配偶星三項判斷。',
      images: [`/api/og/hemun?${qs}`],
    },
    twitter: { card: 'summary_large_image', images: [`/api/og/hemun?${qs}`] },
  }
}

export default async function Page({ searchParams }: Props) {
  const sp = await searchParams
  const exp = Number(sp.e)
  const check = verifyPayload(sp.d ?? '', exp, sp.s ?? '')

  return (
    <div className="hw-page hw-report-theme">
      <main className="hw-wrap hw-c-pg">
        <header className="mb-5">
          <h1 className="hw-c-h1">合婚分享卡</h1>
          <p className="hw-lede">對方分享給你的合婚摘要，只含三項判斷。</p>
        </header>

        {check.ok && check.payload ? (
          <HemunShareCard payload={check.payload} locale="zh-Hant" />
        ) : (
          <div className="rounded-xl border border-gold/20 bg-white px-5 py-8 text-center">
            <p className="text-ink mb-1">{check.reason ?? '連結無效'}</p>
            <p className="text-xs text-ink-light mb-4">分享連結有效期為 30 天。</p>
            <Link href="/tw/hemun" className="text-sm underline underline-offset-4">看自己的合婚 ›</Link>
          </div>
        )}
      </main>
    </div>
  )
}
