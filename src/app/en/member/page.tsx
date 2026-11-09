'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getSupabase } from '@/lib/supabase'
import { SKUS, formatPriceUSD, SUBSCRIPTION_GRANTS, MEMBER_ASK_PER_MONTH, ASK_PER_REPORT, ASK_PER_INVITE } from '@/lib/pricing'
import { WAFFO_PORTAL_URL } from '@/lib/waffo-products'
import { pricingFocusHref } from '@/lib/pricingFocus'

type Section = { locked: boolean; data: any }

interface Summary {
  authState: 'guest' | 'noChart' | 'hasChart'
  liuyue: Section
  jiaoyun: Section
  history: Section
  similarCases: Section
  multiChart: { count: number; limit: number }
}

interface SubStatus {
  active: boolean
  plan: 'monthly' | 'yearly' | null
  expiresAt: string | null
  autoRenew: boolean
  canceling: boolean
  cancelAt: string | null
  nextBillingAt: string | null
}

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

// English benefit names (the canonical Chinese labels stay in GRANT_LABELS for the zh/tw pages).
const GRANT_EN: Record<string, string> = {
  daily: 'Daily personal fortune',
  liuyue: 'Monthly notes',
  jiaoyun: 'Luck Pillar change alerts',
  multi_chart: 'Multi-chart management (3–5 charts)',
  similar_cases: 'Classical case comparison',
  history: 'Daily fortune history',
}

// Latin stamps replace the Chinese seal characters used on the zh/tw page.
const GRANT_STAMPS_EN: Record<string, string> = {
  daily: 'D', liuyue: 'M', jiaoyun: 'L',
  multi_chart: 'C', similar_cases: 'X', history: 'H',
}

const planNameEn = (p: SubStatus['plan']) =>
  p === 'yearly' ? 'Annual membership' : p === 'monthly' ? 'Monthly membership' : 'Membership'

const fmtDay = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-US') : '—')

const daysUntil = (iso: string | null) => {
  if (!iso) return 0
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000))
}

