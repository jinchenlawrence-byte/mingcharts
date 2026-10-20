'use client'

// 紫微结果渲染（生成页与 /reports/[id] 回看页共用）
// 纯展示组件：数据进来渲染，宫位选中交互 state 内聚于此
import { useState } from 'react'
import type { ZwChart, ZiweiAnalysis, PeriodRead } from '@/lib/ziwei'
import type { ZiweiAIReport } from '@/lib/aiZiwei'
import { SKUS, formatPriceUSD } from '@/lib/pricing'
import { isRuleVersion } from '@/lib/reportGate'
import CheckoutButton from '@/components/CheckoutButton'

export interface ZiweiResultData {
  chart: ZwChart
  analysis: ZiweiAnalysis
  ai: ZiweiAIReport | null
  aiSource: string
  // ★ 门禁（§8.5.1）：未解锁时给 preview 与 skus，已解锁为 null
  locked?: { skus: string[]; preview: string } | null
  trueSolar: {
    birthplace: string | null
    zone: string
    lng: number
    offsetMin: number
    dstNotice: string | null
  } | null
}

// 传统盘 4×4 布局（palace index）
const LAYOUT: Array<{ i: number; r: number; c: number }> = [
  { i: 3, r: 1, c: 1 }, { i: 4, r: 1, c: 2 }, { i: 5, r: 1, c: 3 }, { i: 6, r: 1, c: 4 },
  { i: 2, r: 2, c: 1 }, { i: 7, r: 2, c: 4 },
  { i: 1, r: 3, c: 1 }, { i: 8, r: 3, c: 4 },
  { i: 0, r: 4, c: 1 }, { i: 11, r: 4, c: 2 }, { i: 10, r: 4, c: 3 }, { i: 9, r: 4, c: 4 }
]

const MUTAGEN_COLOR: Record<string, string> = {
  禄: 'text-green-700',
  权: 'text-indigo-700',
  科: 'text-cyan-700',
  忌: 'text-red-700'
}

const PATTERN_BADGE: Record<string, string> = {
  吉: 'bg-green-100 text-green-700',
  平: 'bg-gold/10 text-ink/70',
  忌: 'bg-red-100 text-red-700'
}

// ★ 十二板块渲染顺序与标题（2026-10-18 定价 A+C）：
//   此处另抄一份（而非 import aiZiwei.SECTION_ORDER）是为了不让 aiZiwei/ziwei 的运行时
//   （含 iztro）进客户端包；漂移由 scripts/test-checker-accept.mjs 的「View 渲染表 vs
//   SECTION_ORDER 逐项比对」断言守护 —— 抄一份可以，抄一份且无人看守不行。
const SECTIONS: Array<[keyof ZiweiAIReport, string]> = [
  ['overview', '命格总论'],
  ['personality', '性格底色'],
  ['palaces', '十二宫导读'],
  ['career', '事业格局'],
  ['wealth', '财富财运'],
  ['marriage', '感情婚姻'],
  ['health', '身心安康'],
  ['transforms', '生年四化专题'],
  ['patterns', '格局成败'],
  ['decadal', '大限十年'],
  ['yearly', '流年与流月'],
  ['advice', '趋避建议']
]

