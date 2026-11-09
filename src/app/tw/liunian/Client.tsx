'use client'

// 繁體年運報告生成器（2026-11-08）：補上「重新生成」在繁體樹內的真實落點。
// 背景：/tw/liunian 過去只有入口頁，重新生成會被引到首頁排盤；本檔沿用簡體頁同型表單與
//       LiunianResultView（locale=zh-Hant），文案經 hant.ts 轉換，不新造承諾。
import { useState } from 'react'
import Link from 'next/link'
import BirthPlacePicker from '@/components/BirthPlacePicker'
import type { BirthPlaceValue } from '@/components/BirthPlacePicker'
import LiunianResultView from '@/components/reports/LiunianResultView'
import type { LiunianResultData } from '@/components/reports/LiunianResultView'
import { getAuthToken } from '@/lib/authToken'
import { isReportPaid } from '@/lib/reportAccess'
import { SKUS, formatPriceUSD } from '@/lib/pricing'
import { toHant } from '@/lib/hant'

const H = (s: string) => toHant(s)

function yearOptions(): Array<{ year: number; label: string; note: string }> {
  const y = new Date().getFullYear()
  const gz = (yy: number) => {
    const names = ['甲子', '乙丑', '丙寅', '丁卯', '戊辰', '己巳', '庚午', '辛未', '壬申', '癸酉',
      '甲戌', '乙亥', '丙子', '丁丑', '戊寅', '己卯', '庚辰', '辛巳', '壬午', '癸未',
      '甲申', '乙酉', '丙戌', '丁亥', '戊子', '己丑', '庚寅', '辛卯', '壬辰', '癸巳',
      '甲午', '乙未', '丙申', '丁酉', '戊戌', '己亥', '庚子', '辛丑', '壬寅', '癸卯',
      '甲辰', '乙巳', '丙午', '丁未', '戊申', '己酉', '庚戌', '辛亥', '壬子', '癸丑',
      '甲寅', '乙卯', '丙辰', '丁巳', '戊午', '己未', '庚申', '辛酉', '壬戌', '癸亥']
    return names[(yy - 4) % 60]
  }
  return [
    { year: y, label: `${y}年（${gz(y)}）· 今年`, note: '含流月節奏' },
    { year: y + 1, label: `${y + 1}年（${gz(y + 1)}）· 明年`, note: '四維度 + 流月節奏' },
    { year: y + 2, label: `${y + 2}年（${gz(y + 2)}）· 後年`, note: '四維度 + 流月節奏' }
  ]
}

export default function HantLiunianClient() {
  const [formData, setFormData] = useState({
    year: '', month: '', day: '', hour: '', minute: '', gender: 1 as 1 | 0
  })
  const [birth, setBirth] = useState<BirthPlaceValue>({ mode: 'none' })
  const [targetYear, setTargetYear] = useState<number>(new Date().getFullYear())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState<LiunianResultData | null>(null)
  const [saved, setSaved] = useState<boolean | null>(null)
  const [reportId, setReportId] = useState<string | null>(null)

  const options = yearOptions()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await runGenerate(false)
  }

  const runGenerate = async (force: boolean) => {
    setLoading(true)
    setError('')
    setSaved(null)
    setReportId(null)
    try {
      const token = await getAuthToken()
      const res = await fetch('/api/liunian', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locale: 'zh-Hant',
          year: parseInt(formData.year),
          month: parseInt(formData.month),
          day: parseInt(formData.day),
          hour: parseInt(formData.hour),
          minute: formData.minute === '' ? 0 : parseInt(formData.minute),
          gender: formData.gender,
          targetYear,
          ...(force ? { force: true } : {}),
          ...(force && reportId ? { reportId } : {}),
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
        setData(json.data as LiunianResultData)
        setSaved(!!json.reportId)
        setReportId(typeof json.reportId === 'string' ? json.reportId : null)
      } else {
        setError(json.error || H('年運報告生成失敗'))
      }
    } catch {
      setError(H('網路錯誤'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div id="liunian-generator">
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
            <BirthPlacePicker value={birth} onChange={setBirth} accent="rose" />
          </div>
          <div className="mt-3">
            <label className="hw-f">{H('目標流年')}</label>
            <div className="hw-yr3">
              {options.map(o => (
                <button
                  key={o.year}
                  type="button"
                  aria-pressed={targetYear === o.year}
                  onClick={() => setTargetYear(o.year)}
                >
                  <b>{o.label}</b>
                  <i>{o.note}</i>
                </button>
              ))}
            </div>
          </div>
          <p className="mt-4 text-center">
            <button type="submit" disabled={loading} className="hw-c-btnBig">
              {loading ? H('流年詳批生成中...（通常 30 秒內）') : H('生成年運報告')}
            </button>
          </p>
          {error && <p className="hw-c-err text-center">{error}</p>}
        </div>
        <p className="hw-note text-center">
          {formatPriceUSD(SKUS.annual_report.priceUSD)}{H('/次 · 會員不含報告 · 解鎖後永久回看')}
        </p>
      </form>

      {data && (
        <div className="mt-10">
          {saved === true ? (
            <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2 mb-4">
              {H('✓ 報告已保存到你的帳戶，可在「我的報告」中隨時回看')}
            </p>
          ) : saved === false ? (
            <p className="text-xs text-ink-light bg-paper-dark/30 border border-gold/15 rounded px-3 py-2 mb-4">
              {H('登入後生成的結果可保存到「我的報告」，隨時回看')}
            </p>
          ) : null}
          <LiunianResultView
            data={data}
            reportId={reportId}
            locale="zh-Hant"
            onRegen={isReportPaid('annual', data) ? () => runGenerate(true) : undefined}
            regenBusy={loading}
          />
        </div>
      )}
    </div>
  )
}
