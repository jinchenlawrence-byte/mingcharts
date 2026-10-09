'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase'

export default function SaveChart() {
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
      setMessage('请先登录后再保存')
      setTimeout(() => router.push('/auth'), 1200)
      return
    }
    const stored = localStorage.getItem('currentChart')
    if (!stored) {
      setStatus('error')
      setMessage('没有可保存的排盘结果')
      return
    }
    setStatus('saving')
    try {
      const chart = JSON.parse(stored)
      const { error } = await supabase.from('charts').insert({
        user_id: session.user.id,
        gender: chart.input.gender,
        birth_year: chart.input.year,
        birth_month: chart.input.month,
        birth_day: chart.input.day,
        birth_hour: chart.input.hour,
        birth_minute: chart.input.minute,
        birth_place: chart.input.birthPlace || null,
        chart_data: chart
      } as any)
      if (error) throw error
      setStatus('saved')
      setMessage('保存成功！可在"我的命盘"中查看')
    } catch (e: any) {
      setStatus('error')
      setMessage(e.message || '保存失败')
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-6 text-center">
      <button
        onClick={handleSave}
        disabled={status === 'saving' || status === 'saved'}
        className="bg-amber-600 text-white px-6 py-2.5 rounded-md font-semibold hover:bg-amber-700 transition disabled:opacity-50"
      >
        {status === 'saving' ? '保存中...' : status === 'saved' ? '已保存 ✓' : '保存此命盘'}
      </button>
      {message && (
        <p className={`text-sm mt-2 ${status === 'error' ? 'text-red-600' : 'text-green-600'}`}>
          {message}
        </p>
      )}
      {logged === false && (
        <p className="text-xs text-gray-400 mt-1">登录后可保存命盘并随时查看</p>
      )}
    </div>
  )
}
