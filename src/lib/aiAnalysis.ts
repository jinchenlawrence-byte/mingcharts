// AI深度解读引擎 - 规则引擎出盘定喜忌，AI负责引经据典的解读文案
import { Solar } from 'lunar-javascript'
import type { AnalyzableChart, PaidAnalysis } from './analysis'
import { TIAO_HOU, buildLuckCycles, generateAnalysis } from './analysis'
import { buildEnPaidAnalysis } from './enAnalysis'
import { aiConcurrency, addUsage, logAiStats, mapWithConcurrency, newStats, parseJsonObject, requestCompletion, sectionMaxTokens } from './aiCall'
import type { AIUsage } from './ai-types'
import {
  unknownGanzhi, unknownGanzhiPinyin, findForbidden, containsCJK, findCJK,
  FORBIDDEN_WORDS_PROMPT, complianceRetryHint, complianceRetryHintEn, EN_REPORT_DISCLAIMER,
} from './ai-check'
import { localeDirective, type OutputLocale } from './locale'
import { branchEn, elementEn, ganZhiEn, stemEn, tenGodEn, tierEn } from './enTerms'
import { qiYunEn, strengthEn, structureEn } from './enPreview'
// ★ 冲/合/害表复用 branchRelations.ts 的单一事实源（HANDOFF-个性化日运 §二）
import { LIU_CHONG, LIU_HAI, LIU_HE } from './branchRelations'
import type { Zhi } from './branchRelations'

const AI_API_KEY = process.env.AI_API_KEY || ''
const AI_BASE_URL = (process.env.AI_BASE_URL || 'https://api.deepseek.com').replace(/\/$/, '')
const AI_MODEL = process.env.AI_MODEL || 'deepseek-chat'
const AI_TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS || 120000)

// AI 只产出十个文字板块，结构化岁运 luckCycles 与相似命例 similarCases 由规则引擎补充
export type AIPaidAnalysis = Omit<PaidAnalysis, 'luckCycles' | 'similarCases'>

// 十大板块及其写作要求（与 PaidAnalysis 键一一对应）
// ★ 字数要求已从 2850 提到 5750（万字补全 §1.2）；每个板块同时补了内容要点
export const SECTION_SPECS: Array<{ key: keyof AIPaidAnalysis; name: string; requirement: string }> = [
  { key: 'overview', name: '八字总览', requirement: '用400-500字总评此命：日主、月令、旺衰、格局、命局最大特点与一句话人生主题。须含以下要点：日主五行本性在月令得令得地得势的完整判断、格局名称与成格/瑕疵简评、命局最显著的一个优势与一个需注意之处、一句话人生主题定调。本板块正文不少于 400 字，低于下限为不合格' },
  { key: 'personality', name: '性格天赋', requirement: '结合日主五行本性（参考滴天髓性情章）与局中十神组合，描述性格优势、短板与天赋所在。须含以下要点：日主本性一词定性、至少两个具体性格特质及其干支来源、一个明显短板及其成因、天赋适合发挥的场合，500-600字。本板块正文不少于 500 字，低于下限为不合格' },
  { key: 'yongShen', name: '用神喜忌', requirement: '明确用神、喜神、忌神及取用理由；给出对应的五行、方位、行业、颜色建议。须含以下要点：用神取用理由（为何取此而非彼）、喜神与忌神的区分及各自影响、至少三个具体建议（行业/方位/颜色/行为习惯），500-600字。本板块正文不少于 500 字，低于下限为不合格' },
  { key: 'geJuAnalysis', name: '格局成败', requirement: '按《子平真诠》格局法分析：用神是否得相神辅佐、有无忌神破格、成格或带瑕疵、格局层次，并引用一句经典原文。须含以下要点：格局名称与取用依据、相神/忌神的在局有无及影响、成格程度判断（上/中/下格或带瑕疵）、一句经典原文及白话解释，600-700字。本板块正文不少于 600 字，低于下限为不合格' },
  { key: 'tiaoHou', name: '调候用神', requirement: '按《穷通宝鉴》分析该日干生于该月的寒暖燥湿之病与调候用神，说明局中调候神是透干、藏支还是不见。须含以下要点：月令气候特征一词定性、首神在局有无与位置（透干/藏支/不见）、调候对整体层次的影响、若调候不见则给出后天补救方向，600-700字。本板块正文不少于 600 字，低于下限为不合格' },
  { key: 'daYunAnalysis', name: '大运流年', requirement: '先点明当前所行大运的干支、十神，并依据算法给出的"结构病"（被合/被冲/被化/被夺/深藏/孤立）点明喜用是否真正有效——用神到位不等于用神有效；再分维度（事业/财运/健康/六亲）给出倾向，措辞具体留余地；大运与流年的时段性质以算法给出的 7 档判词（大吉/吉/小吉/平/小凶/凶/大凶）为准如实引用，判词只描述时段性质、不得写成承诺，严禁"积极进取""突破性进展"等行动指令；然后依次点评今年、明年、后年三年流年：流年天干十神主事领域、与大运及原局的作用（天克地冲/岁运并临/冲合夫妻宫或月令等），最后简述流月节奏与当年需要把握/回避的月份（流月只用"较宜/一般/宜慎"，不得使用 7 档判词）。须含以下要点：当前大运干支与十神、结构病判断及喜用有效性、三年流年逐年点评（天干十神主事+与大运原局作用）、流月节奏简述、分维度倾向（至少三个维度），800-1000字。本板块正文不少于 800 字，低于下限为不合格' },
  { key: 'career', name: '事业财运', requirement: '结合格局、用神与财官配置，给出适合的行业方向、求财方式、财富层次趋势与发力时段。须含以下要点：适合的行业方向至少两个、求财方式（正财/偏财/技术/管理）一词定性、财富层次趋势判断、发力时段建议（结合大运），500-600字。本板块正文不少于 500 字，低于下限为不合格' },
  { key: 'marriage', name: '婚姻感情', requirement: '男命以财为妻星、女命以官为夫星，结合日支夫妻宫的刑冲合害，分析感情模式、配偶特征、婚姻趋势与注意事项。须含以下要点：配偶星在局状态（透干/藏支/不见）、日支夫妻宫的刑冲合害关系、感情模式一词定性、配偶特征简评、注意事项至少两条，500-600字。本板块正文不少于 500 字，低于下限为不合格' },
  { key: 'children', name: '子女六亲', requirement: '男命看官杀、女命看食伤为子女星，结合时柱分析子女缘；并简述与父母、兄弟姐妹的六亲关系。须含以下要点：子女星在局状态、时柱对子女缘的影响、与父母关系简评、与兄弟姐妹关系简评，400-500字。本板块正文不少于 400 字，低于下限为不合格' },
  { key: 'health', name: '健康提示', requirement: '根据五行偏旺偏弱指出对应脏腑的养护重点（木肝胆、火心脏、土脾胃、金肺、水肾），给出生活方式建议。须含以下要点：五行偏旺偏弱对应脏腑、至少两个养护重点、生活方式建议至少三条、情绪与心理层面的提示，400-500字。本板块正文不少于 400 字，低于下限为不合格' }
]

