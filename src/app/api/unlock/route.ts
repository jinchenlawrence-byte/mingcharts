import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase'
import { RATE_LIMIT_ENFORCE, checkRateLimit, clientKey, rateLimitedBody, USER_RULES } from '@/lib/rateLimit'
import { checkAiBudget } from '@/lib/aiBudget'
import { generateAnalysis, type AnalyzableChart } from '@/lib/analysis'
import { generateAIAnalysis } from '@/lib/aiAnalysis'
import { searchSimilarCases } from '@/lib/caseSearch'
import { canViewFatebookForChart } from '@/lib/entitlement'
import { ensureFatebookReportByAdmin } from '@/lib/reportSave'

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

    // ★★ 顺序调整（HANDOFF §4.2）：先查/建 chart 拿 chartId，再判权益 ——
    //    chart_id 是权益凭据（§四），402 时行也必须在（用户接下来去购买，
    //    webhook 靠 chartId 把付款关联到这份命盘，凭据链才闭合）；
    //    且昂贵的 AI 生成必须挡在权益判定之后（402 时不触发任何 AI 调用）。
    // 按出生时间查找该用户已有命盘，有则记 id，无则按分支补建。
    // ★ 查重键含 birth_hour/birth_minute（§4.3 评估结论）：同一份命书的身份由
    //    完整出生时间决定——同日不同时辰的命书是不同商品，不得共用一次付款
    //    （旧键只到日，会把「买了 A 时辰」误判成「同日任意时辰都买过」）。
    const input = chart.input
    const { data: existing } = await admin
      .from('charts')
      .select('id, chart_data')
      .eq('user_id', user.id)
      .eq('birth_year', input.year)
      .eq('birth_month', input.month)
      .eq('birth_day', input.day)
      .eq('birth_hour', input.hour)
      .eq('birth_minute', input.minute ?? 0)
      .order('created_at', { ascending: false })
      .limit(1)

    let chartId: string | undefined = existing?.[0]?.id

    // ★★ 门禁按盘判定（§四双层判定单一事实源）：ENFORCE=false 恒放行（内测期与现状一致）
    const allowed = await canViewFatebookForChart(admin, user.id, chartId ?? null)
    if (!allowed) {
      // 402 路径：命盘尚不存在时，先把客户端传来的盘落库（is_paid=false、
      // 不含付费分析）——chartId 凭据链就位；is_paid 仍只在真实解锁后置 true。
      if (!chartId) {
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
            is_paid: false,
            chart_data: chart
          })
          .select('id')
          .single()
        if (insertError) throw insertError
        chartId = inserted.id
      }
      return NextResponse.json(
        { success: false, error: '尚未购买命书报告', locked: true, sku: 'fatebook', chartId },
        { status: 402 }
      )
    }

    // ★★ 已解锁快路径（2026-10-18）：该命盘此前已生成过全文时【绝不重跑 AI】——
    //    直接返回存量全文，并顺带补插 fatebook 报告行（幂等）。这让本路由成为
    //    客户端可每次回看都调用的「同步端点」：已购→秒回；未购→402；新购→生成。
    //    （修复：一旦 chart_data 自愈 isPaid=true，报告行补插永不触发的历史缺口。）
    const prevChartData = (existing?.[0]?.chart_data ?? null) as Record<string, any> | null
    if (chartId && prevChartData?.analysis?.isPaid && prevChartData.analysis.paid) {
      await ensureFatebookReportByAdmin(admin, user.id, chartId, {
        year: input.year,
        month: input.month,
        day: input.day,
        hour: input.hour,
        gender: input.gender
      })
      return NextResponse.json({
        success: true,
        data: { analysis: prevChartData.analysis.paid, chartData: prevChartData }
      })
    }

    // ★ 速率限制（token 防盗用第二档）：默认关闭（内测放行）；开启后按 u:<id> 固定窗口计数，超限返 429。
    //   放在【已解锁快路径之后、AI 生成之前】—— 回看（命中存量全文）不计数，只有真要生成命书才算额度。
    const rl = await checkRateLimit(admin, clientKey(user.id, request), USER_RULES)
    if (!rl.allowed) return NextResponse.json(rateLimitedBody(rl), { status: 429 })

    // ★★ 全局日预算熔断（token 防盗用第三档）：超额 → 当日跳过 AI、回退规则引擎（200 非 429，次日恢复）。
    const budget = await checkAiBudget(admin, Date.now())
    const aiBlocked = budget.exhausted

    // 优先 AI 深度解读，失败（未配置密钥/超时/格式异常）自动回退规则引擎
    const analyzable = chart as AnalyzableChart
    // 规则引擎始终先跑：其结构化岁运（大运/流年/流月）确定性计算，AI 不参与
    const rulePaid = generateAnalysis(analyzable)
    const aiPaid = aiBlocked ? null : await generateAIAnalysis(analyzable)
    const similarCases = searchSimilarCases(analyzable)
    const paid = aiPaid
      ? { ...aiPaid, luckCycles: rulePaid.luckCycles, similarCases }
      : { ...rulePaid, similarCases }
    const chartData = {
      ...chart,
      analysis: { ...chart.analysis, isPaid: true, paid }
    }

    if (chartId) {
      // ★ is_paid 的语义是「该命盘已被用户解锁过」，【不代表已支付】。
      //   它不参与任何权益判定（全库无人读它）；权益凭据是 payments.chart_id
      //   （§四 canViewFatebookForChart）。
      //   保留它的用途：将来若要给内测期用户保留访问权，可据此识别。
      await admin.from('charts').update({ is_paid: true, chart_data: chartData }).eq('id', chartId)
      // ★ 已购命书进「我的报告」（2026-10-18）：解锁回写时补插 fatebook 报告行
      //   （cache_key=chartId 幂等）。webhook 主路径已插；这里兜底存量支付
      //   （webhook 上线前的买家首次回看即入列表）。
      await ensureFatebookReportByAdmin(admin, user.id, chartId, {
        year: input.year,
        month: input.month,
        day: input.day,
        hour: input.hour,
        gender: input.gender
      })
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
