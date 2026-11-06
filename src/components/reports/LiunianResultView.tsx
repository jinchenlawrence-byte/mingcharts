'use client'

// 年运报告共享渲染组件：/liunian 生成页 与 /reports/[id] 回看页共用，防止双渲染器漂移
import type { LuckLiuNianItem, LuckLiuYueItem, LuckDaYunItem } from '@/lib/analysis'
import type { Pillar } from '@/lib/paipan'
import type { AILiunianSections } from '@/lib/aiLiunian'
import { isRuleVersion } from '@/lib/reportGate'
import { LockedCard, UnlockCta } from '@/components/reports/PreviewLock'
import { localize } from '@/lib/hant'
import type { SiteLang } from '@/lib/lang'

export interface LiunianResultData {
  targetYear: number
  nowYear: number
  input: { year: number; month: number; day: number; hour: number; minute: number; gender: 1 | 0 }
  pillars: { year: Pillar; month: Pillar; day: Pillar; hour: Pillar }
  dayMaster: string
  taiYuan: string
  mingGong: string
  lunarDate: string
  wangShuai: string
  geJu: string
  favorable: string[]
  unfavorable: string[]
  curDaYun: LuckDaYunItem | null
  liuNian: LuckLiuNianItem[]
  liuYue: LuckLiuYueItem[] | null
  ai: AILiunianSections | null
  aiSource: string
  // ★ 门禁（§8.5.1）：未解锁时给 preview 与 skus，已解锁为 null
  locked?: { skus: string[]; preview: string } | null
  /** ★ 试读标记（route 下发；详情页无此字段时按 locked 推断） */
  preview?: { only: boolean; keys: string[] }
  dstNotice: string | null
}

// ★ 标签配色：大运/流年为 7 档判词（FortuneTier）；流月为三档中性标签（LuckTag）
//   文字标签本身即判词，不只靠颜色区分（色盲可达）
const TAG_STYLE: Record<string, string> = {
  // FortuneTier 7 档（大运/流年）：emerald 梯度 → amber 中性 → red 梯度
  '大吉': 'bg-emerald-100 text-emerald-800 border-emerald-400',
  '吉': 'bg-emerald-50 text-emerald-700 border-emerald-300',
  '小吉': 'bg-emerald-50 text-emerald-600 border-emerald-200',
  '平': 'bg-gold/5 text-amber-600 border-gold/20',
  '小凶': 'bg-red-50 text-red-600 border-red-200',
  '凶': 'bg-red-100 text-red-700 border-red-300',
  '大凶': 'bg-red-200 text-red-800 border-red-400',
  // LuckTag（旧 5 档键集合＝流月，实际只产出 较宜/一般/宜慎 三档；'平顺' 键保留兼容日运/旧快照）
  // ★ '大防' 死键已清（任务20步骤④）：产出者为零（7 档判词不含、流月内联三档不含、日运 DAILY_TAGS 排除）
  '较宜': 'bg-green-100 text-green-800 border-green-300',
  '平顺': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  '一般': 'bg-paper-dark/40 text-ink-light border-gold/20',
  '宜慎': 'bg-orange-100 text-orange-800 border-orange-300'
}

const AI_SECTIONS: Array<{ key: keyof AILiunianSections; name: string }> = [
  { key: 'annualOverview', name: '年运总纲' },
  { key: 'careerFlow', name: '流年事业' },
  { key: 'wealthFlow', name: '流年财运' },
  { key: 'loveFlow', name: '流年感情' },
  { key: 'healthFlow', name: '流年健康' },
  { key: 'monthFlow', name: '流月节奏' }
]

const WX_COLOR: Record<string, string> = {
  '木': 'text-green-700', '火': 'text-red-600', '土': 'text-ink/70',
  '金': 'text-yellow-600', '水': 'text-blue-700'
}

