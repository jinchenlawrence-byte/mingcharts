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
import type { SiteLang } from './lang'
import { tEn } from './i18n'

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
//   · 斗數/北斗/斗柄/斗木獬 是「北斗」之斗；opencc 在 cn→twp 下会把「斗數」
//     判成「鬥數」（鬥=争斗）。繁体树里「紫微斗數」本来就是繁体字面量，再过一次
//     toHant 就会变成「紫微鬥數」，属于典型的转换误伤，故按命理术语整体保护。
//     顺序=长词优先，避免「斗木獬」被拆开。
const PROTECTED_TERMS = ['斗木獬', '斗數', '北斗', '斗柄', '小凶', '大凶', '小吉', '大吉', '凶'] as const

// ★ 现代汉语里的「衝」（衝動/衝突/衝擊…）与命理里的「沖」（相沖/沖合/沖開）
//   opencc 对单字「冲」一律给「衝」，不会按命理语境判断。做法是：
//   ① 先把现代词（简/繁写法都算）整体保护，转换后还原为「衝」；
//   ② 其余「衝」在多字文本里统一校正为「沖」。
//   单字仍保留「衝」（既有行为，单字太岁关系由 hantTaiSui 直接给「沖」）。
//   「衝動用神」是命理语境（冲动=冲开/引动），必须在「衝動」之前单独保护。
const CHONG_FIXED: ReadonlyArray<readonly [string, string]> = [
  ['衝動用神', '沖動用神'],
  ['冲动用神', '沖動用神'],
]
const CHONG_MODERN: ReadonlyArray<readonly [string, string]> = [
  ['衝動', '衝動'], ['冲动', '衝動'],
  ['衝突', '衝突'], ['冲突', '衝突'],
  ['衝擊', '衝擊'], ['冲击', '衝擊'],
  ['衝勁', '衝勁'], ['冲劲', '衝勁'],
  ['衝刺', '衝刺'], ['冲刺', '衝刺'],
  ['衝鋒', '衝鋒'], ['冲锋', '衝鋒'],
  ['衝出', '衝出'], ['冲出', '衝出'],
  ['衝上', '衝上'], ['冲上', '衝上'],
  ['衝進', '衝進'], ['冲进', '衝進'],
  ['衝浪', '衝浪'], ['冲浪', '衝浪'],
]

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

// ★ 「表」在表格语境里不是「手錶」的「錶」（2026-11-12 实测事故）
//   opencc 在 cn→twp 下把「配对表」判成「配對錶」，导致 12 个繁体生肖页的标题、
//   以及合婚模块正文里的「配对表」全部错成手表。
//   ★ 只做【词组级】保护，绝不做「表→表」的逐字规则——逐字规则会把真正该写「錶」的
//     地方（鐘錶/手錶/懷錶/電錶）一起改错，方向相反且更难发现。
//   词组表同时收简繁两种输入，保证 toHant 对已是繁体的文本幂等。
const TABLE_PHRASES: ReadonlyArray<readonly [string, string]> = [
  ['配对表', '配對表'], ['配對表', '配對表'],
  ['一览表', '一覽表'], ['一覽表', '一覽表'],
  ['资料表', '資料表'], ['資料表', '資料表'],
  ['时辰表', '時辰表'], ['時辰表', '時辰表'],
  ['流年表', '流年表'],
  ['表单', '表單'], ['表單', '表單'],
  ['表格', '表格'],
  ['报表', '報表'], ['報表', '報表'],
]

// 通用兜底：跟在「配對/一覽/資料/時辰/流年」后面的「表」一律是「表」。
// 只保护这个「表」字，前缀照常参与转换（配对 → 配對、时辰 → 時辰）。
const BIAO_AFTER_RE = /(配對|配对|一覽|一览|資料|资料|時辰|时辰|流年)表/g

