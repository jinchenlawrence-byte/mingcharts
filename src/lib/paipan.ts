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
  changSheng: string // 十二长生：此支对日主所处阶段（长生/沐浴/…/养）
  shenSha: string[] // 此柱命中神煞（渊海子平/三命通会通行口径，见 SHEN_SHA_NOTE）
  kongWang: string // 此柱干支所在旬空亡二支（如「子丑」）
}

/** 神煞取法说明（展示层直接引用，保证口径与实现同源；测试守护逐字同步） */
export const SHEN_SHA_NOTE =
  '神煞取法依《渊海子平》《三命通会》通行口径：天乙贵人、文昌贵人、禄神、羊刃、太极贵人、福星贵人、国印贵人、金舆、红艳煞、天官贵人、天厨贵人自日干起（羊刃仅阳干），学堂、词馆依日干取长生、临官之干支；' +
  '桃花、驿马、华盖、将星、劫煞、灾煞、亡神、六厄自年支、日支起（三合局取支，六厄取局之死位），金匮取年支三合局之帝旺；' +
  '孤辰寡宿、红鸾、天喜、元辰、勾绞煞、血刃、破碎自年支起（元辰依阳男阴女取年支冲前一位、阴男阳女取冲后一位，勾绞煞取年支前、后三辰，血刃依《果老星宗》驾后神煞戌上起子逆行，破碎即暗金的煞子午卯酉见巳、寅申巳亥见酉、辰戌丑未见丑）；' +
  '天德贵人、月德贵人、天医、天赦、四废、月德合、天德合自月支起（天赦、四废见于日柱，月德合、天德合各取月德、天德之合）；' +
  '魁罡、阴阳差错、十恶大败、孤鸾煞、九丑日取自日柱干支（九丑日为乙卯、己卯、辛卯、乙酉、己酉、辛酉、戊子、戊午、壬子、壬午十日），三奇贵人取年月日或月日时天干顺布；' +
  '童子煞依月支季节（春秋寅子、冬夏卯未辰）或年柱纳音（金木命见午卯、水火命见酉戌、土命见辰巳）查日支、时支，德秀贵人自月支起见四柱天干（《三命通会》），' +
  '金神取乙丑、己巳、癸酉见于日柱、时柱，飞刃自日干起（仅阳干、羊刃对冲），流霞自日干起，天罗地网依年柱纳音（火命见戌亥、水土命见辰巳，金木命不论）查日支、时支，' +
  '六秀日、十灵日取自日柱干支；空亡为各柱干支所在旬空之二支。均为传统民俗论法（童子煞属民俗传说），流派间取法或有差异，仅供参考、非确定性，不构成任何决策建议。'

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

// ===================== 神煞表（渊海子平/三命通会通行口径） =====================
// 天干系神煞自【日干】起见四柱地支；地支系神煞自【年支/日支】或【年支】或【月支】起；
// 日柱系神煞直接取日柱干支。各表来源口诀见每条注释。

/** 天乙贵人：「甲戊庚牛羊，乙己鼠猴乡，丙丁猪鸡位，壬癸兔蛇藏，六辛逢马虎」（日干起） */
const TIAN_YI: Record<string, string[]> = {
  '甲': ['丑', '未'], '戊': ['丑', '未'], '庚': ['丑', '未'],
  '乙': ['子', '申'], '己': ['子', '申'],
  '丙': ['亥', '酉'], '丁': ['亥', '酉'],
  '壬': ['卯', '巳'], '癸': ['卯', '巳'],
  '辛': ['午', '寅']
}

/** 文昌贵人：「甲乙巳午报君知，丙戊申宫丁己鸡，庚猪辛鼠壬逢虎，癸人见卯入云梯」（日干起） */
const WEN_CHANG: Record<string, string> = {
  '甲': '巳', '乙': '午', '丙': '申', '丁': '酉', '戊': '申',
  '己': '酉', '庚': '亥', '辛': '子', '壬': '寅', '癸': '卯'
}

/** 禄神（临官之位，日干起）：「甲禄在寅，乙禄在卯，丙戊禄在巳，丁己禄在午，庚禄在申，辛禄在酉，壬禄在亥，癸禄在子」 */
const LU_SHEN: Record<string, string> = {
  '甲': '寅', '乙': '卯', '丙': '巳', '丁': '午', '戊': '巳',
  '己': '午', '庚': '申', '辛': '酉', '壬': '亥', '癸': '子'
}

/** 羊刃（帝旺之位，仅阳干取；阴干不论羊刃） */
const YANG_REN: Record<string, string> = {
  '甲': '卯', '丙': '午', '戊': '午', '庚': '酉', '壬': '子'
}

/** 五阳干（甲丙戊庚壬），用于元辰/勾绞煞判定阳年/阴年 */
const YANG_GAN_SET = new Set(['甲', '丙', '戊', '庚', '壬'])

