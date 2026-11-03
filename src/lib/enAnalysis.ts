// 英文规则版命书（零 AI 兜底）
//
// 为什么需要：AI 未配置 / 超时 / 连续不合规时，/api/unlock 会回退规则引擎。
// 中文规则版正文是中文长文，英文用户拿到就是整篇中文 —— 这里按同一组结构化事实
// 生成英文十卷，保证英文报告「正文零 CJK」在 AI 失败时也成立。
//
// ★ 只用于 locale=en；简体/繁体仍走 lib/analysis.ts 的 generateAnalysis。

import type { AnalyzableChart, PaidAnalysis } from './analysis'
import { buildLuckCycles, tiaoHouWuxing } from './analysis'
import { buildEnFatebookPreview, strengthEn, structureEn } from './enPreview'
import { branchEn, elementEn, ganZhiEn, stemEn, tenGodEn, tierEn } from './enTerms'
import { EN_REPORT_DISCLAIMER } from './ai-check'

const ELEMENT_ORDER = ['Wood', 'Fire', 'Earth', 'Metal', 'Water'] as const

function elementCounts(chart: AnalyzableChart): Record<string, number> {
  const counts: Record<string, number> = { Wood: 0, Fire: 0, Earth: 0, Metal: 0, Water: 0 }
  const stemWx: Record<string, string> = {
    甲: 'Wood', 乙: 'Wood', 丙: 'Fire', 丁: 'Fire', 戊: 'Earth',
    己: 'Earth', 庚: 'Metal', 辛: 'Metal', 壬: 'Water', 癸: 'Water',
  }
  const branchWx: Record<string, string> = {
    子: 'Water', 丑: 'Earth', 寅: 'Wood', 卯: 'Wood', 辰: 'Earth', 巳: 'Fire',
    午: 'Fire', 未: 'Earth', 申: 'Metal', 酉: 'Metal', 戌: 'Earth', 亥: 'Water',
  }
  for (const p of Object.values(chart.pillars)) {
    const s = stemWx[p.gan]
    const b = branchWx[p.zhi]
    if (s) counts[s]++
    if (b) counts[b]++
  }
  return counts
}

function tenGodsOf(chart: AnalyzableChart): string[] {
  const raw = Object.values(chart.pillars)
    .flatMap((p) => [p.tenGodGan, ...(p.tenGodCangGan ?? [])])
    .filter((g): g is string => !!g && g !== '日主')
  return [...new Set(raw)].map((g) => tenGodEn(g)).filter(Boolean)
}

function currentLuckLine(chart: AnalyzableChart): string {
  const luck = buildLuckCycles(chart, new Date())
  const cur = luck.daYun.find((d) => d.current)
  if (!cur) return 'The chart is still before the first Luck Pillar; read the Annual Pillars as the main timing layer.'
  const gz = ganZhiEn(cur.ganZhi) || 'the current Luck Pillar'
  return `The current Luck Pillar is ${gz} (${cur.startYear}-${cur.endYear}): the stem relates to the Day Master as ${tenGodEn(cur.shiShenGan) || 'an unnamed role'} and the branch as ${tenGodEn(cur.shiShenZhi) || 'an unnamed role'}. Its period tone is ${tierEn(cur.tag) || 'neutral'}.`
}

function annualLine(chart: AnalyzableChart): string {
  const luck = buildLuckCycles(chart, new Date())
  const y = new Date().getFullYear()
  const rows = luck.liuNian
    .filter((n) => n.year >= y && n.year <= y + 2)
    .map((n) => `${n.year} (${ganZhiEn(n.ganZhi) || 'unknown'}, ${tenGodEn(n.shiShenGan) || 'unnamed role'}, ${tierEn(n.tag) || 'neutral'})`)
  return rows.length
    ? `The next three Annual Pillars read: ${rows.join('; ')}.`
    : 'Annual Pillar data is not available for this chart snapshot.'
}

