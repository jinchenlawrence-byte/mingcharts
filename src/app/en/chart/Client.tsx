'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import SaveChart from '@/components/SaveChart'
import ShareLink from '@/components/ShareLink'
import CheckoutButton from '@/components/CheckoutButton'
import AskPanel from '@/components/AskPanel'
import { getSupabase } from '@/lib/supabase'
import { waffoProductId } from '@/lib/waffo-products'
import { SKUS, formatPriceUSD } from '@/lib/pricing'
import { buildEnFatebookPreview, strengthEn, structureEn, qiYunEn } from '@/lib/enPreview'
import type { PaidAnalysis, LuckCycles, FortuneTier } from '@/lib/analysis'

const FATEBOOK_PRICE = formatPriceUSD(SKUS.fatebook.priceUSD)

const STEM_WX: Record<string, string> = {
  甲: 'Wood', 乙: 'Wood', 丙: 'Fire', 丁: 'Fire', 戊: 'Earth',
  己: 'Earth', 庚: 'Metal', 辛: 'Metal', 壬: 'Water', 癸: 'Water',
}
const BRANCH_WX: Record<string, string> = {
  子: 'Water', 丑: 'Earth', 寅: 'Wood', 卯: 'Wood', 辰: 'Earth', 巳: 'Fire',
  午: 'Fire', 未: 'Earth', 申: 'Metal', 酉: 'Metal', 戌: 'Earth', 亥: 'Water',
}
const WX_ORDER = ['Wood', 'Fire', 'Earth', 'Metal', 'Water'] as const
const TEN_GOD: Record<string, string> = {
  比肩: 'Companion', 劫财: 'Rob Wealth', 食神: 'Eating God', 伤官: 'Hurting Officer',
  偏财: 'Indirect Wealth', 正财: 'Direct Wealth', 七杀: 'Seven Killing',
  正官: 'Direct Officer', 偏印: 'Indirect Resource', 正印: 'Direct Resource', 日主: 'Day Master',
}
const VOLS = [
  'Chart overview', 'Temperament & gifts', 'Useful God', 'Structure outcomes', 'Seasonal adjustment',
  'Luck & Annual Pillars', 'Career & wealth', 'Marriage & relationships', 'Children & kin', 'Health notes',
]
const PAID_KEYS = ['overview', 'personality', 'yongShen', 'geJuAnalysis', 'tiaoHou', 'daYunAnalysis', 'career', 'marriage', 'children', 'health'] as const

const FORTUNE_BADGE: Record<FortuneTier, string> = {
  '大吉': 'bg-emerald-100 text-emerald-800', '吉': 'bg-emerald-50 text-emerald-700',
  '小吉': 'bg-emerald-50 text-emerald-600', '平': 'bg-gold/5 text-amber-600',
  '小凶': 'bg-red-50 text-red-600', '凶': 'bg-red-100 text-red-700', '大凶': 'bg-red-200 text-red-800',
}

interface ChartData {
  input: { year: number; month: number; day: number; hour: number; minute: number; gender: number }
  lunarDate: string
  pillars: {
    year: Pillar; month: Pillar; day: Pillar; hour: Pillar
  }
  dayMaster: string
  taiYuan: string
  mingGong: string
  shenGong: string
  qiYun: string
  daYun: Array<{ ganZhi: string; startAge: number; startYear: number; endYear: number }>
  analysis: { wangShuai: string; geJu: string; isPaid: boolean; paid?: PaidAnalysis }
  trueSolar?: { offsetMin: number; zone: string; dstNotice: string | null }
  locked?: { skus: string[]; preview: string } | null
  free?: { fatebookPreview?: { free: string[]; rest: string[]; fullMinChars?: number } | null } | null
}
interface Pillar {
  ganZhi: string; tenGodGan?: string; cangGan?: string[]; tenGodCangGan?: string[]; changSheng?: string; shenSha?: string[]; kongWang?: string
}

function tenGod(g?: string): string {
  if (!g) return ''
  return TEN_GOD[g] ?? g
}

