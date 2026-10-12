// 紫微斗数：iztro 排盘 + 规则引擎分析（格局/四化/宫位/大限流年）
import { astro } from 'iztro'
import { trueSolarOffsetMinutes, DEFAULT_ZONE } from './solarTime'

// ---------- 类型 ----------
export interface ZwStar {
  name: string
  brightness: string        // 庙/旺/得/利/平/不得/陷，辅星为空
  mutagen: '' | '禄' | '权' | '科' | '忌'
}

export interface ZwPalace {
  index: number             // 0=寅 起，顺地支序列
  name: string              // 命宫/兄弟/夫妻/子女/财帛/疾厄/迁移/仆役/官禄/田宅/福德/父母
  heavenlyStem: string
  earthlyBranch: string
  ganZhi: string
  isBodyPalace: boolean
  majorStars: ZwStar[]      // 十四主星（可能为空宫）
  minorStars: ZwStar[]      // 辅星（含六吉六凶禄马昌曲等）
  adjectiveStars: string[]  // 杂曜
  changsheng12: string
  decadalRange: [number, number]
  ages: number[]
}

export interface ZwChart {
  input: { year: number; month: number; day: number; hour: number; minute: number; gender: 1 | 0 }
  timezoneOffsetApplied?: number // 实际生效的真太阳时偏移（分钟）
  /** ★ 单一事实源：构建 iztro 盘所用公历日期（已含真太阳时校正＋晚子时推进）。两处入口共用 */
  ziweiDateStr: string
  /** ★ 单一事实源：构建 iztro 盘所用时辰索引（0=子时）。analyzeZiwei 禁止再从 input 推导 */
  ziweiTimeIndex: number
  lunarDate: string
  chineseDate: string
  zodiac: string
  sign: string
  fiveElementsClass: string // 五行局
  soul: string              // 命主
  body: string              // 身主
  palaces: ZwPalace[]
  mingIndex: number         // 命宫在 palaces 中的下标
}

// 分析结果
export interface PatternTag {
  name: string
  level: '吉' | '平' | '忌'
  note: string
  /** 成立要件（红线 §8.3-④「点名结构」） */
  required?: string[]
  /** 加分项：使格局更完整/更强 */
  bonus?: string[]
  /** 破格项：使格局减力或转坏 */
  breaking?: string[]
  /** 古籍出处：书名·篇名（核不到原文时用 basisLevel: '通行做法'） */
  source?: string
  /** 依据等级（§8.6.2）：'古籍' | '通行做法' | '产品设定' */
  basisLevel?: '古籍' | '通行做法' | '产品设定'
}

export interface TransformEntry {
  star: string
  type: '禄' | '权' | '科' | '忌'
  palace: string            // 落宫
  note: string
}

export interface PalaceRead {
  name: string
  empty: boolean
  stars: string[]           // 主星（含亮度/四化）
  auspicious: string[]      // 六吉禄马等
  ominous: string[]         // 六凶
  tags: string[]
}

export interface PeriodRead {
  title: string
  ganZhi: string
  basePalace: string        // 所坐原局宫位
  range: string
  stars: string[]
  transforms: string[]      // 该运四化落宫描述
  tags: string[]
}

export interface ZiweiAnalysis {
  patterns: PatternTag[]
  transforms: TransformEntry[]
  palaces: Record<'命宫' | '官禄' | '财帛' | '夫妻' | '迁移' | '福德' | '疾厄', PalaceRead>
  score: number
  scoreLabel: string
  decadal: PeriodRead
  yearly: PeriodRead
  xiaoxian: { nominalAge: number; basePalace: string; ganZhi: string }
}

// ---------- 常量 ----------
const BRANCH_CHARS = '子丑寅卯辰巳午未申酉戌亥'
const BRIGHTNESS_SCORE: Record<string, number> = {
  庙: 6, 旺: 5, 得: 4, 利: 3, 平: 2, 不得: 1, 陷: 0
}
const SIX_AUSPICIOUS = ['左辅', '右弼', '文昌', '文曲', '天魁', '天钺']
const SIX_OMINOUS = ['擎羊', '陀罗', '火星', '铃星', '地空', '地劫']
const KEY_ADJECTIVE = ['红鸾', '天喜', '咸池', '天姚', '华盖', '孤辰', '寡宿', '截空', '旬空']

