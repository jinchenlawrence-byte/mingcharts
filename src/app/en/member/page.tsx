'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getAuthToken } from '@/lib/authToken'
import { WAFFO_PORTAL_URL } from '@/lib/waffo-products'
import { SKUS, formatPriceUSD } from '@/lib/pricing'

interface SubState {
  active: boolean
  plan: 'monthly' | 'yearly' | null
  expiresAt: string | null
  nextBillingAt: string | null
}

// English member centre: subscription status and links to the cashier portal / pricing.
// No entitlement logic is duplicated here; the server remains the source of truth.
export default function EnMemberPage() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null)
  const [sub, setSub] = useState<SubState>({ active: false, plan: null, expiresAt: null, nextBillingAt: null })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      const token = await getAuthToken()
      if (!token) { setSignedIn(false); setLoading(false); return }
      setSignedIn(true)
      try {
        const res = await fetch('/api/membership', { headers: { Authorization: `Bearer ${token}` } })
        const json = await res.json()
        if (json.success && json.data) {
          setSub({
            active: !!json.data.active,
            plan: json.data.plan ?? null,
            expiresAt: json.data.expiresAt ?? null,
            nextBillingAt: json.data.nextBillingAt ?? null,
          })
        }
      } catch {
        // leave the non-member state; pricing remains available
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  return (
    <div className="hw-wrap hw-c-pg">
      <Link href="/en" className="hw-c-back">‹ Home</Link>
      <h1 className="hw-c-h1">Member centre</h1>

      {loading ? (
        <p className="hw-c-meta">Loading your membership…</p>
      ) : signedIn === false ? (
        <div className="hw-c-box text-center">
          <p className="hw-c-body">Sign in to view your membership.</p>
          <Link href="/en/auth" className="hw-c-btnBig inline-block mt-4">Sign in</Link>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="hw-c-box">
            <h2 className="hw-c-secTitle">Status</h2>
            {sub.active ? (
              <div className="text-sm text-ink space-y-1">
                <p><strong>Active</strong> · {sub.plan === 'yearly' ? 'Annual' : 'Monthly'} membership</p>
                {sub.expiresAt && <p className="text-ink-light/70">Access until: {new Date(sub.expiresAt).toLocaleDateString('en-US')}</p>}
                {sub.nextBillingAt && <p className="text-ink-light/70">Next billing: {new Date(sub.nextBillingAt).toLocaleDateString('en-US')}</p>}
              </div>
            ) : (
              <div className="text-sm text-ink space-y-2">
                <p>No active membership.</p>
                <p className="text-ink-light/70">
                  Monthly {formatPriceUSD(SKUS.member_monthly.priceUSD)} · Annual {formatPriceUSD(SKUS.member_yearly.priceUSD)}
                </p>
                <Link href="/en/pricing" className="hw-c-link inline-block">See membership plans →</Link>
              </div>
            )}
          </div>

          <div className="hw-c-box">
            <h2 className="hw-c-secTitle">Manage subscription</h2>
            <p className="text-sm text-ink-light">
              Use the secure cashier portal to update payment details or cancel. Access continues until
              the end of the current billing period after cancellation.
            </p>
            {WAFFO_PORTAL_URL && (
              <a href={WAFFO_PORTAL_URL} target="_blank" rel="noopener noreferrer" className="hw-c-btnBig inline-block mt-4">
                Open the billing portal ↗
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