/** 太极贵人：「甲乙生人子午中，丙丁鸡兔定亨通，戊己两干临四季（辰戌丑未），庚辛寅亥禄丰隆，壬癸巳申偏喜美」（日干起） */
const TAI_JI: Record<string, string[]> = {
  '甲': ['子', '午'], '乙': ['子', '午'],
  '丙': ['卯', '酉'], '丁': ['卯', '酉'],
  '戊': ['辰', '戌', '丑', '未'], '己': ['辰', '戌', '丑', '未'],
  '庚': ['寅', '亥'], '辛': ['寅', '亥'],
  '壬': ['巳', '申'], '癸': ['巳', '申']
}

/** 福星贵人：「甲丙相邀入虎乡，更游鼠穴最高强，戊猴己未丁宜亥，乙贵逢牛福禄昌，庚趁马头辛到巳，壬骑龙背喜非常，癸人见卯入云梯」（日干起） */
const FU_XING: Record<string, string[]> = {
  '甲': ['寅', '子'], '丙': ['寅', '子'],
  '乙': ['丑'], '丁': ['亥'], '戊': ['申'], '己': ['未'],
  '庚': ['午'], '辛': ['巳'], '壬': ['辰'], '癸': ['卯']
}

/** 国印贵人：「甲见戌、乙见亥、丙见丑、丁见寅、戊见丑、己见寅、庚见辰、辛见巳、壬见午、癸见未」（日干起） */
const GUO_YIN: Record<string, string> = {
  '甲': '戌', '乙': '亥', '丙': '丑', '丁': '寅', '戊': '丑',
  '己': '寅', '庚': '辰', '辛': '巳', '壬': '午', '癸': '未'
}

/** 金舆（禄前二位，日干起）：甲辰、乙巳、丙未、丁申、戊未、己申、庚戌、辛亥、壬丑、癸寅 */
const JIN_YU: Record<string, string> = {
  '甲': '辰', '乙': '巳', '丙': '未', '丁': '申', '戊': '未',
  '己': '申', '庚': '戌', '辛': '亥', '壬': '丑', '癸': '寅'
}

/** 红艳煞：「多情多欲少人知，六丙逢寅辛见鸡，癸临申上丁见未，甲乙午申庚见戌，戊己怕辰壬怕子」（日干起） */
const HONG_YAN: Record<string, string> = {
  '甲': '午', '乙': '申', '丙': '寅', '丁': '未', '戊': '辰',
  '己': '辰', '庚': '戌', '辛': '酉', '壬': '子', '癸': '申'
}

/** 天官贵人（《渊海子平》）：「天官遁甲入羊群，乙诲青龙事要陈，丙见巳兮丁见酉，戊戌己卯庚亥寻，辛申壬寅癸见午」（日干起） */
const TIAN_GUAN: Record<string, string> = {
  '甲': '未', '乙': '辰', '丙': '巳', '丁': '酉', '戊': '戌',
  '己': '卯', '庚': '亥', '辛': '申', '壬': '寅', '癸': '午'
}

/** 天厨贵人（《古今图书集成》引古籍，「天厨名食神禄」）：「甲乙巳午丙在子，丁戊巳午己申储，庚落寅中辛寻午，壬厨居酉癸临猪」（日干起） */
const TIAN_CHU: Record<string, string> = {
  '甲': '巳', '乙': '午', '丙': '子', '丁': '巳', '戊': '午',
  '己': '申', '庚': '寅', '辛': '午', '壬': '酉', '癸': '亥'
}

/** 学堂（《渊海子平》论十干学堂，「长生乃学堂之正位」，子平法取日干长生干支）：甲见己亥、乙见壬午、丙见丙寅、丁见丁酉、戊见戊寅、己见己酉、庚见辛巳、辛见甲子、壬见甲申、癸见乙卯（日干起，配干支） */
const XUE_TANG: Record<string, string> = {
  '甲': '己亥', '乙': '壬午', '丙': '丙寅', '丁': '丁酉', '戊': '戊寅',
  '己': '己酉', '庚': '辛巳', '辛': '甲子', '壬': '甲申', '癸': '乙卯'
}
/** 词馆（《渊海子平》「临官乃词馆之正位」）：甲见庚寅、乙见辛卯、丙见乙巳、丁见戊午、戊见丁巳、己见庚午、庚见壬申、辛见癸酉、壬见癸亥、癸见壬戌（日干起，配干支） */
const CI_GUAN: Record<string, string> = {
  '甲': '庚寅', '乙': '辛卯', '丙': '乙巳', '丁': '戊午', '戊': '丁巳',
  '己': '庚午', '庚': '壬申', '辛': '癸酉', '壬': '癸亥', '癸': '壬戌'
}

type SanHeGroup = '申子辰' | '寅午戌' | '巳酉丑' | '亥卯未'

/** 三合局归属：每支所属三合局 */
const SAN_HE_GROUP: Record<string, SanHeGroup> = {
  '申': '申子辰', '子': '申子辰', '辰': '申子辰',
  '寅': '寅午戌', '午': '寅午戌', '戌': '寅午戌',
  '巳': '巳酉丑', '酉': '巳酉丑', '丑': '巳酉丑',
  '亥': '亥卯未', '卯': '亥卯未', '未': '亥卯未'
}

