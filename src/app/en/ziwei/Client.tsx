'use client'

import { useState } from 'react'
import Link from 'next/link'
import BirthPlacePicker from '@/components/BirthPlacePicker'
import type { BirthPlaceValue } from '@/components/BirthPlacePicker'
import type { ZiweiResultData } from '@/components/reports/ZiweiResultView'
import { EnZiweiRules } from '@/components/en/EnRuleTables'
import { getAuthToken } from '@/lib/authToken'

const TITLES: Record<string, string> = {
  overview: 'Chart overview',
  personality: 'Temperament',
  palaces: 'Twelve palaces',
  career: 'Career structure',
  wealth: 'Wealth',
  marriage: 'Relationships',
  health: 'Health tendencies',
  transforms: 'Four Transformations',
  patterns: 'Patterns',
  decadal: 'Decade',
  yearly: 'Annual and monthly',
  advice: 'Practical advice',
}

function AiSections({ data }: { data: ZiweiResultData }) {
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
          Unlock the full English Zi Wei report
        </Link>
      </div>
    )
  }
  return (
    <div className="hw-c-box">
      <p className="hw-c-body">
        The English report is not available for this run. The rule-engine palace tables above are
        still in English; please try again later to load the in-depth AI reading.
      </p>
    </div>
  )
}

export default function EnZiweiClient() {
  const [formData, setFormData] = useState({
    year: '', month: '', day: '', hour: '', minute: '', gender: 1 as 1 | 0,
  })
  const [birth, setBirth] = useState<BirthPlaceValue>({ mode: 'none' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState<ZiweiResultData | null>(null)
  const [saved, setSaved] = useState<boolean | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await runGenerate()
  }

  const runGenerate = async () => {
    setLoading(true)
    setError('')
    setSaved(null)
    try {
      const token = await getAuthToken()
      const res = await fetch('/api/ziwei', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          year: parseInt(formData.year),
          month: parseInt(formData.month),
          day: parseInt(formData.day),
          hour: parseInt(formData.hour),
          minute: formData.minute === '' ? 0 : parseInt(formData.minute),
          locale: 'en',
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
        setData(json.data as ZiweiResultData)
        setSaved(!!json.reportId)
      } else {
        setError('Could not build the Zi Wei chart. Please try again.')
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
          <h1 className="hw-c-h1">Zi Wei Dou Shu</h1>
          <p className="hw-lede">Fourteen major stars · Four Transformations · twelve-palace reading</p>
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
              <BirthPlacePicker value={birth} onChange={setBirth} accent="purple" locale="en" />
            </div>
            <p className="mt-4 text-center">
              <button type="submit" disabled={loading} className="hw-c-btnBig">
                {loading ? 'Building the chart…' : 'Start the Zi Wei reading'}
              </button>
            </p>
            {error && <p className="hw-c-err text-center">{error}</p>}
          </div>
          <p className="hw-alert hw-alert--note text-center">Zi Wei Dou Shu uses the lunar birth hour; results are for reference.</p>
          <p className="hw-note text-center">If your birth city is not listed, choose the manual time-zone option.</p>
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
            <EnZiweiRules chart={data.chart} analysis={data.analysis} />
            <div className="mt-6">
              <AiSections data={data} />
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
