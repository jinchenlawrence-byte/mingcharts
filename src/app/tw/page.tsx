'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import BirthPlacePicker from '@/components/BirthPlacePicker'
import type { BirthPlaceValue } from '@/components/BirthPlacePicker'
import { SHENGXIAO } from '@/lib/shengxiaoData'
import { toHant } from '@/lib/hant'
import { categoriesWithCount, pickBySlug } from '@/lib/relatedArticles'
import { ExampleChart, TrustBar, FatebookSample, MoreQueries } from '@/components/home/HomeSections'

// 繁體首頁：與簡體首頁 / 同構、同功能（排盤表單 → 命盤結果），文案原生繁體。
// ★ 內鏈：12 屬相 + 文章庫，保證繁中頁面不是孤島。
const H = (s: string) => toHant(s)

const FEATURED_ARTICLES = [
  'shenme-shi-bazi',
  'shishang-ge',
  'shenwang-shenruo-zenme-panduan',
  'liunian-zenme-kan',
] as const

const YEARS = Array.from({ length: 2026 - 1930 + 1 }, (_, i) => 1930 + i)
const OPTS = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i)

const FAQS = [
  {
    q: '我的生辰資料安全嗎？',
    a: '只用於計算。生辰資訊全程加密傳輸，僅用於生成你的命盤與報告，不對外公開、不作他用。',
  },
  {
    q: '免費排盤和付費報告差在哪？',
    a: '排盤與基礎解讀永久免費。付費報告（命書、年運、合婚、紫微）在此之上做萬字級深度解讀：格局、調候、用神、大運逐項展開，並逐條註明所引經典出處。',
  },
  {
    q: '報告是怎麼生成的？準確嗎？',
    a: '排盤部分按傳統曆法規則精確計算（含真太陽時校正）；解讀部分是傳統文化視角下的人機結合分析，僅供參考娛樂，不構成醫療、投資或其他專業建議。',
  },
  {
    q: '支援什麼付款方式？',
    a: '目前支援國際信用卡（Visa / Mastercard 等）安全收款，更多付款方式接入中。',
  },
]