/** 桃花（咸池）：「申子辰在酉，寅午戌在卯，巳酉丑在午，亥卯未在子」（年支/日支起） */
const TAO_HUA: Record<SanHeGroup, string> = { '申子辰': '酉', '寅午戌': '卯', '巳酉丑': '午', '亥卯未': '子' }
/** 驿马：「申子辰马在寅，寅午戌马在申，巳酉丑马在亥，亥卯未马在巳」（年支/日支起） */
const YI_MA: Record<SanHeGroup, string> = { '申子辰': '寅', '寅午戌': '申', '巳酉丑': '亥', '亥卯未': '巳' }
/** 华盖（三合局库位，年支/日支起） */
const HUA_GAI: Record<SanHeGroup, string> = { '申子辰': '辰', '寅午戌': '戌', '巳酉丑': '丑', '亥卯未': '未' }
/** 将星（三合局旺位中神，年支/日支起） */
const JIANG_XING: Record<SanHeGroup, string> = { '申子辰': '子', '寅午戌': '午', '巳酉丑': '酉', '亥卯未': '卯' }
/** 劫煞（三合局绝位）：「申子辰劫在巳，寅午戌劫在亥，巳酉丑劫在寅，亥卯未劫在申」（年支/日支起） */
const JIE_SHA: Record<SanHeGroup, string> = { '申子辰': '巳', '寅午戌': '亥', '巳酉丑': '寅', '亥卯未': '申' }
/** 灾煞（三合局中神之冲）：「申子辰灾在午，寅午戌灾在子，巳酉丑灾在卯，亥卯未灾在酉」（年支/日支起） */
const ZAI_SHA: Record<SanHeGroup, string> = { '申子辰': '午', '寅午戌': '子', '巳酉丑': '卯', '亥卯未': '酉' }
/** 亡神（三合局临官位）：「申子辰亡在亥，寅午戌亡在巳，巳酉丑亡在申，亥卯未亡在寅」（年支/日支起） */
const WANG_SHEN: Record<SanHeGroup, string> = { '申子辰': '亥', '寅午戌': '巳', '巳酉丑': '申', '亥卯未': '寅' }
/** 六厄（三合局死位，《三命通会》「常居马前一辰，劫后二辰」）：「申子辰见卯，寅午戌见酉，巳酉丑见子，亥卯未见午」（年支/日支起） */
const LIU_E: Record<SanHeGroup, string> = { '申子辰': '卯', '寅午戌': '酉', '巳酉丑': '子', '亥卯未': '午' }
/** 金匮（财帛星，三合局之帝旺）：「申子辰见子，亥卯未见卯，寅午戌见午，巳酉丑见酉」（年支起） */
const JIN_GUI: Record<SanHeGroup, string> = { '申子辰': '子', '寅午戌': '午', '巳酉丑': '酉', '亥卯未': '卯' }

/** 孤辰（年支起）：「亥子丑孤在寅，寅卯辰孤在巳，巳午未孤在申，申酉戌孤在亥」 */
const GU_CHEN: Record<string, string> = {
  '亥': '寅', '子': '寅', '丑': '寅',
  '寅': '巳', '卯': '巳', '辰': '巳',
  '巳': '申', '午': '申', '未': '申',
  '申': '亥', '酉': '亥', '戌': '亥'
}
/** 寡宿（年支起）：「亥子丑寡在戌，寅卯辰寡在丑，巳午未寡在辰，申酉戌寡在未」 */
const GUA_SU: Record<string, string> = {
  '亥': '戌', '子': '戌', '丑': '戌',
  '寅': '丑', '卯': '丑', '辰': '丑',
  '巳': '辰', '午': '辰', '未': '辰',
  '申': '未', '酉': '未', '戌': '未'
}
/** 红鸾（年支起，卯上起子逆行）：子卯、丑寅、寅丑、卯子、辰亥、巳戌、午酉、未申、申未、酉午、戌巳、亥辰 */
const HONG_LUAN: Record<string, string> = {
  '子': '卯', '丑': '寅', '寅': '丑', '卯': '子', '辰': '亥', '巳': '戌',
  '午': '酉', '未': '申', '申': '未', '酉': '午', '戌': '巳', '亥': '辰'
}
/** 天喜（红鸾之对冲，年支起） */
const TIAN_XI: Record<string, string> = {
  '子': '酉', '丑': '申', '寅': '未', '卯': '午', '辰': '巳', '巳': '辰',
  '午': '卯', '未': '寅', '申': '丑', '酉': '子', '戌': '亥', '亥': '戌'
}
/** 血刃（《果老星宗》驾后神煞，「戌上起子逆行」；年支起）：子见戌、丑见酉、寅见申、卯见未、辰见午、巳见巳、午见辰、未见卯、申见寅、酉见丑、戌见子、亥见亥 */
const XUE_REN: Record<string, string> = {
  '子': '戌', '丑': '酉', '寅': '申', '卯': '未', '辰': '午', '巳': '巳',
  '午': '辰', '未': '卯', '申': '寅', '酉': '丑', '戌': '子', '亥': '亥'
}
/** 破碎（《三命通会》暗金的煞，又名吟呻、白衣；年支起）：「子午卯酉在巳，寅申巳亥在酉，辰戌丑未在丑」 */
const PO_SUI: Record<string, string> = {
  '子': '巳', '午': '巳', '卯': '巳', '酉': '巳',
  '寅': '酉', '申': '酉', '巳': '酉', '亥': '酉',
  '辰': '丑', '戌': '丑', '丑': '丑', '未': '丑'
}

