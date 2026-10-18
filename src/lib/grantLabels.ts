// 权益 → 中文标签（纯展示映射；单一事实源，档 A 2026-10-18 自 pricing 页抽出）
// 消费方：app/pricing/page.tsx、app/member/page.tsx。
// ★ 仅作展示：权益事实只认 pricing.ts 的 SUBSCRIPTION_GRANTS / REPORT_GRANTS，本表不得被当作判据。
import type { GrantId } from './pricing'

export const GRANT_LABELS: Record<GrantId, string> = {
  fatebook: '万字命书详批（十大板块）',
  annual_report: '年运报告（流年详批）',
  hemun: '合婚详批（双人九维）',
  ziwei_deep: '紫微深度（十二宫星盘）',
  geo: '地理 · 财富之城',
  daily: '个性化日运（每日）',
  liuyue: '流月提示（每月）',
  jiaoyun: '交运提醒（大运切换节点）',
  multi_chart: '多命盘管理（3–5 个）',
  similar_cases: '相似古籍命例对照',
  history: '历史日运回看',
  ask: '追问 15 次（V2）',
}
