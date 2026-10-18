'use client'

// ★ 紫微斗数页（2026-10-17 风格统一）：接入 hw- 设计语言（同 daily/hemun/pricing 三页做法）
// 纪律：只换外壳；排盘逻辑、/api/ziwei 载荷、BirthPlacePicker、ZiweiResultView（十二宫盘 +
//       命宫红标 + 中宫五行局/命主身主）全部不动；免责与口径文案逐字保留。
import { useState } from 'react'
import Link from 'next/link'
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
    await runGenerate()
  }

  // ★ 生成/重新生成共用同一入口（2026-10-18 退款事故）：同要素重调 AI，结果按同一 cacheKey
  //   覆盖写（不新增报告行、重复点击不堆积）；规则版兜底时用户据此免费重写，不必要求退款。
  const runGenerate = async () => {
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
    <div className="hw-page">
      <Nav />
      <main className="hw-wrap hw-c-pg">
        <Link href="/" className="hw-c-back">‹ 首页</Link>
        <header>
          <h1 className="hw-c-h1">紫微斗数</h1>
          <p className="hw-lede">十四主星 · 四化飞星 · 十二宫命理分析</p>
        </header>

        {/* 输入表单 */}
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
              <BirthPlacePicker value={birth} onChange={setBirth} accent="purple" />
            </div>
            <p className="mt-4 text-center">
              <button type="submit" disabled={loading} className="hw-c-btnBig">
                {loading ? '排盘分析中...' : '开始紫微分析'}
              </button>
            </p>
            {error && <p className="hw-c-err text-center">{error}</p>}
          </div>
          <p className="hw-note text-center">紫微斗数排盘以农历出生时辰为准，结果仅供参考</p>
          <p className="hw-note text-center">若选项内无法找到出生城市，可选「其它」手动指定时区。</p>
        </form>

        {/* 结果区 */}
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
            <ZiweiResultView data={data} onRegen={() => runGenerate()} regenBusy={loading} />
          </div>
        )}
      </main>
    </div>
  )
}