// 命宫单星星性速断（仅在组合格局未覆盖时使用）
const SINGLE_STAR_NOTE: Record<string, string> = {
  紫微: '帝王之星守命，主尊贵好强、有领导力，宜防孤傲',
  天机: '机星守命，主聪明善谋、心思灵巧，宜防多虑多变',
  太阳: '太阳守命，主热情博爱、光明正直，庙旺利公职社交',
  武曲: '武曲守命，主刚毅务实、善理财，宜防刚硬孤克',
  天同: '天同守命，主温和福星、重感情享受，宜防懒散',
  廉贞: '廉贞守命，主能干要强、次桃花，宜防脾气与纠结',
  天府: '天府守命，主稳重包容、府库丰足，一生多安稳',
  太阴: '太阴守命，主温柔细腻、重情顾家，庙旺得阴贵、利田宅财富',
  贪狼: '贪狼守命，主多才多欲、善交际，宜防贪多务得',
  巨门: '巨门守命，主口才细密、善分析，宜防口舌是非',
  天相: '天相守命，主正直谨慎、印星助人，多逢贵人',
  天梁: '天梁守命，主老成正直、荫星逢凶化吉，宜公职教育',
  七杀: '七杀守命，主刚强果决、独立开创，宜防孤克冒险',
  破军: '破军守命，主破旧立新、敢作敢当，一生变动中成事'
}

// 四化落宫意象（宫位 → [禄,权,科,忌]）
const TRANSFORM_IMAGERY: Record<string, [string, string, string, string]> = {
  命宫: ['个性圆融、福缘丰厚', '主见强、具开创掌控力', '名声好、举止有度', '个性多忧思、易自我设限'],
  兄弟: ['手足缘厚、朋友助力多', '在同辈中有威望', '与朋友相处和睦有声名', '手足朋友缘薄、易有金钱纠葛'],
  夫妻: ['配偶条件佳、感情顺遂', '配偶强势、宜沟通协调', '配偶斯文有名声、关系平和', '感情多波折、需多包容经营'],
  子女: ['子女缘厚、桃花旺', '子女有主见能独立', '子女好学有名', '子女操心、合伙缘薄'],
  财帛: ['求财顺遂、财源广', '善理财、求财积极', '以名声专业得财', '求财多阻滞、破财之虑'],
  疾厄: ['身心安泰', '体质偏强、注意过劳', '遇病有良医', '注意慢性痼疾、情绪内耗'],
  迁移: ['出外逢贵、外缘佳', '在外有表现、可掌权', '在外有口碑', '出外奔波多阻、宜守不宜躁'],
  仆役: ['下属朋友得力', '能领导部属', '交友有声名', '防部属朋友背弃'],
  官禄: ['事业顺遂、升迁机会多', '事业心强、可独当一面', '靠专业名声立身', '事业多变动压力、防文书失误'],
  田宅: ['家业丰、置产顺利', '掌家有方', '家居环境名声好', '房产多波折、家中多操心'],
  福德: ['福厚乐天、享受人生', '心性刚强主见高', '志趣清雅', '多虑失眠、精神负担重'],
  父母: ['父母庇荫厚、长辈缘佳', '父母强势、家教严', '父母有文名、关系平和', '与父母缘薄或长辈助力少']
}

// ---------- 排盘 ----------
function branchToIndex(branch: string): number {
  return (BRANCH_CHARS.indexOf(branch) - 2 + 12) % 12
}

function mapStar(s: Record<string, unknown>): ZwStar {
  return {
    name: String(s.name),
    brightness: String(s.brightness || ''),
    mutagen: (s.mutagen as ZwStar['mutagen']) || ''
  }
}

/**
 * 公历 → 紫微命盘（纯可序列化数据）。
 * 真太阳时：显式 timezoneOffset（分钟）优先；否则由 birthLng + birthZone（tzdata 历史偏移）计算
 */
