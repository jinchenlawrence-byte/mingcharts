'use client'

import { useState } from 'react'
import Link from 'next/link'
import BirthPlacePicker from '@/components/BirthPlacePicker'
import type { BirthPlaceValue } from '@/components/BirthPlacePicker'
import ZiweiResultView from '@/components/reports/ZiweiResultView'
import type { ZiweiResultData } from '@/components/reports/ZiweiResultView'
import { getAuthToken } from '@/lib/authToken'
import { isReportPaid } from '@/lib/reportAccess'
import { toHant } from '@/lib/hant'

// 紫微斗數（繁體）：與 /ziwei 同構、同功能；AI 全文由 locale=zh-Hant 直出。
// ★ 導航由 /tw 佈局提供。
const H = (s: string) => toHant(s)

export default function HantZiweiClient() {
  const [formData, setFormData] = useState({
    year: '', month: '', day: '', hour: '', minute: '', gender: 1 as 1 | 0
  })
  const [birth, setBirth] = useState<BirthPlaceValue>({ mode: 'none' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState<ZiweiResultData | null>(null)
  const [saved, setSaved] = useState<boolean | null>(null)
  /** 本次生成/覆蓋的報告 id（傳給追問面板做服務端歸屬校驗） */
  const [reportId, setReportId] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await runGenerate()
  }

  const runGenerate = async (opts?: { regen?: boolean }) => {
    setLoading(true)
    setError('')
    setSaved(null)
    setReportId(null)
    try {
      const token = await getAuthToken()
      const res = await fetch(opts?.regen ? '/api/ziwei?regen=1' : '/api/ziwei', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          year: parseInt(formData.year),
          month: parseInt(formData.month),
          day: parseInt(formData.day),
          hour: parseInt(formData.hour),
          minute: formData.minute === '' ? 0 : parseInt(formData.minute),
          locale: 'zh-Hant',
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
        setData(json.data as ZiweiResultData)
        setSaved(!!json.reportId)
        setReportId(typeof json.reportId === 'string' ? json.reportId : null)
      } else {
        setError(json.error || H('排盤失敗'))
      }
    } catch {
      setError(H('網路錯誤'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="hw-page hw-report-theme">
      <main className="hw-wrap hw-c-pg">
        <Link href="/tw" className="hw-c-back">{H('‹ 首頁')}</Link>
        <header>
          <h1 className="hw-c-h1">{H('紫微斗數')}</h1>
          <p className="hw-lede">{H('十四主星 · 四化飛星 · 十二宮命理分析')}</p>
        </header>

        <form onSubmit={handleSubmit} className="hw-narrow">
          <div className="hw-c-box">
            <h2 className="hw-c-secTitle">{H('填寫出生資訊')}</h2>
            <div className="grid grid-cols-3 gap-2 mb-2">
              <div>
                <label className="hw-f">{H('年')}</label>
                <input type="number" required placeholder="1990" className="hw-c-input"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: e.target.value })} />
              </div>
              <div>
                <label className="hw-f">{H('月')}</label>
                <input type="number" required min={1} max={12} placeholder="5" className="hw-c-input"
                  value={formData.month}
                  onChange={(e) => setFormData({ ...formData, month: e.target.value })} />
              </div>
              <div>
                <label className="hw-f">{H('日')}</label>
                <input type="number" required min={1} max={31} placeholder="8" className="hw-c-input"
                  value={formData.day}
                  onChange={(e) => setFormData({ ...formData, day: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="hw-f">{H('時')}</label>
                <input type="number" required min={0} max={23} placeholder="16" className="hw-c-input"
                  value={formData.hour}
                  onChange={(e) => setFormData({ ...formData, hour: e.target.value })} />
              </div>
              <div>
                <label className="hw-f">{H('分')}</label>
                <input type="number" min={0} max={59} placeholder="30" className="hw-c-input"
                  value={formData.minute}
                  onChange={(e) => setFormData({ ...formData, minute: e.target.value })} />
              </div>
              <div>
                <label className="hw-f">{H('性別')}</label>
                <select className="hw-c-input"
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: parseInt(e.target.value) as 1 | 0 })}
                >
                  <option value={1}>{H('男')}</option>
                  <option value={0}>{H('女')}</option>
                </select>
              </div>
            </div>
            <div className="mt-2">
              <BirthPlacePicker value={birth} onChange={setBirth} accent="purple" locale="zh-Hant" />
            </div>
            <p className="mt-4 text-center">
              <button type="submit" disabled={loading} className="hw-c-btnBig">
                {loading ? H('排盤分析中...') : H('開始紫微分析')}
              </button>
            </p>
            {error && <p className="hw-c-err text-center">{error}</p>}
          </div>
          <p className="hw-alert hw-alert--note text-center">{H('紫微斗數排盤以農曆出生時辰為準，結果僅供參考')}</p>
          <p className="hw-note text-center">{H('若選項內無法找到出生城市，可選「其它」手動指定時區。')}</p>
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
            <ZiweiResultView
              data={data}
              reportId={reportId}
              onRegen={isReportPaid('ziwei', data) ? () => runGenerate({ regen: true }) : undefined}
              regenBusy={loading}
              locale="zh-Hant"
            />
          </div>
        )}
      </main>
    </div>
  )
}
