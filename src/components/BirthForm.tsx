'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { localize } from '@/lib/hant'
import type { SiteLang } from '@/lib/lang'

interface BirthFormProps {
  ctaText?: string
  className?: string
  /** 繁體樹傳 zh-Hant；預設 zh-Hans 保證簡體頁逐字不變 */
  locale?: SiteLang
  /** 排盤結果頁路徑（繁體樹傳 /tw/chart） */
  chartPath?: string
}

/**
 * 可复用的出生信息排盘表单。
 * 提交后调用 /api/paipan，将结果写入 localStorage 并跳转到 /chart（结果页自带付费解锁）。
 */
export default function BirthForm({ ctaText = '开始排盘', className = '', locale = 'zh-Hans', chartPath = '/chart' }: BirthFormProps) {
  const L = (s: string) => localize(s, locale)
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    year: '',
    month: '',
    day: '',
    hour: '',
    minute: '',
    gender: 1,
    birthPlace: '',
  })

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
        }),
      })

      const data = await res.json()
      if (data.success) {
        localStorage.setItem('currentChart', JSON.stringify(data.data))
        router.push(chartPath)
      } else {
        setError(data.error || L('排盘失败，请检查输入'))
      }
    } catch {
      setError(L('网络错误，请稍后重试'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className={`space-y-4 ${className}`}>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-ink/70 mb-1">{L('年')}</label>
          <input
            type="number"
            required
            placeholder="1990"
            className="w-full px-3 py-2 border border-gold/20 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
            value={formData.year}
            onChange={(e) => setFormData({ ...formData, year: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink/70 mb-1">{L('月')}</label>
          <input
            type="number"
            required
            min="1"
            max="12"
            placeholder="5"
            className="w-full px-3 py-2 border border-gold/20 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
            value={formData.month}
            onChange={(e) => setFormData({ ...formData, month: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-ink/70 mb-1">{L('日')}</label>
          <input
            type="number"
            required
            min="1"
            max="31"
            placeholder="8"
            className="w-full px-3 py-2 border border-gold/20 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
            value={formData.day}
            onChange={(e) => setFormData({ ...formData, day: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink/70 mb-1">{L('时')}</label>
          <input
            type="number"
            required
            min="0"
            max="23"
            placeholder="16"
            className="w-full px-3 py-2 border border-gold/20 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
            value={formData.hour}
            onChange={(e) => setFormData({ ...formData, hour: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-ink/70 mb-1">{L('分')}</label>
          <input
            type="number"
            min="0"
            max="59"
            placeholder="30"
            className="w-full px-3 py-2 border border-gold/20 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
            value={formData.minute}
            onChange={(e) => setFormData({ ...formData, minute: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink/70 mb-1">{L('性别')}</label>
          <select
            className="w-full px-3 py-2 border border-gold/20 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
            value={formData.gender}
            onChange={(e) => setFormData({ ...formData, gender: parseInt(e.target.value) as 1 | 0 })}
          >
            <option value={1}>{L('男')}</option>
            <option value={0}>{L('女')}</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-ink/70 mb-1">{L('出生地（可选）')}</label>
        <input
          type="text"
          placeholder={L('如：杭州')}
          className="w-full px-3 py-2 border border-gold/20 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
          value={formData.birthPlace}
          onChange={(e) => setFormData({ ...formData, birthPlace: e.target.value })}
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-amber-600 text-white py-3 rounded-md font-semibold hover:bg-amber-700 transition disabled:opacity-50"
      >
        {loading ? L('排盘中...') : L(ctaText)}
      </button>

      {error && (
        <p className="text-sm text-red-600 text-center">{error}</p>
      )}

      <p className="hw-alert hw-alert--note text-center">
        {L('排盘结果仅供参考娱乐')}
      </p>
    </form>
  )
}
