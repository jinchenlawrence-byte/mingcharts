'use client'

// 会员中心共享实现（2026-11-04 统一第二批）
//
// 简体版此前是 (zh)/member/page.tsx 的 615 行实现；繁体版只有「状态 + 管理订阅」93 行，
// 缺权益宫格、追问额度、权益内容区与站内取消自动续费。现在抽成本组件，简/繁两树只传 locale。
// 英文树保留自己的英文实现（en/member/page.tsx），未来可再收口到本组件。
//
// 数据来自 /api/member/summary（内容）+ /api/membership（订阅状态）；
// 追问额度额外读一次 /api/ask（失败置 null，只显示静态权益文案，不阻塞页面）。
// 权益标题逐项取 GRANT_LABELS（单一事实源），宫格由 SUBSCRIPTION_GRANTS 派生，不硬编码权益表。

import { useEffect, useState } from 'react'
import Link from 'next/link'
import SiteHeader from '@/components/SiteHeader'
import PushOptIn from '@/components/PushOptIn'
import { GRANT_LABELS } from '@/lib/grantLabels'
import { getSupabase } from '@/lib/supabase'
import { toHant } from '@/lib/hant'
import { pathForLang, type SiteLang } from '@/lib/lang'
import { SKUS, formatPriceUSD, SUBSCRIPTION_GRANTS, MEMBER_ASK_PER_MONTH, ASK_PER_REPORT, ASK_PER_INVITE } from '@/lib/pricing'
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

// 追问额度（/api/ask GET）：会员本月 + 报告赠送 + 邀请奖励 + 追问包
interface AskQuota {
  remaining: number
  memberRemaining: number
  reportRemaining: number
  inviteRemaining: number
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

export default function MemberCenter({ locale = 'zh-Hans' }: { locale?: SiteLang }) {
  const H = (s: string) => (locale === 'zh-Hant' ? toHant(s) : s)
  const L = (p: string) => pathForLang(p, locale)
  const dateLocale = locale === 'zh-Hant' ? 'zh-TW' : 'zh-CN'

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
              reportRemaining: Number(askJson.reportRemaining) || 0,
              inviteRemaining: Number(askJson.inviteRemaining) || 0,
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
        <SiteHeader locale={locale} />
        <div className="hw-wrap hw-c-pg"><p className="text-center text-ink-light/60">{H('加载中…')}</p></div>
      </main>
    )
  }

  // 未登录 / 无命盘：统一引导
  if (!data || data.authState !== 'hasChart') {
    const guest = !data || data.authState === 'guest'
    return (
      <main className="hw-page">
        <SiteHeader locale={locale} />
        <div className="hw-wrap hw-c-pg">
          <div className="hw-m-wrap">
            <Link href={L('/')} className="hw-c-back">‹ {H('首页')}</Link>
            <header className="hw-m-head">
              <h1 className="hw-c-h1">{H('会员中心')}</h1>
              <p className="hw-lede hw-ledeC">
                {H('个性化日运、流月提示、交运提醒、历史回看与古籍命例对照，一屏掌握。')}
              </p>
            </header>
            <div className="hw-c-box text-center">
              <p className="hw-c-dx">
                {guest
                  ? H('登录并保存命盘后，即可查看你的会员专属内容。')
                  : H('还没有保存的命盘，先去排一个吧。')}
              </p>
              <p className="mt-4">
                <Link href={guest ? L('/auth') : L('/')} className="hw-m-btn">
                  {guest ? H('去登录') : H('去排盘')}
                </Link>
              </p>
            </div>
            {/* ★ 档 C：没有命盘的在期会员也必须能自助取消（合规），故此处同样展示管理卡 */}
            <SubscriptionCard sub={sub} onChanged={() => setReloadKey((k) => k + 1)} locale={locale} H={H} L={L} dateLocale={dateLocale} />
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
      <SiteHeader locale={locale} />
      <div className="hw-wrap hw-c-pg">
        <div className="hw-m-wrap">
          <Link href={L('/')} className="hw-c-back">‹ {H('首页')}</Link>
          <header className="hw-m-head">
            <h1 className="hw-c-h1">{H('会员中心')}</h1>
            <p className="hw-lede hw-ledeC">
              {H('以下内容结合你的命盘持续更新。深度报告（命书 / 年运等）仍需按次单独购买，不含在会员内。')}
            </p>
          </header>

          {/* 状态总览：到期日 / 剩余天数 / 解锁项 / 本月追问 */}
          <MemberStatusCard sub={sub} mode={mode} daysLeft={daysUntil(sub.expiresAt)} unlockedCount={unlockedCount} ask={ask} H={H} L={L} dateLocale={dateLocale} />

          {/* 权益宫格：逐项标明是否已解锁，未解锁链到定价页 */}
          <BenefitsGrid unlocked={unlocked} H={H} L={L} />

          <LiuYueSection s={data.liuyue} H={H} L={L} />
          <JiaoYunSection s={data.jiaoyun} H={H} L={L} />
          <HistorySection s={data.history} H={H} L={L} />
          <SimilarSection s={data.similarCases} H={H} L={L} />

          {/* 用量：多命盘配额 + 本月追问额度 */}
          <UsageRow multiChart={data.multiChart} ask={ask} isMember={sub.active} H={H} L={L} />

          {/* ★ 档 C：订阅自助管理（下次续费日 / 自动续费状态 / 一键取消或恢复） */}
          <SubscriptionCard sub={sub} onChanged={() => setReloadKey((k) => k + 1)} locale={locale} H={H} L={L} dateLocale={dateLocale} />

          {/* Web Push：每日日运提醒开关（会员在手机上及时收到更新） */}
          <PushOptIn />

          <div className="hw-m-cta">
            <Link href={L('/pricing')} className="hw-m-btn">{H('查看会员权益与开通 →')}</Link>
            <p className="hw-c-meta">{H('会员权益在订阅期内持续更新，到期后内容将重新锁定。')}</p>
          </div>
        </div>
      </div>
    </main>
  )
}

