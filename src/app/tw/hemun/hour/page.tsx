import type { Metadata } from 'next'
import Link from 'next/link'
import Nav from '@/components/Nav'
import HemunHourGuide from '@/components/HemunHourGuide'

export const metadata: Metadata = {
  title: '不知道出生時辰怎麼辦？四種查法',
  description: '出生醫學證明、醫院分娩記錄、問長輩的錨點問法，以及哪些反推方法依據不足。查不到也不影響三柱能判斷的三件事。',
  alternates: {
    canonical: '/tw/hemun/hour',
    languages: { 'zh-Hans': '/hemun/hour', 'zh-Hant': '/tw/hemun/hour', 'x-default': '/hemun/hour' },
  },
}

export default function Page() {
  return (
    <div className="hw-page hw-report-theme">
      <Nav />
      <main className="hw-wrap hw-c-pg">
        <Link href="/tw/hemun" className="hw-c-back">‹ 合婚配對</Link>
        <header className="mb-5">
          <h1 className="hw-c-h1">不知道出生時辰怎麼辦？</h1>
          <p className="hw-lede">
            按可靠程度排的四種查法，以及查不到時怎麼處理。我們不建議猜一個時間填進去。
          </p>
        </header>
        <HemunHourGuide locale="zh-Hant" />
      </main>
    </div>
  )
}
