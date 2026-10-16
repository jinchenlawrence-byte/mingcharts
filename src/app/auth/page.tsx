'use client'

import { useState } from 'react'
import { getSupabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Turnstile from '@/components/Turnstile'

// B 层防恶意注册：Cloudflare Turnstile（配合 Supabase Captcha protection）
//  - 未配置 NEXT_PUBLIC_TURNSTILE_SITE_KEY 时验证码整体关闭，行为与从前一致
//  - Supabase 后台开启 Captcha protection 后，三处 auth 调用都必须带 captchaToken
//  - token 一次性：每次提交完成后 resetKey++ 让 widget 取新 token
const TURNSTILE_ENABLED = !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

// 网络异常兜底（大陆可达性 P0 伴生）：fetch 挂起会让按钮永远「处理中」，
// 请求超时强制中断并给中文指引；Failed to fetch 类错误映射成可操作的提示。
const FETCH_TIMEOUT_MS = 20000
function withTimeout<T>(p: PromiseLike<T>): Promise<T> {
  return Promise.race([
    Promise.resolve(p),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('请求超时')), FETCH_TIMEOUT_MS)
    ),
  ])
}
function friendlyAuthError(raw: string): string {
  if (/timeout|超时/i.test(raw)) return '请求超时：请检查网络后重试；若持续失败请更换网络（如切换 Wi‑Fi／流量）'
  if (/Failed to fetch|NetworkError|fetch failed|Load failed|Network request failed/i.test(raw)) {
    return '网络连接失败：请检查网络后重试；若持续失败请更换网络（如切换 Wi‑Fi／流量）'
  }
  // 登录失败最常见英文报错（账号不存在或密码错）——中文引导注册/找回，避免用户看不懂
  if (/Invalid login credentials/i.test(raw)) {
    return '邮箱或密码不正确。新用户请先注册并到邮箱点击确认链接（含垃圾邮件）；已注册请核对密码或用「忘记密码」重置'
  }
  return raw
}

