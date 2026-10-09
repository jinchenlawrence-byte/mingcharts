'use client'

import { useState } from 'react'
import Nav from '@/components/Nav'
import BirthPlacePicker from '@/components/BirthPlacePicker'
import type { BirthPlaceValue } from '@/components/BirthPlacePicker'
import type { HemunResult } from '@/lib/hemun'
import type { AIHemunSections } from '@/lib/aiHemun'

// ───────── 类型 ─────────
interface BirthFormState {
  year: string; month: string; day: string
  hour: string; minute: string; gender: 1 | 0
  birth: BirthPlaceValue
}
interface HemunData {
  result: HemunResult
  ai: AIHemunSections
  aiSource: string
  dstNotices: { male: string | null; female: string | null }
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

// ───────── 依据徽章（四类视觉可分）─────────
const BASIS_STYLE: Record<string, string> = {
  '典籍': 'bg-amber-700 text-white border border-amber-700',
  '古法': 'bg-amber-100 text-amber-800 border border-amber-300',
  '民俗': 'bg-white text-gray-600 border border-gray-300',
  '产品设定': 'bg-white text-gray-400 border border-dashed border-gray-300',
}

// ───────── 命盘摘要 ─────────
function ChartBriefCard({ title, b, color, dstNotice }: {
  title: string
  b: HemunResult['male']
  color: string
  dstNotice?: string | null
}) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className={`font-semibold mb-2 ${color}`}>{title}</h3>
      <div className="grid grid-cols-4 gap-1 text-center text-sm mb-2">
        {(['year', 'month', 'day', 'hour'] as const).map((k, i) => (
          <div key={k} className="bg-amber-50 rounded py-1.5">
            <div className="text-[10px] text-gray-400">{['年柱','月柱','日柱','时柱'][i]}</div>
            <div className="font-bold text-amber-800">{b.ganZhi[k]}</div>
          </div>
        ))}
      </div>
      <div className="text-xs text-gray-600 space-y-0.5">
        <div>日主：<span className="font-medium text-gray-800">{b.dayMaster}</span>　旺衰：{b.wangShuai}　格局：{b.geJu}</div>
        <div>年柱纳音：{b.yearNaYin}</div>
      </div>
      {dstNotice && (
        <div className="mt-2 rounded border border-amber-200 bg-amber-50 px-2 py-1.5 text-[11px] text-amber-800">
          ⚠ {dstNotice}
        </div>
      )}
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError(''); setData(null)
    try {
      const res = await fetch('/api/hemun', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          male: personPayload(male),
          female: personPayload(female)
        }),
      })
      const json = await res.json()
      if (json.success) setData(json.data)
      else setError(json.error || '合婚分析失败')
    } catch {
      setError('网络错误，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  const r = data?.result
  const aiSections: Array<{ key: keyof AIHemunSections; name: string }> = [
    { key: 'overview', name: '配对总评' },
    { key: 'shengxiao', name: '生肖年柱' },
    { key: 'rizhu', name: '日柱夫妻宫' },
    { key: 'ouxing', name: '配偶星·感情模式' },
    { key: 'wuxing', name: '五行互补·喜用互助' },
    { key: 'advice', name: '相处建议·流年节奏' },
  ]

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
        {data && r && (
          <div className="mt-10 space-y-6">
            {/* 总观感（主展示，非分数） */}
            <div className="bg-white rounded-xl shadow p-6 text-center">
              <div className="text-xs text-gray-400 mb-1">合婚总观感</div>
              <div className="text-2xl font-bold text-amber-900">{r.overall}</div>
              {r.keyTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3 justify-center">
                  {r.keyTags.map(t => (
                    <span key={t} className="text-xs bg-red-50 text-red-700 border border-red-200 rounded px-2 py-0.5">
                      {t}
                    </span>
                  ))}
                </div>
              )}
              <div className="text-xs text-gray-400 mt-3">
                内部算法参考分 {r.totalScore}（非命理定论，仅供排序调试）
              </div>
              <div className="text-xs text-gray-400 mt-1">
                当前大运：男 {r.currentLuck.male} ／ 女 {r.currentLuck.female}
              </div>
            </div>

            {/* 两盘摘要 */}
            <div className="grid md:grid-cols-2 gap-4">
              <ChartBriefCard title="男方命盘" b={r.male} color="text-blue-700"
                dstNotice={data.dstNotices?.male} />
              <ChartBriefCard title="女方命盘" b={r.female} color="text-rose-700"
                dstNotice={data.dstNotices?.female} />
            </div>

            {/* 维度卡片（分项展示，依据分级） */}
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-amber-900">
                分项维度（{r.dimensions.length} 项 · 依据分级如实标注）
              </h2>
              {r.dimensions.map(d => {
                const levelCls = d.level === '吉'
                  ? 'bg-green-50 border-green-200 text-green-700'
                  : d.level === '忌'
                    ? 'bg-red-50 border-red-200 text-red-700'
                    : 'bg-gray-50 border-gray-200 text-gray-500'
                return (
                  <div key={d.key} className="bg-white rounded-lg shadow p-4">
                    <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
                      <span className="font-semibold text-gray-800">{d.name}</span>
                      {d.key === 'dayun' && (
                        <span className="text-[11px] text-gray-400 font-normal">· 仅示当前节奏，不参与总评</span>
                      )}
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[11px] rounded px-2 py-0.5 ${BASIS_STYLE[d.basis] || ''}`}>
                          {d.basis}
                        </span>
                        <span className={`text-xs border rounded px-2 py-0.5 ${levelCls}`}>
                          {d.level}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-800 mb-2">{d.verdict}</p>
                    {d.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {d.tags.map(t => (
                          <span key={t} className="text-[11px] bg-amber-50 text-amber-700 rounded px-1.5 py-0.5">
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                    <ul className="text-xs text-gray-600 space-y-0.5 list-disc list-inside">
                      {d.facts.map((f, i) => <li key={i}>{f}</li>)}
                    </ul>
                    {d.citations && d.citations.length > 0 && (
                      <p className="text-[11px] text-gray-400 mt-2">依据：{d.citations.join('；')}</p>
                    )}
                  </div>
                )
              })}
            </div>

            {/* AI 深度解读 */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-amber-900">合婚深度解读</h2>
                <span className="text-xs text-gray-400">文字来源：{data.aiSource}</span>
              </div>
              {aiSections.map(s => (
                <div key={s.key} className="bg-white rounded-lg shadow p-4">
                  <h3 className="font-semibold text-amber-800 mb-2">{s.name}</h3>
                  <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                    {data.ai[s.key]}
                  </div>
                </div>
              ))}
            </div>

            {/* 免责声明 */}
            <p className="text-xs text-gray-400 text-center leading-relaxed border-t border-gray-100 pt-4">
              合婚分析为传统命理参考，仅供了解双方性格与相处模式之用。<br />
              婚姻成败在于双方经营，与任何单一命理指标无关。
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
