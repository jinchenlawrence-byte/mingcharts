import type { Metadata } from 'next'
import Link from 'next/link'
import { cache } from 'react'
import { cookies } from 'next/headers'
import { createServerSupabase } from '@/lib/supabase'
import { isShareTokenShape, isShareActive, shareInactiveReason, shareUrl } from '@/lib/reportShare'
import { LOCALE_COOKIE, parseLocale } from '@/lib/locale'
import ReportOriginNote from '@/components/reports/ReportOriginNote'
import { REPORT_KIND_LABELS, type ReportKind } from '@/lib/reportSave'
import SharePrintBar from '@/components/reports/SharePrintBar'
import ShareFatebookView from '@/components/reports/ShareFatebookView'
import HemunResultView from '@/components/reports/HemunResultView'
import type { HemunData } from '@/components/reports/HemunResultView'
import ZiweiResultView from '@/components/reports/ZiweiResultView'
import type { ZiweiResultData } from '@/components/reports/ZiweiResultView'
import GeoResultView from '@/components/reports/GeoResultView'
import type { GeoResultData } from '@/components/reports/GeoResultView'
import LiunianResultView from '@/components/reports/LiunianResultView'
import type { LiunianResultData } from '@/components/reports/LiunianResultView'

// 报告分享页（命理师白标 v1）
//
// ★ 免登录：客户拿到链接就能看，不需要注册 —— 这是伙伴愿意用的前提。
// ★ 走 service_role 查【单行】：reports 的 RLS 按 user_id 隔离，anon 读不到；
//   这里只按 share_token 取一行，且只取渲染必需字段（不取 input，避免泄露命盘原始输入）。
// ★ noindex：分享页不进搜索引擎（客户隐私 + 防重复内容稀释正页）。
export const dynamic = 'force-dynamic'

// OpenGraph / Twitter 卡片（第 35 轮）——
//   伙伴把链接发到 Line / WhatsApp 时，没有 OG 就是一片空白预览。
// ★ 隐私硬约束：OG 标题/描述【不得包含具体生辰】。
//   报告标题里有出生日期，但预览卡会被再次转发到群里 —— 生辰不该出现在那里。
//   所以这里只用「品牌 + 报告类型」，不引用 row.title。
export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params
  const base: Metadata = {
    title: '报告分享 | 明理',
    description: '明理命理报告分享页。内容为传统文化分析，仅供参考娱乐。',
    robots: { index: false, follow: false, nocache: true },
  }
  if (!isShareTokenShape(token)) return base

  const row = await loadShareMeta(token)
  if (!row) return base

  const kindLabel = REPORT_KIND_LABELS[row.kind] ?? '命理报告'
  const brand = (row.brand_name ?? '').trim()
  const title = brand ? `${brand} · ${kindLabel}` : `${kindLabel} · 明理`
  const description = '逐条注明所引经典的命理报告，可在页面内打印或存为 PDF。'

  return {
    ...base,
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      siteName: row.brand_name ? brand : '明理 mingcharts.com',
      images: [{ url: '/og-report.png', width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/og-report.png'],
    },
  }
}

const DISCLAIMER = '本报告为传统命理民俗文化分析，仅供参考娱乐，不构成医疗、投资、婚姻或其他专业建议。'

/** generateMetadata 与页面共用的一次查询（cache 保证同一请求内只查一次） */
const loadShareMeta = cache(async (token: string) => {
  const admin = createServerSupabase()
  const { data } = await admin
    .from('reports')
    .select('kind,brand_name,share_expires_at,share_revoked_at')
    .eq('share_token', token)
    .eq('status', 'ready')
    .maybeSingle()
  return (data as { kind: ReportKind; brand_name: string | null } | null) ?? null
})

interface ShareRow {
  kind: ReportKind
  title: string
  result: unknown
  input: unknown
  created_at: string
  share_token: string | null
  share_expires_at: string | null
  share_revoked_at: string | null
  /** 伙伴品牌位（第 34 轮）：只收两个文本字段，渲染在标题上方 */
  brand_name: string | null
  brand_contact: string | null
}

function inactiveMessage(reason: 'revoked' | 'expired' | 'missing'): string {
  if (reason === 'revoked') return '这个分享链接已被发出者关闭。'
  if (reason === 'expired') return '这个分享链接已过期（有效期 90 天）。'
  return '这个分享链接不存在或已失效。'
}

