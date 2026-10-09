// 流日引擎（HANDOFF-变现管道 §2.2；日运日签-设计 §3.1）
//
// ★ 同源铁律：流日【不得另造一套干支算法】（总纲 §8.5.1）。
//   paipan() 的日柱路径是：
//     Solar.fromYmdHms(…).getLunar().getEightChar().getDay()
//   liuRiOf 必须逐字走同一条 lunar-javascript 调用链。
//   「精确路径失败就回退到另一套算法/表」正是事故同族的漂移反模式，禁止。
//
// ★ 流日与流年/流月的边界差异：
//   流年、流月按【节气】换柱（JIE_BY_MONTH）；流日【不需要节气】——
//   日柱是连续的 60 甲子循环，逐日推进，故此处不接任何节气判断。
import { Solar } from 'lunar-javascript'
import type { LuckTag } from './analysis'
import { isValidZone, DEFAULT_ZONE } from './solarTime'
import { DAILY_SIGNS, DAILY_SIGN_DISCLAIMER } from '@/data/daily-signs'
import { shiShenOf } from './paipan'
import type { ShiShen } from './paipan'
import { dayBranchRelation } from './branchRelations'
import type { BranchRelation, Zhi } from './branchRelations'
import { PERSONAL_DAILY } from '@/data/daily-personal'

export interface LiuRi {
  gan: string
  zhi: string
  ganZhi: string
}

/**
 * 取公历某日的日干支。
 * 固定以正午 12:00 构造 Solar：避开子时换日边界，且与同源断言中
 * paipan({hour:12,minute:0}) 的日柱严格对应。
 */
export function liuRiOf(year: number, month: number, day: number): LiuRi {
  const solar = Solar.fromYmdHms(year, month, day, 12, 0, 0)
  const ganZhi = solar.getLunar().getEightChar().getDay()
  return { gan: ganZhi[0], zhi: ganZhi[1], ganZhi }
}

/**
 * 取某时区「当前」的归日（HANDOFF-统一晚子时 §3.2）。
 * ★ 晚子时：当地 23:00 起即算次日，与 paipan 的 setSect(1)、ziwei 的归日同一约定。
 * 返回的公历日期可直接传给 liuRiOf()。
 *
 * 职责分离：本函数只负责「归哪一天」；liuRiOf 的 12:00 固定构造不动
 *（12:00 远离 23:00 边界，取的是"某公历日的日柱"，与 sect 无关）。
 */
export function dailyDateInZone(
  zone: string,
  now: Date = new Date()
): { year: number; month: number; day: number } {
  const z = isValidZone(zone) ? zone : DEFAULT_ZONE
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: z, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit'
  }).formatToParts(now)
  const get = (t: string): number => Number(parts.find((p) => p.type === t)!.value)
  let year = get('year'), month = get('month'), day = get('day')
  const hour = get('hour') % 24   // '24' → 0：部分 ICU 实现把午夜给成 '24'，取模后环境无关
  if (hour >= 23) {
    // 用 Date.UTC 做日历日 +1（勿用毫秒+86400000，跨 DST 会错）
    const t = new Date(Date.UTC(year, month - 1, day + 1))
    year = t.getUTCFullYear(); month = t.getUTCMonth() + 1; day = t.getUTCDate()
  }
  return { year, month, day }
}

/**
 * 日运允许使用的运势词（刻意限制，§2.2）。
 * LuckTag 本已无大吉/大凶；但日运只允许前四个、【排除「大防」】——
 * 流日在命理层级（大运>流年>流月>流日）中最弱最无凭，
 * 连「大防」这样偏重的提醒都不允许出现，只做轻量自省。
 * 后人若往此数组加「大防」，验收断言立即翻红。
 */
export const DAILY_TAGS: ReadonlyArray<LuckTag> = ['较宜', '平顺', '一般', '宜慎']

// 六十甲子标准序（日签卡片展示「六十甲子第 N 位」用，序号有据可查，§8.6.2）
// ★ 日签数据/断言以本表为唯一事实源，禁止在测试或数据文件里另抄一份（HANDOFF-通用日签 §2.1）
export const JIAZI = [
  '甲子','乙丑','丙寅','丁卯','戊辰','己巳','庚午','辛未','壬申','癸酉',
  '甲戌','乙亥','丙子','丁丑','戊寅','己卯','庚辰','辛巳','壬午','癸未',
  '甲申','乙酉','丙戌','丁亥','戊子','己丑','庚寅','辛卯','壬辰','癸巳',
  '甲午','乙未','丙申','丁酉','戊戌','己亥','庚子','辛丑','壬寅','癸卯',
  '甲辰','乙巳','丙午','丁未','戊申','己酉','庚戌','辛亥','壬子','癸丑',
  '甲寅','乙卯','丙辰','丁巳','戊午','己未','庚申','辛酉','壬戌','癸亥'
] as const

