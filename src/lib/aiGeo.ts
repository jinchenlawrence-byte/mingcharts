// AI 地理位置深度解读：规则引擎定城市与影响指数，AI 只做解读文案
import type { GeoAnalysis } from './geo'
import type { AIUsage } from './ai-types'
import { findForbidden, withComplianceRetry } from './ai-check'

const AI_API_KEY = process.env.AI_API_KEY || ''
const AI_BASE_URL = (process.env.AI_BASE_URL || 'https://api.deepseek.com').replace(/\/$/, '')
const AI_MODEL = process.env.AI_MODEL || 'deepseek-chat'
const AI_TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS || 90000)

export interface GeoAIReport {
  overview: string   // 方位总论
  currentCity: string // 现居城市影响（未提供现居城市时为空串）
  wealth: string     // 财富之城
  career: string     // 事业之城
  patron: string     // 贵人之城
  home: string       // 安居之城
  talent: string     // 才华之城
  advice: string     // 迁居开运建议
}

const SECTION_SPECS: Array<{ key: keyof GeoAIReport; name: string; requirement: string }> = [
  { key: 'overview', name: '方位总论', requirement: '结合日主五行、旺衰判定与喜忌五行，总论命局与地理方位的关系，点明宜行之方与忌行之方及其原理，200-300字' },
  { key: 'currentCity', name: '现居城市影响', requirement: '基于现居城市的主判五行（优先方位五行——城市相对出生地的方位；无出生地时以城市地气论，行文中须点明主判来源）、与日主的十神关系（印星/比劫/食伤/财星/官杀）、喜忌判定与影响指数，解读当前居住地对命主财运、事业、人际、心态的日常影响；吉则如何乘势深耕，忌则如何以行业选择、居家布置与心态调整化解；须强调五行影响是长期渐染、短期无妨，福地福人居、个人努力为本，200-300字' },
  { key: 'wealth', name: '财富之城', requirement: '基于财富之城各城市的五行匹配度、影响指数与相对方位，解读求财方式、机遇特征与注意事项；须紧扣命主旺衰：身弱则财富之城取比劫帮身之地（身弱不任财，先固本方能担财），身旺则直取财星之地，200-300字' },
  { key: 'career', name: '事业之城', requirement: '基于事业之城各城市与命局目标的契合，解读事业平台与发展建议；须紧扣命主旺衰：身弱则事业之城取印星扶身之地（化杀生身），身旺则直取官杀之地，200-300字' },
  { key: 'patron', name: '贵人之城', requirement: '基于贵人之城各城市与印星的契合，解读求学、考试、长辈提携、贵人扶持方面的机遇与宜忌；须点明印星在身旺身弱下的差异（身旺印多易生惰性、宜短期蓄力后转财官；身弱印星为扶身之本、久居得力），200-300字' },
  { key: 'home', name: '安居之城', requirement: '基于安居之城各城市与比劫的契合，解读久居定居的根基稳定性、社交合伙、家人相处方面的影响；须点明比劫在身旺身弱下的差异（身旺比劫旺则竞争分财、理财宜慎；身弱比劫帮身则根基渐稳、利合伙），200-300字' },
  { key: 'talent', name: '才华之城', requirement: '基于才华之城各城市与食伤的契合，解读在这些城市施展才华、创作表达、积累名气的方式与宜忌（身弱泄气须量力而行，身旺泄秀最利发挥），200-300字' },
  { key: 'advice', name: '迁居开运', requirement: '综合全部城市与方位结果，给出出行、迁居、长期发展的优先级建议与开运方法（行业五行、颜色、方位布置），须务实不迷信，200-300字' }
]

