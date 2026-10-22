// AI 追问（ask_pack）——单条问答的【唯一 AI 入口】与【硬拒答】判据。
// 依据 docs/定价方案 §8.1：追问属独立需求、实时生成、不可逐条审核，故必须自带
// 「硬拒答清单 + 改写法 + 运行时合规检查 + 免责 + 限量」。
//
// ★ 合规复用（不得自造判据）：findForbidden / unknownGanzhi / withComplianceRetry /
//   complianceRetryHint / FORBIDDEN_WORDS_PROMPT 全部来自 ai-check.ts（单一事实源）。
// ★ 拒答在【调用 AI 之前】判定：零成本、可逐条审核、不扣额度（见 api/ask/route.ts）。
import { Solar } from 'lunar-javascript'
import type { AnalyzableChart } from './analysis'
import { buildLuckCycles } from './analysis'
import { unknownGanzhi, withComplianceRetry, findForbidden, FORBIDDEN_WORDS_PROMPT, complianceRetryHint } from './ai-check'
import { localeDirective, type OutputLocale } from './locale'

const AI_API_KEY = process.env.AI_API_KEY || ''
const AI_BASE_URL = (process.env.AI_BASE_URL || 'https://api.deepseek.com').replace(/\/$/, '')
const AI_MODEL = process.env.AI_MODEL || 'deepseek-chat'
const AI_TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS || 60000)

/** 单条问题长度上限（防超长 prompt 与刷量） */
export const ASK_MAX_QUESTION_LEN = 300

// ─────────────────────────────────────────────────────────────
// 硬拒答清单（§8.1）：医疗 / 法律 / 投资 / 生死 / 重大人生决策的「该不该」类
// ★ 命中 → 脚本化合规拒答（不调 AI、不扣额）。判定在调用 AI 之前，可逐条审核。
// ─────────────────────────────────────────────────────────────
export type AskRefusalCategory = 'medical' | 'legal' | 'investment' | 'life_death' | 'life_decision'

/** 各类拒答的中文名（写入拒答话术） */
const REFUSAL_LABEL: Record<AskRefusalCategory, string> = {
  medical: '医疗健康',
  legal: '法律纠纷',
  investment: '投资理财',
  life_death: '生死寿夭',
  life_decision: '重大人生决策',
}

/** 各类拒答指向的「专业意见」来源（改写法中提示用户另寻专业意见）；生死/人生取舍无对应专业，留空 */
const REFUSAL_PRO: Partial<Record<AskRefusalCategory, string>> = {
  medical: '执业医师',
  legal: '执业律师',
  investment: '持牌投资顾问',
}

// ★ 关键词表：命中即拒答。顺序即优先级——「该不该离婚」由 life_decision 兜住。
//   ★ 刻意收窄到「可判定」的词面：正常命理问题（如「今年财运趋势如何」）不命中，正常放行。
export const ASK_REFUSAL_RULES: ReadonlyArray<{ category: AskRefusalCategory; keywords: RegExp }> = [
  { category: 'medical', keywords: /(癌症|肿瘤|绝症|疾病|病症|生病|手术|开刀|吃药|用药|服药|处方|药方|诊断|确诊|误诊|抑郁|焦虑症|精神病|艾滋病|化疗|放疗|移植|怀孕|流产|不孕|治疗|治愈|痊愈|康复|住院|医院|体检|看医生|中医|西医|把脉|开药|肝|肾|心脏|肺病|胃病)/ },
  { category: 'legal', keywords: /(官司|诉讼|起诉|被告|原告|律师|法律|违法|犯法|合同|违约|判刑|量刑|坐牢|拘留|逮捕|取保|保释|离婚协议|抚养权|监护权|继承权|遗产|仲裁|赔偿|侵权|打官司|上法庭|报警|立案)/ },
  { category: 'investment', keywords: /(股票|炒股|个股|基金|期货|外汇|加密货币|比特币|虚拟币|数字货币|理财|投资|买入|卖出|抄底|清仓|加仓|减仓|杠杆|配资|房价|买房投资|炒房|彩票|赌博|梭哈|all ?in)/i },
  { category: 'life_death', keywords: /(寿命|能活多久|活到几岁|几岁死|何时死|什么时候死|会不会死|自杀|轻生|寻死|大限将至|大限已到|死于|命不久矣|寿元)/ },
  // ★ 重大人生决策：仅收「该不该 / 要不要 / 是否能」+ 具体取舍对象 的组合问法（改写法靶心）
  { category: 'life_decision', keywords: /(该不该|要不要|是否可以|可不可以|能不能|是否应|是否该)(离婚|复婚|结婚|分手|复合|辞职|离职|跳槽|换工作|裸辞|创业|开店|投资|买房|卖房|生孩子|生二胎|要孩子|移民|出国|移居|整容|领养)/ },
]

