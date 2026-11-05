'use client'

import { GENUINE_AI_SOURCE } from '@/lib/reportGate'
import { useState } from 'react'
import Link from 'next/link'
import BirthPlacePicker from '@/components/BirthPlacePicker'
import type { BirthPlaceValue } from '@/components/BirthPlacePicker'
import type { HemunData } from '@/components/reports/HemunResultView'
import type { PaipanResult } from '@/lib/paipan'
import { EnHemunRules } from '@/components/en/EnRuleTables'
import { getAuthToken } from '@/lib/authToken'

type HemunDataEn = HemunData & { male?: PaipanResult; female?: PaipanResult }

const TITLES: Record<string, string> = {
  overview: 'Overview',
  shengxiao: 'Zodiac year pillars',
  rizhu: 'Day-pillar spouse palace',
  ouxing: 'Spouse star and attachment pattern',
  wuxing: 'Five Element support',
  advice: 'Practical advice',
}

interface BirthFormState {
  year: string; month: string; day: string
  hour: string; minute: string; gender: 1 | 0
  birth: BirthPlaceValue
}

const MALE_DEFAULT: BirthFormState = {
  year: '', month: '', day: '', hour: '', minute: '', gender: 1,
  birth: { mode: 'none' },
}
const FEMALE_DEFAULT: BirthFormState = {
  year: '', month: '', day: '', hour: '', minute: '', gender: 0,
  birth: { mode: 'none' },
}

function personPayload(p: BirthFormState) {
  const base = { year: p.year, month: p.month, day: p.day, hour: p.hour, minute: p.minute, gender: p.gender }
  if (p.birth.mode === 'city') return { ...base, birthCityId: p.birth.cityId }
  if (p.birth.mode === 'zone') return { ...base, birthZone: p.birth.zone, birthLng: p.birth.lng }
  return base
}

function PersonFields({ title, value, onChange, accent }: {
  title: string
  value: BirthFormState
  onChange: (v: BirthFormState) => void
  accent: 'blue' | 'rose'
}) {
  const set = (patch: Partial<BirthFormState>) => onChange({ ...value, ...patch })
  const titleCls = accent === 'blue' ? 'text-hw-water' : 'text-hw-fire-ink'
  return (
    <div className="hw-c-box">
      <h3 className={`font-semibold mb-3 ${titleCls}`}>{title}</h3>
      <div className="grid grid-cols-3 gap-2 mb-2">
        <div><label className="hw-f">Year</label><input type="number" required placeholder="1990" className="hw-c-input" value={value.year} onChange={e => set({ year: e.target.value })} /></div>
        <div><label className="hw-f">Month</label><input type="number" required min={1} max={12} placeholder="5" className="hw-c-input" value={value.month} onChange={e => set({ month: e.target.value })} /></div>
        <div><label className="hw-f">Day</label><input type="number" required min={1} max={31} placeholder="8" className="hw-c-input" value={value.day} onChange={e => set({ day: e.target.value })} /></div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div><label className="hw-f">Hour</label><input type="number" required min={0} max={23} placeholder="16" className="hw-c-input" value={value.hour} onChange={e => set({ hour: e.target.value })} /></div>
        <div><label className="hw-f">Minute</label><input type="number" min={0} max={59} placeholder="30" className="hw-c-input" value={value.minute} onChange={e => set({ minute: e.target.value })} /></div>
        <div>
          <label className="hw-f">Gender</label>
          <select className="hw-c-input" value={value.gender} onChange={e => set({ gender: parseInt(e.target.value) as 1 | 0 })}>
            <option value={1}>Male</option>
            <option value={0}>Female</option>
          </select>
        </div>
      </div>
      <div className="mt-2">
        <BirthPlacePicker value={value.birth} onChange={(b) => set({ birth: b })} accent={accent} locale="en" />
      </div>
    </div>
  )
}

function AiSections({ data }: { data: HemunData }) {
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
          Unlock the full English synastry report
        </Link>
      </div>
    )
  }
  return (
    <div className="hw-c-box">
      <p className="hw-c-body">
        The English report is not available for this run. The rule-engine synastry tables above are
        still in English; please try again later to load the in-depth AI reading.
      </p>
    </div>
  )
}

export default function EnHemunClient() {
  const [male, setMale] = useState<BirthFormState>(MALE_DEFAULT)
  const [female, setFemale] = useState<BirthFormState>(FEMALE_DEFAULT)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState<HemunDataEn | null>(null)
  const [saved, setSaved] = useState<boolean | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setData(null)
    await runGenerate()
  }

  const runGenerate = async () => {
    setLoading(true); setError(''); setSaved(null)
    try {
      const token = await getAuthToken()
      const res = await fetch('/api/hemun', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          male: personPayload(male),
          female: personPayload(female),
          locale: 'en',
          ...(token ? { token } : {}),
        }),
      })
      const json = await res.json()
      if (json.success) {
        setData(json.data as HemunDataEn)
        setSaved(!!json.reportId)
      } else {
        setError('Could not generate the synastry report. Please try again.')
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
          <h1 className="hw-c-h1">Bazi Synastry</h1>
          <p className="hw-lede">
            Enter both birth details. The day-pillar spouse palace is the core, read together with the
            zodiac year pillars, spouse stars, Five Elements support, Ten Gods and Luck Pillar rhythm.
          </p>
        </header>

        <form onSubmit={handleSubmit}>
          <div className="hw-c-two mb-4">
            <PersonFields title="Male chart" value={male} onChange={setMale} accent="blue" />
            <PersonFields title="Female chart" value={female} onChange={setFemale} accent="rose" />
          </div>
          <p className="text-center">
            <button type="submit" disabled={loading} className="hw-c-btnBig">
              {loading ? 'Analysing…' : 'Start the synastry reading'}
            </button>
          </p>
          {error && <p className="hw-c-err text-center">{error}</p>}
          <p className="hw-alert hw-alert--note text-center">For reference and entertainment only; relationships are shaped by the people involved.</p>
        </form>

        {data && (
          <div className="mt-10">
            {saved === true ? (
              <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2 mb-4">
                ✓ Saved to your account. You can reopen it under My Reports.
              </p>
            ) : saved === false ? (
              <p className="text-xs text-ink-light bg-paper-dark/30 border border-gold/15 rounded px-3 py-2 mb-4">
                Sign in to save this report and reopen it under My Reports.
              </p>
            ) : null}
            {((data as { aiSource?: string } | null)?.aiSource !== GENUINE_AI_SOURCE) && (
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
            <EnHemunRules male={data.male} female={data.female} />
            <div className="mt-6">
              <AiSections data={data} />
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
