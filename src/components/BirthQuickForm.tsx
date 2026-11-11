'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { track } from '@/lib/track'
import type { SiteLang } from '@/lib/lang'

const YEARS = Array.from({ length: 101 }, (_, i) => 1920 + i)
const OPTS = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i)

const TEXT: Record<string, { title: string; body: string; year: string; month: string; day: string; male: string; female: string; cta: string; hint: string; loading: string; fail: string; net: string }> = {
  'zh-Hans': {
    title: '先看属于你自己的命盘',
    body: '生肖只是 12 分之一的共性参考。填出生年月日，直接看你本人的四柱与大运。',
    year: '年', month: '月', day: '日', male: '男', female: '女',
    cta: '免费看我的命盘',
    hint: '不知道出生时辰？先按午时（12:00）排，结果页可补。',
    loading: '排盘中...', fail: '排盘失败，请检查输入', net: '网络错误，请稍后重试',
  },
  'zh-Hant': {
    title: '先看屬於你自己的命盤',
    body: '生肖只是 12 分之一的共性參考。填出生年月日，直接看你本人的四柱與大運。',
    year: '年', month: '月', day: '日', male: '男', female: '女',
    cta: '免費看我的命盤',
    hint: '不知道出生時辰？先按午時（12:00）排，結果頁可補。',
    loading: '排盤中...', fail: '排盤失敗，請檢查輸入', net: '網路錯誤，請稍後重試',
  },
  en: {
    title: 'See your own chart first',
    body: 'A zodiac sign is one twelfth of the picture. Enter your birth date to read your own four pillars and luck cycles.',
    year: 'Year', month: 'Month', day: 'Day', male: 'Male', female: 'Female',
    cta: 'See my chart free',
    hint: 'No birth hour? We start at 12:00 — you can refine it on the result page.',
    loading: 'Casting...', fail: 'Failed to cast the chart. Please check your input.', net: 'Network error. Please try again.',
  },
}

/**
 * 生肖流年页首屏排盘入口（2026-11-11）。
 * 只收年/月/日 + 性别：时辰默认午时（12:00），结果页再补 —— 时辰是这一步最大的流失点。
 * 样式全部复用站点既有类（hw-c-box / hw-form / hw-row / hw-sel / hw-seg），不新增视觉规则。
 */
export default function BirthQuickForm({
  locale = 'zh-Hans',
  chartPath = '/chart',
}: {
  locale?: SiteLang
  chartPath?: string
}) {
  const t = TEXT[locale] ?? TEXT['zh-Hans']
  const router = useRouter()
  const now = new Date()
  const [year, setYear] = useState(String(now.getFullYear() - 30))
  const [month, setMonth] = useState('')
  const [day, setDay] = useState('')
  const [gender, setGender] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  // 首个字段改动即视为「首屏入口被使用」：用户可能直接填表而不点按钮，
  // 只靠 paipan_submit 会漏掉填了没提交的人。useRef 保证一次会话只报一次。
  const startedRef = useRef(false)
  const markStart = () => {
    if (startedRef.current) return
    startedRef.current = true
    track('paipan_cta_click', { slot: 'shengxiao_year_top_form', src: window.location.pathname.slice(0, 120) })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!month || !day) {
      setError(t.fail)
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/paipan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locale,
          year: parseInt(year),
          month: parseInt(month),
          day: parseInt(day),
          hour: 12,
          minute: 0,
          gender,
          birthPlace: '',
        }),
      })
      const data = await res.json()
      if (data.success) {
        localStorage.setItem('currentChart', JSON.stringify(data.data))
        track('paipan_submit')
        router.push(chartPath)
      } else {
        setError(data.error || t.fail)
      }
    } catch {
      setError(t.net)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="hw-c-box mb-6">
      <h2 className="hw-c-secTitle">{t.title}</h2>
      <p className="hw-c-body mb-4">{t.body}</p>
      <form className="hw-form" onSubmit={handleSubmit} autoComplete="off">
        <div className="hw-row">
          <div>
            <label className="hw-f" htmlFor="quick-y">{t.year}</label>
            <select id="quick-y" className="hw-sel" value={year} onChange={(e) => { markStart(); setYear(e.target.value) }}>
              {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label className="hw-f" htmlFor="quick-m">{t.month}</label>
            <select id="quick-m" className="hw-sel" value={month} onChange={(e) => { markStart(); setMonth(e.target.value) }}>
              <option value="">--</option>
              {OPTS(1, 12).map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div>
            <label className="hw-f" htmlFor="quick-d">{t.day}</label>
            <select id="quick-d" className="hw-sel" value={day} onChange={(e) => { markStart(); setDay(e.target.value) }}>
              <option value="">--</option>
              {OPTS(1, 31).map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>
        <div className="hw-seg" role="radiogroup" aria-label={t.male + '/' + t.female}>
          <label className="hw-segLabel">
            <input type="radio" name="quick-g" checked={gender === 1} onChange={() => { markStart(); setGender(1) }} />
            <span>{t.male}</span>
          </label>
          <label className="hw-segLabel">
            <input type="radio" name="quick-g" checked={gender === 0} onChange={() => { markStart(); setGender(0) }} />
            <span>{t.female}</span>
          </label>
        </div>
        <button type="submit" disabled={loading}
          className="mt-4 w-full rounded-full bg-hw-water py-3 text-base font-bold text-white transition hover:brightness-110 disabled:opacity-60">
          {loading ? t.loading : t.cta}
        </button>
        {error && <p className="mt-2 text-center text-sm text-danger-ink">{error}</p>}
        <p className="mt-2 text-center text-xs text-ink-light">{t.hint}</p>
      </form>
    </div>
  )
}
