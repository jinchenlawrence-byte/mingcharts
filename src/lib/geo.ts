// 地理位置解析规则引擎
// 核心：方位五行是城市「相对命主出生地」的关系量，由双方坐标实时计算（候选门控）；
//      城市地气（diqi）是城市固有属性，地气物产取象，属「产品设定」，仅作次要加分。
//
// ── 方位体系说明（刻意设计，勿当成 bug；见《验收标准与红线》§8.4.4）──
// · 卦位（8 等分，各 45°）：传统八卦，用于【方位标签】（如「东南·巽木」）
// · 门控（5 类）：木火金水以四正为心各展 84°、土取四维间隙各 6°（共 24°），用于【五行判定】，
//   服务「每类候选可取满 Top-N」的操作性需求
// · 两者划分标准不同 → 同一城市可能「卦位属土、门控属木」，展示层须并列两套结果并说明，非矛盾
// · 土仅 24°：因土在传统中为「中央」而非方位，故只保留四维过渡带
// · 相对模型的原始池五行占比随观察点变化（如乌鲁木齐望全国城市天然偏东南），属地理事实，不作退化判据
import citiesData from '../data/geo-cities.json'

// ---------- 五行基础 ----------
export type WX = '木' | '火' | '土' | '金' | '水'
const DAY_WX: Record<string, WX> = {
  甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土',
  己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水'
}
const SHENG_WO: Record<WX, WX> = { 木: '水', 火: '木', 土: '火', 金: '土', 水: '金' } // 印：生我
const WO_SHENG: Record<WX, WX> = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' } // 食伤：我生
const WO_KE: Record<WX, WX> = { 木: '土', 火: '金', 土: '水', 金: '木', 水: '火' }     // 财：我克
const KE_WO: Record<WX, WX> = { 木: '金', 火: '水', 土: '木', 金: '火', 水: '土' }     // 官杀：克我

// 八卦方位（角度以正北为 0，顺时针）
const BAGUA_DIRS: Array<{ angle: number; label: string; wx: WX; full: string }> = [
  { angle: 0, label: '正北', wx: '水', full: '正北·坎水' },
  { angle: 45, label: '东北', wx: '土', full: '东北·艮土' },
  { angle: 90, label: '正东', wx: '木', full: '正东·震木' },
  { angle: 135, label: '东南', wx: '木', full: '东南·巽木' },
  { angle: 180, label: '正南', wx: '火', full: '正南·离火' },
  { angle: 225, label: '西南', wx: '土', full: '西南·坤土' },
  { angle: 270, label: '正西', wx: '金', full: '正西·兑金' },
  { angle: 315, label: '西北', wx: '金', full: '西北·乾金' }
]

// ---------- 类型 ----------
interface CityRecord {
  id: number
  name: string
  region: string
  lat: number
  lng: number
  diqi: WX | null        // 城市固有地气（产品设定）
  diqiReason: string
}

export interface BirthplaceRef {
  name: string
  lat: number
  lng: number
}

export interface GeoInput {
  dayMaster: string          // 日干
  wangShuai: string          // 身旺/身弱 判定
  // 调候用神五行（《穷通宝鉴》，按主次排序；可用 analysis.tiaoHouWuxing 生成）。
  // 缺省/空数组＝按无调候评分（旧客户端兼容），不得因此报错。
  tiaoHou?: WX[]
  birthplace?: BirthplaceRef | null
  currentCity?: BirthplaceRef | null   // 现居城市（可选，评估当前居住地影响）
}

export type CategoryKey = 'wealth' | 'career' | 'patron' | 'home' | 'talent'

export interface CategoryMeta {
  key: CategoryKey
  label: string              // 财富之城
  icon: string
  targetWx: WX
  targetGod: string          // 财星 / 官杀 / 印星 / 比劫
  color: string              // 主题色（marker）
}

