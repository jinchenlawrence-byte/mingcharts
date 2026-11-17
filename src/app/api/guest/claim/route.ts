import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase'
import { hashClaimToken, isClaimTokenShape, normalizeEmail } from '@/lib/guestOrder'

// POST /api/guest/claim { token, accessToken }
//
// 先付款后注册 · 认领（阶段 D，2026-11-17）
//   ① 校验会话邮箱 = 买家邮箱（一单一账号；不同账号一律拒绝）
//   ② 命书先把 chart_snapshot + 已付款分析物化成 charts（user_id=本人），再调 RPC
//   ③ RPC 负责插入 reports、回填 payments.user_id/chart_id、置 claimed 并吊销令牌
//   ④ ★ 幂等：同一用户重复打开同一链接直接返回成功，不报错（RPC 先判 revoked，
//      所以「已认领」的幂等判断必须放在这里，不能只靠 RPC）
//   ⑤ 开关默认关闭：未开放时 404，与游客其余接口一致
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function guestEnabled(): boolean {
  const v = process.env.GUEST_CHECKOUT_ENABLED?.trim().toLowerCase()
  return v === '1' || v === 'true'
}

type ErrorCode =
  | 'invalid'
  | 'not_found'
  | 'revoked'
  | 'expired'
  | 'email_mismatch'
  | 'already_claimed'
  | 'not_ready'
  | 'unauthorized'
  | 'server'

function fail(code: ErrorCode, status: number) {
  return NextResponse.json({ ok: false, code }, { status, headers: { 'Cache-Control': 'no-store' } })
}

/** 认领成功后的落点：命书正文在命盘体系，统一先回「我的报告」（列表页可一键回放命盘） */
function reportsPathForLocale(locale: string): string {
  const prefix = locale === 'en' ? '/en' : locale === 'zh-Hant' ? '/tw' : ''
  return `${prefix}/reports`
}

interface ClaimOrderRow {
  id: string
  status: string
  sku: string
  locale: string
  buyer_email: string | null
  claimed_user_id: string | null
  claim_revoked_at: string | null
  claim_expires_at: string | null
  report_id: string | null
  report_input: Record<string, unknown> | null
  chart_snapshot: Record<string, unknown> | null
  report_result: Record<string, unknown> | null
}

/** RPC 抛出的错误码 → 页面可读错误码 + HTTP 状态 */
const RPC_MAP: Record<string, { code: ErrorCode; status: number }> = {
  CLAIM_INVALID_ARGUMENT: { code: 'invalid', status: 400 },
  CLAIM_NOT_FOUND: { code: 'not_found', status: 404 },
  CLAIM_REVOKED: { code: 'revoked', status: 410 },
  CLAIM_EXPIRED: { code: 'expired', status: 410 },
  CLAIM_EMAIL_MISMATCH: { code: 'email_mismatch', status: 403 },
  CLAIM_ALREADY_CLAIMED: { code: 'already_claimed', status: 409 },
  CLAIM_NOT_READY: { code: 'not_ready', status: 409 },
  FATEBOOK_CHART_REQUIRED: { code: 'not_ready', status: 409 },
  FATEBOOK_CHART_NOT_OWNED: { code: 'server', status: 409 },
  CLAIM_REPORT_MISSING: { code: 'not_ready', status: 409 },
}

function rpcCode(message: string): string | null {
  const hit = Object.keys(RPC_MAP).find((k) => message.includes(k))
  return hit ?? null
}