/**
 * 判定一条追问是否命中硬拒答类别；命中返回类别，否则 null（正常命理问答）。
 * ★ 纯函数，断言可直接喂例句（scripts/test-ask-accept.mjs）。
 */
export function classifyAskQuestion(question: string): AskRefusalCategory | null {
  const q = (question ?? '').trim()
  if (!q) return null
  for (const rule of ASK_REFUSAL_RULES) {
    if (rule.keywords.test(q)) return rule.category
  }
  return null
}

/**
 * 脚本化合规拒答话术（含「该不该 → 命局倾向 + 你自己权衡」改写法示范）。
 * ★ 不调 AI 生成 —— 拒答必须稳定、可逐条审核；本句由断言自证不含禁用词。
 */
export function refusalText(category: AskRefusalCategory): string {
  const pro = REFUSAL_PRO[category]
  const reason = pro
    ? `命理分析不替代${pro}的专业意见，也不宜替你下决定`
    : `命理不代替你做判断，也不宜替你下决定`
  return (
    `这类问题属于「${REFUSAL_LABEL[category]}」范畴，${reason}。\n\n` +
    `命理能提供的是【倾向】参考——比如某个领域在某段时期偏顺、还是偏滞，以及它背后的命局依据；` +
    `但「要不要做」的取舍，需要你结合现实处境、专业意见与自身权衡来定。\n\n` +
    `如果你愿意，可以把问题换成「命局在某方面呈现什么倾向、依据是什么」——这类我可以就你的命盘本身给你一些思路。`
  )
}

/** 每条回答固定附带的免责句（比报告更直白） */
export const ASK_DISCLAIMER =
  '以上为命理倾向性参考，非确定性结论，不构成医疗、法律、投资或人生决策依据。'

/** AI 调用 / 合规重试均失败时的合规兜底话术（不扣额度） */
export const ASK_FALLBACK_TEXT =
  '抱歉，命理师暂时无法作答（服务繁忙，或生成内容未通过合规校验）。稍后可再试一次——本次不消耗额度。'

// ─────────────────────────────────────────────────────────────
// 生成（唯一 AI 入口）
// ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `你是一位精通传统子平命理的资深命理师，熟读《子平真诠》《滴天髓》《穷通宝鉴》《千里命稿》《渊海子平》《三命通会》六部经典。
用户在已购命书的基础上【追问】某个具体问题，你只就该问题作答，不要重复命书全文。

写作要求：
1. 严格紧扣下面给出的【命盘事实】，排盘、旺衰、格局、四柱、大运、流年均为确定性算法算出，你只做解读，严禁修改、否认或与其矛盾。
2. 回答控制在 150–400 字，语言典雅而通俗；可引一句经典原文并附白话解释，但不堆砌。
3. 断语留余地，用"倾向""易""需注意""往往""多半"等表述，严禁绝对化的生死、灾祸断言；不吓唬用户。
4. 【硬拒答】涉及医疗、法律、投资、生死、重大人生取舍的"该不该/要不要"类问题，一律不给判决——
   只讲命局倾向与你自己的权衡，并提示参照相应专业意见。（命理不替代专业意见，也不替你下决定。）
   ${FORBIDDEN_WORDS_PROMPT}
5. 分析要针对性，紧扣此命局的具体干支组合，禁止写放之四海皆准的套话。
6. 结尾固定附一句免责语，原文照写：${ASK_DISCLAIMER}
7. 直接输出纯文本（可分段），不要 markdown 代码块、不要任何额外文字、不要复述本要求。`

const ASK_SHAPE = '一段纯文本回答（150–400 字，末尾含固定免责语）'

// ★ 事实集（逐字对齐原则：prompt 给了的事实，AI 引用不算编造）——
//   与 aiAnalysis 同口径（四柱/胎元/命宫/九步大运/三年流年/当年流月）。
function buildFacts(chart: AnalyzableChart): Set<string> {
  const now = new Date()
  const luck = buildLuckCycles(chart, now)
  return new Set([
    chart.pillars.year.ganZhi, chart.pillars.month.ganZhi,
    chart.pillars.day.ganZhi, chart.pillars.hour.ganZhi,
    chart.taiYuan, chart.mingGong,
    ...chart.daYun.map(d => d.ganZhi),
    ...luck.liuNian.map(y => y.ganZhi),
    ...luck.liuYue.map(m => m.ganZhi),
  ])
}

function buildUserPrompt(chart: AnalyzableChart, question: string): string {
  const p = chart.pillars
  const gender = chart.input.gender === 1 ? '男' : '女'
  const now = new Date()
  const yearGZ = Solar
    .fromYmdHms(now.getFullYear(), now.getMonth() + 1, now.getDate(), now.getHours(), 0, 0)
    .getLunar().getEightChar().getYear()
  const pillarLine = (label: string, pl: typeof p.year) =>
    `${label}：${pl.ganZhi}（天干${pl.gan}＝${pl.tenGodGan || '日主'}；地支${pl.zhi}藏${pl.cangGan.map((g, i) => `${g}＝${pl.tenGodCangGan[i]}`).join('、')}）`
  const daYunLines = chart.daYun.map(d => `${d.startYear}-${d.endYear}年（${d.startAge}岁起）${d.ganZhi}`).join('；')

  return `【命盘事实（确定性算法结果，引用必须与此一致）】
