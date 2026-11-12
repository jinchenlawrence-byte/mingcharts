import type { Metadata } from 'next'
import Link from 'next/link'
import HemunHourGuide from '@/components/HemunHourGuide'

export const metadata: Metadata = {
  title: '不知道出生時辰怎麼辦？',
  description: '出生醫學證明、醫院分娩記錄、問長輩的錨點問法，以及哪些反推方法依據不足。查不到也不影響三柱能判斷的三件事。',
  alternates: {
    canonical: '/tw/hemun/hour',
    languages: { 'zh-Hans': '/hemun/hour', 'zh-Hant': '/tw/hemun/hour', 'x-default': '/hemun/hour' },
  },
}

export default function Page() {
  return (
    <div className="hw-page hw-report-theme">
      <main className="hw-wrap hw-c-pg">
        <Link href="/tw/hemun" className="hw-c-back">‹ 合婚配對</Link>
        <header className="mb-5">
          <h1 className="hw-c-h1">不知道出生時辰怎麼辦？</h1>
          <p className="hw-lede">
            先查出生記錄，再問長輩。查不到時怎麼處理，以及哪些反推方法不值得用。
          </p>
        </header>
        <HemunHourGuide locale="zh-Hant" />
      </main>
    </div>
  )
}
