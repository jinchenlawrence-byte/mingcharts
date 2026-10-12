import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { paipan, getWangShuai, getGeJu } from '@/lib/paipan'
import { buildLuckCycles, getFavorSets } from '@/lib/analysis'
import type { AnalyzableChart } from '@/lib/analysis'
import { generateAILiunian, fallbackLiunianText } from '@/lib/aiLiunian'
import { checkDSTTransition } from '@/lib/solarTime'
import { resolveBirthFromBody } from '@/lib/birthRequest'
import { getEntitlements, canView, EMPTY_ENTITLEMENTS } from '@/lib/entitlement'
import { createServerSupabase } from '@/lib/supabase'
import { saveReport, deriveReportTitle } from '@/lib/reportSave'
import {
  annualCacheKey, stripEntitlementState, recomputeEntitlementFields,
  isCacheContentUsable, cachedTargetOf, readReportCache,
  type AnnualCacheInput
} from '@/lib/reportCache'

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
    // ★ 重新生成入口（HANDOFF §四）：force=true 绕过缓存重新调 AI，结果覆盖写同一 cache_key。
    //   限流：暂不做（成本敞口在回执写明）；覆盖写保证不堆积重复行。
    const force = body.force === true

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

    // 目标流年：只能是今年/明年/后年（= 规则引擎 liuNian 三年窗口）
    const nowYear = new Date().getFullYear()
    const targetYear = toInt(body.targetYear, -1)
    if (![nowYear, nowYear + 1, nowYear + 2].includes(targetYear)) {
      return NextResponse.json(
        { error: '目标年份不合法：年运报告目前仅支持今年、明年或后年' },
        { status: 400 }
      )
    }

    // 出生地：城市 id / 旧版城市名 / 手动时区（含进阶经度）；与其它入口共用同一解析
    const birth = await resolveBirthFromBody({ year, month, day, hour, minute }, body)
    if (birth.error) {
      return NextResponse.json({ error: birth.error }, { status: 400 })
    }
    const { ref } = birth.data!

    // ★ 报告缓存键（HANDOFF §三原则②）：kind + v{版本} + targetYear + 八字时间参数【全量】——
    //   分钟 / 时区 / 经度（真太阳时）/ nowYear 全部入键；缺时区经度会在补填出生地后命中错误缓存。
    const reportInput: AnnualCacheInput = {
      year, month, day, hour, minute, gender, targetYear,
      birthZone: ref?.zone ?? null,
      birthLng: typeof ref?.lng === 'number' ? ref.lng : null,
      nowYear
    }
    const cacheKey = annualCacheKey(reportInput)

    // ★ 门禁判定统一走 entitlement（§8.5.1），不得在本路由另写判断
    // ENFORCE=false → unlocked 恒 true → 内测期行为与现在完全一致 ✓
    // userId 供缓存读写使用（与 ent 同一次 auth.getUser 取得）
    const token = typeof body.token === 'string' ? body.token : ''
    let ent = EMPTY_ENTITLEMENTS
    let userId: string | null = null
    let admin: SupabaseClient | null = null
    if (token) {
      admin = createServerSupabase()
      const { data: { user } } = await admin.auth.getUser(token)
      if (user) {
        userId = user.id
        ent = await getEntitlements(admin, user.id)
      }
    }
    const unlocked = canView(ent, 'annual_report')

    // ★ 缓存读取（HANDOFF §3.4 流程②）：命中 → 直接用缓存内容（不调 AI），
    //   locked/ai/aiSource 按当前权益重算（原则①）；ai 为空的缓存视为未命中（缓存自愈）。
    //   force=true（重新生成）与未登录用户跳过读取。
    if (!force && userId && admin) {
      const hit = await readReportCache(admin, userId, 'annual', cacheKey)
      if (hit && isCacheContentUsable(hit.content)) {
        const cachedItem = cachedTargetOf(hit.content, targetYear)
        // ★ 权益字段永远重算，绝不复用缓存中的 locked/ai（原则①）。
        //   牙口注入点：此处改回直接下发 hit.content（把 locked 也存也发）→ 断言②精确翻红。
        const data = recomputeEntitlementFields(hit.content, {
          unlocked,
          skus: ['annual_report'],
          lockedPreview: `${targetYear}年（${cachedItem?.ganZhi ?? ''}年）流年详批：事业/财运/感情/健康分维度深度解读解锁后可见。`
        })
        return NextResponse.json({ success: true, data, reportId: hit.reportId, cached: true })
      }
    }

    // 排盘 → 旺衰/格局 → 规则引擎结构化岁运（大运/流年/流月，确定性计算）
    const chart = paipan({
      year, month, day, hour, minute, gender,
      birthLng: ref?.lng,
      birthZone: ref?.zone
    })
    const wangShuai = getWangShuai(chart)
    const geJu = getGeJu(chart)
    const analyzable: AnalyzableChart = Object.assign(chart, {
      analysis: { wangShuai, geJu, isPaid: false }
    })
    const luck = buildLuckCycles(analyzable)
    const target = luck.liuNian.find(y => y.year === targetYear)
    if (!target) {
      // 校验兜底：targetYear 校验在前，正常到不了这里
      return NextResponse.json({ error: '目标年份超出可批范围' }, { status: 400 })
    }

    // 夏令时切换点检测（gap/重复时刻），仅作提示
    const dstNotice = ref ? checkDSTTransition(ref.zone, { year, month, day, hour, minute }) : null

    // AI 深度文字解读；失败回退规则版（流月仅当年提供）
    // ★ 当年读 luck.currentYear 显式字段，严禁 luck.liuNian[0]（首位是 8 年前；复核 2026-10-10）
    const liuYue = targetYear === luck.currentYear ? luck.liuYue : null
    const favorSets = getFavorSets(analyzable)
    const aiReport = await generateAILiunian(analyzable, luck, targetYear)

    // ★ free 层保留结构化岁运事实（试吃本意）；ai 在未解锁时为 null
    const ai = unlocked ? (aiReport || fallbackLiunianText(targetYear, target, liuYue, favorSets)) : null
    const aiSource = !unlocked ? '未解锁'
      : aiReport ? 'AI 深度解读'
      : '规则版（AI结果未过合规校验）'

    const curDaYun = luck.daYun.find(d => d.current) || null
    const data = {
      targetYear,
      nowYear: luck.currentYear,
      input: { year, month, day, hour, minute, gender },
      pillars: chart.pillars,
      dayMaster: chart.dayMaster,
      taiYuan: chart.taiYuan,
      mingGong: chart.mingGong,
      lunarDate: chart.lunarDate,
      wangShuai,
      geJu,
      favorable: favorSets.favorable,
      unfavorable: favorSets.unfavorable,
      curDaYun,
      liuNian: luck.liuNian,
      liuYue,
      ai,
      aiSource,
      dstNotice: dstNotice?.message || null,
      // ★ free 层保留结构化岁运事实（试吃本意）；locked 在已解锁时为 null
      free: { targetYear, liuNian: luck.liuNian, liuYue },
      locked: unlocked ? null : {
        skus: ['annual_report'],
        preview: `${targetYear}年（${target.ganZhi}年）流年详批：事业/财运/感情/健康分维度深度解读解锁后可见。`
      }
    }

    // 登录用户：报告作为账户资产自动保存（静默降级，不阻断主流程）。
    // ★ 缓存覆盖写（原则③）：cacheKey 提供后同一 (user_id, kind, cache_key) 只保留一行；
    //   写入内容剥掉 locked（原则①：只存内容，不存权益状态）。
    const reportId = await saveReport(token || undefined, {
      kind: 'annual',
      title: deriveReportTitle('annual', reportInput),
      input: reportInput,
      result: stripEntitlementState(data),
      cacheKey
    })

    return NextResponse.json({ success: true, data, reportId, cached: false })
  } catch (error) {
    console.error('年运报告错误:', error)
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: `年运报告生成失败：${msg}` }, { status: 500 })
  }
}
