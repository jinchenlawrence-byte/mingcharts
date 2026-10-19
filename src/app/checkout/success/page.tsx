'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { getSupabase } from '@/lib/supabase'
import { SKUS, type SkuId } from '@/lib/pricing'

// 支付成功回跳页。
// ★★★ 不能假设付款已确认：从收银台跳回时 webhook 可能还在路上，也可能最终丢失。
//   ① ref 以 URL ?ref= 为准（跨设备也在），sessionStorage 仅补充
//   ② 每 2 秒轮询权益，最多 6 次（≈12 秒；webhook 正常几秒内到达，见下 2026-10-19 缩短说明）
//   ③ 仍无 → 调 verify-payment 兜底反查补写（覆盖 webhook 丢失）
//   ④ 仍无 → 明确文案 + 业务单号 + 客服邮箱，绝不让用户以为被骗
// 2026-10-17 风格统一：接入 hw- 设计语言（白卡居中壳），轮询逻辑与文案零改动
// （test-waffo-accept.mjs ⑥ 守护：?ref= 主来源 / sessionStorage 补充 / 轮询参数 / 客服邮箱 / 终态链接）。

type Phase = 'preparing' | 'polling' | 'verifying' | 'unlocked' | 'pending' | 'no_ref' | 'no_login'

const POLL_INTERVAL_MS = 2000
// ★ 2026-10-19 缩短：原 15 次 × 2 秒 = 30 秒预算，实测在每次请求有 1–6 秒延迟时会被拖成
//   近 1 分钟（用户以为卡死）。webhook 正常几秒内到达，6 次（≈12 秒）足够覆盖正常态；
//   更慢的情况立即转 verify-payment 主动反查，比继续干等更快解锁。
const POLL_MAX_TIMES = 6

