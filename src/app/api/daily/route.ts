import { NextRequest, NextResponse } from 'next/server'
import { dailyFor, type DailyChartFacts } from '@/lib/daily'
import { createServerSupabase } from '@/lib/supabase'
import { getEntitlements, canView } from '@/lib/entitlement'
import { chartFactsFrom } from '@/lib/chartFacts'

// 通用日签（免费）＋ 个性化日运（订阅权益 daily；HANDOFF-个性化日运 §六/§七）
// ★ 归日只算一次（dailyFor），日签段与日运段出自同一次归日（§五 P0）。
function getToken(req: NextRequest): string | null {
  const auth = req.headers.get('authorization')
  if (auth?.startsWith('Bearer ')) return auth.slice(7)
  return req.nextUrl.searchParams.get('token')
}

export async function GET(req: NextRequest) {
  try {
    const zone = req.nextUrl.searchParams.get('zone')
    const token = getToken(req)

    let authState: 'guest' | 'noChart' | 'hasChart' = 'guest'
    let chart: DailyChartFacts | null = null
    let locked = false

    if (token) {
      const admin = createServerSupabase()
      const { data: { user }, error: authError } = await admin.auth.getUser(token)
      if (!authError && user) {
        // 取最近创建的命盘（多命盘未来再选；本轮用最近一个，注释标明待定 §6.2）
        const { data: rows } = await admin
          .from('charts')
          .select('chart_data')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
        const row = rows?.[0]
        const facts = row ? chartFactsFrom(row.chart_data) : null
        if (facts) {
          chart = facts
          authState = 'hasChart'
          // 权益判定：统一走 entitlement.canView（§七），不得在路由里另写
          const ent = await getEntitlements(admin, user.id)
          // ENFORCE=false 时 canView 恒 true → locked=false（内测期免费开放）
          locked = !canView(ent, 'daily')
        } else {
          authState = 'noChart'
        }
      }
    }

    // ★ 归日一次算两段用（§五）；无命盘时 personal=null
    const { general, personal } = dailyFor(zone, chart)
    // locked 时不下发具体文案（结构就位，ENFORCE 打开后生效）
    const personalOut = locked ? null : personal

    return NextResponse.json({
      success: true,
      data: { general, personal: personalOut, locked, authState },
    })
  } catch (error) {
    console.error('日运错误:', error)
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: `日运获取失败：${msg}` }, { status: 500 })
  }
}
