'use client'

// 会员中心（档 A 2026-10-18）：把订阅权益集中一屏展示，逐项标明是否已解锁。
// 数据全部来自 /api/member/summary（一次鉴权、一次取盘；门禁在服务端）。
// 权益标题逐项取 GRANT_LABELS（单一事实源），不硬编码权益字面量。
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Nav from '@/components/Nav'
import PushOptIn from '@/components/PushOptIn'
import { GRANT_LABELS } from '@/lib/grantLabels'
import { getSupabase } from '@/lib/supabase'
import { SKUS, formatPriceUSD } from '@/lib/pricing'
// 客户付款门户（改卡 / 查账单）——公开链接、非密钥，客户端可安全引用
import { WAFFO_PORTAL_URL } from '@/lib/waffo-products'

type Section = { locked: boolean; data: any }
interface Summary {
  authState: 'guest' | 'noChart' | 'hasChart'
  liuyue: Section
  jiaoyun: Section
  history: Section
  similarCases: Section
  multiChart: { count: number; limit: number }
}

// ★ 档 C：订阅自助管理所需字段（/api/membership GET 返回；不含渠道订阅单号 ORD_）
interface SubStatus {
  active: boolean
  plan: 'monthly' | 'yearly' | null
  expiresAt: string | null
  autoRenew: boolean
  canceling: boolean
  cancelAt: string | null
  nextBillingAt: string | null
}

const EMPTY_SUB: SubStatus = {
  active: false, plan: null, expiresAt: null,
  autoRenew: false, canceling: false, cancelAt: null, nextBillingAt: null,
}

export default function MemberPage() {
  const [data, setData] = useState<Summary | null>(null)
  const [sub, setSub] = useState<SubStatus>(EMPTY_SUB)
  const [loading, setLoading] = useState(true)
  // 订阅操作后自增 → 触发一次重新拉取（会员状态与订阅字段一起刷新）
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    ;(async () => {
      try {
        const supabase = getSupabase()
        const { data: { session } } = await supabase.auth.getSession()
        const token = session?.access_token
        const q = token ? `?token=${encodeURIComponent(token)}` : ''
        // 一次鉴权、两个只读接口并行（会员中心内容 + 订阅管理状态）
        const [sumRes, subRes] = await Promise.all([
          fetch(`/api/member/summary${q}`),
          fetch(`/api/membership${q}`),
        ])
        const json = await sumRes.json()
        if (json.success) setData(json.data)
        const subJson = await subRes.json().catch(() => null)
        if (subJson?.success) {
          setSub({
            active: subJson.data.active === true,
            plan: subJson.data.plan ?? null,
            expiresAt: subJson.data.expiresAt ?? null,
            autoRenew: subJson.data.autoRenew === true,
            canceling: subJson.data.canceling === true,
            cancelAt: subJson.data.cancelAt ?? null,
            nextBillingAt: subJson.data.nextBillingAt ?? null,
          })
        } else {
          setSub(EMPTY_SUB)
        }
      } catch {
        // 静默：会员中心加载失败不影响其它页面
      } finally {
        setLoading(false)
      }
    })()
  }, [reloadKey])

  if (loading) {
    return (
      <main className="hw-page">
        <Nav />
        <div className="hw-wrap hw-c-pg"><p className="text-center text-ink-light/60">加载中…</p></div>
      </main>
    )
  }

  // 未登录 / 无命盘：统一引导
  if (!data || data.authState !== 'hasChart') {
    const guest = !data || data.authState === 'guest'
    return (
      <main className="hw-page">
        <Nav />
        <div className="hw-wrap hw-c-pg">
          <div className="hw-narrow">
            <Link href="/" className="hw-c-back">‹ 首页</Link>
            <header className="text-center mb-8">
              <h1 className="hw-c-h1">会员中心</h1>
              <p className="hw-lede hw-ledeC">个性化日运、流月提示、交运提醒、历史回看与古籍命例对照，一屏掌握。</p>
            </header>
            <div className="hw-c-box text-center">
              <p className="hw-c-dx">
                {guest ? '登录并保存命盘后，即可查看你的会员专属内容。' : '还没有保存的命盘，先去排一个吧。'}
              </p>
              <p className="mt-4">
                <Link
                  href={guest ? '/auth' : '/'}
                  className="inline-block rounded-full bg-ink px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-110"
                >
                  {guest ? '去登录' : '去排盘'}
                </Link>
              </p>
            </div>
            {/* ★ 档 C：没有命盘的在期会员也必须能自助取消（合规），故此处同样展示管理卡 */}
            <SubscriptionCard sub={sub} onChanged={() => setReloadKey((k) => k + 1)} />
            <PushOptIn />
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="hw-page">
      <Nav />
      <div className="hw-wrap hw-c-pg">
        <div className="hw-narrow">
          <Link href="/" className="hw-c-back">‹ 首页</Link>
          <header className="text-center mb-8">
            <h1 className="hw-c-h1">会员中心</h1>
            <p className="hw-lede hw-ledeC">
              以下内容结合你的命盘持续更新。深度报告（命书 / 年运等）仍需按次单独购买，不含在会员内。
            </p>
          </header>

          {/* ★ 档 C：订阅自助管理（下次续费日 / 自动续费状态 / 一键取消或恢复） */}
          <SubscriptionCard sub={sub} onChanged={() => setReloadKey((k) => k + 1)} />

          {/* Web Push：每日日运提醒开关（会员在手机上及时收到更新） */}
          <PushOptIn />

          <LiuYueSection s={data.liuyue} />
          <JiaoYunSection s={data.jiaoyun} />
          <HistorySection s={data.history} />
          <SimilarSection s={data.similarCases} />

          {/* 多命盘：不在此列表，链到既有 /charts 页 */}
          <section className="hw-c-box">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="font-bold text-ink">{GRANT_LABELS.multi_chart}</h2>
                <p className="text-sm text-ink-light mt-1">
                  已保存 {data.multiChart.count}/{data.multiChart.limit} 个命盘
                  {data.multiChart.count >= data.multiChart.limit
                    ? ' —— 已达上限，开通会员可保存更多。'
                    : '，可为家人多排几盘。'}
                </p>
              </div>
              <Link href="/charts" className="shrink-0 rounded-full bg-ink px-4 py-2 text-sm font-bold text-white transition hover:brightness-110">
                管理命盘
              </Link>
            </div>
          </section>

          <div className="text-center mt-8">
            <Link href="/pricing" className="hw-c-blue text-sm hover:brightness-110">查看会员权益与开通 →</Link>
          </div>
        </div>
      </div>
    </main>
  )
}

