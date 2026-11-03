'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getSupabase } from '@/lib/supabase'

interface ReportRow {
  id: string
  kind: string
  title: string
  created_at: string
}

const KIND_EN: Record<string, string> = {
  hemun: 'Bazi synastry',
  ziwei: 'Zi Wei Dou Shu',
  geo: 'Geomancy',
  annual: 'Annual report',
  fatebook: 'Fate Book',
}

// English report list and English report detail route.
export default function EnReportsPage() {
  const [rows, setRows] = useState<ReportRow[]>([])
  const [loading, setLoading] = useState(true)
  const [notLogged, setNotLogged] = useState(false)

  useEffect(() => {
    ;(async () => {
      const supabase = getSupabase()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setNotLogged(true); setLoading(false); return }
      const { data } = await supabase
        .from('reports')
        .select('id,kind,title,created_at')
        .eq('status', 'ready')
        .is('request_id', null)
        .order('created_at', { ascending: false })
      if (data) setRows(data as ReportRow[])
      setLoading(false)
    })()
  }, [])

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
          {rows.map((r) => (
            <div key={r.id} className="hw-c-box flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-ink">{KIND_EN[r.kind] ?? r.kind}</p>
                <p className="text-xs text-ink-light/60">{new Date(r.created_at).toLocaleDateString('en-US')}</p>
              </div>
              <Link href={`/en/reports/${r.id}`} className="hw-c-link">Open report →</Link>
            </div>
          ))}
        </div>
      )}

    </div>
  )
}
