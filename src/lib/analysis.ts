// 付费分析引擎 - 六书精要（《子平真诠》《滴天髓》《穷通宝鉴》《渊海子平》《三命通会》《千里命稿》）
import { Solar } from 'lunar-javascript'
import type { PaipanResult } from './paipan'
// ★ 十神表复用 paipan.ts 的单一事实源（HANDOFF-个性化日运 §3.1），不再另抄一份
import { SHI_SHEN } from './paipan'
// ★ 冲/合表复用 branchRelations.ts 的单一事实源（HANDOFF-个性化日运 §二）
import { LIU_CHONG, LIU_HE } from './branchRelations'
import type { Zhi } from './branchRelations'

// ★ 7 档吉凶判词：专供【大运】与【流年】（十年/一年尺度的时段判定）
export type FortuneTier = '大吉' | '吉' | '小吉' | '平' | '小凶' | '凶' | '大凶'

// 中性轻量标签：保留给【日运】与【流月】—— 两者定位不同，不参与吉凶分档
// ★ '大防' 当前无产出者（历史遗留）；日运 DAILY_TAGS 已明确排除；类型保留是因为 TAG_ADVICE: Record<LuckTag,…> 要求全键
export type LuckTag = '较宜' | '平顺' | '一般' | '宜慎' | '大防'

// 分维度倾向（事业/财运/健康/六亲各自独立，不合并为单一标签）
export type DomainTendency = '吉' | '平' | '滞'

export interface LuckDomain {
  tendency: DomainTendency
  note: string
}

// 喜用有效性四问（被合/被冲/被化/被夺/深藏/孤立）
export interface LuckValidity {
  yongHua: boolean          // 喜用被化（官印相生→官被印化）
  biJieDuoCai: boolean      // 比劫夺财
  caiXingShenCang: boolean  // 财星深藏不透
  zhiChong: boolean         // 运支冲原局（提纲/日支）
  xiYongBuChun: boolean     // 运支藏干含忌神，喜用不纯
  shiShangShiGu: boolean    // 食伤势孤
  guanShaGuLi: boolean      // 官杀孤立无财生
}

export interface LuckDaYunItem {
  ganZhi: string
  startYear: number
  endYear: number
  startAge: number
  shiShenGan: string     // 运干对日主十神
  shiShenZhi: string     // 运支本气对日主十神
  score: number
  tag: FortuneTier
  current: boolean
  relations: string[]
  note: string
  // 结构病与分维度（新增，§3.1/3.2）
  structuralIssues: string[]
  domains: Record<'career' | 'wealth' | 'health' | 'relation', LuckDomain>
}

export interface LuckLiuNianItem {
  year: number
  ganZhi: string
  shiShenGan: string
  shiShenZhi: string
  score: number
  tag: FortuneTier
  current: boolean
  isPast?: boolean       // 步骤⑤：是否为过去年份（过去用回顾性措辞）
  daYunGanZhi: string    // 该年所在大运
  relations: string[]
  note: string
  structuralIssues: string[]
}

export interface LuckLiuYueItem {
  month: number          // 公历月 1-12
  ganZhi: string
  jieQi: string          // 该流月起始节
  rangeLabel: string     // 公历起止
  shiShenGan: string
  score: number
  tag: LuckTag
  relations: string[]
  note: string
}

export interface LuckCycles {
  currentDaYunGanZhi: string
  // ★ 当年（与 liuNian 中 current 项的年份一致）。
  //   消费者一律读本字段取"当年"，严禁 liuNian[0]/slice(0,1) 按索引猜——
  //   流年范围已扩为「过去8年回看+未来三年」，数组首位是 8 年前（复核 2026-10-10：流月整体失效事故）。
  currentYear: number
  daYun: LuckDaYunItem[]
  liuNian: LuckLiuNianItem[]
  liuYue: LuckLiuYueItem[]
  /** ★ 三年流月表：当年 / 明年 / 后年各自 12 个月（键＝流年，值＝该年流月） */
  liuYueByYear: Record<number, LuckLiuYueItem[]>
}

export interface PaidAnalysis {
  overview: string        // 八字总览
  personality: string     // 性格天赋
  yongShen: string        // 用神喜忌
  geJuAnalysis: string    // 格局成败
  tiaoHou: string         // 调候用神
  daYunAnalysis: string   // 大运流年
  career: string          // 事业财运
  marriage: string        // 婚姻感情
  children: string        // 子女六亲
  health: string          // 健康提示
  luckCycles: LuckCycles  // 结构化岁运（大运/流年/流月，规则引擎确定性计算）
  similarCases?: import('./caseSearch').SimilarCase[] // 古籍相似命例（规则引擎检索，AI 不参与）
}

export type AnalyzableChart = PaipanResult & {
  analysis: {
    wangShuai: string
    geJu: string
    isPaid: boolean
    paid?: PaidAnalysis
  }
}

const GAN_WUXING: Record<string, string> = {
  '甲': '木', '乙': '木', '丙': '火', '丁': '火', '戊': '土',
  '己': '土', '庚': '金', '辛': '金', '壬': '水', '癸': '水'
}

const ZHI_WUXING: Record<string, string> = {
  '子': '水', '丑': '土', '寅': '木', '卯': '木', '辰': '土', '巳': '火',
  '午': '火', '未': '土', '申': '金', '酉': '金', '戌': '土', '亥': '水'
}

const CANG_GAN: Record<string, string[]> = {
  '子': ['癸'], '丑': ['己', '癸', '辛'], '寅': ['甲', '丙', '戊'], '卯': ['乙'],
  '辰': ['戊', '乙', '癸'], '巳': ['丙', '庚', '戊'], '午': ['丁', '己'], '未': ['己', '丁', '乙'],
  '申': ['庚', '壬', '戊'], '酉': ['辛'], '戌': ['戊', '辛', '丁'], '亥': ['壬', '甲']
}

// 日主性格描述（《滴天髓》性情章）
const DAY_MASTER_PERSONALITY: Record<string, string> = {
  '甲': '甲木为参天栋梁，性直而仁，有向上进取之心，富于正义感与领导力。然木旺则固执，木弱则飘摇，甲木日主多有不服输的骨气，做事讲究原则，但需防过于刚硬、不懂变通。',
  '乙': '乙木为花草藤萝，性柔而韧，善于适应环境，有艺术天赋与细腻感受力。乙木之人多温和有礼、善于察言观色，然柔中带刚，韧劲十足，遇强则绕、遇弱则扶，是典型的"外柔内刚"型。',
  '丙': '丙火为太阳普照，性烈而明，热情奔放、光明磊落，有感染力与号召力。丙火日主多慷慨豪爽、乐于助人，然火旺则急躁冲动、缺乏耐心，需修"静"字功夫以养其德。',
  '丁': '丁火为灯烛星火，性柔而暖，温和内敛、心思细腻，有持久的光热。丁火之人多彬彬有礼、善解人意，做事稳扎稳打，然火弱则多疑敏感、容易想太多，宜开阔心胸。',
  '戊': '戊土为城墙厚土，性重而稳，诚信厚重、包容大度，有担当与承载力。戊土日主多忠厚老实、值得信赖，然土旺则固执迟钝、不懂变通，需灵活处事以破其滞。',
  '己': '己土为田园沃土，性柔而育，温和包容、善于滋养，有默默奉献之德。己土之人多勤恳踏实、任劳任怨，然土弱则缺乏主见、易随波逐流，需立定脚跟以立其品。',
  '庚': '庚金为刀剑矿石，性刚而锐，果断坚毅、重义轻财，有侠义之风。庚金日主多豪爽义气、做事果决，然金旺则好勇斗狠、缺乏圆融，需以"柔"克刚以全其用。',
  '辛': '辛金为珠玉首饰，性柔而贵，精致细腻、追求完美，有审美天赋。辛金之人多聪明灵秀、注重品质，然金弱则虚荣好胜、过于计较，宜放下执念以养其雅。',
  '壬': '壬水为江河湖海，性猛而智，聪明机灵、足智多谋，有包容万物之量。壬水日主多思维敏捷、善于应变，然水旺则漂流不定、心机深沉，需定向归流以成其大。',
  '癸': '癸水为雨露甘泉，性柔而润，温柔细腻、润物无声，有隐性的智慧。癸水之人多内秀聪慧、感受力强，然水弱则多愁善感、缺乏魄力，宜养其刚以配其柔。'
}

// 十神性格加成
const TEN_GOD_PERSONALITY: Record<string, string> = {
  '正官': '循规蹈矩、责任心强、重视名誉地位',
  '七杀': '果敢决断、叛逆好胜、有开拓精神',
  '正财': '勤俭务实、重视积累、生活有条理',
  '偏财': '慷慨豪爽、善于交际、商业嗅觉灵敏',
  '正印': '仁慈宽厚、好学深思、有贵人运',
  '偏印': '思维独特、偏门才艺、内心敏感',
  '食神': '温和乐观、享受生活、有口福才艺',
  '伤官': '才华横溢、恃才傲物、不喜束缚',
  '比肩': '独立自主、自尊心强、朋友缘佳',
  '劫财': '个性鲜明、好胜心强、敢闯敢拼'
}