export function paipanZiwei(
  input: ZwChart['input'] & {
    timezoneOffset?: number
    birthLng?: number
    birthZone?: string
  }
): ZwChart {
  let { year, month, day, hour } = input
  let timezoneOffsetApplied = 0
  if (input.timezoneOffset !== undefined) {
    timezoneOffsetApplied = input.timezoneOffset
  } else if (input.birthLng !== undefined) {
    timezoneOffsetApplied = trueSolarOffsetMinutes(
      input.birthLng, input.birthZone || DEFAULT_ZONE,
      { year: input.year, month: input.month, day: input.day, hour: input.hour, minute: input.minute }
    )
  }
  if (timezoneOffsetApplied) {
    const d = new Date(input.year, input.month - 1, input.day, input.hour, input.minute, 0)
    const a = new Date(d.getTime() + timezoneOffsetApplied * 60000)
    year = a.getFullYear(); month = a.getMonth() + 1; day = a.getDate(); hour = a.getHours()
  }
  // 时辰索引：iztro 0=子时，7=未时，8=申时…23点归入子时
  const timeIndex = hour === 23 ? 0 : Math.floor((hour + 1) / 2)
  let dateStr = `${year}-${month}-${day}`
  // ★ 晚子时（2026-10-07 拍板，全产品统一）：校正后当地 23:00 起即归次日，
  // 与 paipan 的 setSect(1) 同一约定。用 Date.UTC 做日历日 +1，勿用毫秒+86400000（跨DST会错）。
  // timeIndex 保持 0（仍是子时），变的只是归哪一天。
  if (hour === 23) {
    const t = new Date(Date.UTC(year, month - 1, day + 1))
    dateStr = `${t.getUTCFullYear()}-${t.getUTCMonth() + 1}-${t.getUTCDate()}`
  }
  const gender = input.gender === 1 ? '男' : '女'

  const astrolabe = astro.astrolabeBySolarDate(dateStr, timeIndex, gender) as unknown as {
    lunarDate: string
    chineseDate: string
    zodiac: string
    sign: string
    fiveElementsClass: string
    soul: string
    body: string
    palaces: Array<{
      index: number
      name: string
      heavenlyStem: string
      earthlyBranch: string
      isBodyPalace: boolean
      majorStars: Array<Record<string, unknown>>
      minorStars: Array<Record<string, unknown>>
      adjectiveStars: Array<Record<string, unknown>>
      changsheng12: string
      decadal: { range: [number, number] }
      ages: number[]
    }>
  }

  const palaces: ZwPalace[] = astrolabe.palaces.map((p) => ({
    index: p.index,
    name: p.name,
    heavenlyStem: p.heavenlyStem,
    earthlyBranch: p.earthlyBranch,
    ganZhi: p.heavenlyStem + p.earthlyBranch,
    isBodyPalace: p.isBodyPalace,
    majorStars: p.majorStars.map(mapStar),
    minorStars: p.minorStars.map(mapStar),
    adjectiveStars: p.adjectiveStars
      .map((s) => String(s.name))
      .filter((n) => KEY_ADJECTIVE.includes(n)),
    changsheng12: p.changsheng12,
    decadalRange: p.decadal.range,
    ages: p.ages
  }))

  return {
    input,
    timezoneOffsetApplied,
    ziweiDateStr: dateStr,
    ziweiTimeIndex: timeIndex,
    lunarDate: astrolabe.lunarDate,
    chineseDate: astrolabe.chineseDate,
    zodiac: astrolabe.zodiac,
    sign: astrolabe.sign,
    fiveElementsClass: astrolabe.fiveElementsClass,
    soul: astrolabe.soul,
    body: astrolabe.body,
    palaces,
    mingIndex: palaces.findIndex((p) => p.name === '命宫')
  }
}

// ---------- 工具 ----------
function palaceStarNames(p: ZwPalace): string[] {
  return [...p.majorStars, ...p.minorStars].map((s) => s.name)
}

/** 三方四正：命宫外，三合(±4)与对宫(+6) */
function quartetIndices(mingIndex: number): number[] {
  return [mingIndex, (mingIndex + 4) % 12, (mingIndex + 8) % 12, (mingIndex + 6) % 12]
}

function starPalace(chart: ZwChart, starName: string): ZwPalace | undefined {
  return chart.palaces.find((p) => palaceStarNames(p).includes(starName))
}

