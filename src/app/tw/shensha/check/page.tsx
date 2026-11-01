import type { Metadata } from 'next'
import Link from 'next/link'
import ShenshaCheck from '@/components/ShenshaCheck'
import { hantAlternates } from '@/lib/hant-seo'
import { toHant } from '@/lib/hant'

// 免費查神煞（繁體）—— 與 /shensha/check 同一組件，只換 locale。
// ★ 導航由 /tw 佈局提供。
const L = (s: string) => toHant(s)

export const metadata: Metadata = {
  title: '免費查神煞：輸入生辰，看你命中帶哪些神煞',
  description:
    '免費查詢八字神煞：輸入出生年月日時與出生地，按真太陽時校正排盤，列出你命中帶的神煞並連到查法與典籍出處。只給標籤，不作吉凶判斷。',
  keywords: ['免費查神煞', '八字神煞查詢', '我命中帶什麼神煞', '神煞查詢', '童子煞查詢', '天乙貴人查詢'],
  alternates: { canonical: '/tw/shensha/check', languages: hantAlternates('/shensha/check') },
}

export default function HantShenshaCheckPage() {
  return (
    <main className="hw-page">
      <div className="hw-wrap hw-c-pg">
        <header className="mb-6">
          <p className="text-xs text-ink-light/60 mb-1">
            <Link href="/tw/shensha" className="hover:underline">{L('神煞查法')}</Link>
            {' / '}
            {L('免费查询')}
          </p>
          <h1 className="hw-c-h1">{L('免费查神煞')}</h1>
          <p className="hw-c-lede">
            {L('输入出生年月日时与出生地，按真太阳时校正排盘，列出你命中带的神煞。每一个都链到口诀与典籍出处，你可以自己核对。')}
          </p>
          <p className="text-xs text-ink-light/60 mt-2">
            {L('※ 只给标签，不作吉凶判断 —— 神煞是辅助，命理分析以五行旺衰与格局为主。')}
          </p>
        </header>

        <ShenshaCheck locale="zh-Hant" />
      </div>
    </main>
  )
}
