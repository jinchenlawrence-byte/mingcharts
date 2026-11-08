// 年运报告免费分层（2026-11-09 用户口径）
//
// 规矩：
//   · 免费版只开放【已经过去的年份】的规则版内容；今年、明年、后年以及更远的未来一律锁定。
//   · 流月只给【已经过去的月份】；当月与未来月份锁定。
//   · 「过去/当年/未来」一律按用户所在时区判断（默认 Asia/Shanghai），
//     绝不用 UTC 日期直接比较 —— 东八区晚间会比 UTC 早一天，跨年/跨月会错位。
import { DEFAULT_ZONE, isValidZone } from './solarTime'
import { toHant } from './hant'

/** 当前时区的年月（非法/空时区降级 Asia/Shanghai，不抛错） */
export function zonedNow(
  zoneInput?: string | null,
  now: Date = new Date()
): { year: number; month: number } {
  const zone = isValidZone(zoneInput ?? '') ? (zoneInput as string) : DEFAULT_ZONE
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: zone,
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(now)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
  return { year: parseInt(get('year'), 10), month: parseInt(get('month'), 10) }
}

/**
 * 免费层可见性：
 *   · year < 现在年 → 开放（已过去的年份全部开放）
 *   · year > 现在年 → 锁定
 *   · 当年：整年分析锁定；流月只在 month < 现在月 时开放（已过去的整月）
 */
export function annualFreeVisible(
  now: { year: number; month: number },
  year: number,
  month?: number
): boolean {
  if (year < now.year) return true
  if (year > now.year) return false
  if (month === undefined) return false
  return month < now.month
}

/** 付费后可见的范围文案（模块页与详情页同源；写清年份与流月，不用「解锁更多」） */
export function annualLockedPreviewOf(opts: {
  nowYear: number
  targetYear: number
  targetGanZhi: string
  future: Array<{ year: number; ganZhi: string }>
  lang: 'zh-Hans' | 'zh-Hant' | 'en'
}): string {
  const { nowYear, targetYear, targetGanZhi, future, lang } = opts
  const upcoming = future.filter((y) => y.year >= nowYear).slice(0, 3)
  const years = upcoming.length > 0
    ? upcoming.map((y) => `${y.year}（${y.ganZhi}）`).join('、')
    : `${targetYear}（${targetGanZhi}）`
  if (lang === 'en') {
    return `Free access covers past years only. The paid report adds the full readings for ${upcoming.map((y) => y.year).join(', ') || targetYear} (annual pillar, Ten Gods, career, wealth, relationships, health, all six in-depth modules) and the monthly rhythm for the current month onward — each month's pillar, solar-term boundary and guidance.`
  }
  const text = `免费只开放已经过去的年份。付费后可见：${years} 年的整年详批（流年干支、十神主事、事业/财运/感情/健康与 AI 深度解读 6 个模块），以及当年当月起的逐月节奏（各月干支、节气换月与宜忌判读）。`
  return lang === 'zh-Hant' ? toHant(text) : text
}
