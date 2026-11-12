'use client'

// 合婚结果渲染（生成页与 /reports/[id] 回看页共用）
// 纯展示组件：数据进来渲染，不含请求逻辑
import type { HemunResult } from '@/lib/hemun'
import type { CSSProperties } from 'react'
import type { AIHemunSections } from '@/lib/aiHemun'
import { isRuleVersion } from '@/lib/reportGate'
import { isReportPaid } from '@/lib/reportAccess'
import { PREVIEW_FREE } from '@/lib/reportPreview'
import { LockedCard, UnlockCta } from '@/components/reports/PreviewLock'
import HemunThreePillarPanel, { SkippedBar } from '@/components/reports/HemunThreePillarPanel'
import { isThreePillarReport, planHemunDims } from '@/lib/hemunView'
import AskPanel from '@/components/AskPanel'
import type { AnalyzableChart } from '@/lib/analysis'
import { localize } from '@/lib/hant'
import { aiSourceLabel } from '@/lib/aiSourceLabel'
import { pathForLang, type SiteLang } from '@/lib/lang'

export interface HemunData {
  result: HemunResult
  ai: AIHemunSections | null
  aiSource: string
  /** ★ 2026-11-09 失败原因（reason code / 细节 / 命中词），展示层按 locale 出三语文案 */
  aiReason?: string | null
  aiReasonDetail?: string | null
  aiHits?: string[] | null
  dstNotices: { male: string | null; female: string | null }
  /** ★ 追问用完整命盘（男方/女方，均含 analysis）；旧缓存可能缺，缺则不渲染入口 */
  male?: AnalyzableChart
  female?: AnalyzableChart
  // ★ 门禁（§8.5.1）：未解锁时给 preview 与 skus，已解锁为 null
  locked?: { skus: string[]; preview: string } | null
  /** ★ 试读标记（route 下发；详情页无此字段时按 locked 推断） */
  preview?: { only: boolean; keys: string[] }
}

// ───────── 依据徽章（同一款式，只换颜色）─────────
const BASIS_STYLE: Record<string, string> = {
  '典籍': 'hw-basis--classic',
  '古法': 'hw-basis--old',
  '民俗': 'hw-basis--folk',
  '产品设定': 'hw-basis--product',
}

// ───────── 五行色：天干/地支逐字上色 ─────────
const GAN_ELEMENT: Record<string, string> = {
  甲: 'wood', 乙: 'wood', 丙: 'fire', 丁: 'fire', 戊: 'earth',
  己: 'earth', 庚: 'metal', 辛: 'metal', 壬: 'water', 癸: 'water',
}
const ZHI_ELEMENT: Record<string, string> = {
  子: 'water', 丑: 'earth', 寅: 'wood', 卯: 'wood', 辰: 'earth', 巳: 'fire',
  午: 'fire', 未: 'earth', 申: 'metal', 酉: 'metal', 戌: 'earth', 亥: 'water',
}

