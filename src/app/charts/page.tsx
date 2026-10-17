'use client'

// 我的命盘列表（2026-10-17 风格统一）：接入 hw- 设计语言，逻辑零改动
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase'

interface ChartRow {
  id: string
  gender: number
  birth_year: number
  birth_month: number
  birth_day: number
  birth_hour: number
  birth_minute: number
  birth_place: string | null
  chart_data: {
    lunarDate: string
    dayMaster: string
    pillars: {
      year: { ganZhi: string }
      month: { ganZhi: string }
      day: { ganZhi: string }
      hour: { ganZhi: string }
    }
  }
  created_at: string
}

export default function MyCharts() {
  const router = useRouter()
  const [rows, setRows] = useState<ChartRow[]>([])
  const [loading, setLoading] = useState(true)
  const [notLogged, setNotLogged] = useState(false)
  const [error, setError] = useState('')
  const [viewingId, setViewingId] = useState<string | null>(null)

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
        .from('charts')
        .select('*')
        .order('created_at', { ascending: false })
      if (!error && data) setRows(data as ChartRow[])
      setLoading(false)
    })()
  }, [])

  const handleView = async (row: ChartRow) => {
    // chart_data 为任意 JSON，运行时可能含 input/analysis（unlock 响应同构）
    let data = row.chart_data as Record<string, any>
    // ★ 已购命盘回看补全文（2026-10-17）：chart_data.analysis.isPaid/paid 是存盘快照，
    //   付款前存的盘回看会永远锁死（webhook 只写 payments，不回填 chart_data）。
    //   走 /api/unlock：已购则服务端按同八字行判权益通过，生成/缓存全文并回写
    //   charts.chart_data（is_paid=true）——本次与以后的回看都有全文；
    //   未购（402）则按存盘原样展示锁定态，与现状一致。绝不本地重排
    //   （真太阳时可能改四柱，对不上已购的盘）。
    setViewingId(row.id)
    try {
      if (row?.id && data?.input && data?.pillars && !data.analysis?.isPaid) {
        const supabase = getSupabase()
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          const res = await fetch('/api/unlock', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: session.access_token, chart: data }),
          })
          const out = await res.json().catch(() => null)
          if (res.ok && out?.success && out?.data?.chartData) {
            data = out.data.chartData
          }
        }
      }
    } catch {
      // 解锁预取失败不阻断回看：按存盘原样展示
    }
    setViewingId(null)
    localStorage.setItem('currentChart', JSON.stringify(data))
    router.push('/chart')
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除这个命盘吗？')) return
    const { error } = await getSupabase().from('charts').delete().eq('id', id)
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
              <p className="hw-c-dx text-center">请先登录后查看命盘</p>
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
          <div className="flex items-center justify-between mb-6">
            <h1 className="hw-c-h1">我的命盘</h1>
            <button
              onClick={() => router.push('/')}
              className="bg-ink text-white px-4 py-2 rounded-full text-sm font-semibold hover:opacity-85 transition"
            >
              + 新排盘
            </button>
          </div>

          {rows.length === 0 ? (
            <div className="hw-c-box text-center text-ink-light/60">
              还没有保存的命盘，去排一个吧
            </div>
          ) : (
            <div className="space-y-3">
              {rows.map((row) => (
                <div key={row.id} className="hw-c-box p-4! flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">
                      {row.birth_year}年{row.birth_month}月{row.birth_day}日 {row.birth_hour}时
                      {row.birth_minute > 0 ? `${row.birth_minute}分` : ''}
                      {row.gender === 1 ? ' 男' : ' 女'}
                      {row.birth_place && (
                        <span className="text-sm text-ink-light/40 ml-2">{row.birth_place}</span>
                      )}
                    </p>
                    <p className="text-sm text-ink-light mt-1 tracking-wider">
                      {row.chart_data?.pillars
                        ? `${row.chart_data.pillars.year.ganZhi} ${row.chart_data.pillars.month.ganZhi} ${row.chart_data.pillars.day.ganZhi} ${row.chart_data.pillars.hour.ganZhi}`
                        : ''}
                      <span className="text-ink-light/40 ml-2">日主 {row.chart_data?.dayMaster}</span>
                    </p>
                  </div>
                  <div className="flex gap-3 shrink-0 text-sm">
                    <button
                      onClick={() => handleView(row)}
                      disabled={viewingId !== null}
                      className="font-medium hover:underline underline-offset-3 disabled:opacity-50"
                    >
                      {viewingId === row.id ? '解锁中…' : '查看'}
                    </button>
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
