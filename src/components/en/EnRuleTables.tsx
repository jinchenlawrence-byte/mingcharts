'use client'

// 英文规则表：与中文规则引擎逐条对齐（不是摘要），所有文案来自 enRule 的英文重写层。
// 中文页/繁体页不引用本组件。

import { useMemo } from 'react'
import type { PaipanResult } from '@/lib/paipan'
import type { GeoAnalysis } from '@/lib/geo'
import type { LuckDaYunItem, LuckLiuNianItem, LuckLiuYueItem } from '@/lib/analysis'
import { hehunEn, geoEn, liunianEn } from '@/lib/enRule'

const LEVEL_STYLE: Record<string, string> = {
  Favorable: 'bg-emerald-50 text-emerald-700 border-emerald-300',
  Neutral: 'bg-amber-50 text-amber-700 border-amber-200',
  Challenging: 'bg-red-50 text-red-700 border-red-200',
}

function LevelBadge({ level }: { level: string }) {
  return <span className={`inline-block text-xs px-2 py-0.5 rounded border ${LEVEL_STYLE[level] ?? ''}`}>{level}</span>
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

export function EnHemunRules({ male, female }: { male?: PaipanResult; female?: PaipanResult }) {
  const view = useMemo(() => (male && female ? hehunEn(male, female) : null), [male, female])
  if (!view) return null
  return (
    <section className="space-y-4">
      <div className="hw-c-box">
        <h3 className="hw-c-secTitle">Rule-engine synastry</h3>
        <p className="text-lg font-semibold mb-2">{view.gradeLabel}</p>
        <p className="hw-c-body mb-3">{view.overall}</p>
        <div className="grid grid-cols-2 gap-3 text-sm">
          {(['male', 'female'] as const).map((k) => (
            <div key={k} className="rounded border border-gold/15 p-3">
              <p className="font-semibold mb-1">{k === 'male' ? 'Male chart' : 'Female chart'}</p>
              <p>{view[k].ganZhi.year} · {view[k].ganZhi.month} · {view[k].ganZhi.day} · {view[k].ganZhi.hour}</p>
              <p>Day Master: {view[k].dayMaster}</p>
              <p>{view[k].strength}{view[k].structure ? ` · ${view[k].structure}` : ''}</p>
              <p>Year Nayin: {view[k].yearNaYin}</p>
            </div>
          ))}
        </div>
        {view.keyTags.length > 0 && (
          <p className="mt-3 text-sm">Highlights: {view.keyTags.join(', ')}</p>
        )}
        <p className="mt-2 text-sm">Current Luck Pillars: {view.currentLuck.male} / {view.currentLuck.female}</p>
        <p className="hw-note mt-1">{view.currentLuck.note}</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {view.dimensions.map((d) => (
          <article key={d.key} className="hw-c-box">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold">{d.name}</h4>
              <LevelBadge level={d.level} />
            </div>
            <p className="hw-note mb-2">Basis: {d.basis}</p>
            <Bullets items={d.facts} />
            {d.tags.length > 0 && <p className="text-sm mt-2">Tags: {d.tags.join(', ')}</p>}
            <p className="hw-c-body mt-2">{d.verdict}</p>
            {d.citations.map((c, i) => <p key={i} className="hw-note mt-2">{c}</p>)}
          </article>
        ))}
      </div>
    </section>
  )
}

// ───────── 方位 ─────────

export function EnGeoRules({ geo }: { geo: GeoAnalysis }) {
  const view = useMemo(() => geoEn(geo), [geo])
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
          <p className="hw-c-body">{view.currentCity.impact} · score {view.currentCity.score}</p>
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

      {view.categories.map((c) => (
        <div key={c.key} className="hw-c-box">
          <h3 className="hw-c-secTitle">{c.label}</h3>
          <p className="hw-note mb-2">Target: {c.targetWx} · {c.targetGod}</p>
          {c.notice && <p className="hw-note mb-2">{c.notice}</p>}
          <div className="space-y-3">
            {c.cities.map((city, i) => (
              <article key={i} className="rounded border border-gold/15 p-3">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-semibold">{city.name}</h4>
                  <span className="text-xs">{city.impact} · {city.score}</span>
                </div>
                <p className="hw-note">{city.region}</p>
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
    </section>
  )
}

// ───────── 年运 ─────────

export function EnLiunianRules({ favorable, unfavorable, curDaYun, liuNian, liuYue }: {
  favorable: string[]
  unfavorable: string[]
  curDaYun: LuckDaYunItem | null
  liuNian: LuckLiuNianItem[]
  liuYue: LuckLiuYueItem[] | null
}) {
  const view = useMemo(
    () => liunianEn({ favorable, unfavorable, curDaYun, liuNian, liuYue }),
    [favorable, unfavorable, curDaYun, liuNian, liuYue],
  )
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
          {view.liuNian.map((y) => (
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
          ))}
        </div>
      </div>

      {view.liuYue && (
        <div className="hw-c-box">
          <h3 className="hw-c-secTitle">Monthly cycles ({view.liuYue.length})</h3>
          <div className="grid gap-2 md:grid-cols-2">
            {view.liuYue.map((m) => (
              <article key={m.month} className="rounded border border-gold/15 p-2">
                <p className="font-semibold text-sm">{m.month} · {m.ganZhi} · {m.tag}</p>
                <p className="hw-note">{m.jieQi} · {m.rangeLabel} · {m.shiShenGan}</p>
                <p className="text-sm">{m.note}</p>
                {m.relations.length > 0 && <p className="text-xs mt-1">Relations: {m.relations.join(' ')}</p>}
              </article>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