// 调候用神简表（《穷通宝鉴》日干×月支）
export const TIAO_HOU: Record<string, Record<string, string>> = {
  '甲': { '寅': '丙癸', '卯': '庚戊丁', '辰': '庚丁壬', '巳': '癸丁庚', '午': '癸丁庚', '未': '癸丁庚', '申': '庚丁壬', '酉': '庚丁丙', '戌': '庚甲丁', '亥': '庚丁丙', '子': '丁庚丙', '丑': '丁庚丙' },
  '乙': { '寅': '丙癸', '卯': '丙癸', '辰': '癸丙戊', '巳': '癸', '午': '癸丙', '未': '癸丙', '申': '丙癸己', '酉': '癸丙丁', '戌': '癸丙甲', '亥': '丙戊', '子': '丙戊', '丑': '丙戊' },
  '丙': { '寅': '壬庚', '卯': '壬己', '辰': '壬甲', '巳': '壬庚', '午': '壬庚', '未': '壬庚', '申': '壬甲', '酉': '壬癸', '戌': '甲壬', '亥': '甲戊', '子': '壬戊', '丑': '壬甲己' },
  '丁': { '寅': '甲庚', '卯': '庚甲', '辰': '甲庚', '巳': '甲庚', '午': '壬庚', '未': '甲壬庚', '申': '甲庚丙', '酉': '甲庚丙', '戌': '甲庚戊', '亥': '甲庚', '子': '甲庚', '丑': '甲庚' },
  '戊': { '寅': '丙甲癸', '卯': '丙甲癸', '辰': '甲丙癸', '巳': '甲丙癸', '午': '壬甲丙', '未': '癸丙甲', '申': '丙癸甲', '酉': '丙癸', '戌': '甲丙癸', '亥': '甲丙', '子': '丙甲', '丑': '丙甲' },
  '己': { '寅': '丙庚甲', '卯': '甲癸丙', '辰': '丙癸甲', '巳': '癸丙', '午': '癸丙', '未': '癸丙', '申': '丙癸', '酉': '丙癸', '戌': '甲丙癸', '亥': '丙甲戊', '子': '丙甲戊', '丑': '丙甲戊' },
  '庚': { '寅': '戊甲壬', '卯': '丁甲庚', '辰': '甲丁壬', '巳': '壬戊丙', '午': '壬癸', '未': '丁甲', '申': '丁甲', '酉': '丁甲丙', '戌': '甲壬', '亥': '丁丙', '子': '丁甲丙', '丑': '丙丁甲' },
  '辛': { '寅': '己壬庚', '卯': '壬甲', '辰': '壬甲', '巳': '壬甲癸', '午': '壬己癸', '未': '壬庚甲', '申': '壬甲戊', '酉': '壬甲', '戌': '壬甲', '亥': '壬丙', '子': '丙戊甲', '丑': '丙壬戊' },
  '壬': { '寅': '庚丙戊', '卯': '戊辛庚', '辰': '甲庚', '巳': '壬辛庚', '午': '癸庚辛', '未': '辛甲', '申': '戊丁', '酉': '甲庚', '戌': '甲丙', '亥': '戊丙', '子': '戊丙', '丑': '丙丁甲' },
  '癸': {  '寅': '辛丙', '卯': '庚辛', '辰': '丙辛甲', '巳': '辛', '午': '庚辛壬', '未': '庚辛壬', '申': '丁', '酉': '辛丙', '戌': '辛甲壬', '亥': '庚辛戊', '子': '丙辛', '丑': '丙丁甲' }
}

/**
 * 调候用神五行（按《穷通宝鉴》日干×月支表，主次有序、去重）。
 * 供 geo 评分等模块使用：天干 → 五行映射在此处完成，调用方只拿到「五行」列表。
 * 无表数据时返回空数组（调用方按无调候处理，不得报错）。
 */
export function tiaoHouWuxing(dayGan: string, monthZhi: string): string[] {
  const s = TIAO_HOU[dayGan]?.[monthZhi]
  if (!s) return []
  const out: string[] = []
  for (const g of s.split('')) {
    const wx = GAN_WUXING[g]
    if (wx && !out.includes(wx)) out.push(wx)
  }
  return out
}

const MONTH_DISEASE: Record<string, string> = {
  '寅': '初春余寒未尽，需丙火暖局', '卯': '仲春阳气渐盛，滋养为先',
  '辰': '暮春湿土渐旺，需防木湿', '巳': '初夏火势渐炎，水神渐要',
  '午': '仲夏炎威鼎盛，最喜水来调候', '未': '暮夏燥热未退，润泽为急',
  '申': '初秋金气始肃', '酉': '仲秋金气肃杀，喜火锻炼',
  '戌': '暮秋燥土司令，喜水润局', '亥': '初冬寒气始凝，喜丙暖局',
  '子': '仲冬严寒冰冻，急需丙丁解冻', '丑': '暮冬寒气凛冽，丙火不可缺'
}

// 格局喜忌（《子平真诠》善顺恶逆）
const GE_JU_RULES: Record<string, { shunNi: string; quote: string; xiang: string[]; ji: string[]; yongFa: string }> = {
  '正官格': { shunNi: '善神顺用', quote: '官星者，贵气也', xiang: ['正财', '偏财', '正印', '偏印'], ji: ['伤官', '七杀'], yongFa: '喜财印相护：财生官、印护身；忌伤官克官、官杀混杂' },
  '七杀格': { shunNi: '恶神逆用', quote: '杀以攻身，似非美物，而大贵之格多存七杀', xiang: ['食神', '伤官', '正印', '偏印'], ji: ['正官'], yongFa: '以食神制杀或印星化杀为上；忌官杀混杂、身弱杀重无制化' },
  '正财格': { shunNi: '善神顺用', quote: '财为我克，不可夺也', xiang: ['食神', '伤官', '正官'], ji: ['比肩', '劫财'], yongFa: '喜食伤生财、官星护财；忌比劫分夺' },
  '偏财格': { shunNi: '善神顺用', quote: '偏财者，众人之财也', xiang: ['食神', '伤官', '正官'], ji: ['比肩', '劫财'], yongFa: '喜食伤通关生财，忌兄弟争夺；偏财旺者多慷慨善经营' },
  '正印格': { shunNi: '善神顺用', quote: '印绶者，生我之谓也', xiang: ['正官', '七杀'], ji: ['正财', '偏财'], yongFa: '喜官杀生印，忌财星坏印；主聪慧仁慈，宜文教学术' },
  '偏印格': { shunNi: '恶神逆用（枭神）', quote: '枭神夺食，其祸非轻', xiang: ['偏财', '正财'], ji: ['食神'], yongFa: '喜财星制枭护食；主思虑深沉，宜偏门技艺、医卜星相' },
  '食神格': { shunNi: '善神顺用', quote: '食神有气胜财官', xiang: ['比肩', '劫财', '正财', '偏财'], ji: ['偏印'], yongFa: '喜身强食旺、食神生财；忌枭神夺食；主温和才艺，为福寿之基' },
  '伤官格': { shunNi: '恶神逆用', quote: '伤官见官，为祸百端', xiang: ['正印', '偏印', '正财', '偏财'], ji: ['正官'], yongFa: '伤官佩印或伤官生财为佳，忌见正官；主才华横溢、恃才傲物' }
}

const SHENG_WO: Record<string, string> = { '木': '水', '火': '木', '土': '火', '金': '土', '水': '金' }
const WO_SHENG: Record<string, string> = { '木': '火', '火': '土', '土': '金', '金': '水', '水': '木' }
const WO_KE: Record<string, string> = { '木': '土', '火': '金', '土': '水', '金': '木', '水': '火' }
const KE_WO: Record<string, string> = { '木': '金', '火': '水', '土': '木', '金': '火', '水': '土' }

// 五行对应的方位、颜色、行业
const WX_INFO: Record<string, { direction: string; color: string; industry: string }> = {
  '木': { direction: '东方', color: '青绿', industry: '文教、出版、木材、园艺、纺织、医药' },
  '火': { direction: '南方', color: '红紫', industry: '能源、餐饮、娱乐、电子、美容、化工' },
  '土': { direction: '中央', color: '黄棕', industry: '房地产、建筑、农业、陶瓷、咨询' },
  '金': { direction: '西方', color: '白色', industry: '金融、机械、五金、汽车、法律' },
  '水': { direction: '北方', color: '黑蓝', industry: '物流、贸易、水产、传媒、IT、旅游' }
}

// 天干对应的五行（反向查十神用）
const GAN_BY_WX: Record<string, string[]> = {
  '木': ['甲', '乙'], '火': ['丙', '丁'], '土': ['戊', '己'], '金': ['庚', '辛'], '水': ['壬', '癸']
}

function allTenGods(chart: AnalyzableChart): string[] {
  const out: string[] = []
  for (const key of ['year', 'month', 'hour'] as const) {
    const p = chart.pillars[key]
    if (p.tenGodGan) out.push(p.tenGodGan)
    out.push(...p.tenGodCangGan)
  }
  return out
}

function allGanZhi(chart: AnalyzableChart): string[] {
  return [
    chart.pillars.year.gan, chart.pillars.year.zhi,
    chart.pillars.month.gan, chart.pillars.month.zhi,
    chart.pillars.day.gan, chart.pillars.day.zhi,
    chart.pillars.hour.gan, chart.pillars.hour.zhi
  ]
}

function wxCount(chart: AnalyzableChart): Record<string, number> {
  const count: Record<string, number> = { '木': 0, '火': 0, '土': 0, '金': 0, '水': 0 }
  for (const key of ['year', 'month', 'day', 'hour'] as const) {
    const p = chart.pillars[key]
    count[GAN_WUXING[p.gan]]++
    count[ZHI_WUXING[p.zhi]]++
  }
  return count
}

// 计算喜用神五行
function getYongWx(chart: AnalyzableChart): { yong: string[]; xi: string[]; ji: string[] } {
  const strong = ['身旺', '身强'].includes(chart.analysis.wangShuai)
  const dayWx = GAN_WUXING[chart.dayMaster]
  if (strong) {
    // 身强喜克泄耗：官杀（克我）、财星（我克）、食伤（我生）
    return {
      yong: [KE_WO[dayWx]],      // 第一用神：官杀
      xi: [WO_KE[dayWx], WO_SHENG[dayWx]], // 喜神：财星、食伤
      ji: [SHENG_WO[dayWx], dayWx]  // 忌神：印星、比劫
    }
  } else {
    // 身弱喜生扶：印星（生我）、比劫（同我）
    return {
      yong: [SHENG_WO[dayWx]],    // 第一用神：印星
      xi: [dayWx],                // 喜神：比劫
      ji: [KE_WO[dayWx], WO_KE[dayWx], WO_SHENG[dayWx]] // 忌神：官杀、财星、食伤
    }
  }
}

// 八字总览
function buildOverview(chart: AnalyzableChart): string {
  const { wangShuai, geJu } = chart.analysis
  const dayWx = GAN_WUXING[chart.dayMaster]
  const monthZhi = chart.pillars.month.zhi
  const gods = allTenGods(chart)
  const count = wxCount(chart)
  const missing = (['木', '火', '土', '金', '水'] as string[]).filter(w => count[w] === 0)

  const parts: string[] = []
  parts.push(`日主${chart.dayMaster}${dayWx}，生于${monthZhi}月，${wangShuai}，${geJu}。`)

  // 五行概述
  const sorted = Object.entries(count).sort((a, b) => b[1] - a[1])
  parts.push(`五行分布以${sorted[0][0]}最旺（${sorted[0][1]}分），${sorted[sorted.length - 1][0]}最弱（${sorted[sorted.length - 1][1]}分）${missing.length > 0 ? `，缺${missing.join('、')}` : '，五行俱全'}。`)

  // 十神概述
  const mainGods = ['正官', '七杀', '正财', '偏财', '正印', '偏印', '食神', '伤官', '比肩', '劫财']
  const godCount = mainGods.filter(g => gods.includes(g))
  parts.push(`命局十神以【${godCount.slice(0, 4).join('、')}】为主，构成${geJu}的基本框架。`)

  parts.push('整体来看，此命' + (wangShuai === '身旺' || wangShuai === '身强'
    ? '元气充足，有承担之力，宜进取开创'
    : wangShuai === '身弱有救' ? '元气偏弱但有救应，宜借力而为' : '元气不足，宜固本培元') + '。')
  return parts.join('\n\n')
}