export interface GeoCityHit {
  name: string
  region: string
  lat: number
  lng: number
  menWx: WX             // 五行门控（宽泛方位扇区）
  fangWx: WX             // 精确卦位五行（方位标签）
  fangLabel: string      // 正北·坎水／中央
  bearing: number        // 方位角（度）
  center: boolean        // 同城/近距，按中央土论
  diqi: WX | null        // 城市地气（产品设定）
  diqiReason: string
  score: number
  impact: string
  reasons: string[]
}

export interface CategoryResult extends CategoryMeta {
  cities: GeoCityHit[]
  notice?: string
}

export interface GeoAnalysis {
  dayMaster: string
  dayWx: WX
  wangShuai: string
  strong: boolean
  favorableWx: WX[]
  unfavorableWx: WX[]
  favorableDirections: string[]
  unfavorableDirections: string[]
  birthplace: BirthplaceRef | null
  currentCity: CurrentCityImpact | null
  categories: CategoryResult[]
}

// ---------- 现居城市影响 ----------
export interface CurrentCityImpact {
  name: string
  lat: number
  lng: number
  fangWx: WX | null       // 方位五行（相对出生地；无出生地/同城时为 null）
  fangLabel: string       // 正北·坎水；'' 无
  bearing: number
  center: boolean         // 同城/近距，按中央土论
  distanceKm: number | null
  diqi: WX | null         // 城市地气（产品设定）
  diqiReason: string
  primaryWx: WX | null    // 主判五行（优先方位；中央论土；两者皆无则用地气；再无则 null）
  primarySource: '方位' | '中央' | '地气' | null
  level: '吉' | '平' | '忌'
  score: number
  impact: string
  godRelation: string     // 主五行与日主的十神关系
  favorable: boolean      // 主五行是否喜用
  effects: string[]       // 确定性影响事实
  advice: string[]        // 趋避建议
}

function godRelationOf(dayWx: WX, wx: WX): string {
  if (wx === dayWx) return '比劫'
  if (SHENG_WO[dayWx] === wx) return '印星'
  if (WO_SHENG[dayWx] === wx) return '食伤'
  if (WO_KE[dayWx] === wx) return '财星'
  return '官杀'
}

const CITIES = citiesData as unknown as CityRecord[]

// ---------- 方位计算 ----------
function toRad(d: number) { return (d * Math.PI) / 180 }
function toDeg(r: number) { return (r * 180) / Math.PI }

function haversineKm(a: BirthplaceRef, b: { lat: number; lng: number }): number {
  const R = 6371
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

function bearingDeg(a: BirthplaceRef, b: { lat: number; lng: number }): number {
  const lat1 = toRad(a.lat), lat2 = toRad(b.lat)
  const dLng = toRad(b.lng - a.lng)
  const y = Math.sin(dLng) * Math.cos(lat2)
  const x = Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng)
  return (toDeg(Math.atan2(y, x)) + 360) % 360
}

function dirFromAngle(angle: number) {
  const sector = Math.round(angle / 45) % 8
  return BAGUA_DIRS.find((d) => d.angle === sector * 45)!
}

// 五行门控（宽泛方位）：木火金水以四正为心各展 84°，土取四维间隙（四段各 6°，共 24°）。
// 传统方位之用本取宽泛的「南／北／东／西方」；精确卦界只作方位标签，不作五行门控。
function menWxOfBearing(b: number): WX {
  const n = b % 360
  if (n >= 318 || n < 42) return '水'
  if (n < 48) return '土'
  if (n < 132) return '木'
  if (n < 138) return '土'
  if (n < 222) return '火'
  if (n < 228) return '土'
  if (n < 312) return '金'
  return '土'
}

