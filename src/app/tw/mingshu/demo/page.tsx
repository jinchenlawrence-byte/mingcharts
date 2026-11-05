import type { Metadata } from 'next'
import Link from 'next/link'
import demo from '@/data/demo-fatebook.json'
import { toHant } from '@/lib/hant'
import { hantAlternates } from '@/lib/hant-seo'

// 公開示例命書（繁體）：與 /mingshu/demo 讀同一份靜態 JSON，經 toHant 派生。
// ★ 零 AI、零 IO、零登入門檻。
const H = (s: string) => toHant(s)

export const metadata: Metadata = {
  title: '示例命書 · 虛構出生資料 · 展示前約 30%',
  description:
    '公開示例命書：以虛構出生資料（1990-06-15 10:30 男 上海）生成的真實命書節選。完整展示八字總覽、性格天賦、用神喜忌三個板塊，其餘七個板塊為摘要，供你在解鎖前了解命書報告的深度與文風。',
  alternates: { canonical: '/tw/mingshu/demo', languages: hantAlternates('/mingshu/demo') },
}

const TAG_BADGE: Record<string, string> = {
  '较宜': 'bg-emerald-50 text-emerald-600', '平顺': 'bg-paper-dark/40 text-ink-light',
  '一般': 'bg-gold/10 text-ink/70', '宜慎': 'bg-orange-100 text-orange-700'
}

