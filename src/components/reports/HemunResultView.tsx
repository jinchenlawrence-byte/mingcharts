'use client'

// 合婚结果渲染（生成页与 /reports/[id] 回看页共用）
// 纯展示组件：数据进来渲染，不含请求逻辑
import type { HemunResult } from '@/lib/hemun'
import type { AIHemunSections } from '@/lib/aiHemun'
import { isRuleVersion } from '@/lib/reportGate'
import { PREVIEW_FREE } from '@/lib/reportPreview'
import { LockedCard, UnlockCta } from '@/components/reports/PreviewLock'

export interface HemunData {
  result: HemunResult
  ai: AIHemunSections | null
  aiSource: string
  dstNotices: { male: string | null; female: string | null }
  // ★ 门禁（§8.5.1）：未解锁时给 preview 与 skus，已解锁为 null
  locked?: { skus: string[]; preview: string } | null
  /** ★ 试读标记（route 下发；详情页无此字段时按 locked 推断） */
  preview?: { only: boolean; keys: string[] }
}

// ───────── 依据徽章（四类视觉可分）─────────
const BASIS_STYLE: Record<string, string> = {
  '典籍': 'bg-amber-700 text-white border border-amber-700',
  '古法': 'bg-gold/10 text-ink border border-amber-300',
  '民俗': 'bg-white text-ink-light border border-gold/20',
  '产品设定': 'bg-white text-ink-light/60 border border-dashed border-gold/20',
}

// ───────── 命盘摘要 ─────────
function ChartBriefCard({ title, b, color, dstNotice }: {
  title: string
  b: HemunResult['male']
  color: string
  dstNotice?: string | null
}) {
  return (
    <div className="hw-c-box hw-c-boxLg">
      <h3 className={`hw-c-h3 ${color}`}>{title}</h3>
      <div className="grid grid-cols-4 gap-1 text-center text-sm mb-2">
        {(['year', 'month', 'day', 'hour'] as const).map((k, i) => (
          <div key={k} className="bg-gold/5 rounded py-1.5">
            <div className="text-[10px] text-ink-light/60">{['年柱','月柱','日柱','时柱'][i]}</div>
            <div className="font-bold text-ink">{b.ganZhi[k]}</div>
          </div>
        ))}
      </div>
      <div className="text-xs text-ink-light space-y-0.5">
        <div>日主：<span className="font-medium text-ink">{b.dayMaster}</span>　旺衰：{b.wangShuai}　格局：{b.geJu}</div>
        <div>年柱纳音：{b.yearNaYin}</div>
      </div>
      {dstNotice && (
        <div className="mt-2 rounded border border-gold/20 bg-gold/5 px-2 py-1.5 text-[11px] text-ink">
          ⚠ {dstNotice}
        </div>
      )}
    </div>
  )
}

const AI_SECTIONS: Array<{ key: keyof AIHemunSections; name: string }> = [
  { key: 'overview', name: '配对总评' },
  { key: 'shengxiao', name: '生肖年柱' },
  { key: 'rizhu', name: '日柱夫妻宫' },
  { key: 'ouxing', name: '配偶星·感情模式' },
  { key: 'wuxing', name: '五行互补·喜用互助' },
  { key: 'advice', name: '相处建议·流年节奏' },
]

