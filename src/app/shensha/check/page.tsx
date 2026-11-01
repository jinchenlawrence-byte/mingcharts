import type { Metadata } from 'next'
import Link from 'next/link'
import Nav from '@/components/Nav'
import ShenshaCheck from '@/components/ShenshaCheck'
import { hantAlternates } from '@/lib/hant-seo'

// 免费查神煞（第 36 轮）：输入生辰 → 看你命中带哪些神煞 → 链到查法与出典。
// 这是站上第一个「免费且立刻有用」的交互工具，用来承接社媒与搜索的冲动流量。
export const metadata: Metadata = {
  title: '免费查神煞：输入生辰，看你命中带哪些神煞',
  description:
    '免费查询八字神煞：输入出生年月日时与出生地，按真太阳时校正排盘，列出你命中带的神煞并链到查法与典籍出处。只给标签，不作吉凶判断。',
  keywords: ['免费查神煞', '八字神煞查询', '我命中带什么神煞', '神煞查询', '童子煞查询', '天乙贵人查询'],
  alternates: { canonical: '/shensha/check', languages: hantAlternates('/shensha/check') },
}

export default function ShenshaCheckPage() {
  return (
    <>
      <Nav />
      <main className="hw-page">
        <div className="hw-wrap hw-c-pg">
          <header className="mb-6">
            <p className="text-xs text-ink-light/60 mb-1">
              <Link href="/shensha" className="hover:underline">神煞查法</Link>
              {' / '}
              免费查询
            </p>
            <h1 className="hw-c-h1">免费查神煞</h1>
            <p className="hw-c-lede">
              输入出生年月日时与出生地，按真太阳时校正排盘，列出你命中带的神煞。
              每一个都链到口诀与典籍出处，你可以自己核对。
            </p>
            <p className="text-xs text-ink-light/60 mt-2">
              ※ 只给标签，不作吉凶判断 —— 神煞是辅助，命理分析以五行旺衰与格局为主。
            </p>
          </header>

          <ShenshaCheck locale="zh-Hans" />
        </div>
      </main>
    </>
  )
}