// ---------- 格局判定（确定性硬规则） ----------
function detectPatterns(chart: ZwChart): PatternTag[] {
  const { palaces, mingIndex } = chart
  const ming = palaces[mingIndex]
  const q = quartetIndices(mingIndex).map((i) => palaces[i])
  const qSet = new Set(q.flatMap(palaceStarNames))
  const mingNames = palaceStarNames(ming)
  const out: PatternTag[] = []
  const add = (
    name: string,
    level: PatternTag['level'],
    note: string,
    extra?: Pick<PatternTag, 'required' | 'bonus' | 'breaking' | 'source' | 'basisLevel'>
  ) => out.push({ name, level, note, ...extra })

  const has = (s: string) => mingNames.includes(s)
  const quartetHas = (s: string) => qSet.has(s)
  const quartetHasLu = q.some((p) =>
    [...p.majorStars, ...p.minorStars].some((s) => s.mutagen === '禄')
  )
  const togetherInQuartet = (a: string, b: string) =>
    q.some((p) => palaceStarNames(p).includes(a) && palaceStarNames(p).includes(b))

  // 命宫双星经典组合
  if (has('紫微') && has('天府')) add('紫府同宫格', '吉', '紫微天府同守命宫，帝王府库相会，主尊贵稳重、事业家业两稳', { required: ['紫微与天府同守命宫'], source: '《紫微斗数全书·诸星问答论》', basisLevel: '古籍' })
  else if (has('紫微') && has('七杀')) add('紫微七杀格', '吉', '化杀为权，主刚柔并济、有将帅之才，事业心极强', { required: ['紫微与七杀同守命宫'], source: '《紫微斗数全书·诸星问答论》', basisLevel: '古籍' })
  else if (has('紫微') && has('贪狼')) add('紫微贪狼格', '平', '桃花犯主，主多才多艺、交际强，须防欲望过多、沉迷享乐', { required: ['紫微与贪狼同守命宫'], breaking: ['煞星同宫则桃花带忌'], source: '《紫微斗数全书·诸星问答论》', basisLevel: '古籍' })
  else if (has('紫微') && has('破军')) add('紫微破军格', '吉', '君逸臣劳，主破旧立新、胆识过人，人生起伏中得成', { required: ['紫微与破军同守命宫'], source: '《紫微斗数全书·诸星问答论》', basisLevel: '古籍' })
  else if (has('紫微') && has('天相')) add('紫相朝垣格', '吉', '紫微天相同宫，主稳重可靠、贵人扶持，宜公职管理', { required: ['紫微与天相同守命宫'], source: '《紫微斗数全集·卷二》', basisLevel: '古籍' })
  if (has('武曲') && has('贪狼')) add('武贪同行格', '平', '武曲贪狼守命，主晚发、多才艺，不发少年人，三十后方兴', { required: ['武曲与贪狼同守命宫'], breaking: ['火星铃星同宫则转火贪格'], source: '《紫微斗数全书·诸星问答论》', basisLevel: '古籍' })
  if (has('天机') && has('巨门')) add('巨机同临格', '吉', '天机巨门同守，主口才机辩、善策划，宜以口、以智立身', { required: ['天机与巨门同守命宫'], source: '《紫微斗数全书·诸星问答论》', basisLevel: '古籍' })
  if (has('廉贞') && has('贪狼')) add('廉贞贪狼格', '平', '桃花艺术之格，主风流多才、人缘佳，须自持防情色之扰', { required: ['廉贞与贪狼同守命宫'], breaking: ['逢煞星则桃花带忌'], source: '《紫微斗数全书·诸星问答论》', basisLevel: '古籍' })
  if (has('廉贞') && has('七杀')) add('廉贞七杀格', '平', '埋尸格之说今取其开创义：主冲劲足、能吃苦，宜技术/军警，注意安全', { required: ['廉贞与七杀同守命宫'], source: '《紫微斗数全集·卷三》', basisLevel: '古籍' })
  if (has('太阳') && has('太阴')) {
    const sun = ming.majorStars.find((s) => s.name === '太阳')
    const moon = ming.majorStars.find((s) => s.name === '太阴')
    if (sun && moon && BRIGHTNESS_SCORE[sun.brightness] >= 4 && BRIGHTNESS_SCORE[moon.brightness] >= 4) {
      add('日月并明格', '吉', '太阳太阴同宫皆明，主阴阳调和、名利双辉', { required: ['太阳与太阴同守命宫', '二星皆庙旺'], breaking: ['二星落陷则转日月反背'], source: '《紫微斗数全书·诸星问答论》', basisLevel: '古籍' })
    } else if (sun && moon && BRIGHTNESS_SCORE[sun.brightness] <= 1 && BRIGHTNESS_SCORE[moon.brightness] <= 1) {
      add('日月反背格', '忌', '日月俱陷，主劳碌奔波、六亲缘较薄，宜修身敬业、量力而行', { required: ['太阳与太阴同守命宫', '二星皆落陷'], source: '《紫微斗数全书·诸星问答论》', basisLevel: '古籍' })
    } else {
      add('日月同宫格', '平', '太阳太阴同守，主性格多面、刚柔兼具，吉凶看庙陷与四化', { required: ['太阳与太阴同守命宫'], source: '《紫微斗数全书·诸星问答论》', basisLevel: '古籍' })
    }
  }
  if (has('天同') && has('天梁')) add('同梁巳亥格', '平', '天同天梁守命，主温和善良、逢凶化吉，防安于现状', { required: ['天同与天梁同守命宫', '命宫在巳或亥'], source: '《紫微斗数全书·诸星问答论》', basisLevel: '古籍' })
  if (has('天同') && has('太阴')) add('同阴格', '吉', '天同太阴守命，主温柔细腻、福气丰厚，女性尤美', { required: ['天同与太阴同守命宫'], source: '《紫微斗数全书·诸星问答论》', basisLevel: '古籍' })

  // 命宫单星名格
  if (has('破军') && (ming.earthlyBranch === '子' || ming.earthlyBranch === '午') &&
    ming.majorStars.some((s) => s.name === '破军' && BRIGHTNESS_SCORE[s.brightness] >= 5)) {
    add('英星入庙格', '吉', '破军庙旺守子午，主大刀阔斧、建功立业', { required: ['破军独守命宫', '命宫在子或午', '破军庙旺'], source: '《紫微斗数全书·诸星问答论》', basisLevel: '古籍' })
  }
  if (has('巨门') && (ming.earthlyBranch === '子' || ming.earthlyBranch === '午')) {
    add('石中隐玉格', '吉', '巨门守子午，主先困后显、以口才专业成名', { required: ['巨门独守命宫', '命宫在子或午'], source: '《紫微斗数全集·卷三》', basisLevel: '古籍' })
  }

  // 三方四正会照之格
  const mingSoloMajor = ming.majorStars.map((s) => s.name)
  if (['七杀', '破军', '贪狼'].some((s) => mingSoloMajor.includes(s))) {
    add('杀破狼格', '平', '命宫居杀破狼局，主变动开创、不甘平庸，一生变化大、机遇风险并存', { required: ['命宫有七杀或破军或贪狼'], source: '《紫微斗数全书·诸星问答论》', basisLevel: '古籍' })
  }
  if (['天机', '天同', '天梁'].every((s) => quartetHas(s)) && quartetHas('太阴') &&
    !['七杀', '破军', '贪狼'].some((s) => mingSoloMajor.includes(s))) {
    add('机月同梁格', '吉', '三方会天机、太阴、天同、天梁，主稳健谋断，宜公职、企划、幕僚', { required: ['三方四正会齐天机、太阴、天同、天梁'], breaking: ['命宫居杀破狼则不入此格'], source: '《紫微斗数全书·诸星问答论》', basisLevel: '古籍' })
  }
  if (quartetHas('紫微') && quartetHas('天府') && !mingSoloMajor.includes('紫微') && !mingSoloMajor.includes('天府')) {
    add('紫府朝垣格', '吉', '紫微天府三方来朝，主尊贵有格局、事业层次高', { required: ['紫微天府在三方四正会照命宫', '紫微天府不在命宫同守'], source: '《紫微斗数全集·卷二》', basisLevel: '古籍' })
  }
  if (quartetHas('天府') && quartetHas('天相')) add('府相朝垣格', '吉', '天府天相朝拱，主稳重富足、贵人多助', { required: ['天府天相在三方四正会照命宫'], source: '《紫微斗数全集·卷二》', basisLevel: '古籍' })
  if (quartetHas('太阳') && quartetHas('天梁') && quartetHas('文昌') && quartetHasLu) {
    add('阳梁昌禄格', '吉', '太阳天梁文昌化禄相会，主学问考试运佳、以文才取贵', { required: ['三方四正会太阳、天梁、文昌', '有化禄同会'], source: '《紫微斗数全集·卷三》', basisLevel: '古籍' })
  }
  if (togetherInQuartet('贪狼', '火星')) add('火贪格', '吉', '贪狼火星同宫，暴发之格，主横发机遇，亦防横发横破', { required: ['贪狼与火星同宫于三方四正'], breaking: ['逢地空地劫则横发横破'], source: '《紫微斗数全书·诸星问答论》', basisLevel: '古籍' })
  if (togetherInQuartet('贪狼', '铃星')) add('铃贪格', '吉', '贪狼铃星同宫，主晚成爆发、异路功名', { required: ['贪狼与铃星同宫于三方四正'], source: '《紫微斗数全书·诸星问答论》', basisLevel: '古籍' })
  if (has('左辅') && has('右弼')) add('左右守命格', '吉', '左辅右弼同守命宫，主助力多、事业稳', { required: ['左辅与右弼同守命宫'], source: '《紫微斗数全书·诸星问答论》', basisLevel: '古籍' })
  if (has('文昌') && has('文曲')) add('昌曲同宫格', '吉', '文昌文曲同守，主聪明好学、才艺文章', { required: ['文昌与文曲同守命宫'], source: '《紫微斗数全书·诸星问答论》', basisLevel: '古籍' })
  if (has('天魁') && has('天钺')) add('魁钺守命格', '吉', '天魁天钺同守，主贵人提携、逢凶化吉', { required: ['天魁与天钺同守命宫'], source: '《紫微斗数全书·诸星问答论》', basisLevel: '古籍' })

  // 破格警示（辨单星/双星，不夸大）
  const hasYang = has('擎羊')
  const hasTuo = has('陀罗')
  if (hasYang && hasTuo) add('羊陀守命', '忌', '擎羊陀罗同守命宫，主性格刚直中带纠结，注意人际与外伤', { required: ['擎羊与陀罗同守命宫'], source: '《紫微斗数全书·诸星问答论》', basisLevel: '古籍' })
  else if (hasYang) add('擎羊守命', '忌', '擎羊守命宫，主果决刚毅，防言语伤人及金属外伤，宜修养耐性', { required: ['擎羊守命宫'], source: '《紫微斗数全书·诸星问答论》', basisLevel: '古籍' })
  else if (hasTuo) add('陀罗守命', '忌', '陀罗守命宫，主心思反复、行事多拖延，宜果断行动、避免内耗', { required: ['陀罗守命宫'], source: '《紫微斗数全书·诸星问答论》', basisLevel: '古籍' })

  const hasHuo = has('火星')
  const hasLing = has('铃星')
  if (hasHuo && hasLing) add('火铃守命', '平', '火星铃星同守命宫，主刚烈急躁有爆发力，宜动中求成、修身养性', { required: ['火星与铃星同守命宫'], source: '《紫微斗数全书·诸星问答论》', basisLevel: '古籍' })
  else if (hasHuo) add('火星守命', '平', '火星守命宫，主性急直率、行动快，宜戒躁、以行动力成事', { required: ['火星守命宫'], source: '《紫微斗数全书·诸星问答论》', basisLevel: '古籍' })
  else if (hasLing) add('铃星守命', '平', '铃星守命宫，主内敛倔強、暗火内蕴，宜疏导情绪、开朗心胸', { required: ['铃星守命宫'], source: '《紫微斗数全书·诸星问答论》', basisLevel: '古籍' })

  if (ming.earthlyBranch === '午' && hasYang) add('马头带箭格', '平', '擎羊守午宫，主威权立功，亦主奔波辛苦', { required: ['擎羊守命宫', '命宫在午'], source: '《紫微斗数全集·卷三》', basisLevel: '古籍' })
  if (has('地空') || has('地劫')) add('空劫守命', '忌', '地空地劫守命宫，主理想高、钱财起伏大，宜技术立身、忌投机', { required: ['地空或地劫守命宫'], source: '《紫微斗数全书·诸星问答论》', basisLevel: '古籍' })

  // 夹命类六条：命宫前后两宫（±1）分居指定星对
  const prevIdx = (mingIndex + 12 - 1) % 12
  const nextIdx = (mingIndex + 1) % 12
  const prevStars = new Set(palaceStarNames(palaces[prevIdx]))
  const nextStars = new Set(palaceStarNames(palaces[nextIdx]))
  const isFlankedBy = (a: string, b: string) =>
    (prevStars.has(a) && nextStars.has(b)) || (prevStars.has(b) && nextStars.has(a))

  if (isFlankedBy('太阳', '太阴')) add('日月夹命格', '吉', '太阳太阴分居命宫前后，主阴阳调和、贵气相扶，主得长辈提携', { required: ['太阳与太阴分居命宫前后两宫'], source: '《紫微斗数全书·诸星问答论》', basisLevel: '古籍' })
  if (isFlankedBy('左辅', '右弼')) add('辅弼夹命格', '吉', '左辅右弼分居命宫前后，主助力多、众人扶持', { required: ['左辅与右弼分居命宫前后两宫'], source: '《紫微斗数全书·诸星问答论》', basisLevel: '古籍' })
  if (isFlankedBy('文昌', '文曲')) add('昌曲夹命格', '吉', '文昌文曲分居命宫前后，主聪明好学、才华出众', { required: ['文昌与文曲分居命宫前后两宫'], source: '《紫微斗数全书·诸星问答论》', basisLevel: '古籍' })
  if (isFlankedBy('天魁', '天钺')) add('魁钺夹命格', '吉', '天魁天钺分居命宫前后，主贵人扶持、逢凶化吉', { required: ['天魁与天钺分居命宫前后两宫'], source: '《紫微斗数全书·诸星问答论》', basisLevel: '古籍' })
  if (isFlankedBy('火星', '铃星')) add('火铃夹命格', '平', '火星铃星分居命宫前后，主刚烈有冲劲，亦防急躁生波', { required: ['火星与铃星分居命宫前后两宫'], breaking: ['命宫主星落陷则煞气加重'], source: '《紫微斗数全书·诸星问答论》', basisLevel: '古籍' })
  if (isFlankedBy('地空', '地劫')) add('空劫夹命格', '忌', '地空地劫分居命宫前后，主理想高远但钱财波动大，宜踏实经营', { required: ['地空与地劫分居命宫前后两宫'], source: '《紫微斗数全书·诸星问答论》', basisLevel: '古籍' })

  // 命宫单星（未被组合格局覆盖者）补一条星性论断
  const hasPattern = (name: string) => out.some((p) => p.name === name)
  const comboCovered = ['紫微', '天府', '七杀', '贪狼', '破军', '天相', '武曲', '天机', '巨门',
    '廉贞', '太阳', '太阴', '天同', '天梁'].filter((s) =>
      out.some((p) => p.note.includes(s) || p.name.includes(s))
      || (hasPattern('杀破狼格') && ['七杀', '破军', '贪狼'].includes(s))
      || (hasPattern('机月同梁格') && ['天机', '天同', '天梁'].includes(s))
    )
  ming.majorStars.forEach((s) => {
    if (comboCovered.includes(s.name)) return
    const bright = BRIGHTNESS_SCORE[s.brightness] ?? 2
    const level: PatternTag['level'] = bright >= 4 ? '吉' : bright >= 2 ? '平' : '忌'
    add(
      `${s.name}守命格`,
      level,
      `${SINGLE_STAR_NOTE[s.name] || '主星守命'}；${s.brightness ? '星曜' + s.brightness : ''}` +
      `${s.mutagen ? '，又逢化' + s.mutagen : ''}`,
      { required: [`${s.name}守命宫`, `未被组合格局覆盖`], basisLevel: '通行做法' }
    )
  })

  if (mingSoloMajor.length === 0) add('命无主星', '平', '命宫无主星，借对宫主星为用，主适应性强、受环境影响大，吉凶看对宫', { required: ['命宫无十四主星'], basisLevel: '通行做法' })

  // 无任何标签时给一个基础描述
  if (out.length === 0) add('平和守成之局', '平', '命宫星曜组合平和，无大格亦无大破，主踏实经营、稳中求进', { required: ['命宫无特殊格局亦无煞星'], basisLevel: '产品设定' })

  return out
}

