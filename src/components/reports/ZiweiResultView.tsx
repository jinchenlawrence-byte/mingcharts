'use client'

// 紫微结果渲染（生成页与 /reports/[id] 回看页共用）
// 纯展示组件：数据进来渲染，宫位选中交互 state 内聚于此
//
// ★ 三语共用骨架（2026-11-05）：/ziwei、/tw/ziwei、/en/ziwei 走同一套区块顺序与卡片规格。
//   简/繁由 localize 转写；英文由 enRule.ziweiEn 产出同形结构（enView），逐块替换文案。
//   禁止英文树再另写一套表格视图 —— 版式漂移由 test-en-tools.mjs 断言守护。
import { useState } from 'react'
import Link from 'next/link'
import type { ZwChart, ZiweiAnalysis, PeriodRead } from '@/lib/ziwei'
import type { ZiweiAIReport } from '@/lib/aiZiwei'
import { isRuleVersion } from '@/lib/reportGate'
import { PREVIEW_FREE } from '@/lib/reportPreview'
import { LockedCard, UnlockCta } from '@/components/reports/PreviewLock'
import { localize } from '@/lib/hant'
import type { SiteLang } from '@/lib/lang'
import type { ZiweiRuleEn } from '@/lib/enRule'
import { ZIWEI_UI_EN, ZIWEI_AI_TITLES_EN, LEVEL_STYLE_EN, mutagenStyleEn } from '@/lib/ziweiUiEn'

