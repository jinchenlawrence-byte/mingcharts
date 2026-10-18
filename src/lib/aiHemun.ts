// AI 深度合婚解读 —— 规则引擎（hemun.ts）出全部干支事实与评分，AI 只据此撰写文字
// 沿用单人模块架构：「规则引擎出事实 → AI 生成解读」；任一板块不合格则回退（由调用方处理）
import type { AnalyzableChart } from './analysis'
import type { HemunResult } from './hemun'
import type { AIUsage } from './ai-types'
import { findForbidden, withComplianceRetry, FORBIDDEN_WORDS_PROMPT, complianceRetryHint } from './ai-check'

const AI_API_KEY = process.env.AI_API_KEY || ''
const AI_BASE_URL = (process.env.AI_BASE_URL || 'https://api.deepseek.com').replace(/\/$/, '')
const AI_MODEL = process.env.AI_MODEL || 'deepseek-chat'
const AI_TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS || 120000)

export interface AIHemunSections {
  overview: string    // 配对总评
  shengxiao: string   // 生肖年柱
  rizhu: string       // 日柱夫妻宫
  ouxing: string      // 配偶星与感情模式
  wuxing: string      // 五行互补与喜用互助
  advice: string      // 相处建议与流年提示
}

const SECTION_SPECS: Array<{ key: keyof AIHemunSections; name: string; requirement: string }> = [
  { key: 'overview', name: '配对总评', requirement: '开宗明义给出总观感（以给定的总观感为准，不得复述任何分数数字），用200字左右概括两人日主、旺衰、合婚最核心的两三个有利点与需注意点，结尾一句定调（此配属于何种层次、宜如何相待）' },
  { key: 'shengxiao', name: '生肖年柱', requirement: '解读生肖配对（民俗）、年柱干支（典籍）、年柱纳音（古法）三个维度——三者依据等级不同，行文中必须区分：生肖为民间俗论、纳音为唐宋古法、干支生克为子平典籍；说明这些关系对两人家庭背景、长辈缘分、生活根基的影响，200字左右；只能引用算法事实' },
  { key: 'rizhu', name: '日柱夫妻宫', requirement: '这是合婚核心：解读日干五合/相生/相克与日支（夫妻宫）的六合/六冲/六害/相刑；若为天合地合须重点点明。结合夫妻宫关系描述两人深层性格与亲密关系的契合度、容易发生矛盾的场景，300字左右' },
  { key: 'ouxing', name: '配偶星与感情模式', requirement: '男命以财为妻星、女命以官为夫星，解读双方配偶星透干/坐宫/藏支/不见的事实及十神互见（女为男之何十神、男为女之何十神），据此描述双方在感情中的付出方式、对伴侣的期待与感情稳定度，300字左右' },
  { key: 'wuxing', name: '五行互补喜用互助', requirement: '引用双方八字五行分布，解读何处互补、何处相重；说明对方如何补益自己的喜用（身弱喜印比、身旺喜克泄），并落实到日常相处中各自能给对方什么实际支持，250-350字' },
  { key: 'advice', name: '相处建议', requirement: '综合全部事实，给出3-5条具体可行的相处建议（沟通方式、分工、各自需修之处）、婚期/近一两年的节奏参考（引用当前大运助耗，注明其为产品设定的节奏参考指标），用积极但留余地的语气结尾，250-350字' },
]

const SYSTEM_PROMPT = `你是一位精通传统合婚命理的资深命理师，熟读《子平真诠》《滴天髓》《穷通宝鉴》《渊海子平》《三命通会》《千里命稿》六部经典。

写作要求：
1. 各维度吉凶、干支关系、配偶星、五行分布、大运助耗等全部为确定性算法结果，你只做解读，严禁修改、否认或与其矛盾；没有列出的干支关系一律不得自行编造。
2. 依据分级必须在解读中体现：每个维度都标注了依据等级（典籍/古法/民俗/产品设定），不得把民俗维度（生肖）、古法维度（纳音）或产品设定维度（大运同步）说成命理典籍所载；引用时须与其依据等级相称。
3. 不得复述任何总分数字；以给定的"总观感"为准描述整体契合程度。
4. 语言典雅通俗，让普通人看得懂；断语留余地，用"倾向""宜""需注意"等表述，严禁绝对化断言、不吓唬用户、不劝分劝离，重在"如何经营"。
5. 紧扣这两人的具体八字，禁止放之四海皆准的套话。
6. "冲"只能用于六冲对（子午、丑未、寅申、卯酉、辰戌、巳亥），五行相克只能称"克"。
7. 生肖合冲只是合婚的一个维度、权重有限，分析时须以日柱夫妻宫与全局五行为重，避免"生肖定终身"的民间俗论。
8. 输出必须是纯 JSON 对象，不要 markdown 代码块、不要任何额外文字。
9. ${FORBIDDEN_WORDS_PROMPT}
   ★ 合婚全文禁"必"字（含不必/未必，否定请用"无须"）；逐字替换范例："不必介怀→无须介怀"、"不必担心→无须担心"、"未必→难讲、往往不"。
10. "overview"（配对总评）板块必须以这句固定免责语收尾、原文照写：
    "以上为倾向性分析，仅供参考，非确定性结论，不构成婚姻决策依据；感情经营在人。"`