// ---------- 四化 ----------
function collectTransforms(chart: ZwChart): TransformEntry[] {
  const out: TransformEntry[] = []
  for (const p of chart.palaces) {
    for (const s of [...p.majorStars, ...p.minorStars]) {
      if (s.mutagen) {
        const imagery = TRANSFORM_IMAGERY[p.name]
        const idx = ['禄', '权', '科', '忌'].indexOf(s.mutagen)
        out.push({
          star: s.name,
          type: s.mutagen,
          palace: p.name,
          note: imagery ? imagery[idx] : ''
        })
      }
    }
  }
  return out
}

// ---------- 宫位解读 ----------
function readPalace(p: ZwPalace): PalaceRead {
  const stars = p.majorStars.map(
    (s) => `${s.name}${s.brightness ? '(' + s.brightness + ')' : ''}${s.mutagen ? '·化' + s.mutagen : ''}`
  )
  const auspicious: string[] = []
  const ominous: string[] = []
  p.minorStars.forEach((s) => {
    if (SIX_AUSPICIOUS.includes(s.name) || s.name === '禄存' || s.name === '天马') {
      auspicious.push(s.name + (s.mutagen ? '·化' + s.mutagen : ''))
    }
    if (SIX_OMINOUS.includes(s.name)) ominous.push(s.name)
  })
  p.adjectiveStars.forEach((n) => {
    if (['红鸾', '天喜', '华盖'].includes(n)) auspicious.push(n)
    if (['咸池', '天姚', '孤辰', '寡宿'].includes(n)) ominous.push(n)
  })

  const tags: string[] = []
  if (p.majorStars.some((s) => s.mutagen === '禄')) tags.push('化禄·顺遂')
  if (p.majorStars.some((s) => s.mutagen === '权')) tags.push('化权·掌权')
  if (p.majorStars.some((s) => s.mutagen === '科')) tags.push('化科·名声')
  if (p.majorStars.some((s) => s.mutagen === '忌')) tags.push('化忌·阻滞')
  if (stars.length === 0) tags.push('空宫借对')
  if (auspicious.includes('禄存')) tags.push('禄存·稳守')
  if (auspicious.includes('天马')) tags.push('天马·动象')
  if (auspicious.includes('红鸾') || auspicious.includes('天喜')) tags.push('桃花喜曜')
  if (ominous.includes('地空') || ominous.includes('地劫')) tags.push('空劫·波动')
  if (ominous.includes('擎羊') || ominous.includes('陀罗')) tags.push('羊陀·磨砺')
  if (ominous.includes('火星') || ominous.includes('铃星')) tags.push('火铃·急躁')
  if (p.majorStars.every((s) => BRIGHTNESS_SCORE[s.brightness] >= 4)) tags.push('星曜得地')
  if (p.majorStars.some((s) => BRIGHTNESS_SCORE[s.brightness] <= 1)) tags.push('星曜落陷')

  return { name: p.name, empty: stars.length === 0, stars, auspicious, ominous, tags }
}

