'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase'
import { kindLabelEn, isLegacyChineseReport, LEGACY_BADGE_EN } from '@/lib/enReportLabels'

interface ReportRow {
  id: string
  kind: string
  title: string
  created_at: string
  result?: unknown
}

const MODULE_HREF: Record<string, string> = {
  hemun: '/en/hemun',
  ziwei: '/en/ziwei',
  geo: '/en/geo',
  annual: '/en/liunian',
  fatebook: '/en/chart',
}

// English report list and English report detail route.
export default function EnReportsPage() {
  const router = useRouter()
  const [rows, setRows] = useState<ReportRow[]>([])
  const [legacyMap, setLegacyMap] = useState<Record<string, boolean>>({})
  const [chartPayloads, setChartPayloads] = useState<Record<string, unknown>>({})
  const [loading, setLoading] = useState(true)
  const [notLogged, setNotLogged] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    ;(async () => {
      const supabase = getSupabase()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setNotLogged(true); setLoading(false); return }
      const { data } = await supabase
        .from('reports')
        .select('id,kind,title,created_at,result')
        .eq('status', 'ready')
        .is('request_id', null)
        .order('created_at', { ascending: false })
      if (data) {
        const list = data as ReportRow[]
        setRows(list)
        const map: Record<string, boolean> = {}
        const pendingCharts: Array<{ reportId: string; chartId: string }> = []
        for (const row of list) {
          map[row.id] = isLegacyChineseReport(row.result)
          if (row.kind === 'fatebook') {
            const chartId = (row.result as { chart_id?: unknown } | undefined)?.chart_id
            if (typeof chartId === 'string') pendingCharts.push({ reportId: row.id, chartId })
          }
        }
        setLegacyMap(map)
        // Fate Books keep their body on the chart row (chart_data.analysis.paid), not in result.
        if (pendingCharts.length) {
          const { data: charts } = await supabase
            .from('charts')
            .select('id,chart_data')
            .in('id', pendingCharts.map((p) => p.chartId))
          const rowsWithCharts = charts as unknown as Array<{
            id: string
            chart_data?: { analysis?: { paid?: unknown } }
          }> | null
          const paidByChart = new Map<string, unknown>()
          const payloadByChart = new Map<string, unknown>()
          for (const chart of rowsWithCharts ?? []) {
            paidByChart.set(chart.id, chart.chart_data?.analysis?.paid)
            if (chart.chart_data) payloadByChart.set(chart.id, chart.chart_data)
          }
          const update: Record<string, boolean> = {}
          const payloadUpdate: Record<string, unknown> = {}
          for (const p of pendingCharts) {
            const paid = paidByChart.get(p.chartId)
            if (paid && typeof paid === 'object') {
              update[p.reportId] = isLegacyChineseReport({ ai: paid })
            }
            const payload = payloadByChart.get(p.chartId)
            if (payload) payloadUpdate[p.reportId] = payload
          }
          if (Object.keys(update).length) setLegacyMap((prev) => ({ ...prev, ...update }))
          if (Object.keys(payloadUpdate).length) setChartPayloads(payloadUpdate)
        }
      }
      setLoading(false)
    })()
  }, [])

  // /en/chart replays the chart from localStorage, so a Fate Book row must seed it first.
  /**
   * Delete a saved report.
   * Added 2026-11-05: the English "My reports" page had no delete entry while the
   * Simplified and Traditional pages did - the three trees should match.
   * Row ownership is enforced by Supabase RLS on reports; this page never sends
   * user_id and should not start doing so.
   */
  const handleDelete = async (id: string) => {
    if (!confirm('Delete this report? This cannot be undone.')) return
    const { error: delError } = await getSupabase().from('reports').delete().eq('id', id)
    if (delError) {
      setError('Delete failed: ' + delError.message)
      return
    }
    setRows((prev) => prev.filter((r) => r.id !== id))
    setError('')
  }


  return (
    <div className="hw-wrap hw-c-pg">
      <Link href="/en" className="hw-c-back">‹ Home</Link>
      <h1 className="hw-c-h1">My reports</h1>

      {loading ? (
        <p className="hw-c-meta">Loading your reports…</p>
      ) : notLogged ? (
        <div className="hw-c-box text-center">
          <p className="hw-c-body">Sign in to see your saved reports.</p>
          <Link href="/en/auth" className="hw-c-btnBig inline-block mt-4">Sign in</Link>
        </div>
      ) : rows.length === 0 ? (
        <div className="hw-c-box text-center">
          <p className="hw-c-body">No saved reports yet. Generate a chart or a reading first.</p>
          <Link href="/en" className="hw-c-btnBig inline-block mt-4">Cast a Bazi chart</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {error && <p className="hw-c-err">{error}</p>}
          {rows.map((r) => {
            const legacy = legacyMap[r.id] === true
            return (
              <div key={r.id} className="hw-c-box flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="flex flex-wrap items-center gap-2 font-semibold text-ink">
                    {kindLabelEn(r.kind)}
                    {legacy && (
                      <span className="rounded-full border border-gold/30 px-2 py-0.5 text-[11px] font-normal text-ink/60">
                        {LEGACY_BADGE_EN}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-ink-light">{new Date(r.created_at).toLocaleDateString('en-US')}</p>
                  {legacy && (
                    <p className="mt-1 text-xs text-ink-light">
                      Its body is the original Chinese report and has not been translated. It stays readable in your account; readings generated from now on will be in English.
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Link href={`/en/reports/${r.id}`} className="hw-c-link">Open report →</Link>
                    <button
                      type="button"
                      className="hw-c-link text-ink/45 hover:text-red-600"
                      onClick={() => handleDelete(r.id)}
                    >
                      Delete
                    </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

    </div>
  )
}
