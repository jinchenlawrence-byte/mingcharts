// 命盘事实提取（单一事实源；档 A 2026-10-18 抽共享，行为不变）
// 消费方：api/daily（个性化日运）、api/member/summary（历史日运等）。
// 从 charts.chart_data（即 /api/paipan 的返回体）取个性化内容所需的最小事实集。
import type { DailyChartFacts } from './daily'
import type { Zhi } from './branchRelations'

export function chartFactsFrom(chartData: any): DailyChartFacts | null {
  const dm = chartData?.dayMaster
  const pillars = chartData?.pillars
  if (!dm || !pillars?.day?.zhi) return null
  const zhis: Zhi[] = [
    pillars.year?.zhi, pillars.month?.zhi, pillars.day?.zhi, pillars.hour?.zhi,
  ].filter((z): z is Zhi => typeof z === 'string' && z.length === 1) as Zhi[]
  if (zhis.length !== 4) return null
  return { dayMaster: dm, dayZhi: pillars.day.zhi as Zhi, allZhi: zhis }
}
