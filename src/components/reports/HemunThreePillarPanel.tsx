'use client'

// 合婚三柱结果面板（2026-11-11）
// 只渲染三柱能成立的判断；依赖时柱的维度一律灰底「未计算」，不显示吉凶色块、不显示分数。
import Link from 'next/link'
import type { HemunResult, HemunDimension } from '@/lib/hemun'
import { localize } from '@/lib/hant'
import { pathForLang, type SiteLang } from '@/lib/lang'

const SKIP_NAMES: Record<string, string> = {
  wuxing: '五行互补·喜用互助',
  spouse: '配偶星旺衰与落时',
  palace: '婚姻宫稳定度',
  shishen: '十神互见',
  dayun: '大运同步',
}

function PillarRow({ label, gz, unknown, locale }: { label: string; gz: string; unknown?: boolean; locale: SiteLang }) {
  const L = (s: string) => localize(s, locale)
  return (
    <div className="hw-pillar">
      <div className="text-xs text-ink-light mb-1">{L(label)}</div>
      {unknown ? (
        <div className="text-sm text-ink-light py-1.5">{L('未知')}</div>
      ) : (
        <div className="hw-gz">
          <span>{gz[0]}</span>
          <span>{gz[1]}</span>
        </div>
      )}
    </div>
  )
}

function JudgmentCard({ title, verdict, facts, level, locale }: {
  title: string
  verdict: string
  facts: string[]
  level?: string
  locale: SiteLang
}) {
  const L = (s: string) => localize(s, locale)
  return (
    <div className="hw-c-box hw-c-boxLg">
      <div className="flex items-center justify-between mb-1.5 gap-2">
        <span className="font-semibold text-ink">{L(title)}</span>
        {level && (
          <span className={`hw-badge ${level === '吉' ? 'hw-badge--good' : level === '忌' ? 'hw-badge--bad' : 'hw-badge--flat'}`}>
            {L(level)}
          </span>
        )}
      </div>
      <p className="text-[15px] text-ink mb-2 leading-relaxed">{L(verdict)}</p>
      {facts.length > 0 && (
        <ul className="text-xs text-ink-light space-y-0.5 list-disc list-inside">
          {facts.map((f, i) => <li key={i}>{L(f)}</li>)}
        </ul>
      )}
    </div>
  )
}

/** 未计算占位：灰底、无吉凶色块、无评级 */
function SkippedBar({ name, reason, locale }: { name: string; reason: string; locale: SiteLang }) {
  const L = (s: string) => localize(s, locale)
  return (
    <div className="rounded-lg border border-ink/10 bg-paper-dark/25 px-3.5 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-ink/70">{L(name)}</span>
        <span className="text-xs text-ink-light">{L('未计算')}</span>
      </div>
      <p className="text-xs text-ink-light mt-1">{L(reason)}</p>
    </div>
  )
}

