// 站内语言路由（三语单一事实源）
//
// 与 lib/locale.ts 的分工：
//   · locale.ts  —— AI 输出语言（zh-Hans / zh-Hant），历史链路，不改
//   · lang.ts    —— 站点 UI 语言与路由（zh-Hans / zh-Hant / en）
// 繁体沿用既有 /tw 前缀（不另起 /zh-Hant，避免 265 条已收录 URL 全量迁移）。

export type SiteLang = 'zh-Hans' | 'zh-Hant' | 'en'

export const DEFAULT_SITE_LANG: SiteLang = 'en'
export const LANG_COOKIE = 'mc_lang'

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

/**
 * 国家/地区 → 语言（产品规则）：
 *   台湾/香港 → 繁体；马来西亚/新加坡 → 简体；英国 → 英文；其他（含未知）→ 英文兜底。
 */
export function langFromCountry(country?: string | null): SiteLang {
  const cc = (country ?? '').trim().toUpperCase()
  if (cc === 'TW' || cc === 'HK') return 'zh-Hant'
  if (cc === 'MY' || cc === 'SG') return 'zh-Hans'
  if (cc === 'GB') return 'en'
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
    // 与 IP 兜底规则一致：未识别地区默认英文，故 x-default 指英文版
    'x-default': en,
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
 * 根路径（且仅根路径）的语言决策：
 *   ① 爬虫 → null（不重定向，交给 hreflang）
 *   ② cookie 优先（用户手动切换过就永久以 cookie 为准）
 *   ③ 无 cookie → 按国家规则；无国家头（本地/非 Vercel）→ 英文兜底
 * 返回目标语言；与当前根（简体）相同时调用方不重定向。
 */
export function decideRootLang(input: {
  cookie?: string | null
  country?: string | null
  userAgent?: string | null
}): SiteLang {
  if (isCrawler(input.userAgent)) return 'zh-Hans'
  const fromCookie = parseSiteLang(input.cookie)
  if (fromCookie) return fromCookie
  return langFromCountry(input.country)
}
