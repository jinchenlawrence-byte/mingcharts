'use client'

// 英文规则表：与中文规则引擎逐条对齐（不是摘要），所有文案来自 enRule 的英文重写层。
// 中文页/繁体页不引用本组件。

import { useMemo } from 'react'
import type { CSSProperties } from 'react'
import type { PaipanResult } from '@/lib/paipan'
import type { GeoAnalysis } from '@/lib/geo'
import { geoScoreTier } from '@/lib/geo'
import type { LuckDaYunItem, LuckLiuNianItem, LuckLiuYueItem } from '@/lib/analysis'
import { hehunEn, geoEn, liunianEn } from '@/lib/enRule'
import { PREVIEW_FREE } from '@/lib/reportPreview'
import { annualFreeVisible, zonedNow } from '@/lib/liunianFree'
import { LockedCard, UnlockCta } from '@/components/reports/PreviewLock'

const LEVEL_STYLE: Record<string, string> = {
  Favorable: 'hw-badge--good',
  Neutral: 'hw-badge--flat',
  Challenging: 'hw-badge--bad',
}

function LevelBadge({ level }: { level: string }) {
  return <span className={`hw-badge ${LEVEL_STYLE[level] ?? ''}`}>{level}</span>
}

/** City score tier: colour + explicit High/Mid/Low text + number (colour-blind safe). */
function ScoreTag({ score }: { score: number }) {
  const tier = geoScoreTier(score)
  const style = tier === 'good' ? 'hw-badge--good' : tier === 'bad' ? 'hw-badge--bad' : 'hw-badge--flat'
  const label = tier === 'good' ? 'High' : tier === 'bad' ? 'Low' : 'Mid'
  return <span className={`hw-badge ${style}`}>{label} · {score.toFixed(1)}</span>
}

function ScoreBar({ score }: { score: number }) {
  const tier = geoScoreTier(score)
  return (
    <span className={`hw-scorebar hw-scorebar--${tier}`} aria-hidden>
      <i style={{ width: `${Math.max(0, Math.min(100, score))}%` }} />
    </span>
  )
}

/** Left 4px semantic band, matching the Chinese result view. */
function levelBand(level: string): string {
  return level === 'Favorable' ? 'hw-dim--good' : level === 'Challenging' ? 'hw-dim--bad' : 'hw-dim--flat'
}

function Bullets({ items, empty }: { items: string[]; empty?: string }) {
  if (!items.length) return empty ? <p className="hw-note">{empty}</p> : null
  return (
    <ul className="list-disc pl-5 space-y-1">
      {items.map((t, i) => <li key={i} className="hw-c-body">{t}</li>)}
    </ul>
  )
}

// ───────── 合婚 ─────────

