// 英文命書試讀（規則版，零 AI）
//
// 為什麼另寫：中文試讀由 lib/analysis.ts 的十個 builder 產生，全部是中文長文；
// 直接把中文丟給英文頁面會出現整段中文。這裡按同一組結構化事實（四柱、十神、五行、旺衰、格局）
// 生成英文兩卷，資訊點與中文試讀一致（不是逐句翻譯，也不刪條目）。
// ★ 只在 locale=en 時使用；簡/繁路徑完全不變。
// ★ 英文正文不得出現任何中日韓文字：干支一律用拼音（見 lib/enTerms.ts）。

import { branchEn, ganZhiEn, stemEn } from './enTerms'

const STEM_WX: Record<string, string> = {
  甲: 'Wood', 乙: 'Wood', 丙: 'Fire', 丁: 'Fire', 戊: 'Earth',
  己: 'Earth', 庚: 'Metal', 辛: 'Metal', 壬: 'Water', 癸: 'Water',
}
const BRANCH_WX: Record<string, string> = {
  子: 'Water', 丑: 'Earth', 寅: 'Wood', 卯: 'Wood', 辰: 'Earth', 巳: 'Fire',
  午: 'Fire', 未: 'Earth', 申: 'Metal', 酉: 'Metal', 戌: 'Earth', 亥: 'Water',
}
const TEN_GOD: Record<string, string> = {
  比肩: 'Companion', 劫财: 'Rob Wealth', 食神: 'Eating God', 伤官: 'Hurting Officer',
  偏财: 'Indirect Wealth', 正财: 'Direct Wealth', 七杀: 'Seven Killing',
  正官: 'Direct Officer', 偏印: 'Indirect Resource', 正印: 'Direct Resource',
  日主: 'Day Master',
}
const DAY_MASTER_TRAIT: Record<string, string> = {
  甲: 'upright and growth-oriented, like a tall tree: principled, responsible and slow to bend.',
  乙: 'flexible and adaptive, like a vine: resilient, diplomatic and good at finding a way around obstacles.',
  丙: 'radiant and expressive, like the sun: warm, direct and happiest when visible and useful.',
  丁: 'focused and sensitive, like a candle: attentive, intuitive and capable of sustained quiet intensity.',
  戊: 'steady and dependable, like a mountain: patient, loyal and strong under pressure.',
  己: 'nurturing and practical, like cultivated soil: accommodating, detail-minded and good at sustaining others.',
  庚: 'decisive and structural, like raw metal: direct, courageous and impatient with ambiguity.',
  辛: 'refined and exacting, like jewellery: discerning, quality-driven and sensitive to nuance.',
  壬: 'fluid and far-reaching, like a great river: strategic, adaptable and drawn to movement and scale.',
  癸: 'subtle and perceptive, like rain: thoughtful, intuitive and quietly persistent.',
}
const GOD_TRAIT: Record<string, string> = {
  比肩: 'self-reliance and peer loyalty',
  劫财: 'competitiveness and bold risk-taking',
  食神: 'appetite for life, creativity and ease',
  伤官: 'sharp expression and a willingness to challenge rules',
  偏财: 'opportunistic wealth sense and social reach',
  正财: 'steady, practical accumulation',
  七杀: 'pressure-driven decisiveness and crisis stamina',
  正官: 'discipline, responsibility and reputation',
  偏印: 'unconventional insight and specialist depth',
  正印: 'learning, support and a conservative base',
}
const ELEMENT_TRAIT: Record<string, string> = {
  Wood: 'benevolent, growth-minded and sometimes over-extended',
  Fire: 'expressive, warm and sometimes impulsive',
  Earth: 'steady, trustworthy and sometimes slow to change',
  Metal: 'decisive, principled and sometimes rigid',
  Water: 'perceptive, adaptable and sometimes scattered',
}

type Pillar = { ganZhi: string; tenGodGan?: string; cangGan?: string[]; tenGodCangGan?: string[] }
export interface EnPreviewInput {
  dayMaster: string
  pillars: { year: Pillar; month: Pillar; day: Pillar; hour: Pillar }
  analysis: { wangShuai: string; geJu: string }
  daYun?: Array<{ ganZhi: string; startAge: number; startYear: number; endYear: number }>
}

export function strengthEn(s: string): string {
  if (/旺|强/.test(s) && !/弱/.test(s)) return 'a strong Day Master'
  if (/弱/.test(s) && /有救/.test(s)) return 'a weak Day Master with support'
  if (/弱/.test(s)) return 'a weak Day Master'
  if (/中和|平衡/.test(s)) return 'a balanced Day Master'
  return 'a Day Master of moderate strength'
}

export function structureEn(g: string): string {
  const m = g.match(/^(.+)格$/)
  if (!m) return 'an unclassified structure'
  const god = TEN_GOD[m[1]]
  return god ? `the ${god} structure` : 'a named classical structure'
}

/** 起运：中文「X年Y月Z天后起运」→ 英文 */
export function qiYunEn(s: string): string {
  const m = s.match(/(\d+)年(\d+)月(\d+)天/)
  if (!m) return 'the start of the Luck Pillars is calculated from the birth date'
  return `starts ${m[1]} years ${m[2]} months ${m[3]} days after birth`
}