// ---------- 气势评分 ----------
function scoreChart(chart: ZwChart): { score: number; label: string } {
  const { palaces, mingIndex } = chart
  const ming = palaces[mingIndex]
  let score = 60

  // 命宫主星亮度
  if (ming.majorStars.length) {
    const avg = ming.majorStars.reduce((sum, s) => sum + (BRIGHTNESS_SCORE[s.brightness] ?? 2), 0) / ming.majorStars.length
    score += (avg - 3) * 4
  }

  // 命宫四化
  ming.majorStars.forEach((s) => {
    if (s.mutagen === '禄') score += 8
    if (s.mutagen === '权') score += 7
    if (s.mutagen === '科') score += 6
    if (s.mutagen === '忌') score -= 10
  })

  // 三方四正
  const quartet = quartetIndices(mingIndex).map((i) => palaces[i])
  quartet.slice(1).forEach((p) => {
    ;[...p.majorStars, ...p.minorStars].forEach((s) => {
      if (['禄', '权', '科'].includes(s.mutagen)) score += 4
      if (s.mutagen === '忌') score -= 6
    })
    p.minorStars.forEach((s) => {
      if (SIX_AUSPICIOUS.includes(s.name)) score += 1
      if (['地空', '地劫'].includes(s.name)) score -= 1.5
      if (['擎羊', '陀罗', '火星', '铃星'].includes(s.name)) score -= 1
    })
  })

  // 命宫辅星
  ming.minorStars.forEach((s) => {
    if (SIX_AUSPICIOUS.includes(s.name)) score += 3
    if (s.name === '禄存') score += 3
    if (s.name === '天马') score += 2
    if (['地空', '地劫'].includes(s.name)) score -= 5
    if (['擎羊', '陀罗'].includes(s.name)) score -= 4
    if (['火星', '铃星'].includes(s.name)) score -= 3
  })

  score = Math.max(0, Math.min(100, Math.round(score)))
  const label =
    score >= 85 ? '上格之命'
      : score >= 75 ? '中上格局'
        : score >= 65 ? '格局稳健'
          : score >= 50 ? '格局平常，宜经营'
            : '波折较多，宜守正修身'
  return { score, label }
}