export interface ZiweiResultData {
  chart: ZwChart
  analysis: ZiweiAnalysis
  ai: ZiweiAIReport | null
  aiSource: string
  // ★ 门禁（§8.5.1）：未解锁时给 preview 与 skus，已解锁为 null
  locked?: { skus: string[]; preview: string } | null
  /** ★ 试读标记（route 下发；详情页无此字段时按 locked 推断） */
  preview?: { only: boolean; keys: string[] }
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

export default function ZiweiResultView({ data, onRegen, regenBusy, locale = 'zh-Hans', enView }: {
  data: ZiweiResultData
  /** ★ 规则版兜底时的「重新生成」出口（模块页下传）；回看页无此能力时不传＝不显示 */
  onRegen?: () => void
  regenBusy?: boolean
  /** 繁體樹傳 zh-Hant（UI 文案与规则版正文一并轉繁；AI 全文由 locale 直出） */
  locale?: SiteLang
  /** 英文樹傳入 enRule 的英文重写层；简繁不传，保持原有渲染路径 */
  enView?: ZiweiRuleEn
}) {
  const isEn = locale === 'en'
  const EN = ZIWEI_UI_EN
  const L = (s: string) => (isEn ? s : localize(s, locale))
  const { chart, analysis, ai, aiSource, trueSolar, locked } = data
  const [selected, setSelected] = useState<number | null>(chart.mingIndex)
  // ★ 付费用户拿到规则版兜底（AI 结果未过合规校验）时，标签旁必须给出口，否则只能要求退款
  const ruleVersion = isRuleVersion(aiSource)
  // ★ 试读：十二宫星盘与基础信息常显；规则板块只放 patterns / transforms；大限流年锁
  const previewMode = data.preview?.only ?? !!locked
  const periods: Array<{ key: 'decadal' | 'yearly'; p: PeriodRead }> = [
    { key: 'decadal', p: analysis.decadal },
    { key: 'yearly', p: analysis.yearly },
  ]
  const freePeriods = previewMode
    ? periods.filter(x => PREVIEW_FREE.ziwei_deep.includes(x.key))
    : periods
  const lockedPeriods = previewMode
    ? periods.filter(x => !PREVIEW_FREE.ziwei_deep.includes(x.key))
    : []

  const periodPalaceIndex = (p: PeriodRead): number =>
    chart.palaces.findIndex((x) => x.name === p.basePalace)

  // ★ 共享骨架：简繁读 chart.palaces，英文读 enView.grid；两者字段一一对应
  const grid = enView
    ? enView.grid
    : chart.palaces.map((p) => ({
        name: L(p.name),
        ganZhi: p.ganZhi,
        empty: p.majorStars.length === 0,
        majorStars: p.majorStars.map((s) => ({ name: L(s.name), brightness: L(s.brightness), mutagen: s.mutagen })),
        minorStars: p.minorStars.map((s) => L(s.name)),
        adjectiveStars: p.adjectiveStars.map(L),
        isBodyPalace: p.isBodyPalace,
        changsheng12: L(p.changsheng12),
        decadalRange: p.decadalRange,
      }))
  // ★ 四化配色以【原始键】为准（zh-Hant 转写后 祿/權/科/忌 不在配色表里）


  const mutagenColor = (m: string) => (isEn ? mutagenStyleEn(m) : MUTAGEN_COLOR[m])
  const periodText = (key: 'decadal' | 'yearly', p: PeriodRead) => {
    if (enView) return enView[key]
    return {
      title: L(p.title),
      ganZhi: p.ganZhi,
      basePalace: L(p.basePalace),
      range: L(p.range),
      stars: p.stars.map(L),
      transforms: p.transforms.map(L),
      tags: p.tags.map(L),
    }
  }

  // ★ 格局：英文多 required / bonus / breaking / source（承载差异，内嵌同一卡片，不新增区块）
  const patterns = enView
    ? enView.patterns.map((p) => ({
        name: p.name,
        level: p.level,
        note: p.note,
        badge: LEVEL_STYLE_EN[p.level] ?? '',
        required: p.required,
        bonus: p.bonus,
        breaking: p.breaking,
        basis: [p.source, p.basisLevel ? `(${p.basisLevel})` : ''].filter(Boolean).join(' '),
      }))
    : analysis.patterns.map((p) => ({
        name: L(p.name),
        level: L(p.level),
        note: L(p.note),
        badge: PATTERN_BADGE[p.level] ?? '',
        required: [] as string[],
        bonus: [] as string[],
        breaking: [] as string[],
        basis: '',
      }))

  const transforms = enView
    ? enView.transforms.map((t) => ({
        star: t.star, type: t.type, typeLabel: t.type, palace: t.palace, note: t.note, color: mutagenStyleEn(t.type),
      }))
    : analysis.transforms.map((t) => ({
        star: L(t.star), type: t.type, typeLabel: L(t.type), palace: L(t.palace), note: L(t.note), color: MUTAGEN_COLOR[t.type] ?? '',
      }))

  const sep = isEn ? ', ' : '、'

  return (
    <div className="space-y-6">
      {/* 命盘 4×4 */}
      <div className="hw-c-box hw-c-boxLg p-3 md:p-5">
        <div className="grid grid-cols-4 gap-1.5 md:gap-2">
          {LAYOUT.map(({ i, r, c }) => {
            const p = grid[i]
            const rawPalace = chart.palaces[i]
            const isMing = i === chart.mingIndex
            const isDecadal = i === periodPalaceIndex(analysis.decadal)
            const isYearly = i === periodPalaceIndex(analysis.yearly)
            const isXiaoxian = rawPalace.name === analysis.xiaoxian.basePalace
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
                    <div className="text-[10px] md:text-xs text-ink-light/60">{isEn ? EN.emptyPalace : L('空宫')}</div>
                  )}
                  {p.majorStars.map((s) => (
                    <div key={s.name} className="flex items-baseline gap-0.5">
                      <span className={`text-[11px] md:text-xs font-medium ${s.mutagen ? mutagenColor(s.mutagen) : 'text-ink'}`}>
                        {s.name}{s.mutagen ? (isEn ? ` · ${s.mutagen}` : '·' + L(s.mutagen)) : ''}
                      </span>
                      {s.brightness && <span className="text-[9px] text-ink-light/60">{s.brightness}</span>}
                    </div>
                  ))}
                </div>
                <div className="mt-0.5 text-[9px] md:text-[10px] text-ink-light/60 truncate">
                  {p.minorStars.slice(0, 4).join(' ')}
                  {p.minorStars.length > 4 ? '…' : ''}
                </div>
                <div className="mt-0.5 flex flex-wrap gap-0.5">
                  {isMing && <span className="text-[9px] bg-cinnabar text-white px-1 rounded">{isEn ? EN.badgeLife : L('命')}</span>}
                  {p.isBodyPalace && <span className="text-[9px] bg-indigo-500 text-white px-1 rounded">{isEn ? EN.badgeBody : L('身')}</span>}
                  {isDecadal && <span className="text-[9px] bg-gold/50 text-white px-1 rounded">{isEn ? EN.badgeDecade : L('大限')}</span>}
                  {isYearly && <span className="text-[9px] bg-green-600 text-white px-1 rounded">{isEn ? EN.badgeAnnual : L('流年')}</span>}
                  {isXiaoxian && <span className="text-[9px] bg-paper-dark/300 text-white px-1 rounded">{isEn ? EN.badgeMinor : L('小限')}</span>}
                </div>
              </button>
            )
          })}

          {/* 中宫信息 */}
          <div style={{ gridRow: '2 / 4', gridColumn: '2 / 4' }}
            className="hidden md:flex flex-col items-center justify-center rounded-[20px] border border-gold/25 bg-paper-dark/20 p-4 text-center">
                <div className="hw-c-h3 mb-1">{isEn ? EN.chartTitle : L('紫微命盘')}</div>
            {isEn ? (
              <>
                <div className="text-xs text-ink-light mb-1">{enView!.header.solarDate}</div>
                <div className="text-xs text-ink-light mb-2">{enView!.header.lunarDate}</div>
              </>
            ) : (
              <div className="text-xs text-ink-light mb-2">{L(chart.lunarDate)}</div>
            )}
            {trueSolar && (
              <div className="text-[10px] text-purple-500 mb-1">
                {isEn ? EN.trueSolar : L('真太阳时：')}{trueSolar.offsetMin >= 0 ? '+' : ''}{trueSolar.offsetMin}{isEn ? EN.minutes : L('分钟')}
                （{trueSolar.zone}）
              </div>
            )}
            {trueSolar?.dstNotice && (
              <div className="text-[10px] text-amber-600 mb-1 max-w-[90%]">
                {isEn ? EN.dstNote : L(trueSolar.dstNotice)}
              </div>
            )}
            <div className="text-xs text-ink-light">{isEn ? enView!.header.fiveElementsClass : L(chart.fiveElementsClass)}</div>
            <div className="text-xs text-ink-light mt-1">
              {isEn
                ? `${EN.soulLabel} ${enView!.header.soul} · ${EN.bodyLabel} ${enView!.header.body}`
                : <>{L('命主')} {L(chart.soul)} · {L('身主')} {L(chart.body)}</>}
            </div>
            <div className="mt-3">
              <div className="text-3xl font-bold text-ink/70">{analysis.score}</div>
              <div className="text-xs text-ink-light">{isEn ? enView!.scoreLabel : L(analysis.scoreLabel)}</div>
            </div>
          </div>
        </div>
        <p className="text-xs text-ink-light/60 text-center mt-3">{isEn ? EN.clickPalace : L('点击宫位查看详细星曜')}</p>
      </div>

      {/* 选中宫位详情 */}
      {selected !== null && (
        <div className="hw-c-box hw-c-boxLg">
          {(() => {
            const p = grid[selected]
            const opposite = grid[(selected + 6) % 12]
            return (
              <div>
                <h3 className="hw-c-h3">
                  {isEn ? `${p.name}${EN.palaceWord} · ${p.ganZhi}` : <>{p.name}{L('宫')} · {p.ganZhi}</>}
                  {p.isBodyPalace && <span className="ml-2 text-xs bg-ink text-white px-2 py-0.5 rounded-full">{isEn ? EN.bodyTag : L('身宫')}</span>}
                </h3>
                <div className="grid md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-xs text-ink-light/60 mb-1">{isEn ? EN.majorStars : L('主星')}</div>
                    {p.majorStars.length === 0 ? (
                      <div className="text-ink-light/60">
                        {isEn ? EN.emptyBorrow : L('空宫，借对宫主星为用：')}
                        {opposite.majorStars.map((s) => s.name).join(sep) || (isEn ? EN.oppositeEmpty : L('对宫亦空'))}
                      </div>
                    ) : (
                      p.majorStars.map((s) => (
                        <span key={s.name} className={`mr-2 ${s.mutagen ? mutagenColor(s.mutagen) + ' font-semibold' : ''}`}>
                          {s.name}{s.brightness ? '(' + s.brightness + ')' : ''}{s.mutagen ? (isEn ? ` · ${s.mutagen}` : L('化') + L(s.mutagen)) : ''}
                        </span>
                      ))
                    )}
                  </div>
                  <div>
                    <div className="text-xs text-ink-light/60 mb-1">{isEn ? EN.minorMixed : L('辅星杂曜')}</div>
                    <div className="text-ink/70">
                      {[...p.minorStars, ...p.adjectiveStars].join(sep) || (isEn ? EN.none : L('无'))}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-ink-light/60 mt-2">
                  {isEn
                    ? <>{EN.changsheng}{p.changsheng12}　|　{EN.decadalAge}{p.decadalRange[0]}-{p.decadalRange[1]}</>
                    : <>{L('长生十二神：')}{p.changsheng12}　|　{L('大限年龄：')}{p.decadalRange[0]}-{p.decadalRange[1]}{L('岁')}</>}
                </div>
              </div>
            )
          })()}
        </div>
      )}

      {/* 格局 */}
      <div className="hw-c-box hw-c-boxLg">
        <h3 className="hw-c-h3">{isEn ? EN.patterns : L('传统格局')}</h3>
        <div className="space-y-2">
          {patterns.map((p) => (
            <div key={p.name} className="flex items-start gap-2">
              <span className={`text-xs px-2 py-0.5 rounded mt-0.5 ${p.badge}`}>{p.level}</span>
              <div>
                <span className="font-medium text-ink">{p.name}</span>
                <span className="text-sm text-ink-light ml-2">{p.note}</span>
                {p.required.length > 0 && (
                  <p className="text-xs text-ink-light/60 mt-0.5">{EN.conditions}{p.required.join('; ')}</p>
                )}
                {p.bonus.length > 0 && (
                  <p className="text-xs text-ink-light/60">{EN.strengthenedBy}{p.bonus.join('; ')}</p>
                )}
                {p.breaking.length > 0 && (
                  <p className="text-xs text-ink-light/60">{EN.brokenBy}{p.breaking.join('; ')}</p>
                )}
                {p.basis && <p className="text-xs text-ink-light/50">{EN.basis}{p.basis}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 生年四化 */}
      <div className="hw-c-box hw-c-boxLg">
        <h3 className="hw-c-h3">{isEn ? EN.transforms : L('生年四化')}</h3>
        <div className="grid md:grid-cols-2 gap-3">
          {transforms.map((t) => (
            <div key={t.star} className="rounded-md border border-gold/15 p-3">
              <div className={`font-semibold ${t.color}`}>
                {isEn
                  ? <>{t.star} · {t.type} · {t.palace}{EN.palaceWord}</>
                  : <>{t.star}{L('化')}{t.typeLabel} · {t.palace}{L('宫')}</>}
              </div>
              <p className="text-sm text-ink-light mt-1">{t.note}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 大限/流年（试读：仅免费板块全量，其余锁定） */}
      {freePeriods.map(({ key, p }) => {
        const v = periodText(key, p)
        return (
          <div key={key} className="hw-c-box hw-c-boxLg">
            <h3 className="hw-c-h3">{v.title}</h3>
            <div className="text-sm text-ink/70 mb-2">
              {isEn ? (
                <>{v.ganZhi}{EN.basePalaceMid}<span className="font-medium">{v.basePalace}</span>{v.range && <span className="text-ink-light/60"> ({v.range})</span>}</>
              ) : (
                <>{v.ganZhi}{L('，命宫坐原局')}<span className="font-medium">{v.basePalace}</span>{L('宫')}{v.range && <span className="text-ink-light/60">（{v.range}）</span>}</>
              )}
            </div>
            <div className="text-sm text-ink/70 mb-2">{isEn ? EN.starsLabel : L('星曜：')}{v.stars.join(sep)}</div>
            <div className="text-sm text-ink/70 mb-2">{isEn ? EN.transformsLabel : L('四化：')}{v.transforms.join(isEn ? '; ' : '；')}</div>
            <div className="flex flex-wrap gap-1">
              {v.tags.map((t) => (
                <span key={t} className="text-xs bg-purple-100 text-ink/70 px-2 py-0.5 rounded">{t}</span>
              ))}
            </div>
            {/* ★ 英文承载差异（a）：流月 / 小限 / 宫位自化 / 来因宫，内嵌流年区块，不新增顶层块 */}
            {isEn && key === 'yearly' && enView && (
              <div className="mt-3 pt-3 border-t border-gold/15 space-y-1">
                <div className="text-xs font-semibold text-ink/70">{EN.extraCycles}</div>
                {enView.monthly && (
                  <div className="text-sm text-ink/70">
                    <span className="font-medium">{enView.monthly.title}</span>
                    {' · '}{enView.monthly.ganZhi}
                    {enView.monthly.range && <span className="text-ink-light/60"> ({enView.monthly.range})</span>}
                    {enView.monthly.transforms.length > 0 && <span className="text-ink-light/60"> · {enView.monthly.transforms.join('; ')}</span>}
                  </div>
                )}
                <div className="text-sm text-ink/70">
                  {EN.smallLimitLine}{enView.xiaoxian.nominalAge}{' · '}{enView.xiaoxian.basePalace}{EN.palaceWord}{' · '}{enView.xiaoxian.ganZhi}
                </div>
                {enView.laiYinPalace && (
                  <div className="text-sm text-ink/70">{EN.laiYin}{enView.laiYinPalace}{EN.palaceWord}</div>
                )}
                {enView.selfMutations.length > 0 && (
                  <div className="text-sm text-ink/70">
                    <span className="font-medium">{EN.selfMutations}</span>{': '}
                    {enView.selfMutations.map((s) => `${s.palace} (${s.ganZhi}) ${s.mutagens.join(', ')}`).join('; ')}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
      {/* ★ 试读：大限 / 流年只给标题 + 模糊占位（DOM 不含真实正文） */}
      {lockedPeriods.map(({ key, p }) => (
        <LockedCard key={key} title={periodText(key, p).title} locale={locale} chip={isEn ? EN.lockedChip : undefined} />
      ))}

      {ai && (
        <div className="space-y-4">
          {/* ★ 英文 aiSource 为中文（规则版标记），英文树不渲染它，只给统一标题 */}
          <h2 className="hw-c-h1">{isEn ? EN.inDepth : `${L('深度解读 ·')} ${L(aiSource)}`}</h2>
          {/* ★ 规则版兜底出口（2026-10-18 退款事故）：AI 重写全文、覆盖原报告，不额外收费 */}
          {ruleVersion && onRegen && (
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onRegen}
                disabled={regenBusy}
                className="px-4 py-1.5 rounded-full border border-gold/20 bg-white text-sm font-medium text-ink hover:border-ink transition disabled:opacity-50"
              >
                {isEn ? (regenBusy ? EN.regenBusy : EN.regen) : (regenBusy ? L('重新生成中...') : L('免费重新生成'))}
              </button>
              <span className="text-xs text-ink-light/50">{isEn ? EN.regenNote : L('不额外收费 · AI 将重写全文并覆盖本报告')}</span>
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
                <h3 className="hw-c-h3">{isEn ? ZIWEI_AI_TITLES_EN[key] : L(title)}</h3>
                <p className="text-sm text-ink/70 leading-relaxed whitespace-pre-line">{L(ai[key] as string)}</p>
              </div>
            ))}
        </div>
      )}

      {/* ★ 试读：12 个 AI 板块只给标题 + 模糊占位（route 未生成、未下发全文） */}
      {previewMode && !ai && (
        <div className="space-y-3">
          <h2 className="hw-c-h1">{isEn ? EN.inDepth : L('深度解读')}</h2>
          {SECTIONS.map(([key, title]) => (
            <LockedCard key={key} title={isEn ? ZIWEI_AI_TITLES_EN[key] : L(title)} locale={locale} chip={isEn ? EN.lockedChip : undefined} />
          ))}
        </div>
      )}

      {/* ★ 未解锁：锁定区末尾统一解锁按钮（英文树无 SKU 中文文案，走 /en/pricing） */}
      {locked && (isEn ? (
        <div className="hw-lk-cta">
          {locked.preview && <p className="hw-lk-note">{locked.preview}</p>}
          <Link href="/en/pricing" className="hw-c-btnBig inline-block">{EN.unlock}</Link>
        </div>
      ) : (
        <UnlockCta skus={locked.skus} preview={locked.preview ? L(locked.preview) : undefined} locale={locale} returnTo={locale === 'zh-Hant' ? '/tw/reports' : '/reports'} />
      ))}
    </div>
  )
}
