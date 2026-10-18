// 报告「内容 ↔ 权益」读取侧重算（HANDOFF-报告缓存 原则① 的消费落地）
//
// ★ 为什么需要它（2026-10-18 真实事故）：reports 行里存过权益状态（locked / ai）——
//   生成时未解锁 → ai=null、locked 非空；用户付费后回「我的报告」，详情页【直接渲染】
//   这一行的 result，于是永远显示「未解锁」，付费等于没生效。
//   修法：入库只存【内容】（locked 剥掉、ai 存全量全文），渲染前按【当前权益】重算
//   locked / ai / aiSource —— 试吃→付费立即生效，不需要重新生成。
//
// 与 reportCache.ts 的分工：那边是【服务端】缓存读写（含 node:crypto，不可进客户端）；
//   本文件是纯函数 + 常量，客户端安全（详情页 'use client' 直接调用）。
import { grantsCover } from './entitlement'
import type { GrantId, SkuId } from './pricing'
import type { ReportKind } from './reportSave'

/**
 * 各报告模块的门禁口径（详情页重算用；模块页 route 的 locked 文案与此同源）。
 * · sku：未解锁时引导购买的 SKU（与模块页 locked.skus 一致）
 * · grant：判定「已持有」的能力（走 entitlement.grantsCover，含 bundle3 隐式覆盖）
 * · preview：未解锁时展示的引导文案（与模块页口径一致）
 * fatebook = null：命书正文在 charts.chart_data，不走本重算。
 */
export const REPORT_GATE: Record<
  ReportKind,
  { sku: SkuId; grant: GrantId; preview: string } | null
> = {
  hemun: {
    sku: 'hemun',
    grant: 'hemun',
    preview: '合婚双人九维深度解读（典籍干支、古法纳音、民俗生肖分级呈现）解锁后可见。',
  },
  ziwei: {
    sku: 'ziwei_deep',
    grant: 'ziwei_deep',
    preview: '紫微十二宫深度解读（命格总论、事业、财运、感情、健康、大限流年）解锁后可见。',
  },
  geo: {
    sku: 'geo',
    grant: 'geo',
    preview:
      '方位总论 · 现居城市影响 · 财富/事业/贵/安居/才华五城解读 · 迁居开运建议（AI 深度解读，共 8 节）解锁后可见。',
  },
  annual: {
    sku: 'annual_report',
    grant: 'annual_report',
    // 年运的模块页 preview 含「{目标年}（{干支}年）」前缀（需读内容；此处给通用口径）
    preview: '流年详批：事业/财运/感情/健康分维度深度解读解锁后可见。',
  },
  fatebook: null,
}

/** 年运未解锁文案：能读到内容里的目标流年时补上「{年}（{干支}年）」前缀（与模块页同口径） */
function annualPreviewOf(content: Record<string, unknown>): string {
  const targetYear =
    (content.targetYear as number | undefined) ??
    ((content.free as { targetYear?: number } | undefined)?.targetYear as number | undefined)
  const liuNian = content.liuNian
  const item = Array.isArray(liuNian)
    ? (liuNian as Array<{ year?: number; ganZhi?: string }>).find((y) => y.year === targetYear)
    : undefined
  const base = '流年详批：事业/财运/感情/健康分维度深度解读解锁后可见。'
  return targetYear ? `${targetYear}年（${item?.ganZhi ?? ''}年）${base}` : base
}

/** 未解锁引导文案（纯函数，可断言） */
export function lockedPreviewOf(kind: ReportKind, content: Record<string, unknown>): string {
  const gate = REPORT_GATE[kind]
  if (!gate) return ''
  return kind === 'annual' ? annualPreviewOf(content) : gate.preview
}

/**
 * 纯函数：按【当前权益】重算详情页渲染数据。
 * · 已持有 → locked=null，ai/aiSource 取内容里的（内容存的就是全量）
 * · 未持有 → ai=null、locked 给 preview（★ 即使内容里带了全文也不外泄）
 * ★ 牙口注入点：把 owned 恒置 true → 未持有用户也看到全文（安全方向翻红）。
 */
export function gateReportForDetail(
  kind: ReportKind,
  content: Record<string, unknown>,
  ent: { memberSkus: SkuId[]; ownedSkus: SkuId[] | Set<SkuId> }
): Record<string, unknown> {
  const gate = REPORT_GATE[kind]
  if (!gate) return content
  const owned = grantsCover(ent, gate.grant)
  return {
    ...content,
    locked: owned ? null : { skus: [gate.sku], preview: lockedPreviewOf(kind, content) },
    ai: owned ? (content.ai ?? null) : null,
    aiSource: owned ? (content.aiSource ?? null) : '未解锁',
  }
}
