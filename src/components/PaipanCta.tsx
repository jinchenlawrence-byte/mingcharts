'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { track } from '@/lib/track'

/**
 * 排盘入口点击埋点（2026-11-11）。
 * 只包一层 <Link>：样式与文案原样透传，不改渲染结构，服务端仍输出可抓取的 <a>。
 * slot：入口位置（bottom=生肖页页尾，article=文章页 CTA）；
 * src：点击时所在页面，用于回答「哪个入口、哪类页面带来了排盘」。
 */
export default function PaipanCta({
  href,
  slot,
  className,
  children,
}: {
  href: string
  slot: string
  className?: string
  children: ReactNode
}) {
  return (
    <Link
      href={href}
      className={className}
      onClick={() => track('paipan_cta_click', { slot, src: window.location.pathname.slice(0, 120) })}
    >
      {children}
    </Link>
  )
}
