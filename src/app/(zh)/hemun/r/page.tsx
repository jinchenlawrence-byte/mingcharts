import type { Metadata } from 'next'
import Link from 'next/link'
import Nav from '@/components/Nav'
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
    description: '一张只含日支与日主的合婚摘要卡，不含出生信息。',
    robots: { index: false, follow: true },
    alternates: { canonical: '/hemun/r' },
    openGraph: {
      title: '合婚分享卡',
      description: '夫妻宫、双方日干、配偶星三项判断。',
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
      <Nav />
      <main className="hw-wrap hw-c-pg">
        <header className="mb-5">
          <h1 className="hw-c-h1">合婚分享卡</h1>
          <p className="hw-lede">对方分享给你的合婚摘要，只含三项判断。</p>
        </header>

        {check.ok && check.payload ? (
          <HemunShareCard payload={check.payload} locale="zh-Hans" />
        ) : (
          <div className="rounded-xl border border-gold/20 bg-white px-5 py-8 text-center">
            <p className="text-ink mb-1">{check.reason ?? '链接无效'}</p>
            <p className="text-xs text-ink-light mb-4">分享链接有效期为 30 天。</p>
            <Link href="/hemun" className="text-sm underline underline-offset-4">看自己的合婚 ›</Link>
          </div>
        )}
      </main>
    </div>
  )
}
