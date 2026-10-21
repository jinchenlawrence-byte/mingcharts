'use client'

// 站内分享按钮（2026-10-21）：优先调用系统分享（手机原生面板），不支持则复制链接。
// ★ 分享链接统一带上 utm_source=share&utm_medium=referral，若本机存过 ref 码则一并带上，
//   这样新访客的首次触达能被 events 表记为「分享来源」，未来接入邀请奖励时无需改链路。
import { useState } from 'react'
import { getSupabase } from '@/lib/supabase'

export default function ShareLink({
  path,
  title,
  text,
  label = '分享给朋友',
}: {
  /** 站内路径，如 /chart、/daily */
  path: string
  title: string
  text?: string
  label?: string
}) {
  const [copied, setCopied] = useState(false)

  const handleShare = async () => {
    const url = new URL(path, window.location.origin)
    url.searchParams.set('utm_source', 'share')
    url.searchParams.set('utm_medium', 'referral')
    try {
      // 自己的邀请码 = 当前登录用户 id 前 8 位（服务端按前缀反查邀请人，见 /api/invite/claim）
      const { data: { session } } = await getSupabase().auth.getSession()
      const ownRef = session?.user?.id?.slice(0, 8)
      // 未登录时沿用落地时记住的上游 ref，保证分享链路不断裂
      const ref = ownRef || window.localStorage.getItem('ml_ref')
      if (ref) url.searchParams.set('ref', ref.toLowerCase())
    } catch {
      // 取会话失败：不带 ref 也能分享
    }

    // 移动端优先系统分享面板（微信/小红书等都在里面）
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, text: text ?? title, url: url.toString() })
        return
      } catch {
        // 用户取消分享：不提示、不降级复制
        return
      }
    }

    try {
      await navigator.clipboard.writeText(url.toString())
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      // 剪贴板不可用（非 https 等）：静默
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className="inline-block rounded-full border border-ink/20 px-4 py-2 text-sm font-semibold text-ink transition hover:border-ink/40"
    >
      {copied ? '链接已复制' : label}
    </button>
  )
}
