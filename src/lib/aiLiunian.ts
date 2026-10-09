// AI 年运（流年详批）解读 —— 规则引擎（analysis.ts buildLuckCycles）出全部流年事实，AI 只据此撰写文字
// 沿用单人模块架构：「规则引擎出事实 → AI 生成解读」；任一板块不合格则回退（由调用方处理）
// 范围：目标流年只能是今年/明年/后年（= liuNian 三年）；流月节奏仅当年提供（liuYue 只算当年），
//       明年/后年严禁 AI 自行编造流月内容。
import { Solar } from 'lunar-javascript'
import type { AnalyzableChart, LuckCycles, LuckLiuNianItem, LuckLiuYueItem } from './analysis'
import { getFavorSets, TIAO_HOU } from './analysis'
import type { AIUsage } from './ai-types'
import { unknownGanzhi, withComplianceRetry, findForbidden } from './ai-check'

const AI_API_KEY = process.env.AI_API_KEY || ''
const AI_BASE_URL = (process.env.AI_BASE_URL || 'https://api.deepseek.com').replace(/\/$/, '')
const AI_MODEL = process.env.AI_MODEL || 'deepseek-chat'
const AI_TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS || 90000)

export interface AILiunianSections {
  annualOverview: string  // 年运总纲
  careerFlow: string      // 流年事业
  wealthFlow: string      // 流年财运
  loveFlow: string        // 流年感情
  healthFlow: string      // 流年健康
  monthFlow?: string      // 当年流月节奏（仅目标年=当年时生成）
}

const SECTION_SPECS_BASE: Array<{ key: keyof AILiunianSections; name: string; requirement: string }> = [
  { key: 'annualOverview', name: '年运总纲', requirement: '开宗明义总评目标流年：流年干支、天干十神主事领域、地支十神、与原局夫妻宫/月令/大运的关系（只能引用算法事实）、倾向标签（以给定的倾向为准，不得复述任何分数数字）；给出这一年的一条主线定调，200-250字' },
  { key: 'careerFlow', name: '流年事业', requirement: '结合流年天干十神主事、与月令（提纲）及所在大运的关系、结构病（如有），描述当年事业倾向：适合守成还是试探新机、合作/变动之象、需要回避的场景，措辞具体留余地，200-250字' },
  { key: 'wealthFlow', name: '流年财运', requirement: '结合流年干支十神中财星的有无与状态（财星透干/藏支/不见，按给定事实）、喜忌五行、结构病（如比劫夺财），描述当年财运倾向；无财星流年如实说明以正职为本、不宜贪求；对投资、杠杆、投机一律不鼓励，必要时提示"宜守"，200-250字' },
  { key: 'loveFlow', name: '流年感情', requirement: '结合流年与夫妻宫（日支）的冲/合/伏吟关系、流年干支十神中配偶星（男看财、女看官）的状态，描述当年感情倾向：单身者桃花机缘、有伴者关系节奏；关系描述只能引用算法事实，200-250字' },
  { key: 'healthFlow', name: '流年健康', requirement: '结合流年干支五行属性与命局喜忌，点出当年需要留意的脏腑养护（木肝胆、火心脏、土脾胃、金肺、水肾）与作息建议；只作倾向提示，严禁任何病症断言，150-250字' },
]
const MONTHFLOW_SPEC = { key: 'monthFlow' as const, name: '当年流月节奏', requirement: '引用给定的当年流月数据（节气换月），点出较宜之月与宜慎之月各是哪几个月、宜安排什么、宜回避什么；只用"较宜/一般/宜慎"标签，严禁出现"大吉/吉"，150-250字' }