// ★ 未带 returnTo 时的默认落点（2026-10-18）：修「买完紫微被扔去 /chart」——
//   按【本次购买的 SKU】决定去哪、文案说什么，不再一律当命书。
//   模块报告（紫微/合婚/地理/年运）无独立详情入口，统一落「我的报告」列表。
const DEFAULT_LANDING: Record<string, { href: string; label: string }> = {
  fatebook: { href: '/chart', label: '查看命书全文' },
  annual_report: { href: '/reports', label: '进入我的报告' },
  hemun: { href: '/reports', label: '进入我的报告' },
  ziwei_deep: { href: '/reports', label: '进入我的报告' },
  geo: { href: '/reports', label: '进入我的报告' },
  bundle3: { href: '/reports', label: '查看已购内容' },
  // ★ 档 C：会员订阅成功后落「会员中心」（权益不在「我的报告」里）
  member_monthly: { href: '/member', label: '进入会员中心' },
  member_yearly: { href: '/member', label: '进入会员中心' },
}

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

      // ★ 本次购买的 SKU 与回跳目标（2026-10-18）：checkout 已把它们编进 successUrl。
      //   轮询【正确商品】的权益（旧实现只认 fatebook，买紫微永远等不到解锁）；
      //   returnTo 仅接受站内绝对路径（非 //），防开放重定向；非法/缺失则回落默认落点。
      const urlSku = searchParams.get('sku')?.trim() || ''
      const resolvedSku: SkuId = urlSku && urlSku in SKUS ? (urlSku as SkuId) : 'fatebook'
      const rawReturnTo = searchParams.get('returnTo')?.trim() || ''
      const safeReturnTo =
        rawReturnTo.startsWith('/') && !rawReturnTo.startsWith('//') ? rawReturnTo : ''
      setSkuId(resolvedSku)
      setReturnTo(safeReturnTo)

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
      const getJson = async (url: string) => {
        const res = await fetch(url)
        return res.json().catch(() => null)
      }

      // 计时展示
      const timer = setInterval(() => setSeconds((s) => s + 2), 2000)

      // ② 轮询权益（★ 看 ownedSkus 而不是 canViewFatebook——内测期 ENFORCE=false 会恒真）
      //   ★ 按【本次购买的 SKU】判定（2026-10-18 修复）：旧实现只认 fatebook，
      //     买紫微/合婚/地理/年运的用户会被无限轮询到超时（真实事故）。
      //   ★ 档 C（2026-10-18）：会员订阅的解锁【不在 ownedSkus 里】——订阅权益由
      //     subscription.* webhook 写入 profiles，故改看 /api/membership 只读 GET 的 active
      //     （否则订阅买家会被白等满 15 次轮询）。
      const isMemberSku = resolvedSku === 'member_monthly' || resolvedSku === 'member_yearly'
      setPhase('polling')
      let owned = false
      for (let i = 0; i < POLL_MAX_TIMES; i++) {
        if (isMemberSku) {
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
        // ★ 模块购买直接送回原模块页看已解锁内容（不再统一扔去 /chart）
        if (safeReturnTo) router.replace(safeReturnTo)
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
  }, [searchParams, router])

  return (
    <main className="hw-page">
      <div className="min-h-screen flex items-center justify-center px-4 py-10">
        <div className="hw-c-box w-full max-w-md text-center">
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
              <h1 className="text-xl font-bold text-ink mb-2">
                {skuId === 'member_monthly' || skuId === 'member_yearly'
                  ? '支付成功，会员已开通'
                  : `支付成功，${SKUS[skuId]?.name ?? '内容'}已解锁`}
              </h1>
              <p className="text-sm text-ink-light mb-6">
                {skuId === 'member_monthly' || skuId === 'member_yearly'
                  ? '会员权益已生效，可随时在「会员中心」自助取消自动续费。'
                  : skuId === 'fatebook'
                    ? '命书已永久保存到你的账号，可随时登录查看。'
                    : '已保存到你的账号，可随时登录查看。'}
              </p>
              <div className="space-y-3">
                <Link
                  href={returnTo || (DEFAULT_LANDING[skuId]?.href ?? '/')}
                  className="block hw-c-btnBig"
                >
                  {DEFAULT_LANDING[skuId]?.label ?? '查看已购内容'}
                </Link>
                {/* ★ 命书才有「我的命盘列表」；模块（紫微/合婚/地理/年运）已落「我的报告」，不重复给 */}
                {skuId === 'fatebook' ? (
                  <Link href="/charts" className="block text-sm hw-c-blue">
                    进入我的命盘列表
                  </Link>
                ) : null}
                <Link href="/" className="block text-sm hw-c-blue">
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
                  className="hw-c-blueU"
                >
                  hello@mingcharts.com
                </a>
                ，并附上以下业务单号，我们会人工核对补单。
              </p>
              <p className="text-xs text-ink-light/60 bg-gold/5 rounded p-2 mb-6 break-all">
                业务单号：{ref}
              </p>
              <div className="flex justify-center gap-6 text-sm">
                <Link href="/" className="hw-c-blue">
                  返回首页
                </Link>
                <Link href="/pricing" className="hw-c-blue">
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
                <a href="mailto:hello@mingcharts.com" className="hw-c-blueU">
                  hello@mingcharts.com
                </a>
                。
              </p>
              <div className="flex justify-center gap-6 text-sm">
                <Link href="/" className="hw-c-blue">
                  返回首页
                </Link>
                <Link href="/pricing" className="hw-c-blue">
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
                className="block hw-c-btnBig"
              >
                去登录
              </Link>
            </>
          )}
        </div>
      </div>
    </main>
  )
}

export default function CheckoutSuccessPage() {
  // useSearchParams 在 Suspense 内使用（Next App Router 要求）
  return (
    <Suspense
      fallback={
        <main className="hw-page flex items-center justify-center">
          <p className="text-ink/60">加载中…</p>
        </main>
      }
    >
      <SuccessInner />
    </Suspense>
  )
}
