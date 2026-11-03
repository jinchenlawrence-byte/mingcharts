'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { getAuthToken } from '@/lib/authToken'

type Phase = 'checking' | 'unlocked' | 'pending' | 'no_ref' | 'no_login'

async function postJson(url: string, body: Record<string, unknown>) {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    return await res.json()
  } catch {
    return null
  }
}

function SuccessInner() {
  const params = useSearchParams()
  const ref = params.get('ref') ?? ''
  const sku = params.get('sku') ?? ''
  const [phase, setPhase] = useState<Phase>('checking')
  const [refValue, setRefValue] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const token = await getAuthToken()
      if (!token) { if (!cancelled) setPhase('no_login'); return }
      let currentRef = ref
      if (!currentRef) {
        try { currentRef = sessionStorage.getItem('waffo_checkout_ref') ?? '' } catch { /* ignore */ }
      }
      if (!currentRef) { if (!cancelled) setPhase('no_ref'); return }
      if (!cancelled) setRefValue(currentRef)

      for (let i = 0; i < 6; i++) {
        const ent = await postJson('/api/entitlements', { token })
        if (ent && (ent.canViewFatebook || (ent.ownedSkus?.length ?? 0) > 0)) {
          if (!cancelled) setPhase('unlocked')
          return
        }
        await new Promise((r) => setTimeout(r, 2000))
      }

      const verify = await postJson('/api/verify-payment', { token, orderMerchantExternalId: currentRef })
      if (!cancelled) setPhase(verify?.status === 'owned' ? 'unlocked' : 'pending')
    })()
    return () => { cancelled = true }
  }, [ref, sku])

  return (
    <div className="hw-wrap hw-c-pg">
      <h1 className="hw-c-h1">Payment complete</h1>

      {phase === 'checking' && <p className="hw-c-meta">Confirming your access…</p>}

      {phase === 'unlocked' && (
        <div className="hw-c-box">
          <p className="hw-c-body">Your purchase is confirmed. Access is now available in your account.</p>
          <div className="flex flex-wrap gap-3 mt-4">
            <Link href="/en/reports" className="hw-c-btnBig">My reports</Link>
            <Link href="/en/member" className="hw-c-btnBig">Member centre</Link>
            <Link href="/en/chart" className="hw-c-btnBig">My chart</Link>
          </div>
        </div>
      )}

      {phase === 'pending' && (
        <div className="hw-c-box">
          <p className="hw-c-body">
            Payment was received, but access confirmation is still in progress. It usually arrives
            within a minute. If it does not, contact hello@mingcharts.com with reference {refValue || '(none)'}.
          </p>
          <div className="flex flex-wrap gap-3 mt-4">
            <Link href="/en/reports" className="hw-c-btnBig">My reports</Link>
            <Link href="/en/pricing" className="hw-c-btnBig">Pricing</Link>
          </div>
        </div>
      )}

      {phase === 'no_ref' && (
        <div className="hw-c-box">
          <p className="hw-c-body">
            No payment reference was found. If you have just paid, open the confirmation email or
            contact hello@mingcharts.com.
          </p>
          <Link href="/en/reports" className="hw-c-btnBig inline-block mt-4">My reports</Link>
        </div>
      )}

      {phase === 'no_login' && (
        <div className="hw-c-box">
          <p className="hw-c-body">Sign in to confirm the purchase and open your reports.</p>
          <Link href="/en/auth" className="hw-c-btnBig inline-block mt-4">Sign in</Link>
        </div>
      )}
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
