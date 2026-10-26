import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase'
import { getPartnerBalance } from '@/lib/partnerCredits'
import { createPartnerReport, hasPartnerCreditsRow } from '@/lib/partnerReport'
import { isShareActive, shareUrl } from '@/lib/reportShare'
import { localeFromRequest } from '@/lib/locale'

// 伙伴自助出报告端点（第 34 轮 · V2）
//
// ★ 本路由只做两件事：验 token、校验参数形态，业务全在 lib/partnerReport（便于离线验收）。
// ★ GET 提供工作台所需的余额 + 最近报告：partner_credits 开着 RLS 且无策略，
//   余额只能由服务端 service_role 读（R3），客户端不接触账本。
// ★ 余额与列表不能缓存：dynamic + Cache-Control: no-store。
export const dynamic = 'force-dynamic'
export const revalidate = 0

const NO_STORE = { 'Cache-Control': 'no-store' }

/** POST { token, kind, input, brandName?, brandContact?, requestId } */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    const token = typeof body?.token === 'string' ? body.token.trim() : ''
    if (!token) {
      return NextResponse.json({ error: '登录无效，请重新登录' }, { status: 401, headers: NO_STORE })
    }

    const admin = createServerSupabase()
    const { data: { user }, error: authError } = await admin.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: '登录无效，请重新登录' }, { status: 401, headers: NO_STORE })
    }

    const result = await createPartnerReport(admin, {
      userId: user.id,
      kind: body.kind,
      input: body.input,
      brandName: body.brandName,
      brandContact: body.brandContact,
      requestId: body.requestId,
      locale: localeFromRequest(request, body),
    })

    if (!result.ok) {
      return NextResponse.json(
        {
          error: result.error,
          code: result.code,
          ...(result.needPurchase ? { needPurchase: true } : {}),
          ...(typeof result.balance === 'number' ? { balance: result.balance } : {}),
          ...(result.reportId ? { reportId: result.reportId } : {}),
        },
        { status: result.status, headers: NO_STORE }
      )
    }

    return NextResponse.json({ success: true, data: result }, { headers: NO_STORE })
  } catch (e) {
    console.error('[partner-report] 异常:', e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: '生成失败，请稍后重试或联系管理员' },
      { status: 500, headers: NO_STORE }
    )
  }
}

/** GET ?token= → { isPartner, balance, reports }（最近 20 份） */
export async function GET(request: NextRequest) {
  try {
    const token = new URL(request.url).searchParams.get('token')?.trim() ?? ''
    if (!token) {
      return NextResponse.json({ error: '登录无效，请重新登录' }, { status: 401, headers: NO_STORE })
    }

    const admin = createServerSupabase()
    const { data: { user }, error: authError } = await admin.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: '登录无效，请重新登录' }, { status: 401, headers: NO_STORE })
    }

    // 身份判定与 POST 同一口径：partner_credits 存在该 user_id 任意一行
    if (!(await hasPartnerCreditsRow(admin, user.id))) {
      return NextResponse.json(
        { isPartner: false, error: '该页面仅对合作命理师开放' },
        { status: 403, headers: NO_STORE }
      )
    }

    const [balance, list] = await Promise.all([
      getPartnerBalance(admin, user.id),
      admin
        .from('reports')
        .select('id,kind,title,status,created_at,share_token,share_expires_at,share_revoked_at,request_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20),
    ])

    if (list.error) {
      console.error('[partner-report] 列表查询失败:', list.error.message)
      return NextResponse.json(
        { isPartner: true, balance, reports: [], error: '报告列表读取失败，请稍后刷新' },
        { status: 500, headers: NO_STORE }
      )
    }

    const now = new Date()
    const reports = (list.data ?? []).map((row) => {
      const r = row as {
        id: string
        kind: string
        title: string
        status: string
        created_at: string
        share_token: string | null
        share_expires_at: string | null
        share_revoked_at: string | null
        request_id: string | null
      }
      return {
        id: r.id,
        kind: r.kind,
        title: r.title,
        status: r.status,
        created_at: r.created_at,
        request_id: r.request_id,
        // 只把仍然有效的链接回给前端：过期/吊销的令牌不该被误发给客户
        share_url: r.share_token && isShareActive(r, now) ? shareUrl(r.share_token) : null,
      }
    })

    return NextResponse.json({ isPartner: true, balance, reports }, { headers: NO_STORE })
  } catch (e) {
    console.error('[partner-report] 列表异常:', e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: '读取失败，请稍后重试' },
      { status: 500, headers: NO_STORE }
    )
  }
}