const SYSTEM_PROMPT = `你是一位精通传统子平命理的资深命理师，熟读《子平真诠》《滴天髓》《穷通宝鉴》《渊海子平》《三命通会》《千里命稿》六部经典，正在为用户撰写年度流年详批。

写作要求：
1. 排盘数据、旺衰、格局、喜忌、【算法已确认的流年事实】区块中的所有结论均为确定性算法算出，你只做解读，严禁修改、否认或与其矛盾；没有列出的干支关系一律不得自行编造。
2. 紧扣这个命局与目标流年的具体干支组合，禁止写放之四海皆准的套话；断语留余地，用"倾向""易""需注意"等表述，严禁绝对化断言、不吓唬用户。
3. 语言典雅通俗，让普通人看得懂。
4. 若目标流年不是当年（未提供流月数据），全文严禁提及任何流月、月份节奏内容。
5. 输出必须是纯 JSON 对象，不要 markdown 代码块、不要任何额外文字。
6. 全文不得出现"必"这个字（含"不必""未必""必然""务必"等，否定请用"无须"，推断请用"往往、多半、倾向于"）；亦严禁"一定""注定""大吉""大凶"。
   逐字替换范例（想写左边时改写为右边）："不必担心→无须担心"、"未必→难讲、往往不"、"务必注意→建议留意"、"必然→多半"、"一定→倾向于"。
7. "annualOverview"（年运总纲）板块必须以这句固定免责语收尾、原文照写：
   "以上为流年倾向性分析，仅供参考，非确定性结论，不构成任何重大决策依据。"

命理术语铁律（违反即为错误）：
A. "冲"只能用于六冲对：子午、丑未、寅申、卯酉、辰戌、巳亥。水克火、木克土等只能说"克"，严禁把克说成冲。
B. 十神严格按提供的流年十神数据引用；地支藏干必须逐字引用给定的藏干，严禁提及任何支中不存在的字（例如寅只藏甲丙戊，不得说寅中藏乙）。
C. 流年干支、所在大运、流年与夫妻宫/月令/大运的冲合关系，只能引用【算法已确认的流年事实】中算出的结果，严禁自行编造或遗漏其中的重点关系。
D. 流月以节气换月（若提供），标签只用"较宜/一般/宜慎"，严禁出现"大吉/吉"。
E. 全文须带"流年为倾向性参考、非确定性预言"的立场，对投资、杠杆、投机等重大决策不作鼓励，必要时提示"宜守""忌投机"。`

const CANG_GAN: Record<string, string[]> = {
  '子': ['癸'], '丑': ['己', '癸', '辛'], '寅': ['甲', '丙', '戊'], '卯': ['乙'],
  '辰': ['戊', '乙', '癸'], '巳': ['丙', '庚', '戊'], '午': ['丁', '己'], '未': ['己', '丁', '乙'],
  '申': ['庚', '壬', '戊'], '酉': ['辛'], '戌': ['戊', '辛', '丁'], '亥': ['壬', '甲']
}

