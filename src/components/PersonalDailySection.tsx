'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getSupabase } from '@/lib/supabase'
import { localize } from '@/lib/hant'
import type { SiteLang } from '@/lib/lang'

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
export default function PersonalDailySection({ zone, locale = 'zh-Hans' }: { zone: string; locale?: SiteLang }) {
  const L = (s: string) => localize(s, locale)
  const prefix = locale === 'zh-Hant' ? '/tw' : ''
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
      <div className="mt-6 text-center text-sm text-ink-light/40">{L('读取个性化日运…')}</div>
    )
  }
  if (!data) return null

  // 未登录
  if (data.authState === 'guest') {
    return (
      <div className="mt-8 rounded-xl bg-gold/5/60 ring-1 ring-amber-100 p-6 text-center">
        <p className="text-ink font-semibold mb-1">{L('对【你】而言的日运')}</p>
        <p className="text-sm text-ink-light mb-4">
          {L('登录并保存命盘后，日运会结合你的日主与日支给出专属一省。')}
        </p>
        <div className="flex justify-center gap-3">
          <Link href="/auth" className="bg-amber-600 text-white px-5 py-2 rounded-full text-sm font-semibold hover:bg-amber-700 transition">{L('去登录')}</Link>
          <Link href={`${prefix}/`} className="bg-white text-ink/70 ring-1 ring-amber-200 px-5 py-2 rounded-full text-sm font-semibold hover:bg-gold/5 transition">{L('去排盘')}</Link>
        </div>
      </div>
    )
  }

  // 已登录无命盘
  if (data.authState === 'noChart') {
    return (
      <div className="mt-8 rounded-xl bg-gold/5/60 ring-1 ring-amber-100 p-6 text-center">
        <p className="text-ink font-semibold mb-1">{L('对【你】而言的日运')}</p>
        <p className="text-sm text-ink-light mb-4">{L('保存一个命盘后即可解锁个性化日运。')}</p>
        <Link href={`${prefix}/`} className="inline-block bg-amber-600 text-white px-5 py-2 rounded-full text-sm font-semibold hover:bg-amber-700 transition">{L('去排盘')}</Link>
      </div>
    )
  }

  // 已登录有命盘（locked 时 ENFORCE 已开，提示会员；ENFORCE 关闭期 locked=false）
  if (data.locked) {
    return (
      <div className="mt-8 rounded-xl bg-gold/5/60 ring-1 ring-amber-100 p-6 text-center">
        <p className="text-ink font-semibold mb-1">{L('对【你】而言的日运')}</p>
        <p className="text-sm text-ink-light mb-4">{L('个性化日运为会员权益，会员上线后开放查看。')}</p>
        <Link href={`${prefix}/pricing`} className="inline-block bg-amber-600 text-white px-5 py-2 rounded-full text-sm font-semibold hover:bg-amber-700 transition">{L('了解会员')}</Link>
      </div>
    )
  }

  const p = data.personal
  if (!p) return null

  return (
    <section className="mt-8 bg-white rounded-2xl shadow-lg ring-1 ring-amber-100 p-8 sm:p-10">
      <div className="text-center">
        <div className="text-ink/70 font-semibold text-base mb-1">{L('对【你】而言')}</div>
        <p className="text-2xl leading-relaxed text-stone-800 font-serif tracking-wide">
          「{L(p.sign)}」
        </p>

        <div className="my-6 mx-auto w-16 h-px bg-amber-200" />

        <div className="text-sm text-ink-light space-y-1.5 text-left sm:text-center">
          <p>{L('你的日主')} <span className="text-ink font-semibold">{p.dayMaster}</span> · {L('今日')} <span className="text-ink font-semibold">{p.todayGan}{p.todayZhi}</span></p>
          <p>{L('今日')}{p.todayGan}{L('对你是【')}{L(p.shiShen)}{L('】（')}{L(p.shiShenBasis)}{L('）')}</p>
          <p>{L(p.relationBasis)}</p>
          <p className="text-xs text-ink-light/40 mt-1">{L('依据层级：')}{L(p.basisLevel)}</p>
        </div>

        <p className="mt-4 text-xs text-ink/70/80">{L('会员权益')}</p>
      </div>
    </section>
  )
}
