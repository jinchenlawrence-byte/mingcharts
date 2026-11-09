'use client'

// 支付成功回跳页共享实现（2026-11-04 统一第二批）
//
// 简体实现（轮询多态、SKU 分流、伙伴额度、业务单号回退）抽到这里，简/繁两树传 locale 复用。
// 繁体此前只有 6 次通用轮询 + 两个终态，买会员/伙伴额度都会被扔进「我的报告」，用户找不到出口。
//
// ★★★ 不能假设付款已确认：从收银台跳回时 webhook 可能还在路上，也可能最终丢失。
//   ① ref 以 URL ?ref= 为准（跨设备也在），sessionStorage 仅补充
//   ② 每 2 秒轮询权益，最多 6 次
//   ③ 仍无 → verify-payment 兜底反查补写
//   ④ 仍无 → 明确文案 + 业务单号 + 客服邮箱

import { Suspense, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { getSupabase } from '@/lib/supabase'
import { SKUS, type SkuId } from '@/lib/pricing'
import { toHant } from '@/lib/hant'
import { pathForLang, type SiteLang } from '@/lib/lang'

type Phase = 'preparing' | 'polling' | 'verifying' | 'unlocked' | 'pending' | 'no_ref' | 'no_login'

const POLL_INTERVAL_MS = 2000
const POLL_MAX_TIMES = 6

// 未带 returnTo 时的默认落点：按本次购买的 SKU 决定去哪、文案说什么。
const DEFAULT_LANDING: Record<string, { href: string; label: string }> = {
  fatebook: { href: '/chart', label: '查看命书全文' },
  annual_report: { href: '/reports', label: '进入我的报告' },
  hemun: { href: '/reports', label: '进入我的报告' },
  ziwei_deep: { href: '/reports', label: '进入我的报告' },
  geo: { href: '/reports', label: '进入我的报告' },
  bundle3: { href: '/reports', label: '查看已购内容' },
  member_monthly: { href: '/member', label: '进入会员中心' },
  member_yearly: { href: '/member', label: '进入会员中心' },
  partner_credits_10: { href: '/partner', label: '进入伙伴工作台' },
  partner_credits_50: { href: '/partner', label: '进入伙伴工作台' },
  partner_credits_200: { href: '/partner', label: '进入伙伴工作台' },
}

function SuccessInner({ locale }: { locale: SiteLang }) {
  const H = (s: string) => (locale === 'zh-Hant' ? toHant(s) : s)
  const L = (p: string) => pathForLang(p, locale)
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

      const timer = setInterval(() => setSeconds((s) => s + 2), 2000)

      // ★ 按【本次购买的 SKU】判定；会员订阅看 /api/membership 的 active
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
        if (safeReturnTo) router.replace(safeReturnTo)
        return
      }

      setPhase('verifying')
      const verify = await postJson('/api/verify-payment', {
        token,
        orderMerchantExternalId: orderRef,
      })
      clearInterval(timer)
      setPhase(verify?.status === 'owned' ? 'unlocked' : 'pending')
    })()
  }, [searchParams, router])

  const isMember = skuId === 'member_monthly' || skuId === 'member_yearly'
  const landing = DEFAULT_LANDING[skuId]

  return (
    <main className="hw-page">
      <div className="min-h-screen flex items-center justify-center px-4 py-10">
        <div className="hw-c-box w-full max-w-md text-center">
          {(phase === 'preparing' || phase === 'polling' || phase === 'verifying') && (
            <>
              <div className="animate-pulse text-4xl mb-4">⏳</div>
              <h1 className="text-xl font-bold text-ink mb-2">{H('正在确认你的支付状态')}</h1>
              <p className="hw-alert hw-alert--info">
                {phase === 'verifying'
                  ? H('支付渠道同步中，正在做最后核对，请稍候…')
                  : H('银行与支付渠道的通知可能需要几秒钟，请勿关闭此页面。')}
              </p>
              <p className="text-xs text-ink-light mt-3">{H('已等待约 ')}{seconds}{H(' 秒')}</p>
              {ref && <p className="text-xs text-ink-light mt-1">{H('业务单号：')}{ref}</p>}
            </>
          )}

          {phase === 'unlocked' && (
            <>
              <div className="text-4xl mb-4">✅</div>
              <h1 className="text-xl font-bold text-ink mb-2">
                {isMember
                  ? H('支付成功，会员已开通')
                  : H(`支付成功，${H(SKUS[skuId]?.name ?? '内容')}已解锁`)}
              </h1>
              <p className="text-sm text-ink-light mb-6">
                {isMember
                  ? H('会员权益已生效，可随时在「会员中心」自助取消自动续费。')
                  : skuId === 'fatebook'
                    ? H('命书已永久保存到你的账号，可随时登录查看。')
                    : H('已保存到你的账号，可随时登录查看。')}
              </p>
              <div className="space-y-3">
                <Link href={returnTo || L(landing?.href ?? '/')} className="block hw-c-btnBig">
                  {H(landing?.label ?? '查看已购内容')}
                </Link>
                {skuId === 'fatebook' ? (
                  <Link href={L('/charts')} className="block text-sm hw-c-blue">
                    {H('进入我的命盘列表')}
                  </Link>
                ) : null}
                <Link href={L('/')} className="block text-sm hw-c-blue">
                  {H('返回首页')}
                </Link>
              </div>
            </>
          )}

          {phase === 'pending' && (
            <>
              <div className="text-4xl mb-4">🕒</div>
              <h1 className="text-xl font-bold text-ink mb-2">{H('付款已完成，但解锁正在处理中')}</h1>
              {skuId.startsWith('partner_credits') ? (
                <p className="text-sm text-ink-light mb-4">
                  {H('额度由支付回调自动入账，通常 1 分钟内到账。到账后打开')}
                  <strong>{H('伙伴工作台')}</strong>
                  {H('就能看到剩余份数，不用等邮件通知。')}
                </p>
              ) : (
                <p className="text-sm text-ink-light mb-4">
                  {H('支付渠道与本站的状态同步有时会延迟。若 ')}
                  <strong>{H('10 分钟后')}</strong>
                  {H('仍未解锁，请用你的')}
                  <strong>{H('注册邮箱')}</strong>
                  {H('联系 ')}
                  <a href="mailto:hello@mingcharts.com" className="hw-c-blueU">hello@mingcharts.com</a>
                  {H('，并附上以下业务单号，我们会人工核对补单。')}
                </p>
              )}
              <p className="text-xs text-ink-light bg-gold/5 rounded p-2 mb-6 break-all">
                {H('业务单号：')}{ref}
              </p>
              <div className="flex justify-center gap-6 text-sm">
                <Link href={L('/')} className="hw-c-blue">{H('返回首页')}</Link>
                <Link href={L('/pricing')} className="hw-c-blue">{H('返回价格页')}</Link>
              </div>
            </>
          )}

          {phase === 'no_ref' && (
            <>
              <div className="text-4xl mb-4">🔍</div>
              <h1 className="text-xl font-bold text-ink mb-2">{H('未找到本次支付单号')}</h1>
              <p className="text-sm text-ink-light mb-6">
                {H('如果你刚刚完成了付款，请稍候几分钟后到「我的命盘」查看；仍未解锁请联系 ')}
                <a href="mailto:hello@mingcharts.com" className="hw-c-blueU">hello@mingcharts.com</a>
                {H('。')}
              </p>
              <div className="flex justify-center gap-6 text-sm">
                <Link href={L('/')} className="hw-c-blue">{H('返回首页')}</Link>
                <Link href={L('/pricing')} className="hw-c-blue">{H('返回价格页')}</Link>
              </div>
            </>
          )}

          {phase === 'no_login' && (
            <>
              <div className="text-4xl mb-4">🔑</div>
              <h1 className="text-xl font-bold text-ink mb-2">{H('请先登录')}</h1>
              <p className="text-sm text-ink-light mb-6">
                {H('请用付款时使用的账号登录，系统会自动确认解锁状态。')}
                {ref && (
                  <span className="block text-xs text-ink-light mt-2 break-all">
                    {H('业务单号：')}{ref}
                  </span>
                )}
              </p>
              <Link href={L('/auth')} className="block hw-c-btnBig">{H('去登录')}</Link>
            </>
          )}
        </div>
      </div>
    </main>
  )
}

export default function CheckoutSuccess({ locale = 'zh-Hans' }: { locale?: SiteLang }) {
  return (
    <Suspense
      fallback={
        <main className="hw-page flex items-center justify-center">
          <p className="text-ink/70">{locale === 'zh-Hant' ? '載入中…' : '加载中…'}</p>
        </main>
      }
    >
      <SuccessInner locale={locale} />
    </Suspense>
  )
}
