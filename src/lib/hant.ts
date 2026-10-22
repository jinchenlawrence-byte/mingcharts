// 繁简转换（zh-Hans → zh-Hant），只用于【数据驱动的正文】
//
// 三条硬约束（动手前先读）：
//   ① 干支/十神/纳音不可错。转换器目前把「干支」判对，但这属于【错一次就毁信任】的字段，
//      故用私有区占位符把「甲子」这类干支对整体保护起来，绕开词典转换再还原。
//      事故形态：干 → 乾，得到「乾支」——读者会当成错别字，且是命理常识性错误。
//   ② 只转数据文本，不转 SKU/价格/法律条款名（由调用方决定传什么，本函数不猜）。
//   ③ 缺省不转：locale !== 'zh-Hant' 时原样返回，保证简体路径逐字不变。
//
// 词典用 opencc-js（cn → twp，台港通用书面语）。★ 换实现/换词典前后必须重跑
// scripts/test-i18n-accept.mjs —— 那里钉了干支、术语、繁简混用三类断言。
import { Converter } from 'opencc-js'
import type { OutputLocale } from './locale'

const convert = Converter({ from: 'cn', to: 'twp' })

const GAN = '甲乙丙丁戊己庚辛壬癸'
const ZHI = '子丑寅卯辰巳午未申酉戌亥'
// 干支只能是「干+支」成对出现（甲子、乙丑…），故按对保护即可
const GANZHI_RE = new RegExp(`[${GAN}][${ZHI}]`, 'g')

// ★ 受保护词表（实测被 convert 改错的判词，顺序=长词优先）：
//   · 小凶/大凶 →「小兇/大兇」错：7 档判词（大吉/吉/小吉/平/小凶/凶/大凶）是产品定义的
//     封闭词表，转繁后必须仍是同一个词，否则筛选/统计/文案一致性全部错位
//   注：干支/天干/藏干这类「干」字术语不能整词保护 —— 那会把「时干」的「时」一起冻住，
//       于是改用下面的「只保护干这一个字」的规则（见 MASK_GAN_*）
const PROTECTED_TERMS = ['小凶', '大凶', '小吉', '大吉', '凶'] as const

// ★ 「干」字术语：命理里的 干=天干，绝不能转成「幹/乾」。
//   只把【干字本身】打成占位符，前后字照常转换（例：时干 → 時干，而不是 时干）
const GAN_PREFIX = '天十日月年時时透藏'
const MASK_GAN_AFTER = new RegExp(`([${GAN_PREFIX}])干`, 'g')
const MASK_GAN_BEFORE = /干(支|合|透)/g

// ★ 转换后的用词修正（convert 给得出、但命理语境的正确写法不同）：
//   「冲太岁」convert 得到「衝太歲」，而命理写「沖太歲」（沖=相沖），與「衝」不同义
const POST_FIXES: ReadonlyArray<readonly [string, string]> = [
  ['衝太歲', '沖太歲'],
]

const PH_OPEN = '\uE000'
const PH_CLOSE = '\uE001'
const PH_RE = new RegExp(`${PH_OPEN}(\\d+)${PH_CLOSE}`, 'g')
const GAN_TOKEN = `${PH_OPEN}GAN${PH_CLOSE}`

/** 把干支对、术语「干」字、受保护判词替换成私有区占位符，绕开词典 */
function mask(text: string): { masked: string; kept: string[] } {
  const kept: string[] = []
  const stash = (m: string) => {
    kept.push(m)
    return `${PH_OPEN}${kept.length - 1}${PH_CLOSE}`
  }
  // ① 干支对（甲子…）整体保护
  let out = text.replace(GANZHI_RE, stash)
  // ② 「干」字术语：只保护 干 本身，保留前一字参与转换
  out = out.replace(MASK_GAN_AFTER, (_all, pre: string) => `${pre}${GAN_TOKEN}`)
  out = out.replace(MASK_GAN_BEFORE, (_all, post: string) => `${GAN_TOKEN}${post}`)
  // ③ 判词整词保护
  for (const term of PROTECTED_TERMS) {
    if (!out.includes(term)) continue
    out = out.split(term).join(stash(term))
  }
  return { masked: out, kept }
}

/** 简体 → 繁体（台湾/香港通用书面语）；干支与受保护术语原样保留 */
export function toHant(text: string): string {
  if (!text) return text
  const { masked, kept } = mask(text)
  let converted = convert(masked)
  converted = converted.replace(PH_RE, (_all, i: string) => kept[Number(i)] ?? '')
  converted = converted.split(GAN_TOKEN).join('干')
  for (const [from, to] of POST_FIXES) {
    if (converted.includes(from)) converted = converted.split(from).join(to)
  }
  return converted
}

/** 按语言取文本：简体原样返回（不跑转换器，零开销、零风险） */
export function localize(text: string, locale: OutputLocale): string {
  return locale === 'zh-Hant' ? toHant(text) : text
}

/** 简繁对照的 URL 互指（hreflang 与切换器共用，避免两处手写路径） */
export function twinPath(path: string, locale: OutputLocale): string {
  // 约定：繁体树在 /tw 前缀下，路径其余部分与简体一致
  const clean = path.startsWith('/') ? path : `/${path}`
  if (locale === 'zh-Hant') return clean.startsWith('/tw/') || clean === '/tw' ? clean : `/tw${clean === '/' ? '' : clean}`
  return clean.replace(/^\/tw(?=\/|$)/, '') || '/'
}
