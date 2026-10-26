import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase'
import { hasPartnerCreditsRow } from '@/lib/partnerReport'
import {
  generateShareToken,
  shareExpiryFrom,
  shareUrl,
  isShareActive,
  SHARE_TTL_DAYS,
} from '@/lib/reportShare'

// 伙伴报告分享链接（第 34 轮 · V2）
//
// 工作台的「复制链接」按钮用：已有有效链接 → 直接复用；过期/吊销/从未建 → 换新令牌。
// ★ 只能给自己的报告建链接（归属校验），且只对 ready 行建（pending/failed 不可分享）。
export const dynamic = 'force-dynamic'
export const revalidate = 0

const NO_STORE = { 'Cache-Control': 'no-store' }

/** POST { token, reportId } */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    const token = typeof body?.token === 'string' ? body.token.trim() : ''
    const reportId = typeof body?.reportId === 'string' ? body.reportId.trim() : ''
    if (!token) {
      return NextResponse.json({ error: '登录无效，请重新登录' }, { status: 401, headers: NO_STORE })
    }
    if (!reportId) {
      return NextResponse.json({ error: '缺少报告编号' }, { status: 400, headers: NO_STORE })
    }

    const admin = createServerSupabase()
    const { data: { user }, error: authError } = await admin.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: '登录无效，请重新登录' }, { status: 401, headers: NO_STORE })
    }

    if (!(await hasPartnerCreditsRow(admin, user.id))) {
      return NextResponse.json({ error: '非伙伴账号' }, { status: 403, headers: NO_STORE })
    }

    const { data, error } = await admin
      .from('reports')
      .select('id,user_id,status,share_token,share_expires_at,share_revoked_at')
      .eq('id', reportId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (error) {
      console.error('[partner-share] 查询失败:', error.message)
      return NextResponse.json({ error: '读取报告失败，请稍后重试' }, { status: 500, headers: NO_STORE })
    }
    if (!data) {
      return NextResponse.json({ error: '报告不存在' }, { status: 404, headers: NO_STORE })
    }

    const row = data as {
      id: string
      status: string
      share_token: string | null
      share_expires_at: string | null
      share_revoked_at: string | null
    }
    if (row.status !== 'ready') {
      return NextResponse.json({ error: '报告尚未生成完成，暂不能分享' }, { status: 409, headers: NO_STORE })
    }

    const now = new Date()
    if (isShareActive(row, now)) {
      return NextResponse.json(
        { success: true, shareUrl: shareUrl(row.share_token as string), expiresAt: row.share_expires_at },
        { headers: NO_STORE }
      )
    }

    const newToken = generateShareToken()
    const expiresAt = shareExpiryFrom(now, SHARE_TTL_DAYS)
    const { error: updateError } = await admin
      .from('reports')
      .update({
        share_token: newToken,
        share_expires_at: expiresAt,
        share_revoked_at: null,
      } as never)
      .eq('id', reportId)
      .eq('user_id', user.id)

    if (updateError) {
      console.error('[partner-share] 写入失败:', updateError.message)
      return NextResponse.json({ error: '生成链接失败，请稍后重试' }, { status: 500, headers: NO_STORE })
    }

    return NextResponse.json(
      { success: true, shareUrl: shareUrl(newToken), expiresAt },
      { headers: NO_STORE }
    )
  } catch (e) {
    console.error('[partner-share] 异常:', e instanceof Error ? e.message : e)
    return NextResponse.json({ error: '生成链接失败，请稍后重试' }, { status: 500, headers: NO_STORE })
  }
}