// 性格天赋
function buildPersonality(chart: AnalyzableChart): string {
  const dayMaster = chart.dayMaster
  const base = DAY_MASTER_PERSONALITY[dayMaster] || ''
  const gods = allTenGods(chart)
  const mainGods = ['正官', '七杀', '正财', '偏财', '正印', '偏印', '食神', '伤官', '比肩', '劫财']
  const present = mainGods.filter(g => gods.includes(g))

  const parts: string[] = [base]
  if (present.length > 0) {
    const add = present.slice(0, 3).map(g => TEN_GOD_PERSONALITY[g]).join('；')
    parts.push(`局中十神显现，性格又有如下特质：${add}。`)
  }

  // 五行偏枯对性格的影响
  const count = wxCount(chart)
  const maxWx = Object.entries(count).sort((a, b) => b[1] - a[1])[0]
  const WX_TRAIT: Record<string, string> = {
    '木': '仁慈恻隐、好生恶杀', '火': '热情奔放、急躁冲动',
    '土': '忠厚诚信、稳重踏实', '金': '刚毅果断、重义轻财', '水': '聪明机智、灵活变通'
  }
  parts.push(`五行中${maxWx[0]}气偏旺，性格上${WX_TRAIT[maxWx[0]]}，此为天性禀赋，宜扬长避短。`)

  parts.push('《滴天髓》云："性情者，喜怒哀乐也，根于心而发于外"。以上为先天性格倾向，后天修养可改其偏、全其用。')
  return parts.join('\n\n')
}

// 用神喜忌
function buildYongShen(chart: AnalyzableChart): string {
  const { yong, xi, ji } = getYongWx(chart)
  const parts: string[] = []
  parts.push(`【用神】${yong.map(w => `${w}（${WX_INFO[w].industry}）`).join('、')}——此为全局枢纽，岁运逢之则发。`)
  parts.push(`【喜神】${xi.map(w => `${w}（${WX_INFO[w].direction}方、${WX_INFO[w].color}色）`).join('、')}——辅助用神，行运逢之多吉。`)
  parts.push(`【忌神】${ji.map(w => w).join('、')}——克泄耗日主或助纣为虐，行运逢之多滞，宜避之。`)

  // 命局财运结构底色（只在此总论一次，大运「财运」分维度不再重复罗列）
  const bjN = biJieCount(chart)
  const cCang = godOnlyCang(chart, ['正财', '偏财'])
  if (bjN >= 2 && cCang) {
    parts.push(`【财运底色】原局比劫${bjN}重林立、财星深藏不透：财藏不发、财一现即被劫夺，故求财宜以专业实业积少成多、稳守为上，忌投机博弈、杠杆合伙；各步大运再依「财星现与不现、比劫临与不临」分别参看。`)
  }

  // 调候用神与格局用神的调和
  const dayGan = chart.dayMaster
  const monthZhi = chart.pillars.month.zhi
  const thStr = TIAO_HOU[dayGan]?.[monthZhi] || ''
  if (thStr) {
    const thFirst = thStr[0]
    const thWx = GAN_WUXING[thFirst]
    parts.push(`调候以${thFirst}${thWx}为第一用神（《穷通宝鉴》），与格局用神${yong[0]}${yong[0] === thWx ? '一致，为"调候格局两得"之上格' : '有别，需在二者间求平衡'}。`)
  }

  parts.push('后天改运建议：多接近用神五行的行业、方位、颜色，结交用神五行属性的朋友（如用神为木，则多与仁慈正直之人交往），于无形中补益命局。')
  return parts.join('\n\n')
}

// 格局成败
function buildGeJu(chart: AnalyzableChart): string {
  const geJu = chart.analysis.geJu
  const rule = GE_JU_RULES[geJu]
  if (!rule) {
    return '月令藏干未能透干会支成格，暂以普通格局论命。此类命局不专恃一格，重在观其五行流通、用神有力与否：用神得力而岁运扶之则发，用神受伤而岁运攻之则滞。\n\n《滴天髓》云"休囚系乎运，尤系乎岁"，建议重点参看调候用神与大运喜忌两节，综合定夺。'
  }
  const gods = allTenGods(chart)
  const xiangList = rule.xiang.filter(g => gods.includes(g))
  const jiList = rule.ji.filter(g => gods.includes(g))
  const parts: string[] = []
  parts.push(`本造取${geJu}（${rule.shunNi}）。《子平真诠》云：${rule.quote}。用神既定，次看相神有无、忌神透与不透，方能定格局之成败。`)
  parts.push(`取用之法：${rule.yongFa}。`)
  if (xiangList.length > 0) {
    parts.push(`局中见【${xiangList.join('、')}】可为相神辅佐，格局有成：主其人${geJu.replace('格', '')}之性明显，行事有章法，行运扶助用神之时易有际遇，为命局可取之处。`)
  } else {
    parts.push(`局中相神不显，格局孤而无辅，成败系于岁运：运来助起相神则发，运来助起忌神则滞。宜后天以方位、行业、心性修养补其不足。`)
  }
  if (jiList.length > 0) {
    parts.push(`局中带【${jiList.join('、')}】为病。然"有病方为贵，无伤不是奇"（滴天髓），病神得药去之之时反主大发；平居则防口舌是非、与上司同辈之磨擦。`)
  } else {
    parts.push(`忌神不透不藏，格局清纯（子平真诠·成败救应章），为格局加分之象。`)
  }
  // 格局层次
  const chengGe = xiangList.length > 0 && jiList.length === 0
  const level = chengGe ? '中上之格' : xiangList.length > 0 ? '中等之格' : '中下之格，待运而成'
  parts.push(`格局层次：${level}。格局定一生之规模，岁运定一时之升降，二者配合方为完论。`)
  return parts.join('\n\n')
}

// 调候用神
function buildTiaoHou(chart: AnalyzableChart): string {
  const dayGan = chart.dayMaster
  const monthZhi = chart.pillars.month.zhi
  const thStr = TIAO_HOU[dayGan]?.[monthZhi] || ''
  if (!thStr) {
    return `调候用神（${dayGan}生${monthZhi}月）暂无标准表数据，请按月令寒暖燥湿参《穷通宝鉴》原文斟酌。`
  }
  const gods = thStr.split('')
  const allGans = [chart.pillars.year.gan, chart.pillars.month.gan, chart.pillars.hour.gan]
  const allCang = [chart.pillars.year.zhi, chart.pillars.month.zhi, chart.pillars.day.zhi, chart.pillars.hour.zhi]
    .flatMap(z => CANG_GAN[z] || [])
  const tou = gods.filter(g => allGans.includes(g))
  const cang = gods.filter(g => !allGans.includes(g) && allCang.includes(g))
  const missing = gods.filter(g => !allGans.includes(g) && !allCang.includes(g))
  const parts: string[] = []
  parts.push(`调候用神（《穷通宝鉴》）：${dayGan}${GAN_WUXING[dayGan]}生于${monthZhi}月——${MONTH_DISEASE[monthZhi]}。调候以【${gods.join('、')}】为主辅，其中以${gods[0]}为第一用神。`)
  if (tou.length > 0) {
    parts.push(`局中【${tou.join('、')}】透于天干，调候得力，寒暖燥湿得其解，为命局一大亮点。调候之神往往即是全局枢纽，行运逢之，十年顺遂。`)
  }
  if (cang.length > 0) {
    parts.push(`【${cang.join('、')}】藏于地支，调候之气暗伏，力量稍逊；流年大运透出之时，多为应吉之年。`)
  }
  if (missing.length > 0) {
    parts.push(`【${missing.join('、')}】局中不见，为调候之缺：气候之药未得，须于岁运中求之——运至${missing.join('、')}气旺之地，多为舒畅得意之十年。平时可在行业、方位、起居上补其气。`)
  } else {
    parts.push(`调候诸神俱备，寒暖燥湿得中，此为难得之局，一生多得天气之助。`)
  }
  return parts.join('\n\n')
}

// 大运流年
function buildDaYun(chart: AnalyzableChart): string {
  const strong = ['身旺', '身强'].includes(chart.analysis.wangShuai)
  const dayWx = GAN_WUXING[chart.dayMaster]
  const favorable = strong ? [KE_WO[dayWx], WO_KE[dayWx], WO_SHENG[dayWx]] : [SHENG_WO[dayWx], dayWx]
  const unfavorable = strong ? [SHENG_WO[dayWx], dayWx] : [KE_WO[dayWx], WO_KE[dayWx], WO_SHENG[dayWx]]
  const verdict = strong
    ? '身旺以克泄耗为喜（官杀、财星、食伤），印星比劫为忌'
    : '身弱以生扶为喜（印星、比劫），官杀、财星、食伤之克泄耗为忌'

  // 用结构化岁运（含有效性四问）输出逐运分维度断语
  const luck = buildLuckCycles(chart)
  const lines = luck.daYun.map(dy => {
    const issueText = dy.structuralIssues.length > 0 ? `\n　结构病：${dy.structuralIssues.join('；')}` : ''
    return `${dy.startYear}-${dy.endYear}年（${dy.startAge}-${dy.startAge + 9}岁）【${dy.ganZhi}运】` +
      `运干${dy.shiShenGan}、运支本气${dy.shiShenZhi}——${GOD_DOMAIN[dy.shiShenGan]}。${issueText}\n` +
      `　事业【${dy.domains.career.tendency}】${dy.domains.career.note}\n` +
      `　财运【${dy.domains.wealth.tendency}】${dy.domains.wealth.note}\n` +
      `　健康【${dy.domains.health.tendency}】${dy.domains.health.note}；六亲【${dy.domains.relation.tendency}】${dy.domains.relation.note}`
  })

  return `旺衰既定（${chart.analysis.wangShuai}），大运喜忌随之：${verdict}（滴天髓·体用章）。\n\n` +
    `须知：喜用"到位"不等于"有效"——被合、被冲、被化、被夺、无根、孤立之喜用，徒有其名而力不足，故以下逐运分维度辨析，措辞留有余地。\n\n` +
    lines.join('\n\n')
}