export default function AuthPage() {
  const router = useRouter()
  const [isLogin, setIsLogin] = useState(true)
  const [forgot, setForgot] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [tsResetKey, setTsResetKey] = useState(0)
  // 人机验证加载失败可感知（2026-10-16 手机端静默锁死修复）：脚本被浏览器拦截时
  // 按钮会因无 token 一直禁用——必须给出解释＋重试入口，不能无声锁死
  const [tsFailed, setTsFailed] = useState(false)
  const handleTsToken = (t: string | null) => {
    setCaptchaToken(t)
    if (t) setTsFailed(false)
  }
  const retryTurnstile = () => {
    setTsFailed(false)
    setTsResetKey((k) => k + 1)
  }
  // 加载中占位：启用验证但尚无 token 且未失败——禁用按钮必须有解释，不能无声
  const tsPending = TURNSTILE_ENABLED && !captchaToken && !tsFailed

  // 忘记密码（HANDOFF-密码重置与账号设置 §一）：
  // 走 Supabase 原生 resetPasswordForEmail，邮件链接回跳 /reset-password 设新密码。
  // ★ redirectTo 与 Supabase Redirect URLs allowlist 中登记的地址一致（生产 https://www.mingcharts.com/reset-password）。
  // ★★ 防账号枚举（§一-1.1 ②）：无论该邮箱是否已注册、调用成败，一律给同一句提示——
  //     不 throw、不把 error 展示给用户。
  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`
    // ★ 防账号枚举纪律（§一-1.1 ②）：无 catch——成败都不读 error、不改变提示文案。
    //   try/finally 保证请求挂起被 withTimeout 打断（或正常结束）后按钮必然复位，
    //   治「一直显示处理中」卡死；失败时提示留空由用户自行重试，与原行为一致。
    try {
      await withTimeout(
        getSupabase().auth.resetPasswordForEmail(email, { redirectTo, captchaToken: captchaToken ?? undefined })
      )
      setMessage('重置邮件已发送，请查收（含垃圾邮件）；若在垃圾箱请标记「非垃圾邮件」')
    } finally {
      setLoading(false)
      setTsResetKey((k) => k + 1)
    }
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const supabase = getSupabase()
      
      if (isLogin) {
        const { error } = await withTimeout(supabase.auth.signInWithPassword({
          email,
          password,
          // Supabase JS v2：captcha token 必须走 options.captchaToken——客户端只从这里读并自行组装请求体；
          // 顶层直接传 gotrue_meta_security 会被静默丢弃（条件展开还会绕过 TS 多余属性检查，tsc 抓不到）
          options: { captchaToken: captchaToken ?? undefined }
        }))
        if (error) throw error
        router.push('/')
      } else {
        const { error } = await withTimeout(supabase.auth.signUp({
          email,
          password,
          options: { captchaToken: captchaToken ?? undefined }
        }))
        if (error) throw error
        // 注册成功 ≠ 可直接登录：邮箱验证通过前 Supabase 会拒绝登录，提示里直接讲清楚流程
        setMessage('注册成功！验证邮件已发送，请查收（含垃圾邮件）并点击邮件里的链接完成验证，再回来登录')
      }
    } catch (error: any) {
      const msg: string = error.message || '操作失败'
      // 兜底：未验证邮箱就登录时 Supabase 返回英文 "Email not confirmed"，映射成中文引导
      setMessage(/not confirmed/i.test(msg) ? '邮箱尚未验证：请先查收确认邮件（含垃圾邮件）并点击链接完成验证，再回来登录' : friendlyAuthError(msg))
    } finally {
      setLoading(false)
      setTsResetKey((k) => k + 1)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="paper-card rounded-xl p-8 max-w-md w-full mx-4">
        <h1 className="text-2xl font-bold text-center text-ink mb-6">
          {forgot ? '找回密码' : (isLogin ? '登录' : '注册')}
        </h1>

        {forgot ? (
          <form onSubmit={handleForgot} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-ink/70 mb-1">注册邮箱</label>
              <input
                type="email"
                required
                className="w-full px-3 py-2 border border-gold/20 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {message && (
              <p className={`text-sm ${message.includes('成功') || message.includes('已发送') ? 'text-green-600' : 'text-red-600'}`}>
                {message}
              </p>
            )}

            <Turnstile onToken={handleTsToken} resetKey={tsResetKey} onError={() => setTsFailed(true)} />
            {tsPending && (
              <p className="text-xs text-ink/40 text-center">正在加载人机验证…</p>
            )}
            {tsFailed && (
              <div className="text-center space-y-2">
                <p className="text-sm text-red-600">
                  人机验证加载失败：请关闭浏览器的广告/拦截功能，或更换浏览器（Chrome／Edge／Safari）后重试
                </p>
                <button
                  type="button"
                  onClick={retryTurnstile}
                  className="text-sm text-amber-600 hover:text-ink"
                >
                  重试验证
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || (TURNSTILE_ENABLED && !captchaToken)}
              className="w-full bg-amber-600 text-white py-2 rounded-md font-semibold hover:bg-amber-700 transition disabled:opacity-50"
            >
              {loading ? '发送中...' : '发送重置邮件'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink/70 mb-1">邮箱</label>
            <input
              type="email"
              required
              className="w-full px-3 py-2 border border-gold/20 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink/70 mb-1">密码</label>
            <input
              type="password"
              required
              minLength={6}
              className="w-full px-3 py-2 border border-gold/20 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {message && (
            <p className={`text-sm ${message.includes('成功') ? 'text-green-600' : 'text-red-600'}`}>
              {message}
            </p>
          )}

          <Turnstile onToken={handleTsToken} resetKey={tsResetKey} onError={() => setTsFailed(true)} />
          {tsPending && (
            <p className="text-xs text-ink/40 text-center">正在加载人机验证…</p>
          )}
          {tsFailed && (
            <div className="text-center space-y-2">
              <p className="text-sm text-red-600">
                人机验证加载失败：请关闭浏览器的广告/拦截功能，或更换浏览器（Chrome／Edge／Safari）后重试
              </p>
              <button
                type="button"
                onClick={retryTurnstile}
                className="text-sm text-amber-600 hover:text-ink"
              >
                重试验证
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || (TURNSTILE_ENABLED && !captchaToken)}
            className="w-full bg-amber-600 text-white py-2 rounded-md font-semibold hover:bg-amber-700 transition disabled:opacity-50"
          >
            {loading ? '处理中...' : (isLogin ? '登录' : '注册')}
          </button>
          </form>
        )}

        {forgot ? (
          <button
            onClick={() => { setForgot(false); setMessage('') }}
            className="w-full mt-4 text-amber-600 hover:text-ink text-sm"
          >
            返回登录
          </button>
        ) : (
          <>
            {isLogin && (
              <button
                type="button"
                onClick={() => setForgot(true)}
                className="w-full mt-4 text-amber-600 hover:text-ink text-sm"
              >
                忘记密码？
              </button>
            )}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="w-full mt-4 text-amber-600 hover:text-ink text-sm"
            >
              {isLogin ? '没有账号？去注册' : '已有账号？去登录'}
            </button>
          </>
        )}
      </div>
    </main>
  )
}
