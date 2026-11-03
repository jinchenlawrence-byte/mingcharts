'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
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
  const router = useRouter()
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

      const rawReturnTo = params.get('returnTo') ?? ''
      const safeReturnTo =
        rawReturnTo.startsWith('/tw/') && !rawReturnTo.startsWith('//') ? rawReturnTo : ''
      const isMemberSku = sku === 'member_monthly' || sku === 'member_yearly'

      for (let i = 0; i < 6; i++) {
        let owned = false
        if (isMemberSku) {
          const m = await fetch(`/api/membership?token=${encodeURIComponent(token)}`)
            .then((r) => r.json())
            .catch(() => null)
          owned = !!m?.success && m?.data?.active === true
        } else {
          const ent = await postJson('/api/entitlements', { token })
          owned = !!ent && (ent.canViewFatebook || (ent.ownedSkus?.length ?? 0) > 0)
        }
        if (owned) {
          if (!cancelled) {
            if (safeReturnTo) router.replace(safeReturnTo)
            else setPhase('unlocked')
          }
          return
        }
        await new Promise((r) => setTimeout(r, 2000))
      }

      const verify = await postJson('/api/verify-payment', { token, orderMerchantExternalId: currentRef })
      if (!cancelled) {
        if (verify?.status === 'owned' && safeReturnTo) router.replace(safeReturnTo)
        else setPhase(verify?.status === 'owned' ? 'unlocked' : 'pending')
      }
    })()
    return () => { cancelled = true }
  }, [params, ref, router])

  return (
    <div className="hw-wrap hw-c-pg">
      <h1 className="hw-c-h1">付款完成</h1>

      {phase === 'checking' && <p className="hw-c-meta">正在確認你的權益…</p>}

      {phase === 'unlocked' && (
        <div className="hw-c-box">
          <p className="hw-c-body">付款已確認，權益已開通至你的帳號。</p>
          <div className="flex flex-wrap gap-3 mt-4">
            <Link href="/tw/reports" className="hw-c-btnBig">我的報告</Link>
            <Link href="/tw/member" className="hw-c-btnBig">會員中心</Link>
            <Link href="/tw/chart" className="hw-c-btnBig">我的命盤</Link>
          </div>
        </div>
      )}

      {phase === 'pending' && (
        <div className="hw-c-box">
          <p className="hw-c-body">
            已收到付款，但權益仍在確認中，通常一分鐘內完成。若持續未開通，請將業務單號
            {' '}{refValue || '（無）'} 寄至 hello@mingcharts.com。
          </p>
          <div className="flex flex-wrap gap-3 mt-4">
            <Link href="/tw/reports" className="hw-c-btnBig">我的報告</Link>
            <Link href="/tw/pricing" className="hw-c-btnBig">價目</Link>
          </div>
        </div>
      )}

      {phase === 'no_ref' && (
        <div className="hw-c-box">
          <p className="hw-c-body">
            找不到付款單號。若你剛剛完成付款，請開啟付款確認郵件，或聯絡 hello@mingcharts.com。
          </p>
          <Link href="/tw/reports" className="hw-c-btnBig inline-block mt-4">我的報告</Link>
        </div>
      )}

      {phase === 'no_login' && (
        <div className="hw-c-box">
          <p className="hw-c-body">登入後即可確認付款並開啟報告。</p>
          <Link href="/tw/auth" className="hw-c-btnBig inline-block mt-4">登入</Link>
        </div>
      )}
    </div>
  )
}

export default function HantCheckoutSuccessPage() {
  return (
    <Suspense fallback={<div className="hw-wrap hw-c-pg"><p className="hw-c-meta">載入中…</p></div>}>
      <SuccessInner />
    </Suspense>
  )
}