/** 天德贵人（月支起，见四柱天干或地支）：「正丁二申中，三壬四辛同，五乾六甲上，七癸八艮宫（寅），九丙十居乙，子巳（十一月巳）十二月庚」 */
const TIAN_DE: Record<string, string> = {
  '寅': '丁', '卯': '申', '辰': '壬', '巳': '辛', '午': '亥', '未': '甲',
  '申': '癸', '酉': '寅', '戌': '丙', '亥': '乙', '子': '巳', '丑': '庚'
}
/** 月德贵人（月支三合局起，见四柱天干）：「寅午戌月在丙，申子辰月在壬，亥卯未月在甲，巳酉丑月在庚」 */
const YUE_DE: Record<SanHeGroup, string> = { '申子辰': '壬', '寅午戌': '丙', '巳酉丑': '庚', '亥卯未': '甲' }
/** 月德合（月支三合局起，见四柱天干）：「寅午戌月在辛，申子辰月在丁，亥卯未月在己，巳酉丑月在乙」——即月德贵人之合干 */
const YUE_DE_HE: Record<SanHeGroup, string> = { '申子辰': '丁', '寅午戌': '辛', '巳酉丑': '乙', '亥卯未': '己' }
/** 天德合（月支起，见四柱天干或地支）＝天德贵人之六合：天德为干取其合干、为支取其六合支（寅见壬、卯见巳、辰见丁、巳见丙、午见寅、未见己、申见戊、酉见亥、戌见辛、亥见庚、子见申、丑见乙） */
const TIAN_DE_HE: Record<string, string> = {
  '寅': '壬', '卯': '巳', '辰': '丁', '巳': '丙', '午': '寅', '未': '己',
  '申': '戊', '酉': '亥', '戌': '辛', '亥': '庚', '子': '申', '丑': '乙'
}
/** 天医（月支前一支）：正月（寅月）见丑、二月见寅，依次类推 */
const ZHI_ORDER: string[] = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']
/** 四季（月支→季节），供天赦/四废查表 */
const SEASON: Record<string, '春' | '夏' | '秋' | '冬'> = {
  '寅': '春', '卯': '春', '辰': '春',
  '巳': '夏', '午': '夏', '未': '夏',
  '申': '秋', '酉': '秋', '戌': '秋',
  '亥': '冬', '子': '冬', '丑': '冬'
}
/** 天赦：「春戊寅，夏甲午，秋戊申，冬甲子」（见于日柱） */
const TIAN_SHE: Record<'春' | '夏' | '秋' | '冬', string[]> = {
  '春': ['戊寅'], '夏': ['甲午'], '秋': ['戊申'], '冬': ['甲子']
}
/** 四废：「春庚申辛酉，夏壬子癸亥，秋甲寅乙卯，冬丙午丁巳」（见于日柱） */
const SI_FEI: Record<'春' | '夏' | '秋' | '冬', string[]> = {
  '春': ['庚申', '辛酉'], '夏': ['壬子', '癸亥'], '秋': ['甲寅', '乙卯'], '冬': ['丙午', '丁巳']
}

/** 魁罡（日柱）：庚辰、庚戌、壬辰、戊戌 */
const KUI_GANG: string[] = ['庚辰', '庚戌', '壬辰', '戊戌']
/** 阴阳差错（日柱）：丙子丁丑戊寅辛卯壬辰癸巳丙午丁未戊申辛酉壬戌癸亥 */
const YIN_YANG_CHA_CUO: string[] = ['丙子', '丁丑', '戊寅', '辛卯', '壬辰', '癸巳', '丙午', '丁未', '戊申', '辛酉', '壬戌', '癸亥']
/** 十恶大败（日柱）：甲辰乙巳壬申丙申丁亥庚辰戊戌癸亥辛巳己丑 */
const SHI_E_DA_BAI: string[] = ['甲辰', '乙巳', '壬申', '丙申', '丁亥', '庚辰', '戊戌', '癸亥', '辛巳', '己丑']
/** 孤鸾煞（日柱）：「木火逢蛇大不祥，金猪何必强猴郎，土猴木虎夫何在」→ 乙巳、丁巳、辛亥、戊申、甲寅 */
const GU_LUAN: string[] = ['乙巳', '丁巳', '辛亥', '戊申', '甲寅']
/** 九丑日（《御定星历考原》引《金柜经》；日柱）：「壬戊两双居子午，乙辛卯酉亦重逢，更将己上兔鸡位」→ 乙卯、己卯、辛卯、乙酉、己酉、辛酉、戊子、戊午、壬子、壬午 */
const JIU_CHOU_RI: string[] = ['乙卯', '己卯', '辛卯', '乙酉', '己酉', '辛酉', '戊子', '戊午', '壬子', '壬午']
/** 三奇贵人（年月日或月日时天干顺布）：天上甲戊庚、地下乙丙丁、人中壬癸辛 */
const SAN_QI: string[] = ['甲戊庚', '乙丙丁', '壬癸辛']

