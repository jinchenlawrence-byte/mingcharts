'use client'

// ★ 账号设置（HANDOFF-密码重置与账号设置 §二/H2）——最小集：
//   只读邮箱 ＋ 主动修改密码（走 Supabase 原生 updateUser）。
// ★ 未登录访问给明确提示去登录，不白屏。
// ★ 本轮不加改邮箱/删账号/订阅管理（改邮箱会影响已购权益归属，属另外的产品决策）。
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getSupabase } from '@/lib/supabase'

export default function AccountPage() {
  const [email, setEmail] = useState<string | null>(null)
  const [checked, setChecked] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    getSupabase().auth
      .getSession()
      .then(({ data: { session } }) => {
        setEmail(session?.user?.email ?? null)
        setChecked(true)
      })
      .catch(() => setChecked(true))
  }, [])

  // 密码强度口径沿用 /auth 页 signUp 的 minLength=6（§8.5.1：复用已有口径，不另写一套）
  const handleChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')
    if (password.length < 6) {
      setError('密码至少 6 位')
      return
    }
    if (password !== confirm) {
      setError('两次输入的密码不一致')
      return
    }
    setLoading(true)
    try {
      const { error } = await getSupabase().auth.updateUser({ password })
      if (error) throw error
      setMessage('密码已修改，下次登录请使用新密码')
      setPassword('')
      setConfirm('')
    } catch (err) {
      setError(err instanceof Error ? err.message : '修改失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="paper-card rounded-xl p-8 max-w-md w-full mx-4">
        <h1 className="text-2xl font-bold text-center text-ink mb-6">账号设置</h1>

        {!checked && <p className="text-center text-ink/60">正在加载…</p>}

        {checked && !email && (
          <div className="text-center">
            <p className="text-sm text-ink/70 mb-6">请先登录后查看账号设置</p>
            <Link
              href="/auth"
              className="inline-block bg-amber-600 text-white px-6 py-2 rounded-md font-semibold hover:bg-amber-700 transition"
            >
              去登录
            </Link>
          </div>
        )}

        {checked && email && (
          <>
            <div className="mb-6">
              <label className="block text-sm font-medium text-ink/70 mb-1">当前邮箱</label>
              <p className="px-3 py-2 border border-gold/10 rounded-md bg-paper/60 text-ink/80 break-all">
                {email}
              </p>
            </div>

            <form onSubmit={handleChange} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink/70 mb-1">新密码</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  className="w-full px-3 py-2 border border-gold/20 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink/70 mb-1">确认新密码</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  className="w-full px-3 py-2 border border-gold/20 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}
              {message && <p className="text-sm text-green-600">{message}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-amber-600 text-white py-2 rounded-md font-semibold hover:bg-amber-700 transition disabled:opacity-50"
              >
                {loading ? '提交中...' : '修改密码'}
              </button>
            </form>

            <div className="mt-4 flex justify-center gap-4 text-sm text-amber-600 hover:text-ink">
              <Link href="/charts">我的命盘</Link>
              <Link href="/reports">我的报告</Link>
            </div>
          </>
        )}
      </div>
    </main>
  )
}