// 事业财运
function buildCareer(chart: AnalyzableChart): string {
  const gods = allTenGods(chart)
  const has = (list: string[]) => list.some(g => gods.includes(g))
  const strong = ['身旺', '身强'].includes(chart.analysis.wangShuai)
  const { yong } = getYongWx(chart)
  const parts: string[] = []

  if (has(['正官', '七杀'])) {
    parts.push('官杀入局，主责任心与执行力，宜体制内、大企业管理、法务、行政等层级化组织；官杀有力而身能任者，职场上升通道较顺，有管理职权之象。')
  }
  if (has(['正财', '偏财'])) {
    parts.push(`财星入局，对商机与数字敏感，宜金融、贸易、实业、销售等与"流转"相关的行业；${strong ? '身旺能任财，敢取敢得，财富层次可期' : '身弱财旺为"财多身弱"，宜合伙借力、以专业取财，忌独自扛大盘'}。`)
  }
  if (has(['食神', '伤官'])) {
    parts.push('食伤吐秀，才华与表达外露，宜技术、创作、设计、教育培训、自媒体等凭本事与口才立身的行业；伤官旺者尤忌与上司正面冲突。')
  }
  if (has(['正印', '偏印'])) {
    parts.push('印星入局，主学习力与资历积累，宜文教、学术、医疗、宗教文化等专业深耕型领域；贵人多为师长前辈，宜虚心受教。')
  }
  if (parts.length === 0) {
    parts.push('十神配置平和，宜一技傍身、稳中求进；行业选择上以喜用五行所属为佳。')
  }

  // 财运细分（区分透干与藏支）
  const stemGods = [chart.pillars.year.tenGodGan, chart.pillars.month.tenGodGan, chart.pillars.hour.tenGodGan]
  const zhiGods = [chart.pillars.year, chart.pillars.month, chart.pillars.day, chart.pillars.hour].flatMap(p => p.tenGodCangGan)
  const zhengCaiTou = stemGods.includes('正财')
  const pianCaiTou = stemGods.includes('偏财')
  const zhengCaiCang = !zhengCaiTou && zhiGods.includes('正财')
  const pianCaiCang = !pianCaiTou && zhiGods.includes('偏财')
  if (zhengCaiTou || pianCaiTou || zhengCaiCang || pianCaiCang) {
    const caiNote = []
    if (zhengCaiTou) caiNote.push('正财透干，主正途之财、稳定收入，宜工薪、实业')
    else if (zhengCaiCang) caiNote.push('正财藏支，正财运较稳但不显眼，宜稳扎稳打')
    if (pianCaiTou) caiNote.push('偏财透干，主偏门之财、意外之得，宜投资、贸易、中介')
    else if (pianCaiCang) caiNote.push('偏财藏支，偏财运暗而不扬，偶有意外收获')
    parts.push(`财运特点：${caiNote.join('；')}。${strong ? '身强能担财，财运稳中有升' : '身弱财多，需防因财生灾'}。`)
  } else {
    parts.push('财星不现（天干地支均无财星），财运需待岁运引出；宜以技艺、职位求财，不宜投机冒险。')
  }

  // 用神行业
  parts.push(`【用神行业方位】宜从事${yong.map(w => WX_INFO[w].industry).join('、')}等行业，往${yong.map(w => WX_INFO[w].direction).join('、')}方发展较利。`)

  parts.push(`结合本造${chart.analysis.geJu}与旺衰（${chart.analysis.wangShuai}）：行运至喜用之地（见大运流年一节）为发力窗口，忌神之运宜蛰伏积累，此为"知命而为"之道。`)
  return parts.join('\n\n')
}

// 婚姻感情
function buildMarriage(chart: AnalyzableChart): string {
  const male = chart.input.gender === 1
  const starName = male ? '财星（妻星）' : '官星（夫星）'
  const spouseStar = male ? ['正财', '偏财'] : ['正官', '七杀']
  const gods = allTenGods(chart)
  const stemGods = [chart.pillars.year.tenGodGan, chart.pillars.month.tenGodGan, chart.pillars.hour.tenGodGan]
  const starTou = spouseStar.some(s => stemGods.includes(s))
  const starIn = spouseStar.some(s => gods.includes(s))
  const dayZhi = chart.pillars.day.zhi
  // ★ 六冲表复用 branchRelations.ts 单一事实源（HANDOFF-个性化日运 §二）
  const clashed = [chart.pillars.year.zhi, chart.pillars.month.zhi, chart.pillars.hour.zhi].includes(LIU_CHONG[dayZhi as Zhi])
  const parts: string[] = []
  parts.push(`${male ? '男命以财为妻星' : '女命以官为夫星'}，日支为夫妻宫（本造夫妻宫为${dayZhi}），星宫两参而定婚姻。`)
  if (starTou) {
    parts.push(`${starName}明透天干，配偶缘分显豁、感情外露，婚缘来得清楚明白，对象多为生活圈内可观察之人。`)
  } else if (starIn) {
    parts.push(`${starName}藏于地支，感情内敛含蓄，姻缘多经人介绍或在熟识中慢慢生起，夫妻之情深藏不露。`)
  } else {
    parts.push(`局中${starName}不现，姻缘之路偏淡，有晚婚或聚少离多之象；行运补出${male ? '财' : '官'}星之时，多为婚恋应期。`)
  }
  if (clashed) {
    parts.push(`日支夫妻宫逢冲（${dayZhi}冲${LIU_CHONG[dayZhi as Zhi]}），婚姻易有波动：或聚少离多，或沟通多磨。宜适度晚婚、婚后保持彼此空间，忌因小事争执不下（千里命稿·地支关系）。`)
  } else {
    parts.push(`夫妻宫不受冲刑，婚姻底盘平稳，家庭为命局之助力而非阻力。`)
  }
  // 桃花
  const yearZhi = chart.pillars.year.zhi
  const TAO_HUA: Record<string, string> = { '申': '酉', '子': '酉', '辰': '酉', '寅': '卯', '午': '卯', '戌': '卯', '亥': '子', '卯': '子', '未': '子', '巳': '午', '酉': '午', '丑': '午' }
  const allZhi = [chart.pillars.year.zhi, chart.pillars.month.zhi, chart.pillars.day.zhi, chart.pillars.hour.zhi]
  const hasTaoHua = allZhi.includes(TAO_HUA[yearZhi])
  if (hasTaoHua) {
    parts.push(`命带桃花（${TAO_HUA[yearZhi]}），异性缘佳、个人魅力强，然桃花亦主多情，需防感情纠葛；已婚者宜把握分寸。`)
  }
  parts.push('婚姻质量三分在命、七分在经营：以上为趋势倾向而非定数，坦诚沟通、共同成长是最好的"化解"。')
  return parts.join('\n\n')
}

// 子女六亲
function buildChildren(chart: AnalyzableChart): string {
  const male = chart.input.gender === 1
  // 男命官杀为子星，女命食伤为子星
  const childStar = male ? ['正官', '七杀'] : ['食神', '伤官']
  const gods = allTenGods(chart)
  const stemGods = [chart.pillars.year.tenGodGan, chart.pillars.month.tenGodGan, chart.pillars.hour.tenGodGan]
  const childTou = childStar.some(s => stemGods.includes(s))
  const childIn = childStar.some(s => gods.includes(s))
  const hourZhi = chart.pillars.hour.zhi

  const parts: string[] = []
  parts.push(`${male ? '男命以官杀为子星' : '女命以食伤为子星'}，时柱为子女宫（本造时柱${chart.pillars.hour.ganZhi}），星宫两参而定子女缘。`)
  if (childTou) {
    parts.push(`子星明透天干，子女缘分深厚、关系亲密，子女多有出息，晚年可享子女之福。`)
  } else if (childIn) {
    parts.push(`子星藏于地支，子女缘分中等，子女发展需靠自身努力，亲子关系需用心经营。`)
  } else {
    parts.push(`子星不现，子女缘分较薄，或得子较迟，或子女不在身边；宜随缘，不强求。`)
  }

  // 时柱对子女的影响
  const hourWx = ZHI_WUXING[hourZhi]
  const dayWx = GAN_WUXING[chart.dayMaster]
  if (hourWx === dayWx || hourWx === SHENG_WO[dayWx]) {
    parts.push(`时支${hourZhi}（${hourWx}）生扶日主，子女宫得力，主子女孝顺、能助家业。`)
  } else if (hourWx === KE_WO[dayWx] || hourWx === WO_KE[dayWx] || hourWx === WO_SHENG[dayWx]) {
    parts.push(`时支${hourZhi}（${hourWx}）克泄耗日主，子女宫偏弱，主子女个性较强、与父母有代沟，宜多沟通理解。`)
  }

  // 父母
  const yearGanWx = GAN_WUXING[chart.pillars.year.gan]
  if (yearGanWx === SHENG_WO[dayWx]) {
    parts.push(`年干${chart.pillars.year.gan}（印星）坐年柱，主父母有靠、家境或有祖荫，幼年得长辈疼爱。`)
  } else if (yearGanWx === KE_WO[dayWx]) {
    parts.push(`年干${chart.pillars.year.gan}（官杀）坐年柱，主父母管教较严，或幼年家庭环境压力较大。`)
  } else {
    parts.push(`年柱${chart.pillars.year.ganZhi}，主祖上与早年境况，需结合整体运势参看。`)
  }

  // 兄弟
  const hasBiJie = ['比肩', '劫财'].some(g => gods.includes(g))
  parts.push(hasBiJie
    ? '比劫入局，兄弟朋友缘佳，多得同辈助力；然比劫过旺亦主分财，合作事业需明算账。'
    : '比劫不现，兄弟朋友缘分较淡，遇事多靠自己，宜主动经营人脉。')

  parts.push('六亲关系乃先天缘分，后天相处之道在于"孝、悌、慈"三字，尽心则无憾。')
  return parts.join('\n\n')
}

