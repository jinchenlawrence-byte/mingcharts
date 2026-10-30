import type { Metadata } from 'next'
import Link from 'next/link'
import Nav from '@/components/Nav'
import { hantAlternates } from '@/lib/hant-seo'
import { shenshaIndex } from '@/lib/shenshaIndex'

// 神煞索引（第 36 轮）：53 个神煞查法，一页看完。
//
// 目标读者是【命理师与深度爱好者】，不是普通消费者 —— 他们要的是「要查的时候
// 一页能扫到」，不是故事。所以：按用途分组、每条一句作用、点进去看口诀与出典。
// ★ 可打印：命理师会打印下来放桌上（这也是它比单篇文章更值得被收藏的原因）。
export const metadata: Metadata = {
  title: '神煞查法总目录：53 个神煞一页看完',
  description:
    '53 个八字神煞查法的总目录：贵人、才学、权柄、情缘、动向、刑伤、日柱特格七类，每条链到口诀与典籍出处。',
  keywords: ['神煞查法', '八字神煞', '神煞总表', '天乙贵人', '羊刃', '空亡', '童子煞'],
  alternates: { canonical: '/shensha', languages: hantAlternates('/shensha') },
}

export default function ShenshaIndexPage() {
  const groups = shenshaIndex('')
  const total = groups.reduce((n, g) => n + g.entries.length, 0)

  return (
    <>
      <Nav />
      <main className="hw-page hw-print">
        <div className="hw-wrap hw-c-pg">
          <header className="mb-6">
            <p className="text-xs text-ink-light/60 mb-1">神煞查法 · 总目录</p>
            <h1 className="hw-c-h1">八字神煞查法：{total} 个神煞一页看完</h1>
            <p className="hw-c-lede">
              按用途分成七类。每条都链到口诀、查法与典籍出处。
              这一页是给排盘时随手查用的，可以打印下来。
            </p>
            <p className="text-xs text-ink-light/60 mt-2">
              ※ 神煞是辅助，命理分析以五行生克与格局旺衰为主体，不可见煞即言凶、见贵即言吉。
            </p>
          </header>

          {/* 目录锚点 */}
          <nav className="hw-c-box mb-6 hw-print-hide">
            <h2 className="hw-c-secTitle">七类索引</h2>
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
              {groups.map((g) => (
                <a key={g.id} href={`#${g.id}`} className="hw-c-link">
                  {g.label}（{g.entries.length}）
                </a>
              ))}
            </div>
          </nav>

          {groups.map((g) => (
            <section key={g.id} id={g.id} className="hw-c-box mb-6 hw-print-block">
              <h2 className="hw-c-secTitle">
                {g.label}
                <span className="ml-2 text-xs font-normal text-ink-light/60">{g.hint}</span>
              </h2>
              <ul className="divide-y divide-gold/10">
                {g.entries.map((e) => (
                  <li key={e.slug} className="py-2 flex flex-col sm:flex-row sm:items-baseline gap-x-3">
                    <Link href={e.href} className="hw-c-link font-medium shrink-0 sm:w-28">
                      {e.name}
                    </Link>
                    <span className="text-sm text-ink-light/80">{e.brief}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}

          <section className="hw-c-box mb-6">
            <h2 className="hw-c-secTitle">怎么用这一页</h2>
            <ul className="text-sm text-ink-light space-y-2">
              <li>• 排盘时先看这一行的「一句作用」，判断要不要深入查。</li>
              <li>• 要下断语前，点进去看口诀与出典，确认取法与流派。</li>
              <li>• 拿不准的，宁可不说 —— 见煞即言凶是最容易失手的说法。</li>
            </ul>
            <p className="text-sm mt-3">
              <Link href="/article" className="hw-c-link">← 回命理知识目录</Link>
            </p>
          </section>
        </div>
      </main>
    </>
  )
}
