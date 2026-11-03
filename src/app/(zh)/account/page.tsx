'use client'

// ★ 账号设置（HANDOFF-密码重置与账号设置 §二/H2）——最小集：
//   只读邮箱 ＋ 主动修改密码（走 Supabase 原生 updateUser）＋ 退出登录。
// ★ 未登录访问给明确提示去登录，不白屏。
// ★ 本轮不加改邮箱/删账号/订阅管理（改邮箱会影响已购权益归属，属另外的产品决策）。
// 2026-10-17 风格统一：接入 hw- 设计语言（同 /auth 壳），逻辑零改动（test-account-auth.mjs 守护）。
// 2026-10-18 补「退出登录」：Nav 的退出钮在移动端被挤在横向滚动条最右端（屏幕外），
//   用户实测找不到 —— 账号设置页是登出的自然归属地，此处给显式按钮。
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase'

export default function AccountPage() {
  const router = useRouter()
  const [email, setEmail] = useState<string | null>(null)
  const [checked, setChecked] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
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

  // 退出登录：与 Nav 的退出钮同一动作（signOut → 回首页）。
  // ★ 用 replace 而非 push：登出后按浏览器「返回」不应回到一个看似已登录的账号页。
  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await getSupabase().auth.signOut()
    } catch {
      // 静默：本地会话已被清掉即可，网络异常不阻断离开
    }
    router.replace('/')
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

                {/* 退出登录（2026-10-18 补）：Nav 的退出钮在手机上需横向滑动才可见，
                    用户实测找不到 —— 这里给一个显式、无需滑动的入口。 */}
                <div className="mt-8 border-t border-ink/10 pt-6">
                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="mx-auto block w-full max-w-[420px] rounded-full border border-ink/20 bg-white px-6 py-3 text-[15px] font-bold text-ink/70 transition-colors hover:border-ink/45 hover:text-ink disabled:opacity-60"
                  >
                    {loggingOut ? '正在退出…' : '退出登录'}
                  </button>
                  <p className="mt-3 text-center text-xs text-ink/45">
                    退出后需重新登录，才能查看「我的命盘」「我的报告」与已购内容。
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
