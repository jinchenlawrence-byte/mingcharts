import type { Metadata } from 'next'
import Link from 'next/link'
import Nav from '@/components/Nav'
import demo from '@/data/demo-fatebook.json'
import ReportOriginNote from '@/components/reports/ReportOriginNote'

// 公开演示样本 · 八字命书（2026-10-23 第 33 轮）
//
// 为什么要有这一页：
//   伙伴拓展时需要一个【可以公开外发】的样本链接。原先用真实客户的报告 + 分享令牌，
//   既侵犯客户隐私，又会 90 天过期。本页用 src/data/demo-fatebook.json ——
//   由 build:demo 生成的【虚构命盘】（DEMO_BIRTH：1990-6-15 上海，示例·甲先生），
//   与真实数据完全隔离。
//
// 说明：
//   · 前 3 卷完整（八字总览 / 性格天赋 / 用神喜忌），后 7 卷是摘要 —— 这是刻意的：
//     完整报告的每卷约 1000 字，样本只展示"深度长什么样"，不把整本送出去
//   · noindex：样本页不参与搜索，避免与真实商品页争词
//   · 与 /r/[token] 的区别：这里是静态样本，无客户数据、无令牌、不会过期

export const metadata: Metadata = {
  title: '演示样本 · 八字命书（虚构命盘）',
  description: '明理命书样本：虚构命盘（1990 年 6 月 15 日 上海），展示十卷结构与引经据典的写法。前 3 卷完整，后 7 卷为摘要。',
  robots: { index: false, follow: false },
  alternates: { canonical: '/demo/mingshu' },
}

const FULL = new Set(demo.fullSections as string[])

export default function DemoMingshuPage() {
  return (
    <main className="hw-page">
      <Nav />
      <div className="hw-wrap hw-c-pg">
        <Link href="/" className="hw-c-back">‹ 首页</Link>

        <header className="mt-2 mb-6">
          <p className="text-xs text-ink-light/60 mb-1">
            演示样本 · 虚构命盘 · 不用于任何真实客户
          </p>
          <h1 className="hw-c-h1">
            {demo.meta.name} · 八字命书
          </h1>
          <p className="text-sm text-ink-light mt-2">
            {demo.meta.birthText} · {demo.meta.place} · {demo.meta.gender}
          </p>
          <ReportOriginNote className="mt-2" />
        </header>

        {/* 四柱 */}
        <section className="hw-c-box mb-6">
          <h2 className="hw-c-secTitle">四柱</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {demo.pillars.map((p) => (
              <div key={p.label} className="border border-gold/20 rounded-lg p-3">
                <div className="text-xs text-ink-light/60">{p.label}</div>
                <div className="text-2xl font-bold text-ink mt-1">{p.ganZhi}</div>
                <div className="text-xs text-ink-light mt-1">天干十神：{p.tenGodGan}</div>
                <div className="text-xs text-ink-light">藏干：{p.cangGanText}</div>
              </div>
            ))}
          </div>
          <div className="text-sm text-ink-light mt-3 space-y-1">
            <div>日主：{demo.dayMaster} · 旺衰：{demo.wangShuai}</div>
            <div>格局：{demo.geJu} · 胎元：{demo.taiYuan} · 命宫：{demo.mingGong}</div>
          </div>
        </section>

        {/* 十卷 */}
        <section className="hw-c-box mb-6">
          <h2 className="hw-c-secTitle">十卷正文</h2>
          <p className="text-xs text-ink-light/60 mb-4">
            前 3 卷完整展示；后 7 卷为摘要（完整报告每卷约 1000 字）。
          </p>
          <div className="space-y-6">
            {demo.sectionList.map((s, i) => {
              const body = (demo.sections as Record<string, string>)[s.key] ?? ''
              const isFull = FULL.has(s.key)
              return (
                <article key={s.key}>
                  <h3 className="font-semibold text-ink mb-2">
                    卷{['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'][i]} · {s.name}
                    {!isFull && <span className="text-xs font-normal text-ink-light/50 ml-2">（摘要）</span>}
                  </h3>
                  <p className="text-sm text-ink-light leading-relaxed whitespace-pre-wrap">{body}</p>
                </article>
              )
            })}
          </div>
        </section>

        {/* 大运与命例 */}
        <section className="hw-c-box mb-6">
          <h2 className="hw-c-secTitle">大运（前两步）与古籍命例</h2>
          <div className="text-sm text-ink-light space-y-1">
            {demo.daYun.map((d) => (
              <div key={d.ganZhi}>
                {d.ganZhi} · {d.startYear}–{d.endYear}（{d.startAge} 岁起）
              </div>
            ))}
          </div>
          {demo.similarCases.length > 0 && (
            <div className="mt-4 text-sm text-ink-light">
              <div className="text-xs text-ink-light/60 mb-1">古籍命例</div>
              <p className="leading-relaxed whitespace-pre-wrap">{demo.similarCases[0].text}</p>
              <p className="text-xs text-ink-light/60 mt-1">
                {demo.similarCases[0].person ? demo.similarCases[0].person + ' · ' : ''}
                出自《{demo.similarCases[0].source}》
              </p>
            </div>
          )}
        </section>

        <section className="hw-c-box mb-6">
          <p className="text-sm text-ink-light">
            想看自己的：
            <Link href="/" className="hw-c-link">免费排盘 →</Link>
            <span className="text-xs text-ink-light/60 ml-2">排盘免费，命书按份付费</span>
          </p>
        </section>

        <p className="text-center text-xs text-ink-light/40">
          本样本为虚构命盘，命理内容为传统民俗文化分析，仅供参考娱乐，不构成任何决策建议。
        </p>
      </div>
    </main>
  )
}
