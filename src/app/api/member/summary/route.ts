import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createServerSupabase } from '@/lib/supabase'
import { getEntitlements, canView, chartLimitFor, EMPTY_ENTITLEMENTS, type Entitlements } from '@/lib/entitlement'
import { chartFactsFrom } from '@/lib/chartFacts'
import { dailyFor, type DailyChartFacts } from '@/lib/daily'
import { buildLuckCycles, type AnalyzableChart } from '@/lib/analysis'
import { searchSimilarCases } from '@/lib/caseSearch'

// ★ 会员中心聚合接口（档 A 2026-10-18）：一次鉴权、一次取盘，按各自 grant 计算 4 段内容。
//   门禁统一走 entitlement.canView（§8.5.1），本路由不得另写判据。
//   ENFORCE=false → canView 恒 true → locked=false（内测期全放行，与 api/daily 一致）。
//   ★ 内容全部来自「用户最近命盘 charts.chart_data」（其本身即 AnalyzableChart），
//     绝不重跑 paipan（避免真太阳时重算导致四柱与已存盘不一致）。
const HISTORY_DAYS = 7

function getToken(req: NextRequest): string | null {
  const auth = req.headers.get('authorization')
  if (auth?.startsWith('Bearer ')) return auth.slice(7)
  return req.nextUrl.searchParams.get('token')
}

export async function GET(req: NextRequest) {
  try {
    const zone = req.nextUrl.searchParams.get('zone')
    const token = getToken(req)

    const emptyOut = (authState: 'guest' | 'noChart') => ({
      authState,
      liuyue: { locked: true, data: null },
      jiaoyun: { locked: true, data: null },
      history: { locked: true, data: null },
      similarCases: { locked: true, data: null },
      multiChart: { count: 0, limit: chartLimitFor(EMPTY_ENTITLEMENTS) },
    })

    if (!token) {
      return NextResponse.json({ success: true, data: emptyOut('guest') })
    }

    const admin = createServerSupabase()
    const { data: { user }, error: authError } = await admin.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ success: true, data: emptyOut('guest') })
    }

    // 最近命盘 + 权益（同一 admin，一次鉴权）
    const [{ data: rows }, ent] = await Promise.all([
      admin
        .from('charts')
        .select('chart_data')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1),
      getEntitlements(admin, user.id),
    ])

    const chartData = rows?.[0]?.chart_data as Record<string, any> | undefined
    const facts = chartData ? chartFactsFrom(chartData) : null
    const multiChart = await countAndLimit(admin, user.id, ent)

    if (!facts) {
      return NextResponse.json({ success: true, data: { ...emptyOut('noChart'), multiChart } })
    }

    const analyzable = chartData as unknown as AnalyzableChart

    // 规则引擎结构化岁运（确定性、零 AI）：大运/流月
    const luck = chartData?.analysis ? buildLuckCycles(analyzable) : null

    // ① 流月提示（liuyue）：当年 12 月
    const liuyueLocked = !canView(ent, 'liuyue')
    const liuyue = liuyueLocked
      ? { locked: true, data: null }
      : {
          locked: false,
          data: luck
            ? { year: luck.currentYear, months: luck.liuYue }
            : null,
        }

    // ② 交运提醒（jiaoyun）：当前大运 + 下一个节点（倒计时以"年差"计，数据模型只有 startYear）
    const jiaoyunLocked = !canView(ent, 'jiaoyun')
    const jiaoyun = jiaoyunLocked
      ? { locked: true, data: null }
      : { locked: false, data: jiaoyunData(luck) }

    // ③ 历史日运回看（history）：最近 HISTORY_DAYS 天逐日重算（零存储）
    const historyLocked = !canView(ent, 'history')
    const history = historyLocked
      ? { locked: true, data: null }
      : { locked: false, data: historyDaily(zone, facts, HISTORY_DAYS) }

    // ④ 相似古籍命例对照（similar_cases）
    const similarLocked = !canView(ent, 'similar_cases')
    const similarCases = similarLocked
      ? { locked: true, data: null }
      : { locked: false, data: searchSimilarCases(analyzable, 12) }

    return NextResponse.json({
      success: true,
      data: { authState: 'hasChart', liuyue, jiaoyun, history, similarCases, multiChart },
    })
  } catch (error) {
    console.error('会员中心数据错误:', error)
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: `会员中心数据获取失败：${msg}` }, { status: 500 })
  }
}

/** 多命盘：已存数量 + 当前权益上限（上限判定走 entitlement.chartLimitFor） */
async function countAndLimit(
  admin: SupabaseClient,
  userId: string,
  ent: Entitlements
): Promise<{ count: number; limit: number }> {
  const { count } = await admin
    .from('charts')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
  return { count: count ?? 0, limit: chartLimitFor(ent) }
}

/** 当前大运与下一个交运节点（含年差倒计时）；无数据返回 null */
function jiaoyunData(luck: ReturnType<typeof buildLuckCycles> | null) {
  if (!luck) return null
  const idx = luck.daYun.findIndex((d) => d.current)
  const cur = idx >= 0 ? luck.daYun[idx] : null
  const next = idx >= 0 ? luck.daYun[idx + 1] ?? null : null
  return {
    currentYear: luck.currentYear,
    current: cur && {
      ganZhi: cur.ganZhi, startYear: cur.startYear, endYear: cur.endYear,
      shiShenGan: cur.shiShenGan, tag: cur.tag, note: cur.note,
    },
    next: next && {
      ganZhi: next.ganZhi, startYear: next.startYear, endYear: next.endYear,
      shiShenGan: next.shiShenGan, tag: next.tag, note: next.note,
    },
    yearsToNext: next ? next.startYear - luck.currentYear : null,
  }
}

/** 最近 N 天个性化日运（dailyFor 逐日重算；同源归日，零存储） */
function historyDaily(zone: string | null, facts: DailyChartFacts, days: number) {
  const out: any[] = []
  const now = Date.now()
  for (let i = 0; i < days; i++) {
    const { general, personal } = dailyFor(zone, facts, new Date(now - i * 86400000))
    if (!personal) continue
    out.push({
      date: general.date,
      liuRi: general.liuRi,
      sign: personal.sign,
      shiShen: personal.shiShen,
      branchRelation: personal.branchRelation,
      relationBasis: personal.relationBasis,
    })
  }
  return out
}
