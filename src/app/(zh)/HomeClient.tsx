'use client'

// ★ 首页新版设计（2026-10-16）：docs/design/mingcharts-home-v2.html 的生产实现
// 样式：globals.css 内 hw- 前缀类（不用 CSS module——site-audit ④ 会在 Node 里
// 直接 import 本文件做行为断言，module CSS 导入在 Node 侧无法解析）。
// 排盘接线与旧版完全一致：POST /api/paipan（year/month/day/hour/minute/gender
// ＋ BirthPlacePicker 的 birthCityId / birthZone+birthLng / 不带）→ localStorage
// currentChart → /chart。 BirthPlacePicker 是 5 处表单共用组件，原样复用不改动。
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Nav from '@/components/Nav'
import LangPromptBar from '@/components/LangPromptBar'
import BirthPlacePicker from '@/components/BirthPlacePicker'
import type { BirthPlaceValue } from '@/components/BirthPlacePicker'
import { ExampleChart, TrustBar, FatebookSample, MoreQueries, FeatureBento } from '@/components/home/HomeSections'
import Shengxiao2027Links from '@/components/shengxiao/Shengxiao2027Links'
import { track } from '@/lib/track'

const YEARS = Array.from({ length: 2026 - 1930 + 1 }, (_, i) => 1930 + i)
const OPTS = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i)

const FAQ = [
  {
    q: '我的生辰数据安全吗？',
    a: (
      <>
        <b>只用于计算。</b>生辰信息全程加密传输，仅用于生成你的命盘与报告，不对外公开、不作他用。
      </>
    ),
  },
  {
    q: '免费排盘和付费报告差在哪？',
    a: (
      <>
        <b>排盘与基础解读永久免费。</b>
        付费报告（命书、年运、合婚、紫微）在此之上做万字级深度解读：格局、调候、用神、大运逐项展开，并逐条注明所引经典出处。
      </>
    ),
  },
  {
    q: '报告是怎么生成的？准确吗？',
    a: (
      <>
        排盘部分按传统历法规则<b>精确计算</b>（含真太阳时校正）；解读部分是传统文化视角下的人机结合分析，
        <b>仅供参考娱乐</b>，不构成医疗、投资或其他专业建议。
      </>
    ),
  },
  {
    q: '支持什么支付方式？',
    a: (
      <>
        目前支持<b>国际信用卡</b>，也支持 Apple Pay 与 Google Pay 安全收款。
      </>
    ),
  },
]

