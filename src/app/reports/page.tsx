'use client'

// 我的报告列表（2026-10-17 风格统一）：接入 hw- 设计语言，逻辑零改动
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
  input: { chart_id?: string } | null
}

// 报告类型徽标配色（与各模块页主色一致）
const KIND_STYLE: Record<ReportKind, string> = {
  hemun: 'bg-gold/10 text-ink',
  ziwei: 'bg-purple-100 text-ink',
  geo: 'bg-sky-100 text-sky-800',
  annual: 'bg-rose-100 text-rose-800',
  fatebook: 'bg-emerald-100 text-emerald-800',
}

export default function MyReports() {
  const router = useRouter()
  const [rows, setRows] = useState<ReportRow[]>([])
  const [loading, setLoading] = useState(true)
  const [notLogged, setNotLogged] = useState(false)
  const [error, setError] = useState('')
  const [openingId, setOpeningId] = useState<string | null>(null)

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
        .select('id,kind,title,created_at,input')
        .order('created_at', { ascending: false })
      if (!error && data) setRows(data as ReportRow[])
      setLoading(false)
    })()
  }, [])

  // ★ 命书行「查看」（2026-10-18）：fatebook 报告的正文在命盘体系——按 input.chart_id
  //   拉 charts.chart_data 写入 localStorage 后跳 /chart 重放（未生成全文时命盘页
  //   会经 /api/unlock 自动补全文）。非 fatebook 行仍走 /reports/[id] 详情页。
  const handleViewFatebook = async (row: ReportRow) => {
    const chartId = row.input?.chart_id
    if (!chartId) {
      setError('这份命书缺少命盘关联，请从「我的命盘」进入')
      return
    }
    setOpeningId(row.id)
    const { data: chartRow, error: chartErr } = await getSupabase()
      .from('charts')
      .select('chart_data')
      .eq('id', chartId)
      .maybeSingle()
    setOpeningId(null)
    // supabase 类型未收录 charts 表时推断为 never，运行时按任意 JSON 处理
    const chartData = (chartRow as { chart_data?: unknown } | null)?.chart_data
    if (chartErr || !chartData) {
      setError('命盘数据读取失败，请从「我的命盘」进入')
      return
    }
    localStorage.setItem('currentChart', JSON.stringify(chartData))
    router.push('/chart')
  }

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
      <main className="hw-page flex items-center justify-center">
        <p className="text-ink/60">加载中...</p>
      </main>
    )
  }

  if (notLogged) {
    return (
      <main className="hw-page">
        <div className="hw-wrap hw-c-pg">
          <div className="hw-narrow text-center">
            <div className="hw-c-box">
              <p className="hw-c-dx text-center">请先登录后查看报告</p>
              <p>
                <button
                  onClick={() => router.push('/auth')}
                  className="hw-c-btnBig"
                >
                  去登录
                </button>
              </p>
            </div>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="hw-page">
      <div className="hw-wrap hw-c-pg">
        <div className="hw-narrow">
          {error && <p className="hw-c-err">{error}</p>}
          <nav className="hw-c-back mb-3">
            <Link href="/">← 返回首页</Link>
          </nav>
          <div className="flex items-center justify-between mb-2">
            <h1 className="hw-c-h1">我的报告</h1>
            <Link href="/pricing" className="hw-c-blue text-sm">
              去生成新报告 →
            </Link>
          </div>
          <p className="hw-c-meta mb-4">
            合婚、紫微、地理、年运报告生成后自动保存于此，可反复回看；已购的八字命书也会显示在这里
          </p>

          {/* Waffo 客户门户：会员订阅的查看账单/更换卡片/取消续费自助入口 */}
          <div className="hw-c-box p-4! mb-6 flex items-center justify-between gap-4">
            <div className="text-sm">
              <span className="font-semibold text-ink">管理订阅</span>
              <span className="text-ink-light/40 ml-2">（查看账单、更换卡片、取消续费）</span>
            </div>
            <a
              href={WAFFO_PORTAL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 text-sm hw-c-blue"
            >
              前往支付门户 →
            </a>
          </div>

          {rows.length === 0 ? (
            <div className="hw-c-box text-center text-ink-light/60">
              还没有报告。完成一次合婚配对、紫微斗数、方位城市或年运分析后会自动保存到这里
            </div>
          ) : (
            <div className="space-y-3">
              {rows.map((row) => (
                <div key={row.id} className="hw-c-box p-4! flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded ${KIND_STYLE[row.kind] ?? 'bg-paper-dark/40 text-ink-light'}`}>
                        {REPORT_KIND_LABELS[row.kind] ?? row.kind}
                      </span>
                      <span className="text-xs text-ink-light/40">
                        {new Date(row.created_at).toLocaleString('zh-CN')}
                      </span>
                    </div>
                    <p className="font-semibold text-ink truncate">{row.title}</p>
                  </div>
                  <div className="flex gap-3 shrink-0 text-sm">
                    {row.kind === 'fatebook' ? (
                      <button
                        onClick={() => handleViewFatebook(row)}
                        disabled={openingId !== null}
                        className="font-medium hover:underline underline-offset-3 disabled:opacity-50"
                      >
                        {openingId === row.id ? '打开中…' : '查看'}
                      </button>
                    ) : (
                      <Link href={`/reports/${row.id}`} className="font-medium hover:underline underline-offset-3">
                        查看
                      </Link>
                    )}
                    <button
                      onClick={() => handleDelete(row.id)}
                      className="text-red-400 hover:text-red-600"
                    >
                      删除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
