// 视觉令牌 · 非 CSS 场景（canvas / SVG 属性 / 内联 data 映射）
//
// 为什么单独一份：globals.css 里的 CSS 变量无法被 CanvasRenderingContext2D 读取，
// SVG 的 presentation attribute 在部分场景也不便写成 var()。这些具体值集中在这里，
// 与 src/app/globals.css 的 :root 令牌保持同值；页面与组件不得再写裸色值。
// 断言 scripts/test-visual-tokens.mjs 只放行本文件与 globals.css 的色值字面量。

/** 品牌五行点（页头）：与 --hw-wood / fire / earth / metal / water 同值 */
export const BRAND_DOTS = [
  'var(--hw-wood)',
  'var(--hw-fire)',
  'var(--hw-earth)',
  'var(--hw-metal)',
  'var(--hw-water)',
] as const

/**
 * 每日日签五行配色（2026-11-09）。
 * bar 与 --hw-wood/fire/earth/metal/water 同值，只作卡片左/顶色带；
 * tint = 元素色 9% 叠白底；tintDark = 元素色 14% 叠 #1a1a2e。
 * 字色不在这里写死：由 dailyElement.inkOn() 按背景实际亮度自动选深/浅。
 */
export const ELEMENT_PALETTE = {
  wood: { bar: '#3cc796', tint: '#edfaf6', tintDark: '#1f323d' },
  fire: { bar: '#ff6b5b', tint: '#fff2f0', tintDark: '#3a2534' },
  earth: { bar: '#f6c24f', tint: '#fefaef', tintDark: '#393233' },
  metal: { bar: '#d6dbe6', tint: '#fbfcfd', tintDark: '#343548' },
  water: { bar: '#3a66ff', tint: '#edf1ff', tintDark: '#1e254b' },
} as const

/** 日签卡片文字色：inkOn() 按背景实际亮度二选一（与 --hw-ink / 白同值） */
export const DAILY_INK = { dark: '#1b1838', light: '#ffffff' } as const

/** 每日日签分享图（canvas 绘制，需具体色值） */
/** 合婚分享失效页：边缘函数直接返回裸 HTML，没有 CSS 文件可挂变量，色值收口在此 */
export const SHARE_GONE_PALETTE = {
  bg: '#F7F3EA',
  ink: '#2C2318',
  mute: '#7A6E5D',
} as const

/** 合婚分享卡（OG 图）：与分享页同一套暖纸色系 */
export const SHARE_PALETTE = {
  bgTop: '#fffaf0',
  bgBottom: '#fdf3e3',
  frame: '#d6a35c',
  brand: '#92400e',
  subBrand: '#a16207',
  date: '#78350f',
  rule: '#e7c48d',
  body: '#3f2d1a',
  boundary: '#8a6d4b',
  disclaimer: '#a98c66',
} as const

/** 方位地图（SVG 属性） */
export const GEO_PALETTE = {
  sea: '#eef4fa',
  graticule: '#d7e3ef',
  china: '#fcd9a8',
  land: '#dcd8cf',
  white: '#fff',
  birth: '#374151',
  good: '#059669',
  bad: '#dc2626',
  caution: '#d97706',
} as const

/** 方位分析类别色（财富/事业/贵人/安居/才华），供地图与卡片共用 */
export const GEO_CATEGORY_COLORS = {
  wealth: '#d97706',
  career: '#7c3aed',
  patron: '#0891b2',
  home: '#059669',
  talent: '#db2777',
} as const

/** 太岁关系色（值/冲/害/刑/合/平），简繁共用 */
export const TAISUI_COLORS = {
  zhi: { bg: 'rgba(185,65,52,0.14)', fg: '#B94134' },
  chong: { bg: 'rgba(196,110,40,0.14)', fg: '#9C5520' },
  hai: { bg: 'rgba(168,140,40,0.16)', fg: '#8A6D12' },
  xing: { bg: 'rgba(112,86,150,0.14)', fg: '#6B4C97' },
  he: { bg: 'rgba(58,124,86,0.14)', fg: '#2F6B49' },
  ping: { bg: 'rgba(120,114,104,0.10)', fg: '#7A7268' },
  focusBg: 'rgba(185,65,52,0.08)',
} as const