export default function HantHome() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [birth, setBirth] = useState<BirthPlaceValue>({ mode: 'none' })
  const [formData, setFormData] = useState({
    year: '2000',
    month: '1',
    day: '1',
    hour: '0',
    minute: '0',
    gender: 1 as 1 | 0,
  })
  const categories = categoriesWithCount()
  const featured = pickBySlug([...FEATURED_ARTICLES])

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
          minute: parseInt(formData.minute),
          locale: 'zh-Hant',
          ...(birth.mode === 'city'
            ? { birthCityId: birth.cityId }
            : birth.mode === 'zone'
              ? { birthZone: birth.zone, birthLng: birth.lng }
              : {}),
        }),
      })
      const data = await res.json()
      if (data.success) {
        localStorage.setItem('currentChart', JSON.stringify(data.data))
        router.push('/tw/chart')
      } else {
        setError(data.error || H('排盤失敗'))
      }
    } catch {
      setError(H('網路錯誤，請稍後再試'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="hw-wrap hw-c-pg">
      <section className="hw-c-box mb-6">
        <h1 className="hw-c-h1">{H('你的八字，一眼就看懂')}</h1>
        <p className="hw-c-lede">
          {H('免費生成四柱命盤，十神、藏干、起運一次看全。想再深一步，萬字命書引經據典，也說人話。')}
        </p>

        <form className="hw-form mt-4" onSubmit={handleSubmit} autoComplete="off">
          <div className="hw-row">
            <div>
              <label className="hw-f" htmlFor="y">{H('年')}</label>
              <select id="y" className="hw-sel" value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: e.target.value })}>
                {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <label className="hw-f" htmlFor="m">{H('月')}</label>
              <select id="m" className="hw-sel" value={formData.month}
                onChange={(e) => setFormData({ ...formData, month: e.target.value })}>
                {OPTS(1, 12).map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label className="hw-f" htmlFor="d">{H('日')}</label>
              <select id="d" className="hw-sel" value={formData.day}
                onChange={(e) => setFormData({ ...formData, day: e.target.value })}>
                {OPTS(1, 31).map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label className="hw-f" htmlFor="h">{H('時')}</label>
              <select id="h" className="hw-sel" value={formData.hour}
                onChange={(e) => setFormData({ ...formData, hour: e.target.value })}>
                {OPTS(0, 23).map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label className="hw-f" htmlFor="mi">{H('分')}</label>
              <select id="mi" className="hw-sel" value={formData.minute}
                onChange={(e) => setFormData({ ...formData, minute: e.target.value })}>
                {OPTS(0, 59).map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>
          <div className="hw-seg" role="radiogroup" aria-label={H('性別')}>
            <label className="hw-segLabel">
              <input type="radio" name="g" checked={formData.gender === 1}
                onChange={() => setFormData({ ...formData, gender: 1 })} />
              <span>{H('男')}</span>
            </label>
            <label className="hw-segLabel">
              <input type="radio" name="g" checked={formData.gender === 0}
                onChange={() => setFormData({ ...formData, gender: 0 })} />
              <span>{H('女')}</span>
            </label>
          </div>
          <BirthPlacePicker value={birth} onChange={setBirth} locale="zh-Hant" />
          <button type="submit" disabled={loading}
            className="mt-4 w-full rounded-full bg-hw-water py-4 text-[17px] font-bold text-white transition hover:brightness-110 disabled:opacity-60">
            {loading ? H('排盤中...') : H('開始排盤')}
          </button>
          {error && <p className="mt-2 text-center text-sm text-hw-fire">{error}</p>}
          <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm">
            <Link href="/tw/daily" className="text-hw-water underline underline-offset-2 hover:opacity-80">
              {H('今日日運（免費看）')}
            </Link>
            <span className="text-ink-light/30" aria-hidden="true">·</span>
            <Link href="/tw/shensha/check" className="text-hw-water underline underline-offset-2 hover:opacity-80">
              {H('免費查你的神煞')}
            </Link>
          </div>
          <p className="hw-note mt-2">
            {H('排盤結果僅供參考娛樂。找不到出生城市？可在上方選擇「其它」手動指定時區。')}
          </p>
        </form>

        <div className="flex flex-wrap gap-3 mt-4">
          <Link href="/tw/liunian/2027" className="hw-c-btnBig">{H('2027 丁未年運勢 →')}</Link>
          <Link href="/tw/liunian/2028" className="hw-c-btnBig">{H('2028 戊申年運勢 →')}</Link>
          <Link href="/tw/shengxiao" className="hw-c-back self-center">{H('先看生肖 →')}</Link>
        </div>

        {/* 第二批补齐（以简体为基准）：hero 交互示例盘 —— 繁体此前只有表单，没有可点的示例四柱 */}
        <ExampleChart locale="zh-Hant" />
      </section>

      {/* 第二批补齐：信任条（排盘免费/真太阳时/数据加密/仅供参考） */}
      <TrustBar locale="zh-Hant" />

      <section className="hw-c-box mb-6">
        <h2 className="hw-c-secTitle">{H('排完盤，接著玩')}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Link href="/tw/pricing" className="border border-gold/20 rounded-lg p-3 hover:bg-gold/5 transition">
            <div className="font-bold text-ink">{H('命書詳批')}</div>
            <div className="text-xs text-ink-light mt-1">{H('格局、調候、用神、大運，再到事業、婚姻、子女、健康')}</div>
          </Link>
          <Link href="/tw/hemun" className="border border-gold/20 rounded-lg p-3 hover:bg-gold/5 transition">
            <div className="font-bold text-ink">{H('合婚配對')}</div>
            <div className="text-xs text-ink-light mt-1">{H('雙方命局怎麼互動，緣分有多深')}</div>
          </Link>
          <Link href="/tw/ziwei" className="border border-gold/20 rounded-lg p-3 hover:bg-gold/5 transition">
            <div className="font-bold text-ink">{H('紫微斗數')}</div>
            <div className="text-xs text-ink-light mt-1">{H('十四主星四化，十二宮深度分析')}</div>
          </Link>
          <Link href="/tw/daily" className="border border-gold/20 rounded-lg p-3 hover:bg-gold/5 transition">
            <div className="font-bold text-ink">{H('每日日籤')}</div>
            <div className="text-xs text-ink-light mt-1">{H('每天抽一張，看看今天的運勢')}</div>
          </Link>
          <Link href="/tw/liunian" className="border border-gold/20 rounded-lg p-3 hover:bg-gold/5 transition">
            <div className="font-bold text-ink">{H('年運報告')}</div>
            <div className="text-xs text-ink-light mt-1">{H('流年干支與原局沖合，事業、財運、感情、健康分維度解讀')}</div>
          </Link>
          <Link href="/tw/geo" className="border border-gold/20 rounded-lg p-3 hover:bg-gold/5 transition">
            <div className="font-bold text-ink">{H('方位城市')}</div>
            <div className="text-xs text-ink-light mt-1">{H('財富之城、事業之城，按五行地氣看你適合去哪')}</div>
          </Link>
        </div>
      </section>

      <section className="hw-c-box mb-6">
        <h2 className="hw-c-secTitle">{H('十二生肖 · 性格與配對')}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {SHENGXIAO.map((sx) => (
            <Link
              key={sx.slug}
              href={`/tw/shengxiao/${sx.slug}`}
              className="border border-gold/20 rounded-lg p-3 hover:bg-gold/5 transition"
            >
              <div className="font-bold text-ink">{H('屬')}{H(sx.name)}</div>
              <div className="text-xs text-ink-light mt-1">
                {H('地支')}{sx.zhi} · {H('五行屬')}{sx.wuxing}
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="hw-c-box mb-6">
        <h2 className="hw-c-secTitle">{H('命理知識')}（{categories.length} {H('個分類')}）</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          {categories.map((c) => (
            <Link
              key={c.slug}
              href={`/tw/article/${c.slug}`}
              className="border border-gold/20 rounded p-2 text-center text-sm hover:bg-gold/5 transition"
            >
              <div className="font-semibold text-ink">{H(c.name)}</div>
              <div className="text-xs text-ink-light/60">{c.count} {H('篇')}</div>
            </Link>
          ))}
        </div>
        <ul className="space-y-1.5 text-sm">
          {featured.map((a) => (
            <li key={a.slug}>
              <Link href={`/tw/article/${a.slug}`} className="hw-c-link">
                • {H(a.title)}
              </Link>
            </li>
          ))}
        </ul>
        <p className="text-xs text-ink-light/50 mt-3">
          <Link href="/tw/article" className="hw-c-link">{H('查看全部命理知識 →')}</Link>
        </p>
      </section>

      {/* 第二批补齐：命书样例节选（简体有、繁体此前缺失） */}
      <FatebookSample locale="zh-Hant" />

      {/* 第二批补齐：更多命理查询入口（只放繁体树真实存在的页面） */}
      <MoreQueries locale="zh-Hant" />

      <section className="hw-c-box mb-6">
        <h2 className="hw-c-secTitle">{H('為什麼生肖只是「年支」')}</h2>
        <p className="hw-c-body">
          {H('相同生肖的人命運千差萬別，因為完整八字包含年、月、日、時四柱：年柱看祖上與少年，月柱看父母與事業環境，日柱看自身與配偶，時柱看子女與晚年。生肖只取年支一個地支，占八個字裡的一個字。')}
        </p>
      </section>

      <section className="hw-c-box mb-6">
        <h2 className="hw-c-secTitle">{H('常見疑問')}</h2>
        <div className="space-y-3">
          {FAQS.map((f) => (
            <details key={f.q} className="border-b border-gold/10 pb-2">
              <summary className="font-semibold text-ink cursor-pointer">{f.q}</summary>
              <p className="mt-2 text-sm text-ink-light leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
        <p className="text-xs text-ink-light/50 mt-3">
          <Link href="/tw/terms" className="hw-c-link">{H('服務條款')}</Link>
          <span className="mx-2">·</span>
          <Link href="/tw/privacy" className="hw-c-link">{H('隱私政策')}</Link>
        </p>
      </section>
    </div>
  )
}
