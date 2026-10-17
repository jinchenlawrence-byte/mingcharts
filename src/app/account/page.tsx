'use client'

// ★ 账号设置（HANDOFF-密码重置与账号设置 §二/H2）——最小集：
//   只读邮箱 ＋ 主动修改密码（走 Supabase 原生 updateUser）。
// ★ 未登录访问给明确提示去登录，不白屏。
// ★ 本轮不加改邮箱/删账号/订阅管理（改邮箱会影响已购权益归属，属另外的产品决策）。
// 2026-10-17 风格统一：接入 hw- 设计语言（同 /auth 壳），逻辑零改动（test-account-auth.mjs 守护）。
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
    <main className="hw-page">
      <div className="hw-wrap hw-c-pg">
        <div className="hw-auth">
          <div className="hw-c-box">
            <h1 className="hw-c-secTitle hw-c-h2C">账号设置</h1>

            {!checked && <p className="text-center text-ink/60">正在加载…</p>}

            {checked && !email && (
              <div className="text-center">
                <p className="hw-c-dx text-center">请先登录后查看账号设置</p>
                <p>
                  <Link href="/auth" className="hw-c-btnBig">
                    去登录
                  </Link>
                </p>
              </div>
            )}

            {checked && email && (
              <>
                <div className="mb-6">
                  <label className="hw-f">当前邮箱</label>
                  <p className="hw-c-input break-all" aria-readonly="true">
                    {email}
                  </p>
                </div>

                <form onSubmit={handleChange} className="space-y-4">
                  <div>
                    <label className="hw-f">新密码</label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      className="hw-c-input"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="hw-f">确认新密码</label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      className="hw-c-input"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                    />
                  </div>

                  {error && <p className="hw-c-err text-center">{error}</p>}
                  {message && <p className="text-sm text-green-600 text-center">{message}</p>}

                  <button
                    type="submit"
                    disabled={loading}
                    className="hw-c-btnBig"
                  >
                    {loading ? '提交中...' : '修改密码'}
                  </button>
                </form>

                <div className="mt-4 flex justify-center gap-6 text-sm">
                  <Link href="/charts" className="hw-c-blue">我的命盘</Link>
                  <Link href="/reports" className="hw-c-blue">我的报告</Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
