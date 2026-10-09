// 排盘核心引擎 - 基于 lunar-javascript
import { Lunar, Solar } from 'lunar-javascript'
import { trueSolarOffsetMinutes, DEFAULT_ZONE } from './solarTime'

export interface PaipanInput {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  gender: 1 | 0 // 1男 0女
  timezoneOffset?: number // 显式真太阳时偏移（分钟），优先级最高；缺省按 birthLng/birthZone 计算
  birthLng?: number // 出生地经度（如 -74.0）
  birthZone?: string // 出生地 IANA 时区（如 America/New_York），缺省 Asia/Shanghai
}

export interface Pillar {
  gan: string
  zhi: string
  ganZhi: string
  tenGodGan: string
  cangGan: string[]
  tenGodCangGan: string[]
}

export interface PaipanResult {
  input: PaipanInput
  timezoneOffsetApplied: number // 实际生效的真太阳时偏移（分钟）
  lunarDate: string
  pillars: {
    year: Pillar
    month: Pillar
    day: Pillar
    hour: Pillar
  }
  dayMaster: string
  taiYuan: string
  mingGong: string
  shenGong: string
  qiYun: string
  daYun: Array<{
    ganZhi: string
    startAge: number
    startYear: number
    endYear: number
  }>
}

// 十神（今日日干对日主的十神判定；HANDOFF-个性化日运 §3.1）
// ★ 这是全产品十神判定的唯一事实源 —— 个性化日运等模块复用此表，
//   不得另抄第二份（§8.5.1）。analysis.ts 原有的同内容 SHI_SHEN 已改为从此 import。
export type ShiShen =
  | '比肩' | '劫财' | '食神' | '伤官' | '偏财'
  | '正财' | '七杀' | '正官' | '偏印' | '正印'

/** 十神全集（键序固定，daily-personal.ts 的 Record 键以此为准） */
export const SHI_SHEN_NAMES: readonly ShiShen[] = [
  '比肩', '劫财', '食神', '伤官', '偏财',
  '正财', '七杀', '正官', '偏印', '正印'
]

// 十神表
export const SHI_SHEN: Record<string, Record<string, ShiShen>> = {
  '甲': { '甲': '比肩', '乙': '劫财', '丙': '食神', '丁': '伤官', '戊': '偏财', '己': '正财', '庚': '七杀', '辛': '正官', '壬': '偏印', '癸': '正印' },
  '乙': { '甲': '劫财', '乙': '比肩', '丙': '伤官', '丁': '食神', '戊': '正财', '己': '偏财', '庚': '正官', '辛': '七杀', '壬': '正印', '癸': '偏印' },
  '丙': { '甲': '偏印', '乙': '正印', '丙': '比肩', '丁': '劫财', '戊': '食神', '己': '伤官', '庚': '偏财', '辛': '正财', '壬': '七杀', '癸': '正官' },
  '丁': { '甲': '正印', '乙': '偏印', '丙': '劫财', '丁': '比肩', '戊': '伤官', '己': '食神', '庚': '正财', '辛': '偏财', '壬': '正官', '癸': '七杀' },
  '戊': { '甲': '七杀', '乙': '正官', '丙': '偏印', '丁': '正印', '戊': '比肩', '己': '劫财', '庚': '食神', '辛': '伤官', '壬': '偏财', '癸': '正财' },
  '己': { '甲': '正官', '乙': '七杀', '丙': '正印', '丁': '偏印', '戊': '劫财', '己': '比肩', '庚': '伤官', '辛': '食神', '壬': '正财', '癸': '偏财' },
  '庚': { '甲': '偏财', '乙': '正财', '丙': '七杀', '丁': '正官', '戊': '偏印', '己': '正印', '庚': '比肩', '辛': '劫财', '壬': '食神', '癸': '伤官' },
  '辛': { '甲': '正财', '乙': '偏财', '丙': '正官', '丁': '七杀', '戊': '正印', '己': '偏印', '庚': '劫财', '辛': '比肩', '壬': '伤官', '癸': '食神' },
  '壬': { '甲': '食神', '乙': '伤官', '丙': '偏财', '丁': '正财', '戊': '七杀', '己': '正官', '庚': '偏印', '辛': '正印', '壬': '比肩', '癸': '劫财' },
  '癸': { '甲': '伤官', '乙': '食神', '丙': '正财', '丁': '偏财', '戊': '正官', '己': '七杀', '庚': '正印', '辛': '偏印', '壬': '劫财', '癸': '比肩' }
}

