import { NextRequest, NextResponse } from 'next/server'
import { paipan, getWangShuai, getGeJu } from '@/lib/paipan'
import { buildLuckCycles, getFavorSets } from '@/lib/analysis'
import type { AnalyzableChart } from '@/lib/analysis'
import { generateAILiunian, fallbackLiunianText } from '@/lib/aiLiunian'
import { checkDSTTransition } from '@/lib/solarTime'
import { resolveBirthFromBody } from '@/lib/birthRequest'
import { saveReport, deriveReportTitle } from '@/lib/reportSave'

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
    const nowYear2 = luck.liuNian[0].year
    const liuYue = targetYear === nowYear2 ? luck.liuYue : null
    const favorSets = getFavorSets(analyzable)
    const ai = await generateAILiunian(analyzable, luck, targetYear)
    const aiSource = ai ? 'AI 深度解读' : '规则版（AI暂不可用）'
    const aiSections = ai || fallbackLiunianText(targetYear, target, liuYue, favorSets)

    const curDaYun = luck.daYun.find(d => d.current) || null
    const data = {
      targetYear,
      nowYear: nowYear2,
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
      ai: aiSections,
      aiSource,
      dstNotice: dstNotice?.message || null,
      // 新增 free/locked 分层（双写过渡：本轮 ENFORCE=false，ai 原文保留不下拦截）
      free: { targetYear, liuNian: luck.liuNian, liuYue },
      locked: {
        skus: ['annual_report'],
        preview: `${targetYear}年（${target.ganZhi}年）流年详批：事业/财运/感情/健康分维度深度解读解锁后可见。`
      }
    }

    // 登录用户：报告作为账户资产自动保存（静默降级，不阻断主流程）
    const token = typeof body.token === 'string' ? body.token : undefined
    const reportInput = { year, month, day, hour, gender, targetYear }
    const reportId = await saveReport(token, {
      kind: 'annual',
      title: deriveReportTitle('annual', reportInput),
      input: reportInput,
      result: data
    })

    return NextResponse.json({ success: true, data, reportId })
  } catch (error) {
    console.error('年运报告错误:', error)
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: `年运报告生成失败：${msg}` }, { status: 500 })
  }
}