// 英文十卷要求（与中文 SECTION_SPECS 同键、同信息点；英文正文零 CJK）
export const SECTION_SPECS_EN: Array<{ key: keyof AIPaidAnalysis; name: string; requirement: string }> = [
  { key: 'overview', name: 'Chart overview', requirement: `Write 400-500 words summarising the Day Master, month command, strength, structure, the chart's greatest strength and one point to watch, and a one-sentence life theme. Mention "Bazi" and "Four Pillars" explicitly. End with exactly: "${EN_REPORT_DISCLAIMER}"` },
  { key: 'personality', name: 'Temperament and talent', requirement: 'Write 500-600 words. Characterise the Day Master element, give at least two concrete traits with their stem-branch source, one clear shortcoming and its cause, and the settings where the talent works best. Use the term "Ten Gods" where you name the relevant god.' },
  { key: 'yongShen', name: 'Useful God and favourable elements', requirement: 'Write 500-600 words. Identify the Useful God, favourable and unfavourable elements, explain why this choice rather than another, and give at least three practical suggestions (industry, direction, colour or habit). Name the "Ten Gods" explicitly at least once.' },
  { key: 'geJuAnalysis', name: 'Structure analysis', requirement: 'Write 600-700 words. Read whether the structure is supported, whether an unfavourable god breaks it, the structure level, and explain one classical principle in plain English. Reference the "Ten Gods" by name.' },
  { key: 'tiaoHou', name: 'Seasonal adjustment', requirement: 'Write 600-700 words. Describe the seasonal condition of the Day Master in this month, whether the primary adjustment element is present, transparent or hidden, its effect on the chart level, and practical remedies if absent.' },
  { key: 'daYunAnalysis', name: 'Luck Pillars and Annual Pillars', requirement: 'Write 800-1000 words. State the current Luck Pillar stem-branch and Ten God, whether the favourable element is actually effective, give career, wealth, health and relationship tendencies with measured wording, then review this year, next year and the year after using only the supplied facts and monthly rhythm. Mention "True Solar Time" when you describe the birth-time basis, and "Ten Gods" where relevant.' },
  { key: 'career', name: 'Career and wealth', requirement: 'Write 500-600 words. Give at least two suitable industry directions, a wealth style, a trend in wealth capacity, and the timing windows that deserve effort.' },
  { key: 'marriage', name: 'Marriage and relationships', requirement: 'Write 500-600 words. Read the spouse star and spouse palace, the attachment pattern, partner traits, and at least two cautions. For a man the wealth star is the spouse star; for a woman the officer star is the spouse star.' },
  { key: 'children', name: 'Children and kin', requirement: 'Write 400-500 words. Read the children star and hour pillar, and briefly describe relationships with parents and siblings.' },
  { key: 'health', name: 'Health tendencies', requirement: 'Write 400-500 words. Link strong and weak elements to the associated organs, give at least two care priorities and three lifestyle suggestions, and include an emotional-health note. No diagnosis.' },
]

// ★ 英文术语硬约束（阶段二，2026-11-03）：实测四术语一次未出现。
//   出口检查 + 缺哪个只定向重写对应板块（复用单板块重试，不整份重来）。
const EN_REQUIRED_TERMS: Array<{ term: string; section: keyof AIPaidAnalysis; re: RegExp }> = [
  { term: 'Four Pillars', section: 'overview', re: /four\s*pillars/i },
  { term: 'Bazi', section: 'overview', re: /\bbazi\b/i },
  { term: 'Ten Gods', section: 'yongShen', re: /ten\s*gods/i },
  { term: 'True Solar Time', section: 'daYunAnalysis', re: /true\s*solar\s*time/i },
]

