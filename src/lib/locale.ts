// 输出语言（单一事实源）
//
// 背景：站点只收国际卡（支付宝类目禁入，已定案），大陆流量看得见付不了；
// 能付钱的是港/台/马新/北美华人，他们读繁体。若繁体落地页 → 付费 → 收到简体万字命书，
// 退款与差评的成本远高于获客本身。故语言必须从【入口】一路传到【交付物】与【收银台】。
//
// 适用范围：
//   · 六个 AI 生成模块（命书 / 年运 / 合婚 / 紫微 / 方位 / 追问）的 system prompt
//   · Waffo 托管收银台的默认语言
//
// ★ 默认值必须是 zh-Hans：现有全部入口不带 locale，行为必须逐字不变（零回归）。
// ★ 本文件不依赖 next/*，便于 scripts 里直接 import 做断言。

/** 站内只区分两种输出语言（台/港/马新共用一套通用书面语，不拆 zh-TW / zh-HK） */
export type OutputLocale = 'zh-Hans' | 'zh-Hant'

export const DEFAULT_LOCALE: OutputLocale = 'zh-Hans'

/** 入口 cookie：/tw 路由落地时由语言切换器写入；无则回退默认 */
export const LOCALE_COOKIE = 'mc_locale'

/** 允许的取值（对外暴露，便于前端与测试共用） */
export const OUTPUT_LOCALES: readonly OutputLocale[] = ['zh-Hans', 'zh-Hant'] as const

const HANS_ALIASES = new Set(['zh-hans', 'zh-cn', 'zh-sg', 'hans', 'cn', 'simplified', '简体', '簡體'])
const HANT_ALIASES = new Set([
  'zh-hant', 'zh-tw', 'zh-hk', 'zh-mo', 'hant', 'tw', 'hk', 'mo', 'traditional', '繁体', '繁體',
])

/** 严格解析：认得的返回标准化值，认不得的返回 null（不猜测、不默认） */
export function parseLocale(v: unknown): OutputLocale | null {
  if (typeof v !== 'string') return null
  const s = v.trim().toLowerCase()
  if (!s) return null
  if (HANS_ALIASES.has(s)) return 'zh-Hans'
  if (HANT_ALIASES.has(s)) return 'zh-Hant'
  return null
}

/** 宽松解析：按候选顺序取第一个认得的，全认不得则回退默认 */
export function resolveLocale(...candidates: unknown[]): OutputLocale {
  for (const c of candidates) {
    const p = parseLocale(c)
    if (p) return p
  }
  return DEFAULT_LOCALE
}

/**
 * API route 统一入口：body.locale 优先，其次 request cookie，最后默认。
 * 只取一次、只在这里取一次 —— 避免「每个 route 各写一遍 if」导致入口漂移（§8.5）。
 */
export function localeFromRequest(
  request: { cookies?: { get(name: string): { value: string } | undefined } } | null | undefined,
  body?: unknown
): OutputLocale {
  const fromBody = parseLocale((body as { locale?: unknown } | null | undefined)?.locale)
  if (fromBody) return fromBody
  const fromCookie = parseLocale(request?.cookies?.get?.(LOCALE_COOKIE)?.value)
  return fromCookie ?? DEFAULT_LOCALE
}

/**
 * 繁体输出指令（追加在 SYSTEM_PROMPT 之后，不改 SYSTEM_PROMPT 本身）。
 * ★ 三条纪律写进指令里，而不是靠模型自觉：
 *   ① 术语逐字保留 —— 干支/十神/纳音被「转繁」就是数据事故（干支→乾支）
 *   ② 不得繁简混用 —— 半繁半简是最常见的模型劣化形态
 *   ③ 禁用词不得用繁体写法规避 —— 註定/積極進取/突破性進展 与简体同罪
 */
export const HANT_OUTPUT_DIRECTIVE = `

【輸出語言｜必須遵守】全篇使用繁體中文（台灣／香港通用書面語，非粵語口語）。
· 干支（如「甲子」）、十神（如「正官」）、納音、格局、神煞等術語一律保持原字，不得繁簡混用，不得改寫字形；
· 費用、SKU 名稱、法律條款名稱照原文，不要自行轉換；
· 禁用詞規則同樣適用：以繁體寫法出現（註定、積極進取、突破性進展）同樣視為違規，須改用「往往／多半／穩中求進／階段性的進展」。`

/** 返回追加到 system prompt 的语言指令；简体返回空串（保证默认路径逐字不变） */
export function localeDirective(locale?: unknown): string {
  return parseLocale(locale) === 'zh-Hant' ? HANT_OUTPUT_DIRECTIVE : ''
}

/**
 * 收银台语言。★ Waffo 的 CashierLanguage 里没有裸 "zh-Hant"，
 * 只有 zh-Hant-TW / zh-Hant-HK —— 故繁体统一映射到 zh-Hant-TW（通用书面语最接近的档位）。
 */
export function checkoutLanguage(locale?: unknown): 'zh-Hans' | 'zh-Hant-TW' {
  return parseLocale(locale) === 'zh-Hant' ? 'zh-Hant-TW' : 'zh-Hans'
}
