'use client'

// 紫微结果渲染（生成页与 /reports/[id] 回看页共用）
// 纯展示组件：数据进来渲染，宫位选中交互 state 内聚于此
import { useState } from 'react'
import type { ZwChart, ZiweiAnalysis, PeriodRead } from '@/lib/ziwei'
import type { ZiweiAIReport } from '@/lib/aiZiwei'
import { SKUS, formatPriceUSD } from '@/lib/pricing'

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
  平: 'bg-amber-100 text-amber-700',
  忌: 'bg-red-100 text-red-700'
}

export default function ZiweiResultView({ data }: { data: ZiweiResultData }) {
  const { chart, analysis, ai, aiSource, trueSolar, locked } = data
  const [selected, setSelected] = useState<number | null>(chart.mingIndex)

  const periodPalaceIndex = (p: PeriodRead): number =>
    chart.palaces.findIndex((x) => x.name === p.basePalace)

  return (
    <div className="space-y-6">
      {/* 命盘 4×4 */}
      <div className="bg-white rounded-lg shadow p-3 md:p-5">
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
                  isSel ? 'border-purple-500 ring-2 ring-purple-300 bg-purple-50'
                    : isMing ? 'border-purple-300 bg-purple-50/50'
                      : 'border-gray-200 hover:border-purple-300'
                }`}>
                <div className="flex items-baseline justify-between">
                  <span className={`text-xs md:text-sm font-bold ${isMing ? 'text-purple-800' : 'text-gray-700'}`}>
                    {p.name}
                  </span>
                  <span className="text-[10px] text-gray-400">{p.ganZhi}</span>
                </div>
                <div className="mt-0.5 space-y-px">
                  {p.majorStars.length === 0 && (
                    <div className="text-[10px] md:text-xs text-gray-400">空宫</div>
                  )}
                  {p.majorStars.map((s) => (
                    <div key={s.name} className="flex items-baseline gap-0.5">
                      <span className={`text-[11px] md:text-xs font-medium ${s.mutagen ? MUTAGEN_COLOR[s.mutagen] : 'text-gray-800'}`}>
                        {s.name}{s.mutagen ? '·' + s.mutagen : ''}
                      </span>
                      {s.brightness && <span className="text-[9px] text-gray-400">{s.brightness}</span>}
                    </div>
                  ))}
                </div>
                <div className="mt-0.5 text-[9px] md:text-[10px] text-gray-500 truncate">
                  {p.minorStars.slice(0, 4).map((s) => s.name).join(' ')}
                  {p.minorStars.length > 4 ? '…' : ''}
                </div>
                <div className="mt-0.5 flex flex-wrap gap-0.5">
                  {isMing && <span className="text-[9px] bg-purple-600 text-white px-1 rounded">命</span>}
                  {p.isBodyPalace && <span className="text-[9px] bg-indigo-500 text-white px-1 rounded">身</span>}
                  {isDecadal && <span className="text-[9px] bg-amber-500 text-white px-1 rounded">大限</span>}
                  {isYearly && <span className="text-[9px] bg-green-600 text-white px-1 rounded">流年</span>}
                  {isXiaoxian && <span className="text-[9px] bg-gray-500 text-white px-1 rounded">小限</span>}
                </div>
              </button>
            )
          })}

          {/* 中宫信息 */}
          <div style={{ gridRow: '2 / 4', gridColumn: '2 / 4' }}
            className="hidden md:flex flex-col items-center justify-center rounded-lg border-2 border-purple-200 bg-gradient-to-b from-purple-50 to-white p-4 text-center">
            <div className="text-lg font-bold text-purple-900 mb-1">紫微命盘</div>
            <div className="text-xs text-gray-600 mb-2">{chart.lunarDate}</div>
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
            <div className="text-xs text-gray-600">{chart.fiveElementsClass}</div>
            <div className="text-xs text-gray-600 mt-1">命主 {chart.soul} · 身主 {chart.body}</div>
            <div className="mt-3">
              <div className="text-3xl font-bold text-purple-700">{analysis.score}</div>
              <div className="text-xs text-gray-600">{analysis.scoreLabel}</div>
            </div>
          </div>
        </div>
        <p className="text-xs text-gray-400 text-center mt-3">点击宫位查看详细星曜</p>
      </div>

      {/* 选中宫位详情 */}
      {selected !== null && (
        <div className="bg-white rounded-lg shadow p-4">
          {(() => {
            const p = chart.palaces[selected]
            return (
              <div>
                <h3 className="font-semibold text-purple-800 mb-2">
                  {p.name}宫 · {p.ganZhi}
                  {p.isBodyPalace && <span className="ml-2 text-xs bg-indigo-500 text-white px-2 py-0.5 rounded">身宫</span>}
                </h3>
                <div className="grid md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">主星</div>
                    {p.majorStars.length === 0 ? (
                      <div className="text-gray-500">空宫，借对宫主星为用：
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
                    <div className="text-xs text-gray-500 mb-1">辅星杂曜</div>
                    <div className="text-gray-700">
                      {[...p.minorStars.map((s) => s.name), ...p.adjectiveStars].join('、') || '无'}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-gray-400 mt-2">长生十二神：{p.changsheng12}　|　大限年龄：{p.decadalRange[0]}-{p.decadalRange[1]}岁</div>
              </div>
            )
          })()}
        </div>
      )}

      {/* 格局 */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="font-semibold text-purple-800 mb-3">传统格局</h3>
        <div className="space-y-2">
          {analysis.patterns.map((p) => (
            <div key={p.name} className="flex items-start gap-2">
              <span className={`text-xs px-2 py-0.5 rounded mt-0.5 ${PATTERN_BADGE[p.level]}`}>{p.level}</span>
              <div>
                <span className="font-medium text-gray-800">{p.name}</span>
                <span className="text-sm text-gray-600 ml-2">{p.note}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 生年四化 */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="font-semibold text-purple-800 mb-3">生年四化</h3>
        <div className="grid md:grid-cols-2 gap-3">
          {analysis.transforms.map((t) => (
            <div key={t.star} className="rounded-md border border-gray-200 p-3">
              <div className={`font-semibold ${MUTAGEN_COLOR[t.type]}`}>
                {t.star}化{t.type} · {t.palace}宫
              </div>
              <p className="text-sm text-gray-600 mt-1">{t.note}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 大限/流年 */}
      {[analysis.decadal, analysis.yearly].map((p) => (
        <div key={p.title} className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold text-purple-800 mb-2">{p.title}</h3>
          <div className="text-sm text-gray-700 mb-2">
            {p.ganZhi}，命宫坐原局<span className="font-medium">{p.basePalace}</span>宫
            {p.range && <span className="text-gray-500">（{p.range}）</span>}
          </div>
          <div className="text-sm text-gray-700 mb-2">星曜：{p.stars.join('、')}</div>
          <div className="text-sm text-gray-700 mb-2">四化：{p.transforms.join('；')}</div>
          <div className="flex flex-wrap gap-1">
            {p.tags.map((t) => (
              <span key={t} className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">{t}</span>
            ))}
          </div>
        </div>
      ))}

      {/* AI 深度解读：未解锁时显示 preview 与解锁引导（§8.5.1 门禁消费） */}
      {locked && (
        <div className="bg-gray-100 rounded-lg p-6 text-center">
          <p className="text-sm text-gray-600 mb-4">{locked.preview}</p>
          {locked.skus.map((skuId) => {
            const sku = SKUS[skuId as keyof typeof SKUS]
            if (!sku) return null
            return (
              <a key={skuId} href="/pricing"
                className="inline-block px-6 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 mr-2">
                解锁 {sku.name} {formatPriceUSD(sku.priceUSD)}
              </a>
            )
          })}
        </div>
      )}
      {ai && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-purple-900">深度解读 · {aiSource}</h2>
          {([
            ['命格总论', ai.overview],
            ['事业格局', ai.career],
            ['财富财运', ai.wealth],
            ['感情婚姻', ai.marriage],
            ['身心安康', ai.health],
            ['大限流年', ai.yearly]
          ] as [string, string][]).map(([title, text]) => (
            <div key={title} className="bg-white rounded-lg shadow p-4">
              <h3 className="font-semibold text-purple-800 mb-2">{title}</h3>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
