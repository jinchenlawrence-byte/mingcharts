'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getSupabase } from '@/lib/supabase'
import { latestChartIdOf } from '@/lib/entitlement'
import { track } from '@/lib/track'
import { toHant } from '@/lib/hant'
import type { SkuId } from '@/lib/pricing'

// 购买按钮：登录 → 预检命盘 → POST /api/checkout → 跳转 Waffo 托管收银台。
// productId 未登记（available=false）时渲染灰色「即将推出」，绝不跳到坏页面。
//
// ★ 购买前置校验（HANDOFF-命书一份一付 §二，2026-10-13）：
//   发起支付前先查 charts 表（★ 服务端那份，不查 localStorage——换设备/清缓存就没了）
//   确认当前用户已有命盘；没有则【不发起支付】，页内给出可点的下一步（不弹 alert）。
//   服务端 /api/checkout 仍不拦（直调可达）——这里是前端引导，不是服务端强制。
export default function CheckoutButton({
  sku,
  available,
  highlight = false,
  chartId: chartIdProp,
  requireChart = true,
  returnTo,
  authPath = '/auth',
  locale = 'zh-Hans',
  children,
}: {
  sku: SkuId
  available: boolean
  highlight?: boolean
  /** ★ 命盘页直传当前盘 id（挂载时 /api/unlock 预检返回）；不传则回退「服务端最新一张」 */
  chartId?: string
  /**
   * ★ 是否要求已有命盘（2026-10-18）：命书必须绑定命盘（一份一付），故默认 true。
   *   紫微/合婚/地理/年运等【模块】购买与命盘无关，传 false —— 跳过命盘预检，
   *   未排盘的用户也能直接购买（否则会被挡在「先去免费排盘」里，无法付费）。
   */
  requireChart?: boolean
  /** ★ 支付成功后回跳的站内路径（模块购买回原模块页看已解锁内容）；缺省走成功页默认 */
  returnTo?: string
  /** 未登录时的登录页路径（英文树传 /en/auth）；仅路由提示，不改支付逻辑 */
  authPath?: string
  /** 仅文案与回跳路径：支付 / 权益 / SKU 逻辑完全不变 */
  locale?: 'zh-Hans' | 'zh-Hant' | 'en'
  children: React.ReactNode
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [noChart, setNoChart] = useState(false)
  const en = locale === 'en'
  const hant = locale === 'zh-Hant'
  const L = (s: string) => (hant ? toHant(s) : s)

  if (!available) {
    return (
      <div className="block text-center py-2.5 rounded-full font-semibold bg-paper-dark/40 text-ink-light/40 cursor-not-allowed">
        {en ? 'Coming soon' : L('即将推出')}
      </div>
    )
  }

  const handleClick = async () => {
    if (loading) return
    // 流量漏斗：点击购买（在登录跳转之前记，未登录用户也要算进来）
    track('pay_click', { sku })
    setError('')
    setNoChart(false)
    setLoading(true)
    try {
      const supabase = getSupabase()
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) {
        router.push(authPath)
        return
      }

      // ★ 绑定目标优先级（2026-10-18 修复）：命盘页直传的当前盘 > 服务端最新一张。
      //   旧逻辑只取最新一张——新排未落库的盘会把款绑到旧盘上。
      //   ★ requireChart=false（模块购买）：不预检、不拦截，chartId 留空（payments.chart_id 落 NULL）
      //     —— 紫微/合婚/地理/年运的权益是【账号级】的，与某一命盘无关。
      const chartId = requireChart
        ? chartIdProp ?? (await latestChartIdOf(supabase, session.user.id))
        : chartIdProp ?? ''
      if (requireChart && !chartId) {
        setNoChart(true)
        setLoading(false)
        return
      }

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // ★ chartId 必须随单透传（2026-10-17 修复）：预检算出的 chartId 之前只当门槛没回传，
        //   webhook 收不到 metadata.chartId → payments.chart_id 落 NULL → 按盘解锁永不生效。
        //   归属安全由 webhook 落账前 resolveChartIdForUser 校验（chart 不属于买家则落 NULL）。
        // ★ returnTo（2026-10-18）：模块购买回原模块页，不再被统一扔去 /chart。
        body: JSON.stringify({
          sku,
          token: session.access_token,
          locale,
          ...(chartId ? { chartId } : {}),
          ...(returnTo ? { returnTo } : {}),
        }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setError(data?.error ?? (en ? 'Could not start checkout. Please try again.' : L('发起支付失败，请稍后再试')))
        setLoading(false)
        return
      }

      // sessionStorage 仅作成功页的【补充】来源；主来源是 successUrl 里的 ?ref=（跨设备可用）
      if (data.ref) {
        try {
          sessionStorage.setItem('waffo_checkout_ref', data.ref)
        } catch {
          // 隐私模式等场景下写入失败可忽略
        }
      }
      window.location.href = data.checkoutUrl
    } catch (e) {
      setError(e instanceof Error ? e.message : (en ? 'Network error. Please try again.' : L('网络异常，请稍后再试')))
      setLoading(false)
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className={`w-full block text-center py-2.5 rounded-full font-semibold transition disabled:opacity-60 ${
          highlight
            ? 'bg-hw-water text-white hover:brightness-110'
            : 'bg-ink text-white hover:brightness-110'
        }`}
      >
        {loading ? (en ? 'Redirecting to checkout…' : L('正在跳转支付…')) : children}
      </button>
      {error && <p className="text-xs text-red-600 mt-2 text-center">{error}</p>}
      {noChart && (
        // ★ 无命盘：不弹 alert，页内给出可点的下一步（HANDOFF-命书一份一付 §2.3）
        <div className="hw-alert hw-alert--info mt-2 text-center">
          <p className="mb-2">
            {en
              ? 'The Fate Book is written around a saved chart — cast a free chart first, then return.'
              : L('命书会围绕你排好的命盘撰写——先免费排盘，再回来看命书详批。')}
          </p>
          <Link
            href={en ? '/en' : hant ? '/tw' : '/?returnTo=/pricing'}
            className="inline-block bg-ink text-white px-4 py-1.5 rounded-full font-semibold hover:brightness-110 transition"
          >
            {en ? 'Cast a free chart' : L('去免费排盘')}
          </Link>
        </div>
      )}
    </div>
  )
}
