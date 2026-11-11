'use client'

import { useState } from 'react'
import Link from 'next/link'
import BirthPlacePicker from '@/components/BirthPlacePicker'
import type { BirthPlaceValue } from '@/components/BirthPlacePicker'
import HemunResultView from '@/components/reports/HemunResultView'
import type { HemunData } from '@/components/reports/HemunResultView'
import { getAuthToken } from '@/lib/authToken'
import { isReportPaid } from '@/lib/reportAccess'
import { toHant } from '@/lib/hant'

// 八字合婚配對（繁體）：與 /hemun 同構、同功能；AI 全文由 locale=zh-Hant 直出。
// ★ 導航由 /tw 佈局提供。
const H = (s: string) => toHant(s)

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
          <label className="hw-f">{H('年')}</label>
          <input type="number" required placeholder="1990" className={inputCls}
            value={value.year} onChange={e => set({ year: e.target.value })} />
        </div>
        <div>
          <label className="hw-f">{H('月')}</label>
          <input type="number" required min={1} max={12} placeholder="5" className={inputCls}
            value={value.month} onChange={e => set({ month: e.target.value })} />
        </div>
        <div>
          <label className="hw-f">{H('日')}</label>
          <input type="number" required min={1} max={31} placeholder="8" className={inputCls}
            value={value.day} onChange={e => set({ day: e.target.value })} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="hw-f">{H('時（選填）')}</label>
          <input type="number" min={0} max={23} placeholder="16" className={inputCls}
            value={value.hour} onChange={e => set({ hour: e.target.value })} />
        </div>
        <div>
          <label className="hw-f">{H('分')}</label>
          <input type="number" min={0} max={59} placeholder="30" className={inputCls}
            value={value.minute} onChange={e => set({ minute: e.target.value })} />
        </div>
        <div>
          <label className="hw-f">{H('性別')}</label>
          <select className={inputCls} value={value.gender}
            onChange={e => set({ gender: parseInt(e.target.value) as 1 | 0 })}>
            <option value={1}>{H('男')}</option>
            <option value={0}>{H('女')}</option>
          </select>
        </div>
      </div>

      <div className="mt-2">
        <BirthPlacePicker
          value={value.birth}
          onChange={(b) => set({ birth: b })}
          accent={accent}
          locale="zh-Hant"
        />
      </div>
      <p className="text-xs text-ink-light mt-2">
        <Link href="/tw/hemun/hour" className="underline underline-offset-4">{H('不知道出生時辰？怎麼找 ›')}</Link>
      </p>
    </div>
  )
}

export default function HantHemunClient() {
  const [male, setMale] = useState<BirthFormState>(MALE_DEFAULT)
  const [female, setFemale] = useState<BirthFormState>(FEMALE_DEFAULT)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState<HemunData | null>(null)
  const [saved, setSaved] = useState<boolean | null>(null)
  /** 本次生成/覆蓋的報告 id（傳給追問面板做服務端歸屬校驗） */
  const [reportId, setReportId] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setData(null)
    await runGenerate()
  }

  const runGenerate = async (opts?: { regen?: boolean }) => {
    setLoading(true); setError(''); setSaved(null); setReportId(null)
    try {
      const token = await getAuthToken()
      const res = await fetch(opts?.regen ? '/api/hemun?regen=1' : '/api/hemun', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          male: personPayload(male),
          female: personPayload(female),
          locale: 'zh-Hant',
          ...(token ? { token } : {})
        }),
      })
      const json = await res.json()
      if (json.success) {
        setData(json.data as HemunData)
        setSaved(!!json.reportId)
        setReportId(typeof json.reportId === 'string' ? json.reportId : null)
      } else {
        setError(json.error || H('合婚分析失敗'))
      }
    } catch {
      setError(H('網路錯誤，請稍後重試'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="hw-page hw-report-theme">
      <main className="hw-wrap hw-c-pg">
        <Link href="/tw" className="hw-c-back">{H('‹ 首頁')}</Link>
        <header>
          <h1 className="hw-c-h1">{H('八字合婚配對')}</h1>
          <p className="hw-lede">
            {H('輸入雙方出生資訊，以「日柱夫妻宮」為核心，合參年柱生肖、配偶星、五行互補、十神互見與大運節奏')}
          </p>
        </header>

        <form id="hemun-form" onSubmit={handleSubmit}>
          <div className="hw-c-two mb-4">
            <PersonFields title={H('男方')} value={male} onChange={setMale} accent="blue" />
            <PersonFields title={H('女方')} value={female} onChange={setFemale} accent="rose" />
          </div>
          <p className="text-center">
            <button type="submit" disabled={loading} className="hw-c-btnBig">
              {loading ? H('合婚分析中...（通常 30 秒內）') : H('開始合婚配對')}
            </button>
          </p>
          {error && <p className="hw-c-err text-center">{error}</p>}
          <p className="hw-alert hw-alert--note text-center">{H('結果僅供參考娛樂，感情經營在人不在命')}</p>
        </form>

        {data && (
          <div className="mt-10">
            {saved === true ? (
              <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2 mb-4">
                {H('✓ 報告已保存到你的帳戶，可在「我的報告」中隨時回看')}
              </p>
            ) : saved === false ? (
              <p className="text-xs text-ink-light bg-paper-dark/30 border border-gold/15 rounded px-3 py-2 mb-4">
                {H('登入後生成結果可保存到「我的報告」，隨時回看')}
              </p>
            ) : null}
            {/* 重新生成入口只在 ResultView 內出現（規則版 + 已付費），避免免費試讀也顯示 */}
            <HemunResultView
              data={data}
              reportId={reportId}
              onRegen={isReportPaid('hemun', data) ? () => runGenerate({ regen: true }) : undefined}
              regenBusy={loading}
              locale="zh-Hant"
            />
          </div>
        )}
      </main>
    </div>
  )
}
