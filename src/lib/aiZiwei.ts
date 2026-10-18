// AI 紫微深度解读：规则引擎出星盘事实，AI 只做解读文案
import { ZIWEI_PALACE_NAMES, type ZwChart, type ZiweiAnalysis } from './ziwei'
import type { AIUsage } from './ai-types'
import { findForbidden, withComplianceRetry, FORBIDDEN_WORDS_PROMPT, complianceRetryHint } from './ai-check'

const AI_API_KEY = process.env.AI_API_KEY || ''
const AI_BASE_URL = (process.env.AI_BASE_URL || 'https://api.deepseek.com').replace(/\/$/, '')
const AI_MODEL = process.env.AI_MODEL || 'deepseek-chat'
const AI_TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS || 120000)

// ★ 12 板块（用户拍板 2026-10-18「A+C」）：与命书（10 板块 5750 字）对齐内容密度，
//   紫微 $24.99 此前只有 6 板块 1300-1900 字，与 $29.99 的命书差距过大。
export interface ZiweiAIReport {
  overview: string     // 命格总论
  personality: string  // 性格底色
  palaces: string      // 十二宫导读
  career: string       // 事业格局
  wealth: string       // 财富财运
  marriage: string     // 感情婚姻
  health: string       // 身心安康
  transforms: string   // 生年四化专题
  patterns: string     // 格局成败
  decadal: string      // 大限十年
  yearly: string       // 流年与流月
  advice: string       // 趋避建议
}

// 12 板块及其写作要求（与 ZiweiAIReport 键一一对应）；字数下限合计 5750，与命书对齐
const SECTION_SPECS: Array<{ key: keyof ZiweiAIReport; name: string; requirement: string }> = [
  { key: 'overview', name: '命格总论', requirement: '结合命宫主星、身宫、五行局、命主身主、传统格局标签与气势评分，总论性格底色、人生主题与最大优势/短板。须含以下要点：命宫主星与五行局定性、格局标签的如实引用、命局最显著的一个优势与一个需注意之处、一句话人生主题定调。本板块正文不少于 400 字（上述要点须逐条展开成段、宁多勿少），低于下限为不合格' },
  { key: 'personality', name: '性格底色', requirement: '基于命宫及三方四正的主星组合、庙旺落陷与六吉六煞分布，结合福德宫，描述性格优势、短板与天赋所在。须含以下要点：性格底色一词定性、至少两个具体性格特质及其星曜来源、一个明显短板及其成因、天赋适合发挥的场合。本板块正文不少于 400 字，低于下限为不合格' },
  { key: 'palaces', name: '十二宫导读', requirement: '逐宫导读十二宫（命宫、兄弟、夫妻、子女、财帛、疾厄、迁移、仆役、官禄、田宅、福德、父母），每宫至少一句：点明该宫所主何事、宫内主星与关键吉煞、对该宫所主之事意味着什么。空宫须说明借对宫星曜为用，不得当作命差。十二宫须无遗漏、不得合并。本板块正文不少于 700 字，低于下限为不合格' },
  { key: 'career', name: '事业格局', requirement: '基于官禄宫、命宫三方四正星曜与四化，分析适合的事业方向（公职/管理/技术/商业/艺术等）、工作风格与发展层次，并结合当前大限点明发力时段。须含以下要点：适合的事业方向至少两个、工作风格一词定性、发展层次判断、发力时段建议。本板块正文不少于 500 字，低于下限为不合格' },
  { key: 'wealth', name: '财富财运', requirement: '基于财帛宫、田宅宫、化禄/禄存/天马及空劫等星，分析求财方式、财运特征与理财建议。须含以下要点：求财方式（正财/偏财/技术/管理）一词定性、财运特征（平稳/波动/晚发/聚散）判断、财帛与田宅两宫的对照、理财建议至少两条且每条不少于一句。本板块正文不少于 500 字（上述要点须逐条展开成段、宁多勿少），低于下限为不合格' },
  { key: 'marriage', name: '感情婚姻', requirement: '基于夫妻宫主星与亮度、桃花喜曜、煞星与四化，分析感情模式、配偶特征、婚恋注意事项。须含以下要点：夫妻宫主星与亮度的如实引用、感情模式一词定性、配偶特征简评、婚恋注意事项至少两条。断语留余地、不吓人。本板块正文不少于 500 字，低于下限为不合格' },
  { key: 'health', name: '身心安康', requirement: '基于疾厄宫、福德宫星曜，指出体质薄弱环节与情绪养护重点，结合生活方式给出建议。须含以下要点：疾厄与福德两宫星曜引用、体质薄弱环节至少一处、情绪养护重点、生活方式建议至少三条。本板块正文不少于 400 字，低于下限为不合格' },
  { key: 'transforms', name: '生年四化专题', requirement: '基于算法给出的生年四化（化禄/化权/化科/化忌）星曜与落宫，逐条说明该四化对其落宫所主之事的影响，并串联四化之间的呼应关系（如禄忌同宫、禄随忌走）。须逐条覆盖算法给出的每一组生年四化，不得增删；四化的星曜与落宫严格以算法结果为准。本板块正文不少于 500 字，低于下限为不合格' },
  { key: 'patterns', name: '格局成败', requirement: '基于算法给出的传统格局标签（含成立要件、加分项、破格项与古籍出处），逐一说明各格局的成立依据、对命局层次的实际影响与破格减力之处；算法未给出格局标签时，改论命宫三方四正的星曜组合性质。须含以下要点：格局名称如实引用、成格程度判断、破格项说明、对人生的实际影响。本板块正文不少于 500 字，低于下限为不合格' },
  { key: 'decadal', name: '大限十年', requirement: '先点明当前大限（干支、所坐原局宫位、大限四化）的十年基调，再分维度（事业/财运/感情/健康）给出这十年的机会与注意，最后给出进入下一大限前的准备方向。须含以下要点：当前大限干支与原局宫位、大限四化落宫、至少三个维度的倾向、下一大限前的准备方向。本板块正文不少于 500 字（上述要点须逐条展开成段、宁多勿少），低于下限为不合格' },
  { key: 'yearly', name: '流年与流月', requirement: '点评今年流年（流年命宫所坐原局宫位、流年四化落宫）的重点机遇与注意，再简述当年流月节奏与需要把握/回避的月份。须含以下要点：流年干支与所坐宫位、流年四化落宫、今年最值得把握与最需留意之处、流月节奏简述。流月只用"较宜/一般/宜慎"，不得使用吉凶判词。本板块正文不少于 450 字，低于下限为不合格' },
  { key: 'advice', name: '趋避建议', requirement: '综合全盘给出可执行的趋避建议，并以一句劝善修身、知命而为的结语为全文定调。须含以下要点：宜发挥的方向至少两条、宜回避的做法至少两条、修身养性的着力点、一句结语。建议须落在具体事上，不得写成"积极进取"之类的空泛行动指令。本板块正文不少于 400 字，低于下限为不合格' }
]