// 城市相对出生地的方位（25km 以内按中央土论）；
// menWx＝五行门控（宽泛84°扇区），fangWx/fangLabel＝精确卦位（展示标签）
function fangOf(birth: BirthplaceRef, city: { lat: number; lng: number }) {
  const dist = haversineKm(birth, city)
  if (dist <= 25) {
    return { menWx: '土' as WX, fangWx: '土' as WX, fangLabel: '中央', bearing: 0, center: true, dist }
  }
  const bearing = bearingDeg(birth, city)
  const dir = dirFromAngle(bearing)
  return {
    menWx: menWxOfBearing(bearing),
    fangWx: dir.wx, fangLabel: dir.full, bearing: Math.round(bearing), center: false, dist
  }
}

// ---------- 评分 ----------
function impactLabel(score: number): string {
  if (score >= 82) return '强旺 · 助力深厚'
  if (score >= 70) return '助力显著'
  if (score >= 58) return '可以借势'
  if (score >= 45) return '助力一般'
  return '偏弱 · 待运而发'
}

/**
 * 单城评分纯函数（推荐城市路径）。
 * 基础 55＝城市已通过方位门控（宽泛方位五行正合目标），再叠加：
 *   ① 方位合调候（targetWx 在调候表中）＋12 第一用神 / ＋7 辅佐；
 *   ② 地气（产品设定）：同目标且为喜用 ＋15、同目标却为忌神 −12（助忌反作用）、
 *      合调候（非忌）＋13/＋8、调候与格局打架则不加分、普通喜用 ＋9、忌神 −8。
 * 抽成纯函数供验收脚本逐分支断言（忌城在真实榜单中常被高分城挤出 top6，端到端难观察）。
 */
export interface GeoCityScoreInput {
  strong: boolean
  targetWx: WX
  targetGod: string
  tiaoHou: WX[]
  favorable: WX[]
  unfavorable: WX[]
  diqi: WX | null
  diqiReason: string
}
export function scoreGeoCity(s: GeoCityScoreInput): { score: number; extraReasons: string[] } {
  let score = 55
  const extraReasons: string[] = []
  const thRankOf = (wx: WX): number => s.tiaoHou.indexOf(wx)

  // ① 方位合调候：门控后方位五行即 targetWx；若 targetWx 本就是调候之药，
  //    方位本身已在解月令寒暖燥湿之病（《穷通宝鉴》），第一用神权重更厚
  const thDir = thRankOf(s.targetWx)
  if (thDir === 0) {
    score += 12
    extraReasons.push(`调候：此城方位五行${s.targetWx}正合《穷通宝鉴》调候第一用神，方位本身即气候之药`)
  } else if (thDir > 0) {
    score += 7
    extraReasons.push(`调候：方位五行${s.targetWx}合调候辅佐用神（第${thDir + 1}位），略解气候之需`)
  }

  // ② 地气（产品设定）
  if (s.diqi) {
    const d = s.diqi
    const th = thRankOf(d)
    if (d === s.targetWx) {
      if (s.favorable.includes(d)) {
        // 方位地气同气，且同气之五行为命局喜用 → 加分最厚
        score += 15
        extraReasons.push(`地气：${d}（${s.diqiReason}）与目标同气，且为命局喜用——方位地气两相扶助（地气物产取象属产品设定，非古籍依据）`)
      } else {
        // ★ 命理修正（用户指出）：目标五行为忌神时（如身旺遇印比、身弱遇食伤），
        //   地气再与目标同气＝助忌，旺者益旺、弱者愈泄，起反作用，故重减
        score -= 12
        extraReasons.push(`地气：${d}（${s.diqiReason}）虽与目标同气，然命局${s.strong ? '身旺' : '身弱'}，${s.targetGod}本非所喜，同气反助忌神，故重减（产品设定）`)
      }
    } else if (th >= 0 && !s.unfavorable.includes(d)) {
      // 地气他类五行，但合调候：气候之药，优先于普通喜用
      const add = th === 0 ? 13 : 8
      score += add
      extraReasons.push(`地气：${d}（${s.diqiReason}）合《穷通宝鉴》调候${th === 0 ? '第一' : '辅佐'}用神，虽非本类目标五行，气候之药故加 ${add}（产品设定）`)
    } else if (th >= 0) {
      // 调候与格局之争：该五行合气候之需却是格局忌神，不凭一端加减，明示权衡
      extraReasons.push(`地气：${d}（${s.diqiReason}）虽合调候之需，然为当前格局忌神，气候与格局须求平衡，不以此一端加分（产品设定）`)
    } else if (s.favorable.includes(d)) {
      score += 9
      extraReasons.push(`地气：${d}（${s.diqiReason}），为命局喜用，可借其势（产品设定）`)
    } else {
      score -= 8
      extraReasons.push(`地气：${d}（${s.diqiReason}），为命局所忌，地气助忌故减分（产品设定）`)
    }
  }

  return { score: Math.max(0, Math.min(100, score)), extraReasons }
}