export default async function SharedReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  // 形状不对就不必查库
  if (!isShareTokenShape(token)) {
    return <InactiveCard message={inactiveMessage('missing')} />
  }

  const admin = createServerSupabase()
  const { data, error } = await admin
    .from('reports')
    .select('kind,title,result,input,created_at,share_token,share_expires_at,share_revoked_at,brand_name,brand_contact')
    .eq('share_token', token)
    // ★ 第 34 轮：pending / failed 行不可分享（即使令牌列被误写）
    .eq('status', 'ready')
    .maybeSingle()

  if (error) {
    console.error('[share] 查询失败:', error.message)
    return <InactiveCard message="报告读取失败，请稍后重试或联系你的命理师。" />
  }

  const row = data as ShareRow | null
  if (!isShareActive(row)) {
    return <InactiveCard message={inactiveMessage(shareInactiveReason(row))} />
  }

  // 命书正文：旧行在 charts.chart_data（只存了 chart_id 指针）；
  // 伙伴自助 V2 不写 charts（避免污染伙伴自己的「我的命盘」）→ 回退读 reports.result.paid。
  let fatebookPaid: Record<string, unknown> | null = null
  if (row!.kind === 'fatebook') {
    const chartId = (row!.input as { chart_id?: string } | null)?.chart_id
    if (chartId) {
      const { data: chartRow } = await admin
        .from('charts')
        .select('chart_data')
        .eq('id', chartId)
        .maybeSingle()
      const chartData = (chartRow as { chart_data?: { analysis?: { paid?: Record<string, unknown> } } } | null)?.chart_data
      fatebookPaid = chartData?.analysis?.paid ?? null
    } else {
      const result = row!.result as { paid?: Record<string, unknown> } | null
      fatebookPaid = result?.paid ?? null
    }
  }

  const kindLabel = REPORT_KIND_LABELS[row!.kind] ?? '报告'
  const created = new Date(row!.created_at)
  // 品牌位（伙伴自己的名称/联系方式）：只在伙伴填过时出现，位于标题上方
  const brandLine = [row!.brand_name, row!.brand_contact].filter(Boolean).join(' · ')
  // 披露文案跟随访客语言（伙伴的客户多为繁体读者；简体为默认）
  const isHant = parseLocale((await cookies()).get(LOCALE_COOKIE)?.value) === 'zh-Hant'

  return (
    <main className="hw-page">
      <div className="hw-wrap hw-c-pg hw-print">
        <SharePrintBar
          brandName={row!.brand_name}
          kindLabel={kindLabel}
          shareUrl={shareUrl(token)}
        />

        <header className="mb-6">
          <p className="text-xs text-ink-light/60">
            {kindLabel} · 生成于 {created.getFullYear()}年{created.getMonth() + 1}月{created.getDate()}日
          </p>
          {brandLine && (
            <p className="text-sm font-semibold text-ink mb-1">{brandLine}</p>
          )}
          <h1 className="hw-c-h1">{row!.title}</h1>
          {/* 来源披露放标题下方（不是页脚）：这是伙伴交付给客户的第一屏，客户端辨别成本最低 */}
          <ReportOriginNote hant={isHant} className="mt-2" />
        </header>

        {row!.kind === 'fatebook' && <ShareFatebookView paid={fatebookPaid} />}
        {row!.kind === 'hemun' && <HemunResultView data={row!.result as unknown as HemunData} />}
        {row!.kind === 'ziwei' && <ZiweiResultView data={row!.result as unknown as ZiweiResultData} />}
        {row!.kind === 'geo' && <GeoResultView data={row!.result as unknown as GeoResultData} />}
        {row!.kind === 'annual' && <LiunianResultView data={row!.result as unknown as LiunianResultData} />}

        <footer className="mt-10 pt-4 border-t border-gold/15">
          <p className="text-xs text-ink-light/60">{DISCLAIMER}</p>
          <p className="text-xs text-ink-light/40 mt-2">
            由 明理 mingcharts.com 引擎生成 ·{' '}
            <Link href="/" className="hw-c-link">mingcharts.com</Link>
          </p>
        </footer>
      </div>
    </main>
  )
}

function InactiveCard({ message }: { message: string }) {
  return (
    <main className="hw-page">
      <div className="hw-wrap hw-c-pg">
        <div className="hw-c-box text-center">
          <h1 className="hw-c-h1">链接不可用</h1>
          <p className="hw-c-dx mt-3">{message}</p>
          <p className="text-xs text-ink-light/50 mt-4">
            如果你是从命理师那里收到的链接，请直接联系对方重新发送。
          </p>
          <Link href="/" className="hw-c-back inline-block mt-6">← 返回明理首页</Link>
        </div>
      </div>
    </main>
  )
}
