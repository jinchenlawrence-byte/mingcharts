'use client'

// 出生地选择器（★ 5 处表单共用的唯一组件：批命、紫微、合婚男、合婚女、地理）
//
// 交互（任务书 §1）：
//   ① 国家 → 州/省 → 城市 三级级联；选城市后时区自动带出
//   ② 搜索：直接输入城市名（中国城市匹配中文名，外国城市匹配英文/ascii 名）
//   ③ 找不到城市 → 「其它」只选时区（不强制经度；进阶可折叠填写经度）
//
// 全球库懒加载（首次展开时 fetch，约 gzip 661KB），不进页面主 bundle。
import { useEffect, useId, useState } from 'react'
import { useRef } from 'react'
import {
  loadWorldData, countriesOf, admin1Of, citiesOf, searchCities
} from '@/lib/worldCitiesClient'
import type { GlobalCity, WorldData } from '@/lib/worldCitiesParse'

// 常用时区（时区输入框的建议清单；输入框本身可填任意 IANA 时区）
// ★ 刻意留在本组件内：birthCities.ts 顶部含 node:fs，客户端组件一旦从它导入，
//   Turbopack 会把 node:fs 拉进 client graph 报「does not support external modules」。
const COMMON_ZONES = [
  // 北美（主要用户群；美国本土四时区＋无夏令时区＋阿拉斯加/夏威夷＋加拿大）
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Phoenix',        // 亚利桑那，不用夏令时
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
  'America/Toronto',
  'America/Vancouver',
  'America/Edmonton',
  'America/Winnipeg',
  'America/Halifax',
  'America/Mexico_City',
  // 东亚
  'Asia/Shanghai',
  'Asia/Hong_Kong',
  'Asia/Taipei',
  'Asia/Tokyo',
  'Asia/Seoul',
  // 东南亚 / 南亚 / 中东
  'Asia/Singapore',
  'Asia/Kuala_Lumpur',
  'Asia/Bangkok',
  'Asia/Ho_Chi_Minh',
  'Asia/Jakarta',
  'Asia/Manila',
  'Asia/Kolkata',
  'Asia/Dubai',
  // 欧洲
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Madrid',
  'Europe/Rome',
  'Europe/Moscow',
  // 大洋洲
  'Australia/Sydney',
  'Australia/Melbourne',
  'Australia/Perth',
  'Pacific/Auckland',
  // 南美
  'America/Sao_Paulo',
  'America/Bogota',
  'America/Lima',
  'America/Argentina/Buenos_Aires',
  'UTC'
]

export type BirthPlaceValue =
  | { mode: 'none' }
  | { mode: 'city'; cityId: string }
  | { mode: 'zone'; zone: string; lng?: number }

type Accent = 'amber' | 'purple' | 'sky' | 'blue' | 'rose'

const FOCUS: Record<Accent, string> = {
  amber: 'focus:ring-amber-500',
  purple: 'focus:ring-purple-500',
  sky: 'focus:ring-sky-500',
  blue: 'focus:ring-blue-500',
  rose: 'focus:ring-rose-500'
}
const CHIP: Record<Accent, string> = {
  amber: 'border-amber-300 bg-gold/5 text-ink',
  purple: 'border-purple-300 bg-gold/5 text-ink',
  sky: 'border-sky-300 bg-sky-50 text-sky-900',
  blue: 'border-blue-300 bg-blue-50 text-blue-900',
  rose: 'border-rose-300 bg-rose-50 text-rose-900'
}
const LINK: Record<Accent, string> = {
  amber: 'text-ink/70 hover:text-ink',
  purple: 'text-ink/70 hover:text-ink',
  sky: 'text-sky-700 hover:text-sky-900',
  blue: 'text-blue-700 hover:text-blue-900',
  rose: 'text-rose-700 hover:text-rose-900'
}

const selectCls = 'w-full px-2 py-2 border border-gold/20 rounded-md text-sm focus:outline-none focus:ring-2'

function cityLabel(c: GlobalCity): string {
  return `${c.name} · ${c.admin1Name} · ${c.countryName}`
}