// ───────── 命盘摘要 ─────────
function ChartBriefCard({ title, b, color, dstNotice, locale }: {
  title: string
  b: HemunResult['male']
  color: string
  dstNotice?: string | null
  locale: SiteLang
}) {
  const L = (s: string) => localize(s, locale)
  return (
    <div className="hw-c-box hw-c-boxLg">
      <h3 className={`hw-c-h3 ${color}`}>{L(title)}</h3>
      <div className="grid grid-cols-4 gap-2 text-center mb-3">
        {(['year', 'month', 'day', 'hour'] as const).map((k, i) => {
          const gz = b.ganZhi[k]
          const [gan, zhi] = [gz[0], gz[1]]
          return (
            <div key={k} className={`hw-pillar${k === 'day' ? ' hw-pillar--day' : ''}`}>
              <div className="text-xs text-ink-light mb-1">{L(['年柱', '月柱', '日柱', '时柱'][i])}</div>
              <div className="hw-gz">
                <span className={`hw-el-${GAN_ELEMENT[gan] ?? 'metal'}`}>{gan}</span>
                <span className={`hw-el-${ZHI_ELEMENT[zhi] ?? 'earth'}`}>{zhi}</span>
              </div>
            </div>
          )
        })}
      </div>
      <div className="flex flex-wrap justify-center gap-1.5 mb-2">
        <span className="hw-badge">{L('日主')} · {L(b.dayMaster)}</span>
        <span className="hw-badge hw-badge--accent">{L('旺衰')} · {L(b.wangShuai)}</span>
        <span className="hw-badge hw-badge--accent">{L('格局')} · {L(b.geJu)}</span>
      </div>
      <div className="text-xs text-ink-light text-center">
        {L('年柱纳音：')}<span className="text-ink">{L(b.yearNaYin)}</span>
      </div>
      {dstNotice && (
        <div className="mt-2 rounded border border-gold/20 bg-gold/5 px-2 py-1.5 text-xs text-ink">
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

export default function HemunResultView({ data, onRegen, regenBusy, locale = 'zh-Hans', reportId }: {
  data: HemunData
  /** ★ 规则版兜底时的「重新生成」出口（模块页下传）；回看页无此能力时不传＝不显示 */
  onRegen?: () => void
  regenBusy?: boolean
  /** 繁體樹傳 zh-Hant（UI 文案与规则版正文一并轉繁；AI 全文由 locale 直出） */
  locale?: SiteLang
  /** 报告 id（报告详情页传入；服务端据此校验追问归属） */
  reportId?: string | null
}) {
  const L = (s: string) => localize(s, locale)
  const r = data.result

  // ★ 三柱模式（2026-11-11）：只给三柱能成立的判断，不显示分数、不显示解锁墙。
  // ★ 2026-11-12：判定不能只看 mode——老报告/老缓存可能没有该字段，
  //   会导致三柱报告落进四柱付费墙，把「缺时辰、未计算」的五项当成付费可见。
  if (isThreePillarReport(r)) {
    return (
      <div className="space-y-6">
        <HemunThreePillarPanel r={r} locale={locale} />
        <p className="text-xs text-ink-light text-center leading-relaxed border-t border-gold/15 pt-4">
          {L('合婚分析为传统命理参考，仅供了解双方性格与相处模式之用。')}<br />
          {L('婚姻成败在于双方经营，与任何单一命理指标无关。')}
        </p>
      </div>
    )
  }

  // ★ 付费用户拿到规则版兜底（AI 结果未过合规校验）时，标签旁必须给出口，否则只能要求退款
  const ruleVersion = isRuleVersion(data.aiSource)
  // ★ 报告级权益（与追问入口同一判定）：免费试读不显示重新生成
  const paid = isReportPaid('hemun', data)
  // ★ 试读模式：route 明确下发 preview.only；详情页（reportGate 重算）没有该字段时按 locked 推断
  const previewMode = data.preview?.only ?? !!data.locked
  // ★ 2026-11-12：门禁先看维度状态——缺时辰的维度既不游离在免费层，也不进付费层
  const { free: freeDims, locked: lockedDims, skipped: skippedDims } =
    planHemunDims(r.dimensions, previewMode, PREVIEW_FREE.hemun)
  return (
    <div className="space-y-6">
      {/* 总观感 + 分数环（分数仅作视觉参考，不替代文字结论） */}
      <div className="bg-hw-surface rounded-[26px] shadow-sm border border-gold/15 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          <div
            className="hw-score-ring mx-auto sm:mx-0"
            style={{ ['--score' as string]: r.totalScore } as CSSProperties}
            role="img"
            aria-label={`${L('合婚参考分')} ${r.totalScore} / 100`}
          >
            <div className="hw-score-ring-inner">
              <div>
                <div className="hw-score-num">{r.totalScore}</div>
                <div className="hw-score-denom">/ 100</div>
              </div>
            </div>
          </div>
          <div className="flex-1 text-center sm:text-left">
            <div className="text-xs text-ink-light mb-1">{L('合婚总观感')}</div>
            <div className="hw-c-h1">{L(r.overall ?? '')}</div>
            {r.keyTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3 justify-center sm:justify-start">
                {r.keyTags.map(t => (
                  <span key={t} className="hw-badge hw-badge--accent">{L(t)}</span>
                ))}
              </div>
            )}
            <p className="text-xs text-ink-light mt-3">
              {L('参考分仅供参考，不构成命理定论。')}
            </p>
            <div className="flex flex-wrap gap-2 mt-2 justify-center sm:justify-start">
              <span className="hw-badge">{L('当前大运')} · {L('男')}：{L(r.currentLuck.male)}</span>
              <span className="hw-badge">{L('当前大运')} · {L('女')}：{L(r.currentLuck.female)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 两盘摘要 */}
      <div className="grid md:grid-cols-2 gap-4">
        <ChartBriefCard title="男方命盘" b={r.male} color="text-hw-water"
          dstNotice={data.dstNotices?.male} locale={locale} />
        <ChartBriefCard title="女方命盘" b={r.female} color="text-cinnabar"
          dstNotice={data.dstNotices?.female} locale={locale} />
      </div>

      {/* 维度卡片（分项展示，依据分级） */}
      <div className="space-y-3">
        <h2 className="hw-c-h3">
          {previewMode
            ? L(`分项维度（免费预览 ${freeDims.length} 项 · 另 ${lockedDims.length} 项解锁后可见）`)
            : L(`分项维度（${r.dimensions.length} 项 · 依据分级如实标注）`)}
        </h2>
        {/* 3×3 概览格：点击锚点跳到对应维度卡片 */}
        <div className="hw-dim-grid">
          {r.dimensions.map(d => {
            // 缺时辰的维度既不是免费可见，也不是付费可见——单独标「未计算」
            const isSkipped = d.status === 'skipped_missing_hour'
            const isLocked = previewMode && !isSkipped && !PREVIEW_FREE.hemun.includes(d.key)
            return (
              <a key={d.key} href={`#dim-${d.key}`} className="hw-dim-cell">
                <b>{L(d.name)}</b>
                <span>{isSkipped ? L('未计算') : isLocked ? L('解锁后可见') : d.level}</span>
              </a>
            )
          })}
        </div>
        {freeDims.map(d => {
          const levelCls = d.level === '吉'
            ? 'hw-badge--good'
            : d.level === '忌'
              ? 'hw-badge--bad'
              : 'hw-badge--flat'
          const bandCls = d.level === '吉'
            ? 'hw-dim--good'
            : d.level === '忌'
              ? 'hw-dim--bad'
              : 'hw-dim--flat'
          return (
            <div key={d.key} id={`dim-${d.key}`} className={`hw-c-box hw-c-boxLg hw-dim ${bandCls}`}>
              <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
                <span className="font-semibold text-ink">{L(d.name)}</span>
                {d.key === 'dayun' && (
                  <span className="text-xs text-ink-light font-normal">{L('· 仅示当前节奏，不参与总评')}</span>
                )}
                <div className="flex items-center gap-1.5">
                  <span className={`hw-basis ${BASIS_STYLE[d.basis] || ''}`}>
                    {L(d.basis)}
                  </span>
                  <span className={`hw-badge ${levelCls}`}>
                    {d.level}
                  </span>
                </div>
              </div>
              <p className="text-[15px] text-ink mb-2 leading-relaxed">{L(d.verdict ?? '')}</p>
              {(d.tags ?? []).length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {(d.tags ?? []).map(t => (
                    <span key={t} className="text-xs bg-gold/5 text-ink rounded px-1.5 py-0.5">
                      {L(t)}
                    </span>
                  ))}
                </div>
              )}
              <ul className="text-xs text-ink-light space-y-0.5 list-disc list-inside">
                {(d.facts ?? []).map((f, i) => <li key={i}>{L(f)}</li>)}
              </ul>
              {d.citations && d.citations.length > 0 && (
                <details className="mt-2">
                  <summary className="hw-basis-toggle">{L('查看依据 ▾')}</summary>
                  <p className="text-xs text-ink-light mt-1.5">
                    <span className="font-semibold">{L('依据：')}</span>
                    {d.citations.map(L).join('；')}
                  </p>
                </details>
              )}
            </div>
          )
        })}
        {/* ★ 试读：其余维度只给标题 + 模糊占位（DOM 不含真实正文） */}
        {lockedDims.map(d => (
          <div key={d.key} id={`dim-${d.key}`}>
            <LockedCard title={L(d.name)} locale={locale} />
          </div>
        ))}

        {/* ★ 缺时辰：与付费锁定分开，不给付费按钮、不写「解锁后可看」 */}
        {skippedDims.length > 0 && (
          <div className="space-y-2">
            <h2 className="hw-c-h3">{L('本次没有计算的项目')}</h2>
            <p className="text-xs text-ink-light">
              {L('这些判断都以时柱为前提。缺时柱时我们不给结论，也不用默认时辰代替。')}
            </p>
            {skippedDims.map(d => (
              <SkippedBar key={d.key} name={d.name} reason={d.reason ?? ''} locale={locale} />
            ))}
          </div>
        )}
      </div>

      {data.ai && (
      <div className="space-y-3 hw-c-read">
        <div className="flex items-center justify-between">
          <h2 className="hw-c-h3">{L('合婚深度解读')}</h2>
          <span className="text-xs text-ink-light">{L('文字来源：')}{aiSourceLabel(data, locale)}</span>
        </div>
        {/* ★ 规则版兜底出口（2026-10-18 退款事故）：AI 重写全文、覆盖原报告，不额外收费 */}
        {ruleVersion && paid && onRegen && (
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onRegen}
              disabled={regenBusy}
              className="px-4 py-1.5 rounded-full border border-gold/20 bg-white text-sm font-medium text-ink hover:border-ink transition disabled:opacity-50"
            >
          {regenBusy ? L('重新生成中...') : L('免费重新生成')}
            </button>
            <span className="text-xs text-ink-light">{L('不额外收费 · AI 将重写全文并覆盖本报告')}</span>
          </div>
        )}
        {AI_SECTIONS.map(s => (
          <div key={s.key} className="hw-c-box hw-c-boxLg">
            <h3 className="hw-c-h3">{L(s.name)}</h3>
            <div className="text-[15px] text-ink leading-relaxed whitespace-pre-line">
              {L(data.ai![s.key] ?? '')}
            </div>
          </div>
        ))}
      </div>
      )}

      {/* ★ 试读：6 个 AI 板块只给标题 + 模糊占位（route 未生成、未下发全文） */}
      {previewMode && (
        <div className="space-y-3 hw-c-read">
          <div className="flex items-center justify-between">
            <h2 className="hw-c-h3">{L('合婚深度解读')}</h2>
            <span className="text-xs text-ink-light">{L('解锁后可见')}</span>
          </div>
          {AI_SECTIONS.map(s => <LockedCard key={s.key} title={L(s.name)} locale={locale} />)}
        </div>
      )}

      {/* ★ 未解锁：锁定区末尾统一解锁按钮 */}
      {data.locked && <UnlockCta skus={data.locked.skus} preview={data.locked.preview ? L(data.locked.preview) : undefined} locale={locale} returnTo={pathForLang('/reports', locale)} />}

      {/* 免责声明 */}
      <p className="text-xs text-ink-light text-center leading-relaxed border-t border-gold/15 pt-4">
        {L('合婚分析为传统命理参考，仅供了解双方性格与相处模式之用。')}<br />
        {L('婚姻成败在于双方经营，与任何单一命理指标无关。')}
      </p>

      {/* AI 追问：默认男方盘，可切换女方盘；入口始终可见，缺盘交给面板提示 */}
      <AskPanel
        chart={data.male ?? data.female ?? null}
        locale={locale}
        reportId={reportId}
        reportPaid={paid}
        unlockSku="hemun"
        chartOptions={[
          ...(data.male ? [{ key: 'male', label: L('男方命盘'), chart: data.male }] : []),
          ...(data.female ? [{ key: 'female', label: L('女方命盘'), chart: data.female }] : []),
        ]}
      />
    </div>
  )
}