const SYSTEM_PROMPT = `你是一位精通子平命理与方位地理的资深命理师，善以五行喜忌论城市地气、方位吉凶。

写作要求：
1. 日主旺衰、喜忌五行、宜行忌行方位、城市五行、影响指数、相对方位，全部为确定性算法结果，你只做解读，严禁修改、否认或与其矛盾。
2. 每个板块独立成段，语言典雅通俗，紧扣此人命局与具体城市，禁止放之四海皆准的套话；没有列出的城市与干支关系一律不得编造。
3. 断语留余地，用"倾向""易""可考虑"等表述；地理风水只作趋避参考，须强调"福地福人居"、个人努力为本，不搞迷信恐吓。
   以下词语一律禁用：大吉、大凶、必（含务必/必然/必定）、一定、注定。
   逐字替换范例：务必→宜；必然/注定→往往；必定→多半；一定→往往；大吉→较为有利。
4. 城市推荐以「方位五行」为门控——方位五行是城市相对命主出生地的关系量（传统方位五行之说，属民俗）；城市地气（diqi）为地气物产取象，属本产品工程化设定、非古籍依据。行文须将两套来源区分表述，并明确出现"民俗（方位）"与"产品设定（地气）"字样，不得把地气取象说成古籍所载。
5. 输出必须是纯 JSON 对象，不要 markdown 代码块、不要任何额外文字。
6. "overview"（方位总论）板块必须以这句固定免责语收尾、原文照写：
   "以上方位分析仅供参考，非确定性结论，不构成迁居决策依据；福地福人居，个人努力为本。"`

function catLine(a: GeoAnalysis, key: string): string {
  const cat = a.categories.find((c) => c.key === key)!
  return cat.cities.map((c) =>
    `${c.name}（${c.region}）：方位${c.fangLabel}→五行${c.menWx}${c.menWx !== c.fangWx ? `（取宽泛方位；卦位五行${c.fangWx}）` : ''}${c.diqi ? `，地气${c.diqi}（产品设定）` : ''}，影响指数${c.score}【${c.impact}】` +
    `；依据：${c.reasons.join('；')}`
  ).join('\n')
}

function buildUserPrompt(a: GeoAnalysis): string {
  // 未提供现居城市时，该板块不进入 prompt 与校验
  const specs = SECTION_SPECS.filter((s) => s.key !== 'currentCity' || a.currentCity)
  const sections = specs.map((s, i) => `${i + 1}. "${s.key}"（${s.name}）：${s.requirement}`).join('\n')

  const cc = a.currentCity
  const currentCityBlock = cc
    ? `【现居城市】（此为命主当前居住地，非推荐结果）
${cc.name}：主判五行${cc.primaryWx ?? '无法判定'}${cc.primarySource ? `（来源：${cc.primarySource}）` : ''}${cc.godRelation ? `，与日主成${cc.godRelation}` : ''}，${cc.favorable ? '属命局喜用' : cc.primaryWx ? '属命局忌神' : ''}，影响指数${cc.score}【${cc.impact}】${cc.fangWx ? `，相对出生地${cc.fangLabel}` : cc.center ? '，与出生地同城近距（中央土）' : ''}；
确定性影响事实：${cc.effects.join('；')}
确定性建议：${cc.advice.join('；')}
`
    : ''

  return `请为以下命主撰写地理位置深度解读。

【命局】
日主：${a.dayMaster}（${a.dayWx}）　旺衰（不得更改）：${a.wangShuai}
喜用五行：${a.favorableWx.join('、')}
忌讳五行：${a.unfavorableWx.join('、')}
宜行方位：${a.favorableDirections.join('、')}
忌行方位：${a.unfavorableDirections.join('、')}
出生地参照：${a.birthplace ? `${a.birthplace.name}（方位计算基准）` : '未提供（不论相对方位）'}

${currentCityBlock}【财富之城】（目标：${a.categories[0].targetGod}${a.categories[0].targetWx}）
${catLine(a, 'wealth')}

【事业之城】（目标：${a.categories[1].targetGod}${a.categories[1].targetWx}）
${catLine(a, 'career')}

【贵人之城】（目标：${a.categories[2].targetGod}${a.categories[2].targetWx}）
${catLine(a, 'patron')}

【安居之城】（目标：${a.categories[3].targetGod}${a.categories[3].targetWx}）
${catLine(a, 'home')}

【才华之城】（目标：${a.categories[4].targetGod}${a.categories[4].targetWx}）
${catLine(a, 'talent')}

请严格按以下结构输出 JSON（共${specs.length}个键，值为该板块正文，可用 \n\n 分段）：
${sections}`
}