export default function EnMemberPage() {
  const [data, setData] = useState<Summary | null>(null)
  const [sub, setSub] = useState<SubStatus>(EMPTY_SUB)
  const [ask, setAsk] = useState<AskQuota | null>(null)
  const [loading, setLoading] = useState(true)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    ;(async () => {
      try {
        const supabase = getSupabase()
        const { data: { session } } = await supabase.auth.getSession()
        const token = session?.access_token
        const q = token ? `?token=${encodeURIComponent(token)}` : ''
        const [sumRes, subRes, askRes] = await Promise.all([
          fetch(`/api/member/summary${q}`),
          fetch(`/api/membership${q}`),
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
        // Silent: a failed member-centre load must not break other pages.
      } finally {
        setLoading(false)
      }
    })()
  }, [reloadKey])

  if (loading) {
    return (
      <div className="hw-wrap hw-c-pg"><p className="text-center text-ink-light">Loading…</p></div>
    )
  }

  if (!data || data.authState !== 'hasChart') {
    const guest = !data || data.authState === 'guest'
    return (
      <div className="hw-wrap hw-c-pg">
        <div className="hw-m-wrap">
          <Link href="/en" className="hw-c-back">‹ Home</Link>
          <header className="hw-m-head">
            <h1 className="hw-c-h1">Member centre</h1>
            <p className="hw-lede hw-ledeC">Personalised daily fortune, monthly notes, Luck Pillar change alerts, history and classical case comparison, all in one place.</p>
          </header>
          <div className="hw-c-box text-center">
            <p className="hw-c-dx">
              {guest ? 'Sign in and save a chart to see your member-only content.' : 'You have no saved chart yet. Create one first.'}
            </p>
            <p className="mt-4">
              <Link href={guest ? '/en/auth' : '/en'} className="hw-m-btn">
                {guest ? 'Sign in' : 'Create a chart'}
              </Link>
            </p>
          </div>
          <SubscriptionCard sub={sub} onChanged={() => setReloadKey((k) => k + 1)} />
        </div>
      </div>
    )
  }

  const mode: 'active' | 'canceling' | 'inactive' =
    sub.active ? (sub.canceling ? 'canceling' : 'active') : 'inactive'

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
    <div className="hw-wrap hw-c-pg">
      <div className="hw-m-wrap">
        <Link href="/en" className="hw-c-back">‹ Home</Link>
        <header className="hw-m-head">
          <h1 className="hw-c-h1">Member centre</h1>
          <p className="hw-lede hw-ledeC">
            The content below updates with your chart. In-depth reports (Fate Book, annual and other readings) are still bought per report and are not included in membership.
          </p>
        </header>

        <MemberStatusCard
          sub={sub}
          mode={mode}
          daysLeft={daysUntil(sub.expiresAt)}
          unlockedCount={unlockedCount}
          ask={ask}
        />

        <BenefitsGrid unlocked={unlocked} />

        <MemberContent data={data} />

        <UsageRow multiChart={data.multiChart} ask={ask} isMember={sub.active} />

        <SubscriptionCard sub={sub} onChanged={() => setReloadKey((k) => k + 1)} />

        <div className="hw-m-cta">
          <Link href={pricingFocusHref('en', 'member_monthly')} className="hw-m-btn">See membership benefits and subscribe →</Link>
          <p className="hw-c-meta">Member benefits keep updating for the subscription period; after expiry the content is locked again.</p>
        </div>
      </div>
    </div>
  )
}

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
          <span className="hw-m-badge hw-m-badgeOff">Not subscribed</span>
        </div>
        <p className="hw-m-dateLabel">Membership status</p>
        <p className="hw-m-date hw-m-dateSm">No active membership</p>
        <p className="hw-m-days">
          Subscribe to unlock {SUBSCRIPTION_GRANTS.length} benefits plus {MEMBER_ASK_PER_MONTH} follow-up questions each month
        </p>
        <div className="hw-m-stats">
          <div className="hw-m-stat">
            <b>0/{SUBSCRIPTION_GRANTS.length}</b>
            <span>subscription benefits unlocked</span>
          </div>
          <div className="hw-m-stat">
            <b>0</b>
            <span>member questions this month ({MEMBER_ASK_PER_MONTH} per month)</span>
          </div>
        </div>
        <div className="hw-m-heroAct">
          <Link href={pricingFocusHref('en', 'member_monthly')} className="hw-m-btn">See membership benefits and subscribe →</Link>
        </div>
      </section>
    )
  }

  const planSku = sub.plan === 'monthly'
    ? SKUS.member_monthly
    : sub.plan === 'yearly' ? SKUS.member_yearly : null
  const planPrice = planSku ? formatPriceUSD(planSku.priceUSD) : ''
  const periodText = sub.plan === 'yearly' ? 'year' : 'month'
  const dateLabel = mode === 'canceling' ? 'Membership ends' : 'Next billing date'
  const displayDate = sub.nextBillingAt ?? sub.expiresAt

  return (
    <section className="hw-m-hero" id="status">
      <div className="hw-m-heroTop">
        <span className={`hw-m-badge ${mode === 'canceling' ? 'hw-m-badgeWarn' : 'hw-m-badgeOn'}`}>
          {mode === 'canceling' ? 'Renewal cancelled' : 'Active'}
        </span>
        {planSku && (
          <span className="hw-m-plan">{planNameEn(sub.plan)} · {planPrice}/{periodText}</span>
        )}
      </div>
      <p className="hw-m-dateLabel">{dateLabel}</p>
      <p className="hw-m-date">{fmtDay(displayDate)}</p>
      <p className="hw-m-days"><b>{daysLeft}</b> days remaining</p>
      <p className="hw-c-meta">
        {mode === 'canceling'
          ? 'Auto-renewal is cancelled; access ends on the date above and no further charge is made. You can restore it below.'
          : 'Auto-renewal is on. You can cancel at any time below.'}
      </p>
      <div className="hw-m-stats">
        <div className="hw-m-stat">
          <b>{unlockedCount}/{SUBSCRIPTION_GRANTS.length}</b>
          <span>subscription benefits unlocked</span>
        </div>
        <div className="hw-m-stat">
          <b>{ask ? ask.memberRemaining : '—'}</b>
          <span>member questions left this month ({MEMBER_ASK_PER_MONTH} per month)</span>
        </div>
      </div>
    </section>
  )
}