type Helpers = {
  H: (s: string) => string
  L: (p: string) => string
}

/**
 * 会员状态总览卡（三态）。
 *   未开通：中性引导，不催单；在期：大号到期日 + 剩余天数；已取消续费：琥珀提示。
 */
function MemberStatusCard({ sub, mode, daysLeft, unlockedCount, ask, H, L, dateLocale }: Helpers & {
  sub: SubStatus
  mode: 'active' | 'canceling' | 'inactive'
  daysLeft: number
  unlockedCount: number
  ask: AskQuota | null
  dateLocale: string
}) {
  if (mode === 'inactive') {
    return (
      <section className="hw-m-hero hw-m-heroOff" id="status">
        <div className="hw-m-heroTop">
          <span className="hw-m-badge hw-m-badgeOff">{H('未开通')}</span>
        </div>
        <p className="hw-m-dateLabel">{H('会员状态')}</p>
        <p className="hw-m-date hw-m-dateSm">{H('尚未开通会员')}</p>
        <p className="hw-m-days">
          {H(`开通即解锁 ${SUBSCRIPTION_GRANTS.length} 项权益 + 每月 ${MEMBER_ASK_PER_MONTH} 次追问`)}
        </p>
        <div className="hw-m-stats">
          <div className="hw-m-stat">
            <b>0/{SUBSCRIPTION_GRANTS.length}</b>
            <span>{H('项订阅权益已解锁')}</span>
          </div>
          <div className="hw-m-stat">
            <b>0</b>
            <span>{H(`本月会员追问额度（每月 ${MEMBER_ASK_PER_MONTH} 次）`)}</span>
          </div>
        </div>
        <div className="hw-m-heroAct">
          <Link href={L('/pricing')} className="hw-m-btn">{H('查看会员权益与开通 →')}</Link>
        </div>
      </section>
    )
  }

  const planSku = sub.plan === 'monthly'
    ? SKUS.member_monthly
    : sub.plan === 'yearly' ? SKUS.member_yearly : null
  const planPrice = planSku ? formatPriceUSD(planSku.priceUSD) : ''
  const periodText = sub.plan === 'yearly' ? H('年') : H('月')
  // 自动续费中看「下次续费日」；已取消续费看「会员到期日」（到期即失效）
  const dateLabel = mode === 'canceling' ? H('会员到期日') : H('下次续费日')
  const displayDate = sub.nextBillingAt ?? sub.expiresAt
  const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(dateLocale) : '—')

  return (
    <section className="hw-m-hero" id="status">
      <div className="hw-m-heroTop">
        <span className={`hw-m-badge ${mode === 'canceling' ? 'hw-m-badgeWarn' : 'hw-m-badgeOn'}`}>
          {mode === 'canceling' ? H('已取消续费') : H('生效中')}
        </span>
        {planSku && (
          <span className="hw-m-plan">{H(planSku.name)} · {planPrice}/{periodText}</span>
        )}
      </div>
      <p className="hw-m-dateLabel">{dateLabel}</p>
      <p className="hw-m-date">{day(displayDate)}</p>
      <p className="hw-m-days">{H('剩余 ')}<b>{daysLeft}</b>{H(' 天')}</p>
      <p className={mode === 'canceling' ? 'hw-alert hw-alert--warn' : 'hw-c-meta'}>
        {mode === 'canceling'
          ? H('已取消自动续费，到期自动失效且不再扣费；可在下方一键恢复。')
          : H('自动续费已开启，可在下方随时取消。')}
      </p>
      <div className="hw-m-stats">
        <div className="hw-m-stat">
          <b>{unlockedCount}/{SUBSCRIPTION_GRANTS.length}</b>
          <span>{H('项订阅权益已解锁')}</span>
        </div>
        <div className="hw-m-stat">
          <b>{ask ? ask.memberRemaining : '—'}</b>
          <span>{H(`本月追问剩余（每月 ${MEMBER_ASK_PER_MONTH} 次）`)}</span>
        </div>
      </div>
    </section>
  )
}

