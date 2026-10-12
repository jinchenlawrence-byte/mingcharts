import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { paipan, getWangShuai, getGeJu } from '@/lib/paipan'
import { buildLuckCycles, type AnalyzableChart } from '@/lib/analysis'
import { checkDSTTransition } from '@/lib/solarTime'
import { resolveBirthFromBody } from '@/lib/birthRequest'
import { canViewFatebookForChart } from '@/lib/entitlement'
import { createServerSupabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const toInt = (v: unknown, def = 0): number => {
      if (v === undefined || v === null || v === '') return def
      const n = parseInt(String(v), 10)
      return Number.isNaN(n) ? def : n
    }

    const year = toInt(body.year, -1)
    const month = toInt(body.month, -1)
    const day = toInt(body.day, -1)
    const hour = toInt(body.hour)
    const minute = toInt(body.minute)
    const gender: 1 | 0 = body.gender === 1 || body.gender === '1' ? 1 : 0

    if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) {
      return NextResponse.json(
        { error: `日期不合法：${year}-${month}-${day}` },
        { status: 400 }
      )
    }
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
      return NextResponse.json(
        { error: `时间不合法：${hour}:${minute}` },
        { status: 400 }
      )
    }

    // 出生地：城市 id / 旧版城市名 / 手动时区（含进阶经度）；共用 birthRequest 解析
    const birth = await resolveBirthFromBody(
      { year, month, day, hour, minute },
      body
    )
    if (birth.error) {
      return NextResponse.json({ error: birth.error }, { status: 400 })
    }
    const { ref, city } = birth.data!

    const explicitOffset = toInt(body.timezoneOffset, -9999)
    const timezoneOffset = explicitOffset !== -9999 ? explicitOffset : undefined

    // 排盘（时区/经度传入，偏移在 paipan 内按 tzdata 历史值计算）
    const chart = paipan({
      year,
      month,
      day,
      hour,
      minute,
      gender,
      timezoneOffset,
      birthLng: ref?.lng,
      birthZone: ref?.zone
    })

    // 夏令时切换点检测（gap/重复时刻），仅作提示
    const dstNotice = ref ? checkDSTTransition(ref.zone, { year, month, day, hour, minute }) : null

    // 基础分析
    const wangShuai = getWangShuai(chart)
    const geJu = getGeJu(chart)

    // §1.5 结构病进免费返回体：只跑结构化岁运（确定性计算），取当前大运结构病；
    // 不生成/不下发十板块付费文案。
    const analyzable: AnalyzableChart = Object.assign(chart, {
      analysis: { wangShuai, geJu, isPaid: false }
    })
    const structuralIssues =
      buildLuckCycles(analyzable).daYun.find((d) => d.current)?.structuralIssues ?? []

    // ★ 门禁按盘判定（§8.5.1 统一走 entitlement，HANDOFF §4.2）
    // fatebook：不再按「任意一份已付」粗判——查 charts 表【同八字行】（查重键与
    // unlock 一致，含 birth_hour/minute，§4.3）拿 chartId 传双层判定。
    // ★ 选择理由（任务书要求说明）：已购买的盘重排时应直接看全文（locked=null），
    //   而重排请求只带出生参数不带 chartId，只能按同八字行反查；若传 null 则
    //   ENFORCE=true 时已购用户重排会被误锁。未登录/无 token 时 chartId=null，
    //   双层判定在 ENFORCE=false 下恒放行、ENFORCE=true 下不放行——与旧
    //   canView(EMPTY_ENTITLEMENTS) 语义完全一致，单一代码路径覆盖两种登录态。
    // annual_report 真门禁在 api/liunian（年运报告已独立成模块），此处不再占位
    // ★ admin 延迟创建：只在带 token 时建（匿名排盘不依赖 Supabase 配置——
    //   entry-consistency 测试环境无 Supabase env，匿名路径必须零 Supabase 调用）
    const token = typeof body.token === 'string' ? body.token : ''
    let admin: SupabaseClient | null = null
    let chartId: string | null = null
    let userId = ''
    if (token) {
      admin = createServerSupabase()
      const { data: { user } } = await admin.auth.getUser(token)
      if (user) {
        userId = user.id
        const { data: savedChart } = await admin
          .from('charts')
          .select('id')
          .eq('user_id', user.id)
          .eq('birth_year', year)
          .eq('birth_month', month)
          .eq('birth_day', day)
          .eq('birth_hour', hour)
          .eq('birth_minute', minute)
          .order('created_at', { ascending: false })
          .limit(1)
        chartId = savedChart?.[0]?.id ?? null
      }
    }
    const unlocked = await canViewFatebookForChart(admin, userId, chartId)

    return NextResponse.json({
      success: true,
      data: {
        ...chart,
        analysis: {
          wangShuai,
          geJu,
          isPaid: false
        },
        // ★ free 层保留结构化排盘与岁运（试吃）；locked 按 unlocked 判定
        free: {
          chart: analyzable,
          wangShuai,
          geJu,
          structuralIssues
        },
        locked: unlocked ? null : {
          skus: ['fatebook', 'annual_report'],
          preview: '命书深度报告含十大板块万字详批（八字总览、性格天赋、用神喜忌、格局成败、调候、大运流年、事业财运、婚姻感情、子女六亲、健康提示），解锁后可见。'
        },
        trueSolar: ref
          ? {
              birthplace: city?.name || null,
              lng: ref.lng,
              zone: ref.zone,
              offsetMin: chart.timezoneOffsetApplied,
              dstNotice: dstNotice?.message || null
            }
          : null
      }
    })
  } catch (error) {
    console.error('排盘错误:', error)
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: `排盘失败：${msg}` },
      { status: 500 }
    )
  }
}