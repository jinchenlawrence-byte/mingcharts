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
import BirthPlacePicker from '@/components/BirthPlacePicker'
import type { BirthPlaceValue } from '@/components/BirthPlacePicker'

// 示例命盘（壬子日主）：点柱看释义，静态演示不调 API
const PILLARS: {
  t: string
  g: string
  b: string
  e: ('wood' | 'fire' | 'earth' | 'metal' | 'water')[]
  d: string
  day?: boolean
}[] = [
  { t: '年柱', g: '甲', b: '辰', e: ['wood', 'earth'], d: '代表祖辈和早年的家庭环境，是你命盘的起点。' },
  { t: '月柱', g: '丙', b: '寅', e: ['fire', 'wood'], d: '代表父母和青年阶段，也是判断格局最重要的一柱。' },
  { t: '日柱', g: '壬', b: '子', e: ['water', 'water'], d: '日柱的天干叫「日主」，就是你自己；地支代表你的伴侣。', day: true },
  { t: '时柱', g: '辛', b: '亥', e: ['metal', 'water'], d: '代表子女和晚年，也藏着你不常示人的一面。' },
]

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
        目前支持<b>国际信用卡</b>（Visa / Mastercard 等）安全收款，更多支付方式接入中。
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
  const [active, setActive] = useState(2)
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
      <Nav />
      <main className="hw-wrap">
        {/* Hero：左表单 + 右交互示例盘 */}
        <div className="hw-hero" id="chart">
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
                className="mt-4 w-full rounded-full bg-[#3a66ff] py-4 text-[17px] font-bold text-white transition hover:brightness-110 disabled:opacity-60">
                {loading ? '排盘中...' : '开始排盘'}
              </button>
              {error && <p className="mt-2 text-center text-sm text-[#ff6b5b]">{error}</p>}
              <p className="hw-note">
                排盘结果仅供参考娱乐。找不到出生城市？可在上方选择「其它」手动指定时区。
              </p>
            </form>
          </div>

          <div className="hw-stage">
            <p className="hw-capT">示例命盘 · 点一点，看每一柱管什么</p>
            <div className="hw-pillars">
              {PILLARS.map((p, i) => (
                <button key={p.t} type="button"
                  className={`hw-pillar${p.day ? ' hw-day' : ''}`}
                  style={{ '--i': i } as React.CSSProperties}
                  aria-pressed={active === i}
                  onClick={() => setActive(i)}>
                  <span className="hw-t">{p.t}</span>
                  <span className={`hw-g hw-${p.e[0]}`}>{p.g}</span>
                  <span className={`hw-g hw-${p.e[1]}`}>{p.b}</span>
                </button>
              ))}
            </div>
            <div className="hw-panel" aria-live="polite">
              <b>{PILLARS[active].t}</b>
              <p>{PILLARS[active].d}</p>
            </div>
            <div className="hw-legend" aria-label="五行配色">
              <span><i style={{ background: 'var(--hw-wood)' }} />木</span>
              <span><i style={{ background: 'var(--hw-fire)' }} />火</span>
              <span><i style={{ background: 'var(--hw-earth)' }} />土</span>
              <span><i style={{ background: 'var(--hw-metal)' }} />金</span>
              <span><i style={{ background: 'var(--hw-water)' }} />水</span>
            </div>
          </div>
        </div>

        {/* 信任条 */}
        <div className="hw-trust" data-rv aria-label="平台承诺">
          <span><i style={{ background: 'var(--hw-wood)' }} />排盘永久免费</span>
          <span><i style={{ background: 'var(--hw-water)' }} />真太阳时校正</span>
          <span><i style={{ background: 'var(--hw-earth)' }} />生辰加密传输·不对外公开</span>
          <span><i style={{ background: 'var(--hw-fire)' }} />传统文化视角·仅供参考娱乐</span>
        </div>

        {/* 功能 Bento */}
        <section className="hw-section" data-rv>
          <h2 className="hw-h2">排完盘，接着玩</h2>
          <div className="hw-bento">
            <a className="hw-card hw-b1 hw-water" href="/pricing">
              <span className="hw-z">命</span>
              <div>
                <h3>命书详批</h3>
                <p>格局、调候、用神、大运，再到事业、婚姻、子女、健康，万字命书逐条引用经典原文。</p>
              </div>
            </a>
            <a className="hw-card hw-b2 hw-fire" href="/hemun">
              <span className="hw-z">合</span>
              <div>
                <h3>合婚配对</h3>
                <p>双方命局怎么互动，缘分有多深。</p>
              </div>
            </a>
            <a className="hw-card hw-b3 hw-earth" href="/ziwei">
              <span className="hw-z">紫</span>
              <div>
                <h3>紫微斗数</h3>
                <p>十四主星四化，十二宫深度分析。</p>
              </div>
            </a>
            <a className="hw-card hw-b4 hw-wood" href="/daily">
              <span className="hw-z">签</span>
              <div>
                <h3>每日日签</h3>
                <p>每天抽一张，看看今天的运势。</p>
              </div>
            </a>
            {/* ★ 年运报告卡（2026-10-20 用户反馈：Bento 少这一项）。
                DOM 顺序刻意放在 b4 与 b5 之间 —— 自动布局下它填满第 3 行空出的 4 列，
                b5 仍落第 4 行整行（见 globals.css 的 .hw-b5 / .hw-b6 规则）。 */}
            <a className="hw-card hw-b6 hw-metal" href="/liunian">
              <span className="hw-z">运</span>
              <div>
                <h3>年运报告</h3>
                <p>流年干支与原局冲合，事业、财运、感情、健康分维度解读。</p>
              </div>
            </a>
            <a className="hw-card hw-b5 hw-metal" href="/geo">
              <span className="hw-z">方</span>
              <div>
                <h3>方位城市</h3>
                <p>财富之城、事业之城，按五行地气看你适合去哪。</p>
              </div>
            </a>
          </div>
        </section>

        {/* 样例命书节选 */}
        <section className="hw-section" data-rv>
          <div className="hw-sample">
            <div className="hw-hd">
              <b>万字命书，长什么样？</b>
              <span>以下为示例节选 · 实际报告因人而异</span>
            </div>
            <div className="hw-quote">
              <p>「日主壬水，生于孟春寅月，木旺泄气，喜金发源。」——庚金为尊，丙火为佐，二者得宜，格局自清。</p>
              <small>—— 节选自「格局总论」章节 · 参《穷通宝鉴》论正月壬水</small>
            </div>
            <div className="hw-quote">
              <p>「身旺能任财，求财可顺势而为，宜向东方、南方发展；忌孤注一掷，忌高杠杆。」</p>
              <small>—— 节选自「求财方向」章节 · 与方位城市五行地气同一口径</small>
            </div>
            <div className="hw-quote">
              <p>「现行大运天干透出合神，十年之内事业重心由转岗转向立业，稳扎稳打为上。」</p>
              <small>—— 节选自「大运流年」章节</small>
            </div>
            <div className="hw-cta">
              <a className="hw-btnInk" href="/pricing">查看完整报告</a>
              <em>先免费排盘，再决定要不要深读</em>
            </div>
          </div>
        </section>

        {/* 更多查询 */}
        <section className="hw-section" data-rv>
          <h2 className="hw-h2">更多命理查询</h2>
          <div className="hw-more">
            <a href="/bazi"><b>按出生日期算命</b><span>1950–2010 每日八字</span></a>
            <a href="/shengxiao"><b>十二生肖运势</b><span>属相配对 · 流年运势</span></a>
            <a href="/jieqi"><b>二十四节气</b><span>月令更替 · 节气养生</span></a>
            <a href="/article"><b>命理知识大全</b><span>入门 · 十神 · 格局</span></a>
          </div>
        </section>

        {/* FAQ */}
        <section className="hw-section" data-rv>
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
