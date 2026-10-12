'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { getSupabase } from '@/lib/supabase'
import { REPORT_KIND_LABELS, type ReportKind } from '@/lib/reportSave'
import HemunResultView from '@/components/reports/HemunResultView'
import type { HemunData } from '@/components/reports/HemunResultView'
import ZiweiResultView from '@/components/reports/ZiweiResultView'
import type { ZiweiResultData } from '@/components/reports/ZiweiResultView'
import GeoResultView from '@/components/reports/GeoResultView'
import type { GeoResultData } from '@/components/reports/GeoResultView'
import LiunianResultView from '@/components/reports/LiunianResultView'
import type { LiunianResultData } from '@/components/reports/LiunianResultView'

interface ReportDetail {
  id: string
  kind: ReportKind
  title: string
  result: unknown
  created_at: string
}

const KIND_STYLE: Record<ReportKind, string> = {
  hemun: 'bg-gold/10 text-ink',
  ziwei: 'bg-purple-100 text-ink',
  geo: 'bg-sky-100 text-sky-800',
  annual: 'bg-rose-100 text-rose-800',
}

export default function ReportDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = typeof params.id === 'string' ? params.id : ''
  const [row, setRow] = useState<ReportDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [notLogged, setNotLogged] = useState(false)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!id) return
    ;(async () => {
      const supabase = getSupabase()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setNotLogged(true)
        setLoading(false)
        return
      }
      const { data, error } = await supabase
        .from('reports')
        .select('id,kind,title,result,created_at')
        .eq('id', id)
        .single()
      if (error || !data) {
        // 查不到 = 不存在或非本人（RLS 过滤），不区分展示
        setNotFound(true)
      } else {
        setRow(data as ReportDetail)
      }
      setLoading(false)
    })()
  }, [id])

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        加载中...
      </main>
    )
  }

  if (notLogged) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-ink-light mb-4">请先登录后查看报告</p>
          <button
            onClick={() => router.push('/auth')}
            className="bg-amber-600 text-white px-6 py-2 rounded-md font-semibold hover:bg-amber-700 transition"
          >
            去登录
          </button>
        </div>
      </main>
    )
  }

  if (notFound || !row) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-ink-light mb-4">报告不存在或无权查看</p>
          <Link href="/reports" className="text-amber-600 hover:text-ink">
            ← 返回我的报告
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs px-2 py-0.5 rounded ${KIND_STYLE[row.kind] ?? 'bg-paper-dark/40 text-ink-light'}`}>
                {REPORT_KIND_LABELS[row.kind] ?? row.kind}
              </span>
              <span className="text-xs text-ink-light/40">
                {new Date(row.created_at).toLocaleString('zh-CN')}
              </span>
            </div>
            <h1 className="text-xl font-bold text-ink truncate">{row.title}</h1>
          </div>
          <Link href="/reports" className="text-amber-600 hover:text-ink text-sm shrink-0">
            ← 我的报告
          </Link>
        </div>

        {row.kind === 'hemun' && <HemunResultView data={row.result as HemunData} />}
        {row.kind === 'ziwei' && <ZiweiResultView data={row.result as ZiweiResultData} />}
        {row.kind === 'geo' && <GeoResultView data={row.result as GeoResultData} />}
        {row.kind === 'annual' && <LiunianResultView data={row.result as LiunianResultData} />}
      </div>
    </main>
  )
}
