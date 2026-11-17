'use client'

// 认领页（先付款后注册 · 阶段 D，2026-11-17）
//
// 三棵树共用：/claim/[token]、/tw/claim/[token]、/en/claim/[token]，只传 locale。
// 纪律：
//   · 没登录 → 只给登录入口（next 指回本页），不自动注册、不猜邮箱
//   · 已登录 → 调 /api/guest/claim；同一账号重复打开是成功，不报错
//   · 错误一律用本页三语文案，绝不把英文错误码甩给用户
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase'
import { CLAIM_PAGE_COPY, claimErrorText, type ClaimPageLocale } from '@/lib/guestClaimPageCopy'

type Phase = 'checking' | 'need_login' | 'claiming' | 'success' | 'error'

export default function ClaimClient({ locale }: { locale: ClaimPageLocale }) {
  const copy = CLAIM_PAGE_COPY[locale]
  const router = useRouter()
  const params = useParams()
  const tokenParam = params?.token
  const token = typeof tokenParam === 'string' ? tokenParam : Array.isArray(tokenParam) ? tokenParam[0] : ''

  const [phase, setPhase] = useState<Phase>('checking')
  const [errorCode, setErrorCode] = useState<string>('server')
  const [redirect, setRedirect] = useState<string | null>(null)
  const started = useRef(false)

  const prefix = locale === 'en' ? '/en' : locale === 'zh-Hant' ? '/tw' : ''
  const claimPath = `${prefix}/claim/${token}`
  const authPath = `${prefix}/auth`
  const loginHref = `${authPath}?next=${encodeURIComponent(claimPath)}`
  const reportsHref = `${prefix}/reports`
  const homeHref = prefix || '/'

  useEffect(() => {
    if (started.current) return
    started.current = true

    if (!token) {
      setErrorCode('invalid')
      setPhase('error')
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        const {
          data: { session },
        } = await getSupabase().auth.getSession()
        if (cancelled) return
        if (!session) {
          setPhase('need_login')
          return
        }

        setPhase('claiming')
        const res = await fetch('/api/guest/claim', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, accessToken: session.access_token }),
        })
        const data = (await res.json().catch(() => null)) as
          | { ok?: boolean; code?: string; redirect?: string | null }
          | null
        if (cancelled) return

        // 会话过期/无效：回到登录态，而不是显示一个看不懂的错误
        if (res.status === 401) {
          setPhase('need_login')
          return
        }
        if (!res.ok || !data?.ok) {
          setErrorCode(data?.code ?? 'server')
          setPhase('error')
          return
        }
        setRedirect(typeof data.redirect === 'string' ? data.redirect : null)
        setPhase('success')
      } catch {
        if (!cancelled) {
          setErrorCode('network')
          setPhase('error')
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [token])

  const switchAccount = async () => {
    try {
      await getSupabase().auth.signOut()
    } catch {
      // 退出失败也照样去登录页；最坏是用户看到已登录状态的登录页
    }
    router.replace(loginHref)
  }

  return (
    <main className="hw-page">
      <div className="hw-wrap hw-c-pg">
        <div className="hw-c-box text-center">
          <h1 className="hw-c-secTitle">{phase === 'success' ? copy.successTitle : copy.title}</h1>

          {phase === 'checking' && <p className="hw-c-body mt-3">{copy.checking}</p>}

          {phase === 'need_login' && (
            <>
              <p className="hw-c-body mt-3">{copy.loginBody}</p>
              <Link href={loginHref} className="hw-c-btnBig inline-block mt-5">
                {copy.loginCta}
              </Link>
            </>
          )}

          {phase === 'claiming' && <p className="hw-c-body mt-3">{copy.claiming}</p>}

          {phase === 'success' && (
            <>
              <p className="hw-c-body mt-3">{copy.successBody}</p>
              {redirect && (
                <Link href={redirect} className="hw-c-btnBig inline-block mt-5">
                  {copy.openReport}
                </Link>
              )}
              <p className="mt-4">
                <Link href={reportsHref} className="hw-c-link">
                  {copy.reports}
                </Link>
              </p>
            </>
          )}

          {phase === 'error' && (
            <>
              <p className="hw-c-body mt-3">{claimErrorText(locale, errorCode)}</p>
              {(errorCode === 'email_mismatch' || errorCode === 'already_claimed') && (
                <button type="button" onClick={switchAccount} className="hw-c-btnBig inline-block mt-5">
                  {copy.switchAccount}
                </button>
              )}
              <p className="mt-4">
                <Link href={homeHref} className="hw-c-link">
                  {copy.home}
                </Link>
              </p>
            </>
          )}

          {(phase === 'checking' || phase === 'need_login' || phase === 'claiming') && (
            <p className="hw-c-meta mt-6">{copy.intro}</p>
          )}
        </div>
      </div>
    </main>
  )
}