// ===================== 第二批神煞（童子煞/德秀贵人/金神/飞刃/流霞/天罗地网/六秀日/十灵日） =====================

/** 六十甲子序号（甲子=0）。解 CRT：k≡g (mod 10)、k≡z (mod 12)，m∈0..5 遍历 k=g+10m 必得唯一解 */
const GAN_ORDER: string[] = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
function jiaziIndex(gz: string): number {
  const g = GAN_ORDER.indexOf(gz[0])
  const z = ZHI_ORDER.indexOf(gz[1])
  if (g < 0 || z < 0) throw new Error(`非法干支：${gz}`)
  for (let m = 0; m < 6; m++) {
    const k = g + 10 * m
    if (k % 12 === z) return k
  }
  throw new Error(`非法干支：${gz}`)
}
/** 六十甲子纳音五行（30 对：甲子乙丑海中金起，壬戌癸亥大海水止） */
const NAYIN_WUXING: string[] = [
  '金', '火', '木', '土', '金',   // 甲子乙丑…壬申癸酉
  '火', '水', '土', '金', '木',   // 甲戌乙亥…壬午癸未
  '水', '土', '火', '木', '水',   // 甲申乙酉…壬辰癸巳
  '金', '火', '木', '土', '金',   // 甲午乙未…壬寅癸卯
  '火', '水', '土', '金', '木',   // 甲辰乙巳…壬子癸丑
  '水', '土', '火', '木', '水'    // 甲寅乙卯…壬戌癸亥
]
/** 干支纳音五行（取自六十甲子纳音，供童子煞、天罗地网）。
 *  干支不成对（如「甲丑」，g、z 奇偶错位）时返回 null：shenShaOf 为导出函数，入柱可含独立干/支（合成测试即如此），
 *  此时纳音路径不生效；真实排盘四柱恒为合法干支对，不受影响 */
function nayinWuxing(gz: string): string | null {
  const g = GAN_ORDER.indexOf(gz[0])
  const z = ZHI_ORDER.indexOf(gz[1])
  if (g < 0 || z < 0 || (z - g) % 2 !== 0) return null
  return NAYIN_WUXING[Math.floor(jiaziIndex(gz) / 2)]
}

/** 童子煞（民俗传说性质）：「春秋寅子贵，冬夏卯未辰」按月支季节；或「金木马卯合，水火鸡犬多，土命逢辰巳」按年柱纳音；均见日支、时支 */
const TONG_ZI_SEASON: Record<'春' | '夏' | '秋' | '冬', string[]> = {
  '春': ['寅', '子'], '夏': ['卯', '未', '辰'], '秋': ['寅', '子'], '冬': ['卯', '未', '辰']
}
const TONG_ZI_NAYIN: Record<string, string[]> = {
  '金': ['午', '卯'], '木': ['午', '卯'],
  '水': ['酉', '戌'], '火': ['酉', '戌'],
  '土': ['辰', '巳']
}
/** 德秀贵人（《三命通会》）：寅午戌月丙丁为德、戊癸为秀；申子辰月壬癸戊己为德、丙辛甲己为秀；巳酉丑月庚辛为德、乙庚为秀；亥卯未月甲乙为德、丁壬为秀。见四柱天干 */
const DE_XIU: Record<SanHeGroup, { de: string[]; xiu: string[] }> = {
  '寅午戌': { de: ['丙', '丁'], xiu: ['戊', '癸'] },
  '申子辰': { de: ['壬', '癸', '戊', '己'], xiu: ['丙', '辛', '甲', '己'] },
  '巳酉丑': { de: ['庚', '辛'], xiu: ['乙', '庚'] },
  '亥卯未': { de: ['甲', '乙'], xiu: ['丁', '壬'] }
}
/** 金神（日柱/时柱）：「金神入火乡，富贵天下响」→ 乙丑、己巳、癸酉 */
const JIN_SHEN: string[] = ['乙丑', '己巳', '癸酉']
/** 飞刃（仅阳干，羊刃对冲）：甲见酉、丙见子、戊见子、庚见卯、壬见午（日干起） */
const FEI_REN: Record<string, string> = {
  '甲': '酉', '丙': '子', '戊': '子', '庚': '卯', '壬': '午'
}
/** 流霞（日干起）：甲酉、乙戌、丙未、丁申、戊巳、己午、庚辰、辛卯、壬亥、癸寅 */
const LIU_XIA: Record<string, string> = {
  '甲': '酉', '乙': '戌', '丙': '未', '丁': '申', '戊': '巳',
  '己': '午', '庚': '辰', '辛': '卯', '壬': '亥', '癸': '寅'
}
/** 天罗地网（年柱纳音起）：「火命人逢戌亥为天罗，水土命逢辰巳为地网」，金木命不论；见日支、时支 */
const TIAN_LUO_DI_WANG: Record<string, string[]> = {
  '火': ['戌', '亥'], '水': ['辰', '巳'], '土': ['辰', '巳']
}
/** 六秀日（日柱）：丙午、丁未、戊子、戊午、己丑、己未 */
const LIU_XIU_RI: string[] = ['丙午', '丁未', '戊子', '戊午', '己丑', '己未']
/** 十灵日（日柱）：甲辰、乙亥、丙辰、丁酉、戊午、庚戌、庚寅、辛亥、壬寅、癸未 */
const SHI_LING_RI: string[] = ['甲辰', '乙亥', '丙辰', '丁酉', '戊午', '庚戌', '庚寅', '辛亥', '壬寅', '癸未']

