import type { Metadata } from 'next'
import Link from 'next/link'
import Nav from '@/components/Nav'
import HemunHourGuide from '@/components/HemunHourGuide'

export const metadata: Metadata = {
  // 该目录的父级 (zh)/hemun/layout.tsx 自带 title，会截断继承的模板，故此处用 absolute 显式带品牌
  title: { absolute: '不知道出生时辰怎么办？ | 明理' },
  description: '出生医学证明、医院分娩记录、问长辈的锚点问法，以及哪些反推方法依据不足。查不到也不影响三柱能判断的三件事。',
  alternates: {
    canonical: '/hemun/hour',
    languages: { 'zh-Hans': '/hemun/hour', 'zh-Hant': '/tw/hemun/hour', 'x-default': '/hemun/hour' },
  },
}

export default function Page() {
  return (
    <div className="hw-page hw-report-theme">
      <Nav />
      <main className="hw-wrap hw-c-pg">
        <Link href="/hemun" className="hw-c-back">‹ 合婚配对</Link>
        <header className="mb-5">
          <h1 className="hw-c-h1">不知道出生时辰怎么办？</h1>
          <p className="hw-lede">
            先查出生记录，再问长辈。查不到时怎么处理，以及哪些反推方法不值得用。
          </p>
        </header>
        <HemunHourGuide locale="zh-Hans" />
      </main>
    </div>
  )
}
