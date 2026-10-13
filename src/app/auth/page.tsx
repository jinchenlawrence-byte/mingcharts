'use client'

import { useState } from 'react'
import { getSupabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function AuthPage() {
  const router = useRouter()
  const [isLogin, setIsLogin] = useState(true)
  const [forgot, setForgot] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

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
    await getSupabase().auth.resetPasswordForEmail(email, { redirectTo })
    setMessage('重置邮件已发送，请查收（含垃圾邮件）')
    setLoading(false)
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const supabase = getSupabase()
      
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password
        })
        if (error) throw error
        router.push('/')
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password
        })
        if (error) throw error
        setMessage('注册成功！请查收验证邮件')
      }
    } catch (error: any) {
      setMessage(error.message || '操作失败')
    } finally {
      setLoading(false)
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

            <button
              type="submit"
              disabled={loading}
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

          <button
            type="submit"
            disabled={loading}
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
