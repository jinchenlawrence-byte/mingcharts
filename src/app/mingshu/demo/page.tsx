import type { Metadata } from 'next'
import Link from 'next/link'
import Nav from '@/components/Nav'
import demo from '@/data/demo-fatebook.json'

// 公开示例命书（HANDOFF-万字补全与文案返修 §三）
// ★ 静态资产：本页只读 src/data/demo-fatebook.json 渲染——零 AI 调用、零 IO、零登录门槛。

export const metadata: Metadata = {
  title: '示例命书 · 虚构出生资料 · 展示前约 30%',
  description:
    '公开示例命书：以虚构出生资料（1990-06-15 10:30 男 上海）生成的真实命书节选。完整展示八字总览、性格天赋、用神喜忌三个板块，其余七个板块为摘要，供你在解锁前了解命书报告的深度与文风。',
}

const TAG_BADGE: Record<string, string> = {
  '较宜': 'bg-emerald-50 text-emerald-600', '平顺': 'bg-gray-100 text-gray-500',
  '一般': 'bg-amber-100 text-amber-700', '宜慎': 'bg-orange-100 text-orange-700',
  '大防': 'bg-red-100 text-red-700'
}

export default function DemoFatebookPage() {
  const fullKeys: readonly string[] = demo.fullSections
  return (
    <main className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      <Nav />

      {/* 顶部标注：示例 · 虚构出生资料 · 展示前约 30% */}
      <section className="container mx-auto px-4 pt-10 pb-4 max-w-3xl text-center">
        <span className="inline-block bg-amber-100 text-amber-800 text-xs font-semibold px-3 py-1 rounded-full mb-4">
          示例 · 虚构出生资料 · 展示前约 30%
        </span>
        <h1 className="text-3xl md:text-4xl font-bold text-amber-900 mb-3">公开示例命书</h1>
        <p className="text-sm text-gray-600 leading-relaxed">
          这是一份用虚构出生资料真实生成的命书节选：前三个板块完整展示，其余七个板块为摘要，
          岁运与命例亦有裁剪。个人命书含完整十大板块、九步大运、三年流年与当年流月。
        </p>
      </section>

      {/* 基本命盘 */}
      <section className="container mx-auto px-4 py-4 max-w-3xl">
        <div className="bg-white rounded-lg shadow p-5">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 mb-4">
            <span className="font-bold text-amber-900">{demo.meta.name}</span>
            <span className="text-sm text-gray-600">{demo.meta.gender}</span>
            <span className="text-sm text-gray-600">{demo.meta.birthText}</span>
            <span className="text-sm text-gray-600">{demo.meta.place}</span>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center mb-4">
            {demo.pillars.map((pl) => (
              <div key={pl.label} className="rounded bg-amber-50 px-2 py-3">
                <div className="text-xs text-gray-500">{pl.label}</div>
                <div className="text-xl font-bold text-amber-800">{pl.ganZhi}</div>
                <div className="text-[11px] text-amber-600">{pl.tenGodGan}</div>
                <div className="text-[10px] text-gray-400 mt-1">{pl.cangGanText}</div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-700">
            <span>日主：<b className="text-amber-800">{demo.dayMaster}</b></span>
            <span>旺衰：<b className="text-amber-800">{demo.wangShuai}</b></span>
            <span>格局：<b className="text-amber-800">{demo.geJu}</b></span>
            <span className="text-xs text-gray-400">胎元 {demo.taiYuan} · 命宫 {demo.mingGong}</span>
          </div>
          <div className="mt-4 border-t pt-3">
            <div className="text-xs text-gray-500 mb-2">大运（排盘信息，完整命书含逐步点评）</div>
            <div className="flex flex-wrap gap-2">
              {demo.daYun.map((d, i) => (
                <div key={i} className="rounded bg-amber-50 px-3 py-1.5 text-center">
                  <span className="font-bold text-amber-800 text-sm">{d.ganZhi}</span>
                  <span className="text-[11px] text-gray-500 ml-1">{d.startAge}-{d.startAge + 9}岁</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 岁运时间轴（节选：前 2 步大运 + 当年流年） */}
      <section className="container mx-auto px-4 py-4 max-w-3xl">
        <div className="bg-white rounded-lg shadow p-5">
          <h2 className="font-semibold text-amber-800 mb-1">岁运时间轴（节选）</h2>
          <p className="text-xs text-gray-500 mb-3">
            示例只展示前 {demo.luckCycles.daYun.length} 步大运与当年流年；完整命书含九步大运、三年流年与当年十二个节令月。
          </p>
          <div className="flex flex-wrap gap-2 mb-3">
            {demo.luckCycles.daYun.map((d, i) => (
              <div key={i} className={`rounded px-3 py-2 text-center border min-w-[78px] ${d.current ? 'bg-amber-50 border-amber-500' : 'bg-gray-50 border-gray-200'}`}>
                <div className="font-bold text-amber-800">{d.ganZhi}</div>
                <div className="text-xs text-gray-500">{d.startAge}-{d.startAge + 9}岁</div>
                <span className={`inline-block text-[11px] px-1.5 rounded mt-1 ${TAG_BADGE[d.tag] ?? ''}`}>{d.tag}</span>
              </div>
            ))}
          </div>
          {demo.luckCycles.liuNian.map((y, i) => (
            <div key={i} className="rounded border-l-4 border-amber-200 bg-gray-50 p-3">
              <div className="flex items-center justify-between gap-1">
                <span className="font-bold text-amber-800">{y.year}年 {y.ganZhi}</span>
                <span className={`text-[11px] px-1.5 py-0.5 rounded ${TAG_BADGE[y.tag] ?? ''}`}>{y.tag}</span>
              </div>
              <div className="text-xs text-gray-500 mt-1">{y.shiShenGan}主事{y.daYunGanZhi ? ` · 行${y.daYunGanZhi}运` : ''}</div>
              <p className="text-xs text-gray-700 mt-2 leading-relaxed">{y.note}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 十大板块：前 3 完整，后 7 摘要 */}
      <section className="container mx-auto px-4 py-4 max-w-3xl space-y-4">
        {demo.sectionList.map((spec) => {
          const isFull = fullKeys.includes(spec.key)
          const text = demo.sections[spec.key as keyof typeof demo.sections]
          return (
            <div key={spec.key} className="bg-white rounded-lg shadow p-5">
              <div className="flex items-center gap-2 mb-2">
                <h2 className="font-semibold text-amber-800">{spec.name}</h2>
                <span className={`text-[11px] px-2 py-0.5 rounded ${isFull ? 'bg-amber-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                  {isFull ? '完整展示' : '摘要 · 完整版约数倍篇幅'}
                </span>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{text}</p>
            </div>
          )
        })}
      </section>

      {/* 古籍相似命例（1 条） */}
      {demo.similarCases.length > 0 && (
        <section className="container mx-auto px-4 py-4 max-w-3xl">
          <div className="bg-white rounded-lg shadow p-5">
            <h2 className="font-semibold text-amber-800 mb-1">古籍相似命例（节选 1 条）</h2>
            <p className="text-xs text-gray-500 mb-3">完整命书按四柱结构相似度检索多条典籍命例，供参照印证（仅供学习参考）</p>
            {demo.similarCases.map((c, i) => (
              <div key={i} className={`rounded-lg border p-3 ${c.exact ? 'border-amber-400 bg-amber-50' : 'border-gray-200'}`}>
                <div className="flex flex-wrap items-baseline gap-2 mb-1">
                  <span className="font-bold text-amber-900">{c.person || '未具名命造'}</span>
                  <span className="text-sm text-gray-700">{c.pillars.year} {c.pillars.month} {c.pillars.day} {c.pillars.hour}</span>
                  <span className="text-xs text-gray-400 ml-auto">{c.source}</span>
                </div>
                <div className="flex flex-wrap gap-1 mb-1">
                  {c.matches.map((m, j) => (
                    <span key={j} className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">{m}</span>
                  ))}
                </div>
                <p className="text-sm text-gray-700 leading-relaxed mt-2">{c.text}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="bg-gradient-to-r from-amber-500 to-amber-600 rounded-xl shadow-lg p-8 text-white text-center">
          <h2 className="text-2xl font-bold mb-2">想看自己的完整命书？</h2>
          <p className="opacity-90 text-sm mb-5">十大板块完整解读 · 九步大运逐年点评 · 三年流年与当年流月 · 多条古籍命例参照</p>
          <Link
            href="/mingshu"
            className="inline-block bg-white text-amber-600 px-8 py-3 rounded-full font-bold hover:bg-amber-50 transition"
          >
            生成我的命书
          </Link>
        </div>
        <p className="text-center text-xs text-gray-400 mt-6 leading-relaxed">
          示例使用虚构出生资料，仅用于展示报告结构与文风。<br />
          本站内容基于传统命理文化整理，仅供学习参考与娱乐，不构成任何人生、医疗、法律、财务决策建议。
        </p>
      </section>
    </main>
  )
}