// ★ 逐板块调用（万字补全两轮实测教训）：
//   一轮：单次调用写 10 板块 → 实测 2964 字（要求 5750，达成 52%）——
//         模型在一次响应里给每个板块的预算约 300 字，提高要求无效。
//   二轮：两批各 5 板块并行 → 实测 3821 字（达成 66%）——仍不达标。
//   结论：拆为【每板块一次调用】（10 次并行），「本板块不少于 X 字」才有稳定约束力。
//   墙钟耗时≈单次调用（并行）；prompt 开销 ×10 但单价极低，换字数达标值得。
//   合并后仍走同一合规校验（withComplianceRetry），任一板块失败则整体失败重试。
export const SECTION_BATCHES: Array<Array<keyof AIPaidAnalysis>> = SECTION_SPECS.map(s => [s.key])

const SYSTEM_PROMPT = `你是一位精通传统子平命理的资深命理师，熟读《子平真诠》《滴天髓》《穷通宝鉴》《千里命稿》《渊海子平》《三命通会》六部经典。

写作要求：
1. 排盘数据、旺衰、格局、【算法已确认的事实】区块中的所有结论均为确定性算法算出，你只做解读，严禁修改、否认或与其矛盾。
2. 每个板块独立成段，语言典雅而通俗，让普通人能看懂；可适当引用经典原文一句并附白话解释。
3. 断语留余地，用"倾向""易""需注意"等表述，严禁绝对化的生死、灾祸断言；不吓唬用户。
   ${FORBIDDEN_WORDS_PROMPT}
4. 分析要有针对性，紧扣这个命局的具体干支组合，禁止写放之四海皆准的套话。
5. 结尾可有一句劝善修身、知命而为的寄语，但不要说教过度。
6. 输出必须是纯 JSON 对象，不要 markdown 代码块、不要任何额外文字。
7. "overview"（八字总览）板块必须以这句固定免责语收尾、原文照写：
   "以上为命理倾向性分析，仅供参考，非确定性结论，不构成任何投资或人生决策依据。"

命理术语铁律（违反即为错误）：
A. "透干"仅指藏干出现在年干、月干、时干（日干是日主本人，不算）。月令本气即使未透，也可按"取月令本气定格"论格——此时只说"取月令本气X定格"，绝不能说该字"透干"。
B. 十神严格按提供的四柱十神数据引用（如子藏癸水，对壬为劫财，不得说成比肩）。
C. "冲"只能用于六冲对：子午、丑未、寅申、卯酉、辰戌、巳亥。水克火、木克土等只能说"克"，严禁把克说成冲。
D. 调候分析必须先在【调候用神核查】中核对首神在局中的有无与位置（透干/藏支/不见），首神在局则点明"调候有药"，不得无视局中已有之神而泛论寒暖。
E. 流年以【当前时间锚点】为准，先论当年，次及来年、后年。
F. 地支藏干必须逐字引用四柱数据中列出的藏干，严禁提及任何支中不存在的字（例如寅只藏甲丙戊，不得说寅中藏乙）。
G. 大运、流年、流月的干支十神与吉凶倾向，以及天克地冲、岁运并临、冲合夫妻宫/月令/太岁等岁运关系，只能引用【岁运核查】中算法已算出的结果，严禁自行编造或遗漏其中的重点关系；流月以节气换月，不得说成农历初一开始。
H. 大运段与流年段按【7 档判词】给出时段性质（大吉/吉/小吉/平/小凶/凶/大凶），但必须按【岁运核查】给出的结构病（被合/被冲/被化/被夺/深藏/孤立）点明喜用是否真正有效，并分维度（事业/财运/健康/六亲）给出倾向；判词只描述【时段性质】，不得写成承诺；不得出现"积极进取""突破性进展"这类行动指令；【流月】只用"较宜/一般/宜慎"，不得使用 7 档判词。
I. 全文须带"命理为倾向性参考、非确定性预言"的立场，对投资、杠杆、投机等重大决策不作鼓励，必要时提示"宜守""忌投机"。`