// 主五行 × 来源 × 旺衰 → 确定性影响事实
function cityEffects(
  wx: WX, source: '方位' | '中央' | '地气', relation: string,
  strong: boolean, favorable: boolean
): string[] {
  const fx: string[] = []
  const srcText = source === '方位' ? '方位五行' : source === '中央' ? '中央土气' : '城市地气'
  const map: Record<string, [string, string]> = {
    // [身旺文案, 身弱文案]
    '印星': [
      `${srcText}${wx}为印星，虽相生然身旺不需要再生，久居易生安逸依赖，宜自我鞭策`,
      `${srcText}${wx}为印星生身，利学习、文书、长辈贵人缘，久居得滋养固本，根基渐稳`
    ],
    '比劫': [
      `${srcText}${wx}与日主同气（比劫帮身），身旺再得同气，竞争偏激烈、易分财破财，理财须谨慎`,
      `${srcText}${wx}与日主同气（比劫帮身），利社交合伙、固本培元，久居根基渐稳`
    ],
    '食伤': [
      `${srcText}${wx}为食伤泄秀，利才华表达、创作输出与名气积累，身旺泄秀正当其用`,
      `${srcText}${wx}为食伤泄气，身弱再泄则耗神，创意虽多而体力易透支，须量力而行`
    ],
    '财星': [
      `${srcText}${wx}为财星，身旺能任财，求财机遇偏多，宜顺势稳妥求财，仍忌孤注与杠杆`,
      `${srcText}${wx}为财星，身弱不任财，机遇与压力并存，忌贪冒进、量入为出`
    ],
    '官杀': [
      `${srcText}${wx}为官杀约束，身旺喜官杀成器，利职场担当，可稳步求进`,
      `${srcText}${wx}为官杀克身，身弱畏克，居之压力偏大、易感束缚，宜借印星化解（学习、贵人、文书证书）`
    ]
  }
  const pair = map[relation]
  if (pair) fx.push(strong ? pair[0] : pair[1])
  fx.push(favorable
    ? `此五行属命局喜用，久居可借其势`
    : `此五行属命局忌神，久居助忌，运势易打折扣`)
  return fx
}