export default function EnChartClient() {
  const router = useRouter()
  const [chart, setChart] = useState<ChartData | null>(null)
  const [chartId, setChartId] = useState<string | null>(null)
  const syncedRef = useRef(false)

  useEffect(() => {
    const stored = localStorage.getItem('currentChart')
    if (stored) setChart(JSON.parse(stored))
    else router.push('/en')
  }, [router])

  // 回看同步：已购盘由服务端下发全文（英文 cookie 决定 AI 语言）
  useEffect(() => {
    if (!chart || syncedRef.current) return
    syncedRef.current = true
    ;(async () => {
      try {
        const supabase = getSupabase()
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return
        const res = await fetch('/api/unlock', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: session.access_token, chart, locale: 'en' }),
        })
        const out = await res.json().catch(() => null)
        if (out?.chartId) setChartId(out.chartId)
        if (res.ok && out?.success && out?.data?.chartData) {
          setChart(out.data.chartData)
          localStorage.setItem('currentChart', JSON.stringify(out.data.chartData))
        }
      } catch {
        // 同步失败不影响浏览
      }
    })()
  }, [chart])

  if (!chart) {
    return <main className="hw-page flex min-h-screen items-center justify-center"><p className="hw-c-meta">Loading your chart…</p></main>
  }

  const pillars = [chart.pillars.year, chart.pillars.month, chart.pillars.day, chart.pillars.hour]
  const counts: Record<string, number> = { Wood: 0, Fire: 0, Earth: 0, Metal: 0, Water: 0 }
  for (const p of pillars) {
    const s = STEM_WX[p.ganZhi[0]]; const b = BRANCH_WX[p.ganZhi[1]]
    if (s) counts[s]++; if (b) counts[b]++
  }
  const preview = chart.analysis.isPaid ? null : buildEnFatebookPreview(chart)
  const paid = chart.analysis.isPaid ? chart.analysis.paid ?? null : null

  return (
    <main className="hw-page">
      <div className="hw-wrap hw-c-pg">
        <Link href="/en" className="hw-c-back">‹ New chart</Link>
        <h1 className="hw-c-h1">Day Master {chart.dayMaster} · {STEM_WX[chart.dayMaster] ?? ''}</h1>
        <p className="hw-c-meta">
          {chart.input.year}-{chart.input.month}-{chart.input.day} {String(chart.input.hour).padStart(2, '0')}:{String(chart.input.minute).padStart(2, '0')}
          {' · '}{chart.input.gender === 1 ? 'Male' : 'Female'}{' · '}True Solar Time: {chart.trueSolar ? `${chart.trueSolar.offsetMin >= 0 ? '+' : ''}${chart.trueSolar.offsetMin} min (${chart.trueSolar.zone})` : 'not applied'}
        </p>
        {chart.trueSolar?.dstNotice && <div className="hw-c-warn">⚠ {chart.trueSolar.dstNotice}</div>}

        <div className="hw-pillars" style={{ paddingTop: 28 }}>
          {pillars.map((p, i) => (
            <div key={i} className={`hw-c-pillar${i === 2 ? ' hw-day' : ''}`}>
              <span className="hw-t">{['Year', 'Month', 'Day', 'Hour'][i]}</span>
              <span className={`hw-g hw-${(STEM_WX[p.ganZhi[0]] ?? 'water').toLowerCase()}`}>{p.ganZhi[0]}</span>
              <span className={`hw-g hw-${(BRANCH_WX[p.ganZhi[1]] ?? 'water').toLowerCase()}`}>{p.ganZhi[1]}</span>
            </div>
          ))}
        </div>

        <div className="hw-c-box hw-c-boxFlush mt-4">
          <div className="hw-c-tableWrap">
            <table className="hw-c-table">
              <thead><tr><th></th>{['Year', 'Month', 'Day', 'Hour'].map((n) => <th key={n}>{n}</th>)}</tr></thead>
              <tbody>
                <tr><td>Ten Gods</td>{pillars.map((p, i) => <td key={i}>{tenGod(p.tenGodGan) || (i === 2 ? 'Day Master' : '')}</td>)}</tr>
                <tr><td>Hidden Stems</td>{pillars.map((p, i) => <td key={i}>{(p.cangGan ?? []).map((g, j) => `${g}${p.tenGodCangGan?.[j] ? ` (${tenGod(p.tenGodCangGan[j])})` : ''}`).join(' · ')}</td>)}</tr>
                <tr><td>Twelve Stages</td>{pillars.map((p, i) => <td key={i}>{p.changSheng ?? '—'}</td>)}</tr>
                <tr><td>Auspices</td>{pillars.map((p, i) => <td key={i}>{(p.shenSha ?? []).join(' · ') || '—'}</td>)}</tr>
                <tr><td>Void</td>{pillars.map((p, i) => <td key={i}>{p.kongWang ?? '—'}</td>)}</tr>
              </tbody>
            </table>
          </div>
          <p className="hw-c-fine">
            Auspices follow the common conventions of Yuan Hai Zi Ping and San Ming Tong Hui; schools differ.
            They are labels, not verdicts. The reading rests on Five Elements balance and structure.
          </p>
        </div>

        <h2 className="hw-c-h2">Five Elements</h2>
        <div className="grid grid-cols-5 gap-2 text-center text-sm">
          {WX_ORDER.map((k) => (
            <div key={k} className="rounded border border-gold/15 p-2">
              <div className="font-bold text-ink">{k}</div>
              <div className="text-ink-light/60">{counts[k]}</div>
            </div>
          ))}
        </div>

        <div className="hw-c-two mt-5">
          <div className="hw-c-box">
            <h3 className="hw-c-secTitle">Strength &amp; structure</h3>
            <div className="hw-c-kv">
              <p><span>Strength: </span>{strengthEn(chart.analysis.wangShuai)}</p>
              <p><span>Structure: </span>{structureEn(chart.analysis.geJu)}</p>
              <p><span>First Luck Pillar: </span>{qiYunEn(chart.qiYun)}</p>
            </div>
          </div>
          <div className="hw-c-box">
            <h3 className="hw-c-secTitle">Conception &amp; palaces</h3>
            <div className="hw-c-kv">
              <p><span>Conception: </span>{chart.taiYuan}</p>
              <p><span>Life Palace: </span>{chart.mingGong}</p>
              <p><span>Body Palace: </span>{chart.shenGong}</p>
            </div>
          </div>
        </div>

        <h2 className="hw-c-h2">Luck Pillars</h2>
        <div className="hw-c-dy">
          {chart.daYun.map((dy, i) => {
            const now = new Date().getFullYear()
            const current = now >= dy.startYear && now <= dy.endYear
            return (
              <div key={i} className={current ? 'hw-c-cur' : ''}>
                <b>{dy.ganZhi}</b>
                <i>{dy.startAge}–{dy.startAge + 9} yrs</i>
                <i>{dy.startYear}–{dy.endYear}</i>
                {current && <span className="hw-c-curTag">Current</span>}
              </div>
            )
          })}
        </div>

        <SaveChart locale="en" />
        <div className="mt-4 text-center">
          <ShareLink path="/en/chart" title="MingCharts · Free Bazi chart" text="Cast a chart and see what the ten volumes say" label="Share" locale="en" />
        </div>

        {preview && (
          <div className="hw-pv">
            <div className="hw-pv-head">
              <h3 className="hw-c-secTitle">Fate Book preview</h3>
              <span className="hw-pv-badge">Rule-engine summary · English edition</span>
            </div>
            {preview.free.map((text, i) => (
              <article key={i} className="hw-c-box hw-pv-card">
                <h4 className="hw-pv-title">{VOLS[i]}</h4>
                <p className="hw-c-body whitespace-pre-line">{text}</p>
              </article>
            ))}
            <div className="hw-pv-div"><span>Preview ends here · the remaining eight volumes are part of the full Fate Book</span></div>
            {preview.rest.map((text, i) => (
              <div key={i} className="hw-pv-lock">
                <h4 className="hw-pv-title">{VOLS[i + 2]}</h4>
                <p className="hw-c-body">{text}</p>
                <span className="hw-pv-chip">Unlock to read in full</span>
              </div>
            ))}
          </div>
        )}

        {!chart.analysis.isPaid && (
          <div className="hw-c-cta">
            {chart.locked?.preview && <p className="hw-c-dx">{chart.locked.preview}</p>}
            <div style={{ maxWidth: 380, margin: '0 auto' }}>
              <CheckoutButton sku="fatebook" available={waffoProductId('fatebook') !== null} chartId={chartId ?? undefined} authPath="/en/auth">
                Unlock the full Fate Book · {FATEBOOK_PRICE}
              </CheckoutButton>
            </div>
            <p className="hw-note mt-3">One-time purchase, lifetime access · <Link href="/en/mingshu" className="hw-c-link">Fate Book details</Link></p>
          </div>
        )}

        {paid && (
          <div className="space-y-4 mt-5">
            {paid.luckCycles && <LuckCyclesEn luck={paid.luckCycles} />}
            {VOLS.map((title, i) => (
              <div key={title} className="hw-c-box">
                <h3 className="hw-c-secTitle">{i + 1}. {title}</h3>
                <p className="hw-c-body whitespace-pre-line">{paid[PAID_KEYS[i]]}</p>
              </div>
            ))}
          </div>
        )}

        <AskPanel chartId={chartId} chart={chart} locale="en" />
      </div>
    </main>
  )
}