/**
 * 权益宫格：由 SUBSCRIPTION_GRANTS 派生（禁止硬编码权益表），
 * 已解锁=木绿印章，未解锁=虚线卡 + 琥珀解锁链接。
 */
function BenefitsGrid({ unlocked, H, L }: Helpers & { unlocked: Record<string, boolean> }) {
  const count = SUBSCRIPTION_GRANTS.filter((g) => unlocked[g]).length
  return (
    <section className="hw-m-sec" id="benefits">
      <div className="hw-m-secHead">
        <h2 className="hw-c-secTitle">{H('订阅权益')}</h2>
        <p className="hw-c-meta">{H(`已解锁 ${count}/${SUBSCRIPTION_GRANTS.length} 项`)}</p>
      </div>
      <div className="hw-m-grid">
        {SUBSCRIPTION_GRANTS.map((g) => {
          const on = unlocked[g] === true
          return (
            <div key={g} className={'hw-m-benefit' + (on ? '' : ' hw-m-benefitLock')}>
              <div className="hw-m-bHead">
                <span className="hw-m-stamp" aria-hidden="true">{H(GRANT_STAMPS[g] ?? '权')}</span>
                <div>
                  <b className="hw-m-bName">{H(GRANT_LABELS[g])}</b>
                  <span className="hw-m-bState">{on ? H('已解锁') : H('未解锁')}</span>
                </div>
              </div>
              {!on && (
                <Link href={L('/pricing')} className="hw-m-unlock">{H('本项为会员权益 · 开通后解锁 →')}</Link>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

/**
 * 用量行（≥720px 两列）：多命盘配额 + 追问额度。
 * 追问额度以 /api/ask 为准（会员本月 / 报告赠送 / 追问包），失败时只显示静态口径。
 */
function UsageRow({ multiChart, ask, isMember, H, L }: Helpers & {
  multiChart: { count: number; limit: number }
  ask: AskQuota | null
  isMember: boolean
}) {
  const total = ask ? ask.remaining : null
  const memberLeft = ask ? ask.memberRemaining : 0
  const pct = isMember
    ? Math.max(0, Math.min(100, Math.round((memberLeft / MEMBER_ASK_PER_MONTH) * 100)))
    : 0

  return (
    <section className="hw-c-two hw-m-sec" id="usage">
      <div className="hw-c-box">
        <h2 className="hw-c-secTitle">{H(GRANT_LABELS.multi_chart)}</h2>
        <p className="hw-c-meta">
          {multiChart.count >= multiChart.limit
            ? H(`已保存 ${multiChart.count}/${multiChart.limit} 个命盘 —— 已达上限，开通会员可保存更多。`)
            : H(`已保存 ${multiChart.count}/${multiChart.limit} 个命盘，可为家人多排几盘。`)}
        </p>
        <p className="mt-3">
          <Link href={L('/charts')} className="hw-m-btn hw-m-btnSm">{H('管理命盘')}</Link>
        </p>
      </div>

      <div className="hw-c-box">
        <h2 className="hw-c-secTitle">{H('追问额度')}</h2>
        <div className="hw-m-quota">
          <b>{total === null ? '—' : total}</b>
          <span>{H('次可用')}</span>
        </div>
        {isMember && <div className="hw-m-bar" aria-hidden="true"><i style={{ width: `${pct}%` }} /></div>}
        <p className="hw-c-meta">
          {H(`会员本月 ${memberLeft}/${MEMBER_ASK_PER_MONTH} 次 · 报告赠送 ${ask ? ask.reportRemaining : '—'} 次 · 邀请奖励 ${ask ? ask.inviteRemaining : '—'} 次 · 追问包 ${ask ? ask.packRemaining : '—'} 次。`)}
        </p>
        <p className="hw-c-meta">
          {H(`购买任一报告、开通会员或邀请好友注册后即可追问；会员每月 ${MEMBER_ASK_PER_MONTH} 次按自然月重置、不累计，每份报告另赠 ${ASK_PER_REPORT} 次、每邀请 1 人赠 ${ASK_PER_INVITE} 次（均终身有效），先用会员额度、再扣报告赠送与邀请奖励、最后扣追问包。`)}
        </p>
        <p className="hw-c-meta">
          {H('邀请方式：在排盘结果页或日签页点「分享给朋友」，对方通过你的链接注册即计入 1 人；每人只能被邀请一次，邀请人不能邀请自己。')}
        </p>
        <p className="mt-3">
          <Link href={L('/pricing')} className="hw-m-btn hw-m-btnSm hw-m-btnGhost">
            {H(GRANT_LABELS.ask)} / {formatPriceUSD(SKUS.ask_pack.priceUSD)} →
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
function SubscriptionCard({ sub, onChanged, H, L, dateLocale }: Helpers & {
  sub: SubStatus
  onChanged: () => void
  locale?: SiteLang
  dateLocale: string
}) {
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  if (!sub.active && !sub.canceling) {
    return (
      <section className="hw-c-box hw-m-sec text-center" id="subscription">
        <h2 className="hw-c-secTitle">{H('会员订阅')}</h2>
        <p className="hw-c-meta">{H('当前不是会员，开通后可查看上方全部专属内容。')}</p>
        <Link href={L('/pricing')} className="hw-m-btn hw-m-btnSm">{H('查看会员权益与开通 →')}</Link>
      </section>
    )
  }

  const planName = sub.plan
    ? H(SKUS[sub.plan === 'monthly' ? 'member_monthly' : 'member_yearly'].name)
    : H('会员')
  const planPrice = sub.plan
    ? SKUS[sub.plan === 'monthly' ? 'member_monthly' : 'member_yearly'].priceUSD
    : 0
  const periodText = sub.plan === 'yearly' ? H('年') : H('月')
  const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(dateLocale) : '—')

  const act = async (action: 'cancel' | 'reactivate') => {
    if (action === 'cancel' && !window.confirm(
      H(`确认取消自动续费？取消后在 ${day(sub.expiresAt)} 之前仍可使用会员权益，到期自动失效且不再扣费。`)
    )) return

    setBusy(true)
    setMsg('')
    try {
      const supabase = getSupabase()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error(H('登录已过期，请重新登录'))
      const res = await fetch('/api/membership/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: session.access_token, action }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || H('操作失败'))
      setMsg(action === 'cancel' ? H('已取消自动续费（本期内仍可使用）。') : H('已恢复自动续费。'))
      onChanged() // 重新拉取权威状态（以渠道 webhook 为准）
    } catch (e) {
      setMsg(e instanceof Error ? e.message : H('操作失败，请稍后重试'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="hw-c-box hw-m-sec" id="subscription">
      <h2 className="hw-c-secTitle">{H('会员订阅')}</h2>
      <div className="hw-m-kv">
        <p>
          {H('当前套餐：')}<b>{planName}</b>
          {planPrice > 0 && <> · {formatPriceUSD(planPrice)}/{periodText}</>}
        </p>
        <p>
          {sub.canceling ? H('会员到期日：') : H('下次续费日：')}
          <b>{day(sub.nextBillingAt ?? sub.expiresAt)}</b>
          {sub.canceling && <>{H('（已取消自动续费，到期自动失效）')}</>}
        </p>
        <p className="hw-c-meta">
          {H('自动续费：')}{sub.autoRenew ? H('已开启') : H('已关闭')}
          {sub.cancelAt && <>{H(' · 取消申请于 ')}{day(sub.cancelAt)}</>}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 mt-4">
        {sub.canceling ? (
          <button onClick={() => act('reactivate')} disabled={busy} className="hw-m-btn hw-m-btnSm">
            {busy ? H('处理中…') : H('恢复自动续费')}
          </button>
        ) : (
          <button onClick={() => act('cancel')} disabled={busy} className="hw-m-btn hw-m-btnSm hw-m-btnGhost">
            {busy ? H('处理中…') : H('取消订阅')}
          </button>
        )}
        <a href={WAFFO_PORTAL_URL} target="_blank" rel="noreferrer" className="hw-m-mini hover:underline">
          {H('改卡 / 查账单 →')}
        </a>
        <Link href={L('/terms')} className="hw-m-mini hover:underline">
          {H('退款政策')}
        </Link>
      </div>

      {msg && <p className="hw-m-mini mt-3">{msg}</p>}
    </section>
  )
}

/** 会员权益未解锁提示（统一文案，链到定价页） */
function LockedCard({ title, id, H, L }: Helpers & { title: string; id?: string }) {
  return (
    <section className="hw-c-box hw-m-sec" id={id}>
      <h2 className="hw-c-secTitle">{title}</h2>
      <p className="hw-c-meta mt-1">
        <span className="hw-m-lockTag">{H('本项为会员权益')}</span>{H('，会员开通后即可查看。')}
      </p>
      <p className="mt-3">
        <Link href={L('/pricing')} className="hw-m-btn hw-m-btnSm">{H('解锁查看 →')}</Link>
      </p>
    </section>
  )
}

function LiuYueSection({ s, H, L }: Helpers & { s: Section }) {
  const title = H(GRANT_LABELS.liuyue)
  if (s.locked) return <LockedCard title={title} id="liuyue" H={H} L={L} />
  const months: any[] = s.data?.months ?? []
  const now = new Date()
  const thisYear = Number(s.data?.year) === now.getFullYear()
  return (
    <section className="hw-c-box hw-m-sec" id="liuyue">
      <div className="hw-m-secHead">
        <h2 className="hw-c-secTitle">{title}</h2>
        <p className="hw-c-meta">{s.data?.year} {H('年 · 共 ')}{months.length} {H('个月')}</p>
      </div>
      <p className="hw-c-meta">{H(`按当年（${s.data?.year}）公历月的干支与节气，给出每月一句提示；仅当年。`)}</p>
      <div className="hw-m-months">
        {months.map((m) => {
          const isNow = thisYear && m.month === now.getMonth() + 1
          return (
            <div key={m.month} className={'hw-m-month' + (isNow ? ' hw-m-monthNow' : '')}>
              <div className="hw-m-monthTop">
                <span>{m.month} {H('月')}</span>
                <b>{m.ganZhi}</b>
                {isNow && <i className="hw-m-now">{H('当月')}</i>}
              </div>
              <p>{H(m.note ?? '')}</p>
            </div>
          )
        })}
      </div>
      {months.length === 0 && <p className="hw-c-meta">{H('暂无流月数据。')}</p>}
    </section>
  )
}

function JiaoYunSection({ s, H, L }: Helpers & { s: Section }) {
  const title = H(GRANT_LABELS.jiaoyun)
  if (s.locked) return <LockedCard title={title} id="jiaoyun" H={H} L={L} />
  const d = s.data
  if (!d?.current) return null
  return (
    <section className="hw-c-box hw-m-sec" id="jiaoyun">
      <h2 className="hw-c-secTitle">{title}</h2>
      <div className="hw-m-kv">
        <p>
          {H('当前大运 ')}<b>{d.current.ganZhi}</b>
          {`（${d.current.startYear}–${d.current.endYear} · ${d.current.shiShenGan}）· ${d.current.tag}`}
        </p>
        {d.next && (
          <p>
            {H('下一交运：')}<b>{d.next.ganZhi}</b>
            {`（${d.next.startYear} ${H('起')} · ${d.next.shiShenGan}）—— `}
            {H('距交运还有 ')}<span className="hw-m-alert">{H(`约 ${d.yearsToNext} 年`)}</span>{H('。')}
          </p>
        )}
        {d.next?.note && <p className="hw-c-meta">{H(d.next.note ?? '')}</p>}
      </div>
    </section>
  )
}

function HistorySection({ s, H, L }: Helpers & { s: Section }) {
  const title = H(GRANT_LABELS.history)
  if (s.locked) return <LockedCard title={title} id="history" H={H} L={L} />
  const days: any[] = s.data ?? []
  return (
    <section className="hw-c-box hw-m-sec" id="history">
      <div className="hw-m-secHead">
        <h2 className="hw-c-secTitle">{title}</h2>
        <p className="hw-c-meta">{H('共 ')}{days.length} {H('天')}</p>
      </div>
      <p className="hw-c-meta">{H(`回看最近 ${days.length} 天的个性化日运。`)}</p>
      <div className="hw-m-tl">
        {days.map((d) => (
          <div key={d.date} className="hw-m-tlRow">
            <div className="hw-m-tlDate">
              <b>{d.date}</b>
              <span>{d.liuRi}{H('日')}</span>
            </div>
            <div className="hw-m-tlDot" aria-hidden="true" />
            <div className="hw-m-tlMain">
              <span className="hw-m-pill">{d.shiShen}</span>
              <p>{H('「')}{H(d.sign ?? '')}{H('」')}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function SimilarSection({ s, H, L }: Helpers & { s: Section }) {
  const title = H(GRANT_LABELS.similar_cases)
  if (s.locked) return <LockedCard title={title} id="similar" H={H} L={L} />
  const cases: any[] = s.data ?? []
  return (
    <section className="hw-c-box hw-m-sec" id="similar">
      <div className="hw-m-secHead">
        <h2 className="hw-c-secTitle">{title}</h2>
        <p className="hw-c-meta">{H('共 ')}{cases.length} {H('则')}</p>
      </div>
      <p className="hw-c-meta">
        {H('与你的命局结构相近的古籍命例，附出处与相似点（讲依据，不是话术）。')}
      </p>
      <div>
        {cases.map((c, i) => (
          <div key={c.id ?? i} className="hw-m-case">
            <span className="hw-m-caseNo" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
            <div>
              <p>{H(c.text ?? '')}</p>
              <p className="hw-c-meta">
                {H('出处：')}{H(c.source ?? '')}
                {c.matches?.length > 0 && <>{H(' · 相似点：')}{c.matches.map((m: string) => H(m)).join(H('、'))}</>}
              </p>
            </div>
          </div>
        ))}
        {cases.length === 0 && <p className="hw-c-meta">{H('暂未检索到相近的古籍命例。')}</p>}
      </div>
    </section>
  )
}

// LockedCard 的定价链接统一走调用方注入的 L（按 locale 加前缀）。

/** 剩余天数（不足一天按一天算；仅用于展示） */
function daysUntil(iso: string | null) {
  if (!iso) return 0
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000))
}