export default function BirthPlacePicker({
  value, onChange, label = '出生地', accent = 'amber', allowNone = true
}: {
  value: BirthPlaceValue
  onChange: (v: BirthPlaceValue) => void
  label?: string
  accent?: Accent
  allowNone?: boolean
}) {
  const uid = useId().replace(/:/g, '')
  const [world, setWorld] = useState<WorldData | null>(null)
  const [loadErr, setLoadErr] = useState('')
  const [expanded, setExpanded] = useState(value.mode === 'none')

  // 级联选择
  const [cc, setCc] = useState('')
  const [a1, setA1] = useState('')
  // 搜索
  const [q, setQ] = useState('')
  const [focusHit, setFocusHit] = useState(false)
  const searchBoxRef = useRef<HTMLInputElement>(null)

  // 已选城市（chip 展示用）
  const committedCity = value.mode === 'city' ? world?.byId.get(value.cityId) ?? null : null

  const ensureData = () => {
    if (world || loadErr) return
    setLoadErr('')
    loadWorldData().then(setWorld).catch(() => setLoadErr('城市数据加载失败，请检查网络后重试'))
  }
  // 展开且无数据时加载；city chip 也需要数据来显示名称
  useEffect(() => {
    if (!world && (expanded || value.mode === 'city')) ensureData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded, value.mode, world])

  // 从 city 值进入「更换」时，级联定位到该城市所在国家/州省
  useEffect(() => {
    if (expanded && value.mode === 'city' && world) {
      const c = world.byId.get(value.cityId)
      if (c) { setCc(c.countryCode); setA1(findA1Code(world, c)) }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded])

  const commitCity = (cityId: string) => {
    onChange({ mode: 'city', cityId })
    setExpanded(false)
    setQ('')
  }

  const onZoneChange = (zone: string) => {
    onChange({
      mode: 'zone', zone,
      lng: value.mode === 'zone' ? value.lng : undefined
    })
  }
  const onLngChange = (text: string) => {
    if (value.mode !== 'zone') return
    if (text.trim() === '') {
      onChange({ mode: 'zone', zone: value.zone })
    } else {
      const n = Number(text)
      if (Number.isFinite(n)) onChange({ mode: 'zone', zone: value.zone, lng: n })
    }
  }

  const countries = world ? countriesOf(world) : []
  const admins = world && cc ? admin1Of(world, cc) : []
  const cityList = world && cc && a1 ? citiesOf(world, cc, a1) : []
  const hits = world && q.trim() ? searchCities(world, q) : []

  // ───────── 已确认选择：chip + 更换 ─────────
  if (!expanded && value.mode !== 'none') {
    const text = value.mode === 'city'
      ? committedCity ? cityLabel(committedCity) : '加载城市信息中…'
      : `其它 · ${value.zone}${value.lng !== undefined ? ` · 经度 ${value.lng}` : ''}`
    const sub = value.mode === 'city'
      ? committedCity?.zone
      : '中央经线估算（±30 分钟）'
    return (
      <div>
        <label className="block text-sm font-medium text-ink/70 mb-1">{label}</label>
        <div className={`flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm ${CHIP[accent]}`}>
          <span className="truncate">
            ✓ {text}
            {sub && <span className="ml-2 text-xs opacity-60">{sub}</span>}
          </span>
          <button type="button" className={`text-xs whitespace-nowrap underline ${LINK[accent]}`}
            onClick={() => setExpanded(true)}>
            更换
          </button>
        </div>
      </div>
    )
  }

  // ───────── 选择器 ─────────
  return (
    <div onFocus={ensureData}>
      <label className="block text-sm font-medium text-ink/70 mb-1">{label}</label>

      {/* 三级级联 */}
      <div className="grid grid-cols-3 gap-2">
        <select className={`${selectCls} ${FOCUS[accent]}`}
          value={cc}
          onChange={e => {
            if (e.target.value === '__none__') {
              setCc(''); setA1('')
              onChange({ mode: 'none' })
            } else {
              setCc(e.target.value); setA1('')
            }
          }}
        >
          <option value="">国家</option>
          {allowNone && <option value="__none__">不校正</option>}
          {countries.map(co => (
            <option key={co.code} value={co.code}>{co.name}</option>
          ))}
        </select>
        <select className={`${selectCls} ${FOCUS[accent]}`}
          disabled={!cc || cc === '__none__'}
          value={a1}
          onChange={e => setA1(e.target.value)}
        >
          <option value="">州/省</option>
          {admins.map(ad => (
            <option key={ad.code} value={ad.code}>{ad.name}</option>
          ))}
        </select>
        <select className={`${selectCls} ${FOCUS[accent]}`}
          disabled={!a1}
          value={value.mode === 'city' ? value.cityId : ''}
          onChange={e => e.target.value && commitCity(e.target.value)}
        >
          <option value="">城市</option>
          {cityList.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* 搜索 */}
      <div className="relative mt-2">
        <input
          ref={searchBoxRef}
          type="text"
          placeholder="🔍 输入城市名搜索…"
          className={`w-full px-3 py-2 border border-gold/20 rounded-md text-sm focus:outline-none focus:ring-2 ${FOCUS[accent]}`}
          value={q}
          onChange={e => { setQ(e.target.value); setFocusHit(true) }}
          onFocus={() => setFocusHit(true)}
          onBlur={() => setTimeout(() => setFocusHit(false), 150)}
        />
        {focusHit && q.trim() && (
          <div className="absolute z-30 mt-1 w-full max-h-64 overflow-auto rounded-md border border-gold/15 bg-white shadow-lg">
            {hits.length === 0
              ? <div className="px-3 py-2 text-xs text-ink-light/40">无匹配城市（外国城市请输入英文名）</div>
              : hits.map(h => (
                  <button key={h.city.id} type="button"
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-paper-dark/30"
                    onMouseDown={e => { e.preventDefault(); commitCity(h.city.id) }}
                  >
                    <span className="font-medium text-gray-800">{h.city.name}</span>
                    <span className="ml-2 text-xs text-ink-light/40">
                      {h.city.countryName} · {h.city.admin1Name}
                    </span>
                  </button>
                ))}
          </div>
        )}
      </div>

      {/* 其它：仅时区 */}
      <div className="mt-3 flex items-center gap-2 text-[11px] text-ink-light/40">
        <span className="h-px flex-1 bg-paper-dark/50" />
        找不到出生城市？
        <span className="h-px flex-1 bg-paper-dark/50" />
      </div>
      <div className="mt-2">
        <input
          list={`zp-${uid}`}
          placeholder="其它：手动选择时区（如 America/Phoenix）"
          className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 ${
            value.mode === 'zone'
              ? `border-gray-500 ring-1 ring-gray-200 ${FOCUS[accent]}`
              : `border-gold/20 ${FOCUS[accent]}`
          }`}
          value={value.mode === 'zone' ? value.zone : ''}
          onChange={e => onZoneChange(e.target.value)}
        />
        <datalist id={`zp-${uid}`}>
          {COMMON_ZONES.map(z => <option key={z} value={z} />)}
        </datalist>

        {/* 进阶经度（折叠，可选） */}
        <details className="mt-1.5 text-xs text-ink-light">
          <summary className="cursor-pointer select-none text-ink-light/60">进阶：填写经度（可选）</summary>
          <input type="number" step="0.01" placeholder="经度，如 -74.0"
            className="mt-1 w-full px-3 py-2 border border-gold/20 rounded-md text-sm focus:outline-none focus:ring-2"
            value={value.mode === 'zone' && value.lng !== undefined ? value.lng : ''}
            onChange={e => onLngChange(e.target.value)}
          />
          <p className="mt-1 text-[11px] text-ink-light/40">知道出生地确切经度时填写可提高精度；留空按中央经线估算。</p>
        </details>
        <p className="mt-1 text-[11px] text-ink-light/40">
          未填经度时按所选时区的中央经线估算，误差约 ±30 分钟；夏令时按出生日期自动判定。
        </p>
      </div>

      {loadErr && <p className="mt-2 text-xs text-red-600">{loadErr}</p>}
    </div>
  )
}

// 反查城市所属 admin1 的 code
function findA1Code(w: WorldData, c: GlobalCity): string {
  const co = w.countries.find(x => x.code === c.countryCode)
  const ad = co?.admin1.find(a => a.cities.some(x => x.id === c.id))
  return ad?.code ?? ''
}
