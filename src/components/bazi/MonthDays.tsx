'use client'

// 月页的「选择出生日期」区块（2026-11-05，按 B 方案改造）
//
// 背景：日页（/bazi/{y}/{m}/{d}，约 2.2 万条）已定为【站内工具】：noindex、不进 sitemap、
// robots 也不让它被抓。但月页此前把这 30 条日页链接直接写进服务端 HTML，
// 于是它们仍会被任何抓取方发现（且每条日页都是 force-dynamic，被抓一次渲染一次）。
//
// 现在：折叠起来。默认不渲染链接，用户点「展开整月」才出现。
// · 不参与 SEO（本来就不收录）
// · 不消耗 CPU（抓取方看不到链接，不会去抓日页）
// · 人类需要时一键展开，功能没丢

import { useState } from 'react'
import Link from 'next/link'

export default function MonthDays({
  year,
  month,
  days,
}: {
  year: string
  month: string
  days: number[]
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="hw-c-box mb-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="hw-c-secTitle mb-0">选择出生日期</h2>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="text-sm text-ink/70 underline-offset-4 hover:text-ink hover:underline"
        >
          {open ? '收起整月' : `展开整月（${days.length} 天）`}
        </button>
      </div>

      {open ? (
        <div className="mt-4 grid grid-cols-5 sm:grid-cols-7 md:grid-cols-10 gap-2">
          {days.map((d) => (
            <Link
              key={d}
              href={`/bazi/${year}/${month}/${String(d).padStart(2, '0')}`}
              className="bg-gold/5 hover:bg-gold/10 border border-gold/20 rounded p-2 text-center transition-colors"
            >
              <div className="font-bold text-ink">{d}</div>
              <div className="text-xs text-ink-light">日</div>
            </Link>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-ink-light">
          不知道具体日期？先看本月出生总览，或直接免费排盘输入完整生辰。
        </p>
      )}
    </div>
  )
}
