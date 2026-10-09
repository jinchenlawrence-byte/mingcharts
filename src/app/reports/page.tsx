'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getSupabase } from '@/lib/supabase'
import { REPORT_KIND_LABELS, type ReportKind } from '@/lib/reportSave'
import { WAFFO_PORTAL_URL } from '@/lib/waffo-products'

interface ReportRow {
  id: string
  kind: ReportKind
  title: string
  created_at: string
}

// 报告类型徽标配色（与各模块页主色一致）
const KIND_STYLE: Record<ReportKind, string> = {
  hemun: 'bg-amber-100 text-amber-800',
  ziwei: 'bg-purple-100 text-purple-800',
  geo: 'bg-sky-100 text-sky-800',
  annual: 'bg-rose-100 text-rose-800',
}

export default function MyReports() {
  const router = useRouter()
  const [rows, setRows] = useState<ReportRow[]>([])
  const [loading, setLoading] = useState(true)
  const [notLogged, setNotLogged] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
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
        .select('id,kind,title,created_at')
        .order('created_at', { ascending: false })
      if (!error && data) setRows(data as ReportRow[])
      setLoading(false)
    })()
  }, [])

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除这份报告吗？删除后无法恢复。')) return
    const { error } = await getSupabase().from('reports').delete().eq('id', id)
    if (error) {
      setError('删除失败：' + error.message)
      return
    }
    setRows(rows.filter((r) => r.id !== id))
    setError('')
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-amber-50 to-white flex items-center justify-center">
        加载中...
      </main>
    )
  }

  if (notLogged) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-amber-50 to-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">请先登录后查看报告</p>
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

  return (
    <main className="min-h-screen bg-gradient-to-b from-amber-50 to-white py-8">
      <div className="container mx-auto px-4 max-w-3xl">
        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold text-amber-900">我的报告</h1>
          <Link
            href="/pricing"
            className="text-amber-600 hover:text-amber-800 text-sm"
          >
            去生成新报告 →
          </Link>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          合婚、紫微、地理、年运报告生成后自动保存于此，可反复回看；命书请见「我的命盘」
        </p>

        {/* Waffo 客户门户：为后续会员订阅的改卡/取消铺路；本轮订阅未上线，仅放链接 */}
        <div className="bg-white rounded-lg shadow p-4 mb-6 flex items-center justify-between gap-4">
          <div className="text-sm">
            <span className="font-semibold text-amber-900">管理订阅</span>
            <span className="text-gray-400 ml-2">（订阅功能开放后可用：查看账单、更换卡片、取消续费）</span>
          </div>
          <a
            href={WAFFO_PORTAL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 text-sm text-amber-600 hover:text-amber-800"
          >
            前往支付门户 →
          </a>
        </div>

        {rows.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-10 text-center text-gray-500">
            还没有报告。完成一次合婚配对、紫微斗数、方位城市或年运分析后会自动保存到这里
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((row) => (
              <div
                key={row.id}
                className="bg-white rounded-lg shadow p-4 flex items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded ${KIND_STYLE[row.kind] ?? 'bg-gray-100 text-gray-600'}`}>
                      {REPORT_KIND_LABELS[row.kind] ?? row.kind}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(row.created_at).toLocaleString('zh-CN')}
                    </span>
                  </div>
                  <p className="font-semibold text-amber-900 truncate">{row.title}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Link
                    href={`/reports/${row.id}`}
                    className="text-amber-600 hover:text-amber-800 text-sm"
                  >
                    查看
                  </Link>
                  <button
                    onClick={() => handleDelete(row.id)}
                    className="text-red-400 hover:text-red-600 text-sm"
                  >
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
