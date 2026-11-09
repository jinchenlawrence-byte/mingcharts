'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import BirthPlacePicker from '@/components/BirthPlacePicker'
import type { BirthPlaceValue } from '@/components/BirthPlacePicker'
import GeoResultView from '@/components/reports/GeoResultView'
import type { GeoResultData } from '@/components/reports/GeoResultView'
import { loadWorldData, searchCities } from '@/lib/worldCitiesClient'
import { getAuthToken } from '@/lib/authToken'
import { isReportPaid } from '@/lib/reportAccess'
import { toHant } from '@/lib/hant'

// 方位地理（繁體）：與 /geo 同構、同功能；AI 全文由 locale=zh-Hant 直出。
// ★ 導航由 /tw 佈局提供。
const H = (s: string) => toHant(s)

function CurrentCitySelect({ value, onChange }: {
  value: string
  onChange: (id: string) => void
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [hits, setHits] = useState<Array<{ id: string; label: string }>>([])
  const [selectedLabel, setSelectedLabel] = useState('')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const onInput = (q: string) => {
    setQuery(q)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      if (q.trim().length < 1) { setHits([]); return }
      const world = await loadWorldData()
      setHits(searchCities(world, q, 20).map(h => ({ id: h.city.id, label: h.label })))
    }, 150)
  }

  if (value) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-[14px] bg-gold/5 border border-gold/15 text-sm">
        <span className="flex-1 truncate text-ink">{selectedLabel || value}</span>
        <button type="button" className="text-ink-light hover:text-red-500"
          onClick={() => { onChange(''); setQuery(''); setSelectedLabel('') }}>
          ✕
        </button>
      </div>
    )
  }

  return (
    <div className="relative">
      <input
        className="hw-c-input"
        placeholder={H('輸入城市名搜尋（中文／英文，全球城市）')}
        value={query}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onChange={(e) => { onInput(e.target.value); setOpen(true) }}
      />
      {open && hits.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full max-h-64 overflow-auto bg-white border border-gold/15 rounded-[14px] shadow-lg text-sm">
          {hits.map(h => (
            <li key={h.id}
              className="px-3 py-2 cursor-pointer hover:bg-gold/5"
              onMouseDown={() => {
                onChange(h.id)
                setSelectedLabel(h.label)
                setQuery('')
                setHits([])
                setOpen(false)
              }}>
              {h.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function HantGeoClient() {
  const [formData, setFormData] = useState({
    year: '', month: '', day: '', hour: '', minute: '', gender: 1 as 1 | 0,
    currentCityId: ''
  })
  const [birth, setBirth] = useState<BirthPlaceValue>({ mode: 'none' })
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<GeoResultData | null>(null)
  const [saved, setSaved] = useState<boolean | null>(null)
  /** 本次生成/覆蓋的報告 id（傳給追問面板做服務端歸屬校驗） */
  const [reportId, setReportId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await runGenerate()
  }

  const runGenerate = async (opts?: { regen?: boolean }) => {
    setLoading(true)
    setError('')
    setSaved(null)
    setReportId(null)
    try {
      const token = await getAuthToken()
      const res = await fetch(opts?.regen ? '/api/geo?regen=1' : '/api/geo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year: parseInt(formData.year),
          month: parseInt(formData.month),
          day: parseInt(formData.day),
          hour: parseInt(formData.hour),
          minute: formData.minute === '' ? 0 : parseInt(formData.minute),
          gender: formData.gender,
          locale: 'zh-Hant',
          ...(formData.currentCityId ? { currentCityId: formData.currentCityId } : {}),
          ...(birth.mode === 'city'
            ? { birthCityId: birth.cityId }
            : birth.mode === 'zone'
              ? { birthZone: birth.zone, birthLng: birth.lng }
              : {}),
          ...(token ? { token } : {})
        })
      })
      const json = await res.json()
      if (json.success) {
        setData(json.data as GeoResultData)
        setSaved(!!json.reportId)
        setReportId(typeof json.reportId === 'string' ? json.reportId : null)
      } else {
        setError(json.error || H('解析失敗'))
      }
    } catch {
      setError(H('網路錯誤'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="hw-page hw-report-theme">
      <main className="hw-wrap hw-c-pg">
        <Link href="/tw" className="hw-c-back">{H('‹ 首頁')}</Link>
        <header>
          <h1 className="hw-c-h1">{H('方位地理 · 城市解析')}</h1>
          <p className="hw-lede">{H('財富之城 · 事業之城 · 貴人之城 · 才華之城，按相對出生地的方位推薦城市')}</p>
          <p className="hw-note">
            {H('說明：候選以「方位五行」（城市相對命主出生地即時計算，傳統方位之說）為門控；城市地氣（物產取象）為本產品工程化設定，非古籍依據，僅供趨避參考')}
          </p>
        </header>

        <form onSubmit={handleSubmit} className="hw-narrow">
          <div className="hw-c-box">
            <h2 className="hw-c-secTitle">{H('填寫出生資訊')}</h2>
            <div className="grid grid-cols-3 gap-2 mb-2">
              <div>
                <label className="hw-f">{H('年')}</label>
                <input type="number" required placeholder="1990" className="hw-c-input"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: e.target.value })} />
              </div>
              <div>
                <label className="hw-f">{H('月')}</label>
                <input type="number" required min={1} max={12} placeholder="5" className="hw-c-input"
                  value={formData.month}
                  onChange={(e) => setFormData({ ...formData, month: e.target.value })} />
              </div>
              <div>
                <label className="hw-f">{H('日')}</label>
                <input type="number" required min={1} max={31} placeholder="8" className="hw-c-input"
                  value={formData.day}
                  onChange={(e) => setFormData({ ...formData, day: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="hw-f">{H('時')}</label>
                <input type="number" required min={0} max={23} placeholder="16" className="hw-c-input"
                  value={formData.hour}
                  onChange={(e) => setFormData({ ...formData, hour: e.target.value })} />
              </div>
              <div>
                <label className="hw-f">{H('分')}</label>
                <input type="number" min={0} max={59} placeholder="30" className="hw-c-input"
                  value={formData.minute}
                  onChange={(e) => setFormData({ ...formData, minute: e.target.value })} />
              </div>
              <div>
                <label className="hw-f">{H('性別')}</label>
                <select className="hw-c-input"
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: parseInt(e.target.value) as 1 | 0 })}
                >
                  <option value={1}>{H('男')}</option>
                  <option value={0}>{H('女')}</option>
                </select>
              </div>
            </div>
            <div className="mt-2">
              <BirthPlacePicker value={birth} onChange={setBirth} accent="sky" locale="zh-Hant" />
            </div>
            <div className="mt-3">
              <label className="hw-f">{H('現居城市（可選，評估當前居住地的影響）')}</label>
              <CurrentCitySelect
                value={formData.currentCityId}
                onChange={(id) => setFormData({ ...formData, currentCityId: id })}
              />
            </div>
            <p className="mt-4 text-center">
              <button type="submit" disabled={loading} className="hw-c-btnBig">
                {loading ? H('方位解析中...（通常 30 秒內）') : H('開始城市解析')}
              </button>
            </p>
            {error && <p className="hw-c-err text-center">{error}</p>}
          </div>
          <p className="hw-alert hw-alert--note text-center">{H('結果僅供參考，福地福人居，個人努力為本')}</p>
        </form>

        {data && (
          <div className="mt-10">
            {saved === true ? (
              <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2 mb-4">
                {H('✓ 報告已保存到你的帳戶，可在「我的報告」中隨時回看')}
              </p>
            ) : saved === false ? (
              <p className="text-xs text-ink-light bg-paper-dark/30 border border-gold/15 rounded px-3 py-2 mb-4">
                {H('登入後生成結果可保存到「我的報告」，隨時回看')}
              </p>
            ) : null}
            {/* 重新生成入口只在 ResultView 內出現（規則版 + 已付費），避免免費試讀也顯示 */}
            <GeoResultView
              data={data}
              reportId={reportId}
              onRegen={isReportPaid('geo', data) ? () => runGenerate({ regen: true }) : undefined}
              regenBusy={loading}
              locale="zh-Hant"
            />
          </div>
        )}
      </main>
    </div>
  )
}
