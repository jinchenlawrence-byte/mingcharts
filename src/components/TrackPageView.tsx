'use client'

// 全站访问上报（2026-10-21）：挂在根 layout，每次路由变化记一条 page_view。
// ★ 不用 useSearchParams：它会让静态页触发 CSR bailout / 需要 Suspense 包裹，
//   UTM 直接在 effect 里读 window.location.search 即可（客户端才执行）。
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { firstTouch, rememberRef, track } from '@/lib/track'
import { getSupabase } from '@/lib/supabase'

const CLAIMED_KEY = 'ml_ref_claimed'

/**
 * 邀请领取：带着 ref 落地、且本机还没领过时，登录后调一次 /api/invite/claim。
 * 领取结果记在 localStorage，避免每次路由变化都打一次接口。
 */
async function claimInvite(): Promise<void> {
  try {
    const ref = window.localStorage.getItem('ml_ref')
    if (!ref || window.localStorage.getItem(CLAIMED_KEY)) return

    const { data: { session } } = await getSupabase().auth.getSession()
    if (!session?.access_token) return // 未登录：等登录后下次路由变化再试

    const res = await fetch('/api/invite/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: session.access_token, ref }),
    })
    const json = await res.json().catch(() => null)
    // 只有「已落库」或「重复领取」才标记，500/网络错误留待下次重试
    if (res.ok && json?.success) window.localStorage.setItem(CLAIMED_KEY, '1')
  } catch {
    // 静默：邀请领取失败不影响浏览
  }
}

export default function TrackPageView() {
  const pathname = usePathname()

  useEffect(() => {
    rememberRef(window.location.search)
    firstTouch(window.location.search)
    track('page_view')
    void claimInvite()
  }, [pathname])

  return null
}