const PH_OPEN = '\uE000'
const PH_CLOSE = '\uE001'
const PH_RE = new RegExp(`${PH_OPEN}(\\d+)${PH_CLOSE}`, 'g')
const GAN_TOKEN = `${PH_OPEN}GAN${PH_CLOSE}`
const CHOU_TOKEN = `${PH_OPEN}CHOU${PH_CLOSE}`
const BIAO_TOKEN = `${PH_OPEN}BIAO${PH_CLOSE}`

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
  // ③ 地支「丑」：opencc 会把它转成「醜」（丑陋的醜），而命理里丑=地支。
  //    只保护 丑 这个字，后面的「时/月/未」照常转换（丑时 → 丑時）。
  out = out.replace(/丑/g, CHOU_TOKEN)
  // ④ 现代词「衝」与命理「沖動用神」先整体保护，避免下一步被统一改成「沖」
  for (const [term, fixed] of CHONG_FIXED) {
    if (!out.includes(term)) continue
    out = out.split(term).join(stash(fixed))
  }
  for (const [term, fixed] of CHONG_MODERN) {
    if (!out.includes(term)) continue
    out = out.split(term).join(stash(fixed))
  }
  // ⑤ 判词与命理术语整词保护
  for (const term of PROTECTED_TERMS) {
    if (!out.includes(term)) continue
    out = out.split(term).join(stash(term))
  }
  // ⑥ 表格语境的「表」：整词先兜底，再用前缀规则兜住同族短语
  for (const [term, fixed] of TABLE_PHRASES) {
    if (!out.includes(term)) continue
    out = out.split(term).join(stash(fixed))
  }
  out = out.replace(BIAO_AFTER_RE, (_all, pre: string) => `${pre}${BIAO_TOKEN}`)
  return { masked: out, kept }
}

/** 简体 → 繁体（台湾/香港通用书面语）；干支与受保护术语原样保留 */
export function toHant(text: string): string {
  if (!text) return text
  const { masked, kept } = mask(text)
  let converted = convert(masked)
  // 多字文本：除已保护的现代词外，命理语境的「衝」统一校正为「沖」（相沖/沖合/沖開/刑沖）
  if (text.length > 1) converted = converted.replace(/衝/g, '沖')
  converted = converted.replace(PH_RE, (_all, i: string) => kept[Number(i)] ?? '')
  converted = converted.split(GAN_TOKEN).join('干').split(CHOU_TOKEN).join('丑')
  converted = converted.split(BIAO_TOKEN).join('表')
  for (const [from, to] of POST_FIXES) {
    if (converted.includes(from)) converted = converted.split(from).join(to)
  }
  return converted
}

/** 按语言取文本：简体原样返回；繁体走 toHant；英文走 i18n 词典（缺词回退中文） */
export function localize(text: string, locale: SiteLang): string {
  if (locale === 'zh-Hant') return toHant(text)
  if (locale === 'en') return tEn(text)
  return text
}

/**
 * ★ 太岁关系单字表（值 / 冲 / 害 / 刑 / 合 / 平）。
 *   为什么需要它：转换器把【单字】「冲」转成「衝」（衝動的衝），
 *   而命理写「沖」（相沖）。POST_FIXES 只修正「衝太歲」这种词组，
 *   当调用方只转一个字、自己拼「太歲」时（`toHant(ln.relation) + '太歲'`）就会漏成「衝太歲」。
 *   真实事故：2026 屬鼠页同时出现「沖太歲」与「衝太歲」。
 */
export const HANT_TAISUI: Record<string, string> = {
  '值': '值', '冲': '沖', '害': '害', '刑': '刑', '合': '合', '平': '平',
}

/** 太岁关系取繁体写法；未知关系回退到通用转换 */
export function hantTaiSui(relation: string): string {
  return HANT_TAISUI[relation] ?? toHant(relation)
}

/** 简繁对照的 URL 互指（hreflang 与切换器共用，避免两处手写路径） */
export function twinPath(path: string, locale: 'zh-Hans' | 'zh-Hant'): string {
  // 约定：繁体树在 /tw 前缀下，路径其余部分与简体一致
  const clean = path.startsWith('/') ? path : `/${path}`
  if (locale === 'zh-Hant') return clean.startsWith('/tw/') || clean === '/tw' ? clean : `/tw${clean === '/' ? '' : clean}`
  return clean.replace(/^\/tw(?=\/|$)/, '') || '/'
}
