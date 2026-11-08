// 追问命盘装配：把各报告页的数据整理成 /api/ask 需要的命盘/上下文。
// ★ 只做字段搬运与补全，不改额度、不改报告内容。
import type { AnalyzableChart } from './analysis'
import type { PaipanResult } from './paipan'
import type { AskContext } from './aiAsk'
import type { ZiweiAIReport } from './aiZiwei'

/** 方位报告：chart 由 /api/geo 下发（已含 geJu）；缺盘时不渲染追问入口 */
export function geoAskChart(data: { chart?: AnalyzableChart }): AnalyzableChart | null {
  return data.chart ?? null
}

export interface LiunianAskSource {
  input: { year: number; month: number; day: number; hour: number; minute: number; gender: 1 | 0 }
  pillars: PaipanResult['pillars']
  dayMaster: string
  taiYuan: string
  mingGong: string
  lunarDate?: string
  wangShuai: string
  geJu: string
  daYun?: PaipanResult['daYun']
}

/** 年运报告：报告本身只存结构化岁运事实，这里补成追问可用的八字盘（含 daYun） */
export function liunianAskChart(data: LiunianAskSource): AnalyzableChart | null {
  if (!data.daYun || data.daYun.length === 0) return null
  return {
    input: data.input,
    timezoneOffsetApplied: 0,
    lunarDate: data.lunarDate ?? '',
    pillars: data.pillars,
    dayMaster: data.dayMaster,
    taiYuan: data.taiYuan,
    mingGong: data.mingGong,
    shenGong: '',
    qiYun: '',
    daYun: data.daYun,
    analysis: { wangShuai: data.wangShuai, geJu: data.geJu, isPaid: false },
  }
}

export interface ZiweiAskSource {
  chart: unknown
  analysis?: unknown
  ai?: ZiweiAIReport | null
}

const ZIWEI_REPORT_KEYS: Array<keyof ZiweiAIReport> = [
  'overview', 'palaces', 'transforms', 'decadal', 'yearly', 'advice',
  'career', 'wealth', 'marriage', 'health', 'patterns', 'personality',
]

/**
 * 紫微追问上下文：十二宫/主星亮度/四化/大限流年都在 chart+analysis 里，
 * 另附该报告已生成的正文摘要，让追问能承接报告、按紫微口径作答。
 */
export function ziweiAskContext(data: ZiweiAskSource): AskContext {
  const ai = data.ai ?? null
  const report = ai
    ? ZIWEI_REPORT_KEYS
      .map((k) => (typeof ai[k] === 'string' ? ai[k].slice(0, 700) : ''))
      .filter(Boolean)
      .join('\n\n')
      .slice(0, 5000)
    : ''
  return { kind: 'ziwei', chart: data.chart, analysis: data.analysis, report }
}

// ─────────────────────────────────────────────────────────────
// 旧紫微报告补算追问用八字盘（2026-11-08）
// ★ 线上存量紫微报告的 result 没有 baziChart，导致 AskPanel 根本不挂载。
//   这里从报告里已存的紫微盘 input 取出生参数，调 /api/paipan（纯排盘、无 AI、无费用）
//   补出同一张八字盘；只为追问提供事实，不解锁、不复制报告正文。
// ─────────────────────────────────────────────────────────────
export interface AskBaziSource {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  gender: 1 | 0
  birthLng?: number | null
  birthZone?: string | null
  timezoneOffset?: number | null
}

/** 从紫微盘（ZwChart）提取排盘参数；旧行缺出生地时用已应用的时区偏移兜底。 */
export function askBaziSourceFrom(chart: unknown): AskBaziSource | null {
  if (!chart || typeof chart !== 'object') return null
  const c = chart as { input?: Record<string, unknown>; timezoneOffsetApplied?: unknown }
  const i = c.input
  if (!i) return null
  const num = (v: unknown): number | null => {
    const n = typeof v === 'number' ? v : Number(v)
    return Number.isFinite(n) ? n : null
  }
  const year = num(i.year)
  const month = num(i.month)
  const day = num(i.day)
  const hour = num(i.hour)
  const minute = num(i.minute)
  if (year === null || month === null || day === null || hour === null || minute === null) return null
  const gender: 1 | 0 = Number(i.gender) === 1 ? 1 : 0
  const lng = num(i.birthLng)
  const zone = typeof i.birthZone === 'string' && i.birthZone ? i.birthZone : null
  const tz = num(c.timezoneOffsetApplied)
  return {
    year, month, day, hour, minute, gender,
    birthLng: lng,
    birthZone: zone,
    // 优先出生地（时区+经度）重现真太阳时；缺出生地时用紫微盘已应用的偏移
    timezoneOffset: zone ? null : tz,
  }
}

/** 调 /api/paipan 补算追问盘；失败返回 null（入口交给 AskPanel 的「缺盘」态）。 */
export async function fetchAskBaziChart(src: AskBaziSource): Promise<AnalyzableChart | null> {
  try {
    const body: Record<string, unknown> = {
      year: src.year, month: src.month, day: src.day,
      hour: src.hour, minute: src.minute, gender: src.gender,
    }
    if (src.birthZone) body.birthZone = src.birthZone
    if (src.birthLng !== null && src.birthLng !== undefined) body.birthLng = src.birthLng
    if (!src.birthZone && src.timezoneOffset !== null && src.timezoneOffset !== undefined) {
      body.timezoneOffset = src.timezoneOffset
    }
    const res = await fetch('/api/paipan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) return null
    const json = await res.json().catch(() => null)
    const d = (json as { data?: AnalyzableChart } | null)?.data
    if (!d || !d.pillars || !Array.isArray(d.daYun) || !d.analysis) return null
    return d
  } catch {
    return null
  }
}