const SYSTEM_PROMPT_EN = `You are a senior practitioner of traditional Zi Ping Bazi, trained in the classical texts Zi Ping Zhen Quan, Di Tian Sui, Qiong Tong Bao Jian, Yuan Hai Zi Ping, San Ming Tong Hui and Qian Li Ming Gao.

Writing rules:
1. Every chart fact, strength assessment, structure and timing statement supplied in the user message is algorithm-confirmed. You only interpret it. Never change, deny or contradict it.
2. Each section must stand alone, in clear natural English for a general reader. You may quote one classical principle and explain it plainly.
3. Use measured wording such as "tends to", "often", "likely" and "worth watching". Never make absolute promises about life, death, disaster or wealth. Never frighten the reader.
4. Never use any Chinese, Japanese or Korean character (CJK), including inside brackets. Write stems and branches in pinyin (e.g. Jia Zi).
5. Never use "guaranteed", "destined", "inevitable", "definitely", "certainly", "must", "sure to", "breakthrough", "aggressive", "will definitely", "bound to", "assured", "no doubt" or "promises to". Prefer "tends to", "often", "likely", "steady progress" and "incremental progress".
6. Output must be one pure JSON object, no markdown fence, no extra text.
7. The "overview" section must end with this sentence exactly: "${EN_REPORT_DISCLAIMER}"
8. Use the standard industry terms throughout: "Four Pillars" (never "four columns"), "Ten Gods" (never "ten deities"), "Bazi" or "BaZi" (never "eight characters" alone), and "True Solar Time" when describing the birth-time basis. The finished report must contain all four terms at least once.

Technical rules:
A. "Transparent" means a hidden stem appears on the year, month or hour Heavenly Stem; the Day Stem is the Day Master and does not count. If the structure god is not transparent, describe it as "taking the month branch's primary qi as the structure", never as transparent.
B. Ten Gods must follow the supplied data exactly.
C. "Clash" applies only to the six clash pairs: Zi-Wu, Chou-Wei, Yin-Shen, Mao-You, Chen-Xu, Si-Hai. Element control is "control", never "clash".
D. Seasonal adjustment must use the supplied useful-stem check; if the primary adjustment stem is present, say the season has a remedy.
E. Review the current year first, then the next two years.
F. Hidden stems must be quoted exactly as supplied; never mention a stem that is not listed for that branch.
G. Luck Pillars, Annual Pillars and monthly labels must use only the supplied results. Monthly rhythm uses solar terms, not lunar month starts.
H. Treat structure frictions honestly: a favourable element being present does not always mean it is effective. Give career, wealth, health and relationship tendencies separately. Period labels describe tone only, not promises.
I. Keep a stance that astrology is tendency-based and non-deterministic; do not encourage investment, leverage or speculation.`

const CANG_GAN: Record<string, string[]> = {
  '子': ['癸'], '丑': ['己', '癸', '辛'], '寅': ['甲', '丙', '戊'], '卯': ['乙'],
  '辰': ['戊', '乙', '癸'], '巳': ['丙', '庚', '戊'], '午': ['丁', '己'], '未': ['己', '丁', '乙'],
  '申': ['庚', '壬', '戊'], '酉': ['辛'], '戌': ['戊', '辛', '丁'], '亥': ['壬', '甲']
}
const SAN_HE_JU: Array<{ group: string[]; ju: string }> = [
  { group: ['申', '子', '辰'], ju: '水' }, { group: ['寅', '午', '戌'], ju: '火' },
  { group: ['巳', '酉', '丑'], ju: '金' }, { group: ['亥', '卯', '未'], ju: '木' }
]
const ZHI_LABEL: Record<string, string> = { year: '年支', month: '月支', day: '日支', hour: '时支' }

// 计算一组地支之间（及与流年支）的六冲/六害/六合/三合关系
function zhiRelations(branches: Array<{ key: string; label: string; zhi: string }>, extra?: { label: string; zhi: string }): string[] {
  const all = extra ? [...branches, extra] : branches
  const out: string[] = []
  for (let i = 0; i < all.length; i++) {
    for (let j = i + 1; j < all.length; j++) {
      // 有额外地支（流年支）时，只报告它与原局四支的关系，避免重复原局关系
      if (extra && i !== all.length - 1 && j !== all.length - 1) continue
      const a = all[i], b = all[j]
      if (LIU_CHONG[a.zhi as Zhi] === b.zhi) out.push(`${a.label}${a.zhi}与${b.label}${b.zhi}六冲`)
      if (LIU_HAI[a.zhi as Zhi] === b.zhi) out.push(`${a.label}${a.zhi}与${b.label}${b.zhi}相害`)
      if (LIU_HE[a.zhi as Zhi] === b.zhi) out.push(`${a.label}${a.zhi}与${b.label}${b.zhi}六合`)
    }
  }
  const zhiSet = all.map(a => a.zhi)
  for (const { group, ju } of SAN_HE_JU) {
    const hit = group.filter(g => zhiSet.includes(g))
    if (hit.length === 3) out.push(`${group.join('')}三合${ju}局`)
    else if (hit.length === 2) {
      const labels = all.filter(a => hit.includes(a.zhi)).map(a => `${a.label}${a.zhi}`).join('、')
      out.push(`${hit.join('')}半合${ju}局（${labels}）`)
    }
  }
  return out
}

