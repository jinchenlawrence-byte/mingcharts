// 每日日签的五行配色（2026-11-09 新增）
//
// ★ 五行归属不另造表：天干→五行直接复用 analysis.ts 的 GAN_WUXING（排盘同一套规则）。
// ★ 配色只作用于日签卡片内层：浅 tint 背景（约 9%）＋ 左/顶色带 ＋ 五行标签。
//   页面底色始终由 --hw-bg 决定，本文件不提供任何页面级背景。
// ★ 文字深浅由背景实际亮度自动决定（inkOn），浅 tint 用深字、暗色主题用浅字。
import { GAN_WUXING } from './analysis'
import { ELEMENT_PALETTE as TOKEN_PALETTE, DAILY_INK } from './visual-tokens'
import type { SiteLang } from './lang'

export type FiveElement = 'wood' | 'fire' | 'earth' | 'metal' | 'water'

/** 中文五行字 → 色令牌键（与 globals.css 的 --hw-wood/fire/earth/metal/water 一一对应） */
const WUXING_KEY: Record<string, FiveElement> = {
  木: 'wood',
  火: 'fire',
  土: 'earth',
  金: 'metal',
  水: 'water',
}

/** 当日日柱天干 → 五行色键；非法天干显式抛错（不静默兜底） */
export function dayElement(gan: string): FiveElement {
  const wx = GAN_WUXING[gan]
  if (!wx) throw new Error(`非法天干：${gan}`)
  const key = WUXING_KEY[wx]
  if (!key) throw new Error(`未知五行：${wx}`)
  return key
}

/**
 * 卡片内层色板（具体色值集中收在 visual-tokens.ts，本文件只做语义出口）。
 * bar  —— 与 :root 的 --hw-<el> 相同，仅作色带（装饰，不承载文字）；
 * tint —— 元素色 9% 叠在白底上（浅色主题）；
 * tintDark —— 元素色 14% 叠在深色主题页面上，两套都由 check-contrast 校验。
 */
export const ELEMENT_PALETTE: Record<
  FiveElement,
  { bar: string; tint: string; tintDark: string }
> = TOKEN_PALETTE

/** 相对亮度（WCAG） */
export function relativeLuminance(hex: string): number {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const rgb = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255)
  const lin = rgb.map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2]
}

/**
 * 按背景实际亮度选字色：亮底用站内深墨，暗底用白。
 * 两套主题下都取同一个判据，避免「深色主题白字压在白卡上」这类反色。
 */
export function inkOn(bgHex: string): string {
  return relativeLuminance(bgHex) > 0.5 ? DAILY_INK.dark : DAILY_INK.light
}

/** 五行标签文案（三语） */
export function elementLabel(el: FiveElement, lang: SiteLang): string {
  if (lang === 'en') {
    return { wood: 'Wood', fire: 'Fire', earth: 'Earth', metal: 'Metal', water: 'Water' }[el]
  }
  return { wood: '木', fire: '火', earth: '土', metal: '金', water: '水' }[el]
}
