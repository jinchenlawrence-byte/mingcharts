// 古籍命例相似检索：规则引擎出事实，AI 只引用
import type { PaipanResult } from './paipan'
import casesData from '../data/mingli-cases.json'

export interface SimilarCase {
  id: string | null
  pillars: { year: string; month: string; day: string; hour: string }
  dayMaster: string
  person: string | null
  text: string // 代表断语（最优一条），最长 ~200 字
  source: string // 代表来源
  readings?: { text: string; source: string; person: string | null }[] // 多流派全部断语
  score: number // 相似度总分（>=20 才保留）
  matches: string[] // 相似点标签，如「同日柱乙巳」「同月令酉金」
  exact: boolean // 四柱全同
}

interface CaseRecord {
  id: string | null
  year: string
  month: string
  day: string
  hour: string
  dayMaster: string
  person: string | null
  text: string
  source: string
  readings?: { text: string; source: string; person: string | null }[]
}

const CASES = casesData as unknown as CaseRecord[]

// 单柱同 → 计分；干支全同分值更高，仅支同则降权
function pillarScore(caseV: string, chartV: string, full: number, half: number): { delta: number; label: string } {
  if (caseV === chartV) return { delta: full, label: `同${chartV}` }
  if (caseV[1] === chartV[1]) return { delta: half, label: `同${chartV[1]}支` }
  return { delta: 0, label: '' }
}

export function searchSimilarCases(chart: PaipanResult, limit = 6): SimilarCase[] {
  const cp = chart.pillars
  const chartYear = cp.year.ganZhi
  const chartMonth = cp.month.ganZhi
  const chartDay = cp.day.ganZhi
  const chartHour = cp.hour.ganZhi
  const chartDayMaster = chart.dayMaster

  const scored: SimilarCase[] = []

  for (const c of CASES) {
    let score = 0
    const matches: string[] = []
    const pillars = { year: c.year, month: c.month, day: c.day, hour: c.hour }
    const exact = c.year === chartYear && c.month === chartMonth && c.day === chartDay && c.hour === chartHour

    if (exact) {
      // 四柱全同：直接 100 分，唯一相似点
      score = 100
      matches.push('四柱全同')
    } else {
      // 日柱（含日主、日支夫妻宫）
      const dayHit = pillarScore(c.day, chartDay, 30, 8)
      score += dayHit.delta
      if (dayHit.delta === 30) matches.push(`同日柱${chartDay}`)
      else if (dayHit.delta === 8) matches.push(`同夫妻宫${chartDay[1]}`)

      // 日主
      if (c.dayMaster === chartDayMaster) {
        score += 6
        matches.push(`同日主${chartDayMaster}`)
      }

      // 月柱（月令格局）
      const monthHit = pillarScore(c.month, chartMonth, 20, 12)
      score += monthHit.delta
      if (monthHit.delta === 20) matches.push(`同月柱${chartMonth}`)
      else if (monthHit.delta === 12) matches.push(`同月令${chartMonth[1]}`)

      // 年柱（生肖纳音）
      const yearHit = pillarScore(c.year, chartYear, 15, 4)
      score += yearHit.delta
      if (yearHit.delta === 15) matches.push(`同年柱${chartYear}`)
      else if (yearHit.delta === 4) matches.push(`同生肖${chartYear[1]}`)

      // 时柱
      const hourHit = pillarScore(c.hour, chartHour, 10, 3)
      score += hourHit.delta
      if (hourHit.delta === 10) matches.push(`同时柱${chartHour}`)
      else if (hourHit.delta === 3) matches.push(`同时支${chartHour[1]}`)

      // 格局参考：日主+月支均同，视为同格局基调
      if (c.dayMaster === chartDayMaster && c.month[1] === chartMonth[1]) {
        score += 8
        matches.push(`同格局基调`)
      }
    }

    if (score >= 20) {
      scored.push({
        id: c.id,
        pillars,
        dayMaster: c.dayMaster,
        person: c.person,
        text: c.text.length > 220 ? c.text.slice(0, 220) + '…' : c.text,
        source: c.source,
        readings: c.readings,
        score,
        matches,
        exact
      })
    }
  }

  // 分数降序 → 具名优先 → 断语更长者优先
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    const an = a.person ? 1 : 0
    const bn = b.person ? 1 : 0
    if (bn !== an) return bn - an
    return b.text.length - a.text.length
  })

  return scored.slice(0, limit)
}
