'use client'

// 地理方位结果渲染（生成页与 /reports/[id] 回看页共用）
// 纯展示组件：含离线 SVG 地图、城市卡与 AI 解读；表单相关组件留在页面
import { useMemo, useRef, useState } from 'react'
import { geoMercator, geoPath, geoGraticule10 } from 'd3-geo'
import type { FeatureCollection, Geometry } from 'geojson'
import worldData from '@/data/world-countries.json'
import type { GeoAnalysis, CategoryResult, GeoCityHit } from '@/lib/geo'
import type { GeoAIReport } from '@/lib/aiGeo'
import { SKUS, formatPriceUSD } from '@/lib/pricing'
import { isRuleVersion } from '@/lib/reportGate'
import CheckoutButton from '@/components/CheckoutButton'

export interface GeoResultData {
  geo: GeoAnalysis
  solar: {
    offsetMin: number; zone: string; dstNotice: string | null
  } | null
  ai: GeoAIReport | null
  aiSource: string
  // ★ 门禁（§8.5.1）：未解锁时给 preview 与 skus，已解锁为 null
  locked?: { skus: string[]; preview: string } | null
}

// ---------- SVG 地图组件（离线渲染，无瓦片请求） ----------
const W = 1000
const H = 480

interface MarkerHit {
  cat: CategoryResult
  city: GeoCityHit
  label: string
  x: number
  y: number
}
interface PopupState {
  x: number
  y: number
  below: boolean
  hit: MarkerHit
}

function PopupCard({ p, onClose }: { p: PopupState; onClose: () => void }) {
  const { hit, x, y, below } = p
  const c = hit.city
  const cat = hit.cat
  return (
    <div
      className="absolute z-10 w-[230px] rounded-lg bg-white shadow-lg border border-gold/15 p-3 text-xs"
      style={{
        left: x,
        top: y,
        transform: `translate(-50%, ${below ? '12px' : 'calc(-100% - 12px)'})`
      }}
    >
      <button onClick={onClose}
        className="absolute top-1 right-2 text-ink-light/40 hover:text-ink-light">×</button>
      <div className="font-bold pr-4" style={{ color: cat.color }}>
        {cat.icon} {cat.label} · {c.name}
      </div>
      <div className="text-ink-light/60 mt-1">
        {c.region}　方位{c.fangLabel}（五行{c.menWx}{c.menWx !== c.fangWx ? `，卦位${c.fangWx}` : ''}）
        {c.diqi ? <>　地气{c.diqi}（产品设定）</> : ''}
      </div>
      <div className="font-semibold mt-1">
        影响指数 {c.score.toFixed(1)}（{c.impact}）
      </div>
      <div className="text-ink-light mt-1.5 leading-relaxed">{c.reasons[0]}</div>
    </div>
  )
}

