import { NextRequest, NextResponse } from 'next/server'
import { paipanZiwei, analyzeZiwei } from '@/lib/ziwei'
import { generateAIZiwei, fallbackZiweiText } from '@/lib/aiZiwei'
import { checkDSTTransition } from '@/lib/solarTime'
import { resolveBirthFromBody } from '@/lib/birthRequest'
import { getEntitlements, canView, EMPTY_ENTITLEMENTS } from '@/lib/entitlement'
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

    // 出生地：城市 id / 旧版城市名 / 手动时区；共用 birthRequest 解析
    const birth = await resolveBirthFromBody(
      { year, month, day, hour, minute },
      body
    )
    if (birth.error) {
      return NextResponse.json({ error: birth.error }, { status: 400 })
    }
    const { ref, city } = birth.data!

    // 排盘 → 规则分析 → AI 解读（失败回退规则版）
    const chart = paipanZiwei({
      year, month, day, hour, minute, gender,
      birthLng: ref?.lng,
      birthZone: ref?.zone
    })
    const analysis = analyzeZiwei(chart, new Date())
    const aiReport = await generateAIZiwei(chart, analysis)

    // ★ 门禁判定统一走 entitlement（§8.5.1）
    const token = typeof body.token === 'string' ? body.token : ''
    let ent = EMPTY_ENTITLEMENTS
    if (token) {
      const admin = createServerSupabase()
      const { data: { user } } = await admin.auth.getUser(token)
      if (user) ent = await getEntitlements(admin, user.id)
    }
    const unlocked = canView(ent, 'ziwei_deep')
    const ai = unlocked ? (aiReport || fallbackZiweiText(chart, analysis)) : null
    const aiSource = !unlocked ? '未解锁'
      : aiReport ? 'AI 深度解读'
      : '规则版（AI结果未过合规校验）'
    const dstNotice = ref ? checkDSTTransition(ref.zone, { year, month, day, hour, minute }) : null

    return NextResponse.json({
      success: true,
      data: {
        chart,
        analysis,
        // ★ free 层保留结构化星盘数据；ai 在未解锁时为 null
        free: { chart, analysis },
        locked: unlocked ? null : {
          skus: ['ziwei_deep'],
          preview: '紫微十二宫深度解读（命格总论、事业、财运、感情、健康、大限流年）解锁后可见。'
        },
        ai,
        aiSource,
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
    console.error('紫微排盘错误:', error)
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: `紫微排盘失败：${msg}` },
      { status: 500 }
    )
  }
}
