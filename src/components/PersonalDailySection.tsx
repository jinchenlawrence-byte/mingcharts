'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getSupabase } from '@/lib/supabase'

interface PersonalData {
  dayMaster: string
  todayGan: string
  todayZhi: string
  shiShen: string
  shiShenBasis: string
  branchRelation: string
  relationBasis: string
  sign: string
  basisLevel: string
}

interface DailyResp {
  general: { date: string; liuRi: string }
  personal: PersonalData | null
  locked: boolean
  authState: 'guest' | 'noChart' | 'hasChart'
}

// 个性化日运段（订阅权益 daily；HANDOFF-个性化日运 §6.2 三种状态）
export default function PersonalDailySection({ zone }: { zone: string }) {
  const [data, setData] = useState<DailyResp | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      try {
        const supabase = getSupabase()
        const { data: { session } } = await supabase.auth.getSession()
        const token = session?.access_token
        const url = `/api/daily?zone=${encodeURIComponent(zone)}${token ? `&token=${encodeURIComponent(token)}` : ''}`
        const res = await fetch(url)
        const json = await res.json()
        if (json.success) setData(json.data)
      } catch {
        // 静默：个性化段失败不影响通用日签
      } finally {
        setLoading(false)
      }
    })()
  }, [zone])

  if (loading) {
    return (
      <div className="mt-6 text-center text-sm text-gray-400">读取个性化日运…</div>
    )
  }
  if (!data) return null

  // 未登录
  if (data.authState === 'guest') {
    return (
      <div className="mt-8 rounded-xl bg-amber-50/60 ring-1 ring-amber-100 p-6 text-center">
        <p className="text-amber-900 font-semibold mb-1">对【你】而言的日运</p>
        <p className="text-sm text-gray-600 mb-4">
          登录并保存命盘后，日运会结合你的日主与日支给出专属一省。
        </p>
        <div className="flex justify-center gap-3">
          <Link href="/auth" className="bg-amber-600 text-white px-5 py-2 rounded-full text-sm font-semibold hover:bg-amber-700 transition">去登录</Link>
          <Link href="/" className="bg-white text-amber-700 ring-1 ring-amber-200 px-5 py-2 rounded-full text-sm font-semibold hover:bg-amber-50 transition">去排盘</Link>
        </div>
      </div>
    )
  }

  // 已登录无命盘
  if (data.authState === 'noChart') {
    return (
      <div className="mt-8 rounded-xl bg-amber-50/60 ring-1 ring-amber-100 p-6 text-center">
        <p className="text-amber-900 font-semibold mb-1">对【你】而言的日运</p>
        <p className="text-sm text-gray-600 mb-4">保存一个命盘后即可解锁个性化日运。</p>
        <Link href="/" className="inline-block bg-amber-600 text-white px-5 py-2 rounded-full text-sm font-semibold hover:bg-amber-700 transition">去排盘</Link>
      </div>
    )
  }

  // 已登录有命盘（locked 时 ENFORCE 已开，提示订阅；内测期 locked=false）
  if (data.locked) {
    return (
      <div className="mt-8 rounded-xl bg-amber-50/60 ring-1 ring-amber-100 p-6 text-center">
        <p className="text-amber-900 font-semibold mb-1">对【你】而言的日运</p>
        <p className="text-sm text-gray-600 mb-4">个性化日运为会员权益，开通后查看。</p>
        <Link href="/pricing" className="inline-block bg-amber-600 text-white px-5 py-2 rounded-full text-sm font-semibold hover:bg-amber-700 transition">了解会员</Link>
      </div>
    )
  }

  const p = data.personal
  if (!p) return null

  return (
    <section className="mt-8 bg-white rounded-2xl shadow-lg ring-1 ring-amber-100 p-8 sm:p-10">
      <div className="text-center">
        <div className="text-amber-700 font-semibold text-base mb-1">对【你】而言</div>
        <p className="text-2xl leading-relaxed text-stone-800 font-serif tracking-wide">
          「{p.sign}」
        </p>

        <div className="my-6 mx-auto w-16 h-px bg-amber-200" />

        <div className="text-sm text-gray-600 space-y-1.5 text-left sm:text-center">
          <p>你的日主 <span className="text-amber-900 font-semibold">{p.dayMaster}</span> · 今日 <span className="text-amber-900 font-semibold">{p.todayGan}{p.todayZhi}</span></p>
          <p>今日{p.todayGan}对你是【{p.shiShen}】（{p.shiShenBasis}）</p>
          <p>{p.relationBasis}</p>
          <p className="text-xs text-gray-400 mt-1">依据层级：{p.basisLevel}</p>
        </div>

        <p className="mt-4 text-xs text-amber-700/80">会员权益 · 内测期免费开放</p>
      </div>
    </section>
  )
}
