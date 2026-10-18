import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase'
import { getEntitlements, chartLimitFor } from '@/lib/entitlement'

// ★ 命盘保存（服务端上限校验；档 A 2026-10-18）
//   替代此前客户端直连 insert（无法校验数量）。上限统一走 entitlement.chartLimitFor
//   （免费 1 / 会员 5，见 pricing.MULTI_CHART_LIMIT），超限返 402。
//   ★ user_id 取 token 用户，不采信 body；写库用 service_role。
export async function POST(request: NextRequest) {
  try {
    const { token, chart } = await request.json()
    if (!token || !chart?.input || !chart?.pillars) {
      return NextResponse.json({ error: '参数缺失或格式错误' }, { status: 400 })
    }

    const admin = createServerSupabase()
    const { data: { user }, error: authError } = await admin.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: '登录无效，请重新登录' }, { status: 401 })
    }

    const ent = await getEntitlements(admin, user.id)
    const limit = chartLimitFor(ent)
    const { count } = await admin
      .from('charts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
    const current = count ?? 0

    if (current >= limit) {
      return NextResponse.json(
        {
          success: false, locked: true, count: current, limit,
          error: `已达命盘上限（${current}/${limit}）：免费可保存 1 个，开通会员可保存更多。`,
        },
        { status: 402 }
      )
    }

    const input = chart.input
    const { data: inserted, error: insertError } = await admin
      .from('charts')
      .insert({
        user_id: user.id,
        gender: input.gender,
        birth_year: input.year,
        birth_month: input.month,
        birth_day: input.day,
        birth_hour: input.hour,
        birth_minute: input.minute ?? 0,
        birth_place: input.birthPlace || null,
        chart_data: chart,
      } as any)
      .select('id')
      .single()
    if (insertError) throw insertError

    return NextResponse.json({ success: true, data: { id: inserted.id, count: current + 1, limit } })
  } catch (error) {
    console.error('命盘保存错误:', error)
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: `命盘保存失败：${msg}` }, { status: 500 })
  }
}