function LuckCyclesEn({ luck }: { luck: LuckCycles }) {
  return (
    <div className="space-y-4">
      <div className="hw-c-box">
        <h3 className="hw-c-secTitle">Luck Pillar timeline</h3>
        <div className="flex flex-wrap gap-2">
          {luck.daYun.map((d, i) => (
            <div key={i} className={`rounded px-3 py-2 text-center border ${d.current ? 'bg-gold/5 border-amber-500' : 'bg-paper-dark/30 border-gold/15'}`}>
              <div className="font-bold text-ink">{d.ganZhi}</div>
              <div className="text-xs text-ink-light/60">{d.startAge}-{d.startAge + 9} yrs</div>
              <span className={`inline-block text-[11px] px-1.5 rounded mt-1 ${FORTUNE_BADGE[d.tag]}`}>{d.tag}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="hw-c-box">
        <h3 className="hw-c-secTitle">Annual Pillars · this year and the next two</h3>
        <div className="grid md:grid-cols-3 gap-3">
          {luck.liuNian.map((y, i) => (
            <div key={i} className="rounded border-l-4 border-gold/20 bg-paper-dark/30 p-3">
              <div className="flex items-center justify-between gap-1">
                <span className="font-bold text-ink">{y.year} {y.ganZhi}</span>
                <span className={`text-[11px] px-1.5 py-0.5 rounded ${FORTUNE_BADGE[y.tag]}`}>{y.tag}</span>
              </div>
              <div className="text-xs text-ink-light/60 mt-1">{y.shiShenGan} governing</div>
              <p className="text-xs text-ink/70 mt-2 leading-relaxed">{y.note}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