// 健康提示
function buildHealth(chart: AnalyzableChart): string {
  const count = wxCount(chart)
  const ORGAN: Record<string, string> = {
    '木': '肝胆、眼睛、筋络，情绪上防郁怒',
    '火': '心脏、血压、血液循环，防过劳伤神',
    '土': '脾胃、消化、皮肤，防饮食不节',
    '金': '肺、呼吸道、大肠，防干燥与呼吸道敏感',
    '水': '肾、泌尿、腰耳，防熬夜耗损'
  }
  const all: string[] = ['木', '火', '土', '金', '水']
  const missing = all.filter(w => count[w] === 0)
  const excess = all.filter(w => count[w] >= 4)
  const parts: string[] = []
  parts.push(`五行分布（按八字本气计）：木${count['木']}、火${count['火']}、土${count['土']}、金${count['金']}、水${count['水']}。日主${chart.dayMaster}属${GAN_WUXING[chart.dayMaster]}。`)
  if (missing.length > 0) {
    parts.push(`局中缺【${missing.join('、')}】：对应${missing.map(w => `${w}——${ORGAN[w]}`).join('；')}，为体质上先天的薄弱环节，宜从作息、饮食、运动上主动养护。`)
  } else {
    parts.push('五行俱全，先天脏腑气数平衡，体质底盘良好；注意后天习惯即可。')
  }
  if (excess.length > 0) {
    parts.push(`【${excess.join('、')}】偏旺：对应${excess.map(w => `${w}——${ORGAN[w]}`).join('；')}，过旺之脏亦易"过劳"，防亢盛为患。`)
  }
  // 日主五行对应的重点保养
  const dayWx = GAN_WUXING[chart.dayMaster]
  parts.push(`日主${chart.dayMaster}${dayWx}，重点养护${ORGAN[dayWx]}；${dayWx === '水' ? '水主智，亦主肾，宜节欲保精、勿熬夜' : dayWx === '火' ? '火主礼，亦主心，宜静心安神、戒急躁' : dayWx === '木' ? '木主仁，亦主肝，宜舒肝解郁、戒郁怒' : dayWx === '金' ? '金主义，亦主肺，宜润肺防燥、戒悲伤' : '土主信，亦主脾，宜健脾养胃、戒思虑'}`)
  parts.push('以上为五行体质倾向提示，不构成医疗诊断；身体不适请及时就医（命理断病，止于趋势）。')
  return parts.join('\n\n')
}

// ============ 岁运引擎（大运 / 流年 / 流月） ============
// ★ 岁运引擎的冲/合表：复用 branchRelations.ts 单一事实源（机械别名，内容逐支一致）
const LUCK_CHONG: Record<string, string> = LIU_CHONG
const LUCK_LIU_HE: Record<string, string> = LIU_HE
const SAN_HE_GROUP: Array<{ group: string[]; ju: string }> = [
  { group: ['申', '子', '辰'], ju: '水' }, { group: ['寅', '午', '戌'], ju: '火' },
  { group: ['巳', '酉', '丑'], ju: '金' }, { group: ['亥', '卯', '未'], ju: '木' }
]
// 天干五合
const GAN_HE: Record<string, string> = {
  '甲': '己', '己': '甲', '乙': '庚', '庚': '乙', '丙': '辛', '辛': '丙',
  '丁': '壬', '壬': '丁', '戊': '癸', '癸': '戊'
}

// 十神主事领域（流年/大运天干所主之事）
const GOD_DOMAIN: Record<string, string> = {
  '正官': '职务名誉、规矩约束之事，女命亦主感情姻缘',
  '七杀': '压力挑战、竞争开拓，也主变动与官非口舌',
  '正财': '正途收入、家业务实之事，男命亦主感情',
  '偏财': '投资商机、意外收支、交际应酬，亦主父亲',
  '正印': '学业文书、贵人长辈、房产名誉之事',
  '偏印': '偏门技艺、思虑、医药宗教之事',
  '食神': '才华创意、口福享受、子女相关之事',
  '伤官': '表现竞争、口舌变动、创意发挥之事',
  '比肩': '朋友同辈、合作竞争、独立自主之事',
  '劫财': '合伙争夺、开销破耗、冒险之事'
}

const TAG_ADVICE: Record<LuckTag, string> = {
  '较宜': '岁运对喜用有所扶助，可稳步推进计划',
  '平顺': '无大起伏，如常蓄力即可',
  '一般': '平平之运，重要决定宜缓，重在积累',
  '宜慎': '凡事谨慎，避免大额投入与冲动决策',
  '大防': '岁运动荡，重大决定宜缓行，注意健康与是非'
}

// ★ 7 档判词建议语（大运/流年 FortuneTier 专用；§3.3）
// ★★★ 硬要求：七句全部过 findForbidden() 零命中（B/C 两类词不得混入），有断言守护
export const FORTUNE_ADVICE: Record<FortuneTier, string> = {
  '大吉': '岁运与命局高度契合，宜顺势布局中长期目标',
  '吉': '岁运扶助喜用，可稳步推进计划',
  '小吉': '岁运略有助力，循序而为即可',
  '平': '平平之运，重在积累，重要决定宜缓',
  '小凶': '岁运略有牵制，宜守成、少扩张',
  '凶': '岁运多阻，避免大额投入与重大变更',
  '大凶': '岁运结构不利，宜静守、防健康与是非'
}

// ★ 步骤④：判词按结构病分叉（同 tag 不得共用一句）
//   无结构病 → 用 FORTUNE_ADVICE 基础句；有结构病 → 截取基础句首段，以「然」引出结构病
//   （如 平+官星被化 → "平平之运，然运干正官透干被印化泄，官星有名无权"）
//   这样同 tag 不同结构病的 note 必然不同，去重率 100%
export function fortuneAdviceOf(tag: FortuneTier, issues: string[]): string {
  const base = FORTUNE_ADVICE[tag]
  if (issues.length === 0) return base
  const head = base.split(/[，,。]/)[0]
  return `${head}，然${issues.join('；')}`
}

// ★ 步骤⑤：过去年份回顾性判词（无未来承诺措辞，避免"宜/可/将/建议"）
//   与 FORTUNE_ADVICE 一一对应，但语气改为回顾性（"该运/该年……多主……"）
const RETRO_ADVICE: Record<FortuneTier, string> = {
  '大吉': '该运与命局高度契合，多得顺势之利',
  '吉': '该运扶助喜用，诸事多稳步推进',
  '小吉': '该运略有助力，循序而为多有所得',
  '平': '该运平平，重在积累，无大起伏',
  '小凶': '该运略有牵制，守成为多',
  '凶': '该运多阻，大额投入与重大变更易生波折',
  '大凶': '该运结构不利，多静守、防健康与是非'
}
function retroAdviceOf(tag: FortuneTier, issues: string[]): string {
  const base = RETRO_ADVICE[tag]
  if (issues.length === 0) return base
  const head = base.split(/[，,。]/)[0]
  return `${head}，然${issues.join('；')}`
}

// 公历月对应的"节"（命理以节令换月，非农历初一）
const JIE_BY_MONTH = ['小寒', '立春', '惊蛰', '清明', '立夏', '芒种', '小暑', '立秋', '白露', '寒露', '立冬', '大雪']

// 导出原因：年运模块（aiLiunian）prompt 需要同一套喜忌事实，严禁另写第二份判定
export function getFavorSets(chart: AnalyzableChart): { favorable: string[]; unfavorable: string[] } {
  const { yong, xi, ji } = getYongWx(chart)
  return { favorable: [...yong, ...xi], unfavorable: ji }
}

// 干支喜忌基础分（干、支各 -1/0/+1）——仅作参考，不直接定吉凶
function baseScore(ganZhi: string, favorable: string[], unfavorable: string[]): number {
  let s = 0
  if (favorable.includes(GAN_WUXING[ganZhi[0]])) s++
  else if (unfavorable.includes(GAN_WUXING[ganZhi[0]])) s--
  if (favorable.includes(ZHI_WUXING[ganZhi[1]])) s++
  else if (unfavorable.includes(ZHI_WUXING[ganZhi[1]])) s--
  return s
}

// ★ 大运/流年 7 档判词（事故 18 纪律保留：结构性缺陷封顶——"用神到位 ≠ 用神有效"）
// cap 分三级：无结构病 → 可达「大吉」；1 个结构病 → 最高「吉」；≥2 个 → 最高「小吉」
// ★ 判词封顶分级（方案 ii，任务20拍板）：≥2 个病由 cap 0（最高「平」）抬为 cap 1（最高「小吉」）。
//   现状把约 39.6% 的大运步一刀切压在「平」，无论多好用户最高只能看到「平」——纯放宽，负向/大凶完全不变。
// ★ 用户拍板理由：「吉凶是相对用户个人而言的，不是相对别人而言的，对用户来说吉就是吉」
//   → 分档由"这个时段本身如何"决定，不按人群分位数设阈值（阈值注释不得使用 top X% 类人群分位标注）
// 反向不设 floor（结构病只封上限、不封下限）
// ★ 历史记录：阈值曾于任务19步骤③做一次性校准，让每一档都真的可用（避免大吉形同虚设、大凶宿命化）。
//   事故 18 的 cap 纪律保留（封顶上限），不参与校准。
//   ★ 红线：本任务之后的任何阈值改动都【不该以"占比好看"为由】——分档语义见下方行内注释。
export function fortuneTierOf(score: number, structuralIssues: string[] = []): FortuneTier {
  const cap =
    structuralIssues.length === 0 ? 4 :      // 无结构病 → 可达「大吉」
    structuralIssues.length === 1 ? 2 :      // 1 个     → 最高「吉」
    1                                        // ≥2 个    → 最高「小吉」（方案 ii：纯放宽，负向/大凶不变）
  const s = Math.min(score, cap)

  // ★ 分档语义（依据等级：产品设定语义描述，非古籍明文）——用户拍板：「吉凶是相对用户个人而言的，
  //   不是相对别人而言的，对用户来说吉就是吉」→ 档位由「这个时段本身的判定」定义，不按人群分位数标注。
  if (s >= 3) return '大吉'         // 喜用得力，且全无结构之病
  if (s === 2) return '吉'          // 喜用有力，至多一处结构牵制
  if (s === 1) return '小吉'        // 喜用略得扶助，或有多处牵制
  if (s >= -1) return '平'          // 喜忌相当，无明显结构破坏
  if (s === -2) return '小凶'       // 略有牵制
  if (s === -3) return '凶'         // 多阻，结构不利
  return '大凶'                     // 结构严重不利
}

