'use client'

// ★ 忘记密码的救命通道（HANDOFF-密码重置与账号设置 §一/H1）
// 用户凭邮件链接回到本页：Supabase 邮件链接 URL 带 code，
// supabase-js 的 detectSessionInUrl（默认开启）会自动交换会话，
// getSession() 会等初始化（含交换）完成后返回 → 挂载时读一次即可分派两态。
// ★ 必须处理两种会话状态（§〇-7）：有会话→设新密码；无会话/链接过期→明确提示+重新请求入口。
// 2026-10-17 风格统一：接入 hw- 设计语言（同 /auth 壳），逻辑零改动（test-account-auth.mjs 守护）。
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getSupabase } from '@/lib/supabase'

type Phase = 'checking' | 'form' | 'no-session' | 'done'

export default function ResetPasswordPage() {
  const [phase, setPhase] = useState<Phase>('checking')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getSupabase().auth
      .getSession()
      .then(({ data: { session } }) => setPhase(session ? 'form' : 'no-session'))
      .catch(() => setPhase('no-session'))
  }, [])

  // 密码强度口径沿用 /auth 页 signUp 的 minLength=6（§8.5.1：复用已有口径，不另写一套）
  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
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
      setPhase('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : '重置失败，请重新尝试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="hw-page">
      <div className="hw-wrap hw-c-pg">
        <div className="hw-auth">
          <div className="hw-c-box">
            {phase === 'checking' && (
              <p className="text-center text-ink/60">正在验证链接…</p>
            )}

            {phase === 'form' && (
              <>
                <h1 className="hw-c-secTitle hw-c-h2C">设置新密码</h1>
                <form onSubmit={handleReset} className="space-y-4">
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
                  <button
                    type="submit"
                    disabled={loading}
                    className="hw-c-btnBig"
                  >
                    {loading ? '提交中...' : '确认修改'}
                  </button>
                </form>
              </>
            )}

            {phase === 'no-session' && (
              <>
                <h1 className="hw-c-secTitle hw-c-h2C">链接无效或已过期</h1>
                <p className="hw-c-dx text-center">
                  重置链接只能使用一次，且有时效。请重新请求一封重置邮件。
                </p>
                <p className="text-center">
                  <Link href="/auth" className="hw-c-btnBig">
                    返回登录页重新获取
                  </Link>
                </p>
              </>
            )}

            {phase === 'done' && (
              <>
                <h1 className="hw-c-secTitle hw-c-h2C">密码已重置</h1>
                <p className="hw-c-dx text-center">
                  新密码已生效，下次登录请使用新密码。
                </p>
                <p className="text-center">
                  <Link href="/" className="hw-c-btnBig">
                    返回首页
                  </Link>
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
