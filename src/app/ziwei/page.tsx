'use client'

import { useState } from 'react'
import Nav from '@/components/Nav'
import BirthPlacePicker from '@/components/BirthPlacePicker'
import type { BirthPlaceValue } from '@/components/BirthPlacePicker'
import ZiweiResultView from '@/components/reports/ZiweiResultView'
import type { ZiweiResultData } from '@/components/reports/ZiweiResultView'
import { getAuthToken } from '@/lib/authToken'

export default function ZiweiPage() {
  const [formData, setFormData] = useState({
    year: '', month: '', day: '', hour: '', minute: '', gender: 1 as 1 | 0
  })
  const [birth, setBirth] = useState<BirthPlaceValue>({ mode: 'none' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState<ZiweiResultData | null>(null)
  // 报告资产：saved=true 已入账户；false=游客（提示登录后可保存）
  const [saved, setSaved] = useState<boolean | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSaved(null)
    try {
      const token = await getAuthToken()
      const res = await fetch('/api/ziwei', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          year: parseInt(formData.year),
          month: parseInt(formData.month),
          day: parseInt(formData.day),
          hour: parseInt(formData.hour),
          minute: formData.minute === '' ? 0 : parseInt(formData.minute),
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
        setData(json.data as ZiweiResultData)
        setSaved(!!json.reportId)
      } else {
        setError(json.error || '排盘失败')
      }
    } catch {
      setError('网络错误')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen">
      <Nav />
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-10">
          <h1 className="text-4xl font-serif-sc font-bold text-ink mb-2">紫微斗数</h1>
          <p className="text-ink-light">十四主星 · 四化飞星 · 十二宫命理分析</p>
        </header>

        {/* 输入表单 */}
        <div className="max-w-md mx-auto paper-card rounded-xl p-6 mb-10">
          <h2 className="text-xl font-serif-sc font-semibold mb-6 text-center text-ink">填写出生信息</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-ink/70 mb-1">年</label>
                <input type="number" required placeholder="1990"
                  className="w-full px-3 py-2 border border-gold/20 rounded-md focus:outline-none focus:ring-2 focus:ring-cinnabar/40"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink/70 mb-1">月</label>
                <input type="number" required min="1" max="12" placeholder="5"
                  className="w-full px-3 py-2 border border-gold/20 rounded-md focus:outline-none focus:ring-2 focus:ring-cinnabar/40"
                  value={formData.month}
                  onChange={(e) => setFormData({ ...formData, month: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-ink/70 mb-1">日</label>
                <input type="number" required min="1" max="31" placeholder="8"
                  className="w-full px-3 py-2 border border-gold/20 rounded-md focus:outline-none focus:ring-2 focus:ring-cinnabar/40"
                  value={formData.day}
                  onChange={(e) => setFormData({ ...formData, day: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink/70 mb-1">时</label>
                <input type="number" required min="0" max="23" placeholder="16"
                  className="w-full px-3 py-2 border border-gold/20 rounded-md focus:outline-none focus:ring-2 focus:ring-cinnabar/40"
                  value={formData.hour}
                  onChange={(e) => setFormData({ ...formData, hour: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-ink/70 mb-1">分</label>
                <input type="number" min="0" max="59" placeholder="30"
                  className="w-full px-3 py-2 border border-gold/20 rounded-md focus:outline-none focus:ring-2 focus:ring-cinnabar/40"
                  value={formData.minute}
                  onChange={(e) => setFormData({ ...formData, minute: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink/70 mb-1">性别</label>
                <select
                  className="w-full px-3 py-2 border border-gold/20 rounded-md focus:outline-none focus:ring-2 focus:ring-cinnabar/40"
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: parseInt(e.target.value) as 1 | 0 })}
                >
                  <option value={1}>男</option>
                  <option value={0}>女</option>
                </select>
              </div>
            </div>
            <BirthPlacePicker value={birth} onChange={setBirth} accent="purple" />

            <button type="submit" disabled={loading}
              className="w-full seal-btn py-3 rounded-md font-semibold disabled:opacity-50">
              {loading ? '排盘分析中...' : '开始紫微分析'}
            </button>
            {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
          </form>
          <p className="text-xs text-ink-light/60 text-center mt-4">紫微斗数排盘以农历出生时辰为准，结果仅供参考</p>
          <p className="text-[11px] text-ink-light/40 text-center mt-2">若选项内无法找到出生城市，可选「其它」手动指定时区。</p>
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
              <p className="text-xs text-ink-light/60 bg-paper-dark/30 border border-gold/15 rounded px-3 py-2 mb-4">
                登录后生成结果可保存到「我的报告」，随时回看
              </p>
            ) : null}
            <ZiweiResultView data={data} />
          </div>
        )}
      </div>
    </main>
  )
}