// 天干相克（任一方向）
function ganKe(a: string, b: string): boolean {
  return WO_KE[GAN_WUXING[a]] === GAN_WUXING[b]
}

// 两支之间的半合局描述（含合出五行，供调用方按喜忌加减分）
function sanHeInfo(a: string, b: string): Array<{ label: string; ju: string }> {
  const out: Array<{ label: string; ju: string }> = []
  if (a === b) return out // 同字为伏吟，非合局
  for (const { group, ju } of SAN_HE_GROUP) {
    const hit = [a, b].filter(z => group.includes(z))
    if (hit.length === 2) out.push({ label: `半合${ju}局`, ju })
  }
  return out
}

// ─────────────────────────────────────────────────────────────
// 喜用有效性四问（§3.2）：用神到位 ≠ 用神有效
// ─────────────────────────────────────────────────────────────

// 原局天干（年月时，不含日主）
function stemGans(chart: AnalyzableChart): string[] {
  return [chart.pillars.year.gan, chart.pillars.month.gan, chart.pillars.hour.gan]
}
// 原局所有藏干
function allCangGans(chart: AnalyzableChart): string[] {
  return [chart.pillars.year.zhi, chart.pillars.month.zhi, chart.pillars.day.zhi, chart.pillars.hour.zhi]
    .flatMap((z) => CANG_GAN[z] || [])
}
// 某十神在天干是否透出
function godTouGan(chart: AnalyzableChart, gods: string[]): boolean {
  return stemGans(chart).some((g) => gods.includes(SHI_SHEN[chart.dayMaster][g]))
}
// 某十神是否只藏不透
function godOnlyCang(chart: AnalyzableChart, gods: string[]): boolean {
  if (godTouGan(chart, gods)) return false
  return allCangGans(chart).some((g) => gods.includes(SHI_SHEN[chart.dayMaster][g]))
}
// 比劫个数：天干比劫（年月时）＋ 地支藏干含比劫者（每支至多计一，如日支子藏癸劫财）
function biJieCount(chart: AnalyzableChart): number {
  const dm = chart.dayMaster
  const isBj = (g: string) => ['比肩', '劫财'].includes(SHI_SHEN[dm][g])
  const ganN = stemGans(chart).filter(isBj).length
  const zhiN = [chart.pillars.year.zhi, chart.pillars.month.zhi, chart.pillars.day.zhi, chart.pillars.hour.zhi]
    .filter((z) => (CANG_GAN[z] || []).some(isBj)).length
  return ganN + zhiN
}

// 官杀是否被印化（身旺 + 印透干 + 运见官杀透）
function guanBeiYinHua(chart: AnalyzableChart, ganShiShen: string, strong: boolean): boolean {
  if (!strong) return false
  if (!['正官', '七杀'].includes(ganShiShen)) return false
  return godTouGan(chart, ['正印', '偏印'])
}

// 大运有效性分析：返回结构病列表 + 结构化 validity
function analyzeValidity(
  chart: AnalyzableChart,
  ganZhi: string,
  ganShiShen: string,
  zhiShiShen: string,
  strong: boolean
): { issues: string[]; validity: LuckValidity } {
  const issues: string[] = []
  const z = ganZhi[1]
  const zhiCang = CANG_GAN[z] || []
  const zhiCangGods = zhiCang.map((g) => SHI_SHEN[chart.dayMaster][g])
  const jiGods = strong ? ['正印', '偏印', '比肩', '劫财'] : ['正官', '七杀', '正财', '偏财', '食神', '伤官']

  const v: LuckValidity = {
    yongHua: false, biJieDuoCai: false, caiXingShenCang: false,
    zhiChong: false, xiYongBuChun: false, shiShangShiGu: false, guanShaGuLi: false
  }

  // 1. 官印相生（官被化）
  if (guanBeiYinHua(chart, ganShiShen, strong)) {
    v.yongHua = true
    issues.push(`运干${ganShiShen}（喜）透干，但被原局透干印星化泄（官生印、印生身），官星有名无权，名分大于实权`)
  }

  // 2. 比劫夺财（比劫≥2 且财透而无官制）/ 财星深藏
  const biJie = biJieCount(chart)
  const caiTou = godTouGan(chart, ['正财', '偏财'])
  if (['正财', '偏财'].includes(ganShiShen) || ['正财', '偏财'].includes(zhiShiShen)) {
    if (godOnlyCang(chart, ['正财', '偏财'])) {
      v.caiXingShenCang = true
      issues.push('财星深藏不透，财藏不发，求财费力；且运中财星一透即被旺比争夺，破耗难免')
    }
    if (biJie >= 2 && (caiTou || ['正财', '偏财'].includes(zhiShiShen))) {
      v.biJieDuoCai = true
      issues.push(`比劫${biJie}重林立而财星无制，财来即被劫夺，求财易破，忌投机、合伙与杠杆`)
    }
  }

  // 3. 运支冲原局（提纲或日支）
  if (LUCK_CHONG[z] === chart.pillars.month.zhi || LUCK_CHONG[z] === chart.pillars.day.zhi) {
    v.zhiChong = true
    issues.push(`运支${z}冲原局${LUCK_CHONG[z] === chart.pillars.month.zhi ? '月令提纲' : '日支'}，官星（岁运根基）动荡不稳`)
  }

  // 4. 喜用不纯（运支藏干含忌神）
  const cangJi = zhiCangGods.filter((g) => jiGods.includes(g))
  if (['正官', '七杀', '正财', '偏财', '食神', '伤官'].includes(zhiShiShen) && cangJi.length > 0) {
    v.xiYongBuChun = true
    issues.push(`运支${z}虽为喜用，内藏${cangJi.join('、')}忌神，制身之力不纯，喜中带忌，力度打折`)
  }

  // 5. 食伤势孤（食伤只 1 个且被旺水/印包围）
  if (['食神', '伤官'].includes(ganShiShen) || ['食神', '伤官'].includes(zhiShiShen)) {
    const foodGods = allCangGans(chart).filter((g) => ['食神', '伤官'].includes(SHI_SHEN[chart.dayMaster][g]))
    if (foodGods.length <= 1 && !godTouGan(chart, ['食神', '伤官'])) {
      v.shiShangShiGu = true
      issues.push('食伤势孤，才华难施展，水多木漂')
    }
  }

  // 6. 官杀孤立无财生
  if (['正官', '七杀'].includes(ganShiShen) && !godTouGan(chart, ['正财', '偏财']) && !godOnlyCang(chart, ['正财', '偏财']) === false) {
    if (godOnlyCang(chart, ['正财', '偏财'])) {
      v.guanShaGuLi = true
      issues.push('官杀无财星相生，官星孤立，名分难固')
    }
  }

  return { issues, validity: v }
}

// 分维度倾向判定（事业/财运/健康/六亲）
function judgeDomains(
  chart: AnalyzableChart,
  ganShiShen: string,
  zhiShiShen: string,
  base: number,
  v: LuckValidity
): Record<'career' | 'wealth' | 'health' | 'relation', LuckDomain> {
  const isGuan = ['正官', '七杀'].includes(ganShiShen) || ['正官', '七杀'].includes(zhiShiShen)

  // 事业
  let career: LuckDomain
  if (isGuan) {
    if (v.yongHua) career = { tendency: '平', note: '官星被印化泄，名分有而实权少，职场多虚衔、少实利，宜以专业立身而非钻营名位' }
    else if (v.guanShaGuLi) career = { tendency: '平', note: '官星孤立无财生，名分难固，职场起伏，宜稳守本位' }
    else career = { tendency: base >= 1 ? '吉' : '平', note: base >= 1 ? '官杀主事，事业责任加重，身旺能任者可稳扎稳打逐步进取' : '官杀主事，压力与机会并存，量力而行' }
  } else {
    career = { tendency: base >= 1 ? '吉' : base === 0 ? '平' : '滞', note: base >= 1 ? '岁运扶助事业，可稳步推进' : '事业运势平平，宜守成积累，不宜冒进' }
  }

  // 财运：判据优先级——①运干透财（财现，哪怕坐支比劫也属「财现但守不住」）；
  // ②运干透比劫（劫财当头，先判滞）；③财只在支；④财不现。
  // 原局「比劫林立、财星深藏」之底色已在「用神」命局总论中说过一次，此处不重复罗列。
  let wealth: LuckDomain
  const caiTou = ['正财', '偏财'].includes(ganShiShen)
  const ganBiJie = ['比肩', '劫财'].includes(ganShiShen)
  const zhiBiJie = ['比肩', '劫财'].includes(zhiShiShen)
  const caiZaiZhi = ['正财', '偏财'].includes(zhiShiShen)
  if (caiTou) {
    wealth = {
      tendency: '平',
      note: `财星透干、进财机会显现（${ganShiShen}主事）；` +
        (zhiBiJie
          ? '坐支恰为比劫（财现坐劫地），财易来亦易破，到手难守；'
          : '然原局比劫旺而夺财，财现亦易破；') +
        '进财机会与破耗之险并存，宜守不宜投，到手之财先求稳住，忌杠杆投机'
    }
  } else if (ganBiJie) {
    wealth = {
      tendency: '滞',
      note: '比劫透干再临，财被劫夺之势更重：求财易破耗，宜守不宜攻，忌杠杆投机、合伙分财，量入为出'
    }
  } else if (caiZaiZhi) {
    wealth = {
      tendency: '平',
      note: '财气现于地支、机会含蓄；然原局比劫易夺，宜以实业勤恳取财，到手先求稳住，忌投机博弈与大额投入'
    }
  } else {
    wealth = {
      tendency: '滞',
      note: '本运财星不现，求财费力，宜凭专业与勤恳积少成多、等待财星岁运；忌投机博弈、杠杆放大' +
        (zhiBiJie ? '；运支比劫暗伏，亦防意外破耗' : '')
    }
  }

  // 健康（官杀攻身/土厚克水等多防）
  let health: LuckDomain
  if (v.zhiChong) health = { tendency: '滞', note: '岁运冲原局，防意外伤病与旧疾反复，注意劳逸结合' }
  else health = { tendency: '平', note: '健康无大碍，注意规律作息' }

  // 六亲/感情
  let relation: LuckDomain
  if (v.zhiChong && LUCK_CHONG[(chart.pillars.day.zhi)]) relation = { tendency: '滞', note: '感情家庭多磨合，多沟通包容' }
  else relation = { tendency: '平', note: '人际关系平稳，宜以和为贵' }

  return { career, wealth, health, relation }
}