/** 规则版英文十卷（不含 luckCycles 的本地化；结构化岁运仍由调用方追加） */
export function buildEnPaidAnalysis(chart: AnalyzableChart): PaidAnalysis {
  const preview = buildEnFatebookPreview(chart)
  const counts = elementCounts(chart)
  const sorted = [...ELEMENT_ORDER].sort((a, b) => counts[b] - counts[a])
  const strongest = sorted[0]
  const weakest = sorted[sorted.length - 1]
  const strength = strengthEn(chart.analysis.wangShuai)
  const structure = structureEn(chart.analysis.geJu)
  const gods = tenGodsOf(chart)
  const dm = stemEn(chart.dayMaster) || 'the Day Master'
  const month = branchEn(chart.pillars.month.zhi) || 'the birth month'
  const tiaoElements = tiaoHouWuxing(chart.dayMaster, chart.pillars.month.zhi).map(elementEn).filter(Boolean)
  const gender = chart.input.gender === 1 ? 'male' : 'female'

  const spouseGod = gender === 'male' ? 'Wealth' : 'Officer'
  const childrenGod = gender === 'male' ? 'Officer' : 'Output'
  const spouseStarText = gods.some((g) => g.includes(spouseGod))
    ? `The ${spouseGod} star is present in the chart, so the spouse star is part of the chart's working vocabulary.`
    : `The ${spouseGod} star is not prominent among the chart's Ten Gods; partnership themes tend to be read from the spouse palace and the overall balance rather than from a single star.`
  const childrenStarText = gods.some((g) => g.includes(childrenGod))
    ? `The ${childrenGod} star is present, which gives the children and younger-generation theme a concrete anchor in the chart.`
    : `The ${childrenGod} star is not prominent; read the hour pillar and the chart's balance for the children theme rather than forcing a single star reading.`

  return {
    overview:
      `${preview.free[0]}\n\n${preview.free[1]}\n\n${EN_REPORT_DISCLAIMER}`,
    personality:
      `${preview.free[1]}\n\nThe chart's dominant element is ${strongest} (${counts[strongest]} of eight characters), while ${weakest} is the least represented (${counts[weakest]}). This balance shapes how the temperament expresses itself in daily life.`,
    yongShen:
      `The chart is read as ${strength} with ${structure}. ` +
      (tiaoElements.length
        ? `The seasonal adjustment table points to ${tiaoElements.join(' and ')} as the elements that can restore balance in the ${month} month. `
        : `No seasonal adjustment element is tabulated for this Day Master in the ${month} month, so balance is read from the overall element count. `) +
      `${strongest} is the strongest element and ${weakest} the weakest. Practical support therefore tends to come from activities, environments and industries that add the weaker side rather than repeat the already-dominant one.`,
    geJuAnalysis:
      `The chart is classified as ${structure}. Structure quality depends on whether the structure god is supported by a companion god and whether an unfavourable element breaks it. ` +
      `In this chart, the strongest element is ${strongest}, so the structure is read with that element's tone in the foreground. ` +
      `A structure is a working model, not a fixed destiny: it describes how the chart prefers to organise its resources.`,
    tiaoHou:
      `The Day Master is ${dm}, born in the ${month} month. ` +
      (tiaoElements.length
        ? `The seasonal remedy is associated with ${tiaoElements.join(' and ')}. If those elements are present, the chart has a seasonal remedy; if they are weak or absent, lifestyle and environment can partially compensate.`
        : `No seasonal remedy is tabulated for this combination; read the temperature of the chart from the element counts (${ELEMENT_ORDER.map((e) => `${e} ${counts[e]}`).join(', ')}).`),
    daYunAnalysis:
      `${currentLuckLine(chart)} ${annualLine(chart)} ` +
      `Read the Luck Pillar as the decade's background and the Annual Pillar as the year's foreground. A favourable element being present does not by itself mean it is effective: support, clashes and the chart's structure all decide how much of it lands.`,
    career:
      `Career direction is read from the Ten Gods present (${gods.slice(0, 6).join(', ') || 'the Day Master alone'}) and from the balance of elements. ` +
      `${strongest} is the strongest element, so industries and roles that express ${strongest} tend to feel natural. ` +
      `The weaker side (${weakest}) is the area where training, partners or environment can add the most leverage.`,
    marriage:
      `${spouseStarText} The spouse palace is the day branch (${branchEn(chart.pillars.day.zhi) || 'the day branch'}). ` +
      `Relationship patterns tend to follow the way the Day Master relates to that branch and to the spouse star. ` +
      `Read friction as a signal for communication and pacing rather than as a fixed verdict.`,
    children:
      `${childrenStarText} The hour pillar (${ganZhiEn(chart.pillars.hour.ganZhi) || 'the hour pillar'}) is the palace of children and later life. ` +
      `Family relationships are read as tendencies shaped by the chart's balance, not as fixed outcomes.`,
    health:
      `The strongest element is ${strongest} and the weakest is ${weakest}. In the Five Element view, ${strongest} tends to be the area of excess and ${weakest} the area that asks for support. ` +
      `Use this as a lifestyle prompt: rest, food, exercise and emotional regulation matter more than any single prediction. This is not a medical diagnosis.`,
    luckCycles: buildLuckCycles(chart, new Date()),
  }
}