function buildUserPrompt(male: AnalyzableChart, female: AnalyzableChart, r: HemunResult): string {
  const p = (c: AnalyzableChart) => c.pillars
  const pm = p(male), pf = p(female)
  const dimFacts = r.dimensions
    .map(d => `【${d.name}】（依据：${d.basis}；结论：${d.verdict}）\n${d.facts.map(f => '　· ' + f).join('\n')}`)
    .join('\n')
  const dimTags = r.dimensions.flatMap(d => d.tags).join('、') || '无显著吉凶标签'
  return `请为以下两人撰写合婚深度解读。

【男方】
公历 ${male.input.year}年${male.input.month}月${male.input.day}日${male.input.hour}时
四柱：${pm.year.ganZhi}（年）　${pm.month.ganZhi}（月）　${pm.day.ganZhi}（日）　${pm.hour.ganZhi}（时）
日主：${male.dayMaster}　旺衰（已定，不得更改）：${male.analysis?.wangShuai}　格局：${male.analysis?.geJu}
年柱纳音：${r.male.yearNaYin}

【女方】
公历 ${female.input.year}年${female.input.month}月${female.input.day}日${female.input.hour}时
四柱：${pf.year.ganZhi}（年）　${pf.month.ganZhi}（月）　${pf.day.ganZhi}（日）　${pf.hour.ganZhi}（时）
日主：${female.dayMaster}　旺衰（已定，不得更改）：${female.analysis?.wangShuai}　格局：${female.analysis?.geJu}
年柱纳音：${r.female.yearNaYin}

【算法已确认的合婚事实，解读必须与此一致，不得编造未列出的关系】
总观感：${r.overall}
关键标签：${r.keyTags.join('、') || '无'}；各维度标签：${dimTags}
当前大运：男 ${r.currentLuck.male}、女 ${r.currentLuck.female}（${r.currentLuck.note}）

${dimFacts}

请严格按以下结构输出 JSON（共6个键，每个键值为该板块正文，可用 \\n\\n 分段）：
${SECTION_SPECS.map((s, i) => `${i + 1}. ${s.key}（${s.name}）：${s.requirement}`).join('\n')}`
}

interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: string } }>
  usage?: AIUsage
  error?: { message?: string }
}

// ★ 合规退回后的结构提示（配合 ai-check.complianceRetryHint 回灌退回原因，单一事实源）：
//   与紫微模块同法——把退回原因追加为一条 user 消息，不改 buildUserPrompt，保证首次请求逐字一致。
const HEMUN_SHAPE = '完整 JSON（六个板块：配对总评、生肖年柱、日柱夫妻宫、配偶星与感情模式、五行互补喜用互助、相处建议）'

