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
import {
  stemEn, branchEn, ganZhiEn, tierEn, luckTagEn,
  CHANG_SHENG_EN, SHEN_SHA_EN, parseLunarAlmanacEn,
} from '@/lib/enTerms'
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
  return TEN_GOD[g] ?? ''
}

function kongWangEn(k?: string): string {
  if (!k) return '—'
  return [...k].map((z) => branchEn(z)).filter(Boolean).join(' · ') || '—'
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
  const almanac = parseLunarAlmanacEn(
    chart.lunarDate,
    chart.pillars.day.ganZhi[0],
    chart.pillars.day.ganZhi[1],
    chart.pillars.day.ganZhi,
  )

  return (
    <main className="hw-page">
      <div className="hw-wrap hw-c-pg">
        <Link href="/en" className="hw-c-back">‹ New chart</Link>
        <h1 className="hw-c-h1">Day Master {stemEn(chart.dayMaster)} · {STEM_WX[chart.dayMaster] ?? ''}</h1>
        <p className="hw-c-meta">
          {chart.input.year}-{chart.input.month}-{chart.input.day} {String(chart.input.hour).padStart(2, '0')}:{String(chart.input.minute).padStart(2, '0')}
          {' · '}{chart.input.gender === 1 ? 'Male' : 'Female'}{' · '}True Solar Time: {chart.trueSolar ? `${chart.trueSolar.offsetMin >= 0 ? '+' : ''}${chart.trueSolar.offsetMin} min (${chart.trueSolar.zone})` : 'not applied'}
        </p>
        {chart.trueSolar?.dstNotice && (
          <div className="hw-c-warn">
            ⚠ True Solar Time note: this birth time falls near a daylight-saving transition; the engine resolved it automatically.
          </div>
        )}

        <div className="hw-pillars" style={{ paddingTop: 28 }}>
          {pillars.map((p, i) => (
            <div key={i} className={`hw-c-pillar${i === 2 ? ' hw-day' : ''}`}>
              <span className="hw-t">{['Year', 'Month', 'Day', 'Hour'][i]}</span>
              <span className={`hw-g hw-${(STEM_WX[p.ganZhi[0]] ?? 'water').toLowerCase()}`}>{stemEn(p.ganZhi[0])}</span>
              <span className={`hw-g hw-${(BRANCH_WX[p.ganZhi[1]] ?? 'water').toLowerCase()}`}>{branchEn(p.ganZhi[1])}</span>
            </div>
          ))}
        </div>

        <div className="hw-c-box hw-c-boxFlush mt-4">
          <div className="hw-c-tableWrap">
            <table className="hw-c-table">
              <thead><tr><th></th>{['Year', 'Month', 'Day', 'Hour'].map((n) => <th key={n}>{n}</th>)}</tr></thead>
              <tbody>
                <tr><td>Ten Gods</td>{pillars.map((p, i) => <td key={i}>{tenGod(p.tenGodGan) || (i === 2 ? 'Day Master' : '')}</td>)}</tr>
                <tr><td>Hidden Stems</td>{pillars.map((p, i) => <td key={i}>{(p.cangGan ?? []).map((g, j) => `${stemEn(g)}${p.tenGodCangGan?.[j] ? ` (${tenGod(p.tenGodCangGan[j])})` : ''}`).join(' · ')}</td>)}</tr>
                <tr><td>Twelve Stages</td>{pillars.map((p, i) => <td key={i}>{p.changSheng ? (CHANG_SHENG_EN[p.changSheng] ?? '—') : '—'}</td>)}</tr>
                <tr><td>Auspices</td>{pillars.map((p, i) => <td key={i}>{(p.shenSha ?? []).map((s) => SHEN_SHA_EN[s] ?? 'Auspice').join(' · ') || '—'}</td>)}</tr>
                <tr><td>Void</td>{pillars.map((p, i) => <td key={i}>{kongWangEn(p.kongWang)}</td>)}</tr>
              </tbody>
            </table>
          </div>
          <p className="hw-alert hw-alert--note">
            Auspices follow the common conventions of <b>Yuan Hai Zi Ping</b> (渊海子平) and <b>San Ming Tong Hui</b> (三命通会).
            Benefactors such as Tian Yi Gui Ren, Wen Chang, Lu Shen, Yang Ren and Tai Ji Gui Ren are taken from the Day Stem;
            Peach Blossom, Travelling Horse, Canopy, General Star and the main malefic stars are taken from the Year or Day Branch
            through their three-harmony group; Tian De and Yue De come from the Month Branch; Kui Gang, Yin-Yang Error and the
            Ten Days of Great Defeat are read from the Day Pillar itself. Void (Kong Wang) is the pair of branches missing from
            each pillar's ten-day cycle.
          </p>
          <p className="hw-alert hw-alert--note">
            Schools differ in the finer rules, and some labels (such as the Children star) come from folk tradition rather than
            the classics. Treat every auspice as a reference point, not a verdict: the reading itself rests on the balance of the
            Five Elements and the structure of the chart.
          </p>
        </div>

        <div className="hw-c-box">
          <h3 className="hw-c-secTitle">Chart archive · lunar date, Nayin, mansion and almanac</h3>
          <div className="hw-c-kv text-sm space-y-1">
            <p><span>Lunar date: </span>{almanac.lunarDate}{almanac.weekday ? ` (${almanac.weekday})` : ''}</p>
            {almanac.lunarPillars && <p><span>Lunar pillars: </span>{almanac.lunarPillars}</p>}
            {almanac.nayin.length > 0 && (
              <p><span>Nayin elements: </span>{['Year', 'Month', 'Day', 'Hour'].map((l, i) => almanac.nayin[i] ? `${l} ${almanac.nayin[i]}` : '').filter(Boolean).join(' · ')}</p>
            )}
            {almanac.mansion && <p><span>{almanac.mansion}</span>{almanac.spirit ? ` · ${almanac.spirit}` : ''}</p>}
            {almanac.pengzu.length > 0 && (
              <p><span>Pengzu taboos: </span>{almanac.pengzu.join('; ')}</p>
            )}
            {almanac.directions.length > 0 && (
              <p><span>Directions: </span>{almanac.directions.join(' · ')}</p>
            )}
            {(almanac.clash || almanac.sha) && (
              <p><span>Clash &amp; Sha: </span>{[almanac.clash, almanac.sha].filter(Boolean).join(' · ')}</p>
            )}
          </div>
        </div>

        <h2 className="hw-c-h2">Five Elements</h2>
        <div className="grid grid-cols-5 gap-2 text-center text-sm">
          {WX_ORDER.map((k) => (
            <div key={k} className="rounded border border-gold/15 p-2">
              <div className="font-bold text-ink">{k}</div>
              <div className="text-ink-light">{counts[k]}</div>
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
              <p><span>Conception: </span>{ganZhiEn(chart.taiYuan) || '—'}</p>
              <p><span>Life Palace: </span>{ganZhiEn(chart.mingGong) || '—'}</p>
              <p><span>Body Palace: </span>{ganZhiEn(chart.shenGong) || '—'}</p>
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
                <b>{ganZhiEn(dy.ganZhi)}</b>
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

        {/* 第二批补齐：命书十卷卷名条（与简体 /chart 同款，英文卷名） */}
        <h2 className="hw-c-h2">The ten volumes of the Fate Book</h2>
        <div className={`hw-c-vols${chart.analysis.isPaid ? '' : ' hw-c-locked'}`}>
          {VOLS.map((v, i) => (
            <span key={v}><i>Vol {i + 1}</i>{v}</span>
          ))}
        </div>

        {preview && (
          <div className="hw-pv">
            <div className="hw-pv-head">
              <h3 className="hw-c-secTitle">Fate Book preview</h3>
              <span className="hw-pv-badge">Rule-engine summary · English edition</span>
              {/* 第二批补齐：规则版 vs AI 精批的解释段（简体 L579-584，英文此前没有） */}
              <p className="hw-c-meta">
                The two volumes below are a <b className="hw-pv-em">rule-engine summary</b>: computed directly from your four
                pillars, conclusions only, with no AI involved — so it is short and does not expand. The paid Fate Book is
                <b className="hw-pv-em">a different piece of writing</b>: AI reads the same chart volume by volume, at least
                {preview.fullMinChars ? ` ${preview.fullMinChars}` : ' ten thousand'} characters across ten volumes, with a
                luck-cycle timeline and classical case references.
              </p>
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
              <CheckoutButton sku="fatebook" available={waffoProductId('fatebook') !== null} chartId={chartId ?? undefined} authPath="/en/auth" locale="en" returnTo="/en/checkout/success">
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

            {/* 第二批补齐：古籍相似命例（简体 /chart L645+，英文此前缺失） */}
            {paid.similarCases && paid.similarCases.length > 0 && (
              <div className="hw-c-box">
                <h3 className="hw-c-secTitle">Similar cases in the classics</h3>
                <p className="text-xs text-ink-light mb-3">
                  Retrieved from the case libraries of Zi Ping Zhen Quan, Di Tian Sui and San Ming Tong Hui by structural
                  similarity of the four pillars — for study and cross-reference only.
                </p>
                <div className="space-y-3">
                  {paid.similarCases.map((c, i) => (
                    <div key={i} className={`rounded-lg border p-3 ${c.exact ? 'border-amber-400 bg-gold/5' : 'border-gold/15'}`}>
                      <div className="flex flex-wrap items-baseline gap-2 mb-1">
                        <span className="font-bold text-ink">{c.person || 'Unnamed case'}</span>
                        <span className="text-sm text-ink/70">
                          {c.pillars.year} {c.pillars.month} {c.pillars.day} {c.pillars.hour}
                        </span>
                        {c.exact && (
                          <span className="text-xs bg-amber-600 text-white px-2 py-0.5 rounded">Same four pillars</span>
                        )}
                        <span className="text-xs text-ink-light ml-auto">{c.source}</span>
                      </div>
                      <div className="flex flex-wrap gap-1 mb-1">
                        {c.matches.map((m, j) => (
                          <span key={j} className="text-xs bg-gold/10 text-ink/70 px-1.5 py-0.5 rounded">{m}</span>
                        ))}
                      </div>
                      {c.readings && c.readings.length > 1 ? (
                        <div className="space-y-2 mt-2">
                          {c.readings.map((r, j) => (
                            <div key={j} className="border-l-2 border-gold/20 pl-3">
                              <div className="text-xs text-amber-600 mb-0.5">
                                {r.source.split(' ')[0]}{r.person ? ` · ${r.person}` : ''}
                              </div>
                              <p className="text-sm text-ink/70 leading-relaxed">
                                {r.text.length > 220 ? r.text.slice(0, 220) + '…' : r.text}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-ink/70 leading-relaxed">{c.text}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
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
              <div className="font-bold text-ink">{ganZhiEn(d.ganZhi)}</div>
              <div className="text-xs text-ink-light">{d.startAge}-{d.startAge + 9} yrs</div>
              <span className={`inline-block text-[11px] px-1.5 rounded mt-1 ${FORTUNE_BADGE[d.tag]}`}>{tierEn(d.tag)}</span>
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
                <span className="font-bold text-ink">{y.year} {ganZhiEn(y.ganZhi)}</span>
                <span className={`text-[11px] px-1.5 py-0.5 rounded ${FORTUNE_BADGE[y.tag]}`}>{tierEn(y.tag)}</span>
              </div>
              <div className="text-xs text-ink-light mt-1">{tenGod(y.shiShenGan)} governing</div>
              <p className="text-xs text-ink/70 mt-2 leading-relaxed">
                This year's tone is {tierEn(y.tag) || 'neutral'}. Read it together with the current Luck Pillar and the full English report.
              </p>
            </div>
          ))}
        </div>
      </div>
      {(() => {
        const current = luck.liuYueByYear?.[luck.currentYear] ?? luck.liuYue
        if (!current?.length) return null
        return (
          <div className="hw-c-box">
            <h3 className="hw-c-secTitle">Monthly rhythm · {luck.currentYear}</h3>
            <p className="text-xs text-ink-light mb-2">Monthly rhythm follows solar terms, not lunar month starts.</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              {current.map((m, i) => (
                <div key={i} className="rounded border border-gold/15 px-2 py-1.5">
                  <div className="font-bold text-ink">{m.month} · {ganZhiEn(m.ganZhi)}</div>
                  <div className="text-ink-light">{luckTagEn(m.tag) || 'Neutral'}</div>
                </div>
              ))}
            </div>
          </div>
        )
      })()}
    </div>
  )
}