/** 51 项神煞名清单（= shenShaOf 扫描序）。知识文章映射（shenshaArticles.ts）与测试以此对账，新增神煞须同步三处：本表、映射、文章 */
export const SHEN_SHA_NAMES: readonly string[] = [
  // ① 日干起
  '天乙贵人', '文昌贵人', '禄神', '羊刃', '太极贵人', '福星贵人', '国印贵人', '金舆', '红艳煞',
  '天官贵人', '天厨贵人', '学堂', '词馆',
  // ② 年支/日支三合局起
  '桃花', '驿马', '华盖', '将星', '劫煞', '灾煞', '亡神', '六厄', '金匮',
  // ③ 年支起
  '孤辰', '寡宿', '红鸾', '天喜', '元辰', '勾绞煞', '血刃', '破碎',
  // ④ 月支起
  '天德贵人', '月德贵人', '天德合', '月德合', '天医', '天赦', '四废',
  // ⑤ 日柱系
  '魁罡', '阴阳差错', '十恶大败', '孤鸾煞', '九丑日', '三奇贵人',
  // ⑥ 第二批
  '童子煞', '德秀贵人', '金神', '飞刃', '流霞', '天罗地网', '六秀日', '十灵日'
]

/**
 * 四柱神煞（渊海子平/三命通会通行口径）。
 * 输入四柱干支与日主（可选性别，供元辰/勾绞煞按阳男阴女、阴男阳女取法），返回每柱命中的神煞名列表。
 * 柱内顺序 = 扫描序：
 *   ① 日干起：天乙贵人→文昌贵人→禄神→羊刃→太极贵人→福星贵人→国印贵人→金舆→红艳煞→天官贵人→天厨贵人→学堂→词馆；
 *   ② 年支、日支逐局（去重）：桃花→驿马→华盖→将星→劫煞→灾煞→亡神→六厄→金匮；
 *   ③ 年支起：孤辰→寡宿→红鸾→天喜→元辰→勾绞煞→血刃→破碎；
 *   ④ 月支起：天德贵人→月德贵人→天德合→月德合→天医（天赦、四废仅日柱）；
 *   ⑤ 日柱：魁罡→阴阳差错→十恶大败→孤鸾煞→九丑日；三奇贵人（年月日/月日时顺布）；
 *   ⑥ 第二批：童子煞（月支季节/年柱纳音起，见日支、时支）→德秀贵人（月支起见四柱天干）→
 *      金神（日柱/时柱）→飞刃（日干起，仅阳干）→流霞（日干起）→天罗地网（年柱纳音起，见日支、时支）→
 *      六秀日/十灵日（日柱）。
 * 同柱重复命中只记一次。
 */