// 大运逐运分析
function buildLuckDaYun(
  chart: AnalyzableChart,
  favorable: string[],
  unfavorable: string[],
  nowYear: number
): LuckDaYunItem[] {
  const dayGan = chart.dayMaster
  const dayZhi = chart.pillars.day.zhi
  const monthZhi = chart.pillars.month.zhi
  const dayPillar = chart.pillars.day.ganZhi

  return chart.daYun.map(dy => {
    const g = dy.ganZhi[0]
    const z = dy.ganZhi[1]
    const shiShenGan = SHI_SHEN[dayGan][g]
    const shiShenZhi = SHI_SHEN[dayGan][CANG_GAN[z][0]]
    let score = baseScore(dy.ganZhi, favorable, unfavorable)
    const relations: string[] = []

    if (LUCK_CHONG[z] === monthZhi) {
      score--
      relations.push(`运支${z}冲月令${monthZhi}，十年事业、环境多变动`)
    }
    if (LUCK_CHONG[z] === dayZhi) {
      if (ganKe(g, dayGan) || ganKe(dayGan, g)) {
        score -= 2
        relations.push(`运与日柱天克地冲（${dy.ganZhi}对${dayPillar}），十年起落较大`)
      } else {
        score--
        relations.push(`运支${z}冲夫妻宫${dayZhi}，感情与健康多波动`)
      }
    } else if (LUCK_LIU_HE[z] === dayZhi) {
      score++
      relations.push(`运支${z}合夫妻宫${dayZhi}，人际感情和合`)
    } else if (z === dayZhi && dy.ganZhi !== dayPillar) {
      // ★ 整柱伏吟成立时不再单报同支伏吟（整柱优先，去重——任务20步骤③）；同支不同干仍是真伏吟
      relations.push(`运支${z}与夫妻宫伏吟，事宜心境易有反复`)
    } else {
      sanHeInfo(z, dayZhi).forEach(({ label, ju }) => {
        if (favorable.includes(ju)) {
          score++
          relations.push(`运支与夫妻宫${label}，合出${ju}气助喜用`)
        } else {
          score--
          relations.push(`运支与夫妻宫${label}，合出${ju}气助忌神`)
        }
      })
    }
    // ★ 步骤①：年支/时支覆盖（依据等级：通行做法——运与四柱冲合是命理常论）
    //   日支/月支的既有判据与权重不动；此处增补年柱/时柱，各柱独立、可同时命中
    for (const { zhi, pillarGZ, pillarName, palaceName } of [
      { zhi: chart.pillars.year.zhi, pillarGZ: chart.pillars.year.ganZhi, pillarName: '年柱', palaceName: '祖上/父母宫' },
      { zhi: chart.pillars.hour.zhi, pillarGZ: chart.pillars.hour.ganZhi, pillarName: '时柱', palaceName: '子女/晚年宫' },
    ]) {
      if (LUCK_CHONG[z] === zhi) {
        score--
        relations.push(`运支${z}冲${pillarName}${zhi}，十年${palaceName}所主领域多有牵动`)
      } else if (LUCK_LIU_HE[z] === zhi) {
        score++
        relations.push(`运支${z}合${pillarName}${zhi}，十年${palaceName}多得助力`)
      } else if (z === zhi && dy.ganZhi !== pillarGZ) {
        // ★ 整柱伏吟成立时不再单报该柱同支伏吟（整柱优先，去重——任务20步骤③）
        relations.push(`运支${z}与${pillarName}伏吟，十年${palaceName}事宜易有反复`)
      } else {
        sanHeInfo(z, zhi).forEach(({ label, ju }) => {
          if (favorable.includes(ju)) {
            score++
            relations.push(`运支与${pillarName}${label}，合出${ju}气助喜用`)
          } else {
            score--
            relations.push(`运支与${pillarName}${label}，合出${ju}气助忌神`)
          }
        })
      }
    }
    if (GAN_HE[g] === dayGan) {
      relations.push(`运干${g}与日主${dayGan}相合，事宜有羁绊亦有合作`)
    }
    if (dy.ganZhi === dayPillar) {
      relations.push('运临日柱伏吟，心境易有反复，宜守本心')
    }
    // ★ 步骤①：年柱/月柱/时柱 整柱伏吟 + 年干/月干/时干 天干五合（不止日柱/日干）
    if (dy.ganZhi === chart.pillars.year.ganZhi) relations.push('运临年柱伏吟，祖上/父母宫事宜易有反复')
    if (dy.ganZhi === chart.pillars.month.ganZhi) relations.push('运临月柱伏吟，提纲/事业宫事宜易有反复')
    if (dy.ganZhi === chart.pillars.hour.ganZhi) relations.push('运临时柱伏吟，子女/晚年宫事宜易有反复')
    if (GAN_HE[g] === chart.pillars.year.gan) relations.push(`运干${g}与年干${chart.pillars.year.gan}相合，长辈、合作有羁绊之象`)
    if (GAN_HE[g] === chart.pillars.month.gan) relations.push(`运干${g}与月干${chart.pillars.month.gan}相合，事业、平台有羁绊之象`)
    if (GAN_HE[g] === chart.pillars.hour.gan) relations.push(`运干${g}与时干${chart.pillars.hour.gan}相合，子女、下属有羁绊之象`)

    // 结构有效性分析（§3.2）：用神到位 ≠ 用神有效
    const strong = ['身旺', '身强'].includes(chart.analysis.wangShuai)
    const { issues, validity } = analyzeValidity(chart, dy.ganZhi, shiShenGan, shiShenZhi, strong)
    const domains = judgeDomains(chart, shiShenGan, shiShenZhi, score, validity)

    const tag = fortuneTierOf(score, issues)
    const current = nowYear >= dy.startYear && dy.endYear >= nowYear
    // 断语：以结构病为先，措辞具体留余地，绝不"积极进取"
    const issueText = issues.length > 0 ? issues.join('；') + '。' : ''
    const domainText = `事业【${domains.career.tendency}】${domains.career.note}；财运【${domains.wealth.tendency}】${domains.wealth.note}。`
    const note = `${shiShenGan}主事——${GOD_DOMAIN[shiShenGan]}。${issueText}${domainText}`
    return {
      ganZhi: dy.ganZhi, startYear: dy.startYear, endYear: dy.endYear,
      startAge: dy.startAge, shiShenGan, shiShenZhi, score, tag, current,
      relations, note, structuralIssues: issues, domains
    }
  })
}

// 流年：过去 8 年应期回看 + 当年 + 未来 2 年（共 11 项，首位非当年——消费者勿按索引取当年）
function buildLuckLiuNian(
  chart: AnalyzableChart,
  favorable: string[],
  unfavorable: string[],
  nowYear: number,
  daYunItems: LuckDaYunItem[]
): LuckLiuNianItem[] {
  const dayGan = chart.dayMaster
  const dayZhi = chart.pillars.day.zhi
  const monthZhi = chart.pillars.month.zhi
  const dayPillar = chart.pillars.day.ganZhi
  const out: LuckLiuNianItem[] = []

  // ★ 步骤⑤：流年向前扩 8 年（过去应期回看）+ 未来 3 年
  for (let i = -8; i < 3; i++) {
    const year = nowYear + i
    // 不早于出生年（出生前的流年无意义）
    if (year < chart.input.year) continue
    const gz = Solar.fromYmdHms(year, 6, 15, 12, 0, 0).getLunar().getEightChar().getYear()
    const g = gz[0], z = gz[1]
    const isPast = year < nowYear
    const shiShenGan = SHI_SHEN[dayGan][g]
    const shiShenZhi = SHI_SHEN[dayGan][CANG_GAN[z][0]]
    let score = baseScore(gz, favorable, unfavorable)
    const relations: string[] = []
    // 流年同样做结构有效性分析（沿用大运的有效性四问）
    const strong = ['身旺', '身强'].includes(chart.analysis.wangShuai)
    const { issues } = analyzeValidity(chart, gz, shiShenGan, shiShenZhi, strong)

    // 流年与原局
    if (LUCK_CHONG[z] === dayZhi) {
      score--
      relations.push(`流年支${z}冲夫妻宫${dayZhi}，感情、合作关系多变`)
    } else if (LUCK_LIU_HE[z] === dayZhi) {
      score++
      relations.push(`流年支${z}合夫妻宫${dayZhi}，关系和合`)
    } else if (z === dayZhi && gz !== dayPillar) {
      // ★ 整柱伏吟成立时不再单报同支伏吟（整柱优先，去重——任务20步骤③）；同支不同干仍是真伏吟
      relations.push(`流年支${z}与夫妻宫伏吟，事宜易有反复`)
    } else {
      sanHeInfo(z, dayZhi).forEach(({ label, ju }) => {
        if (favorable.includes(ju)) {
          score++
          relations.push(`流年支与夫妻宫${label}，合出${ju}气助喜用`)
        } else {
          score--
          relations.push(`流年支与夫妻宫${label}，合出${ju}气助忌神`)
        }
      })
    }
    // ★ 步骤①：年支/时支覆盖（依据等级：通行做法——流年与四柱冲合是命理常论，非本产品发明）
    //   日支/月支的既有判据与权重不动；此处增补年柱/时柱，各柱独立、可同时命中（非互斥）
    for (const { zhi, pillarGZ, pillarName, palaceName } of [
      { zhi: chart.pillars.year.zhi, pillarGZ: chart.pillars.year.ganZhi, pillarName: '年柱', palaceName: '祖上/父母宫' },
      { zhi: chart.pillars.hour.zhi, pillarGZ: chart.pillars.hour.ganZhi, pillarName: '时柱', palaceName: '子女/晚年宫' },
    ]) {
      if (LUCK_CHONG[z] === zhi) {
        score--
        relations.push(`流年支${z}冲${pillarName}${zhi}，${palaceName}所主领域多有牵动`)
      } else if (LUCK_LIU_HE[z] === zhi) {
        score++
        relations.push(`流年支${z}合${pillarName}${zhi}，${palaceName}多得助力`)
      } else if (z === zhi && gz !== pillarGZ) {
        // ★ 整柱伏吟成立时不再单报该柱同支伏吟（整柱优先，去重——任务20步骤③）
        relations.push(`流年支${z}与${pillarName}伏吟，${palaceName}事宜易有反复`)
      } else {
        sanHeInfo(z, zhi).forEach(({ label, ju }) => {
          if (favorable.includes(ju)) {
            score++
            relations.push(`流年支与${pillarName}${label}，合出${ju}气助喜用`)
          } else {
            score--
            relations.push(`流年支与${pillarName}${label}，合出${ju}气助忌神`)
          }
        })
      }
    }
    if (LUCK_CHONG[z] === monthZhi) {
      score--
      relations.push(`流年冲提纲（${z}冲${monthZhi}），环境、事业多有变动`)
    } else if (LUCK_LIU_HE[z] === monthZhi) {
      score++
      relations.push('流年支合月令，事业多得呼应')
    }
    if (gz === dayPillar) relations.push('流年与日柱伏吟，心境事宜易有反复')
    if (GAN_HE[g] === dayGan) relations.push(`流年干${g}与日主相合，合作羁绊之象`)
    // ★ 步骤①：年柱/月柱/时柱 整柱伏吟（不止日柱；伏吟只报描述、不加减分）
    if (gz === chart.pillars.year.ganZhi) relations.push('流年与年柱伏吟，祖上/父母宫事宜易有反复')
    if (gz === chart.pillars.month.ganZhi) relations.push('流年与月柱伏吟，提纲/事业宫事宜易有反复')
    if (gz === chart.pillars.hour.ganZhi) relations.push('流年与时柱伏吟，子女/晚年宫事宜易有反复')
    // ★ 步骤①：年干/月干/时干 天干五合（不止日干；五合只报描述、不加减分）
    if (GAN_HE[g] === chart.pillars.year.gan) relations.push(`流年干${g}与年干${chart.pillars.year.gan}相合，长辈、合作有羁绊之象`)
    if (GAN_HE[g] === chart.pillars.month.gan) relations.push(`流年干${g}与月干${chart.pillars.month.gan}相合，事业、平台有羁绊之象`)
    if (GAN_HE[g] === chart.pillars.hour.gan) relations.push(`流年干${g}与时干${chart.pillars.hour.gan}相合，子女、下属有羁绊之象`)

    // 流年与所在大运
    const dyItem = daYunItems.find(d => year >= d.startYear && year <= d.endYear)
    const dyGanZhi = dyItem?.ganZhi || ''
    if (dyGanZhi) {
      if (gz === dyGanZhi) {
        relations.push('岁运并临，吉凶之力加倍，宜稳不宜躁')
      } else {
        const dz = dyGanZhi[1]
        const chong = LUCK_CHONG[z] === dz
        const ke = ganKe(g, dyGanZhi[0]) || ganKe(dyGanZhi[0], g)
        if (chong && ke) {
          score -= 2
          relations.push(`流年与大运天克地冲（${gz}对${dyGanZhi}），岁运交战，大事宜慎`)
        } else if (chong) {
          score--
          relations.push(`流年支冲运支${dz}，有变动之机`)
        } else if (LUCK_LIU_HE[z] === dz) {
          score++
          relations.push(`流年支合运支${dz}，多得平台际遇之助`)
        }
      }
    }

    const tag = fortuneTierOf(score, issues)
    // 步骤④：判词按结构病分叉；步骤⑤：过去年份用回顾性措辞（无未来承诺）
    const advice = isPast ? retroAdviceOf(tag, issues) : fortuneAdviceOf(tag, issues)
    const note = `${shiShenGan}主事——${GOD_DOMAIN[shiShenGan]}；${advice}。`
    out.push({
      year, ganZhi: gz, shiShenGan, shiShenZhi, score, tag,
      current: i === 0, isPast, daYunGanZhi: dyGanZhi, relations, note, structuralIssues: issues
    })
  }
  return out
}

