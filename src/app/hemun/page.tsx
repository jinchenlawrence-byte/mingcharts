'use client'

import { useState } from 'react'
import Nav from '@/components/Nav'
import BirthPlacePicker from '@/components/BirthPlacePicker'
import type { BirthPlaceValue } from '@/components/BirthPlacePicker'
import HemunResultView from '@/components/reports/HemunResultView'
import type { HemunData } from '@/components/reports/HemunResultView'
import { getAuthToken } from '@/lib/authToken'

// ───────── 类型 ─────────
interface BirthFormState {
  year: string; month: string; day: string
  hour: string; minute: string; gender: 1 | 0
  birth: BirthPlaceValue
}

const MALE_DEFAULT: BirthFormState = {
  year: '', month: '', day: '', hour: '', minute: '', gender: 1,
  birth: { mode: 'none' }
}
const FEMALE_DEFAULT: BirthFormState = {
  year: '', month: '', day: '', hour: '', minute: '', gender: 0,
  birth: { mode: 'none' }
}

// 提交展平：城市 → birthCityId；其它 → birthZone（进阶经度 birthLng）；none → 不带
function personPayload(p: BirthFormState) {
  const base = {
    year: p.year, month: p.month, day: p.day,
    hour: p.hour, minute: p.minute, gender: p.gender
  }
  if (p.birth.mode === 'city') return { ...base, birthCityId: p.birth.cityId }
  if (p.birth.mode === 'zone') {
    return { ...base, birthZone: p.birth.zone, birthLng: p.birth.lng }
  }
  return base
}

// ───────── 单人输入子表单 ─────────
function PersonFields({
  title, value, onChange, accent,
}: {
  title: string
  value: BirthFormState
  onChange: (v: BirthFormState) => void
  accent: 'blue' | 'rose'
}) {
  const set = (patch: Partial<BirthFormState>) => onChange({ ...value, ...patch })
  const inputCls = 'w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-amber-500'
  const titleCls = accent === 'blue' ? 'text-blue-700' : 'text-rose-700'
  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white">
      <h3 className={`font-semibold mb-3 ${titleCls}`}>{title}</h3>
      <div className="grid grid-cols-3 gap-2 mb-2">
        <div>
          <label className="block text-xs text-gray-500 mb-0.5">年</label>
          <input type="number" required placeholder="1990" className={inputCls}
            value={value.year} onChange={e => set({ year: e.target.value })} />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-0.5">月</label>
          <input type="number" required min={1} max={12} placeholder="5" className={inputCls}
            value={value.month} onChange={e => set({ month: e.target.value })} />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-0.5">日</label>
          <input type="number" required min={1} max={31} placeholder="8" className={inputCls}
            value={value.day} onChange={e => set({ day: e.target.value })} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="block text-xs text-gray-500 mb-0.5">时</label>
          <input type="number" required min={0} max={23} placeholder="16" className={inputCls}
            value={value.hour} onChange={e => set({ hour: e.target.value })} />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-0.5">分</label>
          <input type="number" min={0} max={59} placeholder="30" className={inputCls}
            value={value.minute} onChange={e => set({ minute: e.target.value })} />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-0.5">性别</label>
          <select className={inputCls} value={value.gender}
            onChange={e => set({ gender: parseInt(e.target.value) as 1 | 0 })}>
            <option value={1}>男</option>
            <option value={0}>女</option>
          </select>
        </div>
      </div>

      {/* 出生地（可选；三级级联/搜索，夏令时按日期自动判定） */}
      <div className="mt-2">
        <BirthPlacePicker
          value={value.birth}
          onChange={(b) => set({ birth: b })}
          accent={accent}
        />
      </div>
    </div>
  )
}

// ───────── 主页面 ─────────
export default function HehunPage() {
  const [male, setMale] = useState<BirthFormState>(MALE_DEFAULT)
  const [female, setFemale] = useState<BirthFormState>(FEMALE_DEFAULT)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState<HemunData | null>(null)
  // 报告资产：saved=true 已入账户；false=游客（提示登录后可保存）
  const [saved, setSaved] = useState<boolean | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError(''); setData(null); setSaved(null)
    try {
      const token = await getAuthToken()
      const res = await fetch('/api/hemun', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          male: personPayload(male),
          female: personPayload(female),
          ...(token ? { token } : {})
        }),
      })
      const json = await res.json()
      if (json.success) {
        setData(json.data as HemunData)
        setSaved(!!json.reportId)
      } else {
        setError(json.error || '合婚分析失败')
      }
    } catch {
      setError('网络错误，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50/60 to-white">
      <Nav />
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-bold text-amber-900 mb-2">八字合婚配对</h1>
          <p className="text-gray-600 text-sm">
            输入双方出生信息，以「日柱夫妻宫」为核心，合参年柱生肖、配偶星、五行互补、十神互见与大运节奏
          </p>
        </header>

        <form onSubmit={handleSubmit}>
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <PersonFields title="男方" value={male} onChange={setMale} accent="blue" />
            <PersonFields title="女方" value={female} onChange={setFemale} accent="rose" />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full md:w-96 md:mx-auto md:block bg-amber-600 text-white py-3 rounded-md font-semibold hover:bg-amber-700 transition disabled:opacity-50"
          >
            {loading ? '合婚分析中...' : '开始合婚配对'}
          </button>
          {error && <p className="text-sm text-red-600 text-center mt-3">{error}</p>}
          <p className="text-xs text-gray-400 text-center mt-2">结果仅供参考娱乐，感情经营在人不在命</p>
        </form>

        {/* ── 结果区 ── */}
        {data && (
          <div className="mt-10">
            {/* 资产保存提示 */}
            {saved === true ? (
              <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2 mb-4">
                ✓ 报告已保存到你的账户，可在「我的报告」中随时回看
              </p>
            ) : saved === false ? (
              <p className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded px-3 py-2 mb-4">
                登录后生成结果可保存到「我的报告」，随时回看
              </p>
            ) : null}
            <HemunResultView data={data} />
          </div>
        )}
      </main>
    </div>
  )
}