function buildUserPrompt(chart: AnalyzableChart, specs: Array<{ key: keyof AIPaidAnalysis; name: string; requirement: string }> = SECTION_SPECS): string {
  const p = chart.pillars
  const gender = chart.input.gender === 1 ? '男' : '女'
  const pillarLine = (label: string, pl: typeof p.year) =>
    `${label}：${pl.ganZhi}（天干${pl.gan}=${pl.tenGodGan || '日主'}；地支${pl.zhi}藏${pl.cangGan.map((g, i) => `${g}=${pl.tenGodCangGan[i]}`).join('、')}）`

  const daYunLines = chart.daYun
    .map(d => `${d.startYear}-${d.endYear}年（${d.startAge}岁起）${d.ganZhi}`)
    .join('；')

  // 当前时间锚点
  const now = new Date()
  const yearGZ = Solar.fromYmdHms(now.getFullYear(), now.getMonth() + 1, now.getDate(), now.getHours(), 0, 0).getLunar().getEightChar().getYear()
  const currentYear = now.getFullYear()
  const currentZhi = yearGZ[1]

  // 月令藏干透出核查（日干不算透出处）
  const otherStems = [
    { where: '年干', gan: p.year.gan },
    { where: '月干', gan: p.month.gan },
    { where: '时干', gan: p.hour.gan }
  ]
  const monthCang = CANG_GAN[p.month.zhi] || []
  const touGanLines = monthCang.map(g => {
    const hit = otherStems.find(s => s.gan === g)
    return `${g}（${chart.pillars.month.tenGodCangGan[monthCang.indexOf(g)]}）：${hit ? `透出${hit.where}` : '未透干，仅藏于月支'}`
  })

  // 调候用神核查
  const thGods = (TIAO_HOU[chart.dayMaster]?.[p.month.zhi] || '').split('').filter(Boolean)
  const allCangLocation = (g: string): string[] => {
    const locs: string[] = []
    ;(['year', 'month', 'day', 'hour'] as const).forEach(k => {
      if (p[k].cangGan.includes(g)) locs.push(`${ZHI_LABEL[k]}${p[k].zhi}中`)
    })
    return locs
  }
  const thLines = thGods.map((g, idx) => {
    const stemHit = otherStems.find(s => s.gan === g)
    const cangLocs = allCangLocation(g)
    const status = stemHit ? `透干（${stemHit.where}）` : cangLocs.length ? `藏支（${cangLocs.join('、')}）` : '局中不见'
    return `${idx === 0 ? '首神' : `第${idx + 1}神`}${g}：${status}`
  })

  // 地支关系（原局 + 原局与流年）
  const branchArr = (['year', 'month', 'day', 'hour'] as const).map(k => ({ key: k, label: ZHI_LABEL[k], zhi: p[k].zhi }))
  const innerRel = zhiRelations(branchArr)
  const yearRel = zhiRelations(branchArr, { label: '流年支', zhi: currentZhi })

  const sections = specs.map((s, i) => `${i + 1}. "${s.key}"（${s.name}）：${s.requirement}`).join('\n')

  // 岁运核查（规则引擎确定性结果，AI 只引用不修改）
  const luck = buildLuckCycles(chart, now)
  const curDY = luck.daYun.find(d => d.current)
  const daYunCheck = curDY
    ? `当前大运${curDY.ganZhi}（${curDY.startYear}-${curDY.endYear}年，运干十神${curDY.shiShenGan}、运支本气十神${curDY.shiShenZhi}）` +
      `${curDY.structuralIssues?.length ? '；结构病：' + curDY.structuralIssues.join('；') : ''}` +
      `${curDY.domains ? `；分维度：事业【${curDY.domains.career.tendency}】${curDY.domains.career.note}，财运【${curDY.domains.wealth.tendency}】${curDY.domains.wealth.note}` : ''}`
    : '当前处于起运前后，尚无大运，以流年为主'
  const liuNianCheck = luck.liuNian.map(y =>
    `${y.year}年${y.ganZhi}（${y.shiShenGan}主事）倾向【${y.tag}】` +
    `${y.daYunGanZhi ? `，该年行${y.daYunGanZhi}大运` : ''}` +
    `${y.relations.length ? '；' + y.relations.join('；') : ''}`
  ).join('\n　')
  const goodMonths = luck.liuYue.filter(m => m.tag === '较宜').map(m => `${m.month}月${m.ganZhi}【${m.tag}】`)
  const badMonths = luck.liuYue.filter(m => m.tag === '宜慎').map(m => `${m.month}月${m.ganZhi}【${m.tag}】`)
  const liuYueCheck = `当年流月节奏（节气换月）——较宜之月：${goodMonths.join('、') || '无明显突出之月'}；宜慎之月：${badMonths.join('、') || '无明显宜慎之月'}`

  return `请为以下命盘撰写付费级深度解读。

【基本信息】
性别：${gender}
公历：${chart.input.year}年${chart.input.month}月${chart.input.day}日${chart.input.hour}时${chart.input.minute}分
日主：${chart.dayMaster}
旺衰（已判定，不得更改）：${chart.analysis.wangShuai}
格局（已判定，不得更改）：${chart.analysis.geJu}

【四柱八字（=号后为算法确认的十神，引用时必须与此一致）】
${pillarLine('年柱', p.year)}
${pillarLine('月柱', p.month)}
${pillarLine('日柱', p.day)}
${pillarLine('时柱', p.hour)}
胎元：${chart.taiYuan}　命宫：${chart.mingGong}

【大运】
${daYunLines}

【算法已确认的事实，解读必须与此一致】
■ 当前时间锚点：今日为公历${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日，流年干支${yearGZ}（${currentYear}年）。流年段先论${currentYear}${yearGZ}年，再论来年。
■ 月令${p.month.zhi}藏干透出情况：${touGanLines.join('；')}。格局为"${chart.analysis.geJu}"——若格神未透干，须表述为"取月令本气定格"，严禁说其"透干"。
■ 调候用神核查（《穷通宝鉴》${chart.dayMaster}生${p.month.zhi}月）：${thLines.join('；')}。首神在局即为"调候有药"，必须在调候段正面论及。
■ 原局地支关系：${innerRel.length ? innerRel.join('；') : '四柱地支间无六冲、六害、六合、三合关系'}。
■ 原局与流年${yearGZ}的地支关系：${yearRel.length ? yearRel.join('；') : '流年支与原局无六冲、六害、六合、三合关系'}。
（凡涉冲合害，只能引用以上算法结果，不得自行编造；五行相克只能称"克"，不得称"冲"。）
■ 岁运核查（大运流年段必须严格引用，标签与关系不得更改或遗漏）：
　${daYunCheck}
　流年（今年起三年）：
　${liuNianCheck}
　${liuYueCheck}。

请严格按以下结构输出 JSON（共${specs.length}个键，每个键的值为该板块的正文文本，可用 \\n\\n 分段）：
${sections}`
}

