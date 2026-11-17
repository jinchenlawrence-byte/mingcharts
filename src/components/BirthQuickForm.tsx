'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { track } from '@/lib/track'
import BirthPlacePicker from '@/components/BirthPlacePicker'
import type { BirthPlaceValue } from '@/components/BirthPlacePicker'
import type { SiteLang } from '@/lib/lang'

const YEARS = Array.from({ length: 101 }, (_, i) => 1920 + i)
const OPTS = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i)

const TEXT: Record<string, {
  title: string; body: string; year: string; month: string; day: string; hour: string; unknownHour: string; hourUnit: string
  male: string; female: string; place: string; cta: string; hint: string; loading: string; fail: string; net: string
}> = {
  'zh-Hans': {
    title: '先看属于你自己的命盘',
    body: '生肖只是 12 分之一的共性参考。填出生年月日，直接看你本人的四柱与大运；时辰与出生地可选填。',
    year: '年', month: '月', day: '日', hour: '出生时辰（可选）', unknownHour: '不确定（按午时 12:00）', hourUnit: '时',
    male: '男', female: '女',
    place: '出生地（可选，用于真太阳时校正）',
    cta: '免费看我的命盘',
    hint: '留空时本盘按午时（12:00）假设排定：午时与子时排出的日柱、时柱可能完全不同，补充时辰后才准确。出生地填了按真太阳时校正，不填按标准时间。',
    loading: '排盘中...', fail: '排盘失败，请检查输入', net: '网络错误，请稍后重试',
  },
  'zh-Hant': {
    title: '先看屬於你自己的命盤',
    body: '生肖只是 12 分之一的共性參考。填出生年月日，直接看你本人的四柱與大運；時辰與出生地可選填。',
    year: '年', month: '月', day: '日', hour: '出生時辰（可選）', unknownHour: '不確定（按午時 12:00）', hourUnit: '時',
    male: '男', female: '女',
    place: '出生地（可選，用於真太陽時校正）',
    cta: '免費看我的命盤',
    hint: '留空時本盤按午時（12:00）假設排定：午時與子時排出的日柱、時柱可能完全不同，補充時辰後才準確。出生地填了按真太陽時校正，不填按標準時間。',
    loading: '排盤中...', fail: '排盤失敗，請檢查輸入', net: '網路錯誤，請稍後重試',
  },
  en: {
    title: 'See your own chart first',
    body: 'A zodiac sign is one twelfth of the picture. Enter your birth date to read your own four pillars and luck cycles; birth hour and birthplace are optional.',
    year: 'Year', month: 'Month', day: 'Day', hour: 'Birth hour (optional)', unknownHour: 'Not sure (use 12:00 noon)', hourUnit: '',
    male: 'Male', female: 'Female',
    place: 'Birthplace (optional, for true solar time)',
    cta: 'See my chart free',
    hint: 'Left blank, the chart assumes 12:00 noon: noon and midnight can produce entirely different day and hour pillars, so add the hour before trusting it. A birthplace applies true solar time correction; without one we use standard time.',
    loading: 'Casting...', fail: 'Failed to cast the chart. Please check your input.', net: 'Network error. Please try again.',
  },
}

/**
 * 生肖流年页首屏排盘入口（2026-11-11；2026-11-17 补时辰与出生地）。
 * 最初只收年/月/日 + 性别、时辰固定午时（dd59fa2 的快速漏斗取舍）。
 * 但反复排盘的用户把「没有时辰/出生地」当成不专业，且 /chart 并没有补填入口：
 * 现在保持首屏紧凑——时辰与性别同一行，出生地默认折叠；时辰含「不确定」，
 * 不填仍按午时排，出生地选填并走全球城市库做真太阳时校正。
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
  // 空字符串 = 不确定；提交时按午时 12:00 排（与旧行为一致，只是不再对外声称「结果页可补」）
  const [hour, setHour] = useState('')
  const [birth, setBirth] = useState<BirthPlaceValue>({ mode: 'none' })
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
          // 「不确定」仍按午时排，保持与旧版一致的兜底；分钟不收集，固定 0
          hour: hour === '' ? 12 : parseInt(hour),
          minute: 0,
          gender,
          // 出生地走 /api/paipan 现有主路径：城市 id 优先，其次仅时区（含可选经度）
          ...(birth.mode === 'city'
            ? { birthCityId: birth.cityId }
            : birth.mode === 'zone'
              ? { birthZone: birth.zone, birthLng: birth.lng }
              : {}),
        }),
      })
      const data = await res.json()
      if (data.success) {
        // 「不确定」必须留下痕迹：/chart 据此提示「按午时假设、补充后才准确」，
        // 否则用户会以为 12:00 是真实生辰（午时与子时的日柱/时柱可能完全不同）。
        localStorage.setItem('currentChart', JSON.stringify(hour === '' ? { ...data.data, hourUnknown: true } : data.data))
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
        {/* 时辰与性别同一行：只增加一行高度，不把 CTA 压出首屏；时辰首项即「不确定」 */}
        <div className="flex items-end gap-3">
          <div className="min-w-0 flex-1">
            <label className="hw-f" htmlFor="quick-h">{t.hour}</label>
            <select id="quick-h" className="hw-sel" value={hour} onChange={(e) => { markStart(); setHour(e.target.value) }}>
              <option value="">{t.unknownHour}</option>
              {OPTS(0, 23).map((h) => (
                <option key={h} value={h}>{t.hourUnit === '' ? `${String(h).padStart(2, '0')}:00` : `${h} ${t.hourUnit}`}</option>
              ))}
            </select>
          </div>
          <div className="hw-seg shrink-0" style={{ marginBottom: 0 }} role="radiogroup" aria-label={t.male + '/' + t.female}>
            <label className="hw-segLabel">
              <input type="radio" name="quick-g" checked={gender === 1} onChange={() => { markStart(); setGender(1) }} />
              <span>{t.male}</span>
            </label>
            <label className="hw-segLabel">
              <input type="radio" name="quick-g" checked={gender === 0} onChange={() => { markStart(); setGender(0) }} />
              <span>{t.female}</span>
            </label>
          </div>
        </div>
        {/* 出生地默认折叠：不展开就不占首屏高度；展开后才加载全球城市库（懒加载 661KB） */}
        <details className="mt-3">
          <summary className="hw-f cursor-pointer select-none" style={{ marginBottom: 0 }}>{t.place}</summary>
          <div className="mt-2">
            <BirthPlacePicker value={birth} onChange={(v) => { markStart(); setBirth(v) }} locale={locale} />
          </div>
        </details>
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
