'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase'
import { localize } from '@/lib/hant'
import type { SiteLang } from '@/lib/lang'
import { pathForLang } from '@/lib/lang'

export default function SaveChart({ locale = 'zh-Hans' }: { locale?: SiteLang }) {
  const L = (s: string) => localize(s, locale)
  const router = useRouter()
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [logged, setLogged] = useState<boolean | null>(null)

  useEffect(() => {
    getSupabase().auth.getSession().then(({ data: { session } }) => {
      setLogged(!!session)
    })
  }, [])

  const handleSave = async () => {
    const supabase = getSupabase()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setStatus('error')
      setMessage(L('请先登录后再保存'))
      setTimeout(() => router.push(pathForLang('/auth', locale)), 1200)
      return
    }
    const stored = localStorage.getItem('currentChart')
    if (!stored) {
      setStatus('error')
      setMessage(L('没有可保存的排盘结果'))
      return
    }
    setStatus('saving')
    try {
      const chart = JSON.parse(stored)
      // ★ 改走服务端保存路由（档 A 2026-10-18）：数量上限由服务端校验，超限返 402
      const res = await fetch('/api/charts/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: session.access_token, chart }),
      })
      const out = await res.json().catch(() => null)
      if (res.status === 402) {
        setStatus('error')
        setMessage(out?.error || L('已达命盘上限，开通会员可保存更多'))
        return
      }
      if (!res.ok || !out?.success) throw new Error(out?.error || L('保存失败'))
      setStatus('saved')
      setMessage(L('保存成功！可在"我的命盘"中查看'))
    } catch (e: any) {
      setStatus('error')
      setMessage(e.message || L('保存失败'))
    }
  }

  return (
    <div className="paper-card rounded-lg p-4 mb-6 text-center">
      <button
        onClick={handleSave}
        disabled={status === 'saving' || status === 'saved'}
        className="bg-amber-600 text-white px-6 py-2.5 rounded-md font-semibold hover:bg-amber-700 transition disabled:opacity-50"
      >
        {status === 'saving' ? L('保存中...') : status === 'saved' ? L('已保存 ✓') : L('保存此命盘')}
      </button>
      {message && (
        <p className={`text-sm mt-2 ${status === 'error' ? 'text-red-600' : 'text-green-600'}`}>
          {message}
        </p>
      )}
      {logged === false && (
        <p className="text-xs text-ink-light mt-1">{L('登录后可保存命盘并随时查看')}</p>
      )}
    </div>
  )
}