export function shenShaOf(
  pillars: Array<{ gan: string; zhi: string }>,
  dayMaster: string,
  gender?: number
): string[][] {
  const result: string[][] = [[], [], [], []]
  const push = (name: string, match: (i: number) => boolean) => {
    for (let i = 0; i < 4; i++) {
      if (match(i) && !result[i].includes(name)) result[i].push(name)
    }
  }
  const byZhi = (targets: string[]) => (i: number) => targets.includes(pillars[i].zhi)
  const byGan = (targets: string[]) => (i: number) => targets.includes(pillars[i].gan)

  // ① 日干起
  push('天乙贵人', byZhi(TIAN_YI[dayMaster] || []))
  push('文昌贵人', byZhi([WEN_CHANG[dayMaster]].filter(Boolean)))
  push('禄神', byZhi([LU_SHEN[dayMaster]].filter(Boolean)))
  if (YANG_REN[dayMaster]) push('羊刃', byZhi([YANG_REN[dayMaster]]))
  push('太极贵人', byZhi(TAI_JI[dayMaster] || []))
  push('福星贵人', byZhi(FU_XING[dayMaster] || []))
  push('国印贵人', byZhi([GUO_YIN[dayMaster]].filter(Boolean)))
  push('金舆', byZhi([JIN_YU[dayMaster]].filter(Boolean)))
  push('红艳煞', byZhi([HONG_YAN[dayMaster]].filter(Boolean)))
  push('天官贵人', byZhi([TIAN_GUAN[dayMaster]].filter(Boolean)))
  push('天厨贵人', byZhi([TIAN_CHU[dayMaster]].filter(Boolean)))
  // 学堂/词馆：取日干对应长生/临官之干支（配干配支，见四柱）
  const xueTang = XUE_TANG[dayMaster]
  if (xueTang) push('学堂', (i) => pillars[i].gan + pillars[i].zhi === xueTang)
  const ciGuan = CI_GUAN[dayMaster]
  if (ciGuan) push('词馆', (i) => pillars[i].gan + pillars[i].zhi === ciGuan)

  // ② 年支、日支起（三合局系）
  for (const sz of [...new Set([pillars[0].zhi, pillars[2].zhi])]) {
    const g = SAN_HE_GROUP[sz]
    if (!g) continue
    push('桃花', byZhi([TAO_HUA[g]]))
    push('驿马', byZhi([YI_MA[g]]))
    push('华盖', byZhi([HUA_GAI[g]]))
    push('将星', byZhi([JIANG_XING[g]]))
    push('劫煞', byZhi([JIE_SHA[g]]))
    push('灾煞', byZhi([ZAI_SHA[g]]))
    push('亡神', byZhi([WANG_SHEN[g]]))
    push('六厄', byZhi([LIU_E[g]]))
  }
  // 金匮：年支三合局之帝旺（财帛星）
  {
    const ygz = SAN_HE_GROUP[pillars[0].zhi]
    if (ygz) push('金匮', byZhi([JIN_GUI[ygz]]))
  }

  // ③ 年支起
  const yZhi = pillars[0].zhi
  push('孤辰', byZhi([GU_CHEN[yZhi]].filter(Boolean)))
  push('寡宿', byZhi([GUA_SU[yZhi]].filter(Boolean)))
  push('红鸾', byZhi([HONG_LUAN[yZhi]].filter(Boolean)))
  push('天喜', byZhi([TIAN_XI[yZhi]].filter(Boolean)))
  // 元辰（大耗）、勾绞煞：依阳男阴女 / 阴男阳女取法（需性别；未传性别则不取，不臆断）
  if (gender === 0 || gender === 1) {
    const yearYin = !YANG_GAN_SET.has(pillars[0].gan)
    const yangNanYinNv = (gender === 1 && !yearYin) || (gender === 0 && yearYin)
    const yIdx = ZHI_ORDER.indexOf(yZhi)
    // 元辰：冲前一位（阳男阴女）／冲后一位（阴男阳女）
    if (yIdx >= 0) {
      const chongIdx = (yIdx + 6) % 12
      const yuanChen = yangNanYinNv ? ZHI_ORDER[(chongIdx + 1) % 12] : ZHI_ORDER[(chongIdx + 11) % 12]
      push('元辰', byZhi([yuanChen]))
      // 勾绞煞：命前三辰为勾、命后三辰为绞（阳男阴女）；阴男阳女反是
      const three = yangNanYinNv ? 3 : 9
      const gou = ZHI_ORDER[(yIdx + three) % 12]
      const jiao = ZHI_ORDER[(yIdx + 12 - three) % 12]
      push('勾绞煞', byZhi([gou, jiao]))
    }
  }
  // 血刃（《果老星宗》驾后神煞戌上起子逆行）、破碎（暗金的煞）
  push('血刃', byZhi([XUE_REN[yZhi]].filter(Boolean)))
  push('破碎', byZhi([PO_SUI[yZhi]].filter(Boolean)))

  // ④ 月支起（天德见天干或地支；月德见天干；天医＝月支前一支；天赦/四废见日柱干支）
  const mZhi = pillars[1].zhi
  const tianDe = TIAN_DE[mZhi]
  if (tianDe) push('天德贵人', (i) => pillars[i].gan === tianDe || pillars[i].zhi === tianDe)
  const tianDeHe = TIAN_DE_HE[mZhi]
  if (tianDeHe) push('天德合', (i) => pillars[i].gan === tianDeHe || pillars[i].zhi === tianDeHe)
  const yueDe = YUE_DE[SAN_HE_GROUP[mZhi]]
  if (yueDe) push('月德贵人', byGan([yueDe]))
  const yueDeHe = YUE_DE_HE[SAN_HE_GROUP[mZhi]]
  if (yueDeHe) push('月德合', byGan([yueDeHe]))
  const mIdx = ZHI_ORDER.indexOf(mZhi)
  if (mIdx > 0) push('天医', byZhi([ZHI_ORDER[mIdx - 1]]))
  else if (mIdx === 0) push('天医', byZhi([ZHI_ORDER[11]]))
  const season = SEASON[mZhi]
  if (season) {
    push('天赦', (i) => i === 2 && TIAN_SHE[season].includes(pillars[i].gan + pillars[i].zhi))
    push('四废', (i) => i === 2 && SI_FEI[season].includes(pillars[i].gan + pillars[i].zhi))
  }

  // ⑤ 日柱系 + 三奇（年月日 / 月日时 干顺布）
  const dayGanZhi = pillars[2].gan + pillars[2].zhi
  push('魁罡', (i) => i === 2 && KUI_GANG.includes(dayGanZhi))
  push('阴阳差错', (i) => i === 2 && YIN_YANG_CHA_CUO.includes(dayGanZhi))
  push('十恶大败', (i) => i === 2 && SHI_E_DA_BAI.includes(dayGanZhi))
  push('孤鸾煞', (i) => i === 2 && GU_LUAN.includes(dayGanZhi))
  push('九丑日', (i) => i === 2 && JIU_CHOU_RI.includes(dayGanZhi))
  const gans = pillars.map(p => p.gan)
  for (const [a, b, c] of [[0, 1, 2], [1, 2, 3]]) {
    const seq = gans[a] + gans[b] + gans[c]
    if (SAN_QI.includes(seq)) {
      push('三奇贵人', (i) => i === a || i === b || i === c)
    }
  }

  // ⑥ 第二批 8 项（童子煞、天罗地网按年柱纳音；德秀贵人月支起；金神/六秀日/十灵日取日柱或时柱干支）
  const dayHour = (i: number) => i === 2 || i === 3
  // 童子煞：季节路径（春秋寅子/冬夏卯未辰）＋ 纳音路径（金木午卯/水火酉戌/土辰巳），见日支、时支
  const yearNayin = nayinWuxing(pillars[0].gan + pillars[0].zhi) || ''
  const tongZiTargets = [...(season ? TONG_ZI_SEASON[season] : []), ...(TONG_ZI_NAYIN[yearNayin] || [])]
  if (tongZiTargets.length) push('童子煞', (i) => dayHour(i) && tongZiTargets.includes(pillars[i].zhi))
  // 德秀贵人（三命通会）：月支三合局定德干、秀干，见四柱天干
  const deXiu = DE_XIU[SAN_HE_GROUP[pillars[1].zhi]]
  if (deXiu) push('德秀贵人', byGan([...deXiu.de, ...deXiu.xiu]))
  // 金神：乙丑、己巳、癸酉，见日柱或时柱
  push('金神', (i) => dayHour(i) && JIN_SHEN.includes(pillars[i].gan + pillars[i].zhi))
  // 飞刃：仅阳干，羊刃对冲（日干起见四柱地支）
  if (FEI_REN[dayMaster]) push('飞刃', byZhi([FEI_REN[dayMaster]]))
  // 流霞（日干起见四柱地支）
  push('流霞', byZhi([LIU_XIA[dayMaster]].filter(Boolean)))
  // 天罗地网：年柱纳音火命见戌亥、水土命见辰巳（金木命不论），见日支、时支
  const luoWangTargets = TIAN_LUO_DI_WANG[yearNayin] || []
  if (luoWangTargets.length) push('天罗地网', (i) => dayHour(i) && luoWangTargets.includes(pillars[i].zhi))
  // 六秀日、十灵日：日柱干支
  push('六秀日', (i) => i === 2 && LIU_XIU_RI.includes(dayGanZhi))
  push('十灵日', (i) => i === 2 && SHI_LING_RI.includes(dayGanZhi))
  return result
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
  
  // 构建单柱（十二长生＝此支对日主阶段；神煞＝渊海子平/三命通会通行口径，见 shenShaOf；空亡＝本柱旬空）
  const buildPillar = (ganZhi: string, changSheng: string, shenSha: string[], kongWang: string): Pillar => {
    const gan = ganZhi[0]
    const zhi = ganZhi[1]
    const cangGanList = CANG_GAN[zhi] || []
    return {
      gan,
      zhi,
      ganZhi,
      tenGodGan: SHI_SHEN[dayMaster]?.[gan] || '',
      cangGan: cangGanList,
      tenGodCangGan: cangGanList.map(g => SHI_SHEN[dayMaster]?.[g] || ''),
      changSheng,
      shenSha,
      kongWang
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
  
  // 十二长生（lunar-javascript EightChar.get*DiShi：CHANG_SHENG_OFFSET 表 + 阳加阴减 mod 12，
  // 与外部基准官方范例逐柱验证一致；须在 setSect(1) 之后调用以与四柱同源）
  const diShiList = [
    eightChar.getYearDiShi(),
    eightChar.getMonthDiShi(),
    eightChar.getDayDiShi(),
    eightChar.getTimeDiShi()
  ]

  // 神煞（日干起 + 年支/日支/月支起 + 日柱系，渊海子平/三命通会通行口径）
  const shenShaLists = shenShaOf(
    [yearPillar, monthPillar, dayPillar, hourPillar].map(gz => ({ gan: gz[0], zhi: gz[1] })),
    dayMaster,
    gender
  )

  // 空亡（各柱干支所在旬空二支；EightChar 各getXunKong 与四柱同源，日柱版自带晚子时 sect 处理）
  const kongWangList = [
    eightChar.getYearXunKong(),
    eightChar.getMonthXunKong(),
    eightChar.getDayXunKong(),
    eightChar.getTimeXunKong()
  ]

  return {
    input,
    timezoneOffsetApplied: timezoneOffset,
    lunarDate: lunar.toFullString(),
    pillars: {
      year: buildPillar(yearPillar, diShiList[0], shenShaLists[0], kongWangList[0]),
      month: buildPillar(monthPillar, diShiList[1], shenShaLists[1], kongWangList[1]),
      day: buildPillar(dayPillar, diShiList[2], shenShaLists[2], kongWangList[2]),
      hour: buildPillar(hourPillar, diShiList[3], shenShaLists[3], kongWangList[3])
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