export async function POST(request: NextRequest) {
  if (!guestEnabled()) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await request.json().catch(() => null)
  const rawToken = typeof (body as { token?: unknown } | null)?.token === 'string'
    ? ((body as { token: string }).token).trim()
    : ''
  const accessToken = typeof (body as { accessToken?: unknown } | null)?.accessToken === 'string'
    ? ((body as { accessToken: string }).accessToken)
    : ''

  if (!isClaimTokenShape(rawToken)) return fail('invalid', 400)
  if (!accessToken) return fail('unauthorized', 401)

  try {
    const admin = createServerSupabase()
    const {
      data: { user },
      error: authError,
    } = await admin.auth.getUser(accessToken)
    if (authError || !user || !user.email) return fail('unauthorized', 401)

    const tokenHash = hashClaimToken(rawToken)
    const { data, error } = await admin
      .from('guest_orders')
      .select(
        'id, status, sku, locale, buyer_email, claimed_user_id, claim_revoked_at, claim_expires_at, report_id, report_input, chart_snapshot, report_result',
      )
      .eq('claim_token_hash', tokenHash)
      .maybeSingle()
    if (error) {
      console.error('[guest-claim] 查询订单失败:', error.code, error.message)
      return fail('server', 500)
    }
    const order = data as ClaimOrderRow | null
    if (!order) return fail('not_found', 404)

    // ★ 已退款的单不再放行（即使曾经被认领过）
    if (order.status === 'refunded') return fail('revoked', 410)

    // ★ 幂等：同一账号重复点同一链接 → 成功（此时令牌已在首次认领时吊销）
    if (order.claimed_user_id) {
      if (order.claimed_user_id === user.id) {
        return NextResponse.json(
          {
            ok: true,
            already: true,
            reportId: order.report_id,
            redirect: reportsPathForLocale(order.locale),
          },
          { headers: { 'Cache-Control': 'no-store' } },
        )
      }
      return fail('already_claimed', 409)
    }

    if (order.claim_revoked_at) return fail('revoked', 410)
    if (!order.claim_expires_at || new Date(order.claim_expires_at).getTime() <= Date.now()) {
      return fail('expired', 410)
    }

    const userEmail = normalizeEmail(user.email)
    const buyerEmail = normalizeEmail(order.buyer_email)
    if (!userEmail || !buyerEmail || userEmail !== buyerEmail) return fail('email_mismatch', 403)

    if (order.status !== 'ready') return fail('not_ready', 409)
    if (order.sku !== 'fatebook' || !order.report_result || !order.chart_snapshot) {
      return fail('not_ready', 409)
    }

    // ── 命书物化：charts 行必须先存在，RPC 会校验归属并回填 payments.chart_id ──
    const chartData = (order.report_result.chartData ?? null) as Record<string, unknown> | null
    if (!chartData) return fail('not_ready', 409)
    // 已付款分析必须已经在生成物里；缺了等于把空报告塞给用户
    const paidAnalysis = (chartData.analysis ?? null) as Record<string, unknown> | null
    if (!paidAnalysis || !paidAnalysis.paid) return fail('not_ready', 409)

    const input = ((chartData.input ?? order.chart_snapshot.input ?? order.report_input) ??
      {}) as Record<string, unknown>
    const num = (v: unknown, fallback: number): number => {
      const n = typeof v === 'number' ? v : Number(v)
      return Number.isFinite(n) ? n : fallback
    }
    const gender = num(input.gender, -1)
    const year = num(input.year, 0)
    const month = num(input.month, 0)
    const day = num(input.day, 0)
    const hour = num(input.hour, -1)
    const minute = num(input.minute, 0)
    const birthPlace = typeof input.birthPlace === 'string' ? input.birthPlace : null

    if (gender < 0 || year <= 0 || month <= 0 || day <= 0 || hour < 0) {
      return fail('not_ready', 409)
    }

    // 重试不再建第二张盘：按出生字段查已有盘
    const { data: existing } = await admin
      .from('charts')
      .select('id, chart_data')
      .eq('user_id', user.id)
      .eq('gender', gender)
      .eq('birth_year', year)
      .eq('birth_month', month)
      .eq('birth_day', day)
      .eq('birth_hour', hour)
      .eq('birth_minute', minute)
      .limit(1)
      .maybeSingle()

    const existingRow = existing as { id?: string; chart_data?: Record<string, unknown> } | null
    let chartId = existingRow?.id ?? null
    let createdChartId: string | null = null
    if (!chartId) {
      const { data: inserted, error: insertErr } = await admin
        .from('charts')
        .insert({
          user_id: user.id,
          gender,
          birth_year: year,
          birth_month: month,
          birth_day: day,
          birth_hour: hour,
          birth_minute: minute,
          birth_place: birthPlace,
          chart_data: chartData,
        } as any)
        .select('id')
        .single()
      if (insertErr || !inserted) {
        console.error('[guest-claim] 命盘物化失败:', insertErr?.code, insertErr?.message)
        return fail('server', 500)
      }
      chartId = (inserted as { id: string }).id
      createdChartId = chartId
    } else {
      // 复用既有命盘时，把这次的已付款分析并进去（不覆盖盘上其它字段），
      // 否则「我的报告 → 查看」回放会看到未解锁内容。
      const oldData = existingRow?.chart_data ?? {}
      const oldAnalysis = (oldData.analysis ?? {}) as Record<string, unknown>
      if (!oldAnalysis.paid) {
        const merged = {
          ...oldData,
          ...chartData,
          analysis: { ...oldAnalysis, ...paidAnalysis, isPaid: true },
        }
        const { error: mergeErr } = await admin
          .from('charts')
          .update({ chart_data: merged } as any)
          .eq('id', chartId)
          .eq('user_id', user.id)
        if (mergeErr) {
          console.error('[guest-claim] 既有命盘合并已付款分析失败:', mergeErr.code, mergeErr.message)
          return fail('server', 500)
        }
      }
    }

    const { data: reportId, error: rpcError } = await admin.rpc('claim_guest_order', {
      p_token_hash: tokenHash,
      p_user_id: user.id,
      p_email: userEmail,
      p_chart_id: chartId,
    })

    if (rpcError) {
      const code = rpcCode(rpcError.message)
      // 竞态：另一请求刚认领完（同账号）→ 幂等成功；不同账号 → 409
      if (code === 'CLAIM_ALREADY_CLAIMED') {
        const { data: fresh } = await admin
          .from('guest_orders')
          .select('claimed_user_id, report_id, locale')
          .eq('id', order.id)
          .maybeSingle()
        const row = fresh as { claimed_user_id?: string | null; report_id?: string | null; locale?: string } | null
        if (row?.claimed_user_id === user.id) {
          return NextResponse.json(
            {
              ok: true,
              already: true,
              reportId: row.report_id ?? null,
              redirect: reportsPathForLocale(row.locale ?? order.locale),
            },
            { headers: { 'Cache-Control': 'no-store' } },
          )
        }
      }
      // 本次新建的盘没有用上就清掉，避免留下孤儿命盘
      if (createdChartId) {
        await admin.from('charts').delete().eq('id', createdChartId).eq('user_id', user.id)
      }
      const mapped = code ? RPC_MAP[code] : null
      console.error('[guest-claim] RPC 失败:', code ?? rpcError.message)
      return fail(mapped?.code ?? 'server', mapped?.status ?? 500)
    }

    const id = typeof reportId === 'string' ? reportId : null
    return NextResponse.json(
      {
        ok: true,
        reportId: id,
        redirect: reportsPathForLocale(order.locale),
      },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
    console.error('[guest-claim] 未预期错误:', error)
    return fail('server', 500)
  }
}
