'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase'
import { kindLabelEn, isLegacyChineseReport, LEGACY_BADGE_EN } from '@/lib/enReportLabels'
import ReportActions from '@/components/ReportActions'
import AskPanel from '@/components/AskPanel'
import { REPORT_GATE } from '@/lib/reportGate'
import { grantsCover } from '@/lib/entitlement'
import { geoAskChart, liunianAskChart, ziweiAskContext, askBaziSourceFrom, fetchAskBaziChart } from '@/lib/askChart'
import type { SkuId } from '@/lib/pricing'

/** SKU used to unlock "this report" when unpaid (same as the zh / tw detail pages) */
const UNLOCK_SKU: Record<string, SkuId> = {
  ziwei: 'ziwei_deep',
  hemun: 'hemun',
  geo: 'geo',
  annual: 'annual_report',
}

interface ReportRow {
  id: string
  kind: string
  title: string
  result: Record<string, unknown>
  input?: Record<string, unknown> | null
  created_at: string
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
  const router = useRouter()
  const id = typeof params.id === 'string' ? params.id : ''
  const [row, setRow] = useState<ReportRow | null>(null)
  const [sections, setSections] = useState<Record<string, string> | null>(null)
  const [legacyChinese, setLegacyChinese] = useState(false)
  const [chartPayload, setChartPayload] = useState<unknown>(null)
  const [paid, setPaid] = useState(false)
  const [askChart, setAskChart] = useState<object | null>(null)
  const [askContext, setAskContext] = useState<object | undefined>(undefined)
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
        .select('id,kind,title,result,input,created_at')
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
        if (chartData?.chart_data) setChartPayload(chartData.chart_data)
        const paid = chartData?.chart_data?.analysis?.paid
        if (paid && typeof paid === 'object') ai = paid as Record<string, unknown>
      }

      if (ai) {
        const text: Record<string, string> = {}
        for (const [key, value] of Object.entries(ai)) {
          if (typeof value === 'string' && value.trim()) text[key] = value.trim()
        }
        // Old reports may hold Chinese AI text; never surface it on the English route.
        // Same content rule as the list: clear CJK majority in the body, not any stray CJK name.
        if (isLegacyChineseReport({ ai: text })) setLegacyChinese(true)
        else setSections(Object.keys(text).length ? text : null)
      }

      // ★ Paid status and the follow-up chart (same rule as the zh / tw detail pages):
      //   recompute entitlement from the CURRENT account, never trust what was written at generation time;
      //   prefer the chart stored in the result, and rebuild a missing bazi chart from the saved input.
      const gate = REPORT_GATE[detail.kind as keyof typeof REPORT_GATE]
      if (gate) {
        try {
          const r = await fetch('/api/entitlements', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: session.access_token }),
          })
          const j = await r.json()
          if (Array.isArray(j?.ownedSkus)) {
            setPaid(grantsCover({ memberSkus: j.memberSkus ?? [], ownedSkus: j.ownedSkus }, gate.grant))
          }
        } catch {
          // Conservative: render the follow-up panel as unpaid
        }
      }
      if (detail.kind === 'hemun') {
        setAskChart((result.male ?? result.female ?? null) as object | null)
      } else if (detail.kind === 'geo') {
        setAskChart(geoAskChart(result as unknown as Parameters<typeof geoAskChart>[0]))
      } else if (detail.kind === 'annual') {
        setAskChart(liunianAskChart(result as unknown as Parameters<typeof liunianAskChart>[0]))
      } else if (detail.kind === 'ziwei') {
        setAskContext(ziweiAskContext(result as unknown as Parameters<typeof ziweiAskContext>[0]))
        const stored = result.baziChart as object | undefined
        if (stored) setAskChart(stored)
        else {
          const src = askBaziSourceFrom(result.chart)
          if (src) {
            const c = await fetchAskBaziChart(src)
            if (c) setAskChart(c)
          }
        }
      }

      setLoading(false)
    })()
  }, [id])

  return (
    <div className="hw-wrap hw-c-pg hw-c-report hw-report-theme hw-print">
      <ReportActions
        backHref="/en/reports"
        labels={{ back: '‹ My reports', share: 'Share', export: 'Export PDF', copied: 'Link copied', shareTitle: 'My report' }}
      />

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
          <h1 className="flex flex-wrap items-center gap-2 hw-c-h1">
            {kindLabelEn(row.kind)}
            {legacyChinese && (
              <span className="rounded-full border border-gold/30 px-2 py-0.5 text-[11px] font-normal text-ink/70">
                {LEGACY_BADGE_EN}
              </span>
            )}
          </h1>
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
              {legacyChinese ? (
                <>
                  <h2 className="hw-c-secTitle">{LEGACY_BADGE_EN}</h2>
                  <p className="hw-c-body">
                    This report&apos;s body is the original Chinese version and has not been translated.
                    The Chinese text is deliberately not rendered on the English route.
                    It stays readable in your account. Readings generated from now on will be written in English.
                  </p>
                </>
              ) : (
                <p className="hw-c-body">
                  This saved report has no English text yet. It may have been generated before the English edition, or the AI service returned the rule-engine version without English body text.
                </p>
              )}
              <Link href="/en/reports" className="hw-c-btnBig inline-block mt-4">Back to my reports</Link>
            </div>
          )}

          {/* ★ AI follow-ups: this English detail page had no entry at all before (added 2026-11-08) */}
          {row.kind !== 'fatebook' && (
            <div className="mt-6">
              <AskPanel
                chart={askChart}
                locale="en"
                reportId={row.id}
                reportPaid={paid}
                unlockSku={UNLOCK_SKU[row.kind]}
                context={askContext}
                chartOptions={
                  row.kind === 'hemun'
                    ? [
                        ...(row.result.male ? [{ key: 'male', label: 'Male chart', chart: row.result.male as object }] : []),
                        ...(row.result.female ? [{ key: 'female', label: 'Female chart', chart: row.result.female as object }] : []),
                      ]
                    : undefined
                }
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}
