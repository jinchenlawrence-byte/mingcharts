'use client'

import { useState } from 'react'
import Link from 'next/link'
import Nav from '@/components/Nav'
import BirthPlacePicker from '@/components/BirthPlacePicker'
import type { BirthPlaceValue } from '@/components/BirthPlacePicker'
import HemunResultView from '@/components/reports/HemunResultView'
import type { HemunData } from '@/components/reports/HemunResultView'
import { getAuthToken } from '@/lib/authToken'
import { isReportPaid } from '@/lib/reportAccess'

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
  const titleCls = accent === 'blue' ? 'text-hw-water' : 'text-hw-fire-ink'
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
          <label className="hw-f">时（选填）</label>
          <input type="number" min={0} max={23} placeholder="可留空" className={inputCls}
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
      <p className="text-xs text-ink-light mt-2">
        不知道出生时辰？可以留空，先看三柱能判断的部分。
        <Link href="/hemun/hour" className="underline underline-offset-4 ml-1">怎么找时辰 ›</Link>
      </p>
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
  /** 本次生成/覆盖的报告 id（传给追问面板做服务端归属校验） */
  const [reportId, setReportId] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setData(null) // 首次生成：先清空旧结果
    await runGenerate()
  }

  // ★ 生成/重新生成共用同一入口（2026-10-18 退款事故）：同要素重调 AI，结果按同一 cacheKey
  //   覆盖写（不新增报告行、重复点击不堆积）；规则版兜底时用户据此免费重写，不必要求退款。
  //   重新生成不清空旧结果（留在屏上，按钮只是 loading），与年运页同型。
  const runGenerate = async (opts?: { regen?: boolean }) => {
    setLoading(true); setError(''); setSaved(null); setReportId(null)
    try {
      const token = await getAuthToken()
      const res = await fetch(opts?.regen ? '/api/hemun?regen=1' : '/api/hemun', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            locale: 'zh-Hans',
          male: personPayload(male),
          female: personPayload(female),
          ...(token ? { token } : {})
        }),
      })
      const json = await res.json()
      if (json.success) {
        setData(json.data as HemunData)
        setSaved(!!json.reportId)
        setReportId(typeof json.reportId === 'string' ? json.reportId : null)
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
    <div className="hw-page hw-report-theme">
      <Nav />
      <main className="hw-wrap hw-c-pg">
        <Link href="/" className="hw-c-back">‹ 首页</Link>
        <header>
          <h1 className="hw-c-h1">八字合婚配对</h1>
          <p className="hw-lede">
            输入双方出生信息，以「日柱夫妻宫」为核心，合参年柱生肖、配偶星、五行互补、十神互见与大运节奏。时辰可以不填，不填时只给三柱能成立的判断。
          </p>
        </header>

        <form id="hemun-form" onSubmit={handleSubmit}>
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
              {loading ? '合婚分析中...（通常 30 秒内）' : '开始合婚配对'}
            </button>
          </p>
          {error && <p className="hw-c-err text-center">{error}</p>}
          <p className="hw-alert hw-alert--note text-center">结果仅供参考娱乐，感情经营在人不在命</p>
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
              <p className="text-xs text-ink-light bg-paper-dark/30 border border-gold/15 rounded px-3 py-2 mb-4">
                登录后生成结果可保存到「我的报告」，随时回看
              </p>
            ) : null}
            {/* 重新生成入口只在 ResultView 内出现（规则版 + 已付费），避免免费试读也显示 */}
            <HemunResultView
              data={data}
              reportId={reportId}
              onRegen={isReportPaid('hemun', data) ? () => runGenerate({ regen: true }) : undefined}
              regenBusy={loading}
            />
          </div>
        )}
      </main>
    </div>
  )
}
