'use client'

// 报告详情页（2026-10-17 风格统一）：接入 hw- 设计语言，逻辑零改动
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { getSupabase } from '@/lib/supabase'
import { REPORT_KIND_LABELS, type ReportKind } from '@/lib/reportSave'
import { REPORT_GATE, gateReportForDetail, canRegenContent } from '@/lib/reportGate'
import { grantsCover } from '@/lib/entitlement'
import type { SkuId } from '@/lib/pricing'
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
  /** 请求要素存档：存档完整时用它就地补算全文（见 canRegenContent） */
  input?: unknown
  created_at: string
}

const KIND_STYLE: Record<ReportKind, string> = {
  hemun: 'bg-gold/10 text-ink',
  ziwei: 'bg-purple-100 text-ink',
  geo: 'bg-sky-100 text-sky-800',
  annual: 'bg-rose-100 text-rose-800',
  fatebook: 'bg-emerald-100 text-emerald-800',
}

/** 内容缺失时引导前往的模块页（重新生成入口；键与 ReportKind 一致） */
const MODULE_HREF: Partial<Record<ReportKind, string>> = {
  hemun: '/hemun',
  ziwei: '/ziwei',
  geo: '/geo',
  annual: '/liunian',
}

export default function ReportDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = typeof params.id === 'string' ? params.id : ''
  const [row, setRow] = useState<ReportDetail | null>(null)
  // ★ 按【当前权益】重算后的渲染数据（绝不用 row.result 直接渲染——那会把
  //   生成时写下的权益状态（locked/ai）当成真相，付费后回看永远显示「未解锁」）
  const [result, setResult] = useState<Record<string, unknown> | null>(null)
  // ★ 已解锁但库里没有全文（生成于解锁之前的报告）→ 诚实提示：需到模块页重新生成
  const [needsRegen, setNeedsRegen] = useState(false)
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
        .select('id,kind,title,result,input,created_at')
        .eq('id', id)
        .single()
      if (error || !data) {
        // 查不到 = 不存在或非本人（RLS 过滤），不区分展示
        setNotFound(true)
        setLoading(false)
        return
      }
      const detail = data as ReportDetail
      const content = (detail.result ?? {}) as Record<string, unknown>

      // ① 取【当前】权益（服务端判定口径的唯一来源；失败则按未付费渲染——保守，不外泄全文）
      let ent: { memberSkus: SkuId[]; ownedSkus: SkuId[] } = { memberSkus: [], ownedSkus: [] }
      try {
        const r = await fetch('/api/entitlements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: session.access_token }),
        })
        const j = await r.json()
        if (Array.isArray(j?.ownedSkus)) {
          ent = { memberSkus: j.memberSkus ?? [], ownedSkus: j.ownedSkus as SkuId[] }
        }
      } catch {
        // 静默：按未付费渲染
      }

      // ② 按当前权益重算 locked/ai/aiSource（2026-10-18 修复：付费后即刻生效）
      const gate = REPORT_GATE[detail.kind]
      const owned = !!gate && grantsCover(ent, gate.grant)
      let rendered = gateReportForDetail(detail.kind, content, ent)

      // ③ 已解锁但库里没有全文（报告生成于解锁之前）→ 视【存档是否完整】分两种处置：
      //    · 存档完整 + 模块开启了 regenApi（年运）→ 用存档要素【就地补算】：
      //      付费用户点开旧报告即刻见全文，不必重填一遍出生信息（成本只这一次，
      //      写回同一 cache_key 覆盖，后续打开直接命中缓存）。
      //    · 存档不全（紫微/合婚/地理的老行缺出生地/分钟）→ 【绝不补算】：
      //      回放会算出另一张盘，把错误内容当付费报告展示。改为诚实提示，
      //      引导到模块页按原出生信息重新生成。
      //    补算失败（年份窗口过期/服务不可用）同样退回提示，绝不渲染半成品。
      if (gate && owned && content.ai == null) {
        let filled = false
        if (gate.regenApi && canRegenContent(detail.kind, detail.input)) {
          try {
            const r2 = await fetch(gate.regenApi, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                ...(detail.input as Record<string, unknown>),
                token: session.access_token,
              }),
            })
            const j2 = await r2.json()
            if (j2?.success && j2.data) {
              rendered = j2.data as Record<string, unknown>
              filled = true
            }
          } catch {
            // 静默降级：下面统一退回诚实提示
          }
        }
        if (!filled) setNeedsRegen(true)
      }

      setResult(rendered)
      setRow(detail)
      setLoading(false)
    })()
  }, [id])

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

  if (notFound || !row) {
    return (
      <main className="hw-page">
        <div className="hw-wrap hw-c-pg">
          <div className="hw-narrow text-center">
            <div className="hw-c-box">
              <p className="hw-c-dx text-center">报告不存在或无权查看</p>
              <p>
                <Link href="/reports" className="hw-c-blue">
                  ← 返回我的报告
                </Link>
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
            <Link href="/reports" className="hw-c-blue text-sm shrink-0">
              ← 我的报告
            </Link>
          </div>

          {needsRegen && (
            <div className="hw-c-box mb-4">
              <p className="font-bold text-ink mb-2">本报告尚未包含深度解读全文</p>
              <p className="text-sm text-ink/70 mb-3">
                这份报告生成于解锁之前，当时只保存了结构化事实，深度解读全文未一并保存。
                请前往对应页面，按相同出生信息重新生成一次，即可查看完整内容。
              </p>
              {MODULE_HREF[row.kind] && (
                <Link href={MODULE_HREF[row.kind]!} className="hw-c-blue text-sm">
                  → 前往重新生成
                </Link>
              )}
            </div>
          )}

          {/* ★ 渲染的是按当前权益重算后的 result（不是 row.result）*/}
          {row.kind === 'hemun' && <HemunResultView data={result as unknown as HemunData} />}
          {row.kind === 'ziwei' && <ZiweiResultView data={result as unknown as ZiweiResultData} />}
          {row.kind === 'geo' && <GeoResultView data={result as unknown as GeoResultData} />}
          {row.kind === 'annual' && <LiunianResultView data={result as unknown as LiunianResultData} />}
        </div>
      </div>
    </main>
  )
}
