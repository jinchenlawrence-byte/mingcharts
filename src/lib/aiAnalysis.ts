// AI深度解读引擎 - 规则引擎出盘定喜忌，AI负责引经据典的解读文案
import { Solar } from 'lunar-javascript'
import type { AnalyzableChart, PaidAnalysis } from './analysis'
import { TIAO_HOU, buildLuckCycles } from './analysis'
import type { AIUsage } from './ai-types'
import { unknownGanzhi, withComplianceRetry, findForbidden, FORBIDDEN_WORDS_PROMPT } from './ai-check'
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
  { key: 'daYunAnalysis', name: '大运流年', requirement: '先点明当前所行大运的干支、十神，并依据算法给出的"结构病"（被合/被冲/被化/被夺/深藏/孤立）点明喜用是否真正有效——用神到位不等于用神有效；再分维度（事业/财运/健康/六亲）给出倾向，措辞具体留余地，严禁使用"大吉""大凶""积极进取""突破性进展"等绝对化或鼓励进攻的表述；然后依次点评今年、明年、后年三年流年：流年天干十神主事领域、与大运及原局的作用（天克地冲/岁运并临/冲合夫妻宫或月令等），最后简述流月节奏与当年需要把握/回避的月份（流月只用"较宜/一般/宜慎"）。须含以下要点：当前大运干支与十神、结构病判断及喜用有效性、三年流年逐年点评（天干十神主事+与大运原局作用）、流月节奏简述、分维度倾向（至少三个维度），800-1000字。本板块正文不少于 800 字，低于下限为不合格' },
  { key: 'career', name: '事业财运', requirement: '结合格局、用神与财官配置，给出适合的行业方向、求财方式、财富层次趋势与发力时段。须含以下要点：适合的行业方向至少两个、求财方式（正财/偏财/技术/管理）一词定性、财富层次趋势判断、发力时段建议（结合大运），500-600字。本板块正文不少于 500 字，低于下限为不合格' },
  { key: 'marriage', name: '婚姻感情', requirement: '男命以财为妻星、女命以官为夫星，结合日支夫妻宫的刑冲合害，分析感情模式、配偶特征、婚姻趋势与注意事项。须含以下要点：配偶星在局状态（透干/藏支/不见）、日支夫妻宫的刑冲合害关系、感情模式一词定性、配偶特征简评、注意事项至少两条，500-600字。本板块正文不少于 500 字，低于下限为不合格' },
  { key: 'children', name: '子女六亲', requirement: '男命看官杀、女命看食伤为子女星，结合时柱分析子女缘；并简述与父母、兄弟姐妹的六亲关系。须含以下要点：子女星在局状态、时柱对子女缘的影响、与父母关系简评、与兄弟姐妹关系简评，400-500字。本板块正文不少于 400 字，低于下限为不合格' },
  { key: 'health', name: '健康提示', requirement: '根据五行偏旺偏弱指出对应脏腑的养护重点（木肝胆、火心脏、土脾胃、金肺、水肾），给出生活方式建议。须含以下要点：五行偏旺偏弱对应脏腑、至少两个养护重点、生活方式建议至少三条、情绪与心理层面的提示，400-500字。本板块正文不少于 400 字，低于下限为不合格' }
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
H. 大运段严禁输出"大吉""大凶""积极进取""突破性进展"这类绝对化或鼓励进攻的表述；必须按【岁运核查】给出的结构病（被合/被冲/被化/被夺/深藏/孤立）点明喜用是否真正有效，并分维度（事业/财运/健康/六亲）给出倾向；流月只用"较宜/一般/宜慎"，严禁出现"大吉/吉"。
I. 全文须带"命理为倾向性参考、非确定性预言"的立场，对投资、杠杆、投机等重大决策不作鼓励，必要时提示"宜守""忌投机"。`

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

interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: string } }>
  usage?: AIUsage
  error?: { message?: string }
}

// 调用 OpenAI 兼容接口，返回解析后的文字板块；失败返回 null（调用方回退规则引擎）
export async function generateAIAnalysis(chart: AnalyzableChart): Promise<(AIPaidAnalysis & { _usage?: AIUsage }) | null> {
  if (!AI_API_KEY) {
    // ★ 回退必须可见（任务书 §四）：静默降级让「AI 没跑」这件事不可见
    console.warn('[ai] 未配置 AI_API_KEY，本次回退规则版文案')
    return null
  }

  // overview 固定免责语（与 SYSTEM_PROMPT 第7条一致）
  const ANALYSIS_DISCLAIMER = '以上为命理倾向性分析，仅供参考，非确定性结论，不构成任何投资或人生决策依据。'
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

  // 单批 API 调用（一批板块子集），失败返回 null
  const callAI = async (
    specs: Array<{ key: keyof AIPaidAnalysis; name: string; requirement: string }>
  ): Promise<(Partial<AIPaidAnalysis> & { _usage?: AIUsage }) | null> => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS)
    try {
      const res = await fetch(`${AI_BASE_URL}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${AI_API_KEY}`
        },
        body: JSON.stringify({
          model: AI_MODEL,
          temperature: 0.7,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: buildUserPrompt(chart, specs) }
          ]
        }),
        signal: controller.signal
      })

      if (!res.ok) {
        console.error('[ai] API 错误:', res.status, await res.text())
        return null
      }

      const data = (await res.json()) as ChatCompletionResponse
      const content = data.choices?.[0]?.message?.content
      if (!content) return null

      // 容错：剥离可能的 markdown 代码块
      const jsonText = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
      const parsed = JSON.parse(jsonText) as Record<string, unknown>

      // 校验本批键齐全且为字符串
      const result = {} as Record<string, string>
      for (const spec of specs) {
        const v = parsed[spec.key]
        if (typeof v !== 'string' || v.trim().length < 50) {
          console.error(`[ai] 板块 ${spec.key} 缺失或过短，放弃 AI 结果`)
          return null
        }
        result[spec.key] = v.trim()
      }
      return { ...result, _usage: data.usage } as Partial<AIPaidAnalysis> & { _usage?: AIUsage }
    } catch (err) {
      console.error('[ai] AI 解读失败:', err instanceof Error ? err.message : err)
      return null
    } finally {
      clearTimeout(timer)
    }
  }

  // 一次完整尝试：按 SECTION_BATCHES 分批并行调用，合并为十个板块（任一批失败则整体失败）
  const attempt = async (): Promise<(AIPaidAnalysis & { _usage?: AIUsage }) | null> => {
    const batches = SECTION_BATCHES.map(keys =>
      keys.map(k => SECTION_SPECS.find(s => s.key === k)!)
    )
    const results = await Promise.all(batches.map(callAI))
    if (results.some(r => r === null)) return null
    const merged = {} as Record<string, string>
    const usage: AIUsage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
    for (const r of results as Array<Partial<AIPaidAnalysis> & { _usage?: AIUsage }>) {
      const { _usage, ...rest } = r
      Object.assign(merged, rest)
      if (_usage) {
        usage.prompt_tokens = (usage.prompt_tokens || 0) + (_usage.prompt_tokens || 0)
        usage.completion_tokens = (usage.completion_tokens || 0) + (_usage.completion_tokens || 0)
        usage.total_tokens = (usage.total_tokens || 0) + (_usage.total_tokens || 0)
      }
    }
    return { ...merged, _usage: usage } as unknown as AIPaidAnalysis & { _usage?: AIUsage }
  }

  // 合规校验（与 aiHemun 对称接线，共享判据 ai-check.ts）：
  //   ① 干支溯源 ② 禁用词。findForbidden 用默认口径（否定式豁免）：
  //   「未必/不可避免」正确放行；「不必」已在 wrappedAttempt 中替换为「无须」到不了这里；
  //   「务必/势必/必定」无否定前缀 → 拦截重试。（strictBi 物理禁「必」是合婚专属口径）
  // ★ 历史：本模块曾只接 unknownGanzhi，绝对化措辞「务必」类会漏出（REPLY 复核 §四）。
  //   现补齐 findForbidden 接线 —— 消除不对称，非有意差异（§8.4.4）。
  const validate = makeAnalysisComplianceValidator(facts)

  // 「不必」→「无须」（语义等价）先替换再校验，与 aiHemun 同序
  const wrappedAttempt = async () => {
    const r = await attempt()
    if (r) {
      let n = 0
      for (const k of Object.keys(r) as (keyof AIPaidAnalysis)[]) {
        const before = r[k]
        if (typeof before !== 'string') continue // 跳过 _usage 等非文本键
        r[k] = before.replaceAll('不必', '无须')
        if (r[k] !== before) n++
      }
      if (n) { void n }
    }
    return r
  }

  const out = await withComplianceRetry(wrappedAttempt, validate, 'ai')

  // 免责兜底（prompt 早已要求原文照写，此处仅防非确定性遗漏）：overview 缺固定短语则追加
  if (out && !/非确定性|仅供参考|不构成/.test(out.overview)) {
    out.overview = out.overview.replace(/。?$/, '') + '。' + ANALYSIS_DISCLAIMER
  }
  return out
}

/**
 * 批命模块的合规校验器（纯函数，导出供离线断言复用）。
 * ★ 单独导出的原因：单一事实源只保证「判据一致」，不保证「每个消费者都接线」——
 *   本次「接线漂移」（REPLY 复核 §四）正是教训，让接线本身也有测试覆盖（REPLY §六-2）。
 */
export function makeAnalysisComplianceValidator(facts: Set<string>) {
  return <T extends object>(r: T): string | null => {
    const text = Object.values(r).filter(v => typeof v === 'string').join('')
    // ★ 日志须带具体命中项（与 aiGeo 同规）：只报「检出未溯源干支」无法甄别是模型编造还是事实集漏项
    const unknown = unknownGanzhi(text, facts)
    if (unknown.length) return `检出未溯源干支：${unknown.join('、')}`
    const { hits } = findForbidden(text)
    if (hits.length) return `检出禁用词：${[...new Set(hits.map(h => h.w))].join('、')}`
    return null
  }
}