性别：${gender}
公历：${chart.input.year}年${chart.input.month}月${chart.input.day}日${chart.input.hour}时${chart.input.minute ?? 0}分
日主：${chart.dayMaster}
旺衰（不得更改）：${chart.analysis.wangShuai}
格局（不得更改）：${chart.analysis.geJu}
${pillarLine('年柱', p.year)}
${pillarLine('月柱', p.month)}
${pillarLine('日柱', p.day)}
${pillarLine('时柱', p.hour)}
胎元：${chart.taiYuan}　命宫：${chart.mingGong}
大运：${daYunLines}
当前时间锚点：${now.getFullYear()}年，流年干支${yearGZ}。

【用户追问】
${question.trim()}

请只回答这个追问本身（150–400 字，末尾附固定免责语）。凡涉干支只能引用上面出现过者，不得自行编造；五行相克只能称"克"，不得称"冲"。`
}

interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: string } }>
  error?: { message?: string }
}

/**
 * 生成一条追问回答。成功且过合规 → 返回文本；否则 null（调用方返回合规兜底、不扣额度）。
 * ★ 复用 withComplianceRetry（首次留痕 + 带反馈重试），validate = 干支溯源 + 禁用词。
 */
export async function generateAskAnswer(chart: AnalyzableChart, question: string, opts?: { locale?: OutputLocale }): Promise<string | null> {
  if (!AI_API_KEY) {
    console.warn('[ask] 未配置 AI_API_KEY，本次无法作答')
    return null
  }
  const facts = buildFacts(chart)

  const attempt = async (feedback?: string): Promise<string | null> => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS)
    try {
      const messages: Array<{ role: string; content: string }> = [
        { role: 'system', content: SYSTEM_PROMPT + localeDirective(opts?.locale) },
        { role: 'user', content: buildUserPrompt(chart, question) },
      ]
      if (feedback) messages.push({ role: 'user', content: complianceRetryHint(feedback, ASK_SHAPE) })

      const res = await fetch(`${AI_BASE_URL}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${AI_API_KEY}`,
        },
        body: JSON.stringify({
          model: AI_MODEL,
          // ★ 单次输出上限（token 防盗用第一档）：回答 150–400 字，800 留足余量防合规重试被截断
          max_tokens: 800,
          temperature: 0.7,
          messages,
        }),
        signal: controller.signal,
      })
      if (!res.ok) {
        console.error('[ask] API 错误:', res.status, await res.text())
        return null
      }
      const data = (await res.json()) as ChatCompletionResponse
      const content = data.choices?.[0]?.message?.content
      if (!content) return null
      const text = content.replace(/^```(?:\w*)\s*/i, '').replace(/\s*```$/i, '').trim()
      return text.length >= 30 ? text : null
    } catch (err) {
      console.error('[ask] 生成失败:', err instanceof Error ? err.message : err)
      return null
    } finally {
      clearTimeout(timer)
    }
  }

  return withComplianceRetry(attempt, makeAskComplianceValidator(facts), 'ask')
}

/** 追问合规校验器（纯函数，导出供离线断言复用）：① 干支溯源 ② 禁用词 */
export function makeAskComplianceValidator(facts: Set<string>) {
  return (text: string): string | null => {
    const unknown = unknownGanzhi(text, facts)
    if (unknown.length) return `检出未溯源干支：${unknown.join('、')}`
    const { hits } = findForbidden(text)
    if (hits.length) return `检出禁用词：${[...new Set(hits.map(h => h.w))].join('、')}`
    return null
  }
}