function gz(gz: string): string {
  if (!gz || gz.length < 2) return ''
  const stem = gz[0]
  const branch = gz[1]
  const pinyin = ganZhiEn(gz)
  if (!pinyin) return ''
  return `${pinyin} (${STEM_WX[stem] ?? '?'} over ${BRANCH_WX[branch] ?? '?'})`
}

export function buildEnFatebookPreview(chart: EnPreviewInput): { free: string[]; rest: string[]; fullMinChars: number } {
  const elements = ['Wood', 'Fire', 'Earth', 'Metal', 'Water']
  const counts: Record<string, number> = { Wood: 0, Fire: 0, Earth: 0, Metal: 0, Water: 0 }
  for (const p of Object.values(chart.pillars)) {
    const s = STEM_WX[p.ganZhi?.[0]]
    const b = BRANCH_WX[p.ganZhi?.[1]]
    if (s) counts[s]++
    if (b) counts[b]++
  }
  const sorted = elements.slice().sort((a, b) => counts[b] - counts[a])
  const missing = elements.filter((e) => counts[e] === 0)
  const gods = Object.values(chart.pillars)
    .flatMap((p) => [p.tenGodGan, ...(p.tenGodCangGan ?? [])])
    .filter((g): g is string => !!g && g !== '日主')
  const uniqueGods = [...new Set(gods)].map((g) => TEN_GOD[g] ?? '').filter(Boolean)
  const strength = strengthEn(chart.analysis.wangShuai)
  const structure = structureEn(chart.analysis.geJu)
  const dm = stemEn(chart.dayMaster) || 'Day Master'
  const monthBranch = branchEn(chart.pillars.month.ganZhi?.[1] ?? '') || 'birth'

  const volume1 = [
    `Day Master ${dm} (${STEM_WX[chart.dayMaster] ?? '?'}): born in the ${monthBranch} month, the chart shows ${strength} and ${structure}.`,
    `Four Pillars: year ${gz(chart.pillars.year.ganZhi)}, month ${gz(chart.pillars.month.ganZhi)}, day ${gz(chart.pillars.day.ganZhi)}, hour ${gz(chart.pillars.hour.ganZhi)}.`,
    `Five Elements: ${sorted[0]} is strongest (${counts[sorted[0]]} of eight characters), ${sorted[4]} is weakest (${counts[sorted[4]]}); ${missing.length ? `missing ${missing.join(', ')}` : 'all five elements are present'}.`,
    `Ten Gods present: ${uniqueGods.slice(0, 6).join(', ') || 'none beyond the Day Master'}. These set the working vocabulary of the chart: what supports the Day Master, what drains it, and what it is asked to manage.`,
    `Read as a whole, the chart is ${strength.replace('a ', '')}: ${/strong/.test(strength) ? 'capacity is sufficient, and the chart can carry responsibility and pursue ambitious goals' : /weak/.test(strength) ? 'capacity is limited or partly supported, so leverage, timing and alliance matter more than solo effort' : 'capacity is balanced, and steady execution serves better than sudden expansion'}.`,
  ].join('\n\n')

  const dominant = sorted[0]
  const godTraits = uniqueGods.slice(0, 3).map((g) => {
    const key = Object.keys(TEN_GOD).find((k) => TEN_GOD[k] === g)
    return key ? GOD_TRAIT[key] : ''
  }).filter(Boolean)
  const volume2 = [
    `Temperament of ${dm} ${STEM_WX[chart.dayMaster] ?? ''}: ${DAY_MASTER_TRAIT[chart.dayMaster] ?? 'steady, practical and self-directed.'}`,
    godTraits.length
      ? `With ${uniqueGods.slice(0, 3).join(', ')} prominent, the character also shows ${godTraits.join('; ')}.`
      : 'No single Ten God dominates, so the temperament follows the Day Master and the balance of elements more than any one role.',
    `${dominant} is the strongest element, adding a ${ELEMENT_TRAIT[dominant] ?? 'distinct'} flavour. This is a natural endowment: work with it rather than against it.`,
    `The Di Tian Sui says temperament is rooted in the heart and expressed outward. The above describes innate tendencies; training and circumstance can soften the excess and complete the useful side.`,
  ].join('\n\n')

  const rest = [
    'Useful God: identifies the element that resolves the chart and the favorable / unfavorable elements.',
    'Structure: reads whether the structure holds, which supporting god is present, and how exposed the unfavorable god is.',
    'Seasonal adjustment: reads cold, heat, dryness and dampness, and the remedy for the season.',
    'Luck Pillars: assesses each decade, with the current Luck Pillar and the next three Annual Pillars in detail.',
    'Career and wealth: reads the wealth and officer configuration, industry direction and wealth level.',
    'Marriage: reads the spouse star and spouse palace, attachment pattern and partner traits.',
    'Children and kin: reads the children star and palace, and relationships with parents and siblings.',
    'Health: reads the organs associated with strong or weak elements, and lifestyle guidance.',
  ]

  return { free: [volume1, volume2], rest, fullMinChars: 10000 }
}