function buildUserPrompt(
  chart: AnalyzableChart,
  luck: LuckCycles,
  targetYear: number
): string {
  const p = chart.pillars
  const gender = chart.input.gender === 1 ? '男' : '女'
  const nowYear = luck.liuNian[0].year
  const includeMonthFlow = targetYear === nowYear
  const specs = includeMonthFlow ? [...SECTION_SPECS_BASE, MONTHFLOW_SPEC] : SECTION_SPECS_BASE

  const pillarLine = (label: string, pl: typeof p.year) =>
    `${label}：${pl.ganZhi}（天干${pl.gan}=${pl.tenGodGan || '日主'}；地支${pl.zhi}藏${pl.cangGan.map((g, i) => `${g}=${pl.tenGodCangGan[i]}`).join('、')}）`

  const { favorable, unfavorable } = getFavorSets(chart)

  // 调候用神核查（与 aiAnalysis 同判据，避免编造）
  const thGods = (TIAO_HOU[chart.dayMaster]?.[p.month.zhi] || '').split('').filter(Boolean)
  const otherStems = [
    { where: '年干', gan: p.year.gan },
    { where: '月干', gan: p.month.gan },
    { where: '时干', gan: p.hour.gan }
  ]
  const thLines = thGods.map((g, idx) => {
    const stemHit = otherStems.find(s => s.gan === g)
    const ZHI_LABEL: Record<string, string> = { year: '年', month: '月', day: '日', hour: '时' }
    const cangLocs = (['year', 'month', 'day', 'hour'] as const)
      .filter(k => p[k].cangGan.includes(g))
      .map(k => `${ZHI_LABEL[k]}支${p[k].zhi}中`)
    const status = stemHit ? `透干（${stemHit.where}）` : cangLocs.length ? `藏支（${cangLocs.join('、')}）` : '局中不见'
    return `${idx === 0 ? '首神' : `第${idx + 1}神`}${g}：${status}`
  })

  const curDY = luck.daYun.find(d => d.current)
  const daYunCheck = curDY
    ? `当前大运${curDY.ganZhi}（${curDY.startYear}-${curDY.endYear}年，运干十神${curDY.shiShenGan}、运支本气十神${curDY.shiShenZhi}，倾向【${curDY.tag}】）` +
      `${curDY.structuralIssues?.length ? '；结构病：' + curDY.structuralIssues.join('；') : ''}`
    : '当前处于起运前后，尚无大运，以流年为主'

  const liuNianLines = luck.liuNian.map(y =>
    `${y.year}年${y.ganZhi}${y.year === targetYear ? '★目标流年' : ''}（天干十神${y.shiShenGan}、地支本气十神${y.shiShenZhi}）倾向【${y.tag}】` +
    `${y.daYunGanZhi ? `，该年行${y.daYunGanZhi}大运` : ''}` +
    `${y.structuralIssues?.length ? '；结构病：' + y.structuralIssues.join('；') : ''}` +
    `${y.relations.length ? '；' + y.relations.join('；') : ''}`
  ).join('\n　')

  const target = luck.liuNian.find(y => y.year === targetYear)!
  const monthFlowCheck = includeMonthFlow
    ? `■ 当年流月节奏（节气换月，流月段必须严格引用）：\n　较宜之月：${luck.liuYue.filter(m => m.tag === '较宜').map(m => `${m.month}月${m.ganZhi}【较宜】`).join('、') || '无明显突出之月'}\n　宜慎之月：${luck.liuYue.filter(m => m.tag === '宜慎').map(m => `${m.month}月${m.ganZhi}【宜慎】`).join('、') || '无明显宜慎之月'}`
    : '■ 目标流年非当年：未提供任何流月数据，全文严禁提及流月或月份节奏。'

  return `请为以下命盘撰写${targetYear}年（${target.ganZhi}年）流年详批。

【基本信息】
性别：${gender}
公历：${chart.input.year}年${chart.input.month}月${chart.input.day}日${chart.input.hour}时
日主：${chart.dayMaster}
旺衰（已判定，不得更改）：${chart.analysis.wangShuai}
格局（已判定，不得更改）：${chart.analysis.geJu}

【四柱八字（=号后为算法确认的十神，引用时必须与此一致）】
${pillarLine('年柱', p.year)}
${pillarLine('月柱', p.month)}
${pillarLine('日柱', p.day)}
${pillarLine('时柱', p.hour)}
胎元：${chart.taiYuan}　命宫：${chart.mingGong}

【喜忌（已判定，不得更改）】
喜用五行：${favorable.join('、')}；忌神五行：${unfavorable.join('、')}
调候用神核查（《穷通宝鉴》${chart.dayMaster}生${p.month.zhi}月）：${thLines.join('；') || '该月无固定调候神'}

【算法已确认的流年事实，解读必须与此一致，不得编造未列出的关系】
■ ${daYunCheck}
■ 流年（今年起三年，★为目标流年）：
　${liuNianLines}
${monthFlowCheck}

请严格按以下结构输出 JSON（共${specs.length}个键，每个键值为该板块正文，可用 \\n\\n 分段）：
${specs.map((s, i) => `${i + 1}. ${s.key}（${s.name}）：${s.requirement}`).join('\n')}`
}

interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: string } }>
  usage?: AIUsage
  error?: { message?: string }
}