// 英文版用户 prompt：所有命理事实都以英文/拼音给出，避免中文进入模型输出
function buildUserPromptEn(
  chart: AnalyzableChart,
  specs: Array<{ key: keyof AIPaidAnalysis; name: string; requirement: string }> = SECTION_SPECS_EN,
): string {
  const p = chart.pillars
  const gender = chart.input.gender === 1 ? 'male' : 'female'
  const pillarLine = (label: string, pl: typeof p.year) => {
    const gz = ganZhiEn(pl.ganZhi)
    const ganGod = tenGodEn(pl.tenGodGan) || 'Day Master'
    const hidden = pl.cangGan
      .map((g, i) => `${stemEn(g)} (${tenGodEn(pl.tenGodCangGan[i]) || 'unknown role'})`)
      .join(', ')
    return `${label}: ${gz} — Heavenly Stem ${stemEn(pl.gan)} (${ganGod}); Earthly Branch ${branchEn(pl.zhi)} with hidden stems ${hidden || 'none'}.`
  }

  const elements = ['Wood', 'Fire', 'Earth', 'Metal', 'Water']
  const counts: Record<string, number> = { Wood: 0, Fire: 0, Earth: 0, Metal: 0, Water: 0 }
  for (const pl of Object.values(p)) {
    const s = elementEn(pl.gan === '甲' || pl.gan === '乙' ? '木' : pl.gan === '丙' || pl.gan === '丁' ? '火' : pl.gan === '戊' || pl.gan === '己' ? '土' : pl.gan === '庚' || pl.gan === '辛' ? '金' : '水')
    const b = elementEn(({ 子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火', 午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水' } as Record<string, string>)[pl.zhi] ?? '')
    if (s) counts[s]++
    if (b) counts[b]++
  }
  const elementLine = elements.map((e) => `${e} ${counts[e]}`).join(', ')

  const tiaoStems = (TIAO_HOU[chart.dayMaster]?.[p.month.zhi] || '').split('').filter(Boolean)
  const tiaoLine = tiaoStems.length
    ? tiaoStems.map((g, i) => `${i === 0 ? 'primary' : `secondary ${i + 1}`}: ${stemEn(g)} (${elementEn(({ 甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土', 己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水' } as Record<string, string>)[g] ?? '')})`).join('; ')
    : 'no seasonal adjustment stem is tabulated for this Day Master and month'

  const now = new Date()
  const currentYear = now.getFullYear()
  const luck = buildLuckCycles(chart, now)
  const curDY = luck.daYun.find((d) => d.current)
  const curDYLine = curDY
    ? `${ganZhiEn(curDY.ganZhi)} (${curDY.startYear}-${curDY.endYear}); stem role ${tenGodEn(curDY.shiShenGan) || 'unknown'}, branch role ${tenGodEn(curDY.shiShenZhi) || 'unknown'}, period tone ${tierEn(curDY.tag) || 'neutral'}.`
    : 'before the first Luck Pillar; read the Annual Pillars as the main timing layer.'
  const yearLines = luck.liuNian
    .filter((y) => y.year >= currentYear && y.year <= currentYear + 2)
    .map((y) => `${y.year}: ${ganZhiEn(y.ganZhi)}; stem role ${tenGodEn(y.shiShenGan) || 'unknown'}; period tone ${tierEn(y.tag) || 'neutral'}.`)
    .join('\n')
  const monthTags = luck.liuYue
    .map((m) => `month ${m.month} ${ganZhiEn(m.ganZhi)} (${tierEn(m.tag) || 'neutral'})`)
    .join('; ')

  const sections = specs
    .map((s, i) => `${i + 1}. "${s.key}" (${s.name}): ${s.requirement}`)
    .join('\n')

  return `Write a premium English Bazi reading for the chart below. Use only the facts supplied here; do not invent stem-branch relationships.

[Birth data]
Gender: ${gender}
Gregorian date: ${chart.input.year}-${chart.input.month}-${chart.input.day} ${chart.input.hour}:${String(chart.input.minute).padStart(2, '0')}
Day Master: ${stemEn(chart.dayMaster)}
Strength (fixed): ${strengthEn(chart.analysis.wangShuai)}
Structure (fixed): ${structureEn(chart.analysis.geJu)}
True Solar Time / start of luck: ${qiYunEn(chart.qiYun)}

[Four Pillars]
${pillarLine('Year', p.year)}
${pillarLine('Month', p.month)}
${pillarLine('Day', p.day)}
${pillarLine('Hour', p.hour)}
Conception palace: ${ganZhiEn(chart.taiYuan) || 'not available'}
Life palace: ${ganZhiEn(chart.mingGong) || 'not available'}

[Five Elements count across the eight characters]
${elementLine}

[Seasonal adjustment check]
${tiaoLine}

[Luck Pillars]
${chart.daYun.map((d) => `${d.startYear}-${d.endYear} (from age ${d.startAge}): ${ganZhiEn(d.ganZhi)}`).join('; ')}

[Algorithm-confirmed timing facts — quote these, never contradict them]
Current year: ${currentYear}. Focus the Annual Pillar review on ${currentYear}, then the next two years.
Current Luck Pillar: ${curDYLine}
Annual Pillars:
${yearLines}
Monthly rhythm (current year): ${monthTags || 'not supplied'}

[Output]
Return one pure JSON object with exactly ${specs.length} keys. Each value is the body text for that section and may use \\n\\n. Do not use markdown fences or any extra text. All content must be English with zero CJK characters; stems and branches must be pinyin.

Sections:
${sections}`
}