function GeoMap({ geo }: { geo: GeoAnalysis }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [popup, setPopup] = useState<PopupState | null>(null)

  const markers = useMemo<MarkerHit[]>(() => {
    const out: Array<Omit<MarkerHit, 'x' | 'y'>> = []
    geo.categories.forEach((cat) =>
      cat.cities.forEach((city, i) =>
        out.push({ cat, city, label: i === 0 ? cat.icon : city.name.slice(0, 1) })
      )
    )
    // 投影在 paths 阶段完成
    return out as MarkerHit[]
  }, [geo])

  const paths = useMemo(() => {
    const pointsFC: FeatureCollection = {
      type: 'FeatureCollection',
      features: markers.map((m) => ({
        type: 'Feature',
        properties: {},
        geometry: { type: 'Point', coordinates: [m.city.lng, m.city.lat] }
      }))
    }
    // 投影范围按所有命主城市拟合（墨卡托）
    const projection = geoMercator()
    projection.fitExtent([[46, 26], [W - 46, H - 26]], pointsFC)
    const path = geoPath(projection)

    const projected: MarkerHit[] = markers.map((m) => {
      const xy = projection([m.city.lng, m.city.lat])!
      return { ...m, x: xy[0], y: xy[1] }
    })

    let birth: { name: string; x: number; y: number } | null = null
    if (geo.birthplace) {
      // 略偏移，避免与同位置城市标记重叠
      const xy = projection([geo.birthplace.lng, geo.birthplace.lat])!
      birth = { name: geo.birthplace.name, x: xy[0] - 11, y: xy[1] - 10 }
    }

    const countries = worldData as unknown as FeatureCollection<Geometry>
    return {
      sphere: path({ type: 'Sphere' }) || '',
      graticule: path(geoGraticule10()) || '',
      countryPaths: countries.features.map((f) => ({
        d: path(f) || '',
        china: String(f.id) === '156'
      })),
      projected,
      birth
    }
  }, [markers, geo])

  const onMarkerClick = (e: React.MouseEvent, hit: MarkerHit) => {
    const rect = wrapRef.current!.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    setPopup({ x, y, below: y > rect.height * 0.55, hit })
  }

  return (
    <div ref={wrapRef} className="relative w-full rounded-lg overflow-hidden bg-[#eef4fa]">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto block">
        <path d={paths.sphere} fill="#eef4fa" />
        <path d={paths.graticule} fill="none" stroke="#d7e3ef" strokeWidth={0.6} />
        {paths.countryPaths.map((p, i) => (
          <path key={i} d={p.d}
            fill={p.china ? '#fcd9a8' : '#dcd8cf'}
            stroke="#ffffff" strokeWidth={0.5} />
        ))}
        {paths.projected.map((m, i) => (
          <g key={i} className="cursor-pointer" onClick={(e) => onMarkerClick(e, m)}>
            <circle cx={m.x} cy={m.y} r={9} fill={m.cat.color}
              stroke="#fff" strokeWidth={1.5} opacity={0.95} />
            <text x={m.x} y={m.y + 3.5} textAnchor="middle" fontSize={9} fill="#fff">
              {m.label}
            </text>
          </g>
        ))}
        {paths.birth && (
          <g>
            <title>出生地参照 · {paths.birth.name}</title>
            <circle cx={paths.birth.x} cy={paths.birth.y} r={6.5}
              fill="#374151" stroke="#fff" strokeWidth={1.5} />
            <text x={paths.birth.x} y={paths.birth.y + 3.2}
              textAnchor="middle" fontSize={8.5} fill="#fff">★</text>
          </g>
        )}
      </svg>
      {popup && <PopupCard p={popup} onClose={() => setPopup(null)} />}
    </div>
  )
}