// 调用 OpenAI 兼容接口；失败返回 null（调用方回退到规则版文字）
export async function generateAILiunian(
  chart: AnalyzableChart,
  luck: LuckCycles,
  targetYear: number
): Promise<(AILiunianSections & { _usage?: AIUsage }) | null> {
  if (!AI_API_KEY) {
    // ★ 回退必须可见（任务书 §四）：静默降级让「AI 没跑」这件事不可见
    console.warn('[ai-liunian] 未配置 AI_API_KEY，本次回退规则版文案')
    return null
  }

  const nowYear = luck.liuNian[0].year
  const includeMonthFlow = targetYear === nowYear
  const specs = includeMonthFlow ? [...SECTION_SPECS_BASE, MONTHFLOW_SPEC] : SECTION_SPECS_BASE

  // 免责兜底语（与 SYSTEM_PROMPT 第7条一致）
  const LIUNIAN_DISCLAIMER = '以上为流年倾向性分析，仅供参考，非确定性结论，不构成任何重大决策依据。'

  // 事实集（与 prompt 实际给出的事实逐字对齐：四柱/胎元/命宫/大运/三年流年/当年流月）
  const facts = new Set<string>([
    chart.pillars.year.ganZhi, chart.pillars.month.ganZhi,
    chart.pillars.day.ganZhi, chart.pillars.hour.ganZhi,
    chart.taiYuan, chart.mingGong,
    ...chart.daYun.map(d => d.ganZhi),
    ...luck.liuNian.map(y => y.ganZhi),
    ...(includeMonthFlow ? luck.liuYue.map(m => m.ganZhi) : [])
  ])

  // 合规校验（与 aiAnalysis/aiHemun 对称接线，共享判据 ai-check.ts）：
  //   ① 干支溯源 ② 禁用词。findForbidden 用默认口径（否定式豁免）：
  //   「未必/不可避免」正确放行；「不必」已在 wrappedAttempt 中替换为「无须」到不了这里
  const validate = <T extends object>(r: T): string | null => {
    const text = Object.values(r).filter(v => typeof v === 'string').join('')
    if (unknownGanzhi(text, facts).length) return '检出未溯源干支'
    if (findForbidden(text).hits.length) return '检出禁用词'
    return null
  }

  // 单次 API 调用，失败返回 null
  const attempt = async (): Promise<(AILiunianSections & { _usage?: AIUsage }) | null> => {
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
            { role: 'user', content: buildUserPrompt(chart, luck, targetYear) }
          ]
        }),
        signal: controller.signal
      })
      if (!res.ok) {
        console.error('[ai-liunian] API 错误:', res.status, await res.text())
        return null
      }
      const data = (await res.json()) as ChatCompletionResponse
      const content = data.choices?.[0]?.message?.content
      if (!content) return null
      const jsonText = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
      const parsed = JSON.parse(jsonText) as Record<string, unknown>
      const out = {} as AILiunianSections
      for (const spec of specs) {
        const v = parsed[spec.key]
        if (typeof v !== 'string' || v.trim().length < 50) {
          console.error(`[ai-liunian] 板块 ${spec.key} 缺失或过短，放弃 AI 结果`)
          return null
        }
        out[spec.key] = v.trim()
      }
      return { ...out, _usage: data.usage }
    } catch (err) {
      console.error('[ai-liunian] AI 年运解读失败:', err instanceof Error ? err.message : err)
      return null
    } finally {
      clearTimeout(timer)
    }
  }

  // 安全同义替换兜底：「不必」→「无须」（语义等价），先替换再校验，与 aiHemun/aiAnalysis 同序
  const wrappedAttempt = async () => {
    const r = await attempt()
    if (r) {
      let n = 0
      for (const k of Object.keys(r) as (keyof AILiunianSections)[]) {
        const before = r[k]
        if (typeof before !== 'string') continue
        r[k] = before.replaceAll('不必', '无须')
        if (r[k] !== before) n++
      }
      if (n) { void n }
    }
    return r
  }

  const out = await withComplianceRetry(wrappedAttempt, validate, 'ai-liunian')

  // 免责兜底（prompt 早已要求原文照写，此处仅防非确定性遗漏）
  if (out && !/非确定性|仅供参考|不构成/.test(out.annualOverview)) {
    out.annualOverview = out.annualOverview.replace(/。?$/, '') + '。' + LIUNIAN_DISCLAIMER
  }
  return out
}

// 流年干支五行（规则版文案用；与 analysis.ts 同口径的权威映射）
const GAN_WX: Record<string, string> = {
  '甲': '木', '乙': '木', '丙': '火', '丁': '火', '戊': '土',
  '己': '土', '庚': '金', '辛': '金', '壬': '水', '癸': '水'
}
const ZHI_WX: Record<string, string> = {
  '子': '水', '丑': '土', '寅': '木', '卯': '木', '辰': '土', '巳': '火',
  '午': '火', '未': '土', '申': '金', '酉': '金', '戌': '土', '亥': '水'
}

