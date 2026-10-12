import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase'
import { getEntitlements, canView, canViewFatebookForChart } from '@/lib/entitlement'

// POST /api/entitlements { token, chartId? }
// 供成功页轮询「权益是否已到账」（webhook 正常时几秒内解锁）。
// ★ chartId 可选（HANDOFF §4.2）：带 → 按盘判定（canViewFatebookForChart）；
//   不带 → 按「是否有任意一份已付」粗判。成功页只关心「解锁了没」——
//   付款刚完成，关联的 chart 就是刚买的那份，粗粒度足够（§4.2 明文）。
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    const token = typeof body?.token === 'string' ? body.token.trim() : ''
    if (!token) {
      return NextResponse.json({ error: '参数缺失或格式错误' }, { status: 400 })
    }
    const chartId =
      typeof body?.chartId === 'string' && body.chartId.trim() !== '' ? body.chartId.trim() : null

    const admin = createServerSupabase()
    const {
      data: { user },
      error: authError,
    } = await admin.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: '登录无效，请重新登录' }, { status: 401 })
    }

    const ent = await getEntitlements(admin, user.id)
    return NextResponse.json({
      ownedSkus: [...ent.ownedSkus],
      memberSkus: ent.memberSkus,
      canViewFatebook: chartId
        ? await canViewFatebookForChart(admin, user.id, chartId)
        : canView(ent, 'fatebook'),
    })
  } catch (error) {
    console.error('[entitlements] 查询失败:', error)
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: `权益查询失败：${msg}` }, { status: 500 })
  }
}