// ---------- 大限流年 ----------
function buildPeriod(
  chart: ZwChart,
  raw: { heavenlyStem: string; earthlyBranch: string; mutagen: string[]; range?: [number, number] },
  title: string
): PeriodRead {
  const idx = branchToIndex(raw.earthlyBranch)
  const base = chart.palaces[idx]
  const stars = readPalace(base)
  const range = raw.range ? `${raw.range[0]}-${raw.range[1]}岁` : ''

  const transforms = raw.mutagen.map((star, i) => {
    const type = ['禄', '权', '科', '忌'][i]
    const p = starPalace(chart, star)
    return `${type}：${star}→${p ? p.name : '?'}`
  })

  const tags = [...stars.tags]
  if (stars.auspicious.length) tags.push('吉星:' + stars.auspicious.slice(0, 3).join('、'))
  if (stars.ominous.length) tags.push('煞星:' + stars.ominous.slice(0, 3).join('、'))

  return {
    title,
    ganZhi: raw.heavenlyStem + raw.earthlyBranch,
    basePalace: base.name,
    range,
    stars: stars.stars.length ? stars.stars : ['空宫（借对宫' + chart.palaces[(idx + 6) % 12].name + '）'],
    transforms,
    tags
  }
}

// ---------- 主分析入口 ----------
export function analyzeZiwei(chart: ZwChart, now: Date): ZiweiAnalysis {
  const patterns = detectPatterns(chart)
  const transforms = collectTransforms(chart)
  const { score, label } = scoreChart(chart)

  const keyPalaceNames = ['命宫', '官禄', '财帛', '夫妻', '迁移', '福德', '疾厄'] as const
  const palaces = Object.fromEntries(
    keyPalaceNames.map((name) => {
      const p = chart.palaces.find((x) => x.name === name)!
      return [name, readPalace(p)]
    })
  ) as ZiweiAnalysis['palaces']

  // iztro 运限
  // ★ 单一事实源（P0 修复 2026-10-07；见 docs/交接记录/13-日运日签/P0-紫微盘重复构建.md）：
  //   构建参数只能读 chart.ziweiDateStr / chart.ziweiTimeIndex（已含真太阳时校正＋晚子时推进）。
  //   【禁止从 chart.input 重新推导】——那是原始未校正值，曾导致返回的盘与运限所用的盘
  //   不是同一个（乌鲁木齐/拉萨/喀什出生者 100% 中招）。守护断言见 test-dayboundary-accept.mjs。
  const astrolabe = astro.astrolabeBySolarDate(
    chart.ziweiDateStr,
    chart.ziweiTimeIndex,
    chart.input.gender === 1 ? '男' : '女'
  ) as unknown as {
    horoscope: (d: Date) => {
      decadal: { index: number; heavenlyStem: string; earthlyBranch: string; mutagen: string[] }
      yearly: { index: number; heavenlyStem: string; earthlyBranch: string; mutagen: string[] }
      age: { index: number; nominalAge: number; heavenlyStem: string; earthlyBranch: string }
    }
  }
  const h = astrolabe.horoscope(now)

  const decadalRange = chart.palaces[branchToIndex(h.decadal.earthlyBranch)].decadalRange
  const decadal = buildPeriod(chart, { ...h.decadal, range: decadalRange }, `当前大限（${now.getFullYear()}年所在运限）`)
  const yearly = buildPeriod(
    chart,
    { ...h.yearly },
    `${now.getFullYear()}年流年`
  )
  const xxIdx = branchToIndex(h.age.earthlyBranch)

  return {
    patterns,
    transforms,
    palaces,
    score,
    scoreLabel: label,
    decadal,
    yearly,
    xiaoxian: {
      nominalAge: h.age.nominalAge,
      basePalace: chart.palaces[xxIdx].name,
      ganZhi: h.age.heavenlyStem + h.age.earthlyBranch
    }
  }
}