// 规则版兜底文案：AI 不可用时，用结构化流年事实拼成可读解读
// 只引用 item 上算法已算出的字段（note/relations/structuralIssues/tag/十神），不新增判断
export function fallbackLiunianText(
  targetYear: number,
  item: LuckLiuNianItem,
  liuYue: LuckLiuYueItem[] | null,
  ctx: { favorable: string[]; unfavorable: string[] }
): AILiunianSections {
  const ganWx = GAN_WX[item.ganZhi[0]] || ''
  const zhiWx = ZHI_WX[item.ganZhi[1]] || ''
  const relations = item.relations.length ? item.relations.map(r => `· ${r}`).join('\n') : '· 流年与原局无六冲、六合、伏吟等显著关系'
  const issues = item.structuralIssues.length ? `结构病：${item.structuralIssues.join('；')}` : '无显著结构病'
  const disclaimer = '以上为流年倾向性分析，仅供参考，非确定性结论，不构成任何重大决策依据。'

  const out: AILiunianSections = {
    annualOverview: `${targetYear}年为${item.ganZhi}年，天干${item.ganZhi[0]}（${item.shiShenGan}）主事，地支${item.ganZhi[1]}本气为${item.shiShenZhi}，全年倾向【${item.tag}】。${item.note}岁运关系：\n${relations}\n${issues}。${item.daYunGanZhi ? `该年行${item.daYunGanZhi}大运。` : ''}命理为倾向参考，流年吉凶非确定性预言，遇事仍以自身审慎为主。${disclaimer}`,
    careerFlow: `事业方面，${targetYear}年流年天干${item.ganZhi[0]}为${item.shiShenGan}，主事领域倾向：${item.note.split('；')[0].replace(/^.*?主事——/, '')}。\n${relations}\n${issues}。宜按此倾向安排事业节奏：顺势之年可推进，受阻之年宜修内功；重大人事变动宜多观察再行动。`,
    wealthFlow: `财运方面，流年天干十神为${item.shiShenGan}、地支本气为${item.shiShenZhi}，全局倾向【${item.tag}】。喜用五行为${ctx.favorable.join('、') || '（局中取用）'}，忌神为${ctx.unfavorable.join('、') || '无'}。${item.structuralIssues.includes('比劫夺财') ? '需留意比劫夺财之象，合伙、借贷须谨慎。' : ''}${item.shiShenGan.includes('财') || item.shiShenZhi.includes('财') ? '流年带财星，财现但机会与波动并存，落袋为安为宜。' : '流年财星不显，以正职稳定收入为本，不宜贪求偏门之财。'}对投资、杠杆、投机一律宜守不宜进。`,
    loveFlow: `感情方面，${relations.includes('夫妻宫') ? '流年与夫妻宫（日支）有直接作用：\n' + relations.split('\n').filter(r => r.includes('夫妻宫')).join('\n') : '流年与夫妻宫（日支）无直接冲合作用，感情节奏延续既有轨迹。'}流年天干${item.ganZhi[0]}（${item.shiShenGan}）${item.shiShenGan.includes('财') ? '男命财星显现，桃花机缘与感情波动并存。' : item.shiShenGan.includes('官') ? '女命官星显现，感情事多有进展之机。' : '配偶星不显，感情宜顺其自然、重在经营。'}有伴者多沟通、少猜疑；单身者宜在日常生活中扩大交集，无须刻意强求。`,
    healthFlow: `健康方面，流年干支${item.ganZhi}五行属${ganWx}${zhiWx !== ganWx ? '、' + zhiWx : ''}，结合命局喜忌（喜${ctx.favorable.join('、') || '无特定'}，忌${ctx.unfavorable.join('、') || '无特定'}），对应脏腑养护提示：木-肝胆、火-心脏、土-脾胃、金-肺、水-肾。全年倾向【${item.tag}】，宜规律作息、饮食有节、适度运动；如有旧疾按时复查。命理提示仅为生活方式参考，身体不适请及时就医。`
  }
  if (liuYue && liuYue.length) {
    const good = liuYue.filter(m => m.tag === '较宜').map(m => `${m.month}月（${m.ganZhi}）`)
    const bad = liuYue.filter(m => m.tag === '宜慎').map(m => `${m.month}月（${m.ganZhi}）`)
    out.monthFlow = `当年流月节奏（以节气为界）：较宜安排要事的月份有${good.join('、') || '无明显突出之月'}；宜谨慎行事的月份有${bad.join('、') || '无明显宜慎之月'}。流月吉凶本就起伏有限，标签仅作节奏参考，遇事以实际准备为准。`
  }
  return out
}