export default function HemunResultView({ data, onRegen, regenBusy }: {
  data: HemunData
  /** ★ 规则版兜底时的「重新生成」出口（模块页下传）；回看页无此能力时不传＝不显示 */
  onRegen?: () => void
  regenBusy?: boolean
}) {
  const r = data.result
  // ★ 付费用户拿到规则版兜底（AI 结果未过合规校验）时，标签旁必须给出口，否则只能要求退款
  const ruleVersion = isRuleVersion(data.aiSource)
  // ★ 试读模式：route 明确下发 preview.only；详情页（reportGate 重算）没有该字段时按 locked 推断
  const previewMode = data.preview?.only ?? !!data.locked
  const freeDims = previewMode
    ? r.dimensions.filter(d => PREVIEW_FREE.hemun.includes(d.key))
    : r.dimensions
  const lockedDims = previewMode
    ? r.dimensions.filter(d => !PREVIEW_FREE.hemun.includes(d.key))
    : []
  return (
    <div className="space-y-6">
      {/* 总观感（主展示，非分数） */}
      <div className="bg-white rounded-[26px] shadow-sm border border-gold/15 p-6 text-center">
        <div className="text-xs text-ink-light/60 mb-1">合婚总观感</div>
        <div className="hw-c-h1">{r.overall}</div>
        {r.keyTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3 justify-center">
            {r.keyTags.map(t => (
              <span key={t} className="text-xs bg-red-50 text-red-700 border border-red-200 rounded px-2 py-0.5">
                {t}
              </span>
            ))}
          </div>
        )}
        <div className="text-xs text-ink-light/60 mt-3">
          内部算法参考分 {r.totalScore}（非命理定论，仅供排序调试）
        </div>
        <div className="text-xs text-ink-light/60 mt-1">
          当前大运：男 {r.currentLuck.male} ／ 女 {r.currentLuck.female}
        </div>
      </div>

      {/* 两盘摘要 */}
      <div className="grid md:grid-cols-2 gap-4">
        <ChartBriefCard title="男方命盘" b={r.male} color="text-blue-700"
          dstNotice={data.dstNotices?.male} />
        <ChartBriefCard title="女方命盘" b={r.female} color="text-rose-700"
          dstNotice={data.dstNotices?.female} />
      </div>

      {/* 维度卡片（分项展示，依据分级） */}
      <div className="space-y-3">
        <h2 className="hw-c-h3">
          {previewMode
            ? `分项维度（免费预览 ${freeDims.length} 项 · 另 ${lockedDims.length} 项解锁后可见）`
            : `分项维度（${r.dimensions.length} 项 · 依据分级如实标注）`}
        </h2>
        {freeDims.map(d => {
          const levelCls = d.level === '吉'
            ? 'bg-green-50 border-green-200 text-green-700'
            : d.level === '忌'
              ? 'bg-red-50 border-red-200 text-red-700'
              : 'bg-paper-dark/30 border-gold/15 text-ink-light/60'
          return (
            <div key={d.key} className="hw-c-box hw-c-boxLg">
              <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
                <span className="font-semibold text-ink">{d.name}</span>
                {d.key === 'dayun' && (
                  <span className="text-[11px] text-ink-light/60 font-normal">· 仅示当前节奏，不参与总评</span>
                )}
                <div className="flex items-center gap-1.5">
                  <span className={`text-[11px] rounded px-2 py-0.5 ${BASIS_STYLE[d.basis] || ''}`}>
                    {d.basis}
                  </span>
                  <span className={`text-xs border rounded px-2 py-0.5 ${levelCls}`}>
                    {d.level}
                  </span>
                </div>
              </div>
              <p className="text-sm text-ink mb-2">{d.verdict}</p>
              {d.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {d.tags.map(t => (
                    <span key={t} className="text-[11px] bg-gold/5 text-ink/70 rounded px-1.5 py-0.5">
                      {t}
                    </span>
                  ))}
                </div>
              )}
              <ul className="text-xs text-ink-light space-y-0.5 list-disc list-inside">
                {d.facts.map((f, i) => <li key={i}>{f}</li>)}
              </ul>
              {d.citations && d.citations.length > 0 && (
                <p className="text-[11px] text-ink-light/60 mt-2">依据：{d.citations.join('；')}</p>
              )}
            </div>
          )
        })}
        {/* ★ 试读：其余维度只给标题 + 模糊占位（DOM 不含真实正文） */}
        {lockedDims.map(d => <LockedCard key={d.key} title={d.name} />)}
      </div>

      {data.ai && (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="hw-c-h3">合婚深度解读</h2>
          <span className="text-xs text-ink-light/60">文字来源：{data.aiSource}</span>
        </div>
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
        {AI_SECTIONS.map(s => (
          <div key={s.key} className="hw-c-box hw-c-boxLg">
            <h3 className="hw-c-h3">{s.name}</h3>
            <div className="text-sm text-ink/70 leading-relaxed whitespace-pre-line">
              {data.ai![s.key]}
            </div>
          </div>
        ))}
      </div>
      )}

      {/* ★ 试读：6 个 AI 板块只给标题 + 模糊占位（route 未生成、未下发全文） */}
      {previewMode && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="hw-c-h3">合婚深度解读</h2>
            <span className="text-xs text-ink-light/60">解锁后可见</span>
          </div>
          {AI_SECTIONS.map(s => <LockedCard key={s.key} title={s.name} />)}
        </div>
      )}

      {/* ★ 未解锁：锁定区末尾统一解锁按钮 */}
      {data.locked && <UnlockCta skus={data.locked.skus} preview={data.locked.preview} />}

      {/* 免责声明 */}
      <p className="text-xs text-ink-light/60 text-center leading-relaxed border-t border-gold/15 pt-4">
        合婚分析为传统命理参考，仅供了解双方性格与相处模式之用。<br />
        婚姻成败在于双方经营，与任何单一命理指标无关。
      </p>
    </div>
  )
}