// 流月：今年十二个月（以节气为界）
function buildLuckLiuYue(
  chart: AnalyzableChart,
  favorable: string[],
  unfavorable: string[],
  nowYear: number,
  nianZhi: string
): LuckLiuYueItem[] {
  const dayGan = chart.dayMaster
  const dayZhi = chart.pillars.day.zhi
  const out: LuckLiuYueItem[] = []

  for (let m = 1; m <= 12; m++) {
    const midLunar = Solar.fromYmdHms(nowYear, m, 15, 12, 0, 0).getLunar()
    const gz = midLunar.getEightChar().getMonth()
    const g = gz[0], z = gz[1]
    const jieQi = JIE_BY_MONTH[m - 1]
    const startSolar = midLunar.getJieQiTable()[jieQi]
    const endLunar = m < 12
      ? Solar.fromYmdHms(nowYear, m + 1, 15, 12, 0, 0).getLunar()
      : Solar.fromYmdHms(nowYear + 1, 1, 15, 12, 0, 0).getLunar()
    const endSolar = m < 12
      ? endLunar.getJieQiTable()[JIE_BY_MONTH[m]]
      : endLunar.getJieQiTable()['小寒']
    const rangeLabel = `${startSolar.getMonth()}/${startSolar.getDay()} - ${endSolar.getMonth()}/${endSolar.getDay()}`
    const shiShenGan = SHI_SHEN[dayGan][g]
    let score = baseScore(gz, favorable, unfavorable)
    const relations: string[] = []

    if (LUCK_CHONG[z] === nianZhi) {
      score--
      relations.push('月支冲太岁，当月多波动')
    } else if (LUCK_LIU_HE[z] === nianZhi) {
      score++
      relations.push('月支合太岁，当月顺遂')
    }
    if (LUCK_CHONG[z] === dayZhi) {
      score--
      relations.push('月支冲夫妻宫，感情合作多磨')
    } else if (LUCK_LIU_HE[z] === dayZhi) {
      score++
      relations.push('月支合夫妻宫，关系和合')
    }

    // 流月：月度吉凶本就无凭，刻意降级为"较宜/一般/宜慎"，不出"大吉/吉"
    const tag = score >= 1 ? '较宜' : score === 0 ? '一般' : '宜慎'
    const note = `${shiShenGan}主事，${TAG_ADVICE[tag]}。`
    out.push({
      month: m, ganZhi: gz, jieQi, rangeLabel, shiShenGan,
      score, tag, relations, note
    })
  }
  return out
}

// 生成结构化岁运数据（规则引擎确定性计算，AI 不参与）
export function buildLuckCycles(chart: AnalyzableChart, now: Date = new Date()): LuckCycles {
  const nowYear = now.getFullYear()
  const { favorable, unfavorable } = getFavorSets(chart)
  const daYun = buildLuckDaYun(chart, favorable, unfavorable, nowYear)
  const currentDaYunGanZhi = daYun.find(d => d.current)?.ganZhi || ''
  const liuNian = buildLuckLiuNian(chart, favorable, unfavorable, nowYear, daYun)
  // ★ 太岁必须取【当年流年】的地支（current 项），严禁 liuNian[0]——
  //   流年首位是 8 年前；流月「冲/合太岁」对错太岁会整体失效（复核 2026-10-10）。
  //   i=0（当年）恒在范围 [-8,2] 内；以同一 Solar 链作兜底，保证 nianZhi 永不为 undefined。
  const currentNian = liuNian.find(y => y.current)
  const currentYear = currentNian?.year ?? nowYear
  const nianZhi = currentNian?.ganZhi[1]
    ?? Solar.fromYmdHms(nowYear, 6, 15, 12, 0, 0).getLunar().getEightChar().getYear()[1]
  const liuYue = buildLuckLiuYue(chart, favorable, unfavorable, currentYear, nianZhi)
  // ★ 明年/后年流月（2026-10-22）：年运报告一次覆盖三年，故三年各自生成 12 个月。
  //   干支仍由 lunar-javascript 按该年节气确定，属确定性算法，AI 只能引用不得编造。
  const liuYueByYear: Record<number, LuckLiuYueItem[]> = { [currentYear]: liuYue }
  for (const y of liuNian) {
    if (y.year > currentYear && y.year <= currentYear + 2) {
      liuYueByYear[y.year] = buildLuckLiuYue(chart, favorable, unfavorable, y.year, y.ganZhi[1])
    }
  }
  return { currentDaYunGanZhi, currentYear, daYun, liuNian, liuYue, liuYueByYear }
}

/**
 * ★ 命书免费试读（2026-10-21）：只用规则引擎生成十卷文字，零 AI、零网络。
 *   前两卷（八字总览、性格天赋）给全文，其余八卷只给 1–2 句短引——
 *   前端对短引做模糊处理，既能让用户看到「确实是为这张盘写的」，又不泄露全文。
 *   完整命书仍由 AI 精批（另一条链路），此处不触发任何 AI 调用。
 */
export interface FatebookPreview {
  /** 前两卷规则版全文 */
  free: [string, string]
  /** 其余八卷短引（每条 1–2 句） */
  rest: string[]
  /**
   * 完整命书「十卷合计」的字数下限（取自 aiAnalysis.SECTION_SPECS 求和，由 /api/paipan 注入）。
   * 用于说明试读只是简批、完整版体量另有多大——不做逐卷字数对比：
   * 规则版个别卷可能比 AI 版下限还长，逐卷比反而会造成新的误导。
   */
  fullMinChars?: number
}

/** 取首句（长度 >= 24 才当整句，否则退化为 90 字截断），给正文做「可读但成不了篇」的引子 */
function leadSentence(text: string): string {
  const t = (text || '').trim()
  const m = t.match(/^[^。！？]{0,80}[。！？]/)
  if (m && m[0].length >= 24) return m[0]
  return t.length > 90 ? t.slice(0, 90) + '…' : t
}

export function buildFatebookPreview(chart: AnalyzableChart): FatebookPreview {
  const all = [
    buildOverview(chart),
    buildPersonality(chart),
    buildYongShen(chart),
    buildGeJu(chart),
    buildTiaoHou(chart),
    buildDaYun(chart),
    buildCareer(chart),
    buildMarriage(chart),
    buildChildren(chart),
    buildHealth(chart),
  ]
  return { free: [all[0], all[1]], rest: all.slice(2).map(leadSentence) }
}

export function generateAnalysis(chart: AnalyzableChart): PaidAnalysis {
  return {
    overview: buildOverview(chart),
    personality: buildPersonality(chart),
    yongShen: buildYongShen(chart),
    geJuAnalysis: buildGeJu(chart),
    tiaoHou: buildTiaoHou(chart),
    daYunAnalysis: buildDaYun(chart),
    career: buildCareer(chart),
    marriage: buildMarriage(chart),
    children: buildChildren(chart),
    health: buildHealth(chart),
    luckCycles: buildLuckCycles(chart)
  }
}