export function EnHemunRules({ male, female, previewOnly = false }: {
  male?: PaipanResult
  female?: PaipanResult
  /** 未购买：只展开 PREVIEW_FREE.hemun 的维度，其余给锁定占位（与简/繁同一白名单） */
  previewOnly?: boolean
}) {
  const view = useMemo(() => (male && female ? hehunEn(male, female) : null), [male, female])
  if (!view) return null
  const freeDims = previewOnly
    ? view.dimensions.filter((d) => PREVIEW_FREE.hemun.includes(d.key))
    : view.dimensions
  const lockedDims = previewOnly
    ? view.dimensions.filter((d) => !PREVIEW_FREE.hemun.includes(d.key))
    : []
  return (
    <section className="space-y-4">
      <div className="bg-hw-surface rounded-[26px] shadow-sm border border-gold/15 p-6">
        <h3 className="hw-c-secTitle">Rule-engine synastry</h3>
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          <div
            className="hw-score-ring mx-auto sm:mx-0"
            style={{ ['--score' as string]: view.totalScore } as CSSProperties}
            role="img"
            aria-label={`Reference score ${view.totalScore} / 100`}
          >
            <div className="hw-score-ring-inner">
              <div>
                <div className="hw-score-num">{view.totalScore}</div>
                <div className="hw-score-denom">/ 100</div>
              </div>
            </div>
          </div>
          <div className="flex-1 text-center sm:text-left">
            <p className="text-xs text-ink-light mb-1">Overall compatibility</p>
            <p className="hw-c-h1">{view.gradeLabel}</p>
            <p className="hw-c-body mt-2">{view.overall}</p>
            {view.keyTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3 justify-center sm:justify-start">
                {view.keyTags.map((t) => <span key={t} className="hw-badge hw-badge--accent">{t}</span>)}
              </div>
            )}
            <p className="text-xs text-ink-light mt-3">Reference score only; not a fixed verdict.</p>
            <div className="flex flex-wrap gap-2 mt-2 justify-center sm:justify-start">
              <span className="hw-badge">Current luck · Male: {view.currentLuck.male}</span>
              <span className="hw-badge">Current luck · Female: {view.currentLuck.female}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {(['male', 'female'] as const).map((k) => (
          <div key={k} className="hw-c-box hw-c-boxLg">
            <h3 className={`hw-c-h3 ${k === 'male' ? 'text-hw-water' : 'text-cinnabar'}`}>
              {k === 'male' ? 'Male chart' : 'Female chart'}
            </h3>
            <div className="grid grid-cols-4 gap-2 text-center mb-3">
              {(['year', 'month', 'day', 'hour'] as const).map((p, i) => (
                <div key={p} className={`hw-pillar${p === 'day' ? ' hw-pillar--day' : ''}`}>
                  <div className="text-xs text-ink-light mb-1">{['Year', 'Month', 'Day', 'Hour'][i]}</div>
                  <div className="hw-gz text-lg">{view[k].ganZhi[p]}</div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap justify-center gap-1.5 mb-2">
              <span className="hw-badge">Day Master · {view[k].dayMaster}</span>
              <span className="hw-badge hw-badge--accent">{view[k].strength}</span>
              {view[k].structure && <span className="hw-badge hw-badge--accent">{view[k].structure}</span>}
            </div>
            <p className="text-xs text-ink-light text-center">Year Nayin: <span className="text-ink">{view[k].yearNaYin}</span></p>
          </div>
        ))}
      </div>
      <p className="hw-note">{view.currentLuck.note}</p>

      <div className="space-y-3">
        <h3 className="hw-c-h3">
          Dimensions ({view.dimensions.length}){previewOnly ? ` · ${freeDims.length} free, ${lockedDims.length} locked` : ''}
        </h3>
        <div className="hw-dim-grid">
          {view.dimensions.map((d) => (
            previewOnly && !PREVIEW_FREE.hemun.includes(d.key) ? (
              <div key={d.key} className="hw-dim-cell opacity-60" data-hemun-locked-dim={d.key}>
                <b>{d.name}</b>
                <span>Locked</span>
              </div>
            ) : (
              <a key={d.key} href={`#dim-${d.key}`} className="hw-dim-cell">
                <b>{d.name}</b>
                <span>{d.level}</span>
              </a>
            )
          ))}
        </div>
        {freeDims.map((d) => (
          <article key={d.key} id={`dim-${d.key}`} className={`hw-c-box hw-c-boxLg hw-dim ${levelBand(d.level)}`}>
            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
              <h4 className="font-semibold text-ink">{d.name}</h4>
              <div className="flex items-center gap-1.5">
                <span className="hw-basis">{d.basis}</span>
                <LevelBadge level={d.level} />
              </div>
            </div>
            <p className="text-[15px] text-ink mb-2 leading-relaxed">{d.verdict}</p>
            <Bullets items={d.facts} />
            {d.tags.length > 0 && <p className="text-xs mt-2 text-ink-light">Tags: {d.tags.join(', ')}</p>}
            {d.citations.length > 0 && (
              <details className="mt-2">
                <summary className="hw-basis-toggle">View sources ▾</summary>
                {d.citations.map((c, i) => <p key={i} className="text-xs text-ink-light mt-1.5">{c}</p>)}
              </details>
            )}
          </article>
        ))}
        {/* 锁定维度：只给名称与「付费后可见」，正文（verdict/facts/citations）不进 DOM */}
        {lockedDims.map((d) => (
          <div key={d.key} className="hw-c-box hw-c-boxLg opacity-70" data-hemun-locked-card={d.key}>
            <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
              <h4 className="font-semibold text-ink">{d.name}</h4>
              <span className="hw-basis">{d.basis}</span>
            </div>
            <p className="text-sm text-ink-light">
              Paid section — the full reading explains how this dimension is scored and what it means for the match.
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}

// ───────── 方位 ─────────

export function EnGeoRules({ geo, previewOnly = false, unlockPreview }: {
  geo: GeoAnalysis
  /** 未购买：只展开 PREVIEW_FREE.geo 的类别，其余给锁定占位（与简/繁同一白名单） */
  previewOnly?: boolean
  /** 付费墙说明（由 route 下发，三语同源） */
  unlockPreview?: string
}) {
  const view = useMemo(() => geoEn(geo), [geo])
  const freeCats = previewOnly ? view.categories.filter((c) => PREVIEW_FREE.geo.includes(c.key)) : view.categories
  const lockedCats = previewOnly ? view.categories.filter((c) => !PREVIEW_FREE.geo.includes(c.key)) : []
  return (
    <section className="space-y-4">
      <div className="hw-c-box">
        <h3 className="hw-c-secTitle">Directional rule table</h3>
        <p className="hw-c-body">Day Master {view.dayMaster} · {view.wangShuai}</p>
        <p className="text-sm mt-1">Favourable elements: {view.favorableWx.join(', ') || '—'}</p>
        <p className="text-sm">Unfavourable elements: {view.unfavorableWx.join(', ') || '—'}</p>
        <p className="text-sm">Favourable directions: {view.favorableDirections.join(', ') || '—'}</p>
        <p className="text-sm">Unfavourable directions: {view.unfavorableDirections.join(', ') || '—'}</p>
        {view.birthplace && <p className="text-sm mt-1">Birthplace: {view.birthplace}</p>}
      </div>

      {view.currentCity && (
        <div className="hw-c-box">
          <div className="flex items-center justify-between mb-2">
            <h3 className="hw-c-secTitle mb-0">Current city: {view.currentCity.name}</h3>
            <LevelBadge level={view.currentCity.level} />
          </div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <ScoreTag score={view.currentCity.score} />
            <span className="hw-c-body">{view.currentCity.impact}</span>
          </div>
          <div className="mb-2 max-w-[220px]"><ScoreBar score={view.currentCity.score} /></div>
          <p className="text-sm mt-1">
            Main source: {view.currentCity.primarySource || '—'}
            {view.currentCity.primaryWx ? ` · ${view.currentCity.primaryWx}` : ''}
            {view.currentCity.godRelation ? ` · ${view.currentCity.godRelation}` : ''}
            {view.currentCity.fangLabel ? ` · ${view.currentCity.fangLabel}` : ''}
            {view.currentCity.distanceKm !== null ? ` · ${view.currentCity.distanceKm} km` : ''}
          </p>
          {view.currentCity.diqi && <p className="text-sm">City qi: {view.currentCity.diqi} — {view.currentCity.diqiNote}</p>}
          <div className="mt-3">
            <p className="text-xs font-semibold">Effects</p>
            <Bullets items={view.currentCity.effects} />
          </div>
          <div className="mt-3">
            <p className="text-xs font-semibold">Advice</p>
            <Bullets items={view.currentCity.advice} />
          </div>
        </div>
      )}

      <div className="hw-c-box">
        <h3 className="hw-c-secTitle">Category legend</h3>
        <p className="hw-note mb-2">
          Categories mark the directional element each city supports; they do not rank cities. City scores are
          banded High / Mid / Low and always show the number as well as the colour.
        </p>
        <div className="hw-geo-legend">
          {freeCats.map((c) => (
            <div key={c.key} className="hw-geo-legend-item">
              <i className={`hw-cat-dot hw-cat--${c.key}`} aria-hidden />
              <span>
                <b className={`hw-cat--${c.key}`}>{c.label}</b>
                <span className="hw-geo-legend-desc"> — {c.desc}</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      {freeCats.map((c) => (
        <div key={c.key} className="hw-c-box">
          <h3 className="hw-c-secTitle flex flex-wrap items-baseline gap-2">
            <span className={`hw-cat-badge hw-cat--${c.key}`}>{c.label}</span>
            <span className="text-xs font-normal text-ink-light">Target: {c.targetWx} · {c.targetGod}</span>
          </h3>
          {c.notice && <p className="hw-note mb-2">{c.notice}</p>}
          <div className="space-y-3">
            {c.cities.map((city, i) => (
              <article key={i} className="rounded border border-gold/15 p-3">
                <div className="flex items-start justify-between gap-3 mb-1">
                  <div className="min-w-0">
                    <h4 className="font-semibold">{city.name}</h4>
                    <p className="hw-note">{city.region}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 min-w-[100px]">
                    <ScoreTag score={city.score} />
                    <span className="text-[11px] text-ink-light">{city.impact}</span>
                    <ScoreBar score={city.score} />
                  </div>
                </div>
                <p className="text-sm">Direction: {city.fangLabel}{city.center ? ' (centre)' : ''} · bearing {city.bearing}° · sector {city.menWx}/{city.fangWx}</p>
                {city.diqi && <p className="text-sm">City qi: {city.diqi} — {city.diqiNote}</p>}
                <div className="mt-2">
                  <p className="text-xs font-semibold">Reasons ({city.reasons.length})</p>
                  <Bullets items={city.reasons} />
                </div>
              </article>
            ))}
            {c.cities.length === 0 && <p className="hw-note">No city lies in the required direction for this category.</p>}
          </div>
        </div>
      ))}

      {lockedCats.map((c) => (
        <LockedCard key={c.key} title={c.label} locale="en" />
      ))}

      {previewOnly && (
        <UnlockCta
          skus={['geo']}
          preview={unlockPreview}
          locale="en"
          returnTo="/en/reports"
        />
      )}
    </section>
  )
}

// ───────── 年运 ─────────

export function EnLiunianRules({ favorable, unfavorable, curDaYun, liuNian, liuYue, previewOnly = false, targetYear }: {
  favorable: string[]
  unfavorable: string[]
  curDaYun: LuckDaYunItem | null
  liuNian: LuckLiuNianItem[]
  liuYue: LuckLiuYueItem[] | null
  /** 未购买：只开已经过去的年份与已过去的整月；今年/未来锁定（与简/繁同一口径） */
  previewOnly?: boolean
  /** 流月所属目标年（缺省按当前时区年兜底） */
  targetYear?: number
}) {
  const view = useMemo(
    () => liunianEn({ favorable, unfavorable, curDaYun, liuNian, liuYue }),
    [favorable, unfavorable, curDaYun, liuNian, liuYue],
  )
  // ★ 时区基准（默认 Asia/Shanghai）：过去/当年/未来按用户时区判断，不用 UTC 日期
  const now = previewOnly ? zonedNow(null) : null
  return (
    <section className="space-y-4">
      <div className="hw-c-box">
        <h3 className="hw-c-secTitle">Luck rule table</h3>
        <p className="text-sm">Favourable elements: {view.favorable.join(', ') || '—'}</p>
        <p className="text-sm">Unfavourable elements: {view.unfavorable.join(', ') || '—'}</p>
      </div>

      {view.curDaYun && (
        <div className="hw-c-box">
          <div className="flex items-center justify-between mb-1">
            <h3 className="hw-c-secTitle mb-0">Current Luck Pillar: {view.curDaYun.ganZhi}</h3>
            <span className="text-xs">{view.curDaYun.tag} · {view.curDaYun.score}</span>
          </div>
          <p className="hw-note">{view.curDaYun.startYear}–{view.curDaYun.endYear} · from age {view.curDaYun.startAge} · stem {view.curDaYun.shiShenGan} / branch {view.curDaYun.shiShenZhi}</p>
          <p className="hw-c-body mt-2">{view.curDaYun.note}</p>
          {view.curDaYun.relations.length > 0 && <div className="mt-2"><p className="text-xs font-semibold">Relations</p><Bullets items={view.curDaYun.relations} /></div>}
          {view.curDaYun.issues.length > 0 && <div className="mt-2"><p className="text-xs font-semibold">Structural notes</p><Bullets items={view.curDaYun.issues} /></div>}
          <div className="grid gap-2 md:grid-cols-2 mt-3">
            {(['career', 'wealth', 'health', 'relation'] as const).map((k) => (
              <div key={k} className="rounded border border-gold/15 p-2">
                <p className="text-xs font-semibold capitalize">{k} · {view.curDaYun!.domains[k].tendency}</p>
                <p className="text-sm">{view.curDaYun!.domains[k].note}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="hw-c-box">
        <h3 className="hw-c-secTitle">Annual cycles ({view.liuNian.length})</h3>
        <div className="space-y-3">
          {view.liuNian.map((y) => {
            if (previewOnly && now && !annualFreeVisible(now, y.year)) {
              return (
                <article key={y.year} className="rounded border border-gold/15 p-3 opacity-70" data-liunian-locked={y.year}>
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-semibold">{y.year} · {y.ganZhi}</h4>
                    <span className="text-xs">Paid</span>
                  </div>
                  <p className="hw-note">
                    Paid section — unlock for this year&apos;s Ten Gods, tendencies and timing signals.
                  </p>
                </article>
              )
            }
            return (
              <article key={y.year} className="rounded border border-gold/15 p-3">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-semibold">{y.year} · {y.ganZhi}{y.current ? ' (current year)' : ''}</h4>
                  <span className="text-xs">{y.tag} · {y.score}</span>
                </div>
                <p className="hw-note">Stem {y.shiShenGan} / branch {y.shiShenZhi} · Luck Pillar {y.daYunGanZhi}</p>
                <p className="hw-c-body mt-1">{y.note}</p>
                {y.relations.length > 0 && <p className="text-sm mt-1">Relations: {y.relations.join(' ')}</p>}
                {y.issues.length > 0 && <p className="text-sm mt-1">Structural notes: {y.issues.join(' ')}</p>}
              </article>
            )
          })}
        </div>
      </div>

      {view.liuYue && (() => {
        // ★ 免费分层：只开已经过去的整月；当月与未来月份只给清单 + 锁定说明
        const monthYear = targetYear ?? now?.year ?? new Date().getFullYear()
        const openMonths = previewOnly && now
          ? view.liuYue!.filter((m) => annualFreeVisible(now, monthYear, m.month))
          : view.liuYue!
        const lockedMonths = previewOnly && now
          ? view.liuYue!.filter((m) => !annualFreeVisible(now, monthYear, m.month))
          : []
        return (
          <div className="hw-c-box">
            <h3 className="hw-c-secTitle">Monthly cycles ({view.liuYue!.length})</h3>
            <div className="grid gap-2 md:grid-cols-2">
              {openMonths.map((m) => (
                <article key={m.month} className="rounded border border-gold/15 p-2">
                  <p className="font-semibold text-sm">{m.month} · {m.ganZhi} · {m.tag}</p>
                  <p className="hw-note">{m.jieQi} · {m.rangeLabel} · {m.shiShenGan}</p>
                  <p className="text-sm">{m.note}</p>
                  {m.relations.length > 0 && <p className="text-xs mt-1">Relations: {m.relations.join(' ')}</p>}
                </article>
              ))}
            </div>
            {lockedMonths.length > 0 && (
              <div className="mt-2 rounded border border-gold/15 p-3 opacity-70" data-liunian-month-locked={lockedMonths.length}>
                <p className="font-semibold text-sm">
                  {lockedMonths.map((m) => `Month ${m.month}`).join(', ')}
                </p>
                <p className="hw-note">
                  Paid section — unlock for each month&apos;s pillar, solar-term boundary and guidance.
                </p>
              </div>
            )}
          </div>
        )
      })()}
    </section>
  )
}