export default function HemunThreePillarPanel({ r, locale }: { r: HemunResult; locale: SiteLang }) {
  const L = (s: string) => localize(s, locale)
  const day = r.dimensions.find(d => d.key === 'day')
  const spouse = r.dimensions.find(d => d.key === 'spouseStem')
  const skipped = r.dimensions.filter(d => d.status === 'skipped_missing_hour') as HemunDimension[]
  const gufa = r.dimensions.filter(d => (d.key === 'yearZodiac' || d.key === 'nayin') && d.status === 'calculated')

  // 夫妻宫与双方日干在引擎里同属 day 维度：按事实文本拆成两张卡，避免再算一遍
  const dayFacts = day?.facts ?? []
  const zhiFacts = dayFacts.filter(f => f.includes('日支') || f.includes('夫妻宫'))
  const ganFacts = dayFacts.filter(f => f.includes('日干'))
  const ganTag = (day?.tags ?? []).find(t => t.includes('日干')) ?? ''

  return (
    <div className="space-y-5">
      {/* 声明条：正常语气，不做免责声明】 */}
      <div className="rounded-xl border border-gold/20 bg-gold/5 px-4 py-3">
        <p className="text-sm text-ink leading-relaxed">
          {L('这次用的是年、月、日三柱，不是四柱的简化版。缺时柱，有几项判断在方法上就不成立，所以下面只列这一层能说的，没算的也一并标明。')}
        </p>
      </div>

      {/* 两盘摘要（时柱显示未知，不补默认时刻） */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="hw-c-box">
          <h3 className="hw-c-h3 text-hw-water mb-3">{L('男方命盘')}</h3>
          <div className="grid grid-cols-4 gap-2 text-center">
            <PillarRow label="年柱" gz={r.male.ganZhi.year} locale={locale} />
            <PillarRow label="月柱" gz={r.male.ganZhi.month} locale={locale} />
            <PillarRow label="日柱" gz={r.male.ganZhi.day} locale={locale} />
            <PillarRow label="时柱" gz="" unknown locale={locale} />
          </div>
          <div className="text-xs text-ink-light text-center mt-2">{L('日主')} · {L(r.male.dayMaster)}</div>
        </div>
        <div className="hw-c-box">
          <h3 className="hw-c-h3 text-cinnabar mb-3">{L('女方命盘')}</h3>
          <div className="grid grid-cols-4 gap-2 text-center">
            <PillarRow label="年柱" gz={r.female.ganZhi.year} locale={locale} />
            <PillarRow label="月柱" gz={r.female.ganZhi.month} locale={locale} />
            <PillarRow label="日柱" gz={r.female.ganZhi.day} locale={locale} />
            <PillarRow label="时柱" gz="" unknown locale={locale} />
          </div>
          <div className="text-xs text-ink-light text-center mt-2">{L('日主')} · {L(r.female.dayMaster)}</div>
        </div>
      </div>

      {/* 三条判断 */}
      <div className="space-y-3">
        <h2 className="hw-c-h3">{L('三柱能判断的三件事')}</h2>
        {day && (
          <JudgmentCard
            title="夫妻宫（日支）"
            verdict={day.verdict ?? ''}
            facts={zhiFacts.length ? zhiFacts : dayFacts}
            level={day.level}
            locale={locale}
          />
        )}
        <JudgmentCard
          title="双方日干五行"
          verdict={ganTag
            ? `${L('日干')} ${r.male.dayMaster} ${L('与')} ${r.female.dayMaster}：${L(ganTag)}`
            : L('双方日干之间无五合、相生或相克，性情互不牵引，也不互相消耗。')}
          facts={ganFacts}
          locale={locale}
        />
        {spouse && (
          <JudgmentCard
            title="配偶星是否透干"
            verdict={spouse.verdict ?? ''}
            facts={spouse.facts ?? []}
            level={spouse.level}
            locale={locale}
          />
        )}
      </div>

      {/* 未计算：灰底条，无评级 */}
      <div className="space-y-2">
        <h2 className="hw-c-h3">{L('本次没有计算的项目')}</h2>
        <p className="text-xs text-ink-light">
          {L('这些判断都以时柱为前提。缺时柱时我们不给结论，也不用默认时辰代替。')}
        </p>
        {skipped.map(d => (
          <SkippedBar key={d.key} name={SKIP_NAMES[d.key] ?? d.name} reason={d.reason ?? ''} locale={locale} />
        ))}
        {/* 子女宫：引擎无此维度，静态补一条，措辞与其余一致 */}
        <SkippedBar
          name="子女宫"
          reason="子女宫以时柱为宫位，属四柱层面的判断；本次缺时柱，这一项不在可判范围内。"
          locale={locale}
        />
      </div>

      {/* 古法折叠：默认收起，不带吉忌色 */}
      {gufa.length > 0 && (
        <details className="rounded-lg border border-ink/10 bg-paper-dark/20 px-3.5 py-2.5">
          <summary className="cursor-pointer text-sm text-ink/80">
            {L('古法·参断（生肖配对、年柱纳音）')}
          </summary>
          <div className="mt-2 space-y-2">
            <p className="text-xs text-ink-light">
              {L('这两项属古法与民俗层，不参与上面的判断，也不作吉凶定论。')}
            </p>
            {gufa.map(d => (
              <div key={d.key} className="text-xs text-ink-light">
                <span className="text-ink font-medium">{L(d.name)}</span>
                {d.citations && d.citations.length > 0 && (
                  <span className="ml-1">（{L(d.citations[0])}）</span>
                )}
                <p className="mt-0.5">{(d.facts ?? []).map(L).join('；')}</p>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* 补时辰入口 */}
      <div className="rounded-xl border border-gold/25 bg-white px-4 py-4 text-center">
        <p className="text-sm text-ink mb-1">{L('补上出生时辰，可多看这五项')}</p>
        <p className="text-xs text-ink-light mb-3">
          {L('五行互补、配偶星旺衰、婚姻宫稳定度、十神互见、大运同步——这五项都要用到时柱。')}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <a href="#hemun-form" className="hw-c-btnBig !py-2 !px-5 !text-sm">{L('去填时辰')}</a>
          <Link href={pathForLang('/hemun/hour', locale)} className="text-sm text-ink underline underline-offset-4">
            {L('不知道出生时辰怎么办？')}
          </Link>
        </div>
      </div>
    </div>
  )
}
