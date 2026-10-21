'use client'

// 全站访问上报（2026-10-21）：挂在根 layout，每次路由变化记一条 page_view。
// ★ 不用 useSearchParams：它会让静态页触发 CSR bailout / 需要 Suspense 包裹，
//   UTM 直接在 effect 里读 window.location.search 即可（客户端才执行）。
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { firstTouch, track } from '@/lib/track'

export default function TrackPageView() {
  const pathname = usePathname()

  useEffect(() => {
    firstTouch(window.location.search)
    track('page_view')
  }, [pathname])

  return null
}
