'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Nav from '@/components/Nav'
import BirthPlacePicker from '@/components/BirthPlacePicker'
import type { BirthPlaceValue } from '@/components/BirthPlacePicker'

export default function Home() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    year: '',
    month: '',
    day: '',
    hour: '',
    minute: '',
    gender: 1
  })
  const [birth, setBirth] = useState<BirthPlaceValue>({ mode: 'none' })
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    try {
      const res = await fetch('/api/paipan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          year: parseInt(formData.year),
          month: parseInt(formData.month),
          day: parseInt(formData.day),
          hour: parseInt(formData.hour),
          minute: formData.minute === '' ? 0 : parseInt(formData.minute),
          // 出生地：城市 → birthCityId；其它 → birthZone（进阶经度 birthLng）；none → 不带
          ...(birth.mode === 'city'
            ? { birthCityId: birth.cityId }
            : birth.mode === 'zone'
              ? { birthZone: birth.zone, birthLng: birth.lng }
              : {})
        })
      })
      
      const data = await res.json()
      
      if (data.success) {
        // 存储到localStorage，跳转到结果页
        localStorage.setItem('currentChart', JSON.stringify(data.data))
        router.push('/chart')
      } else {
        setError(data.error || '排盘失败')
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
      <div className="container mx-auto px-4 py-10">
        {/* Hero */}
        <header className="text-center mb-12">
          <div className="inline-flex items-center gap-3 mb-3">
            <span className="h-px w-12 bg-gold/40" />
            <span className="text-cinnabar text-sm font-serif-sc tracking-widest">子平六书</span>
            <span className="h-px w-12 bg-gold/40" />
          </div>
          <h1 className="text-5xl font-serif-sc font-bold text-ink mb-3">八字命理</h1>
          <p className="text-ink-light text-base">格局调候 · 神煞长生 · 传统命理分析</p>
        </header>

        {/* 排盘表单 */}
        <div className="max-w-md mx-auto paper-card rounded-xl p-8">
          <h2 className="text-xl font-serif-sc font-semibold mb-6 text-center text-ink flex items-center justify-center gap-2">
            <span className="text-cinnabar">◆</span> 免费排盘
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-ink-light mb-1">年</label>
                <input
                  type="number"
                  required
                  placeholder="1990"
                  className="w-full px-3 py-2 bg-paper-dark/50 border border-gold/20 rounded-md focus:outline-none focus:ring-2 focus:ring-cinnabar/40 focus:border-cinnabar/40 text-ink"
                  value={formData.year}
                  onChange={(e) => setFormData({...formData, year: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-light mb-1">月</label>
                <input
                  type="number"
                  required
                  min="1"
                  max="12"
                  placeholder="5"
                  className="w-full px-3 py-2 bg-paper-dark/50 border border-gold/20 rounded-md focus:outline-none focus:ring-2 focus:ring-cinnabar/40 focus:border-cinnabar/40 text-ink"
                  value={formData.month}
                  onChange={(e) => setFormData({...formData, month: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-ink-light mb-1">日</label>
                <input
                  type="number"
                  required
                  min="1"
                  max="31"
                  placeholder="8"
                  className="w-full px-3 py-2 bg-paper-dark/50 border border-gold/20 rounded-md focus:outline-none focus:ring-2 focus:ring-cinnabar/40 focus:border-cinnabar/40 text-ink"
                  value={formData.day}
                  onChange={(e) => setFormData({...formData, day: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-light mb-1">时</label>
                <input
                  type="number"
                  required
                  min="0"
                  max="23"
                  placeholder="16"
                  className="w-full px-3 py-2 bg-paper-dark/50 border border-gold/20 rounded-md focus:outline-none focus:ring-2 focus:ring-cinnabar/40 focus:border-cinnabar/40 text-ink"
                  value={formData.hour}
                  onChange={(e) => setFormData({...formData, hour: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-ink-light mb-1">分</label>
                <input
                  type="number"
                  min="0"
                  max="59"
                  placeholder="30"
                  className="w-full px-3 py-2 bg-paper-dark/50 border border-gold/20 rounded-md focus:outline-none focus:ring-2 focus:ring-cinnabar/40 focus:border-cinnabar/40 text-ink"
                  value={formData.minute}
                  onChange={(e) => setFormData({...formData, minute: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-light mb-1">性别</label>
                <select
                  className="w-full px-3 py-2 bg-paper-dark/50 border border-gold/20 rounded-md focus:outline-none focus:ring-2 focus:ring-cinnabar/40 focus:border-cinnabar/40 text-ink"
                  value={formData.gender}
                  onChange={(e) => setFormData({...formData, gender: parseInt(e.target.value) as 1 | 0})}
                >
                  <option value={1}>男</option>
                  <option value={0}>女</option>
                </select>
              </div>
            </div>

            <BirthPlacePicker value={birth} onChange={setBirth} />

            <button
              type="submit"
              disabled={loading}
              className="w-full seal-btn py-3 rounded-md font-semibold disabled:opacity-50"
            >
              {loading ? '排盘中...' : '开始排盘'}
            </button>
            {error && <p className="text-sm text-cinnabar mt-2 text-center">{error}</p>}
          </form>

          <div className="gold-divider mt-6" />
          <p className="text-xs text-ink-light/60 text-center mt-4">
            排盘结果仅供参考娱乐
          </p>
          <p className="text-[11px] text-ink-light/40 text-center mt-2">
            若选项内无法找到出生城市，可选「其它」手动指定时区。
          </p>
        </div>

        {/* 功能介绍 */}
        <div className="max-w-6xl mx-auto mt-16 grid sm:grid-cols-2 lg:grid-cols-5 gap-5">
          <div className="paper-card p-6 rounded-xl text-center">
            <div className="text-3xl mb-2">📊</div>
            <h3 className="font-serif-sc font-semibold mb-2 text-ink">基础排盘</h3>
            <p className="text-sm text-ink-light">四柱、十神、藏干、起运，免费查看</p>
          </div>
          <div className="paper-card p-6 rounded-xl text-center">
            <div className="text-3xl mb-2">📖</div>
            <h3 className="font-serif-sc font-semibold mb-2 text-ink">六书详批</h3>
            <p className="text-sm text-ink-light">格局、调候、理气，引用经典原文</p>
          </div>
          <a href="/hemun" className="paper-card p-6 rounded-xl text-center hover:shadow-lg transition-shadow">
            <div className="text-3xl mb-2">💑</div>
            <h3 className="font-serif-sc font-semibold mb-2 text-ink">合婚配对</h3>
            <p className="text-sm text-ink-light">双方命局互动分析，缘分深浅</p>
          </a>
          <a href="/ziwei" className="paper-card p-6 rounded-xl text-center hover:shadow-lg transition-shadow">
            <div className="text-3xl mb-2">🔮</div>
            <h3 className="font-serif-sc font-semibold mb-2 text-ink">紫微斗数</h3>
            <p className="text-sm text-ink-light">十四主星四化，十二宫深度分析</p>
          </a>
          <a href="/geo" className="paper-card p-6 rounded-xl text-center hover:shadow-lg transition-shadow">
            <div className="text-3xl mb-2">🗺️</div>
            <h3 className="font-serif-sc font-semibold mb-2 text-ink">方位城市</h3>
            <p className="text-sm text-ink-light">财富之城事业之城，五行地气解析</p>
          </a>
        </div>

        {/* 快捷入口 */}
        <div className="max-w-4xl mx-auto mt-10">
          <div className="flex items-center justify-center gap-3 mb-6">
            <span className="h-px w-8 bg-gold/30" />
            <h2 className="text-lg font-serif-sc font-bold text-ink">更多命理查询</h2>
            <span className="h-px w-8 bg-gold/30" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <a
              href="/bazi"
              className="paper-card p-5 rounded-xl hover:shadow-lg transition-shadow text-center"
            >
              <div className="text-2xl mb-2">🎂</div>
              <h3 className="font-serif-sc font-semibold text-ink mb-1 text-sm">按出生日期算命</h3>
              <p className="text-xs text-ink-light/60">1950-2010每日八字</p>
            </a>
            <a
              href="/shengxiao"
              className="paper-card p-5 rounded-xl hover:shadow-lg transition-shadow text-center"
            >
              <div className="text-2xl mb-2">🐲</div>
              <h3 className="font-serif-sc font-semibold text-ink mb-1 text-sm">十二生肖运势</h3>
              <p className="text-xs text-ink-light/60">属相配对·流年运势</p>
            </a>
            <a
              href="/jieqi"
              className="paper-card p-5 rounded-xl hover:shadow-lg transition-shadow text-center"
            >
              <div className="text-2xl mb-2">🍃</div>
              <h3 className="font-serif-sc font-semibold text-ink mb-1 text-sm">二十四节气</h3>
              <p className="text-xs text-ink-light/60">月令更替·节气养生</p>
            </a>
            <a
              href="/article"
              className="paper-card p-5 rounded-xl hover:shadow-lg transition-shadow text-center"
            >
              <div className="text-2xl mb-2">📚</div>
              <h3 className="font-serif-sc font-semibold text-ink mb-1 text-sm">命理知识大全</h3>
              <p className="text-xs text-ink-light/60">入门·十神·格局</p>
            </a>
          </div>
        </div>
      </div>
    </main>
  )
}
