'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { getSupabase } from '@/lib/supabase'

// 支付成功回跳页。
// ★★★ 不能假设付款已确认：从收银台跳回时 webhook 可能还在路上，也可能最终丢失。
//   ① ref 以 URL ?ref= 为准（跨设备也在），sessionStorage 仅补充
//   ② 每 2 秒轮询权益，最多 15 次（覆盖 webhook 正常到达，通常几秒内）
//   ③ 仍无 → 调 verify-payment 兜底反查补写（覆盖 webhook 丢失）
//   ④ 仍无 → 明确文案 + 业务单号 + 客服邮箱，绝不让用户以为被骗

type Phase = 'preparing' | 'polling' | 'verifying' | 'unlocked' | 'pending' | 'no_ref' | 'no_login'

const POLL_INTERVAL_MS = 2000
const POLL_MAX_TIMES = 15

function SuccessInner() {
  const searchParams = useSearchParams()
  const [phase, setPhase] = useState<Phase>('preparing')
  const [ref, setRef] = useState('')
  const [seconds, setSeconds] = useState(0)
  const startedRef = useRef(false)

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true

    ;(async () => {
      // ① ref：URL query 主，sessionStorage 辅
      const urlRef = searchParams.get('ref')?.trim() || ''
      let orderRef = urlRef
      if (!orderRef) {
        try {
          orderRef = sessionStorage.getItem('waffo_checkout_ref')?.trim() || ''
        } catch {
          // sessionStorage 不可用时忽略
        }
      }
      if (!orderRef) {
        setPhase('no_ref')
        return
      }
      setRef(orderRef)

      const supabase = getSupabase()
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) {
        setPhase('no_login')
        return
      }
      const token = session.access_token

      const postJson = async (url: string, body: unknown) => {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        return res.json().catch(() => null)
      }

      // 计时展示
      const timer = setInterval(() => setSeconds((s) => s + 2), 2000)

      // ② 轮询权益（★ 看 ownedSkus 而不是 canViewFatebook——内测期 ENFORCE=false 会恒真）
      setPhase('polling')
      let owned = false
      for (let i = 0; i < POLL_MAX_TIMES; i++) {
        const ent = await postJson('/api/entitlements', { token })
        if (Array.isArray(ent?.ownedSkus) && ent.ownedSkus.includes('fatebook')) {
          owned = true
          break
        }
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))
      }
      if (owned) {
        clearInterval(timer)
        setPhase('unlocked')
        return
      }

      // ③ webhook 可能丢了：按业务单号向 Waffo 兜底反查并补写
      setPhase('verifying')
      const verify = await postJson('/api/verify-payment', {
        token,
        orderMerchantExternalId: orderRef,
      })
      clearInterval(timer)
      setPhase(verify?.status === 'owned' ? 'unlocked' : 'pending')
    })()
  }, [searchParams])

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
        {(phase === 'preparing' || phase === 'polling' || phase === 'verifying') && (
          <>
            <div className="animate-pulse text-4xl mb-4">⏳</div>
            <h1 className="text-xl font-bold text-ink mb-2">正在确认你的支付状态</h1>
            <p className="text-sm text-ink-light">
              {phase === 'verifying'
                ? '支付渠道同步中，正在做最后核对，请稍候…'
                : '银行与支付渠道的通知可能需要几秒钟，请勿关闭此页面。'}
            </p>
            <p className="text-xs text-ink-light/40 mt-3">已等待约 {seconds} 秒</p>
            {ref && <p className="text-xs text-ink-light/40 mt-1">业务单号：{ref}</p>}
          </>
        )}

        {phase === 'unlocked' && (
          <>
            <div className="text-4xl mb-4">✅</div>
            <h1 className="text-xl font-bold text-ink mb-2">支付成功，命书已解锁</h1>
            <p className="text-sm text-ink-light mb-6">
              命书已永久保存到你的账号，可随时登录查看。
            </p>
            <div className="space-y-3">
              <Link
                href="/mingshu"
                className="block bg-amber-600 text-white py-2.5 rounded-md font-semibold hover:bg-amber-700 transition"
              >
                查看我的命书
              </Link>
              <Link href="/" className="block text-sm text-amber-600 hover:text-ink">
                返回首页
              </Link>
            </div>
          </>
        )}

        {phase === 'pending' && (
          <>
            <div className="text-4xl mb-4">🕒</div>
            <h1 className="text-xl font-bold text-ink mb-2">
              付款已完成，但解锁正在处理中
            </h1>
            <p className="text-sm text-ink-light mb-4">
              支付渠道与本站的状态同步有时会延迟。若 <strong>10 分钟后</strong>仍未解锁，
              请用你的<strong>注册邮箱</strong>联系{' '}
              <a
                href="mailto:hello@mingcharts.com"
                className="text-amber-600 hover:text-ink underline"
              >
                hello@mingcharts.com
              </a>
              ，并附上以下业务单号，我们会人工核对补单。
            </p>
            <p className="text-xs text-ink-light/60 bg-gold/5 rounded p-2 mb-6 break-all">
              业务单号：{ref}
            </p>
            <div className="flex justify-center gap-6 text-sm">
              <Link href="/" className="text-amber-600 hover:text-ink">
                返回首页
              </Link>
              <Link href="/pricing" className="text-amber-600 hover:text-ink">
                返回价格页
              </Link>
            </div>
          </>
        )}

        {phase === 'no_ref' && (
          <>
            <div className="text-4xl mb-4">🔍</div>
            <h1 className="text-xl font-bold text-ink mb-2">未找到本次支付单号</h1>
            <p className="text-sm text-ink-light mb-6">
              如果你刚刚完成了付款，请稍候几分钟后到「我的命盘」查看；仍未解锁请联系{' '}
              <a href="mailto:hello@mingcharts.com" className="text-amber-600 underline">
                hello@mingcharts.com
              </a>
              。
            </p>
            <div className="flex justify-center gap-6 text-sm">
              <Link href="/" className="text-amber-600 hover:text-ink">
                返回首页
              </Link>
              <Link href="/pricing" className="text-amber-600 hover:text-ink">
                返回价格页
              </Link>
            </div>
          </>
        )}

        {phase === 'no_login' && (
          <>
            <div className="text-4xl mb-4">🔑</div>
            <h1 className="text-xl font-bold text-ink mb-2">请先登录</h1>
            <p className="text-sm text-ink-light mb-6">
              请用付款时使用的账号登录，系统会自动确认解锁状态。
              {ref && (
                <span className="block text-xs text-ink-light/40 mt-2 break-all">
                  业务单号：{ref}
                </span>
              )}
            </p>
            <Link
              href="/auth"
              className="block bg-amber-600 text-white py-2.5 rounded-md font-semibold hover:bg-amber-700 transition"
            >
              去登录
            </Link>
          </>
        )}
      </div>
    </main>
  )
}

export default function CheckoutSuccessPage() {
  // useSearchParams 在 Suspense 内使用（Next App Router 要求）
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center text-ink-light/60">
          加载中…
        </main>
      }
    >
      <SuccessInner />
    </Suspense>
  )
}
