'use client'

// 会员中心（2026-10-21 改版）：沿用全站浅色宣纸色温，用琥珀建立信息层级。
// 一屏看清「是不是会员 / 到期还剩几天 / 解锁了几项 / 本月还能问几次」。
// 数据来自 /api/member/summary（内容）+ /api/membership（订阅状态）；
// 追问额度额外读一次 /api/ask（失败置 null，只显示静态权益文案，不阻塞页面）。
// 权益标题逐项取 GRANT_LABELS（单一事实源），宫格由 SUBSCRIPTION_GRANTS 派生，不硬编码权益表。
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Nav from '@/components/Nav'
import PushOptIn from '@/components/PushOptIn'
import { GRANT_LABELS } from '@/lib/grantLabels'
import { getSupabase } from '@/lib/supabase'
import { SKUS, formatPriceUSD, SUBSCRIPTION_GRANTS, MEMBER_ASK_PER_MONTH } from '@/lib/pricing'
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

// 追问额度（/api/ask GET）：会员本月剩余 + 已购追问包剩余
interface AskQuota {
  remaining: number
  memberRemaining: number
  packRemaining: number
  enforced: boolean
}

const EMPTY_SUB: SubStatus = {
  active: false, plan: null, expiresAt: null,
  autoRenew: false, canceling: false, cancelAt: null, nextBillingAt: null,
}

// 印章字：每个订阅 grant 一枚汉字，纯展示（缺项退回「权」）
const GRANT_STAMPS: Record<string, string> = {
  daily: '日', liuyue: '月', jiaoyun: '运',
  multi_chart: '盘', similar_cases: '案', history: '史',
}

const fmtDay = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('zh-CN') : '—')

/** 剩余天数（不足一天按一天算；仅用于展示） */
const daysUntil = (iso: string | null) => {
  if (!iso) return 0
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000))
}