export default function HantDemoFatebookPage() {
  const fullKeys: readonly string[] = demo.fullSections
  return (
    <main className="hw-page">
      <div className="hw-wrap hw-c-pg">
        <div className="max-w-3xl mx-auto">
      {/* 顶部标注 */}
      <section className="pt-10 pb-4 text-center">
        <span className="inline-block bg-gold/10 text-ink text-xs font-semibold px-3 py-1 rounded-full mb-4">
          {H('示例 · 虛構出生資料 · 展示前約 30%')}
        </span>
        <h1 className="hw-c-h1 text-3xl! md:text-4xl!">{H('公開示例命書')}</h1>
        <p className="hw-lede text-sm! mx-auto!">
          {H('這是一份用虛構出生資料真實生成的命書節選：前三個板塊完整展示，其餘七個板塊為摘要，歲運與命例亦有裁剪。個人命書含完整十大板塊、九步大運、三年流年與當年流月。')}
        </p>
      </section>

      {/* 基本命盘 */}
      <section className="py-4">
        <div className="hw-c-box">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 mb-4">
            <span className="font-bold text-ink">{H(demo.meta.name)}</span>
            <span className="text-sm text-ink-light">{H(demo.meta.gender)}</span>
            <span className="text-sm text-ink-light">{H(demo.meta.birthText)}</span>
            <span className="text-sm text-ink-light">{H(demo.meta.place)}</span>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center mb-4">
            {demo.pillars.map((pl) => (
              <div key={pl.label} className="rounded bg-gold/5 px-2 py-3">
                <div className="text-xs text-ink-light">{H(pl.label)}</div>
                <div className="text-xl font-bold text-ink">{pl.ganZhi}</div>
                <div className="text-[11px] text-amber-600">{H(pl.tenGodGan)}</div>
                <div className="text-[10px] text-ink-light mt-1">{H(pl.cangGanText)}</div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-ink/70">
            <span>{H('日主：')}<b className="text-ink">{demo.dayMaster}</b></span>
            <span>{H('旺衰：')}<b className="text-ink">{H(demo.wangShuai)}</b></span>
            <span>{H('格局：')}<b className="text-ink">{H(demo.geJu)}</b></span>
            <span className="text-xs text-ink-light">{H('胎元')} {demo.taiYuan} · {H('命宮')} {demo.mingGong}</span>
          </div>
          <div className="mt-4 border-t pt-3">
            <div className="text-xs text-ink-light mb-2">{H('大運（排盤資訊，完整命書含逐步點評）')}</div>
            <div className="flex flex-wrap gap-2">
              {demo.daYun.map((d, i) => (
                <div key={i} className="rounded bg-gold/5 px-3 py-1.5 text-center">
                  <span className="font-bold text-ink text-sm">{d.ganZhi}</span>
                  <span className="text-[11px] text-ink-light ml-1">{d.startAge}-{d.startAge + 9}{H('歲')}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 岁运时间轴 */}
      <section className="py-4">
        <div className="hw-c-box">
          <h2 className="hw-c-secTitle">{H('歲運時間軸（節選）')}</h2>
          <p className="text-xs text-ink-light mb-3">
            {H(`示例只展示前 ${demo.luckCycles.daYun.length} 步大運與當年流年；完整命書含九步大運、三年流年與當年十二個節令月。`)}
          </p>
          <div className="flex flex-wrap gap-2 mb-3">
            {demo.luckCycles.daYun.map((d, i) => (
              <div key={i} className={`rounded px-3 py-2 text-center border min-w-[78px] ${d.current ? 'bg-gold/5 border-amber-500' : 'bg-paper-dark/30 border-gold/15'}`}>
                <div className="font-bold text-ink">{d.ganZhi}</div>
                <div className="text-xs text-ink-light">{d.startAge}-{d.startAge + 9}{H('歲')}</div>
                <span className={`inline-block text-[11px] px-1.5 rounded mt-1 ${TAG_BADGE[d.tag] ?? ''}`}>{H(d.tag)}</span>
              </div>
            ))}
          </div>
          {demo.luckCycles.liuNian.map((y, i) => (
            <div key={i} className="rounded border-l-4 border-gold/20 bg-paper-dark/30 p-3">
              <div className="flex items-center justify-between gap-1">
                <span className="font-bold text-ink">{y.year}{H('年')} {y.ganZhi}</span>
                <span className={`text-[11px] px-1.5 py-0.5 rounded ${TAG_BADGE[y.tag] ?? ''}`}>{H(y.tag)}</span>
              </div>
              <div className="text-xs text-ink-light mt-1">{H(y.shiShenGan)}{H('主事')}{y.daYunGanZhi ? ` · ${H('行')}${y.daYunGanZhi}${H('運')}` : ''}</div>
              <p className="text-xs text-ink/70 mt-2 leading-relaxed">{H(y.note)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 十大板块 */}
      <section className="py-4 space-y-4">
        {demo.sectionList.map((spec) => {
          const isFull = fullKeys.includes(spec.key)
          const text = demo.sections[spec.key as keyof typeof demo.sections]
          return (
            <div key={spec.key} className="hw-c-box">
              <div className="flex items-center gap-2 mb-2">
                <h2 className="font-semibold text-ink">{H(spec.name)}</h2>
                <span className={`text-[11px] px-2 py-0.5 rounded ${isFull ? 'bg-amber-600 text-white' : 'bg-paper-dark/40 text-ink-light'}`}>
                  {isFull ? H('完整展示') : H('摘要 · 完整版約數倍篇幅')}
                </span>
              </div>
              <p className="text-sm text-ink/70 leading-relaxed whitespace-pre-line">{H(text)}</p>
            </div>
          )
        })}
      </section>

      {/* 古籍相似命例 */}
      {demo.similarCases.length > 0 && (
        <section className="py-4">
          <div className="hw-c-box">
            <h2 className="hw-c-secTitle">{H('古籍相似命例（節選 1 條）')}</h2>
            <p className="text-xs text-ink-light mb-3">{H('完整命書按四柱結構相似度檢索多條典籍命例，供參照印證（僅供學習參考）')}</p>
            {demo.similarCases.map((c, i) => (
              <div key={i} className={`rounded-lg border p-3 ${c.exact ? 'border-amber-400 bg-gold/5' : 'border-gold/15'}`}>
                <div className="flex flex-wrap items-baseline gap-2 mb-1">
                  <span className="font-bold text-ink">{c.person ? H(c.person) : H('未具名命造')}</span>
                  <span className="text-sm text-ink/70">{c.pillars.year} {c.pillars.month} {c.pillars.day} {c.pillars.hour}</span>
                  <span className="text-xs text-ink-light ml-auto">{H(c.source)}</span>
                </div>
                <div className="flex flex-wrap gap-1 mb-1">
                  {c.matches.map((m, j) => (
                    <span key={j} className="text-xs bg-gold/10 text-ink/70 px-1.5 py-0.5 rounded">{H(m)}</span>
                  ))}
                </div>
                <p className="text-sm text-ink/70 leading-relaxed mt-2">{H(c.text)}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-8">
        <div className="hw-c-cta">
          <h2 className="hw-c-secTitle">{H('想看自己的完整命書？')}</h2>
          <p className="hw-c-dx">{H('十大板塊完整解讀 · 九步大運逐年點評 · 三年流年與當年流月 · 多條古籍命例參照')}</p>
          <Link href="/tw/mingshu" className="hw-c-btnBig">
            {H('生成我的命書')}
          </Link>
        </div>
        <p className="text-center text-xs text-ink-light mt-6 leading-relaxed">
          {H('示例使用虛構出生資料，僅用於展示報告結構與文風。')}<br />
          {H('本站內容基於傳統命理文化整理，僅供學習參考與娛樂，不構成任何人生、醫療、法律、財務決策建議。')}
        </p>
      </section>
        </div>
      </div>
    </main>
  )
}
