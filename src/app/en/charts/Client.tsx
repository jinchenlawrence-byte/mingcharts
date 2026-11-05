'use client'

// Saved chart list, English edition. Same logic as /charts and /tw/charts:
// supabase session -> charts table -> /api/unlock on review -> /en/chart.
// Everything shown here is English; stem-branch strings are converted to pinyin.
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getSupabase } from '@/lib/supabase'
import { ganZhiEn, STEM_ELEMENT, stemEn } from '@/lib/enTerms'

interface ChartRow {
  id: string
  gender: number
  birth_year: number
  birth_month: number
  birth_day: number
  birth_hour: number
  birth_minute: number
  birth_place: string | null
  chart_data: {
    lunarDate: string
    dayMaster: string
    pillars: {
      year: { ganZhi: string }
      month: { ganZhi: string }
      day: { ganZhi: string }
      hour: { ganZhi: string }
    }
  }
  created_at: string
}

/** Hide place names typed in Chinese so the English page stays free of CJK. */
function latinPlace(place: string | null): string {
  if (!place) return ''
  return /[\u4e00-\u9fff]/.test(place) ? '' : place
}

export default function EnChartsClient() {
  const router = useRouter()
  const [rows, setRows] = useState<ChartRow[]>([])
  const [loading, setLoading] = useState(true)
  const [notLogged, setNotLogged] = useState(false)
  const [error, setError] = useState('')
  const [viewingId, setViewingId] = useState<string | null>(null)
  const [limit, setLimit] = useState<number | null>(null)

  useEffect(() => {
    (async () => {
      const supabase = getSupabase()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setNotLogged(true)
        setLoading(false)
        return
      }
      const { data, error } = await supabase
        .from('charts')
        .select('*')
        .order('created_at', { ascending: false })
      if (!error && data) setRows(data as ChartRow[])
      try {
        const res = await fetch(`/api/member/summary?token=${encodeURIComponent(session.access_token)}`)
        const out = await res.json().catch(() => null)
        if (out?.success && out?.data?.multiChart) setLimit(out.data.multiChart.limit)
      } catch {
        // a failed limit lookup never blocks the list
      }
      setLoading(false)
    })()
  }, [])

  const handleView = async (row: ChartRow) => {
    let data = row.chart_data as Record<string, unknown>
    setViewingId(row.id)
    try {
      if (row?.id && data?.input && data?.pillars) {
        const supabase = getSupabase()
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          const res = await fetch('/api/unlock', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: session.access_token, chart: data, locale: 'en' }),
          })
          const out = await res.json().catch(() => null)
          if (res.ok && out?.success && out?.data?.chartData) {
            data = out.data.chartData
          }
        }
      }
    } catch {
      // if unlock prefetch fails, show the stored chart unchanged
    }
    setViewingId(null)
    localStorage.setItem('currentChart', JSON.stringify(data))
    router.push('/en/chart')
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this chart?')) return
    const { error } = await getSupabase().from('charts').delete().eq('id', id)
    if (error) {
      setError('Delete failed: ' + error.message)
      return
    }
    setRows(rows.filter((r) => r.id !== id))
    setError('')
  }

  if (loading) {
    return (
      <div className="hw-wrap hw-c-pg flex items-center justify-center">
        <p className="text-ink/60">Loading...</p>
      </div>
    )
  }

  if (notLogged) {
    return (
      <div className="hw-wrap hw-c-pg">
        <div className="hw-narrow text-center">
          <div className="hw-c-box">
            <p className="hw-c-dx text-center">Please sign in to see your saved charts.</p>
            <p>
              <button onClick={() => router.push('/en/auth')} className="hw-c-btnBig">
                Sign in
              </button>
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="hw-wrap hw-c-pg">
      <div className="hw-narrow">
        {error && <p className="hw-c-err">{error}</p>}
        <nav className="hw-c-back mb-3">
          <Link href="/en">← Back to home</Link>
        </nav>
        <div className="flex items-center justify-between mb-6">
          <h1 className="hw-c-h1">My charts</h1>
          <button
            onClick={() => router.push('/en')}
            className="bg-ink text-white px-4 py-2 rounded-full text-sm font-semibold hover:opacity-85 transition"
          >
            + New chart
          </button>
        </div>

        {limit !== null && (
          <p className="text-xs text-ink-light/60 -mt-3 mb-4">
            Saved {rows.length}/{limit} charts
            {rows.length >= limit && (
              <>
                {' — limit reached, '}
                <Link href="/en/pricing" className="text-hw-water hover:underline">
                  upgrade
                </Link>
                {' to save more'}
              </>
            )}
          </p>
        )}

        {rows.length === 0 ? (
          <div className="hw-c-box text-center text-ink-light/60">
            No saved charts yet. Cast one and it will appear here.
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((row) => {
              const dayMaster = row.chart_data?.dayMaster ?? ''
              const stem = stemEn(dayMaster.slice(0, 1))
              return (
                <div key={row.id} className="hw-c-box p-4! flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">
                      {row.birth_year}-{String(row.birth_month).padStart(2, '0')}-
                      {String(row.birth_day).padStart(2, '0')} {String(row.birth_hour).padStart(2, '0')}:
                      {String(row.birth_minute).padStart(2, '0')}
                      {row.gender === 1 ? ' Male' : ' Female'}
                      {latinPlace(row.birth_place) && (
                        <span className="text-sm text-ink-light/40 ml-2">{latinPlace(row.birth_place)}</span>
                      )}
                    </p>
                    <p className="text-sm text-ink-light mt-1 tracking-wider">
                      {row.chart_data?.pillars
                        ? [row.chart_data.pillars.year, row.chart_data.pillars.month, row.chart_data.pillars.day, row.chart_data.pillars.hour]
                            .map((p) => ganZhiEn(p.ganZhi))
                            .join('  ')
                        : ''}
                      {stem && (
                        <span className="text-ink-light/40 ml-2">
                          Day Master {stem}
                          {STEM_ELEMENT[dayMaster.slice(0, 1)] ? ` ${STEM_ELEMENT[dayMaster.slice(0, 1)]}` : ''}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex gap-3 shrink-0 text-sm">
                    <button
                      onClick={() => handleView(row)}
                      disabled={viewingId !== null}
                      className="font-medium hover:underline underline-offset-3 disabled:opacity-50"
                    >
                      {viewingId === row.id ? 'Unlocking...' : 'View'}
                    </button>
                    <button onClick={() => handleDelete(row.id)} className="text-red-400 hover:text-red-600">
                      Delete
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
