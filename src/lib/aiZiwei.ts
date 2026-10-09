// AI 紫微深度解读：规则引擎出星盘事实，AI 只做解读文案
import type { ZwChart, ZiweiAnalysis } from './ziwei'
import type { AIUsage } from './ai-types'
import { findForbidden, withComplianceRetry } from './ai-check'

const AI_API_KEY = process.env.AI_API_KEY || ''
const AI_BASE_URL = (process.env.AI_BASE_URL || 'https://api.deepseek.com').replace(/\/$/, '')
const AI_MODEL = process.env.AI_MODEL || 'deepseek-chat'
const AI_TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS || 90000)

export interface ZiweiAIReport {
  overview: string   // 命格总论
  career: string     // 事业格局
  wealth: string     // 财富财运
  marriage: string   // 感情婚姻
  health: string     // 身心安康
  yearly: string     // 大限流年
}

const SECTION_SPECS: Array<{ key: keyof ZiweiAIReport; name: string; requirement: string }> = [
  { key: 'overview', name: '命格总论', requirement: '结合命宫主星、传统格局标签与气势评分，总论此人的性格底色、人生主题与最大优势/短板，200-300字' },
  { key: 'career', name: '事业格局', requirement: '基于官禄宫、命宫三方四正星曜与四化，分析适合的事业方向（公职/管理/技术/商业/艺术等）、工作风格与发展层次，200-300字' },
  { key: 'wealth', name: '财富财运', requirement: '基于财帛宫、化禄/禄存/天马及空劫等星，分析求财方式、财运特征（正财/偏财/波动/晚发）与理财建议，200-300字' },
  { key: 'marriage', name: '感情婚姻', requirement: '基于夫妻宫主星与亮度、桃花喜曜、煞星与四化，分析感情模式、配偶特征、婚恋注意事项；须留余地不吓人，200-300字' },
  { key: 'health', name: '身心安康', requirement: '基于疾厄宫、福德宫星曜，指出体质薄弱环节与情绪养护重点，结合生活方式给出建议，200-300字' },
  { key: 'yearly', name: '大限流年', requirement: '先点明当前大限（干支/所坐原局宫位/大限四化）的十年基调，再点评今年流年（流年命宫所坐宫位、流年四化落宫）的重点机遇与注意，给出趋避建议，300-400字' }
]

const SYSTEM_PROMPT = `你是一位精通紫微斗数的资深命理师，熟读《紫微斗数全书》《紫微斗数全集》，星曜、四化、宫位断语功底扎实。

写作要求：
1. 命盘的星曜分布、庙旺落陷、四化落宫、格局标签、气势评分、大限流年干支与四化，全部为确定性算法结果，你只做解读，严禁修改、否认或与其矛盾。
2. 每个板块独立成段，语言典雅通俗，让普通人看得懂；紧扣此盘具体星曜组合，禁止放之四海皆准的套话。
3. 断语留余地，用"倾向""易""需注意"等表述，严禁绝对化断言，不吓唬用户。
   以下词语一律禁用：大吉、大凶、积极进取、突破性进展、必（含务必/必然/必定）、一定、注定。
   逐字替换范例：务必注意→宜注意；必然/注定→往往、倾向于；必定→多半；一定→往往。
4. 紫微论命以命宫三方四正、四化飞星为纲；不可把"空宫"简单说成命差，须说明借对宫星曜为用。
5. 输出必须是纯 JSON 对象，不要 markdown 代码块、不要任何额外文字。
6. "overview"（命格总论）板块必须以这句固定免责语收尾、原文照写：
   "以上为命理倾向性分析，仅供参考，非确定性结论，不构成任何决策依据。"

术语铁律（违反即为错误）：
A. "化忌"只指算法列出的化忌星落宫，不得自行给其他星加四化；六吉星（左右昌曲魁钺）、六凶星（羊陀火铃空劫）严格按算法结果引用。
B. 大限/流年四化只引用算法给出的星曜与落宫，不得编造。
C. 庙旺落陷引用算法标注，不得翻转。`

