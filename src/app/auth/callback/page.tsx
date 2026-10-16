'use client'

// ★ 大陆可达性 P0（2026-10-16）：token_hash 验证回调页
// 背景：浏览器直连 supabase.co 被网络干扰（Failed to fetch），且默认邮件确认链接
//   恰好指向 supabase.co 的 verify 端点——大陆用户点确认邮件也会失败。
// 改造：Supabase 邮件模板改用 {{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=…
//   → 邮件链接落在自有域名上，本页用 verifyOtp 显式完成验证（同样走自有域名代理）。
// 分派：signup → 会话建立 → 回首页；recovery → 会话建立 → 跳 /reset-password 设新密码。
import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase'

function CallbackInner() {
  const params = useSearchParams()
  const router = useRouter()
  const [error, setError] = useState('')

  useEffect(() => {
    const tokenHash = params.get('token_hash')
    const type = params.get('type')
    if (!tokenHash || (type !== 'signup' && type !== 'recovery')) {
      setError('链接无效或已过期，请回到登录页重新获取邮件')
      return
    }
    getSupabase().auth
      .verifyOtp({ token_hash: tokenHash, type })
      .then(({ error }) => {
        if (error) throw error
        router.replace(type === 'recovery' ? '/reset-password' : '/')
      })
      .catch(() => setError('链接无效或已过期：确认链接只能使用一次且有时效，请重新获取邮件'))
  }, [params, router])

  if (error) {
    return (
      <div className="paper-card rounded-xl p-8 max-w-md w-full mx-4 text-center">
        <h1 className="text-2xl font-bold text-center text-ink mb-4">链接无效或已过期</h1>
        <p className="text-sm text-ink/70 text-center mb-6">{error}</p>
        <Link
          href="/auth"
          className="w-full block text-center bg-amber-600 text-white py-2 rounded-md font-semibold hover:bg-amber-700 transition"
        >
          返回登录页
        </Link>
      </div>
    )
  }
  return (
    <div className="paper-card rounded-xl p-8 max-w-md w-full mx-4">
      <p className="text-center text-ink/60">正在验证，请稍候…</p>
    </div>
  )
}

// useSearchParams 需要挂在 Suspense 边界内（app router 静态渲染要求）
export default function AuthCallbackPage() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <Suspense fallback={
        <div className="paper-card rounded-xl p-8 max-w-md w-full mx-4">
          <p className="text-center text-ink/60">正在验证，请稍候…</p>
        </div>
      }>
        <CallbackInner />
      </Suspense>
    </main>
  )
}