// ★ 合规退回后的结构提示（配合 ai-check.complianceRetryHint 回灌退回原因，单一事实源）：
//   与紫微模块同法——把退回原因追加为一条 user 消息，不改 buildUserPrompt，保证首次请求逐字一致。
const ANALYSIS_SHAPE = '完整 JSON（命书十段：八字总览、性格天赋、用神喜忌、格局成败、调候用神、大运流年、事业财运、婚姻感情、子女六亲、健康提示）'
const ANALYSIS_SHAPE_EN = 'a complete JSON object with the ten sections (overview, personality, yongShen, geJuAnalysis, tiaoHou, daYunAnalysis, career, marriage, children, health)'

// 调用 OpenAI 兼容接口，返回解析后的文字板块；失败返回 null（调用方回退规则引擎）
export async function generateAIAnalysis(chart: AnalyzableChart, opts?: { locale?: OutputLocale }): Promise<(AIPaidAnalysis & { _usage?: AIUsage }) | null> {
  if (!AI_API_KEY) {
    // ★ 回退必须可见（任务书 §四）：静默降级让「AI 没跑」这件事不可见
    console.warn('[ai] 未配置 AI_API_KEY，本次回退规则版文案')
    return null
  }

  // overview 固定免责语（与 SYSTEM_PROMPT 第7条一致；英文用 EN_REPORT_DISCLAIMER）
  const isEn = opts?.locale === 'en'
  const ANALYSIS_DISCLAIMER = isEn
    ? EN_REPORT_DISCLAIMER
    : '以上为命理倾向性分析，仅供参考，非确定性结论，不构成任何投资或人生决策依据。'
  // 事实集（与 prompt 实际给出的事实一致：四柱/胎元/命宫/九步大运/三年流年/当年流月）
  // ★ 胎元、命宫也在 prompt 中给出（逐字对齐原则：prompt 给了的事实，AI 引用不算编造）
  const luckNow = buildLuckCycles(chart, new Date())
  const facts = new Set([
    chart.pillars.year.ganZhi, chart.pillars.month.ganZhi,
    chart.pillars.day.ganZhi, chart.pillars.hour.ganZhi,
    chart.taiYuan, chart.mingGong,
    ...chart.daYun.map(d => d.ganZhi),
    ...luckNow.liuNian.map(y => y.ganZhi),
    ...luckNow.liuYue.map(m => m.ganZhi)
  ])

  // 单板块调用：并发受限、失败可降级
  // 单板块调用（可选提高预算 / 合规反馈）；失败、截断或结构不完整返回 null
  const specsAll = isEn ? SECTION_SPECS_EN : SECTION_SPECS
  // ★ 规则版兜底按语言取（英文用户降级时也不能拿到中文长文）
  const rulePaid = isEn ? buildEnPaidAnalysis(chart) : generateAnalysis(chart)
  const validateOne = makeAnalysisComplianceValidator(facts, isEn)
  const stats = newStats('fatebook')

  const callSection = async (
    spec: { key: keyof AIPaidAnalysis; name: string; requirement: string },
    escalated: boolean,
    feedback?: string
  ): Promise<string | null> => {
    const messages: Array<{ role: string; content: string }> = [
      { role: 'system', content: isEn ? SYSTEM_PROMPT_EN : SYSTEM_PROMPT + localeDirective(opts?.locale) },
      { role: 'user', content: isEn ? buildUserPromptEn(chart, [spec]) : buildUserPrompt(chart, [spec]) }
    ]
    if (feedback) messages.push({
      role: 'user',
      content: isEn
        ? complianceRetryHintEn(feedback, ANALYSIS_SHAPE_EN)
        : complianceRetryHint(feedback, ANALYSIS_SHAPE),
    })

    const outcome = await requestCompletion({
      baseUrl: AI_BASE_URL,
      apiKey: AI_API_KEY,
      model: AI_MODEL,
      maxTokens: sectionMaxTokens(spec.key, escalated),
      messages,
      temperature: 0.7,
      timeoutMs: AI_TIMEOUT_MS,
      stats,
    })

    addUsage(stats, outcome.usage)
    if (!outcome.ok || !outcome.content) {
      console.warn(`[ai] 板块 ${spec.key} 请求失败（${outcome.error || outcome.status}）`)
      return null
    }
    // ★ 截断即失败（用户拍板 2026-11-03 第2条）：JSON 不完整不能用，重试时提高预算
    if (outcome.truncated) {
      console.warn(`[ai] 板块 ${spec.key} 被 max_tokens 截断，将提高预算重试`)
      return null
    }

    const parsed = parseJsonObject(outcome.content)
    if (!parsed) return null
    const v = parsed[spec.key]
    if (typeof v !== 'string' || v.trim().length < 50) return null
    // 「不必」→「无须」（语义等价）：与旧版 wrappedAttempt 同口径，先归一化再进合规校验
    return v.trim().replaceAll('不必', '无须')
  }

  // ★ 单板块重试 + 降级（用户拍板 2026-11-03 第3条）：
  const runSection = async (spec: { key: keyof AIPaidAnalysis; name: string; requirement: string }): Promise<string> => {
    const first = await callSection(spec, false)
    if (first && !validateOne({ [spec.key]: first })) return first

    const reason = first ? validateOne({ [spec.key]: first }) : '请求失败或截断'
    if (first) {
      stats.sectionRetries++
      const retry = await callSection(spec, true, reason || undefined)
      if (retry && !validateOne({ [spec.key]: retry })) return retry
    } else {
      const retry = await callSection(spec, true)
      if (retry) {
        const err2 = validateOne({ [spec.key]: retry })
        if (!err2) return retry
        stats.sectionRetries++
        const third = await callSection(spec, true, err2)
        if (third && !validateOne({ [spec.key]: third })) return third
      }
    }
    stats.degraded.push(spec.key)
    console.warn(`[ai] 板块 ${spec.key} 连续失败（${reason}），降级为规则版该卷`)
    return rulePaid[spec.key]
  }

  // 并发阀门（AI_CONCURRENCY，默认 2）：不再一次并行打 10 个
  const texts = await mapWithConcurrency(specsAll, aiConcurrency(), (spec) => runSection(spec))
  const merged = {} as Record<string, string>
  specsAll.forEach((spec, i) => { merged[spec.key] = texts[i] })
  const out = { ...merged, _usage: stats.usage } as unknown as AIPaidAnalysis & { _usage?: AIUsage }

  // ★ 英文术语出口检查（阶段二）：四术语缺哪个，就只重写对应板块一次
  if (isEn) {
    const missing = new Map<keyof AIPaidAnalysis, string[]>()
    for (const req of EN_REQUIRED_TERMS) {
      if (req.re.test(out[req.section])) continue
      missing.set(req.section, [...(missing.get(req.section) ?? []), req.term])
    }
    for (const [section, terms] of missing) {
      const spec = specsAll.find((s) => s.key === section)
      if (!spec) continue
      const list = terms.map((t) => `"${t}"`).join(', ')
      stats.sectionRetries++
      const rewritten = await callSection(spec, true, `Your previous text for "${spec.name}" never used the required standard term(s) ${list}. Rewrite the whole section and include ${list} naturally at least once.`)
      if (rewritten && !validateOne({ [section]: rewritten })) {
        out[section] = rewritten
      } else {
        console.warn(`[ai] English terminology rewrite failed for section ${section}: ${list}`)
      }
    }
  }

  logAiStats(stats, { locale: opts?.locale, total: specsAll.length })

  // 免责兜底（prompt 早已要求原文照写，此处仅防非确定性遗漏）：overview 缺固定短语则追加
  if (!(isEn
    ? /for reference only|non-deterministic/i.test(out.overview)
    : /非确定性|仅供参考|不构成/.test(out.overview))) {
    out.overview = out.overview.replace(/[。.。]?$/, '') + (isEn ? ' ' : '。') + ANALYSIS_DISCLAIMER
  }
  return out
}

