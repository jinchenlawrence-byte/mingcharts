/**
 * 真太阳时校正（支持全球时区）
 *
 * 公式：
 *   真太阳时 = 当地钟表时刻 + (出生地经度 − 当地【当时】实际UTC偏移小时 × 15) × 4 分钟
 * 「当时实际偏移」必须取 IANA 时区库（tzdata）的历史值——夏令时规则随历史变动，
 * 不能套用当前规则，也不能忽略（中国 1986–1991 年也实行过夏令时）。
 *
 * 说明：此为平太阳时近似，未计入均时差（±16 分钟内），命理排盘层面足够。
 */

export const DEFAULT_ZONE = 'Asia/Shanghai'

/** 校验字符串是否为运行时支持的 IANA 时区；非法串 Intl 会抛 RangeError */
export function isValidZone(zone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone })
    return true
  } catch {
    return false
  }
}

export interface BirthMoment {
  year: number
  month: number
  day: number
  hour: number
  minute: number
}

/**
 * 取指定 IANA 时区在【某一历史时刻】的实际 UTC 偏移（小时，东正西负）。
 *
 * 做法：先把钟表时刻猜作 UTC 得到一个绝对时刻，再看该时刻在目标时区显示成几点——
 * 两者之差即偏移。
 *
 * ★ 符号方向：返回 (asUTC − utcGuess)。写反成 (utcGuess − asUTC) 会得到相反符号：
 *   Asia/Shanghai 会变成 UTC−8（应为 +8），北美变正偏移，全盘皆错。
 */
export function getUtcOffsetHours(
  zone: string,
  when: BirthMoment
): number {
  try {
    return utcOffsetHoursUnchecked(zone, when)
  } catch {
    // 纵深兜底（任务书 §二）：zone 的入口不止「手动时区」一处
    // （城市库 z 字段、旧客户端 birthplace、未来的 URL 参数/分享链接），
    // route 层校验拦不住所有路径。任何路径上的脏 zone 都不允许变成 500。
    // DEFAULT_ZONE 为常量合法时区，此处无递归风险。
    console.warn(`[solarTime] 非法时区「${zone}」，降级为 ${DEFAULT_ZONE}`)
    return utcOffsetHoursUnchecked(DEFAULT_ZONE, when)
  }
}

/** 不做校验的私有实现（getUtcOffsetHours 的兜底机制基于它，勿直接导出调用） */
function utcOffsetHoursUnchecked(
  zone: string,
  { year, month, day, hour, minute }: BirthMoment
): number {
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute)
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: zone, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
  const o: Record<string, string> = {}
  for (const p of dtf.formatToParts(new Date(utcGuess))) o[p.type] = p.value
  const asUTC = Date.UTC(+o.year, +o.month - 1, +o.day, +o.hour % 24, +o.minute, +o.second)
  return (asUTC - utcGuess) / 3600000
}

/**
 * 真太阳时校正分钟数：出生地经度相对当地时区中央经线的分钟差。
 * 每差 1° 经度 = 4 分钟；当地正午（太阳在正南）与钟表 12 点的差即此值。
 */
export function trueSolarOffsetMinutes(
  lng: number,
  zone: string = DEFAULT_ZONE,
  when: BirthMoment
): number {
  const utcOffsetHours = getUtcOffsetHours(zone, when)
  return Math.round((lng - utcOffsetHours * 15) * 4)
}

export interface TrueSolarTime extends BirthMoment {
  offsetMin: number
}

/** 输入当地钟表时刻（出生证/家人记忆的时间）+ 出生地经度 + IANA 时区，输出真太阳时 */
export function toTrueSolarTime(
  zone: string,
  lng: number,
  when: BirthMoment
): TrueSolarTime {
  const { year, month, day, hour, minute } = when
  const offsetMin = trueSolarOffsetMinutes(lng, zone, when)
  // 用 UTC 构造与读取，使结果不依赖服务器本地时区：
  // 若用本地构造 + 本地 getter，服务器时区含夏令时且平移跨越其切换点时，
  // 读回的钟表时间会差 1 小时（生产多为 UTC 本无此险，此处属加固）。
  const utc = Date.UTC(year, month - 1, day, hour, minute)
  const a = new Date(utc + offsetMin * 60000)
  return {
    year: a.getUTCFullYear(),
    month: a.getUTCMonth() + 1,
    day: a.getUTCDate(),
    hour: a.getUTCHours(),
    minute: a.getUTCMinutes(),
    offsetMin,
  }
}

// ---------- 出生地解析（手动优先于城市） ----------

export interface BirthRef {
  lng: number
  zone: string
}

/**
 * 标准偏移的推算基准年（★ 固定，不得改为出生年或 new Date().getFullYear()）。
 *
 * 为什么要固定：夏令时是季节性的，但【战时/特殊时期可能全年都是夏令时】——
 *   美国 War Time 1942-02-09 ~ 1945-09-30 全年 UTC−4（纽约标准本应 −5）、
 *   英国二战双夏令时同理。此时「取出生年 1 月与 7 月的最小值」取到的就是
 *   夏令时偏移本身 → DST 不被剥离 → 差 60（伦敦 120）分钟。
 *   根因是信息缺失：「标准偏移」是 tzdata 元数据，「全年夏令时」与
 *   「标准偏移本就是 −4」在纯偏移采样上不可区分 —— 换采样方案救不了，
 *   必须换推算基准。
 * 用近年规则正常的年份作基准可绕开该问题，且结果确定（断言可写死）。
 * 若某时区此后变更其标准偏移，可提升此常量。
 */