// ★ 逐板块调用（对齐 aiAnalysis.ts 的两轮实测教训）：
//   紫微此前是【单次调用写 6 板块】，实测各板块达成率仅 52-66%——模型在一次响应里
//   给每个板块的预算被摊薄，提高要求无效。拆为【每板块一次调用】（12 次并行）后，
//   「本板块不少于 X 字」才有稳定约束力；墙钟耗时≈单次调用（并行），prompt 开销 ×12
//   但单价极低。合并后仍走同一合规校验（withComplianceRetry），任一板块失败则整体失败重试。
export const SECTION_BATCHES: Array<Array<keyof ZiweiAIReport>> = SECTION_SPECS.map(s => [s.key])

/** 板块渲染顺序与标题（单一事实源）：渲染层（ZiweiResultView）按此表取键与标题，
 *  禁止在组件里另抄一份；老报告缺键时不渲染该块（不出现空标题）。 */
export const SECTION_ORDER: Array<{ key: keyof ZiweiAIReport; name: string }> =
  SECTION_SPECS.map(({ key, name }) => ({ key, name }))

const SYSTEM_PROMPT = `你是一位精通紫微斗数的资深命理师，熟读《紫微斗数全书》《紫微斗数全集》，星曜、四化、宫位断语功底扎实。

写作要求：
1. 命盘的星曜分布、庙旺落陷、四化落宫、格局标签、气势评分、大限流年干支与四化，全部为确定性算法结果，你只做解读，严禁修改、否认或与其矛盾。
2. 每个板块独立成段，语言典雅通俗，让普通人看得懂；紧扣此盘具体星曜组合，禁止放之四海皆准的套话。
3. 断语留余地，用"倾向""易""需注意"等表述，严禁绝对化断言，不吓唬用户。
   ${FORBIDDEN_WORDS_PROMPT}
4. 紫微论命以命宫三方四正、四化飞星为纲；不可把"空宫"简单说成命差，须说明借对宫星曜为用。
5. 输出必须是纯 JSON 对象，不要 markdown 代码块、不要任何额外文字。
6. "overview"（命格总论）板块必须以这句固定免责语收尾、原文照写：
   "以上为命理倾向性分析，仅供参考，非确定性结论，不构成任何决策依据。"

术语铁律（违反即为错误）：
A. "化忌"只指算法列出的化忌星落宫，不得自行给其他星加四化；六吉星（左右昌曲魁钺）、六凶星（羊陀火铃空劫）严格按算法结果引用。
B. 大限/流年四化只引用算法给出的星曜与落宫，不得编造。
C. 庙旺落陷引用算法标注，不得翻转。`

