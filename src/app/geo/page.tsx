'use client'

// ★ 方位地理页（2026-10-17 风格统一）：接入 hw- 设计语言（同 daily/hemun/pricing 三页做法）
// 纪律：只换外壳；/api/geo 载荷（现居城市/出生地三态）、CurrentCitySelect 防抖搜索逻辑、
//       GeoResultView、口径说明与免责文案全部不动（test-entitlement-gate.mjs ① 守护页面薄壳）。
import { useRef, useState } from 'react'
import Link from 'next/link'
import Nav from '@/components/Nav'
import BirthPlacePicker from '@/components/BirthPlacePicker'
import type { BirthPlaceValue } from '@/components/BirthPlacePicker'
import GeoResultView from '@/components/reports/GeoResultView'
import type { GeoResultData } from '@/components/reports/GeoResultView'
import { loadWorldData, searchCities } from '@/lib/worldCitiesClient'
import { getAuthToken } from '@/lib/authToken'

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
      <div className="flex items-center gap-2 px-3 py-2 rounded-[14px] bg-gold/5 border border-gold/15 text-sm">
        <span className="flex-1 truncate text-ink">{selectedLabel || value}</span>
        <button type="button" className="text-ink-light/40 hover:text-red-500"
          onClick={() => { onChange(''); setQuery(''); setSelectedLabel('') }}>
          ✕
        </button>
      </div>
    )
  }

  return (
    <div className="relative">
      <input
        className="hw-c-input"
        placeholder="输入城市名搜索（中文/英文，全球城市）"
        value={query}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onChange={(e) => { onInput(e.target.value); setOpen(true) }}
      />
      {open && hits.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full max-h-64 overflow-auto bg-white border border-gold/15 rounded-[14px] shadow-lg text-sm">
          {hits.map(h => (
            <li key={h.id}
              className="px-3 py-2 cursor-pointer hover:bg-gold/5"
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
  const [data, setData] = useState<GeoResultData | null>(null)
  // 报告资产：saved=true 已入账户；false=游客（提示登录后可保存）
  const [saved, setSaved] = useState<boolean | null>(null)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSaved(null)
    try {
      const token = await getAuthToken()
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
              : {}),
          ...(token ? { token } : {})
        })
      })
      const json = await res.json()
      if (json.success) {
        setData(json.data as GeoResultData)
        setSaved(!!json.reportId)
      } else {
        setError(json.error || '解析失败')
      }
    } catch {
      setError('网络错误')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="hw-page">
      <Nav />
      <main className="hw-wrap hw-c-pg">
        <Link href="/" className="hw-c-back">‹ 首页</Link>
        <header>
          <h1 className="hw-c-h1">方位地理 · 城市解析</h1>
          <p className="hw-lede">财富之城 · 事业之城 · 贵人之城 · 才华之城，按相对出生地的方位推荐城市</p>
          <p className="hw-note">
            说明：候选以「方位五行」（城市相对命主出生地实时计算，传统方位之说）为门控；城市地气（物产取象）为本产品工程化设定，非古籍依据，仅供趋避参考
          </p>
        </header>

        {/* 表单 */}
        <form onSubmit={handleSubmit} className="hw-narrow">
          <div className="hw-c-box">
            <h2 className="hw-c-secTitle">填写出生信息</h2>
            <div className="grid grid-cols-3 gap-2 mb-2">
              <div>
                <label className="hw-f">年</label>
                <input type="number" required placeholder="1990" className="hw-c-input"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: e.target.value })} />
              </div>
              <div>
                <label className="hw-f">月</label>
                <input type="number" required min={1} max={12} placeholder="5" className="hw-c-input"
                  value={formData.month}
                  onChange={(e) => setFormData({ ...formData, month: e.target.value })} />
              </div>
              <div>
                <label className="hw-f">日</label>
                <input type="number" required min={1} max={31} placeholder="8" className="hw-c-input"
                  value={formData.day}
                  onChange={(e) => setFormData({ ...formData, day: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="hw-f">时</label>
                <input type="number" required min={0} max={23} placeholder="16" className="hw-c-input"
                  value={formData.hour}
                  onChange={(e) => setFormData({ ...formData, hour: e.target.value })} />
              </div>
              <div>
                <label className="hw-f">分</label>
                <input type="number" min={0} max={59} placeholder="30" className="hw-c-input"
                  value={formData.minute}
                  onChange={(e) => setFormData({ ...formData, minute: e.target.value })} />
              </div>
              <div>
                <label className="hw-f">性别</label>
                <select className="hw-c-input"
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: parseInt(e.target.value) as 1 | 0 })}
                >
                  <option value={1}>男</option>
                  <option value={0}>女</option>
                </select>
              </div>
            </div>
            <div className="mt-2">
              <BirthPlacePicker value={birth} onChange={setBirth} accent="sky" />
            </div>
            <div className="mt-3">
              <label className="hw-f">现居城市（可选，评估当前居住地的影响）</label>
              <CurrentCitySelect
                value={formData.currentCityId}
                onChange={(id) => setFormData({ ...formData, currentCityId: id })}
              />
            </div>
            <p className="mt-4 text-center">
              <button type="submit" disabled={loading} className="hw-c-btnBig">
                {loading ? '方位解析中...' : '开始城市解析'}
              </button>
            </p>
            {error && <p className="hw-c-err text-center">{error}</p>}
          </div>
          <p className="hw-note text-center">结果仅供参考，福地福人居，个人努力为本</p>
        </form>

        {/* 结果 */}
        {data && (
          <div className="mt-10">
            {/* 资产保存提示 */}
            {saved === true ? (
              <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2 mb-4">
                ✓ 报告已保存到你的账户，可在「我的报告」中随时回看
              </p>
            ) : saved === false ? (
              <p className="text-xs text-ink-light/60 bg-paper-dark/30 border border-gold/15 rounded px-3 py-2 mb-4">
                登录后生成结果可保存到「我的报告」，随时回看
              </p>
            ) : null}
            <GeoResultView data={data} />
          </div>
        )}
      </main>
    </div>
  )
}