/** 干支在六十甲子中的位次（1–60）；非法干支抛错（不静默回退） */
export function jiaziIndex(ganZhi: string): number {
  const i = JIAZI.indexOf(ganZhi as (typeof JIAZI)[number])
  if (i < 0) throw new Error(`非法干支：${ganZhi}`)
  return i + 1
}

/**
 * 取当日日签（通用日签，免费获客层；静态文案，零 AI／零 IO）。
 * @param ganZhi    当日日干支（来自 liuRiOf，调用方不得自算）
 * @param dayNumber 自 1970-01-01 起的天数（Math.floor(Date.UTC(y,m-1,d)/86400000)）
 *
 * ★ 确定性：只依赖这两个入参，同一天对所有用户恒为同一条，不随机、不随刷新变化。
 * ★ 跨周期轮换：变体序号 = floor(dayNumber / 60) % 3 ——
 *   每过一个完整 60 甲子周期换下一种角度（意象/处事/心绪），第 2、3 周期不重复。
 * ★ 缺键显式抛错，不静默兜底（与 liuRiOf/jiaziIndex 同原则，§8.5.1）。
 */
export function pickDailySign(ganZhi: string, dayNumber: number): string {
  const trio = DAILY_SIGNS[ganZhi]
  if (!trio) throw new Error(`日签缺该甲子：${ganZhi}`)
  return pickVariant(trio, dayNumber)
}

/** 3 变体轮换：每过 60 天换一种角度（意象/处事/心绪），确定性、不随机。日签与日运共用，不复制第二份（HANDOFF-个性化日运 §4.2）。 */
export function pickVariant<T>(trio: readonly [T, T, T], dayNumber: number): T {
  return trio[Math.floor(dayNumber / 60) % 3]
}

/** 通用日签视图（/api/daily 与 /daily 页面共用，禁止两处各算一遍） */
export interface DailySignView {
  date: string
  zone: string
  liuRi: string
  jiaziIndex: number
  sign: string
  disclaimer: string
}

/**
 * 组装当日通用日签。
 * @param zoneInput 原始时区入参；非法/空一律降级 DEFAULT_ZONE（不抛错）
 * @param now 可注入时刻（测试/快照用），默认当前
 */
export function dailySignFor(
  zoneInput: string | null | undefined,
  now: Date = new Date()
): DailySignView {
  const zone = isValidZone(zoneInput ?? '') ? (zoneInput as string) : DEFAULT_ZONE
  // ★ 归日只走 dailyDateInZone（晚子时 23:00 已内建）
  const { year, month, day } = dailyDateInZone(zone, now)
  const ganZhi = liuRiOf(year, month, day).ganZhi
  const dayNumber = Math.floor(Date.UTC(year, month - 1, day) / 86400000)
  return {
    date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    zone,
    liuRi: ganZhi,
    jiaziIndex: jiaziIndex(ganZhi),
    sign: pickDailySign(ganZhi, dayNumber),
    disclaimer: DAILY_SIGN_DISCLAIMER,
  }
}

/**
 * 一次归日 → 通用日签 ＋ 个性化日运（HANDOFF-个性化日运 §五 P0）。
 * ★ 日签段与日运段出自【同一次】 dailyDateInZone + liuRiOf，
 *   不得各自算一遍（事故 32/34 同族）。personalDailyFor 只接收已算好的 liuRi。
 * @param chart 用户命盘事实集；null/缺盘时只返回 general（personal=null）
 */
export function dailyFor(
  zoneInput: string | null | undefined,
  chart: DailyChartFacts | null,
  now: Date = new Date()
): { general: DailySignView; personal: PersonalDailyView | null } {
  const zone = isValidZone(zoneInput ?? '') ? (zoneInput as string) : DEFAULT_ZONE
  // ★ 归日只走 dailyDateInZone（晚子时 23:00 已内建）—— 一次
  const { year, month, day } = dailyDateInZone(zone, now)
  const liuRi = liuRiOf(year, month, day)
  const dayNumber = Math.floor(Date.UTC(year, month - 1, day) / 86400000)
  const general: DailySignView = {
    date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    zone,
    liuRi: liuRi.ganZhi,
    jiaziIndex: jiaziIndex(liuRi.ganZhi),
    sign: pickDailySign(liuRi.ganZhi, dayNumber),
    disclaimer: DAILY_SIGN_DISCLAIMER,
  }
  const personal = chart ? personalDailyFor(liuRi, dayNumber, chart) : null
  return { general, personal }
}