function buildUserPrompt(
  chart: ZwChart,
  analysis: ZiweiAnalysis,
  specs: Array<{ key: keyof ZiweiAIReport; name: string; requirement: string }> = SECTION_SPECS
): string {
  const a = analysis
  const patternLines = a.patterns
    .map((p) => {
      let line = `【${p.level}】${p.name}：${p.note}`
      if (p.required) line += `（成立要件：${p.required.join('、')}）`
      if (p.breaking) line += `（破格项：${p.breaking.join('、')}）`
      if (p.source) line += `（出处：${p.source}）`
      else if (p.basisLevel) line += `（依据：${p.basisLevel}）`
      return line
    })
    .join('\n')
  const transformLines = a.transforms
    .map((t) => `${t.star}化${t.type}于${t.palace}宫（${t.note}）`)
    .join('\n')

  // ★ 十二宫全量（2026-10-18）：此前只给 7 宫，AI 无从写「十二宫导读」；空宫仍注明借对宫
  const palaceBlock = ZIWEI_PALACE_NAMES.map((name) => {
    const pal = chart.palaces.find((p) => p.name === name)!
    const r = a.palaces[name]
    // 宫干支为命盘确定性信息，随宫给出，解读可引用
    return `${name}（${pal.ganZhi}）：${r.stars.join('、') || '空宫（借对宫' + chart.palaces[(pal.index + 6) % 12].name + '）'}` +
      `${r.auspicious.length ? '；吉星：' + r.auspicious.join('、') : ''}` +
      `${r.ominous.length ? '；煞星：' + r.ominous.join('、') : ''}` +
      `${r.tags.length ? '；标签：' + r.tags.join('、') : ''}`
  }).join('\n')

  const periodBlock = (p: typeof a.decadal) =>
    `${p.title}：${p.ganZhi}，命宫坐原局${p.basePalace}宫${p.range ? '（' + p.range + '）' : ''}；星曜：${p.stars.join('、')}` +
    `\n　四化（落原局宫位）：${p.transforms.join('；')}` +
    `\n　标签：${p.tags.join('、')}`

  const sections = specs.map((s, i) => `${i + 1}. "${s.key}"（${s.name}）：${s.requirement}`).join('\n')

  const bodyPalace = chart.palaces.find((p) => p.isBodyPalace)

  return `请为以下紫微命盘撰写深度解读。

【基本信息】
性别：${chart.input.gender === 1 ? '男' : '女'}
公历：${chart.input.year}年${chart.input.month}月${chart.input.day}日${chart.input.hour}时${chart.input.minute}分
农历：${chart.lunarDate}
五行局：${chart.fiveElementsClass}　命主：${chart.soul}　身主：${chart.body}${bodyPalace ? `　身宫：${bodyPalace.name}` : ''}
气势评分（不得更改）：${a.score}分，${a.scoreLabel}

【十二宫全量信息】
${palaceBlock}

【生年四化（不得更改）】
${transformLines}

【传统格局标签（不得更改，解读须与此一致）】
${patternLines}

【运限】
${periodBlock(a.decadal)}
${periodBlock(a.yearly)}
${a.monthly ? periodBlock(a.monthly) : ''}
小限：${a.xiaoxian.nominalAge}岁，宫位在原局${a.xiaoxian.basePalace}（${a.xiaoxian.ganZhi}）
${a.selfMutations && a.selfMutations.length
  ? '\n【宫干自化（iztro 原生，不得更改）】\n' + a.selfMutations.map((s) => `${s.palace}（${s.ganZhi}）自化${s.mutagens.join('、')}`).join('\n')
  : ''}
${a.laiYinPalace
  ? `\n【来因宫（iztro 原生，不得更改）】\n${a.laiYinPalace}`
  : ''}

请严格按以下结构输出 JSON（共 ${specs.length} 个键，值为该板块正文，可用 \\n\\n 分段）：
${sections}`
}

