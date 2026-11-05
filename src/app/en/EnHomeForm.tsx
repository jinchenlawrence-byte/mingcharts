'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import BirthPlacePicker from '@/components/BirthPlacePicker'
import type { BirthPlaceValue } from '@/components/BirthPlacePicker'

const YEARS = Array.from({ length: 2026 - 1930 + 1 }, (_, i) => 1930 + i)
const OPTS = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i)

export default function EnHomeForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [birth, setBirth] = useState<BirthPlaceValue>({ mode: 'none' })
  const [form, setForm] = useState({ year: '2000', month: '1', day: '1', hour: '0', minute: '0', gender: 1 as 1 | 0 })

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/paipan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          year: parseInt(form.year), month: parseInt(form.month), day: parseInt(form.day),
          hour: parseInt(form.hour), minute: parseInt(form.minute),
          locale: 'en',
          ...(birth.mode === 'city'
            ? { birthCityId: birth.cityId }
            : birth.mode === 'zone'
              ? { birthZone: birth.zone, birthLng: birth.lng }
              : {}),
        }),
      })
      const data = await res.json()
      if (data.success) {
        localStorage.setItem('currentChart', JSON.stringify(data.data))
        router.push('/en/chart')
      } else {
        setError(data.error || 'Chart failed')
      }
    } catch {
      setError('Network error, please retry')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="hw-form" autoComplete="off">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {([['year', 'Year', YEARS], ['month', 'Month', OPTS(1, 12)], ['day', 'Day', OPTS(1, 31)], ['hour', 'Hour', OPTS(0, 23)], ['minute', 'Minute', OPTS(0, 59)]] as const).map(([k, label, opts]) => (
          <div key={k}>
            <label className="hw-f" htmlFor={`en-${k}`}>{label}</label>
            <select id={`en-${k}`} className="hw-sel" value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })}>
              {opts.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        ))}
      </div>
      <div className="hw-seg mt-3" role="radiogroup" aria-label="Gender">
        <label className="hw-segLabel"><input type="radio" checked={form.gender === 1} onChange={() => setForm({ ...form, gender: 1 })} /><span>Male</span></label>
        <label className="hw-segLabel"><input type="radio" checked={form.gender === 0} onChange={() => setForm({ ...form, gender: 0 })} /><span>Female</span></label>
      </div>
      <div className="mt-3">
        <BirthPlacePicker value={birth} onChange={setBirth} locale="en" />
      </div>
      <button type="submit" disabled={loading} className="mt-4 w-full rounded-full bg-hw-water py-4 text-lg font-bold text-white transition hover:brightness-110 disabled:opacity-60">
        {loading ? 'Casting…' : 'Cast my Bazi chart'}
      </button>
      {error && <p className="mt-2 text-center text-sm text-danger-ink">{error}</p>}
      <p className="hw-alert hw-alert--note">True Solar Time correction applied when a birth place is given.</p>
    </form>
  )
}
