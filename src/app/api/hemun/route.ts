import { NextRequest, NextResponse } from 'next/server'
import { paipan, getWangShuai, getGeJu } from '@/lib/paipan'
import type { PaipanInput } from '@/lib/paipan'
import { hehun } from '@/lib/hemun'
import { generateAIHemun, fallbackHemunText } from '@/lib/aiHemun'
import type { AnalyzableChart } from '@/lib/analysis'
import { checkDSTTransition } from '@/lib/solarTime'
import { resolveBirthFromBody } from '@/lib/birthRequest'
import { getEntitlements, canView, EMPTY_ENTITLEMENTS } from '@/lib/entitlement'
import { createServerSupabase } from '@/lib/supabase'
import { saveReport, deriveReportTitle } from '@/lib/reportSave'

interface RawBirth {
  year?: unknown; month?: unknown; day?: unknown
  hour?: unknown; minute?: unknown; gender?: unknown
  birthCityId?: unknown; birthplace?: unknown
  birthLng?: unknown; birthZone?: unknown
}

async function parseBirth(raw: RawBirth, expectGender: 1 | 0): Promise<{ data?: PaipanInput; error?: string }> {
  const toInt = (v: unknown): number => {
    if (v === undefined || v === null || v === '') return NaN
    return parseInt(String(v), 10)
  }
  const year = toInt(raw.year), month = toInt(raw.month), day = toInt(raw.day)
  const hour = toInt(raw.hour)
  const minute = raw.minute === undefined || raw.minute === null || raw.minute === ''
    ? 0 : parseInt(String(raw.minute), 10)
  if ([year, month, day, hour, minute].some(Number.isNaN)) {
    return { error: '出生信息不完整' }
  }
  if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) {
    return { error: `日期不合法：${year}-${month}-${day}` }
  }
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return { error: `时间不合法：${hour}:${minute}` }
  }
  // 性别以表单选择为准，缺失时用合婚默认（男左女右）
  const gender: 1 | 0 = raw.gender === 1 || raw.gender === '1' ? 1
    : raw.gender === 0 || raw.gender === '0' ? 0 : expectGender

  // 出生地：城市 id / 旧版城市名 / 手动时区（含进阶经度）；与其它入口共用同一解析
  const birth = await resolveBirthFromBody({ year, month, day, hour, minute }, raw)
  if (birth.error) return { error: birth.error }
  const { ref } = birth.data!

  return {
    data: {
      year, month, day, hour, minute, gender,
      birthLng: ref?.lng,
      birthZone: ref?.zone
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const [m, f] = await Promise.all([
      parseBirth(body.male || {}, 1),
      parseBirth(body.female || {}, 0)
    ])
    if (m.error) return NextResponse.json({ error: `男方信息：${m.error}` }, { status: 400 })
    if (f.error) return NextResponse.json({ error: `女方信息：${f.error}` }, { status: 400 })

    const maleChart = paipan(m.data!)
    const femaleChart = paipan(f.data!)

    // 夏令时切换点提示（gap/重复时刻），各按本方时区与时刻
    const dstOf = (d: PaipanInput) =>
      d.birthZone
        ? checkDSTTransition(d.birthZone, {
            year: d.year, month: d.month, day: d.day, hour: d.hour, minute: d.minute
          })?.message || null
        : null
    const dstNotices = { male: dstOf(m.data!), female: dstOf(f.data!) }

    const male: AnalyzableChart = Object.assign(maleChart, {
      analysis: { wangShuai: getWangShuai(maleChart), geJu: getGeJu(maleChart), isPaid: false }
    })
    const female: AnalyzableChart = Object.assign(femaleChart, {
      analysis: { wangShuai: getWangShuai(femaleChart), geJu: getGeJu(femaleChart), isPaid: false }
    })

    // 规则引擎：全部干支事实与评分
    const result = hehun(male, female)

    // AI 深度文字解读；失败回退规则版
    const aiReport = await generateAIHemun(male, female, result)

    // ★ 门禁判定统一走 entitlement（§8.5.1）
    const token = typeof body.token === 'string' ? body.token : ''
    let ent = EMPTY_ENTITLEMENTS
    if (token) {
      const admin = createServerSupabase()
      const { data: { user } } = await admin.auth.getUser(token)
      if (user) ent = await getEntitlements(admin, user.id)
    }
    const unlocked = canView(ent, 'hemun')
    const ai = unlocked ? (aiReport || fallbackHemunText(result)) : null
    const aiSource = !unlocked ? '未解锁'
      : aiReport ? 'AI 深度解读'
      : '规则版（AI结果未过合规校验）'

    const data = {
      male, female, result, ai, aiSource, dstNotices,
      // ★ free 层保留结构化干支事实与评分；ai 在未解锁时为 null
      free: { male, female, result },
      locked: unlocked ? null : {
        skus: ['hemun'],
        preview: '合婚双人九维深度解读（典籍干支、古法纳音、民俗生肖分级呈现）解锁后可见。'
      }
    }

    // 登录用户：报告作为账户资产自动保存（静默降级，不阻断主流程）
    const reportInput = {
      year: m.data!.year, month: m.data!.month, day: m.data!.day, gender: m.data!.gender,
      partnerYear: f.data!.year, partnerMonth: f.data!.month, partnerDay: f.data!.day, partnerGender: f.data!.gender
    }
    const reportId = await saveReport(token || undefined, {
      kind: 'hemun',
      title: deriveReportTitle('hemun', reportInput),
      input: reportInput,
      result: data
    })

    return NextResponse.json({ success: true, data, reportId })
  } catch (error) {
    console.error('合婚错误:', error)
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: `合婚失败：${msg}` }, { status: 500 })
  }
}