export default function LiunianResultView({ data, onRegen, regenBusy, locale = 'zh-Hans' }: {
  data: LiunianResultData
  /** ★ 规则版兜底时的「重新生成」出口（生成页/回看页下传）；无此能力时不传＝不显示 */
  onRegen?: () => void
  regenBusy?: boolean
  /** 繁體樹傳 zh-Hant（UI 文案与规则版正文一并轉繁；AI 全文由 locale 直出） */
  locale?: SiteLang
}) {
  const L = (s: string) => localize(s, locale)
  const target = data.liuNian.find(y => y.year === data.targetYear)
  const gender = data.input.gender === 1 ? L('男') : L('女')
  const pillarLine = (pl: Pillar) => pl.ganZhi
  // ★ 付费用户拿到规则版兜底（AI 结果未过合规校验）时，标签旁必须给出口，否则只能要求退款
  const ruleVersion = isRuleVersion(data.aiSource)
  // ★ 试读：目标流年头部（四柱/喜忌/当前大运）与三年流年概览免费；当年流月节奏与 AI 全文锁
  const previewMode = data.preview?.only ?? !!data.locked

  return (
    <div className="space-y-6">
      {/* 目标流年头部 */}
      <div className="hw-c-box hw-c-boxLg">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <h2 className="hw-c-h1">
            {data.targetYear}{L('年')} · {target?.ganZhi}{L('年流年详批')}
          </h2>
          {target && (
            <span className={`px-3 py-1 rounded-full border text-sm font-medium ${TAG_STYLE[target.tag] || TAG_STYLE['一般']}`}>
              {L(target.tag)}
            </span>
          )}
          <span className="text-xs text-ink-light ml-auto">{L(data.aiSource)}</span>
        </div>
        {/* ★ 规则版兜底出口（2026-10-18 退款事故）：AI 重写全文、覆盖原报告，不额外收费 */}
        {ruleVersion && onRegen && (
          <div className="flex flex-wrap items-center gap-3 mb-4">
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

        {/* 命主与四柱摘要 */}
        <div className="hw-c-tile text-sm">
          <p className="mb-2 text-ink-light">
            {gender}{L('命 · 公历')} {data.input.year}-{data.input.month}-{data.input.day} {data.input.hour}{L('时')}
            {data.input.minute > 0 ? `${data.input.minute}${L('分')}` : ''}
            <span className="text-ink-light ml-2">{L('农历')} {L(data.lunarDate)}</span>
          </p>
          <p className="tracking-widest text-lg font-semibold text-ink mb-2">
            {pillarLine(data.pillars.year)}　{pillarLine(data.pillars.month)}　
            {pillarLine(data.pillars.day)}　{pillarLine(data.pillars.hour)}
          </p>
          <p className="text-ink-light">
            {L('日主')} <span className="font-semibold">{data.dayMaster}</span>
            　{L('旺衰')} <span className="font-semibold">{L(data.wangShuai)}</span>
            　{L('格局')} <span className="font-semibold">{L(data.geJu)}</span>
            　{L('胎元')} {data.taiYuan}　{L('命宫')} {data.mingGong}
          </p>
          <p className="text-ink-light mt-1">
            {L('喜用五行：')}
            {data.favorable.map(w => (
              <span key={w} className={`font-semibold mx-0.5 ${WX_COLOR[w] || ''}`}>{L(w)}</span>
            ))}
            　{L('忌神：')}{data.unfavorable.map(L).join('、') || L('无')}
          </p>
          {data.dstNotice && (
            <p className="text-xs text-ink/70 mt-2">{L('提示：')}{L(data.dstNotice)}</p>
          )}
        </div>

        {/* 当前大运 */}
        {data.curDaYun && (
          <div className="mt-3 text-sm text-ink/70 bg-gold/5 border border-gold/20 rounded-[16px] p-3">
            <span className="font-semibold">{L('当前大运：')}</span>
            {data.curDaYun.ganZhi}（{data.curDaYun.startYear}-{data.curDaYun.endYear}{L('年，')}{data.curDaYun.startAge}{L('岁起')}）
            　{L('运干')}{L(data.curDaYun.shiShenGan)}{L('、运支本气')}{L(data.curDaYun.shiShenZhi)}
            　{L('倾向【')}{L(data.curDaYun.tag)}{L('】')}
            {data.curDaYun.structuralIssues?.length ? (
              <span className="text-ink/70">　{L('结构病：')}{data.curDaYun.structuralIssues.map(L).join('；')}</span>
            ) : null}
          </div>
        )}
      </div>

      {/* 三年流年概览 */}
      <div className="hw-c-box hw-c-boxLg">
        <h3 className="hw-c-h3">{L('流年概览（过去应期回看 + 未来三年）')}</h3>
        <div className="grid md:grid-cols-3 gap-3">
          {data.liuNian.map(y => {
            const isTarget = y.year === data.targetYear
            const isPast = y.isPast
            return (
              <div key={y.year}
                className={`hw-c-tile text-sm ${isTarget ? 'hw-c-tileOn' : ''} ${isPast ? 'opacity-80' : ''}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-ink">{y.year}{L('年')}</span>
                  <span className="tracking-wider">{y.ganZhi}</span>
                  <span className={`px-2 py-0.5 rounded border text-xs ${TAG_STYLE[y.tag] || TAG_STYLE['一般']}`}>
                    {L(y.tag)}
                  </span>
                  {isPast && <span className="text-xs text-ink-light ml-auto">{L('已过·应期')}</span>}
                  {isTarget && <span className="text-xs text-ink-light ml-auto">{L('本次详批')}</span>}
                </div>
                <p className="text-ink-light">{L(y.shiShenGan)}{L('主事 ·')} {L(y.shiShenZhi)}</p>
                {y.note && <p className="text-ink-light mt-1 text-xs leading-relaxed">{L(y.note)}</p>}
              </div>
            )
          })}
        </div>
      </div>

      {/* AI 深度解读板块 */}
      {data.ai && (
      <div className="space-y-4 hw-c-read">
        {AI_SECTIONS.map(({ key, name }) => {
          const text = data.ai![key]
          if (!text) return null
          return (
            <div key={key} className="hw-c-box hw-c-boxLg">
              <h3 className="hw-c-h3 flex items-center gap-2">
                <span className="w-1.5 h-5 bg-gold rounded-sm inline-block" />
                {L(name)}
              </h3>
              <div className="text-ink/70 leading-relaxed whitespace-pre-wrap text-[15px]">{L(text)}</div>
            </div>
          )
        })}
      </div>
      )}

      {/* 流月表（当年/明年/后年均有，往年无）；试读时只给标题 + 占位 */}
      {!previewMode && data.liuYue && data.liuYue.length > 0 && (
        <div className="hw-c-box hw-c-boxLg">
          <h3 className="hw-c-h3">{data.targetYear}{L('年流月节奏（节气换月）')}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
            {data.liuYue.map(m => (
              <div key={m.month} className={`rounded-[16px] border p-2.5 ${TAG_STYLE[m.tag] || TAG_STYLE['一般']}`}>
                <p className="font-semibold">{m.month}{L('月 ·')} {m.ganZhi}</p>
                <p className="text-xs opacity-80">{L(m.jieQi)}{L('起')} {L(m.rangeLabel)}</p>
                <p className="text-xs mt-1">{L(m.shiShenGan)}{L('主事 ·')} {L(m.tag)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* 有流月数据才给锁定卡：往年（超出三年范围）该板块本来就不存在，给卡会误导 */}
      {previewMode && data.liuYue && data.liuYue.length > 0 && (
        <LockedCard title={L(`${data.targetYear}年流月节奏（节气换月）`)} locale={locale} />
      )}

      {/* ★ 试读：6 个 AI 板块只给标题 + 模糊占位（route 未生成、未下发全文） */}
      {previewMode && !data.ai && (
        <div className="space-y-3 hw-c-read">
          <h2 className="hw-c-h1">{L('年运深度解读')}</h2>
          {AI_SECTIONS.map(({ key, name }) => <LockedCard key={key} title={L(name)} locale={locale} />)}
        </div>
      )}

      {/* ★ 未解锁：锁定区末尾统一解锁按钮 */}
      {data.locked && <UnlockCta skus={data.locked.skus} preview={data.locked.preview ? L(data.locked.preview) : undefined} locale={locale} returnTo={locale === 'zh-Hant' ? '/tw/reports' : '/reports'} />}

      {/* 免责声明 */}
      <p className="hw-alert hw-alert--note text-center">
        {L('本报告由规则引擎排盘定喜忌、AI 据事实撰写解读，为倾向性参考，非确定性结论，不构成任何重大决策依据；重大事项请结合实际理性判断。')}
      </p>
    </div>
  )
}