/**
 * 订阅自助管理卡（档 C，2026-10-18）。
 *   未开通：只给一句中性的开通引导（不催单）。
 *   在期：显示套餐 / 下次续费日 / 自动续费状态 + 一键取消；已请求取消则给「恢复订阅」。
 * ★ 一切渠道调用都在服务端（/api/membership/cancel）：本组件只收 boolean 与日期，
 *   渠道订阅单号 ORD_ 不出现在任何响应里。
 */
function SubscriptionCard({ sub, onChanged }: { sub: SubStatus; onChanged: () => void }) {
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  if (!sub.active && !sub.canceling) {
    return (
      <section className="hw-c-box text-center">
        <h2 className="font-bold text-ink">会员订阅</h2>
        <p className="text-sm text-ink-light mt-2">当前不是会员，开通后可查看上方全部专属内容。</p>
        <Link href="/pricing" className="hw-c-blue inline-block text-sm mt-3 hover:brightness-110">
          查看会员权益与开通 →
        </Link>
      </section>
    )
  }

  const planName = sub.plan
    ? SKUS[sub.plan === 'monthly' ? 'member_monthly' : 'member_yearly'].name
    : '会员'
  const planPrice = sub.plan
    ? SKUS[sub.plan === 'monthly' ? 'member_monthly' : 'member_yearly'].priceUSD
    : 0
  const periodText = sub.plan === 'yearly' ? '年' : '月'
  const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('zh-CN') : '—')

  const act = async (action: 'cancel' | 'reactivate') => {
    if (action === 'cancel' && !window.confirm(
      `确认取消自动续费？取消后在 ${day(sub.expiresAt)} 之前仍可使用会员权益，到期自动失效且不再扣费。`
    )) return

    setBusy(true)
    setMsg('')
    try {
      const supabase = getSupabase()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('登录已过期，请重新登录')
      const res = await fetch('/api/membership/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: session.access_token, action }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || '操作失败')
      setMsg(action === 'cancel' ? '已取消自动续费（本期内仍可使用）。' : '已恢复自动续费。')
      onChanged() // 重新拉取权威状态（以渠道 webhook 为准）
    } catch (e) {
      setMsg(e instanceof Error ? e.message : '操作失败，请稍后重试')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="hw-c-box">
      <h2 className="font-bold text-ink mb-1">会员订阅</h2>
      <div className="text-sm text-ink/70 space-y-1.5">
        <p>
          当前套餐：<span className="font-semibold text-ink">{planName}</span>
          {planPrice > 0 && <> · {formatPriceUSD(planPrice)}/{periodText}</>}
        </p>
        <p>
          {sub.canceling ? '会员到期日：' : '下次续费日：'}
          <span className="font-semibold text-ink">{day(sub.nextBillingAt ?? sub.expiresAt)}</span>
          {sub.canceling && <>（已取消自动续费，到期自动失效）</>}
        </p>
        <p className="text-xs text-ink-light/70">
          自动续费：{sub.autoRenew ? '已开启' : '已关闭'}
          {sub.cancelAt && <> · 取消申请于 {day(sub.cancelAt)}</>}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 mt-4">
        {sub.canceling ? (
          <button
            onClick={() => act('reactivate')}
            disabled={busy}
            className="rounded-full bg-ink px-4 py-2 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-60"
          >
            {busy ? '处理中…' : '恢复自动续费'}
          </button>
        ) : (
          <button
            onClick={() => act('cancel')}
            disabled={busy}
            className="rounded-full border border-[#dedcf0] px-4 py-2 text-sm font-semibold text-ink transition hover:bg-paper-dark/40 disabled:opacity-60"
          >
            {busy ? '处理中…' : '取消订阅'}
          </button>
        )}
        <a
          href={WAFFO_PORTAL_URL}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-ink-light/70 hover:underline"
        >
          改卡 / 查账单 →
        </a>
        <Link href="/terms" className="text-xs text-ink-light/70 hover:underline">
          退款政策
        </Link>
      </div>

      {msg && <p className="text-xs mt-3 text-ink-light">{msg}</p>}
    </section>
  )
}

/** 会员权益未解锁提示（统一文案，链到定价页） */
function LockedCard({ title }: { title: string }) {
  return (
    <section className="hw-c-box text-center">
      <h2 className="font-bold text-ink">{title}</h2>
      <p className="text-sm text-ink-light mt-2">
        <span className="font-semibold text-[#b45309]">本项为会员权益</span>，会员开通后即可查看。
      </p>
      <Link href="/pricing" className="hw-c-blue inline-block text-sm mt-3 hover:brightness-110">了解会员 →</Link>
    </section>
  )
}

function LiuYueSection({ s }: { s: Section }) {
  const title = GRANT_LABELS.liuyue
  if (s.locked) return <LockedCard title={title} />
  const months: any[] = s.data?.months ?? []
  return (
    <section className="hw-c-box">
      <h2 className="font-bold text-ink mb-1">{title}</h2>
      <p className="text-xs text-ink-light/60 mb-3">按当年（{s.data?.year}）公历月的干支与节气，给出每月一句提示；仅当年。</p>
      <div className="space-y-2">
        {months.map((m) => (
          <div key={m.month} className="flex gap-3 text-sm">
            <span className="w-14 shrink-0 text-ink-light/60">{m.month} 月</span>
            <span className="w-16 shrink-0 font-semibold text-ink">{m.ganZhi}</span>
            <span className="text-ink/70">{m.note}</span>
          </div>
        ))}
        {months.length === 0 && <p className="text-sm text-ink-light/60">暂无流月数据。</p>}
      </div>
    </section>
  )
}

function JiaoYunSection({ s }: { s: Section }) {
  const title = GRANT_LABELS.jiaoyun
  if (s.locked) return <LockedCard title={title} />
  const d = s.data
  if (!d?.current) return null
  return (
    <section className="hw-c-box">
      <h2 className="font-bold text-ink mb-3">{title}</h2>
      <div className="text-sm text-ink/70 space-y-1.5">
        <p>
          当前大运 <span className="font-semibold text-ink">{d.current.ganZhi}</span>
          （{d.current.startYear}–{d.current.endYear} · {d.current.shiShenGan}）· {d.current.tag}
        </p>
        {d.next && (
          <p>
            下一交运：<span className="font-semibold text-[#b45309]">{d.next.ganZhi}</span>
            （{d.next.startYear} 起 · {d.next.shiShenGan}）——
            距交运还有 <span className="font-semibold text-[#b45309]">约 {d.yearsToNext} 年</span>。
          </p>
        )}
        {d.next?.note && <p className="text-ink-light/70">{d.next.note}</p>}
      </div>
    </section>
  )
}

function HistorySection({ s }: { s: Section }) {
  const title = GRANT_LABELS.history
  if (s.locked) return <LockedCard title={title} />
  const days: any[] = s.data ?? []
  return (
    <section className="hw-c-box">
      <h2 className="font-bold text-ink mb-1">{title}</h2>
      <p className="text-xs text-ink-light/60 mb-3">回看最近 {days.length} 天的个性化日运。</p>
      <div className="space-y-2">
        {days.map((d) => (
          <div key={d.date} className="flex gap-3 text-sm">
            <span className="w-24 shrink-0 text-ink-light/60">{d.date}</span>
            <span className="w-14 shrink-0 text-ink-light/60">{d.liuRi}日</span>
            <span className="font-semibold text-ink shrink-0">{d.shiShen}</span>
            <span className="text-ink/70 truncate">「{d.sign}」</span>
          </div>
        ))}
      </div>
    </section>
  )
}

function SimilarSection({ s }: { s: Section }) {
  const title = GRANT_LABELS.similar_cases
  if (s.locked) return <LockedCard title={title} />
  const cases: any[] = s.data ?? []
  return (
    <section className="hw-c-box">
      <h2 className="font-bold text-ink mb-1">{title}</h2>
      <p className="text-xs text-ink-light/60 mb-3">
        与你的命局结构相近的古籍命例，附出处与相似点（讲依据，不是话术）。
      </p>
      <div className="space-y-3">
        {cases.map((c, i) => (
          <div key={c.id ?? i} className="border-t border-[#dedcf0] pt-3 first:border-t-0 first:pt-0">
            <p className="text-sm text-ink/80">{c.text}</p>
            <p className="text-xs text-ink-light/60 mt-1">
              出处：{c.source}
              {c.matches?.length > 0 && <> · 相似点：{c.matches.join('、')}</>}
            </p>
          </div>
        ))}
        {cases.length === 0 && <p className="text-sm text-ink-light/60">暂未检索到相近的古籍命例。</p>}
      </div>
    </section>
  )
}
