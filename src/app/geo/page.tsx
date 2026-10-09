'use client'

import { useMemo, useRef, useState } from 'react'
import { geoMercator, geoPath, geoGraticule10 } from 'd3-geo'
import type { FeatureCollection, Geometry } from 'geojson'
import Nav from '@/components/Nav'
import citiesData from '@/data/geo-cities.json'
import { cities as allCities } from '@/lib/birthCities'
import BirthPlacePicker from '@/components/BirthPlacePicker'
import type { BirthPlaceValue } from '@/components/BirthPlacePicker'
import { loadWorldData, searchCities } from '@/lib/worldCitiesClient'
import worldData from '@/data/world-countries.json'
import type { GeoAnalysis, CategoryResult, GeoCityHit } from '@/lib/geo'
import type { GeoAIReport } from '@/lib/aiGeo'

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
      className="absolute z-10 w-[230px] rounded-lg bg-white shadow-lg border border-gray-200 p-3 text-xs"
      style={{
        left: x,
        top: y,
        transform: `translate(-50%, ${below ? '12px' : 'calc(-100% - 12px)'})`
      }}
    >
      <button onClick={onClose}
        className="absolute top-1 right-2 text-gray-400 hover:text-gray-600">×</button>
      <div className="font-bold pr-4" style={{ color: cat.color }}>
        {cat.icon} {cat.label} · {c.name}
      </div>
      <div className="text-gray-500 mt-1">
        {c.region}　方位{c.fangLabel}（五行{c.menWx}{c.menWx !== c.fangWx ? `，卦位${c.fangWx}` : ''}）
        {c.diqi ? <>　地气{c.diqi}（产品设定）</> : ''}
      </div>
      <div className="font-semibold mt-1">
        影响指数 {c.score}（{c.impact}）
      </div>
      <div className="text-gray-600 mt-1.5 leading-relaxed">{c.reasons[0]}</div>
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
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="font-semibold mb-3" style={{ color: cat.color }}>
        {cat.icon} {cat.label}
        <span className="text-xs text-gray-400 font-normal ml-2">
          目标{cat.targetGod} · {cat.targetWx}
        </span>
      </h3>
      <div className="space-y-3">
        {cat.notice && cat.cities.length < 6 && (
          <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-3">
            {cat.notice}
          </div>
        )}
        {cat.cities.map((c) => (
          <div key={c.name} className="rounded-md border border-gray-200 p-3">
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="font-bold text-gray-800">{c.name}</span>
              <span className="text-xs text-gray-400">{c.region}</span>
              <span className="text-xs px-2 py-0.5 rounded-full text-white ml-auto"
                style={{ background: cat.color }}>
                {c.score}分 · {c.impact}
              </span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              方位{c.fangLabel}（五行{c.menWx}{c.menWx !== c.fangWx ? `，卦位${c.fangWx}` : ''}）{c.diqi ? ` · 地气${c.diqi}（产品设定）` : ''}
            </div>
            <ul className="mt-2 space-y-1">
              {c.reasons.map((r, i) => (
                <li key={i} className="text-sm text-gray-600 flex gap-1.5">
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

// ---------- 现居城市搜索选择（全球库 3.2 万城；替代旧 380 城下拉） ----------
function CurrentCitySelect({ value, onChange }: {
  value: string          // 选中城市的 cityId（'' = 不评估）
  onChange: (id: string) => void
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [hits, setHits] = useState<Array<{ id: string; label: string }>>([])
  const [selectedLabel, setSelectedLabel] = useState('')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 输入防抖搜索（数据首次访问时懒加载）
  const onInput = (q: string) => {
    setQuery(q)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      if (q.trim().length < 1) { setHits([]); return }
      const world = await loadWorldData()
      setHits(searchCities(world, q, 20).map(h => ({ id: h.city.id, label: h.label })))
    }, 150)
  }

  if (value) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 border border-sky-300 rounded-md bg-sky-50 text-sm">
        <span className="flex-1 truncate text-sky-900">{selectedLabel || value}</span>
        <button type="button" className="text-gray-400 hover:text-red-500"
          onClick={() => { onChange(''); setQuery(''); setSelectedLabel('') }}>
          ✕
        </button>
      </div>
    )
  }

  return (
    <div className="relative">
      <input
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
        placeholder="输入城市名搜索（中文/英文，全球城市）"
        value={query}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onChange={(e) => { onInput(e.target.value); setOpen(true) }}
      />
      {open && hits.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full max-h-64 overflow-auto bg-white border border-gray-200 rounded-md shadow-lg text-sm">
          {hits.map(h => (
            <li key={h.id}
              className="px-3 py-2 cursor-pointer hover:bg-sky-50"
              onMouseDown={() => {
                onChange(h.id)
                setSelectedLabel(h.label)
                setQuery('')
                setHits([])
                setOpen(false)
              }}>
              {h.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ---------- 主页面 ----------
export default function GeoPage() {
  const [formData, setFormData] = useState({
    year: '', month: '', day: '', hour: '', minute: '', gender: 1 as 1 | 0,
    currentCityId: ''   // 现居城市 cityId（全球库；'' = 不评估）
  })
  const [birth, setBirth] = useState<BirthPlaceValue>({ mode: 'none' })
  const [loading, setLoading] = useState(false)
  const [geo, setGeo] = useState<GeoAnalysis | null>(null)
  const [solar, setSolar] = useState<{
    offsetMin: number; zone: string; dstNotice: string | null
  } | null>(null)
  const [ai, setAi] = useState<GeoAIReport | null>(null)
  const [aiSource, setAiSource] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/geo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year: parseInt(formData.year),
          month: parseInt(formData.month),
          day: parseInt(formData.day),
          hour: parseInt(formData.hour),
          minute: formData.minute === '' ? 0 : parseInt(formData.minute),
          gender: formData.gender,
          // 现居城市（可选）
          ...(formData.currentCityId ? { currentCityId: formData.currentCityId } : {}),
          // 出生地：城市 → birthCityId（方位分析仅城市可用）；它 → birthZone
          ...(birth.mode === 'city'
            ? { birthCityId: birth.cityId }
            : birth.mode === 'zone'
              ? { birthZone: birth.zone, birthLng: birth.lng }
              : {})
        })
      })
      const data = await res.json()
      if (data.success) {
        setGeo(data.data.geo)
        setSolar(data.data.trueSolar)
        setAi(data.data.ai)
        setAiSource(data.data.aiSource)
      } else {
        setError(data.error || '解析失败')
      }
    } catch {
      setError('网络错误')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-50 to-white">
      <Nav />
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-10">
          <h1 className="text-4xl font-bold text-sky-900 mb-2">方位地理 · 城市解析</h1>
          <p className="text-gray-600">财富之城 · 事业之城 · 贵人之城 · 才华之城，按相对出生地的方位推荐城市</p>
          <p className="text-xs text-gray-400 mt-2">
            说明：候选以「方位五行」（城市相对命主出生地实时计算，传统方位之说）为门控；城市地气（物产取象）为本产品工程化设定，非古籍依据，仅供趋避参考
          </p>
        </header>

        {/* 表单 */}
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6 mb-10">
          <h2 className="text-xl font-semibold mb-6 text-center text-sky-800">填写出生信息</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">年</label>
                <input type="number" required placeholder="1990"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">月</label>
                <input type="number" required min="1" max="12" placeholder="5"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                  value={formData.month}
                  onChange={(e) => setFormData({ ...formData, month: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">日</label>
                <input type="number" required min="1" max="31" placeholder="8"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                  value={formData.day}
                  onChange={(e) => setFormData({ ...formData, day: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">时</label>
                <input type="number" required min="0" max="23" placeholder="16"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                  value={formData.hour}
                  onChange={(e) => setFormData({ ...formData, hour: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">分</label>
                <input type="number" min="0" max="59" placeholder="30"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                  value={formData.minute}
                  onChange={(e) => setFormData({ ...formData, minute: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">性别</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: parseInt(e.target.value) as 1 | 0 })}
                >
                  <option value={1}>男</option>
                  <option value={0}>女</option>
                </select>
              </div>
            </div>
            <BirthPlacePicker value={birth} onChange={setBirth} accent="sky" />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">现居城市（可选，评估当前居住地的影响）</label>
              <CurrentCitySelect
                value={formData.currentCityId}
                onChange={(id) => setFormData({ ...formData, currentCityId: id })}
              />
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-sky-600 text-white py-3 rounded-md font-semibold hover:bg-sky-700 transition disabled:opacity-50">
              {loading ? '方位解析中...' : '开始城市解析'}
            </button>
            {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
          </form>
          <p className="text-xs text-gray-500 text-center mt-4">结果仅供参考，福地福人居，个人努力为本</p>
        </div>

        {/* 结果 */}
        {geo && (
          <div className="space-y-6">
            {/* 喜忌摘要 */}
            <div className="bg-white rounded-lg shadow p-4">
              <div className="grid md:grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">日主：</span>
                  <span className="font-medium">{geo.dayMaster}（{geo.dayWx}）· {geo.wangShuai}</span>
                </div>
                <div>
                  <span className="text-gray-500">喜用五行：</span>
                  <span className="text-green-700 font-medium">{geo.favorableWx.join('、')}</span>
                </div>
                <div>
                  <span className="text-gray-500">宜行方位：</span>
                  <span className="text-green-700">{geo.favorableDirections.join('、')}</span>
                </div>
                <div>
                  <span className="text-gray-500">忌行方位：</span>
                  <span className="text-red-600">{geo.unfavorableDirections.join('、')}</span>
                </div>
              </div>
              {solar && (
                <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-600">
                  真太阳时 {solar.offsetMin >= 0 ? '+' : ''}{solar.offsetMin} 分钟（{solar.zone}）
                  {solar.dstNotice && (
                    <span className="ml-2 text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                      {solar.dstNotice}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* 现居城市影响 */}
            {geo.currentCity && (
              <div className="bg-white rounded-lg shadow p-4 border-l-4" style={{ borderColor: geo.currentCity.level === '吉' ? '#059669' : geo.currentCity.level === '忌' ? '#dc2626' : '#d97706' }}>
                <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                  <h2 className="font-semibold text-sky-800">现居城市 · {geo.currentCity.name}</h2>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[11px] rounded px-2 py-0.5 border ${
                      geo.currentCity.level === '吉'
                        ? 'bg-green-50 border-green-200 text-green-700'
                        : geo.currentCity.level === '忌'
                          ? 'bg-red-50 border-red-200 text-red-700'
                          : 'bg-amber-50 border-amber-200 text-amber-700'
                    }`}>{geo.currentCity.level}</span>
                    <span className="text-[11px] rounded px-2 py-0.5 bg-sky-50 border border-sky-200 text-sky-700">
                      影响指数 {geo.currentCity.score} · {geo.currentCity.impact}
                    </span>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-2 text-sm mb-3">
                  <div>
                    <span className="text-gray-500">主判五行：</span>
                    {geo.currentCity.primaryWx ? (
                      <>
                        <span className="font-medium">{geo.currentCity.primaryWx}</span>
                        <span className="text-[11px] text-gray-500">（来源：{geo.currentCity.primarySource}）</span>
                        <span className="text-gray-500 ml-2">与日主关系：</span>
                        <span className="font-medium">{geo.currentCity.godRelation}</span>
                        <span className={`ml-1 ${geo.currentCity.favorable ? 'text-green-700' : 'text-red-600'}`}>
                          （{geo.currentCity.favorable ? '喜用' : '忌神'}）
                        </span>
                      </>
                    ) : <span className="text-gray-400">资料不足，无法判定</span>}
                  </div>
                  <div className="text-gray-600">
                    {geo.currentCity.fangWx
                      ? <>相对出生地：{geo.currentCity.fangLabel}（约 {geo.currentCity.distanceKm} 公里）</>
                      : geo.currentCity.center
                        ? '与出生地同城近距，按中央土论'
                        : '未提供出生地，不论相对方位'}
                  </div>
                </div>
                <div className="text-sm text-gray-700 space-y-1 mb-3">
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
                <p className="text-[11px] text-gray-400 mt-2">
                  地气影响是长期渐染的过程，以上为趋势参考；福地福人居，心态与努力为本
                </p>
              </div>
            )}

            {/* 地图 */}
            <div className="bg-white rounded-lg shadow p-3 md:p-4">
              <h2 className="font-semibold text-sky-800 mb-3">命主方位地图</h2>
              <GeoMap geo={geo} />
              <div className="flex flex-wrap gap-3 mt-3 text-xs text-gray-500">
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

            {/* AI 解读 */}
            {ai && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-sky-900">深度解读 · {aiSource}</h2>
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
                  <div key={title} className="bg-white rounded-lg shadow p-4">
                    <h3 className="font-semibold text-sky-800 mb-2">{title}</h3>
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