// 单类城市：方位门控 → 评分
function buildCategory(
  meta: CategoryMeta,
  gin: GeoInput,
  birth: BirthplaceRef | null,
  favorable: WX[],
  unfavorable: WX[]
): CategoryResult {
  if (!birth) {
    return {
      ...meta,
      cities: [],
      notice: '方位五行须相对命主出生地计算，请先选择出生地，即可按方位推荐城市'
    }
  }

  const strong = ['身旺', '身强'].includes(gin.wangShuai)
  const picks = CITIES
    .map((city) => ({ city, fang: fangOf(birth, city) }))
    // 候选门控：以「宽泛五行扇区」（menWx）正合目标五行才入选
    .filter((x) => x.fang.menWx === meta.targetWx)
    .map((x) => {
      const { city, fang } = x
      const reasons: string[] = []

      reasons.push(
        `方位：位于出生地${fang.fangLabel}（方位角约${fang.bearing}°，距约${Math.round(fang.dist)}公里），` +
        `按宽泛方位五行判${fang.menWx}，正合${meta.targetGod}` +
        (fang.menWx !== fang.fangWx ? `（精确卦位为${fang.fangLabel}，方位五行取宽泛之方）` : '') +
        `（方位相对命主，属传统方位五行之说）`
      )

      // 调候＋地气评分（纯函数；无调候输入时其加分项自动落空）
      const scored = scoreGeoCity({
        strong,
        targetWx: meta.targetWx,
        targetGod: meta.targetGod,
        tiaoHou: gin.tiaoHou ?? [],
        favorable,
        unfavorable,
        diqi: city.diqi,
        diqiReason: city.diqiReason
      })
      const score = scored.score
      reasons.push(...scored.extraReasons)
      if (!city.diqi) reasons.push('地气：该城未标注地气，以方位论')

      // 旺衰与目标的命理张力
      if (!strong && meta.key === 'wealth') {
        reasons.push('身弱不任财：财多反累其身，故财富之城取比劫帮身之地，同气相扶方能担财，待岁运扶身再入财乡')
      }
      if (!strong && meta.key === 'career') {
        reasons.push('身弱畏官杀之克：事业之城取印星扶身之地，印绶化杀生身，根基稳固后方可担当大任')
      }
      if (strong && meta.key === 'wealth') {
        reasons.push('身旺能任财：求财可顺势而为，仍须稳扎稳打，忌孤注一掷')
      }
      if (strong && meta.key === 'career') {
        reasons.push('身旺喜官杀约束成器：平台与职责反能成就事业高度，可稳步求进')
      }
      if (strong && (meta.key === 'patron' || meta.key === 'home')) {
        reasons.push('身旺印比本非所喜：此地宜短期休养蓄力，久居易生怠惰，奋发还看财官之方')
      }
      if (!strong && meta.key === 'talent') {
        reasons.push('身弱而食伤泄气：才华之地宜量力而行，先以印比固本，再图施展方不耗元神')
      }
      if (strong && meta.key === 'talent') {
        reasons.push('身旺喜食伤泄秀：此地最利才华抒发，创作表达易出成果，名气可渐积')
      }

      return {
        city, fang,
        score: Math.max(0, Math.min(100, score)),
        reasons
      }
    })
    .sort((a, b) => b.score - a.score)

  const TOP_N = 6
  const citiesOut = picks.slice(0, TOP_N).map((p) => ({
    name: p.city.name,
    region: p.city.region,
    lat: p.city.lat,
    lng: p.city.lng,
    menWx: p.fang.menWx,
    fangWx: p.fang.fangWx,
    fangLabel: p.fang.fangLabel,
    bearing: p.fang.bearing,
    center: p.fang.center,
    diqi: p.city.diqi,
    diqiReason: p.city.diqiReason,
    score: p.score,
    impact: impactLabel(p.score),
    reasons: p.reasons
  }))

  return {
    ...meta,
    cities: citiesOut,
    // 取不满推荐位时必须明示，不得静默少显示（如上海正东临海、该方位城市本就稀少）
    notice: picks.length < TOP_N
      ? `${meta.label}对应方位（${meta.targetWx}）的候选较少，仅得 ${picks.length} 座，已列全部；此为地理分布使然，非数据遗漏`
      : undefined
  }
}