export function fallbackGeoText(a: GeoAnalysis): GeoAIReport {
  const w = a.categories[0].cities
  const c = a.categories[1].cities
  const p = a.categories[2].cities
  const h = a.categories[3].cities
  const t = a.categories[4].cities
  const cc = a.currentCity
  return {
    overview:
      `命主${a.dayMaster}${a.dayWx}，${a.wangShuai}，喜用${a.favorableWx.join('、')}，忌讳${a.unfavorableWx.join('、')}。` +
      `方位上宜行${a.favorableDirections.join('、')}，忌长期居于${a.unfavorableDirections.join('、')}之方。` +
      `城市地气各有偏盛，以喜用之方久居最得滋养；然"地灵人杰"，方位只作辅助，修身敬业方为根本。`,
    currentCity: cc
      ? `现居${cc.name}，主判五行${cc.primaryWx ?? '无法判定'}${cc.primarySource ? `（来源：${cc.primarySource}）` : ''}，${cc.godRelation ? `与日主成${cc.godRelation}，` : ''}${cc.favorable ? '属命局喜用' : cc.primaryWx ? '属命局忌神' : ''}，影响指数${cc.score}【${cc.impact}】。\n` +
        cc.effects.map((f) => `· ${f}`).join('\n') +
        `\n${cc.advice.join('。')}。`
      : '',
    wealth:
      `财富之城首推${w.slice(0, 2).map((x) => x.name + '（' + x.score + '分·' + x.impact + '）').join('、')}。` +
      (!a.strong
        ? `命主身弱不任财，财多反累其身，故财富之城不取财旺之地，而取比劫${a.categories[0].targetWx}帮身之方：先借同气之地固本培元、合伙借力，身旺之后方能担财，稳中求进，忌孤注一掷。`
        : `这些城市位于出生地的${a.categories[0].targetWx}方、方位五行与财星相应，命主身旺能任财，可顺势稳妥求财，仍须稳扎稳打、忌孤注与杠杆。`),
    career:
      `事业之城以${c.slice(0, 2).map((x) => x.name + '（' + x.score + '分·' + x.impact + '）').join('、')}为优，` +
      (!a.strong
        ? `命主身弱畏官杀之克，故事业之城取印星${a.categories[1].targetWx}扶身之地，化杀生身、先立根基，根基稳固后方堪当大任。`
        : `命主身旺喜官杀约束成器，事业平台与上升空间俱佳，可稳步求进、担当重任。`),
    patron:
      `贵人之城以${p.slice(0, 2).map((x) => x.name + '（' + x.score + '分·' + x.impact + '）').join('、')}为代表，方位五行合印星${a.categories[2].targetWx}。` +
      (a.strong
        ? '命主身旺，印星本非所喜，此地宜短期求学蓄力、考取资历，久居反易生安逸依赖，待根基既立当转财官之方以成就事功。'
        : '命主身弱，印星为扶身之本，久居此等地利学习、文书、长辈贵人提携，滋养固本，根基渐稳。'),
    home:
      `安居之城以${h.slice(0, 2).map((x) => x.name + '（' + x.score + '分·' + x.impact + '）').join('、')}为代表，方位五行合比劫${a.categories[3].targetWx}。` +
      (a.strong
        ? '命主身旺，比劫同气反助竞争分财，久居社交虽广然理财须慎、合伙忌轻信，宜守不宜攻。'
        : '命主身弱，比劫帮身，久居根基渐稳，利社交合伙、互借力，然仍忌过度透支。'),
    talent:
      `才华之城以${t.slice(0, 2).map((x) => x.name + '（' + x.score + '分·' + x.impact + '）').join('、')}为佳，地气合食伤${a.categories[4].targetWx}，利创作表达、技艺施展与名气积累。` +
      (a.strong
        ? '命主身旺，食伤泄秀正当其用，于此等地从事文艺、教育、传媒、餐饮诸业，才华易得赏识。'
        : '唯命主身弱，食伤之地亦泄元气，施展才华须量力而行，先以学习充电固本，再图输出，忌过度耗神。'),
    advice:
      `综合而言：短期求学蓄力取${p[0]?.name || '贵人之方'}，中长期事业取${c[0]?.name || '事业之方'}，求财经营取${w[0]?.name || '财富之方'}，施展才华取${t[0]?.name || '才华之方'}，安居休养取${h[0]?.name || '安居之方'}。` +
      `日常可配合喜用五行对应的行业、颜色与方位布置增吉；出行迁居避开忌方岁运冲动之时，凡事留余地。` +
      `须知福地福人居，心好命好、勤勉行善，处处皆可为宝地。`
  }
}

interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: string } }>
  usage?: AIUsage
  error?: { message?: string }
}

export async function generateAIGeo(a: GeoAnalysis): Promise<(GeoAIReport & { _usage?: AIUsage }) | null> {
  if (!AI_API_KEY) {
    // ★ 回退必须可见（任务书 §四）：静默降级让「AI 没跑」这件事不可见
    console.warn('[aiGeo] 未配置 AI_API_KEY，本次回退规则版文案')
    return null
  }

  // overview 固定免责语（与 SYSTEM_PROMPT 第6条一致）
  const GEO_DISCLAIMER = '以上方位分析仅供参考，非确定性结论，不构成迁居决策依据；福地福人居，个人努力为本。'

  // 单次 API 调用，失败返回 null
  const attempt = async (): Promise<(GeoAIReport & { _usage?: AIUsage }) | null> => {
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
            { role: 'user', content: buildUserPrompt(a) }
          ],
          temperature: 0.8,
          response_format: { type: 'json_object' }
        }),
        signal: controller.signal
      })
      clearTimeout(timer)

      const data = (await res.json()) as ChatCompletionResponse
      if (!res.ok || data.error) {
        console.error('[aiGeo] API 错误:', data.error?.message || res.status)
        return null
      }

      const content = data.choices?.[0]?.message?.content
      if (!content) return null

      const jsonText = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
      const parsed = JSON.parse(jsonText) as Record<string, unknown>

      const result = {} as Record<keyof GeoAIReport, string>
      const specs = SECTION_SPECS.filter((s) => s.key !== 'currentCity' || a.currentCity)
      for (const spec of specs) {
        const v = parsed[spec.key]
        if (typeof v !== 'string' || v.trim().length < 50) {
          console.error(`[aiGeo] 板块 ${spec.key} 缺失或过短，放弃 AI 结果`)
          return null
        }
        result[spec.key] = v.trim()
      }
      return { ...result, _usage: data.usage } as unknown as GeoAIReport & { _usage?: AIUsage }
    } catch (err) {
      console.error('[aiGeo] AI 解读失败:', err instanceof Error ? err.message : err)
      return null
    }
  }

  // 口径（SYSTEM_PROMPT 第4条）：全文须含「民俗」与「产品设定」字样；且禁用词 0 命中。
  // 模型非确定性输出：首次不合规给一次重试；仍不合规则放弃 AI 结果，由调用方回退规则版
  const out = await withComplianceRetry(
    attempt,
    (s) => {
      const t = Object.values(s).join('')
      if (!t.includes('民俗') || !t.includes('产品设定')) return '依据分级字样缺失'
      const hits = findForbidden(t).hits
      // 命中词进日志，便于诊断模型高频违规点（w=禁用词，s=命中句）
      if (hits.length) return `检出禁用词：${hits.map(h => h.w).join('、')}（首句：${hits[0].s.slice(0, 40)}…）`
      return null
    },
    'aiGeo'
  )

  // 免责兜底（prompt 早已要求原文照写，此处仅防非确定性遗漏）：overview 缺固定短语则追加
  if (out && !/非确定性|仅供参考|不构成/.test(out.overview)) {
    out.overview = out.overview.replace(/。?$/, '') + '。' + GEO_DISCLAIMER
  }
  return out
}
