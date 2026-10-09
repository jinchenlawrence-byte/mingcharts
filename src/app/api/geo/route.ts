import { NextRequest, NextResponse } from 'next/server'
import { paipan, getWangShuai } from '@/lib/paipan'
import { analyzeGeo } from '@/lib/geo'
import citiesData from '@/data/geo-cities.json'
import { checkDSTTransition } from '@/lib/solarTime'
import { resolveBirthFromBody } from '@/lib/birthRequest'
import { findCityById } from '@/lib/worldCitiesServer'
import { generateAIGeo, fallbackGeoText } from '@/lib/aiGeo'
import { tiaoHouWuxing } from '@/lib/analysis'
import type { WX } from '@/lib/geo'

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

    // 出生地：城市 id / 旧版城市名 / 手动时区（含进阶经度）；与其它入口共用同一解析
    const birth = await resolveBirthFromBody(
      { year, month, day, hour, minute },
      body
    )
    if (birth.error) {
      return NextResponse.json({ error: birth.error }, { status: 400 })
    }
    const { ref, city } = birth.data!

    // 排盘 → 旺衰（地理分析的喜忌基准）；偏移在 paipan 内按 tzdata 历史值计算
    const chart = paipan({
      year, month, day, hour, minute, gender,
      birthLng: ref?.lng,
      birthZone: ref?.zone
    })
    const wangShuai = getWangShuai(chart)

    // 夏令时切换点检测（gap/重复时刻），仅作提示
    const dstNotice = ref ? checkDSTTransition(ref.zone, { year, month, day, hour, minute }) : null

    // 相对方位：仅当选中具体城市时有意义（仅时区无坐标，不做方位分析；但真太阳时仍校正）
    const birthplace = city

    // 现居城市（可选；评估当前居住地影响）。
    //   新路径：currentCityId → 全球库（3.2 万城，前端搜索选择）；
    //   兼容旧客户端：currentCity 名称 → 旧推荐库精确匹配。
    let currentCity: { name: string; lat: number; lng: number } | null = null
    const currentCityId = typeof body.currentCityId === 'string' ? body.currentCityId.trim() : ''
    if (currentCityId) {
      const c = await findCityById(currentCityId)
      if (c) currentCity = { name: c.name, lat: c.lat, lng: c.lng }
    } else {
      const currentName = typeof body.currentCity === 'string' ? body.currentCity.trim() : ''
      const currentRef =
        (citiesData as unknown as Array<{ name: string; lat: number; lng: number }>).find(
          (c) => c.name === currentName
        )
      if (currentRef) currentCity = { name: currentRef.name, lat: currentRef.lat, lng: currentRef.lng }
    }

    // 规则引擎 → AI 解读（失败回退规则版）
    const analysis = analyzeGeo({
      dayMaster: chart.dayMaster,
      wangShuai,
      // 调候用神五行（《穷通宝鉴》）：月令 → 气候之药，参与城市评分
      tiaoHou: tiaoHouWuxing(chart.dayMaster, chart.pillars.month.zhi) as WX[],
      birthplace,
      currentCity
    })
    const aiReport = await generateAIGeo(analysis)
    const ai = aiReport || fallbackGeoText(analysis)
    const aiSource = aiReport ? 'AI 深度解读' : '规则版（AI暂不可用）'

    return NextResponse.json({
      success: true,
      data: {
        chart: { ...chart, analysis: { wangShuai, isPaid: false } },
        geo: analysis,
        // §1.5 geo 为「试吃」模块，不设门禁：免费层全量开放，无锁定内容
        free: {
          chart: { ...chart, analysis: { wangShuai, isPaid: false } },
          geo: analysis
        },
        locked: null,
        trueSolar: ref
          ? {
              birthplace: city?.name || null,
              lng: ref.lng,
              zone: ref.zone,
              offsetMin: chart.timezoneOffsetApplied,
              dstNotice: dstNotice?.message || null
            }
          : null,
        ai,
        aiSource
      }
    })
  } catch (error) {
    console.error('地理位置解析错误:', error)
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: `地理位置解析失败：${msg}` },
      { status: 500 }
    )
  }
}