// ---------- 城市卡片 ----------
function CategorySection({ cat }: { cat: CategoryResult }) {
  return (
    <div className="paper-card rounded-lg p-4">
      <h3 className="font-semibold mb-3" style={{ color: cat.color }}>
        {cat.icon} {cat.label}
        <span className="text-xs text-ink-light/40 font-normal ml-2">
          目标{cat.targetGod} · {cat.targetWx}
        </span>
      </h3>
      <div className="space-y-3">
        {cat.notice && cat.cities.length < 6 && (
          <div className="text-sm text-ink/70 bg-gold/5 border border-gold/20 rounded-md p-3">
            {cat.notice}
          </div>
        )}
        {cat.cities.map((c) => (
          <div key={c.name} className="rounded-md border border-gold/15 p-3">
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="font-bold text-gray-800">{c.name}</span>
              <span className="text-xs text-ink-light/40">{c.region}</span>
              <span className="text-xs px-2 py-0.5 rounded-full text-white ml-auto"
                style={{ background: cat.color }}>
                {c.score.toFixed(1)}分 · {c.impact}
              </span>
            </div>
            <div className="text-xs text-ink-light/60 mt-1">
              方位{c.fangLabel}（五行{c.menWx}{c.menWx !== c.fangWx ? `，卦位${c.fangWx}` : ''}）{c.diqi ? ` · 地气${c.diqi}（产品设定）` : ''}
            </div>
            <ul className="mt-2 space-y-1">
              {c.reasons.map((r, i) => (
                <li key={i} className="text-sm text-ink-light flex gap-1.5">
                  <span style={{ color: cat.color }}>·</span>{r}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function GeoResultView({ data, onRegen, regenBusy }: {
  data: GeoResultData
  /** ★ 规则版兜底时的「重新生成」出口（模块页下传）；回看页无此能力时不传＝不显示 */
  onRegen?: () => void
  regenBusy?: boolean
}) {
  const { geo, solar, ai, aiSource, locked } = data
  // ★ 付费用户拿到规则版兜底（AI 结果未过合规校验）时，标签旁必须给出口，否则只能要求退款
  const ruleVersion = isRuleVersion(aiSource)
  return (
    <div className="space-y-6">
      {/* 喜忌摘要 */}
      <div className="paper-card rounded-lg p-4">
        <div className="grid md:grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-ink-light/60">日主：</span>
            <span className="font-medium">{geo.dayMaster}（{geo.dayWx}）· {geo.wangShuai}</span>
          </div>
          <div>
            <span className="text-ink-light/60">喜用五行：</span>
            <span className="text-green-700 font-medium">{geo.favorableWx.join('、')}</span>
          </div>
          <div>
            <span className="text-ink-light/60">宜行方位：</span>
            <span className="text-green-700">{geo.favorableDirections.join('、')}</span>
          </div>
          <div>
            <span className="text-ink-light/60">忌行方位：</span>
            <span className="text-red-600">{geo.unfavorableDirections.join('、')}</span>
          </div>
        </div>
        {solar && (
          <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-ink-light">
            真太阳时 {solar.offsetMin >= 0 ? '+' : ''}{solar.offsetMin} 分钟（{solar.zone}）
            {solar.dstNotice && (
              <span className="ml-2 text-ink/70 bg-gold/5 border border-gold/20 rounded px-1.5 py-0.5">
                {solar.dstNotice}
              </span>
            )}
          </div>
        )}
      </div>

      {/* 现居城市影响 */}
      {geo.currentCity && (
        <div className="paper-card rounded-lg p-4 border-l-4" style={{ borderColor: geo.currentCity.level === '吉' ? '#059669' : geo.currentCity.level === '忌' ? '#dc2626' : '#d97706' }}>
          <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
            <h2 className="font-semibold text-sky-800">现居城市 · {geo.currentCity.name}</h2>
            <div className="flex items-center gap-1.5">
              <span className={`text-[11px] rounded px-2 py-0.5 border ${
                geo.currentCity.level === '吉'
                  ? 'bg-green-50 border-green-200 text-green-700'
                  : geo.currentCity.level === '忌'
                    ? 'bg-red-50 border-red-200 text-red-700'
                    : 'bg-gold/5 border-gold/20 text-ink/70'
              }`}>{geo.currentCity.level}</span>
              <span className="text-[11px] rounded px-2 py-0.5 bg-sky-50 border border-sky-200 text-sky-700">
                影响指数 {geo.currentCity.score} · {geo.currentCity.impact}
              </span>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-2 text-sm mb-3">
            <div>
              <span className="text-ink-light/60">主判五行：</span>
              {geo.currentCity.primaryWx ? (
                <>
                  <span className="font-medium">{geo.currentCity.primaryWx}</span>
                  <span className="text-[11px] text-ink-light/60">（来源：{geo.currentCity.primarySource}）</span>
                  <span className="text-ink-light/60 ml-2">与日主关系：</span>
                  <span className="font-medium">{geo.currentCity.godRelation}</span>
                  <span className={`ml-1 ${geo.currentCity.favorable ? 'text-green-700' : 'text-red-600'}`}>
                    （{geo.currentCity.favorable ? '喜用' : '忌神'}）
                  </span>
                </>
              ) : <span className="text-ink-light/40">资料不足，无法判定</span>}
            </div>
            <div className="text-ink-light">
              {geo.currentCity.fangWx
                ? <>相对出生地：{geo.currentCity.fangLabel}（约 {geo.currentCity.distanceKm} 公里）</>
                : geo.currentCity.center
                  ? '与出生地同城近距，按中央土论'
                  : '未提供出生地，不论相对方位'}
            </div>
          </div>
          <div className="text-sm text-ink/70 space-y-1 mb-3">
            {geo.currentCity.effects.map((f, i) => (
              <div key={i} className="flex gap-1.5"><span className="text-sky-400">·</span><span>{f}</span></div>
            ))}
          </div>
          <div className="text-xs bg-sky-50 rounded p-2.5 space-y-0.5">
            <div className="font-medium text-sky-800 mb-1">趋避建议</div>
            {geo.currentCity.advice.map((a, i) => (
              <div key={i} className="text-sky-900">· {a}</div>
            ))}
          </div>
          <p className="text-[11px] text-ink-light/40 mt-2">
            地气影响是长期渐染的过程，以上为趋势参考；福地福人居，心态与努力为本
          </p>
        </div>
      )}

      {/* 地图 */}
      <div className="paper-card rounded-lg p-3 md:p-4">
        <h2 className="font-semibold text-sky-800 mb-3">命主方位地图</h2>
        <GeoMap geo={geo} />
        <div className="flex flex-wrap gap-3 mt-3 text-xs text-ink-light/60">
          {geo.categories.map((c) => (
            <span key={c.key} className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full inline-block" style={{ background: c.color }} />
              {c.label}
            </span>
          ))}
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full inline-block bg-gray-700" />出生地
          </span>
        </div>
      </div>

      {/* 四类城市明细 */}
      {geo.categories.map((cat) => (
        <CategorySection key={cat.key} cat={cat} />
      ))}

      {/* AI 解读：未解锁时显示 preview 与解锁引导（§8.5.1 门禁消费） */}
      {locked && (
        <div className="bg-paper-dark/40 rounded-lg p-6 text-center">
          <p className="text-sm text-ink-light mb-4">{locked.preview}</p>
          {locked.skus.map((skuId) => {
            const sku = SKUS[skuId as keyof typeof SKUS]
            if (!sku) return null
            // ★ 直连收银台（2026-10-18 修复）：不再绕价格页；returnTo=/reports 付完回我的报告
            return (
              <div key={skuId} className="max-w-xs mx-auto mb-2">
                <CheckoutButton sku={sku.id} available requireChart={false} returnTo="/reports">
                  解锁 {sku.name} {formatPriceUSD(sku.priceUSD)}
                </CheckoutButton>
              </div>
            )
          })}
        </div>
      )}
      {ai && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-sky-900">深度解读 · {aiSource}</h2>
          {/* ★ 规则版兜底出口（2026-10-18 退款事故）：AI 重写全文、覆盖原报告，不额外收费 */}
          {ruleVersion && onRegen && (
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onRegen}
                disabled={regenBusy}
                className="px-4 py-1.5 rounded-full border border-gold/20 bg-white text-sm font-medium text-ink hover:border-ink transition disabled:opacity-50"
              >
                {regenBusy ? '重新生成中...' : '免费重新生成'}
              </button>
              <span className="text-xs text-ink-light/50">不额外收费 · AI 将重写全文并覆盖本报告</span>
            </div>
          )}
          {([
            ['方位总论', ai.overview],
            ['现居城市影响', ai.currentCity],
            ['财富之城', ai.wealth],
            ['事业之城', ai.career],
            ['贵人之城', ai.patron],
            ['安居之城', ai.home],
            ['才华之城', ai.talent],
            ['迁居开运', ai.advice]
          ] as [string, string][]).filter(([, text]) => text).map(([title, text]) => (
            <div key={title} className="paper-card rounded-lg p-4">
              <h3 className="font-semibold text-sky-800 mb-2">{title}</h3>
              <p className="text-sm text-ink/70 leading-relaxed whitespace-pre-line">{text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
