// 站内语言路由（三语单一事实源）
//
// 与 lib/locale.ts 的分工：
//   · locale.ts  —— AI 输出语言（zh-Hans / zh-Hant），历史链路，不改
//   · lang.ts    —— 站点 UI 语言与路由（zh-Hans / zh-Hant / en）
// 繁体沿用既有 /tw 前缀（不另起 /zh-Hant，避免 265 条已收录 URL 全量迁移）。

export type SiteLang = 'zh-Hans' | 'zh-Hant' | 'en'

// ★ 2026-11-03 止血：默认语言改为简体。
//   此前「其他地区兜底英文」会把中国大陆等用户 307 到只有 3 页的 /en，
//   简体首页的登录入口、排盘表单、完整导航全部消失。默认简体、不跳转。
export const DEFAULT_SITE_LANG: SiteLang = 'zh-Hans'
export const LANG_COOKIE = 'mc_lang'
// 用户已看过语言提示条（或已做过选择）后置位，存在即不再做任何根路径跳转。
export const LANG_ASKED_COOKIE = 'mc_lang_asked'

const HANS_ALIASES = new Set(['zh-hans', 'zh-cn', 'zh-sg', 'hans', 'cn', 'simplified'])
const HANT_ALIASES = new Set(['zh-hant', 'zh-tw', 'zh-hk', 'zh-mo', 'hant', 'tw', 'hk', 'traditional'])
const EN_ALIASES = new Set(['en', 'en-us', 'en-gb', 'english'])

export function parseSiteLang(v: unknown): SiteLang | null {
  if (typeof v !== 'string') return null
  const s = v.trim().toLowerCase()
  if (!s) return null
  if (HANS_ALIASES.has(s)) return 'zh-Hans'
  if (HANT_ALIASES.has(s)) return 'zh-Hant'
  if (EN_ALIASES.has(s)) return 'en'
  return null
}

// 明确英语地区：只有这些国家才导向 /en；其余（含未知、中国大陆）一律简体。
const EN_COUNTRIES = new Set(['GB', 'US', 'CA', 'AU', 'NZ', 'IE'])

/**
 * 国家/地区 → 语言（产品规则，2026-11-03 修订）：
 *   台湾/香港/澳门 → 繁体；马来西亚/新加坡 → 简体；
 *   英国/美国/加拿大/澳大利亚/新西兰/爱尔兰 → 英文；
 *   其他（含未知、中国大陆）→ 简体，且调用方不跳转。
 */
export function langFromCountry(country?: string | null): SiteLang {
  const cc = (country ?? '').trim().toUpperCase()
  if (cc === 'TW' || cc === 'HK' || cc === 'MO') return 'zh-Hant'
  if (cc === 'MY' || cc === 'SG') return 'zh-Hans'
  if (EN_COUNTRIES.has(cc)) return 'en'
  return DEFAULT_SITE_LANG
}

/** 路径前缀 → 语言（/tw 与 /en 为语言树；其余归简体） */
export function langFromPath(path: string): SiteLang {
  const clean = path.startsWith('/') ? path : `/${path}`
  if (clean === '/tw' || clean.startsWith('/tw/')) return 'zh-Hant'
  if (clean === '/en' || clean.startsWith('/en/')) return 'en'
  return 'zh-Hans'
}

/** 语言首页 */
export function homeForLang(lang: SiteLang): string {
  return lang === 'zh-Hant' ? '/tw' : lang === 'en' ? '/en' : '/'
}

/**
 * 简体路径 → 目标语言路径。
 * 例：('/pricing','en') = '/en/pricing'；('/tw/pricing','en') = '/en/pricing'
 */
export function pathForLang(hansPath: string, lang: SiteLang): string {
  const clean = hansPath.startsWith('/') ? hansPath : `/${hansPath}`
  const stripped = clean.replace(/^\/(tw|en)(?=\/|$)/, '') || '/'
  if (lang === 'zh-Hans') return stripped
  if (lang === 'zh-Hant') return stripped === '/' ? '/tw' : `/tw${stripped}`
  return stripped === '/' ? '/en' : `/en${stripped}`
}

/**
 * 三语 hreflang 矩阵（仅用于确有英文版的页面；没有英文版的面继续用 hantAlternates）。
 * 保留 zh-TW/zh-HK/zh-MO 三地区标签（同一份繁体内容）。
 */
export function triAlternates(hansPath: string): Record<string, string> {
  const hans = hansPath.startsWith('/') ? hansPath : `/${hansPath}`
  const hant = pathForLang(hans, 'zh-Hant')
  const en = pathForLang(hans, 'en')
  return {
    'zh-Hans': hans,
    'zh-Hant': hant,
    'zh-TW': hant,
    'zh-HK': hant,
    'zh-MO': hant,
    en,
    // 与 IP 兜底规则一致：未识别地区默认简体，故 x-default 指简体版
    'x-default': hans,
  }
}

/** 常见爬虫 UA（不得被地理重定向；他们按 hreflang 自行选择） */
const BOT_UA = [
  'googlebot', 'google-inspectiontool', 'bingbot', 'baiduspider', 'yandexbot',
  'applebot', 'duckduckbot', 'twitterbot', 'facebookexternalhit', 'linkedinbot',
  'slurp', 'ahrefsbot', 'semrushbot', 'mj12bot', 'petalbot', 'bytespider',
]

export function isCrawler(userAgent?: string | null): boolean {
  const ua = (userAgent ?? '').toLowerCase()
  return BOT_UA.some((b) => ua.includes(b))
}

/**
 * 根路径（且仅根路径）的语言决策（2026-11-03 止血后）：
 *   ① 爬虫 → 简体，不重定向（交给 hreflang）
 *   ② 只要存在 mc_lang 或 mc_lang_asked，就永不跳转，直接留在简体根
 *      （用户已经被一次跳转伤过；语言入口在导航里，由用户自己点）
 *   ③ 完全没有任何语言 cookie 的首次访问，才按国家规则；
 *      只有明确地区（TW/HK/MO、GB/US/CA/AU/NZ/IE）会跳，
 *      中国大陆、未知国家、无国家头 → 简体且不跳
 */
export function decideRootLang(input: {
  cookie?: string | null
  askedCookie?: string | null
  country?: string | null
  userAgent?: string | null
}): SiteLang {
  if (isCrawler(input.userAgent)) return 'zh-Hans'
  const hasChoice =
    (input.cookie ?? '').trim() !== '' || (input.askedCookie ?? '').trim() !== ''
  if (hasChoice) return 'zh-Hans'
  return langFromCountry(input.country)
}
