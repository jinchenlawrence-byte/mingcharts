// 重新生成的单一判据（2026-11-09）
//
// 用户拍板的规矩：
//   · 付费报告如果本次只出了规则版（AI 未通过 / 额度降级），可以【无限次】重新生成，
//     直到拿到完整 AI 报告，不设次数上限；
//   · 免费报告一律不出现重新生成；
//   · 前端隐藏按钮只是 UX，接口层必须同样校验（本文件即接口层判据）。
//
// 「规则版」沿用 reportGate.GENUINE_AI_SOURCE 的既有口径，不新造判定。
import { NextResponse } from 'next/server'

export const REGEN_REQUIRES_PAID = 'REGEN_REQUIRES_PAID'

const MESSAGE = {
  'zh-Hans': '重新生成只对已购买的规则版报告开放',
  'zh-Hant': '重新生成只對已購買的規則版報告開放',
  en: 'Regeneration is only available for a purchased report that fell back to rule-based text.',
} as const

/** 请求是否声明为「重新生成」（兼容 force 旧参数） */
export function isRegenRequest(body: unknown): boolean {
  if (!body || typeof body !== 'object') return false
  const b = body as Record<string, unknown>
  const truthy = (v: unknown) => v === true || v === 'true' || v === '1' || v === 1
  return truthy(b.regen) || truthy(b.force)
}

/**
 * 接口层重新生成门槛：未持有该报告权益 → 402。
 * 已付费的规则版不设次数上限（调用方不再做计数），是否已出完整 AI 由缓存短路自然处理。
 */
export function regenGate(
  regen: boolean,
  unlocked: boolean,
  locale: string
): NextResponse | null {
  if (!regen || unlocked) return null
  const msg = locale === 'en'
    ? MESSAGE.en
    : locale === 'zh-Hant'
      ? MESSAGE['zh-Hant']
      : MESSAGE['zh-Hans']
  return NextResponse.json(
    { error: msg, code: REGEN_REQUIRES_PAID },
    { status: 402 }
  )
}
