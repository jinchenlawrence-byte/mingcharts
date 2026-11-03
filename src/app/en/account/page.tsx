'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase'

// English account settings: read-only email, password change, sign out.
// Auth logic is identical to the Chinese page; only labels/routes are English.
export default function EnAccountPage() {
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
      setError('Password must be at least 6 characters.')
      return
    }
    if (password !== confirm) {
      setError('The two passwords do not match.')
      return
    }
    setLoading(true)
    try {
      const { error } = await getSupabase().auth.updateUser({ password })
      if (error) throw error
      setMessage('Password updated. Use the new password next time you sign in.')
      setPassword('')
      setConfirm('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update the password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    setLoggingOut(true)
    await getSupabase().auth.signOut()
    router.push('/en')
  }

  return (
    <div className="hw-wrap hw-c-pg">
      <Link href="/en" className="hw-c-back">‹ Home</Link>
      <h1 className="hw-c-h1">Account settings</h1>

      {!checked ? (
        <p className="hw-c-meta">Checking your session…</p>
      ) : !email ? (
        <div className="hw-c-box text-center">
          <p className="hw-c-body">You are not signed in.</p>
          <Link href="/en/auth" className="hw-c-btnBig inline-block mt-4">Sign in</Link>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="hw-c-box">
            <h2 className="hw-c-secTitle">Signed in as</h2>
            <p className="text-sm text-ink">{email}</p>
          </div>

          <form onSubmit={handleChange} className="hw-c-box">
            <h2 className="hw-c-secTitle">Change password</h2>
            <label className="hw-f">New password</label>
            <input type="password" minLength={6} required className="hw-c-input" value={password} onChange={(e) => setPassword(e.target.value)} />
            <label className="hw-f mt-3">Confirm new password</label>
            <input type="password" minLength={6} required className="hw-c-input" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            {error && <p className="hw-c-err mt-2">{error}</p>}
            {message && <p className="text-xs text-green-700 mt-2">{message}</p>}
            <button type="submit" disabled={loading} className="hw-c-btnBig mt-4">
              {loading ? 'Updating…' : 'Update password'}
            </button>
          </form>

          <div className="hw-c-box text-center">
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="rounded-full border border-gold/20 px-5 py-2 text-sm hover:border-ink disabled:opacity-60"
            >
              {loggingOut ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
