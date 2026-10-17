'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getSupabase } from '@/lib/supabase'
import { latestChartIdOf } from '@/lib/entitlement'
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
  children,
}: {
  sku: SkuId
  available: boolean
  highlight?: boolean
  /** ★ 命盘页直传当前盘 id（挂载时 /api/unlock 预检返回）；不传则回退「服务端最新一张」 */
  chartId?: string
  children: React.ReactNode
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [noChart, setNoChart] = useState(false)

  if (!available) {
    return (
      <div className="block text-center py-2.5 rounded-full font-semibold bg-paper-dark/40 text-ink-light/40 cursor-not-allowed">
        即将推出
      </div>
    )
  }

  const handleClick = async () => {
    if (loading) return
    setError('')
    setNoChart(false)
    setLoading(true)
    try {
      const supabase = getSupabase()
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) {
        router.push('/auth')
        return
      }

      // ★ 绑定目标优先级（2026-10-18 修复）：命盘页直传的当前盘 > 服务端最新一张。
      //   旧逻辑只取最新一张——新排未落库的盘会把款绑到旧盘上。
      const chartId = chartIdProp ?? (await latestChartIdOf(supabase, session.user.id))
      if (!chartId) {
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
        body: JSON.stringify({ sku, token: session.access_token, chartId }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setError(data?.error ?? '发起支付失败，请稍后再试')
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
      setError(e instanceof Error ? e.message : '网络异常，请稍后再试')
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
            ? 'bg-[#3a66ff] text-white hover:brightness-110'
            : 'bg-ink text-white hover:brightness-110'
        }`}
      >
        {loading ? '正在跳转支付…' : children}
      </button>
      {error && <p className="text-xs text-red-600 mt-2 text-center">{error}</p>}
      {noChart && (
        // ★ 无命盘：不弹 alert，页内给出可点的下一步（HANDOFF-命书一份一付 §2.3）
        <div className="mt-2 text-xs text-ink/70 bg-gold/5 border border-gold/20 rounded-md p-3 text-center">
          <p className="mb-2">命书会围绕你排好的命盘撰写——先免费排盘，再回来看命书详批。</p>
          <Link
            href="/?returnTo=/pricing"
            className="inline-block bg-ink text-white px-4 py-1.5 rounded-full font-semibold hover:brightness-110 transition"
          >
            去免费排盘
          </Link>
        </div>
      )}
    </div>
  )
}