const STD_REF_YEAR = 2020

/**
 * 仅知 IANA 时区、不知经度时（「其它」路径），取该时区的【标准】中央经线。
 *
 *   标准中央经线 = min(基准年【1月15日】偏移, 【7月15日】偏移) × 15
 *
 * 为什么取 min：夏令时恒为「+1 小时」，标准偏移在数值上总较小；
 * 南北半球都适配（悉尼 1 月夏令时 +11、7 月标准 +10 → min 得 +10）。
 * 半球无关：min 恒落在非夏令那侧（本任务书 §1.1 实测确认）。
 *
 * ★ 参数 when 已被刻意忽略（推算基准固定为 STD_REF_YEAR，见上）：
 *   保留签名以免破坏调用方（§8.4.4 刻意的设计决定要显式说明）。
 *
 * 效果：用户假定在标准经线上 → 经度项为 0，但真太阳时公式仍会剥掉夏令时
 *   （夏令时日内，实际偏移比标准大 1：(stdLng − (std+1)×15)×4 = −60 分）。
 */
export function standardMeridianLng(zone: string, _when?: BirthMoment): number {
  const probe = (month: number) =>
    getUtcOffsetHours(zone, { year: STD_REF_YEAR, month, day: 15, hour: 12, minute: 0 })
  return Math.min(probe(1), probe(7)) * 15
}

/**
 * 解析出生地。优先级：
 *   手动经度（＋时区，时区缺省 Asia/Shanghai）
 *   ＞ 城市记录（须含 zone）
 *   ＞ 仅给时区（「其它」：经度取标准中央经线，夏令时仍剥掉）
 *   ＞ null（完全不校正）
 *
 * when：仅时区路径取标准经线需要出生年份；调用方应传入出生时刻。
 */
export function resolveBirthRef(args: {
  manualLng?: number
  manualZone?: string
  city?: { lng: number; zone?: string }
  when?: BirthMoment
}): BirthRef | null {
  if (args.manualLng !== undefined && Number.isFinite(args.manualLng)) {
    return { lng: args.manualLng, zone: args.manualZone || DEFAULT_ZONE }
  }
  if (args.city) {
    return { lng: args.city.lng, zone: args.city.zone || DEFAULT_ZONE }
  }
  if (args.manualZone) {
    return { lng: standardMeridianLng(args.manualZone, args.when), zone: args.manualZone }
  }
  return null
}

// ---------- 夏令时切换点检测 ----------
export interface DSTNotice {
  kind: 'gap' | 'ambiguous'
  zone: string
  // 实际采用的偏移（小时）
  resolvedHours: number
  message: string
}

const ZONE_PART_FIELDS = ['year', 'month', 'day', 'hour', 'minute'] as const

// 取某绝对时刻在 zone 中的钟表字段
function zonedParts(zone: string, ms: number): Record<string, number> {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: zone, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit'
  })
  const o: Record<string, string> = {}
  for (const p of dtf.formatToParts(new Date(ms))) o[p.type] = p.value
  return {
    year: +o.year, month: +o.month, day: +o.day,
    hour: +o.hour % 24, minute: +o.minute
  }
}

function sameWallTime(a: Record<string, number>, t: BirthMoment): boolean {
  return ZONE_PART_FIELDS.every(k =>
    a[k] === (k === 'month' ? t.month : (t as unknown as Record<string, number>)[k]))
}

/**
 * 检测钟表时刻是否落在夏令时切换点：
 *   gap       —— 春季跳表后的「不存在时刻」（如北美 02:00→03:00 之间的 02:30）
 *   ambiguous —— 秋季回拨后的「重复时刻」（同一钟表时间出现两次）
 * 用户不需要懂这些：软件按 tzdata 解析并给出提示。
 */
export function checkDSTTransition(zone: string, t: BirthMoment): DSTNotice | null {
  const off = getUtcOffsetHours(zone, t)
  const wallUTC = Date.UTC(t.year, t.month - 1, t.day, t.hour, t.minute)

  // 按解析出的偏移反推绝对时刻，再回到该时区，钟表时间应与输入一致；不一致即不存在时刻
  const inst = wallUTC - off * 3600000
  if (!sameWallTime(zonedParts(zone, inst), t)) {
    const resolved = zonedParts(zone, inst)
    return {
      kind: 'gap', zone, resolvedHours: off,
      message: `该时刻在 ${zone} 不存在（夏令时春季跳表），已按 ${resolved.hour % 24}:${String(resolved.minute).padStart(2, '0')} 解析`
    }
  }

  // 重复时刻：相差 1 小时的另一个偏移也能得到同样的钟表时间
  for (const alt of [off + 1, off - 1]) {
    const inst2 = wallUTC - alt * 3600000
    if (sameWallTime(zonedParts(zone, inst2), t)) {
      return {
        kind: 'ambiguous', zone, resolvedHours: off,
        message: `该时刻在 ${zone} 出现两次（夏令时秋季回拨），已按 UTC${off >= 0 ? '+' : ''}${off} 解析`
      }
    }
  }
  return null
}