// ---------- 现居城市评估 ----------
function analyzeCurrentCity(
  city: BirthplaceRef,
  dayWx: WX,
  strong: boolean,
  favorable: WX[],
  unfavorable: WX[],
  birthplace: BirthplaceRef | null
): CurrentCityImpact {
  // 按坐标近配而非名称相等：现居城市来自全球库（外国城为英文名，如 "New York"），
  // 而推荐库世界城用中文名（纽约）；坐标同源（GeoNames）故近配可靠。
  // 取 1° 曼哈顿距离内最近者——同一都会区多城（尔湾/洛杉矶、剑桥/波士顿）时精确落位
  let known: (typeof CITIES)[number] | undefined
  let best = Infinity
  for (const c of CITIES) {
    const d = Math.abs(c.lat - city.lat) + Math.abs(c.lng - city.lng)
    if (d < 1 && d < best) { best = d; known = c }
  }
  const diqi: WX | null = known ? known.diqi : null
  const diqiReason = known ? known.diqiReason : ''

  let fangWx: WX | null = null
  let menWx: WX | null = null
  let fangLabel = ''
  let bearing = 0
  let center = false
  let distanceKm: number | null = null
  if (birthplace) {
    distanceKm = Math.round(haversineKm(birthplace, city))
    const f = fangOf(birthplace, city)
    if (f.center) {
      center = true
    } else {
      menWx = f.menWx
      fangWx = f.fangWx
      fangLabel = f.fangLabel
      bearing = f.bearing
    }
  }

  // 主判五行：宽泛方位五行优先；同城近距按中央土；无出生地则退而以地气论；皆无则不判定
  let primaryWx: WX | null = null
  let primarySource: CurrentCityImpact['primarySource'] = null
  if (menWx) { primaryWx = menWx; primarySource = '方位' }
  else if (center) { primaryWx = '土'; primarySource = '中央' }
  else if (diqi) { primaryWx = diqi; primarySource = '地气' }

  let score = 50
  let favorableMain = false
  let relation = ''
  let effects: string[]
  if (primaryWx) {
    favorableMain = favorable.includes(primaryWx)
    relation = godRelationOf(dayWx, primaryWx)
    if (primarySource === '方位') score += favorableMain ? 22 : -12
    else if (primarySource === '中央') score += favorableMain ? 10 : -8
    else score += favorableMain ? 18 : -10
    // 地气与主判不同且存在，作微调
    if (diqi && diqi !== primaryWx) {
      if (favorable.includes(diqi)) score += 6
      else if (unfavorable.includes(diqi)) score -= 6
    }
    effects = cityEffects(primaryWx, primarySource as '方位' | '中央' | '地气', relation, strong, favorableMain)
    if (primarySource === '方位' && distanceKm !== null) {
      effects.push(`位于出生地${fangLabel}（约${distanceKm}公里），方位五行${favorableMain ? '属喜用，方向亦扶' : '属忌，可于居家布置中微调（床头、书桌朝喜用之方）'}`)
    }
  } else {
    effects = ['未提供出生地，且该城无地气标注，方位与地气皆无法判定，此条仅作居住地记录']
  }
  score = Math.max(0, Math.min(100, score))

  const level: CurrentCityImpact['level'] = score >= 70 ? '吉' : score >= 45 ? '平' : '忌'

  const advice: string[] = primaryWx === null
    ? ['选择出生地后可获得方位五行评估；短期居住无妨，心态与努力为本']
    : favorableMain
      ? [
          '现居五行与喜用相应，宜久居借势，不必轻迁',
          `可顺势发展${relation}相关领域（${primaryWx}属性行业：${WX_INDUSTRY[primaryWx]}）`,
        ]
      : [
          '短期居住无妨，五行影响是长期渐染的过程',
          `长期可考虑向${favorable.join('、')}之方迁移；暂不迁居者，可多往喜用方位走动调节`,
          '居家布置可引入喜用五行元素（颜色、材质、方位），心态与努力为本',
        ]

  return {
    name: city.name,
    lat: city.lat,
    lng: city.lng,
    fangWx, fangLabel, bearing, center, distanceKm,
    diqi, diqiReason,
    primaryWx, primarySource,
    level, score, impact: impactLabel(score),
    godRelation: relation, favorable: favorableMain,
    effects, advice
  }
}

// 五行→常见行业取象（产品设定，用于建议文案）
const WX_INDUSTRY: Record<WX, string> = {
  木: '文教、医药、木材、家具、园林',
  火: '能源、电子、餐饮、文化传媒',
  土: '地产、建筑、农业、仓储',
  金: '金融、机械、金属、司法',
  水: '贸易、航运、物流、旅游、水产',
}

