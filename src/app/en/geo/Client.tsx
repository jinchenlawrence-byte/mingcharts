'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import BirthPlacePicker from '@/components/BirthPlacePicker'
import type { BirthPlaceValue } from '@/components/BirthPlacePicker'
import type { GeoResultData } from '@/components/reports/GeoResultView'
import { EnGeoRules } from '@/components/en/EnRuleTables'
import { loadWorldData, searchCities } from '@/lib/worldCitiesClient'
import { getAuthToken } from '@/lib/authToken'

const TITLES: Record<string, string> = {
  overview: 'Directional overview',
  currentCity: 'Current city impact',
  wealth: 'Wealth city',
  career: 'Career city',
  patron: 'Benefactor city',
  home: 'Settling city',
  talent: 'Talent city',
  advice: 'Relocation advice',
}

function CurrentCitySelect({ value, onChange }: { value: string; onChange: (id: string) => void }) {
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
        <button type="button" className="text-ink-light/40 hover:text-red-500" onClick={() => { onChange(''); setQuery(''); setSelectedLabel('') }}>✕</button>
      </div>
    )
  }

  return (
    <div className="relative">
      <input
        className="hw-c-input"
        placeholder="Search a city (English or local name, global city database)"
        value={query}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onChange={(e) => { onInput(e.target.value); setOpen(true) }}
      />
      {open && hits.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full max-h-64 overflow-auto bg-white border border-gold/15 rounded-[14px] shadow-lg text-sm">
          {hits.map(h => (
            <li key={h.id} className="px-3 py-2 cursor-pointer hover:bg-gold/5"
              onMouseDown={() => { onChange(h.id); setSelectedLabel(h.label); setQuery(''); setHits([]); setOpen(false) }}>
              {h.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function AiSections({ data }: { data: GeoResultData }) {
  if (data.ai) {
    const entries = Object.entries(data.ai).filter(([, v]) => typeof v === 'string')
    return (
      <div className="space-y-4">
        {entries.map(([key, text]) => (
          <article key={key} className="hw-c-box">
            <h3 className="hw-c-secTitle">{TITLES[key] ?? key}</h3>
            <p className="hw-c-body whitespace-pre-line">{text}</p>
          </article>
        ))}
      </div>
    )
  }
  if (data.locked?.preview) {
    return (
      <div className="hw-c-box text-center">
        <p className="hw-c-body">{data.locked.preview}</p>
        <Link href="/en/pricing" className="hw-c-btnBig inline-block mt-4">
          Unlock the full English city report
        </Link>
      </div>
    )
  }
  return (
    <div className="hw-c-box">
      <p className="hw-c-body">
        The English report is not available for this run. The rule-engine city tables above are still
        in English; please try again later to load the in-depth AI reading.
      </p>
    </div>
  )
}

export default function EnGeoClient() {
  const [formData, setFormData] = useState({
    year: '', month: '', day: '', hour: '', minute: '', gender: 1 as 1 | 0,
    currentCityId: '',
  })
  const [birth, setBirth] = useState<BirthPlaceValue>({ mode: 'none' })
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<GeoResultData | null>(null)
  const [saved, setSaved] = useState<boolean | null>(null)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await runGenerate()
  }

  const runGenerate = async () => {
    setLoading(true); setError(''); setSaved(null)
    try {
      const token = await getAuthToken()
      const res = await fetch('/api/geo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year: parseInt(formData.year),
          month: parseInt(formData.month),
          day: parseInt(formData.day),
          hour: parseInt(formData.hour),
          minute: formData.minute === '' ? 0 : parseInt(formData.minute),
          gender: formData.gender,
          locale: 'en',
          ...(formData.currentCityId ? { currentCityId: formData.currentCityId } : {}),
          ...(birth.mode === 'city'
            ? { birthCityId: birth.cityId }
            : birth.mode === 'zone'
              ? { birthZone: birth.zone, birthLng: birth.lng }
              : {}),
          ...(token ? { token } : {}),
        }),
      })
      const json = await res.json()
      if (json.success) {
        setData(json.data as GeoResultData)
        setSaved(!!json.reportId)
      } else {
        setError('Could not analyse the cities. Please try again.')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="hw-page">
      <main className="hw-wrap hw-c-pg">
        <Link href="/en" className="hw-c-back">‹ Home</Link>
        <header>
          <h1 className="hw-c-h1">Location &amp; Direction · city directions</h1>
          <p className="hw-lede">Wealth, career, benefactor and talent cities, read by the Five Elements of direction relative to your birthplace.</p>
          <p className="hw-note">
            Directional Five Elements are calculated from the city's bearing relative to the birthplace.
            City qi is a product convention, not a classical rule; both are for reference only.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="hw-narrow">
          <div className="hw-c-box">
            <h2 className="hw-c-secTitle">Birth details</h2>
            <div className="grid grid-cols-3 gap-2 mb-2">
              <div><label className="hw-f">Year</label><input type="number" required placeholder="1990" className="hw-c-input" value={formData.year} onChange={(e) => setFormData({ ...formData, year: e.target.value })} /></div>
              <div><label className="hw-f">Month</label><input type="number" required min={1} max={12} placeholder="5" className="hw-c-input" value={formData.month} onChange={(e) => setFormData({ ...formData, month: e.target.value })} /></div>
              <div><label className="hw-f">Day</label><input type="number" required min={1} max={31} placeholder="8" className="hw-c-input" value={formData.day} onChange={(e) => setFormData({ ...formData, day: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div><label className="hw-f">Hour</label><input type="number" required min={0} max={23} placeholder="16" className="hw-c-input" value={formData.hour} onChange={(e) => setFormData({ ...formData, hour: e.target.value })} /></div>
              <div><label className="hw-f">Minute</label><input type="number" min={0} max={59} placeholder="30" className="hw-c-input" value={formData.minute} onChange={(e) => setFormData({ ...formData, minute: e.target.value })} /></div>
              <div>
                <label className="hw-f">Gender</label>
                <select className="hw-c-input" value={formData.gender} onChange={(e) => setFormData({ ...formData, gender: parseInt(e.target.value) as 1 | 0 })}>
                  <option value={1}>Male</option>
                  <option value={0}>Female</option>
                </select>
              </div>
            </div>
            <div className="mt-2">
              <BirthPlacePicker value={birth} onChange={setBirth} accent="sky" locale="en" />
            </div>
            <div className="mt-3">
              <label className="hw-f">Current city (optional; assesses the current residence)</label>
              <CurrentCitySelect value={formData.currentCityId} onChange={(id) => setFormData({ ...formData, currentCityId: id })} />
            </div>
            <p className="mt-4 text-center">
              <button type="submit" disabled={loading} className="hw-c-btnBig">
                {loading ? 'Analysing directions…' : 'Start the city reading'}
              </button>
            </p>
            {error && <p className="hw-c-err text-center">{error}</p>}
          </div>
          <p className="hw-alert hw-alert--note text-center">For reference only; personal effort matters most.</p>
        </form>

        {data && (
          <div className="mt-10">
            {saved === true ? (
              <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2 mb-4">
                ✓ Saved to your account. You can reopen it under My Reports.
              </p>
            ) : saved === false ? (
              <p className="text-xs text-ink-light/60 bg-paper-dark/30 border border-gold/15 rounded px-3 py-2 mb-4">
                Sign in to save this report and reopen it under My Reports.
              </p>
            ) : null}
            {((data as { aiSource?: string } | null)?.aiSource !== 'AI 深度解读') && (
<div className="flex flex-wrap items-center justify-center gap-3 mb-6">
              <button
                type="button"
                onClick={() => runGenerate()}
                disabled={loading}
                className="px-5 py-2 rounded-full border border-gold/15 bg-white text-sm font-medium hover:border-ink transition disabled:opacity-50"
              >
                Regenerate this report
              </button>
            </div>
            )}
            <EnGeoRules geo={data.geo} />
            <div className="mt-6">
              <AiSections data={data} />
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
