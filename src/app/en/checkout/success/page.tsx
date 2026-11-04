'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { getAuthToken } from '@/lib/authToken'
import { SKUS, type SkuId } from '@/lib/pricing'

// English payment-success page. Mirrors the Chinese flow: URL ref first, sessionStorage backup,
// poll entitlements for the purchased SKU, then verify-payment as a fallback when the webhook is late.
type Phase = 'preparing' | 'polling' | 'verifying' | 'unlocked' | 'pending' | 'no_ref' | 'no_login'

const POLL_INTERVAL_MS = 2000
const POLL_MAX_TIMES = 6

// Default landing when checkout did not pass returnTo. Routes stay inside /en.
const DEFAULT_LANDING: Record<string, { href: string; label: string }> = {
  fatebook: { href: '/en/chart', label: 'Open my Fate Book' },
  annual_report: { href: '/en/reports', label: 'Go to my reports' },
  hemun: { href: '/en/reports', label: 'Go to my reports' },
  ziwei_deep: { href: '/en/reports', label: 'Go to my reports' },
  geo: { href: '/en/reports', label: 'Go to my reports' },
  bundle3: { href: '/en/reports', label: 'View purchased content' },
  member_monthly: { href: '/en/member', label: 'Go to the member centre' },
  member_yearly: { href: '/en/member', label: 'Go to the member centre' },
  // Partner credit packs belong to the partner workspace, which has no English edition yet.
  partner_credits_10: { href: '/en/pricing', label: 'View pricing' },
  partner_credits_50: { href: '/en/pricing', label: 'View pricing' },
  partner_credits_200: { href: '/en/pricing', label: 'View pricing' },
}

const isMemberSkuId = (sku: string) => sku === 'member_monthly' || sku === 'member_yearly'

function SuccessInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>('preparing')
  const [ref, setRef] = useState('')
  const [seconds, setSeconds] = useState(0)
  const [skuId, setSkuId] = useState<SkuId>('fatebook')
  const [returnTo, setReturnTo] = useState('')
  const startedRef = useRef(false)

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true

    ;(async () => {
      // ① Reference: URL query first, sessionStorage as a backup.
      const urlRef = searchParams.get('ref')?.trim() || ''
      let orderRef = urlRef
      if (!orderRef) {
        try {
          orderRef = sessionStorage.getItem('waffo_checkout_ref')?.trim() || ''
        } catch {
          // ignore when sessionStorage is unavailable
        }
      }
      if (!orderRef) {
        setPhase('no_ref')
        return
      }
      setRef(orderRef)

      const urlSku = searchParams.get('sku')?.trim() || ''
      const resolvedSku: SkuId = urlSku && urlSku in SKUS ? (urlSku as SkuId) : 'fatebook'
      const rawReturnTo = searchParams.get('returnTo')?.trim() || ''
      // Only same-site absolute paths; reject // to block open redirects.
      const safeReturnTo =
        rawReturnTo.startsWith('/') && !rawReturnTo.startsWith('//') ? rawReturnTo : ''
      setSkuId(resolvedSku)
      setReturnTo(safeReturnTo)

      const token = await getAuthToken()
      if (!token) {
        setPhase('no_login')
        return
      }

      const postJson = async (url: string, body: unknown) => {
        try {
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          })
          return res.json().catch(() => null)
        } catch {
          return null
        }
      }
      const getJson = async (url: string) => {
        try {
          const res = await fetch(url)
          return res.json().catch(() => null)
        } catch {
          return null
        }
      }

      const timer = setInterval(() => setSeconds((s) => s + 2), 2000)

      // ② Poll the entitlement for this specific SKU. Membership lives in profiles, not ownedSkus.
      setPhase('polling')
      let owned = false
      for (let i = 0; i < POLL_MAX_TIMES; i++) {
        if (isMemberSkuId(resolvedSku)) {
          const m = await getJson(`/api/membership?token=${encodeURIComponent(token)}`)
          if (m?.success && m.data?.active === true) {
            owned = true
            break
          }
        } else {
          const ent = await postJson('/api/entitlements', { token })
          if (Array.isArray(ent?.ownedSkus) && ent.ownedSkus.includes(resolvedSku)) {
            owned = true
            break
          }
        }
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))
      }
      if (owned) {
        clearInterval(timer)
        setPhase('unlocked')
        if (safeReturnTo) router.replace(safeReturnTo)
        return
      }

      // ③ Webhook may be lost: verify by merchant reference and backfill.
      setPhase('verifying')
      const verify = await postJson('/api/verify-payment', {
        token,
        orderMerchantExternalId: orderRef,
      })
      clearInterval(timer)
      setPhase(verify?.status === 'owned' ? 'unlocked' : 'pending')
    })()
  }, [searchParams, router])

  const member = isMemberSkuId(skuId)
  const skuName: Record<string, string> = {
    fatebook: 'Fate Book',
    annual_report: 'Annual report',
    hemun: 'Synastry report',
    ziwei_deep: 'Zi Wei deep reading',
    geo: 'Location & Direction report',
    bundle3: 'bundle',
    member_monthly: 'Monthly membership',
    member_yearly: 'Annual membership',
    partner_credits_10: 'partner credit pack',
    partner_credits_50: 'partner credit pack',
    partner_credits_200: 'partner credit pack',
  }

  return (
    <div className="hw-wrap hw-c-pg">
      <div className="hw-c-box text-center">
        {(phase === 'preparing' || phase === 'polling' || phase === 'verifying') && (
          <>
            <h1 className="hw-c-h1">Confirming your payment</h1>
            <p className="hw-c-meta">
              {phase === 'verifying'
                ? 'The payment provider is syncing. We are doing a final check — please wait…'
                : 'The bank and payment provider may take a few seconds to notify us. Please keep this page open.'}
            </p>
            <p className="text-xs text-ink-light/40 mt-3">Waited about {seconds} seconds</p>
            {ref && <p className="text-xs text-ink-light/40 mt-1">Reference: {ref}</p>}
          </>
        )}

        {phase === 'unlocked' && (
          <>
            <h1 className="hw-c-h1">{member ? 'Payment complete — membership is active' : `Payment complete — ${skuName[skuId] ?? 'your content'} is unlocked`}</h1>
            <p className="hw-c-meta">
              {member
                ? 'Member benefits are now active. You can cancel auto-renewal at any time in the member centre.'
                : skuId === 'fatebook'
                  ? 'Your Fate Book is saved to your account permanently; sign in any time to read it.'
                  : 'It is saved to your account; sign in any time to read it.'}
            </p>
            <div className="flex flex-wrap justify-center gap-3 mt-5">
              <Link href={returnTo || (DEFAULT_LANDING[skuId]?.href ?? '/en')} className="hw-c-btnBig">
                {DEFAULT_LANDING[skuId]?.label ?? 'View purchased content'}
              </Link>
              {skuId === 'fatebook' && (
                <Link href="/en/chart" className="hw-c-btnBig">Open my chart</Link>
              )}
              <Link href="/en" className="hw-c-btnBig">Back to home</Link>
            </div>
          </>
        )}

        {phase === 'pending' && (
          <>
            <h1 className="hw-c-h1">Payment received — unlocking is still processing</h1>
            {skuId.startsWith('partner_credits') ? (
              <p className="hw-c-body">
                Credits are posted automatically by the payment callback, usually within a minute. Once they
                arrive, open the partner workspace to see the remaining balance — no email needed.
              </p>
            ) : (
              <p className="hw-c-body">
                Provider and site status can take time to sync. If access is still locked after
                <strong> 10 minutes</strong>, email <a href="mailto:hello@mingcharts.com" className="hw-c-blueU">hello@mingcharts.com</a>
                {' '}from your registered address with the reference below and we will reconcile it manually.
              </p>
            )}
            <p className="hw-c-meta break-all">Reference: {ref}</p>
            <div className="flex flex-wrap justify-center gap-4 mt-5 text-sm">
              <Link href="/en" className="hw-c-blue">Back to home</Link>
              <Link href="/en/pricing" className="hw-c-blue">Back to pricing</Link>
              <Link href="/en/reports" className="hw-c-blue">My reports</Link>
            </div>
          </>
        )}

        {phase === 'no_ref' && (
          <>
            <h1 className="hw-c-h1">No payment reference found</h1>
            <p className="hw-c-body">
              If you have just paid, please wait a few minutes and check your reports. If access is still
              locked, contact <a href="mailto:hello@mingcharts.com" className="hw-c-blueU">hello@mingcharts.com</a>.
            </p>
            <div className="flex flex-wrap justify-center gap-4 mt-5 text-sm">
              <Link href="/en" className="hw-c-blue">Back to home</Link>
              <Link href="/en/pricing" className="hw-c-blue">Back to pricing</Link>
              <Link href="/en/reports" className="hw-c-blue">My reports</Link>
            </div>
          </>
        )}

        {phase === 'no_login' && (
          <>
            <h1 className="hw-c-h1">Please sign in</h1>
            <p className="hw-c-body">
              Sign in with the account you paid with, and access will be confirmed automatically.
              {ref && <span className="block text-xs text-ink-light/40 mt-2 break-all">Reference: {ref}</span>}
            </p>
            <Link href="/en/auth" className="hw-c-btnBig inline-block mt-4">Sign in</Link>
          </>
        )}
      </div>
    </div>
  )
}

export default function EnCheckoutSuccessPage() {
  return (
    <Suspense fallback={<div className="hw-wrap hw-c-pg"><p className="hw-c-meta">Loading…</p></div>}>
      <SuccessInner />
    </Suspense>
  )
}