// ──────────────────────────────────────────────────────────────
// 个性化日运（订阅权益 daily；HANDOFF-个性化日运 §五／§六）
//
// ★ P0 归日同源（§五）：日签段与日运段必须出自【同一次归日】。
//   本函数的入参 liuRi / dayNumber 由调用方（api/daily）用同一次
//   dailyDateInZone + liuRiOf 算好后传入 —— 本函数绝不自己再算一遍归日。
//   牙口：把归日改成自己算（民用日 00:00）→ 跨模块归日一致断言翻红。
// ──────────────────────────────────────────────────────────────

/** 十神→白话依据（「你生者／克你者…，同/异性」；§6.1） */
const SHI_SHEN_BASIS: Record<ShiShen, string> = {
  比肩: '与你同气，同性',
  劫财: '与你同气，异性',
  食神: '你生者，同性',
  伤官: '你生者，异性',
  偏财: '你克者，同性',
  正财: '你克者，异性',
  七杀: '克你者，同性',
  正官: '克你者，异性',
  偏印: '生你者，同性',
  正印: '生你者，异性',
}

/** 关系→白话注解（古典名紧跟白话，非吉凶；§1.4-②） */
const RELATION_BASIS: Record<BranchRelation, string> = {
  同: '今日日支与你日支相同（同类叠加，非吉凶）',
  冲: '今日日支与你日支相冲（古法名；指有推动也有拉扯，非吉凶）',
  合: '今日日支与你日支相合（古法名；指牵合亲近，非吉凶）',
  刑: '今日日支与你日支相刑（古法名；指明面纠葛反复，非吉凶）',
  害: '今日日支与你日支相害（古法名；指不显的消耗，非吉凶）',
  无: '今日日支与你日支无特殊牵动（平顺，非吉凶）',
}

/**
 * 依据层级（§2.3-4：古法／通行做法／产品设定，不得混同）。
 * ★ 巳申既合又刑、寅巳既刑又害 —— 这两处须如实标「产品设定」，
 *   不得把我们的取值规则说成古法。
 */
function relationBasisLevel(todayZhi: Zhi, dayZhi: Zhi, rel: BranchRelation): string {
  const pair =
    (todayZhi === '巳' && dayZhi === '申') || (todayZhi === '申' && dayZhi === '巳')
  if (pair && (rel === '合' || rel === '刑')) {
    return '古法（据《五行大义·论刑》：巳申既合又刑，两者同时存在）＋ 产品设定（并见时按你的局取主导）'
  }
  const pairYinSi =
    (todayZhi === '寅' && dayZhi === '巳') || (todayZhi === '巳' && dayZhi === '寅')
  if (pairYinSi) {
    return '古法（相刑／相害的对应）＋ 产品设定（刑害并见取刑）'
  }
  return '古法（十神与日支关系的对应）'
}

/** 用户命盘的最小事实集（个性化日运所需；从已保存的 chart_data 取） */
export interface DailyChartFacts {
  dayMaster: string
  dayZhi: Zhi
  /** 全四支（年/月/日/时）—— 并见时按局取用，不只看日支（§2.3-2①） */
  allZhi: readonly Zhi[]
}

/** 个性化日运视图（personal 段；§6.1） */
export interface PersonalDailyView {
  dayMaster: string
  todayGan: string
  todayZhi: string
  shiShen: ShiShen
  shiShenBasis: string
  branchRelation: BranchRelation
  relationBasis: string
  sign: string
  basisLevel: string
}

/**
 * 取当日个性化日运。
 * ★ liuRi / dayNumber 必须与通用日签段同源（同一次归日），由调用方传入。
 * ★ 十神判定复用 paipan.shiShenOf；日支关系复用 branchRelations.dayBranchRelation，
 *   绝不另写（§3.1／§二）。文案为静态资产 PERSONAL_DAILY，零 AI／零 IO。
 */
export function personalDailyFor(
  liuRi: { gan: string; zhi: string; ganZhi: string },
  dayNumber: number,
  chart: DailyChartFacts
): PersonalDailyView {
  const shiShen = shiShenOf(liuRi.gan, chart.dayMaster)
  const rel = dayBranchRelation(liuRi.zhi as Zhi, {
    dayZhi: chart.dayZhi,
    allZhi: chart.allZhi,
  })
  const trio = PERSONAL_DAILY[shiShen]?.[rel]
  if (!trio) throw new Error(`个性化日运缺键：${shiShen}×${rel}`)
  return {
    dayMaster: chart.dayMaster,
    todayGan: liuRi.gan,
    todayZhi: liuRi.zhi,
    shiShen,
    shiShenBasis: SHI_SHEN_BASIS[shiShen],
    branchRelation: rel,
    relationBasis: RELATION_BASIS[rel],
    sign: pickVariant(trio as readonly [string, string, string], dayNumber),
    basisLevel: relationBasisLevel(liuRi.zhi as Zhi, chart.dayZhi, rel),
  }
}