/**
 * 批命模块的合规校验器（纯函数，导出供离线断言复用）。
 * ★ 单独导出的原因：单一事实源只保证「判据一致」，不保证「每个消费者都接线」——
 *   本次「接线漂移」（REPLY 复核 §四）正是教训，让接线本身也有测试覆盖（REPLY §六-2）。
 */
export function makeAnalysisComplianceValidator(facts: Set<string>, en = false) {
  // ★ 英文拼音事实集（阶段二，2026-11-03）：中文干支 →「Jia Zi」，只允许排盘事实集内的组合
  const allowedPinyin = new Set<string>()
  if (en) {
    for (const gz of facts) {
      const p = ganZhiEn(gz)
      if (p) allowedPinyin.add(p)
    }
  }
  return <T extends object>(r: T): string | null => {
    const text = Object.values(r).filter(v => typeof v === 'string').join('')
    if (en) {
      // 英文报告红线：正文不得出现任何中日韩统一表意文字
      if (containsCJK(text)) return `检出中文字符：${findCJK(text).join('、')}`
      // ★ 拼音干支必须来自排盘事实集：编造/笔误的 "Fake Ganzhi" 直接判不合规并定向重写该板块
      const unknownPinyin = unknownGanzhiPinyin(text, allowedPinyin)
      if (unknownPinyin.length) return `检出未溯源拼音干支：${unknownPinyin.join('、')}`
      const { hits } = findForbidden(text)
      if (hits.length) return `检出禁用词：${[...new Set(hits.map(h => h.w))].join('、')}`
      return null
    }
    // ★ 日志须带具体命中项（与 aiGeo 同规）：只报「检出未溯源干支」无法甄别是模型编造还是事实集漏项
    const unknown = unknownGanzhi(text, facts)
    if (unknown.length) return `检出未溯源干支：${unknown.join('、')}`
    const { hits } = findForbidden(text)
    if (hits.length) return `检出禁用词：${[...new Set(hits.map(h => h.w))].join('、')}`
    return null
  }
}