export default function Home() {
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
  const rootRef = useRef<HTMLDivElement>(null)
  // 滚动显现（尊重 prefers-reduced-motion：CSS 侧已整体关闭过渡）
  useEffect(() => {
    const els = rootRef.current?.querySelectorAll('[data-rv]')
    if (!els?.length) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      els.forEach((el) => el.classList.add('hw-rvOn'))
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add('hw-rvOn')
            io.unobserve(en.target)
          }
        })
      },
      { threshold: 0.15 }
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/paipan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            locale: 'zh-Hans',
          ...formData,
          year: parseInt(formData.year),
          month: parseInt(formData.month),
          day: parseInt(formData.day),
          hour: parseInt(formData.hour),
          minute: parseInt(formData.minute),
          // 出生地：城市 → birthCityId；其它 → birthZone（进阶经度 birthLng）；none → 不带
          ...(birth.mode === 'city'
            ? { birthCityId: birth.cityId }
            : birth.mode === 'zone'
              ? { birthZone: birth.zone, birthLng: birth.lng }
              : {}),
        }),
      })

      const data = await res.json()

      if (data.success) {
        // 流量漏斗：记录「提交并成功排盘」（失败不记，避免把报错算成转化）
        track('paipan_submit')
        // 存储到localStorage，跳转到结果页
        localStorage.setItem('currentChart', JSON.stringify(data.data))
        router.push('/chart')
      } else {
        setError(data.error || '排盘失败')
      }
    } catch {
      setError('网络错误，请稍后再试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="hw-page" ref={rootRef}>
      <LangPromptBar />
      <Nav />
      <main className="hw-wrap">
        {/* Hero：左表单 + 右交互示例盘 */}
        <div className="hw-hero" id="chart" data-section="hero">
          <div>
            <h1 className="hw-h1">
              你的<span className="hw-u8">八字</span>，
              <br />
              一眼就看懂
            </h1>
            <p className="hw-lede">
              免费生成四柱命盘，十神、藏干、起运一次看全。想再深一步，万字命书引经据典，也说人话。
            </p>
            <form className="hw-form" onSubmit={handleSubmit} autoComplete="off">
              <div className="hw-row">
                <div>
                  <label className="hw-f" htmlFor="y">年</label>
                  <select id="y" className="hw-sel" value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: e.target.value })}>
                    {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div>
                  <label className="hw-f" htmlFor="m">月</label>
                  <select id="m" className="hw-sel" value={formData.month}
                    onChange={(e) => setFormData({ ...formData, month: e.target.value })}>
                    {OPTS(1, 12).map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div>
                  <label className="hw-f" htmlFor="d">日</label>
                  <select id="d" className="hw-sel" value={formData.day}
                    onChange={(e) => setFormData({ ...formData, day: e.target.value })}>
                    {OPTS(1, 31).map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div>
                  <label className="hw-f" htmlFor="h">时</label>
                  <select id="h" className="hw-sel" value={formData.hour}
                    onChange={(e) => setFormData({ ...formData, hour: e.target.value })}>
                    {OPTS(0, 23).map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div>
                  <label className="hw-f" htmlFor="mi">分</label>
                  <select id="mi" className="hw-sel" value={formData.minute}
                    onChange={(e) => setFormData({ ...formData, minute: e.target.value })}>
                    {OPTS(0, 59).map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              </div>
              <div className="hw-seg" role="radiogroup" aria-label="性别">
                <label className="hw-segLabel">
                  <input type="radio" name="g" checked={formData.gender === 1}
                    onChange={() => setFormData({ ...formData, gender: 1 })} />
                  <span>男</span>
                </label>
                <label className="hw-segLabel">
                  <input type="radio" name="g" checked={formData.gender === 0}
                    onChange={() => setFormData({ ...formData, gender: 0 })} />
                  <span>女</span>
                </label>
              </div>
              <BirthPlacePicker value={birth} onChange={setBirth} />
              <button type="submit" disabled={loading}
                className="mt-4 w-full rounded-full bg-hw-water py-4 text-lg font-bold text-white transition hover:brightness-110 disabled:opacity-60">
                {loading ? '排盘中...' : '开始排盘'}
              </button>
              {error && <p className="mt-2 text-center text-sm text-danger-ink">{error}</p>}
              {/* ★ 第 36 轮：日运与免费查神煞入口 —— 给「还没排盘、只想先看一眼」的人一个落点。
                  日运不需要命盘，新用户注册后 3 天内有每日推送提醒。 */}
              <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm">
                <a href="/daily" className="text-hw-water underline underline-offset-2 hover:opacity-80">
                  今日日运（免费看）
                </a>
                <span className="text-ink-light" aria-hidden="true">·</span>
                <a href="/shensha/check" className="text-hw-water underline underline-offset-2 hover:opacity-80">
                  免费查你的神煞
                </a>
              </div>
              <p className="hw-alert hw-alert--note">
                排盘结果仅供参考娱乐。找不到出生城市？可在上方选择「其它」手动指定时区。
              </p>
            </form>
          </div>

          <ExampleChart locale="zh-Hans" />
        </div>

        {/* 信任条 */}
        <TrustBar locale="zh-Hans" />

        {/* 功能 Bento（三语共用 FeatureBento，含 data-section="features"） */}
        <FeatureBento locale="zh-Hans" />

        {/* 样例命书节选 */}
        <FatebookSample locale="zh-Hans" />

        {/* 2027 生肖页内链（年底「来年运势」窗口） */}
        <Shengxiao2027Links locale="zh-Hans" />

        {/* 更多查询 */}
        <MoreQueries locale="zh-Hans" />

        {/* FAQ */}
        <section className="hw-section" data-rv data-section="faq">
          <h2 className="hw-h2">常见疑问</h2>
          <div className="hw-faq">
            {FAQ.map((f) => (
              <details key={f.q}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
      {/* 页脚由根布局统一提供（条款/隐私/邮箱/GeoNames 署名） */}
    </div>
  )
}