export default function ZiweiResultView({ data, onRegen, regenBusy }: {
  data: ZiweiResultData
  /** ★ 规则版兜底时的「重新生成」出口（模块页下传）；回看页无此能力时不传＝不显示 */
  onRegen?: () => void
  regenBusy?: boolean
}) {
  const { chart, analysis, ai, aiSource, trueSolar, locked } = data
  const [selected, setSelected] = useState<number | null>(chart.mingIndex)
  // ★ 付费用户拿到规则版兜底（AI 结果未过合规校验）时，标签旁必须给出口，否则只能要求退款
  const ruleVersion = isRuleVersion(aiSource)

  const periodPalaceIndex = (p: PeriodRead): number =>
    chart.palaces.findIndex((x) => x.name === p.basePalace)

  return (
    <div className="space-y-6">
      {/* 命盘 4×4 */}
      <div className="hw-c-box hw-c-boxLg p-3 md:p-5">
        <div className="grid grid-cols-4 gap-1.5 md:gap-2">
          {LAYOUT.map(({ i, r, c }) => {
            const p = chart.palaces[i]
            const isMing = i === chart.mingIndex
            const isDecadal = i === periodPalaceIndex(analysis.decadal)
            const isYearly = i === periodPalaceIndex(analysis.yearly)
            const isXiaoxian = p.name === analysis.xiaoxian.basePalace
            const isSel = selected === i
            return (
              <button key={i}
                onClick={() => setSelected(i)}
                style={{ gridRow: r, gridColumn: c }}
                className={`text-left rounded-md border p-1.5 md:p-2 min-h-[92px] md:min-h-[120px] transition ${
                  isSel ? 'border-purple-500 ring-2 ring-purple-300 bg-gold/5'
                    : isMing ? 'border-purple-300 bg-gold/5/50'
                      : 'border-gold/15 hover:border-purple-300'
                }`}>
                <div className="flex items-baseline justify-between">
                  <span className={`text-xs md:text-sm font-bold ${isMing ? 'text-ink' : 'text-ink/70'}`}>
                    {p.name}
                  </span>
                  <span className="text-[10px] text-ink-light/60">{p.ganZhi}</span>
                </div>
                <div className="mt-0.5 space-y-px">
                  {p.majorStars.length === 0 && (
                    <div className="text-[10px] md:text-xs text-ink-light/60">空宫</div>
                  )}
                  {p.majorStars.map((s) => (
                    <div key={s.name} className="flex items-baseline gap-0.5">
                      <span className={`text-[11px] md:text-xs font-medium ${s.mutagen ? MUTAGEN_COLOR[s.mutagen] : 'text-ink'}`}>
                        {s.name}{s.mutagen ? '·' + s.mutagen : ''}
                      </span>
                      {s.brightness && <span className="text-[9px] text-ink-light/60">{s.brightness}</span>}
                    </div>
                  ))}
                </div>
                <div className="mt-0.5 text-[9px] md:text-[10px] text-ink-light/60 truncate">
                  {p.minorStars.slice(0, 4).map((s) => s.name).join(' ')}
                  {p.minorStars.length > 4 ? '…' : ''}
                </div>
                <div className="mt-0.5 flex flex-wrap gap-0.5">
                  {isMing && <span className="text-[9px] bg-cinnabar text-white px-1 rounded">命</span>}
                  {p.isBodyPalace && <span className="text-[9px] bg-indigo-500 text-white px-1 rounded">身</span>}
                  {isDecadal && <span className="text-[9px] bg-gold/50 text-white px-1 rounded">大限</span>}
                  {isYearly && <span className="text-[9px] bg-green-600 text-white px-1 rounded">流年</span>}
                  {isXiaoxian && <span className="text-[9px] bg-paper-dark/300 text-white px-1 rounded">小限</span>}
                </div>
              </button>
            )
          })}

          {/* 中宫信息 */}
          <div style={{ gridRow: '2 / 4', gridColumn: '2 / 4' }}
            className="hidden md:flex flex-col items-center justify-center rounded-[20px] border border-gold/25 bg-paper-dark/20 p-4 text-center">
                <div className="hw-c-h3 mb-1">紫微命盘</div>
            <div className="text-xs text-ink-light mb-2">{chart.lunarDate}</div>
            {trueSolar && (
              <div className="text-[10px] text-purple-500 mb-1">
                真太阳时：{trueSolar.offsetMin >= 0 ? '+' : ''}{trueSolar.offsetMin} 分钟
                （{trueSolar.zone}）
              </div>
            )}
            {trueSolar?.dstNotice && (
              <div className="text-[10px] text-amber-600 mb-1 max-w-[90%]">
                {trueSolar.dstNotice}
              </div>
            )}
            <div className="text-xs text-ink-light">{chart.fiveElementsClass}</div>
            <div className="text-xs text-ink-light mt-1">命主 {chart.soul} · 身主 {chart.body}</div>
            <div className="mt-3">
              <div className="text-3xl font-bold text-ink/70">{analysis.score}</div>
              <div className="text-xs text-ink-light">{analysis.scoreLabel}</div>
            </div>
          </div>
        </div>
        <p className="text-xs text-ink-light/60 text-center mt-3">点击宫位查看详细星曜</p>
      </div>

      {/* 选中宫位详情 */}
      {selected !== null && (
        <div className="hw-c-box hw-c-boxLg">
          {(() => {
            const p = chart.palaces[selected]
            return (
              <div>
                <h3 className="hw-c-h3">
                  {p.name}宫 · {p.ganZhi}
                  {p.isBodyPalace && <span className="ml-2 text-xs bg-ink text-white px-2 py-0.5 rounded-full">身宫</span>}
                </h3>
                <div className="grid md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-xs text-ink-light/60 mb-1">主星</div>
                    {p.majorStars.length === 0 ? (
                      <div className="text-ink-light/60">空宫，借对宫主星为用：
                        {chart.palaces[(p.index + 6) % 12].majorStars.map((s) => s.name).join('、') || '对宫亦空'}
                      </div>
                    ) : (
                      p.majorStars.map((s) => (
                        <span key={s.name} className={`mr-2 ${s.mutagen ? MUTAGEN_COLOR[s.mutagen] + ' font-semibold' : ''}`}>
                          {s.name}{s.brightness ? '(' + s.brightness + ')' : ''}{s.mutagen ? '化' + s.mutagen : ''}
                        </span>
                      ))
                    )}
                  </div>
                  <div>
                    <div className="text-xs text-ink-light/60 mb-1">辅星杂曜</div>
                    <div className="text-ink/70">
                      {[...p.minorStars.map((s) => s.name), ...p.adjectiveStars].join('、') || '无'}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-ink-light/60 mt-2">长生十二神：{p.changsheng12}　|　大限年龄：{p.decadalRange[0]}-{p.decadalRange[1]}岁</div>
              </div>
            )
          })()}
        </div>
      )}

      {/* 格局 */}
      <div className="hw-c-box hw-c-boxLg">
        <h3 className="hw-c-h3">传统格局</h3>
        <div className="space-y-2">
          {analysis.patterns.map((p) => (
            <div key={p.name} className="flex items-start gap-2">
              <span className={`text-xs px-2 py-0.5 rounded mt-0.5 ${PATTERN_BADGE[p.level]}`}>{p.level}</span>
              <div>
                <span className="font-medium text-ink">{p.name}</span>
                <span className="text-sm text-ink-light ml-2">{p.note}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 生年四化 */}
      <div className="hw-c-box hw-c-boxLg">
        <h3 className="hw-c-h3">生年四化</h3>
        <div className="grid md:grid-cols-2 gap-3">
          {analysis.transforms.map((t) => (
            <div key={t.star} className="rounded-md border border-gold/15 p-3">
              <div className={`font-semibold ${MUTAGEN_COLOR[t.type]}`}>
                {t.star}化{t.type} · {t.palace}宫
              </div>
              <p className="text-sm text-ink-light mt-1">{t.note}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 大限/流年 */}
      {[analysis.decadal, analysis.yearly].map((p) => (
        <div key={p.title} className="hw-c-box hw-c-boxLg">
            <h3 className="hw-c-h3">{p.title}</h3>
          <div className="text-sm text-ink/70 mb-2">
            {p.ganZhi}，命宫坐原局<span className="font-medium">{p.basePalace}</span>宫
            {p.range && <span className="text-ink-light/60">（{p.range}）</span>}
          </div>
          <div className="text-sm text-ink/70 mb-2">星曜：{p.stars.join('、')}</div>
          <div className="text-sm text-ink/70 mb-2">四化：{p.transforms.join('；')}</div>
          <div className="flex flex-wrap gap-1">
            {p.tags.map((t) => (
              <span key={t} className="text-xs bg-purple-100 text-ink/70 px-2 py-0.5 rounded">{t}</span>
            ))}
          </div>
        </div>
      ))}

      {/* AI 深度解读：未解锁时显示 preview 与解锁引导（§8.5.1 门禁消费） */}
      {locked && (
        <div className="hw-c-box hw-c-boxLg text-center">
          <p className="text-sm text-ink-light mb-4">{locked.preview}</p>
          {locked.skus.map((skuId) => {
            const sku = SKUS[skuId as keyof typeof SKUS]
            if (!sku) return null
            // ★ 直连收银台（2026-10-18 修复）：旧实现 href="/pricing" 把用户丢去价格页再点一次，
            //   且「紫微深度」在价格页的按钮同样绕路（真实事故）。returnTo=/reports：付完回我的报告
            //   看已解锁内容（紫微与命盘无绑定关系，requireChart=false —— 未排盘也能买）。
            return (
              <div key={skuId} className="max-w-xs mx-auto mb-2">
                <CheckoutButton sku={sku.id} available requireChart={false} returnTo="/reports">
                  解锁 {sku.name} {formatPriceUSD(sku.priceUSD)}
                </CheckoutButton>
              </div>
            )
          })}
        </div>
      )}
      {ai && (
        <div className="space-y-4">
          <h2 className="hw-c-h1">深度解读 · {aiSource}</h2>
          {/* ★ 规则版兜底出口（2026-10-18 退款事故）：AI 重写全文、覆盖原报告，不额外收费 */}
          {ruleVersion && onRegen && (
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onRegen}
                disabled={regenBusy}
                className="px-4 py-1.5 rounded-full border border-gold/20 bg-white text-sm font-medium text-ink hover:border-ink transition disabled:opacity-50"
              >
                {regenBusy ? '重新生成中...' : '免费重新生成'}
              </button>
              <span className="text-xs text-ink-light/50">不额外收费 · AI 将重写全文并覆盖本报告</span>
            </div>
          )}
          {/* ★ 按【存在键】渲染（2026-10-18）：老报告（库里 6 键）照旧显示原有板块，
              缺键不出现空标题；新报告 12 板块全量显示 */}
          {SECTIONS
            .filter(([key]) => {
              const v = ai[key] as string | undefined
              return typeof v === 'string' && v.trim().length > 0
            })
            .map(([key, title]) => (
              <div key={key} className="hw-c-box hw-c-boxLg">
                <h3 className="hw-c-h3">{title}</h3>
                <p className="text-sm text-ink/70 leading-relaxed whitespace-pre-line">{ai[key]}</p>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}