function BenefitsGrid({ unlocked }: { unlocked: Record<string, boolean> }) {
  const count = SUBSCRIPTION_GRANTS.filter((g) => unlocked[g]).length
  return (
    <section className="hw-m-sec" id="benefits">
      <div className="hw-m-secHead">
        <h2 className="hw-c-secTitle">Subscription benefits</h2>
        <p className="hw-c-meta">{count}/{SUBSCRIPTION_GRANTS.length} unlocked</p>
      </div>
      <div className="hw-m-grid">
        {SUBSCRIPTION_GRANTS.map((g) => {
          const on = unlocked[g] === true
          return (
            <div key={g} className={'hw-m-benefit' + (on ? '' : ' hw-m-benefitLock')}>
              <div className="hw-m-bHead">
                <span className="hw-m-stamp" aria-hidden="true">{GRANT_STAMPS_EN[g] ?? 'B'}</span>
                <div>
                  <b className="hw-m-bName">{GRANT_EN[g] ?? 'Benefit'}</b>
                  <span className="hw-m-bState">{on ? 'Unlocked' : 'Locked'}</span>
                </div>
              </div>
              {!on && (
                <Link href={pricingFocusHref('en', 'member_monthly')} className="hw-m-unlock">A member benefit · unlock with membership →</Link>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

/**
 * Member content: counts and links only.
 * The underlying summaries (monthly notes, daily history, classical cases) are generated in Chinese
 * by the shared API, so the English page must not print them verbatim; it shows what is available
 * and routes to the English tools instead of dropping the section.
 */
function MemberContent({ data }: { data: Summary }) {
  const months: any[] = data.liuyue.data?.months ?? []
  const days: any[] = data.history.data ?? []
  const cases: any[] = data.similarCases.data ?? []
  const sections: Array<{ title: string; locked: boolean; body: string; href: string; cta: string }> = [
    {
      title: GRANT_EN.liuyue,
      locked: data.liuyue.locked,
      body: months.length
        ? `${months.length} monthly notes for ${data.liuyue.data?.year ?? ''} are available. Open the annual page to read them in English.`
        : 'Monthly notes follow the sexagenary cycle and solar terms for the current year.',
      href: '/en/liunian',
      cta: 'Open the annual reading →',
    },
    {
      title: GRANT_EN.jiaoyun,
      locked: data.jiaoyun.locked,
      body: data.jiaoyun.data?.next
        ? `Your next Luck Pillar change is about ${data.jiaoyun.data.yearsToNext} years away.`
        : 'Alerts when the current Luck Pillar changes.',
      href: '/en/chart',
      cta: 'Open my chart →',
    },
    {
      title: GRANT_EN.history,
      locked: data.history.locked,
      body: days.length
        ? `${days.length} days of personalised daily fortune are available to revisit.`
        : 'Revisit your personalised daily fortune history.',
      href: '/en/chart',
      cta: 'Open my chart →',
    },
    {
      title: GRANT_EN.similar_cases,
      locked: data.similarCases.locked,
      body: cases.length
        ? `${cases.length} classical cases with a structure close to your chart are matched.`
        : 'Classical cases whose structure matches your chart, with sources and shared points.',
      href: '/en/chart',
      cta: 'Open my chart →',
    },
  ]

  return (
    <section className="hw-c-two hw-m-sec" id="content">
      {sections.map((s) => (
        <div key={s.title} className="hw-c-box">
          <div className="hw-m-secHead">
            <h2 className="hw-c-secTitle">{s.title}</h2>
            <p className="hw-c-meta">{s.locked ? 'Locked' : 'Available'}</p>
          </div>
          <p className="hw-c-meta">{s.body}</p>
          <p className="mt-3">
            {s.locked ? (
              <Link href={pricingFocusHref('en', 'member_monthly')} className="hw-m-btn hw-m-btnSm">Unlock with membership →</Link>
            ) : (
              <Link href={s.href} className="hw-m-btn hw-m-btnSm">{s.cta}</Link>
            )}
          </p>
        </div>
      ))}
    </section>
  )
}

function UsageRow({ multiChart, ask, isMember }: {
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
        <h2 className="hw-c-secTitle">{GRANT_EN.multi_chart}</h2>
        <p className="hw-c-meta">
          {multiChart.count}/{multiChart.limit} charts saved
          {multiChart.count >= multiChart.limit
            ? ' — the limit is reached; membership lets you save more.'
            : ', so you can add charts for family members.'}
        </p>
        <p className="mt-3">
          <Link href="/en/chart" className="hw-m-btn hw-m-btnSm">Open my chart</Link>
        </p>
      </div>

      <div className="hw-c-box">
        <h2 className="hw-c-secTitle">Follow-up questions</h2>
        <div className="hw-m-quota">
          <b>{total === null ? '—' : total}</b>
          <span>available</span>
        </div>
        {isMember && <div className="hw-m-bar" aria-hidden="true"><i style={{ width: `${pct}%` }} /></div>}
        <p className="hw-c-meta">
          Member this month {memberLeft}/{MEMBER_ASK_PER_MONTH} · report bonus {ask ? ask.reportRemaining : '—'}
          · invite reward {ask ? ask.inviteRemaining : '—'} · question pack {ask ? ask.packRemaining : '—'}.
        </p>
        <p className="hw-c-meta">
          Buying any report, subscribing, or inviting a friend unlocks follow-up questions. The {MEMBER_ASK_PER_MONTH} member questions reset each calendar month and do not roll over;
          each report adds {ASK_PER_REPORT} and each invited friend adds {ASK_PER_INVITE} (both permanent). Member quota is used first, then report and invite bonuses, then question packs.
        </p>
        <p className="hw-c-meta">
          To invite: use “Share with a friend” on a chart result or daily page; the friend counts once they sign up through your link. Each person can be invited once, and you cannot invite yourself.
        </p>
        <p className="mt-3">
          <Link href={pricingFocusHref('en', 'ask_pack')} className="hw-m-btn hw-m-btnSm hw-m-btnGhost">
            Question pack / {formatPriceUSD(SKUS.ask_pack.priceUSD)} →
          </Link>
        </p>
      </div>
    </section>
  )
}

function SubscriptionCard({ sub, onChanged }: { sub: SubStatus; onChanged: () => void }) {
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  if (!sub.active && !sub.canceling) {
    return (
      <section className="hw-c-box hw-m-sec text-center" id="subscription">
        <h2 className="hw-c-secTitle">Membership subscription</h2>
        <p className="hw-c-meta">You are not a member. Subscribing unlocks all the member content above.</p>
        <Link href={pricingFocusHref('en', 'member_monthly')} className="hw-m-btn hw-m-btnSm">See membership benefits and subscribe →</Link>
      </section>
    )
  }

  const planPrice = sub.plan
    ? SKUS[sub.plan === 'monthly' ? 'member_monthly' : 'member_yearly'].priceUSD
    : 0
  const periodText = sub.plan === 'yearly' ? 'year' : 'month'

  const act = async (action: 'cancel' | 'reactivate') => {
    if (action === 'cancel' && !window.confirm(
      `Cancel auto-renewal? You can keep using member benefits until ${fmtDay(sub.expiresAt)}; after that access ends and no further charge is made.`
    )) return

    setBusy(true)
    setMsg('')
    try {
      const supabase = getSupabase()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Your session has expired. Please sign in again.')
      const res = await fetch('/api/membership/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            locale: 'en', token: session.access_token, action }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || 'The operation failed.')
      setMsg(action === 'cancel' ? 'Auto-renewal cancelled (benefits remain until the end of this period).' : 'Auto-renewal restored.')
      onChanged()
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'The operation failed. Please try again later.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="hw-c-box hw-m-sec" id="subscription">
      <h2 className="hw-c-secTitle">Membership subscription</h2>
      <div className="hw-m-kv">
        <p>
          Current plan: <b>{planNameEn(sub.plan)}</b>
          {planPrice > 0 && <> · {formatPriceUSD(planPrice)}/{periodText}</>}
        </p>
        <p>
          {sub.canceling ? 'Membership ends: ' : 'Next billing date: '}
          <b>{fmtDay(sub.nextBillingAt ?? sub.expiresAt)}</b>
          {sub.canceling && <> (auto-renewal cancelled; access ends on that date)</>}
        </p>
        <p className="hw-c-meta">
          Auto-renewal: {sub.autoRenew ? 'on' : 'off'}
          {sub.cancelAt && <> · cancellation requested on {fmtDay(sub.cancelAt)}</>}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 mt-4">
        {sub.canceling ? (
          <button onClick={() => act('reactivate')} disabled={busy} className="hw-m-btn hw-m-btnSm">
            {busy ? 'Working…' : 'Restore auto-renewal'}
          </button>
        ) : (
          <button onClick={() => act('cancel')} disabled={busy} className="hw-m-btn hw-m-btnSm hw-m-btnGhost">
            {busy ? 'Working…' : 'Cancel subscription'}
          </button>
        )}
        <a href={WAFFO_PORTAL_URL} target="_blank" rel="noreferrer" className="hw-m-mini hover:underline">
          Change card / view invoices →
        </a>
        <Link href="/en/terms" className="hw-m-mini hover:underline">
          Refund policy
        </Link>
      </div>

      {msg && <p className="hw-m-mini mt-3">{msg}</p>}
    </section>
  )
}
