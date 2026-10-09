'use client'

import { useState } from 'react'
import Nav from '@/components/Nav'
import BirthPlacePicker from '@/components/BirthPlacePicker'
import type { BirthPlaceValue } from '@/components/BirthPlacePicker'
import LiunianResultView from '@/components/reports/LiunianResultView'
import type { LiunianResultData } from '@/components/reports/LiunianResultView'
import { getAuthToken } from '@/lib/authToken'
import { SKUS, formatPriceUSD } from '@/lib/pricing'

// 目标流年选项：今年/明年/后年（与 route 校验口径一致）
function yearOptions(): Array<{ year: number; label: string; note: string }> {
  const y = new Date().getFullYear()
  const gz = (yy: number) => {
    // 干支显示用同一 lunar 链路在前端的简化：直接用 60 甲子序（4 甲子年起）
    const names = ['甲子', '乙丑', '丙寅', '丁卯', '戊辰', '己巳', '庚午', '辛未', '壬申', '癸酉',
      '甲戌', '乙亥', '丙子', '丁丑', '戊寅', '己卯', '庚辰', '辛巳', '壬午', '癸未',
      '甲申', '乙酉', '丙戌', '丁亥', '戊子', '己丑', '庚寅', '辛卯', '壬辰', '癸巳',
      '甲午', '乙未', '丙申', '丁酉', '戊戌', '己亥', '庚子', '辛丑', '壬寅', '癸卯',
      '甲辰', '乙巳', '丙午', '丁未', '戊申', '己酉', '庚戌', '辛亥', '壬子', '癸丑',
      '甲寅', '乙卯', '丙辰', '丁巳', '戊午', '己未', '庚申', '辛酉', '壬戌', '癸亥']
    return names[(yy - 4) % 60]
  }
  return [
    { year: y, label: `${y}年（${gz(y)}）· 今年`, note: '含流月节奏' },
    { year: y + 1, label: `${y + 1}年（${gz(y + 1)}）· 明年`, note: '全年四维度' },
    { year: y + 2, label: `${y + 2}年（${gz(y + 2)}）· 后年`, note: '全年四维度' }
  ]
}

export default function LiunianPage() {
  const [formData, setFormData] = useState({
    year: '', month: '', day: '', hour: '', minute: '', gender: 1 as 1 | 0
  })
  const [birth, setBirth] = useState<BirthPlaceValue>({ mode: 'none' })
  const [targetYear, setTargetYear] = useState<number>(new Date().getFullYear())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState<LiunianResultData | null>(null)
  // 报告资产：saved=true 已入账户；false=游客（提示登录后可保存）
  const [saved, setSaved] = useState<boolean | null>(null)

  const options = yearOptions()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSaved(null)
    try {
      const token = await getAuthToken()
      const res = await fetch('/api/liunian', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year: parseInt(formData.year),
          month: parseInt(formData.month),
          day: parseInt(formData.day),
          hour: parseInt(formData.hour),
          minute: formData.minute === '' ? 0 : parseInt(formData.minute),
          gender: formData.gender,
          targetYear,
          // 出生地：城市 → birthCityId；其它 → birthZone（进阶经度 birthLng）
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
      } else {
        setError(json.error || '年运报告生成失败')
      }
    } catch {
      setError('网络错误')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-rose-50 to-white">
      <Nav />
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-10">
          <h1 className="text-4xl font-bold text-rose-900 mb-2">年运报告 · 流年详批</h1>
          <p className="text-gray-600">流年干支十神与原局冲合，事业/财运/感情/健康分维度深度解读</p>
          <p className="text-xs text-gray-400 mt-2">
            说明：流年事实（干支、十神、冲合、倾向标签）由规则引擎确定性计算，AI 仅据事实撰写解读；倾向性参考，非确定性结论
          </p>
        </header>

        {/* 表单 */}
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6 mb-10">
          <h2 className="text-xl font-semibold mb-6 text-center text-rose-800">填写出生信息</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">年</label>
                <input type="number" required placeholder="1990"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">月</label>
                <input type="number" required min="1" max="12" placeholder="5"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500"
                  value={formData.month}
                  onChange={(e) => setFormData({ ...formData, month: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">日</label>
                <input type="number" required min="1" max="31" placeholder="8"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500"
                  value={formData.day}
                  onChange={(e) => setFormData({ ...formData, day: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">时</label>
                <input type="number" required min="0" max="23" placeholder="16"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500"
                  value={formData.hour}
                  onChange={(e) => setFormData({ ...formData, hour: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">分</label>
                <input type="number" min="0" max="59" placeholder="30"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500"
                  value={formData.minute}
                  onChange={(e) => setFormData({ ...formData, minute: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">性别</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500"
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: parseInt(e.target.value) as 1 | 0 })}
                >
                  <option value={1}>男</option>
                  <option value={0}>女</option>
                </select>
              </div>
            </div>
            <BirthPlacePicker value={birth} onChange={setBirth} accent="rose" />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">目标流年</label>
              <div className="grid grid-cols-3 gap-2">
                {options.map(o => (
                  <button
                    key={o.year}
                    type="button"
                    onClick={() => setTargetYear(o.year)}
                    className={`px-2 py-2 rounded-md border text-sm transition ${
                      targetYear === o.year
                        ? 'border-rose-600 bg-rose-600 text-white font-semibold'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-rose-400'
                    }`}
                  >
                    <span className="block">{o.label}</span>
                    <span className={`block text-[10px] mt-0.5 ${targetYear === o.year ? 'text-rose-100' : 'text-gray-400'}`}>
                      {o.note}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-rose-600 text-white py-3 rounded-md font-semibold hover:bg-rose-700 transition disabled:opacity-50">
              {loading ? '流年详批生成中（约30秒）...' : '生成年运报告'}
            </button>
            {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
          </form>
          <p className="text-xs text-gray-500 text-center mt-4">
            内测期免费体验 · 正式开放后 {formatPriceUSD(SKUS.annual_report.priceUSD)}/次（会员不含报告）
          </p>
        </div>

        {/* 结果区 */}
        {data && (
          <div>
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
            <LiunianResultView data={data} />
          </div>
        )}
      </div>
    </main>
  )
}
