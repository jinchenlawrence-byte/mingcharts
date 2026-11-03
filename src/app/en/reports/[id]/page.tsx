'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { getSupabase } from '@/lib/supabase'

interface ReportRow {
  id: string
  kind: string
  title: string
  result: Record<string, unknown>
  created_at: string
}

const KIND_EN: Record<string, string> = {
  hemun: 'Bazi synastry',
  ziwei: 'Zi Wei Dou Shu',
  geo: 'Geomancy',
  annual: 'Annual report',
  fatebook: 'Fate Book',
}

const MODULE_HREF: Record<string, string> = {
  hemun: '/en/hemun',
  ziwei: '/en/ziwei',
  geo: '/en/geo',
  annual: '/en/liunian',
}

const TITLES: Record<string, Record<string, string>> = {
  hemun: {
    overview: 'Synastry overview',
    shengxiao: 'Zodiac year pillars',
    rizhu: 'Day pillar and spouse palace',
    ouxing: 'Spouse star and attachment pattern',
    wuxing: 'Five Elements support',
    advice: 'Relationship advice and timing',
  },
  ziwei: {
    overview: 'Chart overview',
    personality: 'Temperament',
    palaces: 'Twelve palaces',
    career: 'Career',
    wealth: 'Wealth',
    marriage: 'Marriage',
    health: 'Health',
    transforms: 'Four Transformations',
    patterns: 'Structure',
    decadal: 'Decadal cycle',
    yearly: 'Annual cycle',
    advice: 'Guidance',
  },
  geo: {
    overview: 'Direction overview',
    currentCity: 'Current city',
    wealth: 'Wealth cities',
    career: 'Career cities',
    patron: 'Benefactor cities',
    home: 'Settling cities',
    talent: 'Talent cities',
    advice: 'Moving and direction advice',
  },
  annual: {
    annualOverview: 'Annual overview',
    careerFlow: 'Career in the year',
    wealthFlow: 'Wealth in the year',
    loveFlow: 'Relationships in the year',
    healthFlow: 'Health in the year',
    monthFlow: 'Monthly rhythm',
  },
  fatebook: {
    overview: 'Chart overview',
    personality: 'Temperament and talent',
    yongShen: 'Useful God',
    geJuAnalysis: 'Structure analysis',
    tiaoHou: 'Seasonal adjustment',
    daYunAnalysis: 'Luck Pillars and Annual Pillars',
    career: 'Career and wealth',
    marriage: 'Marriage and relationships',
    children: 'Children and kin',
    health: 'Health tendencies',
  },
}

export default function EnReportDetailPage() {
  const params = useParams()
  const id = typeof params.id === 'string' ? params.id : ''
  const [row, setRow] = useState<ReportRow | null>(null)
  const [sections, setSections] = useState<Record<string, string> | null>(null)
  const [legacyChinese, setLegacyChinese] = useState(false)
  const [loading, setLoading] = useState(true)
  const [notLogged, setNotLogged] = useState(false)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!id) return
    ;(async () => {
      const supabase = getSupabase()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setNotLogged(true); setLoading(false); return }

      const { data, error } = await supabase
        .from('reports')
        .select('id,kind,title,result,created_at')
        .eq('id', id)
        .eq('status', 'ready')
        .single()
      if (error || !data) { setNotFound(true); setLoading(false); return }

      const detail = data as ReportRow
      setRow(detail)
      const result = detail.result ?? {}
      let ai = result.ai as Record<string, unknown> | null | undefined

      // Fate Book rows store a pointer to the chart; read the paid analysis from there.
      if (!ai && detail.kind === 'fatebook' && typeof result.chart_id === 'string') {
        const { data: chartRow } = await supabase
          .from('charts')
          .select('chart_data')
          .eq('id', result.chart_id)
          .single()
        const chartData = chartRow as unknown as { chart_data?: { analysis?: { paid?: unknown } } } | null
        const paid = chartData?.chart_data?.analysis?.paid
        if (paid && typeof paid === 'object') ai = paid as Record<string, unknown>
      }

      if (ai) {
        const text: Record<string, string> = {}
        for (const [key, value] of Object.entries(ai)) {
          if (typeof value === 'string' && value.trim()) text[key] = value.trim()
        }
        // Old reports may hold Chinese AI text; never surface it on the English route.
        const hasCJK = Object.values(text).some((value) => /[\u4e00-\u9fff]/.test(value))
        if (hasCJK) setLegacyChinese(true)
        else setSections(Object.keys(text).length ? text : null)
      }
      setLoading(false)
    })()
  }, [id])

  return (
    <div className="hw-wrap hw-c-pg">
      <Link href="/en/reports" className="hw-c-back">‹ My reports</Link>

      {loading ? (
        <p className="hw-c-meta">Loading this report…</p>
      ) : notLogged ? (
        <div className="hw-c-box text-center">
          <p className="hw-c-body">Sign in to read this report.</p>
          <Link href="/en/auth" className="hw-c-btnBig inline-block mt-4">Sign in</Link>
        </div>
      ) : notFound || !row ? (
        <div className="hw-c-box text-center">
          <p className="hw-c-body">This report was not found, or it belongs to another account.</p>
          <Link href="/en/reports" className="hw-c-btnBig inline-block mt-4">Back to my reports</Link>
        </div>
      ) : (
        <>
          <h1 className="hw-c-h1">{KIND_EN[row.kind] ?? row.kind}</h1>
          <p className="hw-c-meta mb-5">{new Date(row.created_at).toLocaleDateString('en-US')}</p>

          {sections ? (
            <div className="space-y-4">
              {Object.entries(sections).map(([key, text]) => (
                <article key={key} className="hw-c-box">
                  <h2 className="hw-c-secTitle">{TITLES[row.kind]?.[key] ?? key}</h2>
                  <p className="hw-c-body whitespace-pre-line">{text}</p>
                </article>
              ))}
            </div>
          ) : (
            <div className="hw-c-box text-center">
              <p className="hw-c-body">
                {legacyChinese
                  ? 'This saved report was generated in Chinese before the English edition. Regenerate it to receive an English reading.'
                  : 'This saved report has no English text yet. It may have been generated before the English edition, or the AI service returned the rule-engine version without English body text.'}
              </p>
              {MODULE_HREF[row.kind] && (
                <Link href={MODULE_HREF[row.kind]} className="hw-c-btnBig inline-block mt-4">
                  Generate this reading again
                </Link>
              )}
              {row.kind === 'fatebook' && (
                <Link href="/en/chart" className="hw-c-btnBig inline-block mt-4">Open my chart</Link>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