/**
 * 取某天干对日主的十神（个性化日运等模块复用，不得另写一份）。
 * 非法日主/天干显式抛错（不静默回退，§8.5.1）。
 */
export function shiShenOf(gan: string, dayMaster: string): ShiShen {
  const row = SHI_SHEN[dayMaster]
  if (!row) throw new Error(`非法日主：${dayMaster}`)
  const v = row[gan]
  if (!v) throw new Error(`非法天干：${gan}`)
  return v
}

// 藏干表
const CANG_GAN: Record<string, string[]> = {
  '子': ['癸'], '丑': ['己', '癸', '辛'], '寅': ['甲', '丙', '戊'], '卯': ['乙'],
  '辰': ['戊', '乙', '癸'], '巳': ['丙', '庚', '戊'], '午': ['丁', '己'], '未': ['己', '丁', '乙'],
  '申': ['庚', '壬', '戊'], '酉': ['辛'], '戌': ['戊', '辛', '丁'], '亥': ['壬', '甲']
}

export function paipan(input: PaipanInput): PaipanResult {
  const { year, month, day, hour, minute, gender } = input

  // 真太阳时偏移：显式分钟偏移优先；否则由出生地经度 + IANA 时区（tzdata 历史偏移）计算。
  // 用户只填钟表时间，DST 由软件根据时区与日期自动判定
  let timezoneOffset = 0
  if (input.timezoneOffset !== undefined) {
    timezoneOffset = input.timezoneOffset
  } else if (input.birthLng !== undefined) {
    timezoneOffset = trueSolarOffsetMinutes(
      input.birthLng, input.birthZone || DEFAULT_ZONE, { year, month, day, hour, minute }
    )
  }

  // 创建阳历对象（按真太阳时偏移校正后定时辰/日期）
  const base = new Date(year, month - 1, day, hour, minute, 0)
  const adjusted = timezoneOffset ? new Date(base.getTime() + timezoneOffset * 60000) : base
  const solar = Solar.fromYmdHms(
    adjusted.getFullYear(), adjusted.getMonth() + 1, adjusted.getDate(),
    adjusted.getHours(), adjusted.getMinutes(), 0
  )
  const lunar = solar.getLunar()
  const eightChar = lunar.getEightChar()

  // ★ 换日约定（2026-10-07 拍板，P0 修复；见 docs/交接记录/13-日运日签/P0-子时换日四柱矛盾.md）：
  //   采【晚子时】——23:00 起日柱即换次日。setSect(1) 使 getDay() 走 Exact 变体（23:00 换日），
  //   与 getTime()（其内部时干本就按晚子时日干推）统一，四柱满足五鼠遁自洽。
  //   库默认 sect=2：getDay() 走民用日 00:00，而 getTime() 走 23:00 → 23:00–24:00 日柱时柱矛盾。
  //   年柱(立春)/月柱(节气)两 sect 相同，起运 getYun 的 sect 由独立参数传入，均不受影响。
  eightChar.setSect(1)

  // 四柱（用EightChar对象，晚子时等边界处理更准确）
  const yearPillar = eightChar.getYear()
  const monthPillar = eightChar.getMonth()
  const dayPillar = eightChar.getDay()
  const hourPillar = eightChar.getTime()
  
  // 日主
  const dayMaster = dayPillar[0]
  
  // 构建单柱
  const buildPillar = (ganZhi: string): Pillar => {
    const gan = ganZhi[0]
    const zhi = ganZhi[1]
    const cangGanList = CANG_GAN[zhi] || []
    return {
      gan,
      zhi,
      ganZhi,
      tenGodGan: SHI_SHEN[dayMaster]?.[gan] || '',
      cangGan: cangGanList,
      tenGodCangGan: cangGanList.map(g => SHI_SHEN[dayMaster]?.[g] || '')
    }
  }
  
  // 大运（ getYun参数为性别：1男 0女）
  const yun = eightChar.getYun(gender === 1 ? 1 : 0)
  const daYunList = yun.getDaYun()
  const daYun = daYunList
    .map((dy: any) => ({
      ganZhi: dy.getGanZhi(),
      startAge: dy.getStartAge(),
      startYear: dy.getStartYear(),
      endYear: dy.getEndYear()
    }))
    // 过滤掉起运前的空白大运（ganZhi为空）
    .filter(dy => dy.ganZhi && dy.ganZhi.length === 2)
  
  // 胎元、命宫、身宫（八字对象提供）
  const taiYuan = eightChar.getTaiYuan()
  const mingGong = eightChar.getMingGong()
  const shenGong = eightChar.getShenGong()
  
  // 起运时间
  const qiYun = `${yun.getStartYear()}年${yun.getStartMonth()}月${yun.getStartDay()}天后起运`
  
  return {
    input,
    timezoneOffsetApplied: timezoneOffset,
    lunarDate: lunar.toFullString(),
    pillars: {
      year: buildPillar(yearPillar),
      month: buildPillar(monthPillar),
      day: buildPillar(dayPillar),
      hour: buildPillar(hourPillar)
    },
    dayMaster,
    taiYuan,
    mingGong,
    shenGong,
    qiYun,
    daYun
  }
}

