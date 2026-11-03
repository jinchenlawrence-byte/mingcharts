'use client'

import { useState } from 'react'
import Link from 'next/link'
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
  const inputCls = 'hw-c-input'
  const titleCls = accent === 'blue' ? 'text-[#3a66ff]' : 'text-[#e04a3a]'
  return (
    <div className="hw-c-box">
      <h3 className={`font-semibold mb-3 ${titleCls}`}>{title}</h3>
      <div className="grid grid-cols-3 gap-2 mb-2">
        <div>
          <label className="hw-f">年</label>
          <input type="number" required placeholder="1990" className={inputCls}
            value={value.year} onChange={e => set({ year: e.target.value })} />
        </div>
        <div>
          <label className="hw-f">月</label>
          <input type="number" required min={1} max={12} placeholder="5" className={inputCls}
            value={value.month} onChange={e => set({ month: e.target.value })} />
        </div>
        <div>
          <label className="hw-f">日</label>
          <input type="number" required min={1} max={31} placeholder="8" className={inputCls}
            value={value.day} onChange={e => set({ day: e.target.value })} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="hw-f">时</label>
          <input type="number" required min={0} max={23} placeholder="16" className={inputCls}
            value={value.hour} onChange={e => set({ hour: e.target.value })} />
        </div>
        <div>
          <label className="hw-f">分</label>
          <input type="number" min={0} max={59} placeholder="30" className={inputCls}
            value={value.minute} onChange={e => set({ minute: e.target.value })} />
        </div>
        <div>
          <label className="hw-f">性别</label>
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
    setData(null) // 首次生成：先清空旧结果
    await runGenerate()
  }

  // ★ 生成/重新生成共用同一入口（2026-10-18 退款事故）：同要素重调 AI，结果按同一 cacheKey
  //   覆盖写（不新增报告行、重复点击不堆积）；规则版兜底时用户据此免费重写，不必要求退款。
  //   重新生成不清空旧结果（留在屏上，按钮只是 loading），与年运页同型。
  const runGenerate = async () => {
    setLoading(true); setError(''); setSaved(null)
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
    <div className="hw-page">
      <Nav />
      <main className="hw-wrap hw-c-pg">
        <Link href="/" className="hw-c-back">‹ 首页</Link>
        <header>
          <h1 className="hw-c-h1">八字合婚配对</h1>
          <p className="hw-lede">
            输入双方出生信息，以「日柱夫妻宫」为核心，合参年柱生肖、配偶星、五行互补、十神互见与大运节奏
          </p>
        </header>

        <form onSubmit={handleSubmit}>
          <div className="hw-c-two mb-4">
            <PersonFields title="男方" value={male} onChange={setMale} accent="blue" />
            <PersonFields title="女方" value={female} onChange={setFemale} accent="rose" />
          </div>
          <p className="text-center">
            <button
              type="submit"
              disabled={loading}
              className="hw-c-btnBig"
            >
              {loading ? '合婚分析中...' : '开始合婚配对'}
            </button>
          </p>
          {error && <p className="hw-c-err text-center">{error}</p>}
          <p className="hw-note text-center">结果仅供参考娱乐，感情经营在人不在命</p>
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
              <p className="text-xs text-ink-light/60 bg-paper-dark/30 border border-gold/15 rounded px-3 py-2 mb-4">
                登录后生成结果可保存到「我的报告」，随时回看
              </p>
            ) : null}
            {/* 重新生成入口（与年运页同型）：同要素重调 AI，覆盖写同一报告不堆积 */}
            <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
              <button
                type="button"
                onClick={() => runGenerate()}
                disabled={loading}
                className="px-5 py-2 rounded-full border border-gold/15 bg-white text-sm font-medium hover:border-ink transition disabled:opacity-50"
              >
                重新生成本报告
              </button>
              <span className="text-xs text-ink-light/50">对解读不满意？AI 将重写全文并覆盖原报告</span>
            </div>
            <HemunResultView data={data} onRegen={() => runGenerate()} regenBusy={loading} />
          </div>
        )}
      </main>
    </div>
  )
}