function buildUserPrompt(chart: ZwChart, analysis: ZiweiAnalysis): string {
  const a = analysis
  const patternLines = a.patterns
    .map((p) => `【${p.level}】${p.name}：${p.note}`)
    .join('\n')
  const transformLines = a.transforms
    .map((t) => `${t.star}化${t.type}于${t.palace}宫（${t.note}）`)
    .join('\n')

  const palaceBlock = (['命宫', '官禄', '财帛', '夫妻', '迁移', '福德', '疾厄'] as const)
    .map((name) => {
      const pal = chart.palaces.find((p) => p.name === name)!
      const r = a.palaces[name]
      // 宫干支为命盘确定性信息，随宫给出，解读可引用
      return `${name}（${pal.ganZhi}）：${r.stars.join('、') || '空宫（借对宫' + chart.palaces[(pal.index + 6) % 12].name + '）'}` +
        `${r.auspicious.length ? '；吉星：' + r.auspicious.join('、') : ''}` +
        `${r.ominous.length ? '；煞星：' + r.ominous.join('、') : ''}` +
        `${r.tags.length ? '；标签：' + r.tags.join('、') : ''}`
    })
    .join('\n')

  const periodBlock = (p: typeof a.decadal) =>
    `${p.title}：${p.ganZhi}，命宫坐原局${p.basePalace}宫${p.range ? '（' + p.range + '）' : ''}；星曜：${p.stars.join('、')}` +
    `\n　四化（落原局宫位）：${p.transforms.join('；')}` +
    `\n　标签：${p.tags.join('、')}`

  const sections = SECTION_SPECS.map((s, i) => `${i + 1}. "${s.key}"（${s.name}）：${s.requirement}`).join('\n')

  return `请为以下紫微命盘撰写深度解读。

【基本信息】
性别：${chart.input.gender === 1 ? '男' : '女'}
公历：${chart.input.year}年${chart.input.month}月${chart.input.day}日${chart.input.hour}时${chart.input.minute}分
农历：${chart.lunarDate}
五行局：${chart.fiveElementsClass}　命主：${chart.soul}　身主：${chart.body}
气势评分（不得更改）：${a.score}分，${a.scoreLabel}

【十二宫关键信息】
${palaceBlock}

【生年四化（不得更改）】
${transformLines}

【传统格局标签（不得更改，解读须与此一致）】
${patternLines}

【运限】
${periodBlock(a.decadal)}
${periodBlock(a.yearly)}
小限：${a.xiaoxian.nominalAge}岁，宫位在原局${a.xiaoxian.basePalace}（${a.xiaoxian.ganZhi}）

请严格按以下结构输出 JSON（共6个键，值为该板块正文，可用 \\n\\n 分段）：
${sections}`
}

// 规则版兜底文案
export function fallbackZiweiText(chart: ZwChart, a: ZiweiAnalysis): ZiweiAIReport {
  const p = a.palaces
  return {
    overview:
      `此造命宫在${chart.palaces[chart.mingIndex].earthlyBranch}，主星${p.命宫.stars.join('、') || '空宫，借对宫' + chart.palaces[(chart.mingIndex + 6) % 12].name}。` +
      `命盘气势${a.score}分（${a.scoreLabel}），格局见：${a.patterns.map((x) => x.name).join('、')}。` +
      `整体而言，宜顺星曜之性发挥所长、针对所忌之处修身经营，稳中求进。`,
    career:
      `官禄宫：${p.官禄.stars.join('、') || '空宫借对宫'}。${p.官禄.tags.join('、')}。` +
      `事业选择当看官禄星曜所主，并结合命宫三方四正格局；逢化禄化权化科之运宜顺势作为，逢化忌之运宜守成深耕，不宜冒进跳槽。`,
    wealth:
      `财帛宫：${p.财帛.stars.join('、') || '空宫借对宫'}。` +
      `${p.财帛.auspicious.length ? '有' + p.财帛.auspicious.join('、') + '相助，求财有门径。' : ''}` +
      `${p.财帛.ominous.length ? '逢' + p.财帛.ominous.join('、') + '，财源有波动。' : ''}` +
      `理财上宜量力而行、留足周转，重稳健配置，避免高风险投机。`,
    marriage:
      `夫妻宫：${p.夫妻.stars.join('、') || '空宫，借对宫星曜为用'}。` +
      `${p.夫妻.auspicious.length ? '吉星' + p.夫妻.auspicious.join('、') + '，感情有良缘基础。' : ''}` +
      `${p.夫妻.ominous.length ? '逢' + p.夫妻.ominous.join('、') + '，相处需多包容。' : ''}` +
      `感情经营重在沟通与互相尊重，逢化忌之年宜低调包容，重大决定可错开波折之期。`,
    health:
      `疾厄宫：${p.疾厄.stars.join('、') || '空宫借对宫'}；福德宫：${p.福德.stars.join('、') || '空宫借对宫'}。` +
      `日常宜规律作息、适度运动，关注情绪压力与睡眠；有不适及时就医，定期体检，心病还需心药医，保持心境开阔最为要紧。`,
    yearly:
      `${a.decadal.title}：${a.decadal.ganZhi}，坐原局${a.decadal.basePalace}宫（${a.decadal.range}）。` +
      `大限四化——${a.decadal.transforms.join('；')}。` +
      `今年流年${a.yearly.ganZhi}，命宫坐原局${a.yearly.basePalace}宫，流年四化——${a.yearly.transforms.join('；')}。` +
      `宜把握禄权科之助力、回避化忌之冲动，凡事留余地，则一年平稳中有收获。`
  }
}

interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: string } }>
  usage?: AIUsage
  error?: { message?: string }
}

export async function generateAIZiwei(chart: ZwChart, analysis: ZiweiAnalysis): Promise<(ZiweiAIReport & { _usage?: AIUsage }) | null> {
  if (!AI_API_KEY) {
    // ★ 回退必须可见（任务书 §四）：静默降级让「AI 没跑」这件事不可见
    console.warn('[aiZiwei] 未配置 AI_API_KEY，本次回退规则版文案')
    return null
  }

  const ZW_DISCLAIMER = '以上为命理倾向性分析，仅供参考，非确定性结论，不构成任何决策依据。'

  // 单次 API 调用，失败返回 null
  const attempt = async (): Promise<(ZiweiAIReport & { _usage?: AIUsage }) | null> => {
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS)

      const res = await fetch(`${AI_BASE_URL}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${AI_API_KEY}`
        },
        body: JSON.stringify({
          model: AI_MODEL,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: buildUserPrompt(chart, analysis) }
          ],
          temperature: 0.8,
          response_format: { type: 'json_object' }
        }),
        signal: controller.signal
      })
      clearTimeout(timer)

      const data = (await res.json()) as ChatCompletionResponse
      if (!res.ok || data.error) {
        console.error('[aiZiwei] API 错误:', data.error?.message || res.status)
        return null
      }

      const content = data.choices?.[0]?.message?.content
      if (!content) return null

      const jsonText = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
      const parsed = JSON.parse(jsonText) as Record<string, unknown>

      const result = {} as Record<keyof ZiweiAIReport, string>
      for (const spec of SECTION_SPECS) {
        const v = parsed[spec.key]
        if (typeof v !== 'string' || v.trim().length < 50) {
          console.error(`[aiZiwei] 板块 ${spec.key} 缺失或过短，放弃 AI 结果`)
          return null
        }
        result[spec.key] = v.trim()
      }
      return { ...result, _usage: data.usage } as unknown as ZiweiAIReport & { _usage?: AIUsage }
    } catch (err) {
      console.error('[aiZiwei] AI 解读失败:', err instanceof Error ? err.message : err)
      return null
    }
  }

  // 禁用词属红线（否定式除外）：首次检出给一次重试；仍不合规放弃 AI 结果，由调用方回退规则版
  const out = await withComplianceRetry(
    attempt,
    (r) => (findForbidden(Object.values(r).join('')).hits.length ? '检出禁用词' : null),
    'aiZiwei'
  )

  // 免责兜底（prompt 早已要求 overview 原文照写，此处仅防非确定性遗漏）：缺固定短语则追加
  if (out && !/非确定性|仅供参考|不构成/.test(out.overview)) {
    out.overview = out.overview.replace(/。?$/, '') + '。' + ZW_DISCLAIMER
  }
  return out
}