// 通根权重表：日干 -> 地支 -> 权重
// 帝旺(刃)=4, 临官(禄)=3, 长生=2, 墓库=1.5, 余气=1
const TONG_GEN_WEIGHT: Record<string, Record<string, number>> = {
  '甲': { '卯': 4, '寅': 3, '亥': 2, '未': 1.5, '辰': 1, '丑': 1 },
  '乙': { '寅': 4, '卯': 3, '午': 2, '戌': 1.5, '未': 1, '辰': 1 },
  '丙': { '午': 4, '巳': 3, '寅': 2, '戌': 1.5, '未': 1 },
  '丁': { '巳': 4, '午': 3, '酉': 2, '丑': 1.5, '戌': 1 },
  '戊': { '午': 4, '巳': 3, '寅': 2, '戌': 1.5, '未': 1, '辰': 1, '丑': 1 },
  '己': { '巳': 4, '午': 3, '酉': 2, '丑': 1.5, '戌': 1, '未': 1, '辰': 1 },
  '庚': { '酉': 4, '申': 3, '巳': 2, '丑': 1.5, '辰': 1, '戌': 1 },
  '辛': { '申': 4, '酉': 3, '子': 2, '辰': 1.5, '丑': 1, '戌': 1 },
  '壬': { '子': 4, '亥': 3, '申': 2, '辰': 1.5, '丑': 1 },
  '癸': { '亥': 4, '子': 3, '卯': 2, '未': 1.5, '辰': 1, '丑': 1 }
}

// 旺衰判断：综合得令、得地（通根）、得势（天干印比）
export function getWangShuai(chart: PaipanResult): string {
  const dayMaster = chart.dayMaster

  // 得令：月令通根权重 >= 2 为得令
  const monthZhi = chart.pillars.month.zhi
  const monthWeight = TONG_GEN_WEIGHT[dayMaster]?.[monthZhi] || 0
  const isLing = monthWeight >= 2

  // 得地：地支通根权重之和
  const allZhi = [chart.pillars.year.zhi, chart.pillars.month.zhi, chart.pillars.day.zhi, chart.pillars.hour.zhi]
  const diScore = allZhi.reduce((sum, z) => sum + (TONG_GEN_WEIGHT[dayMaster]?.[z] || 0), 0)

  // 得势：天干印比数量（不含日主）
  const ganList = [chart.pillars.year.gan, chart.pillars.month.gan, chart.pillars.hour.gan]
  const yinBiCount = ganList.filter(g => {
    const tenGod = SHI_SHEN[dayMaster]?.[g]
    return ['正印', '偏印', '比肩', '劫财'].includes(tenGod)
  }).length

  // 综合判断
  if (isLing && diScore >= 6 && yinBiCount >= 2) return '身旺'
  if (isLing || diScore >= 6 || (diScore >= 4 && yinBiCount >= 2)) return '身强'
  if (diScore >= 3 || yinBiCount >= 2) return '身弱有救'
  return '身弱'
}

// 格局简判
export function getGeJu(chart: PaipanResult): string {
  const monthZhi = chart.pillars.month.zhi
  const cangGan = CANG_GAN[monthZhi] || []
  const benQi = cangGan[0] // 本气
  const dayMaster = chart.dayMaster
  
  // 检查透干
  const allGan = [
    chart.pillars.year.gan,
    chart.pillars.month.gan,
    chart.pillars.hour.gan
  ]
  
  const touGan = cangGan.find(g => allGan.includes(g))
  const geShen = touGan || benQi
  
  const tenGod = SHI_SHEN[dayMaster]?.[geShen] || ''
  
  const geJuMap: Record<string, string> = {
    '正官': '正官格', '七杀': '七杀格',
    '正财': '正财格', '偏财': '偏财格',
    '正印': '正印格', '偏印': '偏印格',
    '食神': '食神格', '伤官': '伤官格'
  }
  
  return geJuMap[tenGod] || '普通格局'
}
