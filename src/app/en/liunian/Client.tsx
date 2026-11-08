'use client'

import { GENUINE_AI_SOURCE } from '@/lib/reportGate'
import { isReportPaid } from '@/lib/reportAccess'
import { useState } from 'react'
import Link from 'next/link'
import BirthPlacePicker from '@/components/BirthPlacePicker'
import type { BirthPlaceValue } from '@/components/BirthPlacePicker'
import type { LiunianResultData } from '@/components/reports/LiunianResultView'
import { EnLiunianRules } from '@/components/en/EnRuleTables'
import AskPanel from '@/components/AskPanel'
import { liunianAskChart } from '@/lib/askChart'
import { getAuthToken } from '@/lib/authToken'

const TITLES: Record<string, string> = {
  annualOverview: 'Annual overview',
  careerFlow: 'Career',
  wealthFlow: 'Wealth',
  loveFlow: 'Relationships',
  healthFlow: 'Health',
  monthFlow: 'Monthly rhythm',
}

function yearOptions() {
  const y = new Date().getFullYear()
  return [
    { year: y, label: `${y} · This year` },
    { year: y + 1, label: `${y + 1} · Next year` },
    { year: y + 2, label: `${y + 2} · The year after` },
  ]
}

function AiSections({ data }: { data: LiunianResultData }) {
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
          Unlock the full English annual report
        </Link>
      </div>
    )
  }
  return (
    <div className="hw-c-box">
      <p className="hw-c-body">
        The English annual reading is not available for this run. The rule-engine annual and monthly
        tables above are still in English; please try again later.
      </p>
    </div>
  )
}

export default function EnLiunianClient() {
  const options = yearOptions()
  const [formData, setFormData] = useState({
    year: '', month: '', day: '', hour: '', minute: '', gender: 1 as 1 | 0,
  })
  const [birth, setBirth] = useState<BirthPlaceValue>({ mode: 'none' })
  const [targetYear, setTargetYear] = useState<number>(new Date().getFullYear())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState<LiunianResultData | null>(null)
  // Follow-ups use the same chart plus the full luck cycles (daYun) the report was built from.
  const askChart = data ? liunianAskChart(data) : null
  const [saved, setSaved] = useState<boolean | null>(null)
  /** Report id of this generation (used by the server to verify ownership). */
  const [reportId, setReportId] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await runGenerate(false)
  }

  const runGenerate = async (force: boolean) => {
    setLoading(true)
    setError('')
    setSaved(null)
    setReportId(null)
    try {
      const token = await getAuthToken()
      const res = await fetch('/api/liunian', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year: parseInt(formData.year),
          month: parseInt(formData.month),
          day: parseInt(formData.day),
          hour: parseInt(formData.hour),
          minute: formData.minute === '' ? 0 : parseInt(formData.minute),
          gender: formData.gender,
          targetYear,
          locale: 'en',
          ...(force ? { force: true } : {}),
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
        setData(json.data as LiunianResultData)
        setSaved(!!json.reportId)
        setReportId(typeof json.reportId === 'string' ? json.reportId : null)
      } else {
        setError('Could not generate the annual report. Please try again.')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="hw-page hw-report-theme">
      <main className="hw-wrap hw-c-pg">
        <Link href="/en" className="hw-c-back">‹ Home</Link>
        <header>
          <h1 className="hw-c-h1">Annual Report · Annual Pillars</h1>
          <p className="hw-lede">
            The Annual Pillar stem-branch, Ten Gods and their relation to the natal chart, read across
            career, wealth, relationships and health.
          </p>
          <p className="hw-note">
            The Annual Pillar facts are calculated by the rule engine; the AI writes the interpretation.
            Tendency-based reference, not a deterministic conclusion.
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
              <BirthPlacePicker value={birth} onChange={setBirth} accent="rose" locale="en" />
            </div>
            <div className="mt-3">
              <label className="hw-f">Target year</label>
              <select className="hw-c-input" value={targetYear} onChange={(e) => setTargetYear(parseInt(e.target.value))}>
                {options.map((o) => <option key={o.year} value={o.year}>{o.label}</option>)}
              </select>
            </div>
            <p className="mt-4 text-center">
              <button type="submit" disabled={loading} className="hw-c-btnBig">
                {loading ? 'Generating the report…' : 'Start the annual reading'}
              </button>
            </p>
            {error && <p className="hw-c-err text-center">{error}</p>}
          </div>
          <p className="hw-alert hw-alert--note text-center">For reference and entertainment only. Not a basis for any major decision.</p>
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
            {((data as { aiSource?: string } | null)?.aiSource !== GENUINE_AI_SOURCE) && isReportPaid('annual', data) && (
<div className="flex flex-wrap items-center justify-center gap-3 mb-6">
              <button
                type="button"
                onClick={() => runGenerate(true)}
                disabled={loading}
                className="px-5 py-2 rounded-full border border-gold/15 bg-white text-sm font-medium hover:border-ink transition disabled:opacity-50"
              >
                Regenerate this report
              </button>
            </div>
            )}
            <EnLiunianRules
              favorable={data.favorable}
              unfavorable={data.unfavorable}
              curDaYun={data.curDaYun ?? null}
              liuNian={data.liuNian}
              liuYue={data.liuYue ?? null}
              previewOnly={!!data.locked}
              targetYear={data.targetYear}
            />
            {/* Readable line width for the AI body (2026-11-06): same 30rem cap as the shared ResultView; the rule table stays full width. */}
            <div className="mt-6 hw-c-read">
              <AiSections data={data} />
            </div>
            {/* AI follow-ups: same entry and placement as the chart result page */}
            <AskPanel
              chart={askChart}
              locale="en"
              reportId={reportId}
              reportPaid={isReportPaid('annual', data)}
              unlockSku="annual_report"
              hint="Ask about this year's career, wealth, relationships, health, or the monthly rhythm. Make specific decisions with real-world context and professional advice."
            />
          </div>
        )}
      </main>
    </div>
  )
}
