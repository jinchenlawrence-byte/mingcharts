'use client'

// ★ 年运报告页（2026-10-17 风格统一）：接入 hw- 设计语言（同 daily/hemun/pricing 三页做法）
// 纪律：只换外壳；yearOptions 三档年份（今年/明年/后年）、targetYear、force 重新生成、
//       定价披露（SKUS 单一事实源）、免责说明逐字保留（test-liunian-accept.mjs ④ 守护）。
import { useState } from 'react'
import Link from 'next/link'
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
    await runGenerate(false)
  }

  // 生成/重新生成共用同一入口：force=true 绕过缓存重新调 AI，结果覆盖写同一报告（HANDOFF §四）
  const runGenerate = async (force: boolean) => {
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
          ...(force ? { force: true } : {}),
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
    <div className="hw-page">
      <Nav />
      <main className="hw-wrap hw-c-pg">
        <Link href="/" className="hw-c-back">‹ 首页</Link>
        <header>
          <h1 className="hw-c-h1">年运报告 · 流年详批</h1>
          <p className="hw-lede">流年干支十神与原局冲合，事业/财运/感情/健康分维度深度解读</p>
          <p className="hw-note">
            说明：流年事实（干支、十神、冲合、倾向标签）由规则引擎确定性计算，AI 仅据事实撰写解读；倾向性参考，非确定性结论
          </p>
        </header>

        {/* 表单 */}
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
              <BirthPlacePicker value={birth} onChange={setBirth} accent="rose" />
            </div>
            <div className="mt-3">
              <label className="hw-f">目标流年</label>
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
                {loading ? '流年详批生成中（约30秒）...' : '生成年运报告'}
              </button>
            </p>
            {error && <p className="hw-c-err text-center">{error}</p>}
          </div>
          <p className="hw-note text-center">
            {formatPriceUSD(SKUS.annual_report.priceUSD)}/次 · 会员不含报告 · 解锁后永久回看
          </p>
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
            {/* 重新生成入口（HANDOFF §四）：force=true 绕过缓存重调 AI，覆盖写同一报告不堆积 */}
            <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
              <button
                type="button"
                onClick={() => runGenerate(true)}
                disabled={loading}
                className="px-5 py-2 rounded-full border border-gold/15 bg-white text-sm font-medium hover:border-ink transition disabled:opacity-50"
              >
                重新生成本报告
              </button>
              <span className="text-xs text-ink-light/50">对解读不满意？AI 将重写全文并覆盖原报告</span>
            </div>
            <LiunianResultView data={data} onRegen={() => runGenerate(true)} regenBusy={loading} />
          </div>
        )}
      </main>
    </div>
  )
}
