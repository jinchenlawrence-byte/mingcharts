'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase'

// 繁體帳戶設定：與簡體/英文頁同一套鑑權邏輯，只替換文案與路由。
export default function HantAccountPage() {
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
    getSupabase().auth.getSession().then(({ data: { session } }) => {
      setEmail(session?.user?.email ?? null)
      setChecked(true)
    }).catch(() => setChecked(true))
  }, [])

  const handleChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')
    if (password.length < 6) {
      setError('密碼至少需要 6 個字元。')
      return
    }
    if (password !== confirm) {
      setError('兩次輸入的密碼不一致。')
      return
    }
    setLoading(true)
    try {
      const { error } = await getSupabase().auth.updateUser({ password })
      if (error) throw error
      setMessage('密碼已更新，下次登入請使用新密碼。')
      setPassword('')
      setConfirm('')
    } catch (err) {
      setError(err instanceof Error ? err.message : '密碼更新失敗，請稍後再試。')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    setLoggingOut(true)
    await getSupabase().auth.signOut()
    router.push('/tw')
  }

  return (
    <div className="hw-wrap hw-c-pg">
      <Link href="/tw" className="hw-c-back">‹ 首頁</Link>
      <h1 className="hw-c-h1">帳戶設定</h1>

      {!checked ? (
        <p className="hw-c-meta">正在檢查登入狀態…</p>
      ) : !email ? (
        <div className="hw-c-box text-center">
          <p className="hw-c-body">你尚未登入。</p>
          <Link href="/tw/auth" className="hw-c-btnBig inline-block mt-4">登入</Link>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="hw-c-box">
            <h2 className="hw-c-secTitle">目前登入帳號</h2>
            <p className="text-sm text-ink">{email}</p>
          </div>

          <form onSubmit={handleChange} className="hw-c-box">
            <h2 className="hw-c-secTitle">修改密碼</h2>
            <label className="hw-f">新密碼</label>
            <input type="password" minLength={6} required className="hw-c-input" value={password} onChange={(e) => setPassword(e.target.value)} />
            <label className="hw-f mt-3">確認新密碼</label>
            <input type="password" minLength={6} required className="hw-c-input" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            {error && <p className="hw-c-err mt-2">{error}</p>}
            {message && <p className="text-xs text-green-700 mt-2">{message}</p>}
            <button type="submit" disabled={loading} className="hw-c-btnBig mt-4">
              {loading ? '更新中…' : '更新密碼'}
            </button>
          </form>

          <div className="hw-c-box text-center">
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="rounded-full border border-gold/20 px-5 py-2 text-sm hover:border-ink disabled:opacity-60"
            >
              {loggingOut ? '登出中…' : '登出'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