// 调用 OpenAI 兼容接口；失败返回 null（调用方回退到规则版文字）
export async function generateAIHemun(
  male: AnalyzableChart,
  female: AnalyzableChart,
  result: HemunResult
): Promise<(AIHemunSections & { _usage?: AIUsage }) | null> {
  if (!AI_API_KEY) {
    // ★ 回退必须可见（任务书 §四）：静默降级让「AI 没跑」这件事不可见
    console.warn('[ai-hemun] 未配置 AI_API_KEY，本次回退规则版文案')
    return null
  }

  // overview 板块固定免责语（与 SYSTEM_PROMPT 第10条一致）
  const HEMUN_DISCLAIMER = '以上为倾向性分析，仅供参考，非确定性结论，不构成婚姻决策依据；感情经营在人。'

  // 单次 API 调用，失败返回 null
  const attempt = async (feedback?: string): Promise<(AIHemunSections & { _usage?: AIUsage }) | null> => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS)
    try {
      const messages: Array<{ role: string; content: string }> = [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildUserPrompt(male, female, result) }
      ]
      if (feedback) messages.push({ role: 'user', content: complianceRetryHint(feedback, HEMUN_SHAPE) })

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
          messages
        }),
        signal: controller.signal
      })
      if (!res.ok) {
        console.error('[ai-hemun] API 错误:', res.status, await res.text())
        return null
      }
      const data = (await res.json()) as ChatCompletionResponse
      const content = data.choices?.[0]?.message?.content
      if (!content) return null
      const jsonText = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
      const parsed = JSON.parse(jsonText) as Record<string, unknown>
      const out = {} as AIHemunSections
      for (const spec of SECTION_SPECS) {
        const v = parsed[spec.key]
        if (typeof v !== 'string' || v.trim().length < 50) {
          console.error(`[ai-hemun] 板块 ${spec.key} 缺失或过短，放弃 AI 结果`)
          return null
        }
        out[spec.key] = v.trim()
      }
      return { ...out, _usage: data.usage }
    } catch (err) {
      console.error('[ai-hemun] AI 合婚解读失败:', err instanceof Error ? err.message : err)
      return null
    } finally {
      clearTimeout(timer)
    }
  }

  // 安全同义替换兜底（与 prompt 第9条范例一致）：「不必」→「无须」，语义完全等价
  const sanitize = (s: AIHemunSections) => {
    let n = 0
    for (const spec of SECTION_SPECS) {
      const before = s[spec.key]
      s[spec.key] = before.replaceAll('不必', '无须')
      if (s[spec.key] !== before) n++
    }
    return n
  }
  const hasBi = (s: AIHemunSections) =>
    findForbidden(Object.values(s).join(''), true).hits.length > 0

  // 合婚口径物理禁「必」字（含不必/未必，SYSTEM_PROMPT 第9条）。
  // 每次拿到结果先做安全等价替换（不必→无须，语义不变），其余「必」字由重试编排处理：
  // 仍含则放弃 AI 结果，由调用方回退规则版
  const wrappedAttempt = async (feedback?: string) => {
    const r = await attempt(feedback)
    if (r) {
      const n = sanitize(r)
      if (n) { void n }
    }
    return r
  }
  const out = await withComplianceRetry(
    wrappedAttempt,
    (r) => (hasBi(r) ? '检出物理禁用字「必」' : null),
    'ai-hemun'
  )

  // 免责兜底（prompt 早已要求原文照写，此处仅防非确定性遗漏）：overview 缺固定短语则追加
  if (out && !/非确定性|仅供参考|不构成/.test(out.overview)) {
    out.overview = out.overview.replace(/。?$/, '') + '。' + HEMUN_DISCLAIMER
  }
  return out
}

// 规则版兜底文案：当 AI 不可用时，用结构化事实拼成可读解读
export function fallbackHemunText(r: HemunResult): AIHemunSections {
  const join = (keys: string[]) =>
    r.dimensions.filter(d => keys.includes(d.key)).map(d => `· ${d.verdict}`).join('\n')
  const factsOf = (keys: string[]) =>
    r.dimensions.filter(d => keys.includes(d.key)).flatMap(d => d.facts).map(f => `· ${f}`).join('\n')
  return {
    overview: `${r.overall}。${r.keyTags.length ? '关键特点：' + r.keyTags.join('、') + '。' : ''}以下各维度按依据分级（典籍/古法/民俗/产品设定）如实呈现，供逐条参看。合婚以日柱夫妻宫与全局五行为重，生肖仅作参考。`,
    shengxiao: `生肖配对（民俗）、年柱干支（典籍）、年柱纳音（古法）：\n${join(['yearZodiac', 'yearGanZhi', 'nayin'])}`,
    rizhu: `日柱夫妻宫（合婚核心，典籍）：\n${factsOf(['day'])}`,
    ouxing: `配偶星与十神互见（男以财为妻、女以官为夫，典籍）：\n${join(['spouse', 'shishen'])}`,
    wuxing: `五行互补与喜用互助（典籍延伸）：\n${factsOf(['wuxing'])}`,
    advice: `婚姻宫稳定度（典籍）：\n${join(['palace'])}\n大运节奏（产品设定，仅供节奏参考）：\n${join(['dayun'])}`
      + '\n相处之道：互相尊重、扬长避短，针对以上事实中提示的磨合点多沟通；命理仅供参考，感情经营在人。',
  }
}
