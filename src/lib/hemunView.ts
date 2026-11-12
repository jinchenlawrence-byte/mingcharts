// 合婚结果的渲染分层（模块页与 /reports/[id] 共用，2026-11-12）
//
// ★ 为什么不能只看 mode：老报告/老缓存可能没有 mode 字段，于是三柱报告会落进
//   四柱的付费墙分支——五个 skipped_missing_hour 维度被当成「解锁后可看」。
//   这里改为先看数据本身（分数/总观感/等级均为空即三柱），门禁再看维度状态。
import type { HemunDimension, HemunResult } from './hemun'

/** 三柱报告：分数环、等级、付费墙都不该出现 */
export function isThreePillarReport(
  r: Pick<HemunResult, 'mode' | 'totalScore' | 'overall' | 'grade'>
): boolean {
  return r.mode === 'three-pillar'
    || (r.totalScore == null && r.overall == null && r.grade == null)
}

export interface HemunDimPlan {
  free: HemunDimension[]
  locked: HemunDimension[]
  skipped: HemunDimension[]
}

/**
 * 门禁先看维度状态：skipped_missing_hour 永远不进 free/locked——
 * 它们不是「付钱就能看」，而是「缺时辰，未计算」，必须单独展示。
 */
export function planHemunDims(
  dimensions: HemunDimension[],
  previewMode: boolean,
  freeKeys: string[]
): HemunDimPlan {
  const free: HemunDimension[] = []
  const locked: HemunDimension[] = []
  const skipped: HemunDimension[] = []
  for (const d of dimensions) {
    if (d.status === 'skipped_missing_hour') {
      skipped.push(d)
      continue
    }
    if (!previewMode || freeKeys.includes(d.key)) free.push(d)
    else locked.push(d)
  }
  return { free, locked, skipped }
}
