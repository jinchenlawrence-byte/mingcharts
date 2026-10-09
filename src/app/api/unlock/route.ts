import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase'
import { generateAnalysis, type AnalyzableChart } from '@/lib/analysis'
import { generateAIAnalysis } from '@/lib/aiAnalysis'
import { searchSimilarCases } from '@/lib/caseSearch'
import { getEntitlements, canView } from '@/lib/entitlement'

export async function POST(request: NextRequest) {
  try {
    const { token, chart } = await request.json()
    if (!token || !chart?.input || !chart?.pillars) {
      return NextResponse.json({ error: '参数缺失或格式错误' }, { status: 400 })
    }

    // 用 service_role 验证用户（服务端安全校验，不信任前端）
    const admin = createServerSupabase()
    const { data: { user }, error: authError } = await admin.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: '登录无效，请重新登录' }, { status: 401 })
    }

    // ★★ 门禁判定统一走 entitlement —— 不得在本路由另写判断（§8.5.1）
    //    ENFORCE = false 时 canView 恒返回 true → 内测期行为与现在完全一致 ✓
    const ent = await getEntitlements(admin, user.id)
    const allowed = canView(ent, 'fatebook')
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: '尚未购买命书报告', locked: true, sku: 'fatebook' },
        { status: 402 }
      )
    }

    // 优先 AI 深度解读，失败（未配置密钥/超时/格式异常）自动回退规则引擎
    const analyzable = chart as AnalyzableChart
    // 规则引擎始终先跑：其结构化岁运（大运/流年/流月）确定性计算，AI 不参与
    const rulePaid = generateAnalysis(analyzable)
    const aiPaid = await generateAIAnalysis(analyzable)
    const similarCases = searchSimilarCases(analyzable)
    const paid = aiPaid
      ? { ...aiPaid, luckCycles: rulePaid.luckCycles, similarCases }
      : { ...rulePaid, similarCases }
    const chartData = {
      ...chart,
      analysis: { ...chart.analysis, isPaid: true, paid }
    }
    const input = chart.input

    // 按出生日期查找该用户已有命盘，有则更新，无则创建
    const { data: existing } = await admin
      .from('charts')
      .select('id')
      .eq('user_id', user.id)
      .eq('birth_year', input.year)
      .eq('birth_month', input.month)
      .eq('birth_day', input.day)
      .order('created_at', { ascending: false })
      .limit(1)

    let chartId: string | undefined = existing?.[0]?.id
    if (chartId) {
      // ★ is_paid 的语义是「该命盘已被用户解锁过」，【不代表已支付】。
      //   它不参与任何权益判定（全库无人读它）；权益只由 getEntitlements 决定。
      //   保留它的用途：将来若要给内测期用户保留访问权，可据此识别。
      await admin.from('charts').update({ is_paid: true, chart_data: chartData }).eq('id', chartId)
    } else {
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
          // ★ is_paid 语义同上：代表「解锁过」，不代表「已支付」
          is_paid: true,
          chart_data: chartData
        })
        .select('id')
        .single()
      if (insertError) throw insertError
      chartId = inserted.id
    }

    // ★★★ 已删除：不再写 MOCK_ 支付流水。
    //   内测期的解锁由 ENTITLEMENT_ENFORCE = false 表达，不落任何"账"。
    //   接入支付后，真实流水由 Waffo 回调写入，届时 canView 会据此放行。

    return NextResponse.json({ success: true, data: { analysis: paid, chartData } })
  } catch (error) {
    console.error('解锁错误:', error)
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: `解锁失败：${msg}` }, { status: 500 })
  }
}
