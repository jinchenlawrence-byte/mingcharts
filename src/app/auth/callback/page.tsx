'use client'

// ★ 认证回调页：承载三条链路（2026-10-20 扩为三态分派）
//   ① 渠道失败/取消：?error=access_denied&error_description=…（GoTrue 用 query 回传）
//   ② 邮件确认/重置（大陆可达性 P0，2026-10-16）：?token_hash=…&type=signup|recovery
//      —— Supabase 邮件模板改用 {{ .SiteURL }}/auth/callback?token_hash=…&type=…
//      邮件链接落在自有域名上，本页用 verifyOtp 显式完成验证（走自有域名代理）。
//   ③ Google OAuth 回流（2026-10-20）：token 在 URL fragment，由 supabase-js 的
//      detectSessionInUrl（默认开）自动消费 —— 本页只等 getSession 完成初始化即可，
//      与 /reset-password 的成熟写法一致。
// 分派：signup → 会话建立 → 回 next（默认首页）；recovery → 跳 /reset-password 设新密码。
//
// ★★ 为什么保持 implicit 流、不切 PKCE：PKCE 的 code_verifier 只存在于【发起登录的那台
//   浏览器】的 localStorage 里 —— 一旦切 PKCE，「重置密码邮件在另一台设备/另一个浏览器
//   打开」这一类用户会直接 exchange 失败。这是真实回归，故整体不动 flowType。
//   详见 .trae/documents/Google-第三方登录-实施计划.md
// ★ next 参数来自 URL（可被恶意构造）→ 一律经 safeNext 白名单校验，防开放重定向。
import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase'
import { safeNext } from '@/lib/safeNext'

function CallbackInner() {
  const params = useSearchParams()
  const router = useRouter()
  const [error, setError] = useState('')
  const [heading, setHeading] = useState('链接无效或已过期')

  useEffect(() => {
    // ① 渠道失败或用户取消授权：GoTrue 用 query 参数回传，不需要碰会话
    const errCode = params.get('error')
    if (errCode) {
      const cancelled = errCode === 'access_denied'
      setHeading(cancelled ? '已取消登录' : '登录失败')
      setError(
        cancelled
          ? '你取消了 Google 授权。可以重试，或改用邮箱登录。'
          : `Google 登录失败：${params.get('error_description') || errCode}`
      )
      return
    }

    // ② 邮件确认/重置：token_hash 显式验证
    //    ★ type 只接受 signup / recovery —— 与两份邮件模板里可用的 type 【同集合】
    //      （test-email-templates ② 守护：模板可用集合必须等于页面接受集合，不容漂移）
    const tokenHash = params.get('token_hash')
    const type = params.get('type')
    if (tokenHash) {
      if (type !== 'signup' && type !== 'recovery') {
        setError('链接无效或已过期：确认链接只能使用一次且有时效，请重新获取邮件')
        return
      }
      getSupabase().auth
        .verifyOtp({ token_hash: tokenHash, type })
        .then(({ error }) => {
          if (error) throw error
          router.replace(type === 'recovery' ? '/reset-password' : '/')
        })
        .catch(() => setError('链接无效或已过期：确认链接只能使用一次且有时效，请重新获取邮件'))
      return
    }

    // ③ Google OAuth 回流：token 在 fragment，已由 detectSessionInUrl 消费，
    //    等初始化完成后取会话即可（与 /reset-password 同款写法）。
    //    ★ next 只用于这条路径（应用内发起登录时带来源页），且经 safeNext 白名单校验。
    const next = safeNext(params.get('next'))
    getSupabase().auth
      .getSession()
      .then(({ data: { session } }) => {
        if (!session) {
          setError('登录未完成或链接已过期，请回到登录页重试')
          return
        }
        router.replace(next)
      })
      .catch(() => setError('登录未完成或链接已过期，请回到登录页重试'))
  }, [params, router])

  if (error) {
    return (
      <div className="paper-card rounded-xl p-8 max-w-md w-full mx-4 text-center">
        <h1 className="text-2xl font-bold text-center text-ink mb-4">{heading}</h1>
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
