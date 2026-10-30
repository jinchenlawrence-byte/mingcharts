import type { Metadata } from 'next'
import Link from 'next/link'
import { hantAlternates } from '@/lib/hant-seo'
import { toHant } from '@/lib/hant'
import { shenshaIndex } from '@/lib/shenshaIndex'

// 神煞索引（繁體）—— 與 /shensha 同源：分組與條目共用 lib/shenshaIndex，
// 文案以簡體為源、經 toHant 派生，不寫第二份。
// ★ 導航由 /tw 佈局提供（不重複渲染簡體 Nav）。
export const metadata: Metadata = {
  title: '神煞查法總目錄：53 個神煞一頁看完',
  description:
    '53 個八字神煞查法的總目錄：貴人、才學、權柄、情緣、動向、刑傷、日柱特格七類，每條連到口訣與典籍出處。',
  keywords: ['神煞查法', '八字神煞', '神煞總表', '天乙貴人', '羊刃', '空亡', '童子煞'],
  alternates: { canonical: '/tw/shensha', languages: hantAlternates('/shensha') },
}

export default function HantShenshaIndexPage() {
  const L = (s: string) => toHant(s)
  const groups = shenshaIndex('/tw')
  const total = groups.reduce((n, g) => n + g.entries.length, 0)

  return (
    <main className="hw-page hw-print">
      <div className="hw-wrap hw-c-pg">
        <header className="mb-6">
          <p className="text-xs text-ink-light/60 mb-1">{L('神煞查法 · 总目录')}</p>
          <h1 className="hw-c-h1">{L(`八字神煞查法：${total} 个神煞一页看完`)}</h1>
          <p className="hw-c-lede">
            {L('按用途分成七类。每条都链到口诀、查法与典籍出处。这一页是给排盘时随手查用的，可以打印下来。')}
          </p>
          <p className="text-xs text-ink-light/60 mt-2">
            {L('※ 神煞是辅助，命理分析以五行生克与格局旺衰为主体，不可见煞即言凶、见贵即言吉。')}
          </p>
        </header>

        <nav className="hw-c-box mb-6 hw-print-hide">
          <h2 className="hw-c-secTitle">{L('七类索引')}</h2>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
            {groups.map((g) => (
              <a key={g.id} href={`#${g.id}`} className="hw-c-link">
                {L(g.label)}（{g.entries.length}）
              </a>
            ))}
          </div>
        </nav>

        {groups.map((g) => (
          <section key={g.id} id={g.id} className="hw-c-box mb-6 hw-print-block">
            <h2 className="hw-c-secTitle">
              {L(g.label)}
              <span className="ml-2 text-xs font-normal text-ink-light/60">{L(g.hint)}</span>
            </h2>
            <ul className="divide-y divide-gold/10">
              {g.entries.map((e) => (
                <li key={e.slug} className="py-2 flex flex-col sm:flex-row sm:items-baseline gap-x-3">
                  <Link href={e.href} className="hw-c-link font-medium shrink-0 sm:w-28">
                    {L(e.name)}
                  </Link>
                  <span className="text-sm text-ink-light/80">{L(e.brief)}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <section className="hw-c-box mb-6">
          <h2 className="hw-c-secTitle">{L('怎么用这一页')}</h2>
          <ul className="text-sm text-ink-light space-y-2">
            <li>• {L('排盘时先看这一行的「一句作用」，判断要不要深入查。')}</li>
            <li>• {L('要下断语前，点进去看口诀与出典，确认取法与流派。')}</li>
            <li>• {L('拿不准的，宁可不说 —— 见煞即言凶是最容易失手的说法。')}</li>
          </ul>
          <p className="text-sm mt-3">
            <Link href="/tw/article" className="hw-c-link">{L('← 回命理知识目录')}</Link>
          </p>
        </section>
      </div>
    </main>
  )
}
