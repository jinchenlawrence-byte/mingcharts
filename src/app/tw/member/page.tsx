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

// 繁體會員中心：權益判定仍由 /api/membership 提供，前端只負責顯示。
export default function HantMemberPage() {
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
        // 保留非會員狀態，價格入口仍可用
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  return (
    <div className="hw-wrap hw-c-pg">
      <Link href="/tw" className="hw-c-back">‹ 首頁</Link>
      <h1 className="hw-c-h1">會員中心</h1>

      {loading ? (
        <p className="hw-c-meta">正在載入會員狀態…</p>
      ) : signedIn === false ? (
        <div className="hw-c-box text-center">
          <p className="hw-c-body">登入後即可查看會員狀態。</p>
          <Link href="/tw/auth" className="hw-c-btnBig inline-block mt-4">登入</Link>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="hw-c-box">
            <h2 className="hw-c-secTitle">會員狀態</h2>
            {sub.active ? (
              <div className="text-sm text-ink space-y-1">
                <p><strong>有效</strong> · {sub.plan === 'yearly' ? '年繳' : '月繳'}會員</p>
                {sub.expiresAt && <p className="text-ink-light/70">有效期至：{new Date(sub.expiresAt).toLocaleDateString('zh-TW')}</p>}
                {sub.nextBillingAt && <p className="text-ink-light/70">下次扣費：{new Date(sub.nextBillingAt).toLocaleDateString('zh-TW')}</p>}
              </div>
            ) : (
              <div className="text-sm text-ink space-y-2">
                <p>目前沒有有效會員。</p>
                <p className="text-ink-light/70">
                  月繳 {formatPriceUSD(SKUS.member_monthly.priceUSD)} · 年繳 {formatPriceUSD(SKUS.member_yearly.priceUSD)}
                </p>
                <Link href="/tw/pricing" className="hw-c-link inline-block">查看會員方案 →</Link>
              </div>
            )}
          </div>

          <div className="hw-c-box">
            <h2 className="hw-c-secTitle">管理訂閱</h2>
            <p className="text-sm text-ink-light">
              透過安全的帳單入口更新付款資料或取消訂閱。取消後，本計費週期結束前仍可繼續使用。
            </p>
            {WAFFO_PORTAL_URL && (
              <a href={WAFFO_PORTAL_URL} target="_blank" rel="noopener noreferrer" className="hw-c-btnBig inline-block mt-4">
                開啟帳單管理 ↗
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