// ---------- 主入口 ----------
export function analyzeGeo(input: GeoInput): GeoAnalysis {
  const dayWx = DAY_WX[input.dayMaster] || '土'
  const strong = ['身旺', '身强'].includes(input.wangShuai)

  const favorable: WX[] = strong
    ? [KE_WO[dayWx], WO_KE[dayWx], WO_SHENG[dayWx]]
    : [SHENG_WO[dayWx], dayWx]
  const unfavorable: WX[] = strong
    ? [SHENG_WO[dayWx], dayWx]
    : [KE_WO[dayWx], WO_KE[dayWx], WO_SHENG[dayWx]]

  // 目标随旺衰切换：身弱不任财官，财富之城取比劫帮身（身旺方能任财）、
  // 事业之城取印星扶身（化杀生身，根基稳后堪当大任）；身旺则直取财官
  const metas: CategoryMeta[] = [
    strong
      ? { key: 'wealth', label: '财富之城', icon: '💰', targetWx: WO_KE[dayWx], targetGod: '财星', color: '#d97706' }
      : { key: 'wealth', label: '财富之城', icon: '💰', targetWx: dayWx, targetGod: '比劫（帮身任财）', color: '#d97706' },
    strong
      ? { key: 'career', label: '事业之城', icon: '🏛️', targetWx: KE_WO[dayWx], targetGod: '官杀', color: '#7c3aed' }
      : { key: 'career', label: '事业之城', icon: '🏛️', targetWx: SHENG_WO[dayWx], targetGod: '印星（扶身立业）', color: '#7c3aed' },
    { key: 'patron', label: '贵人之城', icon: '🌟', targetWx: SHENG_WO[dayWx], targetGod: '印星', color: '#0891b2' },
    { key: 'home', label: '安居之城', icon: '🏡', targetWx: dayWx, targetGod: '比劫', color: '#059669' },
    { key: 'talent', label: '才华之城', icon: '🎨', targetWx: WO_SHENG[dayWx], targetGod: '食伤', color: '#db2777' }
  ]

  const birth = input.birthplace || null

  // 全局去重：一座城只归属先到的类别（类别按产品优先级排列）
  const TOP_N = 6
  const used = new Set<number>()
  const categories: CategoryResult[] = metas.map((meta) => {
    const cat = buildCategory(meta, input, birth, favorable, unfavorable)
    const kept = cat.cities.filter((c) => {
      const rec = CITIES.find((x) => x.name === c.name && Math.abs(x.lat - c.lat) < 0.01)
      if (rec && used.has(rec.id)) return false
      if (rec) used.add(rec.id)
      return true
    })
    // 去重后若仍取不满，按实际条数明示（覆盖 buildCategory 基于候选数的同类提示）
    const notice = kept.length < TOP_N
      ? `${meta.label}对应方位（${meta.targetWx}）的推荐位未取满，仅得 ${kept.length} 座，已列全部；此为地理分布使然，非数据遗漏`
      : cat.notice
    return { ...cat, cities: kept, notice }
  })

  // 喜忌方位（按八卦五行）
  const dirsByWx = (wxList: WX[]) =>
    BAGUA_DIRS.filter((d) => wxList.includes(d.wx)).map((d) => d.full)

  // 现居城市影响（可选）
  const currentCity = input.currentCity
    ? analyzeCurrentCity(input.currentCity, dayWx, strong, favorable, unfavorable, birth)
    : null

  return {
    dayMaster: input.dayMaster,
    dayWx,
    wangShuai: input.wangShuai,
    strong,
    favorableWx: favorable,
    unfavorableWx: unfavorable,
    favorableDirections: dirsByWx(favorable),
    unfavorableDirections: dirsByWx(unfavorable),
    birthplace: birth,
    currentCity,
    categories
  }
}