export default function MemberPage() {
  const [data, setData] = useState<Summary | null>(null)
  const [sub, setSub] = useState<SubStatus>(EMPTY_SUB)
  const [ask, setAsk] = useState<AskQuota | null>(null)
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
        // 一次鉴权、三个只读接口并行（会员内容 + 订阅管理 + 追问额度）
        const [sumRes, subRes, askRes] = await Promise.all([
          fetch(`/api/member/summary${q}`),
          fetch(`/api/membership${q}`),
          // 未登录不查额度（接口需 token）；失败不影响主内容
          token ? fetch(`/api/ask${q}`) : Promise.resolve(null),
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
        if (askRes) {
          const askJson = await askRes.json().catch(() => null)
          if (askJson && typeof askJson.remaining === 'number') {
            setAsk({
              remaining: askJson.remaining,
              memberRemaining: Number(askJson.memberRemaining) || 0,
              packRemaining: Number(askJson.packRemaining) || 0,
              enforced: askJson.enforced === true,
            })
          }
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
          <div className="hw-m-wrap">
            <Link href="/" className="hw-c-back">‹ 首页</Link>
            <header className="hw-m-head">
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
                  className="hw-m-btn"
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

  // 会员状态三态：生效中 / 已取消续费（本期内仍有效）/ 未开通
  const mode: 'active' | 'canceling' | 'inactive' =
    sub.active ? (sub.canceling ? 'canceling' : 'active') : 'inactive'

  // 权益解锁口径：4 项内容权益看 locked；多命盘看配额（limit>1）；日运沿用流月门禁
  const unlocked: Record<string, boolean> = {
    daily: !data.liuyue.locked,
    liuyue: !data.liuyue.locked,
    jiaoyun: !data.jiaoyun.locked,
    multi_chart: data.multiChart.limit > 1,
    similar_cases: !data.similarCases.locked,
    history: !data.history.locked,
  }
  const unlockedCount = SUBSCRIPTION_GRANTS.filter((g) => unlocked[g]).length

  return (
    <main className="hw-page">
      <Nav />
      <div className="hw-wrap hw-c-pg">
        <div className="hw-m-wrap">
          <Link href="/" className="hw-c-back">‹ 首页</Link>
          <header className="hw-m-head">
            <h1 className="hw-c-h1">会员中心</h1>
            <p className="hw-lede hw-ledeC">
              以下内容结合你的命盘持续更新。深度报告（命书 / 年运等）仍需按次单独购买，不含在会员内。
            </p>
          </header>

          {/* 状态总览：到期日 / 剩余天数 / 解锁项 / 本月追问 */}
          <MemberStatusCard
            sub={sub}
            mode={mode}
            daysLeft={daysUntil(sub.expiresAt)}
            unlockedCount={unlockedCount}
            ask={ask}
          />

          {/* 权益宫格：逐项标明是否已解锁，未解锁链到定价页 */}
          <BenefitsGrid unlocked={unlocked} />

          <LiuYueSection s={data.liuyue} />
          <JiaoYunSection s={data.jiaoyun} />
          <HistorySection s={data.history} />
          <SimilarSection s={data.similarCases} />

          {/* 用量：多命盘配额 + 本月追问额度 */}
          <UsageRow multiChart={data.multiChart} ask={ask} isMember={sub.active} />

          {/* ★ 档 C：订阅自助管理（下次续费日 / 自动续费状态 / 一键取消或恢复） */}
          <SubscriptionCard sub={sub} onChanged={() => setReloadKey((k) => k + 1)} />

          {/* Web Push：每日日运提醒开关（会员在手机上及时收到更新） */}
          <PushOptIn />

          <div className="hw-m-cta">
            <Link href="/pricing" className="hw-m-btn">查看会员权益与开通 →</Link>
            <p className="hw-c-meta">会员权益在订阅期内持续更新，到期后内容将重新锁定。</p>
          </div>
        </div>
      </div>
    </main>
  )
}

/**
 * 会员状态总览卡（三态）。
 *   未开通：中性引导，不催单；在期：大号到期日 + 剩余天数；已取消续费：琥珀提示。
 */
function MemberStatusCard({ sub, mode, daysLeft, unlockedCount, ask }: {
  sub: SubStatus
  mode: 'active' | 'canceling' | 'inactive'
  daysLeft: number
  unlockedCount: number
  ask: AskQuota | null
}) {
  if (mode === 'inactive') {
    return (
      <section className="hw-m-hero hw-m-heroOff" id="status">
        <div className="hw-m-heroTop">
          <span className="hw-m-badge hw-m-badgeOff">未开通</span>
        </div>
        <p className="hw-m-dateLabel">会员状态</p>
        <p className="hw-m-date hw-m-dateSm">尚未开通会员</p>
        <p className="hw-m-days">
          开通即解锁 {SUBSCRIPTION_GRANTS.length} 项权益 + 每月 {MEMBER_ASK_PER_MONTH} 次追问
        </p>
        <div className="hw-m-stats">
          <div className="hw-m-stat">
            <b>0/{SUBSCRIPTION_GRANTS.length}</b>
            <span>项订阅权益已解锁</span>
          </div>
          <div className="hw-m-stat">
            <b>0</b>
            <span>本月会员追问额度（每月 {MEMBER_ASK_PER_MONTH} 次）</span>
          </div>
        </div>
        <div className="hw-m-heroAct">
          <Link href="/pricing" className="hw-m-btn">查看会员权益与开通 →</Link>
        </div>
      </section>
    )
  }

  const planSku = sub.plan === 'monthly'
    ? SKUS.member_monthly
    : sub.plan === 'yearly' ? SKUS.member_yearly : null
  const planPrice = planSku ? formatPriceUSD(planSku.priceUSD) : ''
  const periodText = sub.plan === 'yearly' ? '年' : '月'
  // 自动续费中看「下次续费日」；已取消续费看「会员到期日」（到期即失效）
  const dateLabel = mode === 'canceling' ? '会员到期日' : '下次续费日'
  const displayDate = sub.nextBillingAt ?? sub.expiresAt

  return (
    <section className="hw-m-hero" id="status">
      <div className="hw-m-heroTop">
        <span className={`hw-m-badge ${mode === 'canceling' ? 'hw-m-badgeWarn' : 'hw-m-badgeOn'}`}>
          {mode === 'canceling' ? '已取消续费' : '生效中'}
        </span>
        {planSku && (
          <span className="hw-m-plan">{planSku.name} · {planPrice}/{periodText}</span>
        )}
      </div>
      <p className="hw-m-dateLabel">{dateLabel}</p>
      <p className="hw-m-date">{fmtDay(displayDate)}</p>
      <p className="hw-m-days">剩余 <b>{daysLeft}</b> 天</p>
      <p className="hw-c-meta">
        {mode === 'canceling'
          ? '已取消自动续费，到期自动失效且不再扣费；可在下方一键恢复。'
          : '自动续费已开启，可在下方随时取消。'}
      </p>
      <div className="hw-m-stats">
        <div className="hw-m-stat">
          <b>{unlockedCount}/{SUBSCRIPTION_GRANTS.length}</b>
          <span>项订阅权益已解锁</span>
        </div>
        <div className="hw-m-stat">
          <b>{ask ? ask.memberRemaining : '—'}</b>
          <span>本月追问剩余（每月 {MEMBER_ASK_PER_MONTH} 次）</span>
        </div>
      </div>
    </section>
  )
}

/**
 * 权益宫格：由 SUBSCRIPTION_GRANTS 派生（禁止硬编码权益表），
 * 已解锁=木绿印章，未解锁=虚线卡 + 琥珀解锁链接。
 */
function BenefitsGrid({ unlocked }: { unlocked: Record<string, boolean> }) {
  const count = SUBSCRIPTION_GRANTS.filter((g) => unlocked[g]).length
  return (
    <section className="hw-m-sec" id="benefits">
      <div className="hw-m-secHead">
        <h2 className="hw-c-secTitle">订阅权益</h2>
        <p className="hw-c-meta">已解锁 {count}/{SUBSCRIPTION_GRANTS.length} 项</p>
      </div>
      <div className="hw-m-grid">
        {SUBSCRIPTION_GRANTS.map((g) => {
          const on = unlocked[g] === true
          return (
            <div key={g} className={'hw-m-benefit' + (on ? '' : ' hw-m-benefitLock')}>
              <div className="hw-m-bHead">
                <span className="hw-m-stamp" aria-hidden="true">{GRANT_STAMPS[g] ?? '权'}</span>
                <div>
                  <b className="hw-m-bName">{GRANT_LABELS[g]}</b>
                  <span className="hw-m-bState">{on ? '已解锁' : '未解锁'}</span>
                </div>
              </div>
              {!on && (
                <Link href="/pricing" className="hw-m-unlock">本项为会员权益 · 开通后解锁 →</Link>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

/**
 * 用量行（≥720px 两列）：多命盘配额 + 本月追问额度。
 * 追问额度以 /api/ask 为准（memberRemaining / packRemaining），失败时只显示静态口径。
 */
function UsageRow({ multiChart, ask, isMember }: {
  multiChart: { count: number; limit: number }
  ask: AskQuota | null
  isMember: boolean
}) {
  const memberLeft = ask ? ask.memberRemaining : null
  const pct = memberLeft === null
    ? 0
    : Math.max(0, Math.min(100, Math.round((memberLeft / MEMBER_ASK_PER_MONTH) * 100)))

  return (
    <section className="hw-c-two hw-m-sec" id="usage">
      <div className="hw-c-box">
        <h2 className="hw-c-secTitle">{GRANT_LABELS.multi_chart}</h2>
        <p className="hw-c-meta">
          已保存 {multiChart.count}/{multiChart.limit} 个命盘
          {multiChart.count >= multiChart.limit
            ? ' —— 已达上限，开通会员可保存更多。'
            : '，可为家人多排几盘。'}
        </p>
        <p className="mt-3">
          <Link href="/charts" className="hw-m-btn hw-m-btnSm">管理命盘</Link>
        </p>
      </div>

      <div className="hw-c-box">
        <h2 className="hw-c-secTitle">追问额度</h2>
        <div className="hw-m-quota">
          <b>{memberLeft === null ? '—' : memberLeft}</b>
          <span>/ {MEMBER_ASK_PER_MONTH} 次 · 本月</span>
        </div>
        <div className="hw-m-bar" aria-hidden="true"><i style={{ width: `${pct}%` }} /></div>
        <p className="hw-c-meta">
          {isMember
            ? `会员每月 ${MEMBER_ASK_PER_MONTH} 次追问，按自然月重置、不累计；先用会员额度，用完后才扣已购追问包。`
            : `开通会员后每月可用 ${MEMBER_ASK_PER_MONTH} 次追问，按自然月重置、不累计。`}
          {ask && ask.packRemaining > 0 && <> 已购追问包剩余 <b>{ask.packRemaining}</b> 次。</>}
        </p>
        <p className="mt-3">
          <Link href="/pricing" className="hw-m-btn hw-m-btnSm hw-m-btnGhost">
            {GRANT_LABELS.ask} / {formatPriceUSD(SKUS.ask_pack.priceUSD)} →
          </Link>
        </p>
      </div>
    </section>
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
      <section className="hw-c-box hw-m-sec text-center" id="subscription">
        <h2 className="hw-c-secTitle">会员订阅</h2>
        <p className="hw-c-meta">当前不是会员，开通后可查看上方全部专属内容。</p>
        <Link href="/pricing" className="hw-m-btn hw-m-btnSm">查看会员权益与开通 →</Link>
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
  const day = fmtDay

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
    <section className="hw-c-box hw-m-sec" id="subscription">
      <h2 className="hw-c-secTitle">会员订阅</h2>
      <div className="hw-m-kv">
        <p>
          当前套餐：<b>{planName}</b>
          {planPrice > 0 && <> · {formatPriceUSD(planPrice)}/{periodText}</>}
        </p>
        <p>
          {sub.canceling ? '会员到期日：' : '下次续费日：'}
          <b>{day(sub.nextBillingAt ?? sub.expiresAt)}</b>
          {sub.canceling && <>（已取消自动续费，到期自动失效）</>}
        </p>
        <p className="hw-c-meta">
          自动续费：{sub.autoRenew ? '已开启' : '已关闭'}
          {sub.cancelAt && <> · 取消申请于 {day(sub.cancelAt)}</>}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 mt-4">
        {sub.canceling ? (
          <button
            onClick={() => act('reactivate')}
            disabled={busy}
            className="hw-m-btn hw-m-btnSm"
          >
            {busy ? '处理中…' : '恢复自动续费'}
          </button>
        ) : (
          <button
            onClick={() => act('cancel')}
            disabled={busy}
            className="hw-m-btn hw-m-btnSm hw-m-btnGhost"
          >
            {busy ? '处理中…' : '取消订阅'}
          </button>
        )}
        <a
          href={WAFFO_PORTAL_URL}
          target="_blank"
          rel="noreferrer"
          className="hw-m-mini hover:underline"
        >
          改卡 / 查账单 →
        </a>
        <Link href="/terms" className="hw-m-mini hover:underline">
          退款政策
        </Link>
      </div>

      {msg && <p className="hw-m-mini mt-3">{msg}</p>}
    </section>
  )
}

/** 会员权益未解锁提示（统一文案，链到定价页） */
function LockedCard({ title, id }: { title: string; id?: string }) {
  return (
    <section className="hw-c-box hw-m-sec" id={id}>
      <h2 className="hw-c-secTitle">{title}</h2>
      <p className="hw-c-meta mt-1">
        <span className="hw-m-lockTag">本项为会员权益</span>，会员开通后即可查看。
      </p>
      <p className="mt-3">
        <Link href="/pricing" className="hw-m-btn hw-m-btnSm">解锁查看 →</Link>
      </p>
    </section>
  )
}

function LiuYueSection({ s }: { s: Section }) {
  const title = GRANT_LABELS.liuyue
  if (s.locked) return <LockedCard title={title} id="liuyue" />
  const months: any[] = s.data?.months ?? []
  const now = new Date()
  const thisYear = Number(s.data?.year) === now.getFullYear()
  return (
    <section className="hw-c-box hw-m-sec" id="liuyue">
      <div className="hw-m-secHead">
        <h2 className="hw-c-secTitle">{title}</h2>
        <p className="hw-c-meta">{s.data?.year} 年 · 共 {months.length} 个月</p>
      </div>
      <p className="hw-c-meta">按当年（{s.data?.year}）公历月的干支与节气，给出每月一句提示；仅当年。</p>
      <div className="hw-m-months">
        {months.map((m) => {
          const isNow = thisYear && m.month === now.getMonth() + 1
          return (
            <div key={m.month} className={'hw-m-month' + (isNow ? ' hw-m-monthNow' : '')}>
              <div className="hw-m-monthTop">
                <span>{m.month} 月</span>
                <b>{m.ganZhi}</b>
                {isNow && <i className="hw-m-now">当月</i>}
              </div>
              <p>{m.note}</p>
            </div>
          )
        })}
      </div>
      {months.length === 0 && <p className="hw-c-meta">暂无流月数据。</p>}
    </section>
  )
}

function JiaoYunSection({ s }: { s: Section }) {
  const title = GRANT_LABELS.jiaoyun
  if (s.locked) return <LockedCard title={title} id="jiaoyun" />
  const d = s.data
  if (!d?.current) return null
  return (
    <section className="hw-c-box hw-m-sec" id="jiaoyun">
      <h2 className="hw-c-secTitle">{title}</h2>
      <div className="hw-m-kv">
        <p>
          当前大运 <b>{d.current.ganZhi}</b>
          （{d.current.startYear}–{d.current.endYear} · {d.current.shiShenGan}）· {d.current.tag}
        </p>
        {d.next && (
          <p>
            下一交运：<b>{d.next.ganZhi}</b>
            （{d.next.startYear} 起 · {d.next.shiShenGan}）——
            距交运还有 <span className="hw-m-alert">约 {d.yearsToNext} 年</span>。
          </p>
        )}
        {d.next?.note && <p className="hw-c-meta">{d.next.note}</p>}
      </div>
    </section>
  )
}

function HistorySection({ s }: { s: Section }) {
  const title = GRANT_LABELS.history
  if (s.locked) return <LockedCard title={title} id="history" />
  const days: any[] = s.data ?? []
  return (
    <section className="hw-c-box hw-m-sec" id="history">
      <div className="hw-m-secHead">
        <h2 className="hw-c-secTitle">{title}</h2>
        <p className="hw-c-meta">共 {days.length} 天</p>
      </div>
      <p className="hw-c-meta">回看最近 {days.length} 天的个性化日运。</p>
      <div className="hw-m-tl">
        {days.map((d) => (
          <div key={d.date} className="hw-m-tlRow">
            <div className="hw-m-tlDate">
              <b>{d.date}</b>
              <span>{d.liuRi}日</span>
            </div>
            <div className="hw-m-tlDot" aria-hidden="true" />
            <div className="hw-m-tlMain">
              <span className="hw-m-pill">{d.shiShen}</span>
              <p>「{d.sign}」</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function SimilarSection({ s }: { s: Section }) {
  const title = GRANT_LABELS.similar_cases
  if (s.locked) return <LockedCard title={title} id="similar" />
  const cases: any[] = s.data ?? []
  return (
    <section className="hw-c-box hw-m-sec" id="similar">
      <div className="hw-m-secHead">
        <h2 className="hw-c-secTitle">{title}</h2>
        <p className="hw-c-meta">共 {cases.length} 则</p>
      </div>
      <p className="hw-c-meta">
        与你的命局结构相近的古籍命例，附出处与相似点（讲依据，不是话术）。
      </p>
      <div>
        {cases.map((c, i) => (
          <div key={c.id ?? i} className="hw-m-case">
            <span className="hw-m-caseNo" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
            <div>
              <p>{c.text}</p>
              <p className="hw-c-meta">
                出处：{c.source}
                {c.matches?.length > 0 && <> · 相似点：{c.matches.join('、')}</>}
              </p>
            </div>
          </div>
        ))}
        {cases.length === 0 && <p className="hw-c-meta">暂未检索到相近的古籍命例。</p>}
      </div>
    </section>
  )
}