// 规则版兜底文案（12 键全覆盖）：AI 结果未过合规校验时由调用方使用
export function fallbackZiweiText(chart: ZwChart, a: ZiweiAnalysis): ZiweiAIReport {
  const p = a.palaces
  const palaceOf = (name: keyof typeof p) => chart.palaces.find((x) => x.name === name)!
  /** 主星描述；空宫借对宫 */
  const starsOf = (name: keyof typeof p) => {
    const r = p[name]
    if (r.stars.length) return r.stars.join('、')
    const pal = palaceOf(name)
    return `空宫，借对宫${chart.palaces[(pal.index + 6) % 12].name}星曜为用`
  }
  const jiShaOf = (name: keyof typeof p) =>
    `${p[name].auspicious.length ? '；吉星：' + p[name].auspicious.join('、') : ''}` +
    `${p[name].ominous.length ? '；煞星：' + p[name].ominous.join('、') : ''}`

  const trio = [(chart.mingIndex + 4) % 12, (chart.mingIndex + 8) % 12, (chart.mingIndex + 6) % 12]
    .map((i) => chart.palaces[i])
  const quartetNames = trio.map((x) => x.name).join('、')

  // 十二宫所主（导读开场，来自传统宫义，非盘面数据）
  const PALACE_ROLE: Record<string, string> = {
    命宫: '性格与人生主题', 兄弟: '手足与同业伙伴', 夫妻: '配偶与亲密关系', 子女: '子嗣与后辈',
    财帛: '求财方式与现金流', 疾厄: '体质与健康', 迁移: '外出发展与外界际遇', 仆役: '朋友与下属',
    官禄: '事业与工作', 田宅: '置业与家运', 福德: '福分与心性', 父母: '长辈与庇护'
  }

  return {
    overview:
      `此造命宫在${chart.palaces[chart.mingIndex].earthlyBranch}，主星${starsOf('命宫')}${jiShaOf('命宫')}。` +
      `五行局为${chart.fiveElementsClass}，命主${chart.soul}、身主${chart.body}。` +
      `命盘气势${a.score}分（${a.scoreLabel}），格局见：${a.patterns.map((x) => x.name).join('、') || '无明显传统格局标签，以命宫三方四正论' }。` +
      `三方四正见${quartetNames}，性格与际遇主要由这四宫星曜交织而成。` +
      `整体而言，宜顺星曜之性发挥所长、针对所忌之处修身经营，稳中求进。` +
      `以上为命理倾向性分析，仅供参考，非确定性结论，不构成任何决策依据。`,
    personality:
      `命宫主星${starsOf('命宫')}${jiShaOf('命宫')}；三方四正为${quartetNames}；福德宫${starsOf('福德')}${jiShaOf('福德')}。` +
      `性格底色大体由命宫与福德两宫星曜决定：命宫主为人处事的外显风格，福德主内在心性与情绪底色。` +
      `星曜得地者，其长处宜顺势发挥；逢煞忌者，心性上易有执着或急躁之处，宜以缓一步、多听取他人意见来化解。` +
      `天赋所在，多与命宫及官禄宫所主之事相应，宜在擅长处深耕积累。`,
    palaces:
      `十二宫为紫微论断之纲：` +
      ZIWEI_PALACE_NAMES.map((n) => `${n}主${PALACE_ROLE[n]}`).join('，') + '。\n' +
      ZIWEI_PALACE_NAMES.map((n) => {
        const pal = palaceOf(n)
        return `${n}（${pal.ganZhi}，主${PALACE_ROLE[n]}）：${starsOf(n)}${jiShaOf(n)}。`
      }).join('\n') +
      `\n十二宫联动而看：命宫为体，三方四正为用；某一宫逢煞忌，多主该宫所主之事需多费心力，宜以人事补足，不宜单看一宫便下断语。`,
    career:
      `官禄宫：${starsOf('官禄')}${jiShaOf('官禄')}。` +
      `事业选择当看官禄星曜所主，并结合命宫三方四正格局：命宫强而官禄有禄权者，宜在组织内承担重任；官禄逢文星昌曲者，宜以专业、文书、策划见长；官禄逢煞忌者，宜守成深耕、避免频繁跳槽。` +
      `工作风格大体由命宫星曜定调：主星刚健者宜开拓，主星柔和者宜协调。` +
      `发力时段可看当前大限四化：逢化禄化权化科之限宜顺势作为，逢化忌之限宜稳守本业、蓄力待时。`,
    wealth:
      `财帛宫：${starsOf('财帛')}${jiShaOf('财帛')}；田宅宫：${starsOf('田宅')}${jiShaOf('田宅')}。` +
      `${p.财帛.auspicious.length ? '财帛有' + p.财帛.auspicious.join('、') + '相助，求财有门径。' : ''}` +
      `${p.财帛.ominous.length ? '财帛逢' + p.财帛.ominous.join('、') + '，财源易有波动。' : ''}` +
      `财帛主现金流与求财方式，田宅主积累与不动产：二者俱佳者，宜以置产、长期持有聚财；财帛有波动之象者，宜量力而行、留足周转，重稳健配置，避免高风险投机。` +
      `求财方式大体看财帛星曜所主：逢正财之星宜以本职与专业积累，逢偏财之星宜以副业与人脉为辅，仍以不脱主业为稳。`,
    marriage:
      `夫妻宫：${starsOf('夫妻')}${jiShaOf('夫妻')}。` +
      `${p.夫妻.auspicious.length ? '吉星' + p.夫妻.auspicious.join('、') + '在夫妻宫，感情有良缘基础。' : ''}` +
      `${p.夫妻.ominous.length ? '夫妻宫逢' + p.夫妻.ominous.join('、') + '，相处需多包容。' : ''}` +
      `感情模式大体由夫妻宫星曜定调：星曜柔和者重情而多包容，星曜刚健者重义而主见强。配偶特征多与夫妻宫主星相应，如逢紫微天府者重面子与担当，逢天机太阴者心思细腻。` +
      `婚恋注意事项：一是逢化忌之年宜低调包容，重大决定可错开波折之期；二是相处重沟通，凡事先说明再行动，日久自见其稳。`,
    health:
      `疾厄宫：${starsOf('疾厄')}${jiShaOf('疾厄')}；福德宫：${starsOf('福德')}${jiShaOf('福德')}。` +
      `疾厄宫主体质与身体薄弱环节，福德宫主情绪与精神调养：疾厄逢煞者，宜在相应脏腑处定期检查、早作调理；福德逢忌者，情绪压力易积压，宜有规律的疏解渠道。` +
      `日常宜规律作息、适度运动，关注睡眠与压力；饮食有节、劳逸有度，有不适及时就医。` +
      `心病还需心药医，保持心境开阔、减少无谓计较，是最要紧的养生之道。`,
    transforms:
      `生年四化：${a.transforms.map((t) => `${t.star}化${t.type}于${t.palace}宫（${t.note}）`).join('；')}。` +
      `四化为命盘气机所注：化禄主机缘与丰足，落在何宫则何宫之事较易得利；化权主担当与掌控，落在何宫则何宫之事宜主动承担；化科主名声与助力，落在何宫则何宫之事较易得人提携；化忌主欠顺与执着，落在何宫则何宫之事需多费心力。` +
      `若禄忌同宫或相邻，则主该处得失相随，宜守中有为；若权科同宫，则主名实相副，宜稳中求进。四化只依算法所列，不得自行增减。`,
    patterns:
      `命盘所成格局：${a.patterns.length
        ? a.patterns.map((x) => `【${x.level}】${x.name}——${x.note}`).join('；')
        : '本盘未成算法所列的传统格局，宜以命宫三方四正星曜组合的性质论断。'}。` +
      `格局为传统断语的框架，成格与破格往往并存：成处宜顺势发挥，破处宜以人事补足。` +
      `格局标签只代表先天禀赋的倾向，后天努力与所处环境同样影响人生层次，不宜因一格之破而自限。`,
    decadal:
      `${a.decadal.title}：${a.decadal.ganZhi}，坐原局${a.decadal.basePalace}宫（${a.decadal.range}），星曜${a.decadal.stars.join('、')}；大限四化——${a.decadal.transforms.join('；')}。` +
      `这十年的基调，宜以${a.decadal.basePalace}宫所主之事为主线：事业上顺势积累，财运上重守成与稳健配置，感情上重沟通与共同经营，健康上重作息与情绪调养。` +
      `大限逢化禄化权化科者，宜在本业中做深做透；逢化忌者，宜守成深耕、避免大额扩张。下一大限到来前，宜把根基打稳、把身体与现金流调理妥当。`,
    yearly:
      `今年流年${a.yearly.ganZhi}，命宫坐原局${a.yearly.basePalace}宫（主${PALACE_ROLE[a.yearly.basePalace] || '当运之事'}），流年四化——${a.yearly.transforms.join('；')}。` +
      `${a.monthly ? `本月流月${a.monthly.ganZhi}，四化——${a.monthly.transforms.join('；')}。` : ''}` +
      `今年宜把握流年禄权科所落之宫的助力，回避流年化忌落宫之冲动：该出手时稳中有为，该收手时留有余地。` +
      `流月以节气换月，全年节奏可按"较宜/一般/宜慎"三段把握：流年吉曜所落之月较宜着手要事，化忌所落之月宜慎作重大决定。`,
    advice:
      `综合全盘，趋避建议如下：` +
      `宜发挥的方向——其一，顺命宫与官禄所主之长处深耕本业，不轻易改行；其二，借六吉星所落之宫经营人脉与名声，凡事留沟通余地。` +
      `宜回避的做法——其一，避高风险投机与杠杆，手边留足周转；其二，避在化忌之运与流年冲动下作重大决定，重要之事可缓一步。` +
      `修身的着力点，宜放在福德宫所主之处：作息规律、减少计较、养心调气，心境开阔则运随之而顺。` +
      `命理为倾向性参考，非确定性预言；知命而非认命，修身积善、稳中求进，方是长久之计。`
  }
}

interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: string } }>
  usage?: AIUsage
  error?: { message?: string }
}

// ★ 合规退回后的【带反馈重写】提示（2026-10-18 付费模块回退规则版事故）：
//   提示文本已收编到 ai-check.complianceRetryHint（单一事实源，方案③）：它把
//   【完整禁用表 + 替代白名单 + 整句示范】连同退回原因一并回灌 —— 原先只回灌命中的那个词，
//   模型会"修了这个又踩那个"（它并不知道还有哪些词被禁）。本模块只补结构提示（十二板块）。
//   采用「追加一条 user 消息」而非改写 buildUserPrompt：保证首次请求与既有形态逐字一致。
const ZIWEI_SHAPE = '完整 JSON（十二板块，字段见系统提示）'

export async function generateAIZiwei(chart: ZwChart, analysis: ZiweiAnalysis): Promise<(ZiweiAIReport & { _usage?: AIUsage }) | null> {
  if (!AI_API_KEY) {
    // ★ 回退必须可见（任务书 §四）：静默降级让「AI 没跑」这件事不可见
    console.warn('[aiZiwei] 未配置 AI_API_KEY，本次回退规则版文案')
    return null
  }

  const ZW_DISCLAIMER = '以上为命理倾向性分析，仅供参考，非确定性结论，不构成任何决策依据。'

  // 单批 API 调用（一批板块子集；当前每批一个板块），失败返回 null
  const callAI = async (
    specs: Array<{ key: keyof ZiweiAIReport; name: string; requirement: string }>,
    feedback?: string
  ): Promise<(Partial<ZiweiAIReport> & { _usage?: AIUsage }) | null> => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS)
    try {
      const messages: Array<{ role: string; content: string }> = [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildUserPrompt(chart, analysis, specs) }
      ]
      // 以追加一条 user 消息的方式回灌退回原因：不动 buildUserPrompt 的原始请求体，
      // 保证「首次请求」与既有形态逐字一致（便于与历史日志/断言对齐）
      if (feedback) messages.push({ role: 'user', content: complianceRetryHint(feedback, ZIWEI_SHAPE) })

      const res = await fetch(`${AI_BASE_URL}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${AI_API_KEY}`
        },
        body: JSON.stringify({
          model: AI_MODEL,
          messages,
          temperature: 0.8,
          response_format: { type: 'json_object' }
        }),
        signal: controller.signal
      })

      const data = (await res.json()) as ChatCompletionResponse
      if (!res.ok || data.error) {
        console.error('[aiZiwei] API 错误:', data.error?.message || res.status)
        return null
      }

      const content = data.choices?.[0]?.message?.content
      if (!content) return null

      const jsonText = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
      const parsed = JSON.parse(jsonText) as Record<string, unknown>

      // 校验本批键齐全且为字符串
      const result = {} as Record<string, string>
      for (const spec of specs) {
        const v = parsed[spec.key]
        if (typeof v !== 'string' || v.trim().length < 50) {
          console.error(`[aiZiwei] 板块 ${spec.key} 缺失或过短，放弃 AI 结果`)
          return null
        }
        result[spec.key] = v.trim()
      }
      return { ...result, _usage: data.usage } as Partial<ZiweiAIReport> & { _usage?: AIUsage }
    } catch (err) {
      console.error('[aiZiwei] AI 解读失败:', err instanceof Error ? err.message : err)
      return null
    } finally {
      clearTimeout(timer)
    }
  }

  // 一次完整尝试：按 SECTION_BATCHES 分批并行调用，合并为十二板块（任一批失败则整体失败）
  // feedback：合规退回时由 withComplianceRetry 传入；首次调用为 undefined
  const attempt = async (feedback?: string): Promise<(ZiweiAIReport & { _usage?: AIUsage }) | null> => {
    const batches = SECTION_BATCHES.map(keys =>
      keys.map(k => SECTION_SPECS.find(s => s.key === k)!)
    )
    const results = await Promise.all(batches.map(b => callAI(b, feedback)))
    if (results.some(r => r === null)) return null

    const merged = {} as Record<string, string>
    const usage: AIUsage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
    for (const r of results as Array<Partial<ZiweiAIReport> & { _usage?: AIUsage }>) {
      const { _usage, ...rest } = r
      Object.assign(merged, rest)
      if (_usage) {
        usage.prompt_tokens = (usage.prompt_tokens || 0) + (_usage.prompt_tokens || 0)
        usage.completion_tokens = (usage.completion_tokens || 0) + (_usage.completion_tokens || 0)
        usage.total_tokens = (usage.total_tokens || 0) + (_usage.total_tokens || 0)
      }
    }
    return { ...merged, _usage: usage } as unknown as ZiweiAIReport & { _usage?: AIUsage }
  }

  // 禁用词属红线（否定式除外）：首次检出给一次重试；仍不合规放弃 AI 结果，由调用方回退规则版
  // ★ 退回原因必须【具体到词与句子】（2026-10-18）：原先只回一句"检出禁用词"，
  //   线上日志无法判断是哪个词触发的（「必」是单字、"一定"是词，改法完全不同），
  //   也让重试拿不到可执行的改写依据。filter 掉 _usage 避免把对象混进待检文本。
  const out = await withComplianceRetry(
    attempt,
    (r) => {
      // 逐板块分别校验：命中时点名板块，日志可直接定位是哪一块写炸了
      const offenders: string[] = []
      for (const spec of SECTION_SPECS) {
        const v = r[spec.key]
        if (typeof v !== 'string') continue
        const hits = findForbidden(v).hits
        if (hits.length) offenders.push(`${spec.key}：${hits.map((h) => `${h.w}｜${h.s.slice(0, 30)}`).join('；')}`)
      }
      if (!offenders.length) return null
      return '检出禁用词：' + offenders.join(' / ')
    },
    'aiZiwei'
  )

  // 免责兜底（prompt 早已要求 overview 原文照写，此处仅防非确定性遗漏）：缺固定短语则追加
  if (out && !/非确定性|仅供参考|不构成/.test(out.overview)) {
    out.overview = out.overview.replace(/。?$/, '') + '。' + ZW_DISCLAIMER
  }
  return out
}
