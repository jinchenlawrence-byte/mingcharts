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
import { pickPreviewSections, PREVIEW_FREE, ZIWEI_LOCKED_PREVIEW } from './reportPreview'
import { annualLockedPreviewOf, zonedNow } from './liunianFree'
import type { SiteLang } from './lang'
import { toHant } from './hant'

/** 各报告「免费分层」可见的板块键（当前仅紫微：深度解读前两个模块） */
const FREE_KEYS: Partial<Record<ReportKind, string[]>> = {
  ziwei: PREVIEW_FREE.ziwei_deep,
}

/**
 * 各报告模块的门禁口径（详情页重算用；模块页 route 的 locked 文案与此同源）。
 * · sku：未解锁时引导购买的 SKU（与模块页 locked.skus 一致）
 * · grant：判定「已持有」的能力（走 entitlement.grantsCover，含 bundle3 隐式覆盖）
 * · preview：未解锁时展示的引导文案（与模块页口径一致）
 * · regenApi：该行【存档输入完整】时可就地补算全文的端点；null = 不补算（走诚实提示）
 * fatebook = null：命书正文在 charts.chart_data，不走本重算。
 */
export const REPORT_GATE: Record<
  ReportKind,
  { sku: SkuId; grant: GrantId; preview: string; regenApi: string | null } | null
> = {
  hemun: {
    sku: 'hemun',
    grant: 'hemun',
    preview: '免费试读开放 3 个维度：生肖配对、日柱夫妻宫、五行互补。付费后可看其余 6 个维度：年柱干支、年柱纳音、配偶星、婚姻宫稳定度、十神互见、大运同步，以及九维合婚 AI 深度解读与追问。',
    // 不开启补算：合婚请求体是 {male,female} 双人形态，且老行存档缺出生地键
    regenApi: null,
  },
  ziwei: {
    sku: 'ziwei_deep',
    grant: 'ziwei_deep',
    preview: ZIWEI_LOCKED_PREVIEW,
    // 不开启补算：老行存档缺 birthZone/birthLng，回放会按默认时区算出另一张盘
    regenApi: null,
  },
  geo: {
    sku: 'geo',
    grant: 'geo',
    preview:
      '免费试读开放「事业之城」与现居城市影响。付费后可看完整版：财富、事业、贵人、安居、才华五类城市推荐（每类最多 6 座）、现居城市影响详解、8 节 AI 深度解读与 5 次 AI 追问。',
    // 不开启补算：地理还依赖【现居城市】，该要素不在存档里，回放会给出不同的五城推荐
    regenApi: null,
  },
  annual: {
    sku: 'annual_report',
    grant: 'annual_report',
    // 年运的模块页 preview 含「{目标年}（{干支}年）」前缀（需读内容；此处给通用口径）
    preview: '流年详批：事业/财运/感情/健康分维度深度解读解锁后可见。',
    // ★ 仅年运开启就地补算（2026-10-18）：其存档 input 就是 route 接受的【扁平请求体】
    //   且含全量排盘要素（分钟 + 出生地时区/经度），回放能忠实重算出同一张盘。
    //   于是付费用户点开付款前生成的旧报告，即刻看到全文，不必重填一遍出生信息。
    regenApi: '/api/liunian',
  },
  fatebook: null,
}

/**
 * 纯函数：该行能否【就地补算全文】（付费后打开旧报告时用）。
 * 判据 = 存档 input 必须含【全部影响排盘结果的键】—— 缺任何一个，回放都会算出
 * 另一张盘，把【错误的报告】当成付费内容展示（比让用户多点两下严重得多）。
 * · 年运（唯一开启 regenApi 的模块）：birthZone/birthLng 走「手动经度」分支，
 *   resolveBirthRef 会解析出与原始完全相同的时区/经度 → 回放忠实。
 * · 紫微/合婚/地理：regenApi 为 null，恒 false（存档形态不足以忠实回放）。
 * ★ 牙口锚点：把 'birthZone'/'birthLng' 从 NEED 里去掉 → 断言「缺出生地不得补算」翻红。
 */
export function canRegenContent(kind: ReportKind, input: unknown): boolean {
  const gate = REPORT_GATE[kind]
  if (!gate?.regenApi) return false
  if (!input || typeof input !== 'object') return false
  const o = input as Record<string, unknown>
  const NEED = ['year', 'month', 'day', 'hour', 'minute', 'gender', 'birthZone', 'birthLng']
  const need = kind === 'annual' ? [...NEED, 'targetYear'] : NEED
  return need.every((k) => k in o)
}

/** 年运未解锁文案：能读到内容里的目标流年时补上「{年}（{干支}年）」前缀（与模块页同口径） */
function annualPreviewOf(content: Record<string, unknown>, lang: SiteLang = 'zh-Hans'): string {
  const targetYear =
    (content.targetYear as number | undefined) ??
    ((content.free as { targetYear?: number } | undefined)?.targetYear as number | undefined)
  const liuNian = content.liuNian
  const item = Array.isArray(liuNian)
    ? (liuNian as Array<{ year?: number; ganZhi?: string }>).find((y) => y.year === targetYear)
    : undefined
  if (!targetYear) return REPORT_GATE.annual?.preview ?? ''
  return annualLockedPreviewOf({
    nowYear: zonedNow(null).year,
    targetYear,
    targetGanZhi: item?.ganZhi ?? '',
    future: Array.isArray(liuNian)
      ? (liuNian as Array<{ year?: number; ganZhi?: string }>)
          .filter((y): y is { year: number; ganZhi: string } => typeof y.year === 'number' && typeof y.ganZhi === 'string')
      : [],
    lang,
  })
}

/** 未解锁引导文案（纯函数，可断言） */
export function lockedPreviewOf(
  kind: ReportKind,
  content: Record<string, unknown>,
  lang: SiteLang = 'zh-Hans'
): string {
  const gate = REPORT_GATE[kind]
  if (!gate) return ''
  return kind === 'annual'
    ? annualPreviewOf(content, lang)
    : lang === 'zh-Hant' ? toHant(gate.preview) : gate.preview
}

/**
 * 纯函数：该报告的解读是否为「规则版」兜底（AI 结果未过合规校验 / AI 不可用）。
 * ★ 为什么要它（2026-10-18 线上事故）：付费用户拿到「规则版（AI结果未过合规校验）」时，
 *   标签旁没有任何出口 → 只能要求退款。谁渲染规则版标签，谁就必须给出「重新生成」入口。
 * 判据 = aiSource 的稳定子串「规则版」（4 个 route 唯一产出：hemun / ziwei / geo / liunian 的 route.ts）。
 * ★ 牙口锚点：把判据改成恒 false → 规则版标签旁不再出现入口（断言翻红）。
 */
/**
 * 真·AI 结果的唯一判据（客户端安全：不依赖 node:crypto）。
 *
 * ★ 2026-11-05：此前该常量只定义在 reportCache（服务端，含 node:crypto），
 *   英文各页为了判断「是否规则版」只好在英文源文件里内联写 'AI 深度解读' ——
 *   既分散了判据，又把中文写进了英文页面（被 en-tools 的零 CJK 断言抓到）。
 *   现集中于此，reportCache 反向引用，全站只有一处字面量。
 */
export const GENUINE_AI_SOURCE = 'AI 深度解读'

export function isRuleVersion(aiSource: unknown): boolean {
  return typeof aiSource === 'string' && aiSource.includes('规则版')
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
  ent: { memberSkus: SkuId[]; ownedSkus: SkuId[] | Set<SkuId> },
  lang: SiteLang = 'zh-Hans'
): Record<string, unknown> {
  const gate = REPORT_GATE[kind]
  if (!gate) return content
  const owned = grantsCover(ent, gate.grant)
  const freeKeys = FREE_KEYS[kind]
  return {
    ...content,
    locked: owned ? null : { skus: [gate.sku], preview: lockedPreviewOf(kind, content, lang) },
    // ★ 免费分层（2026-11-09）：未持有紫微时只下发深度解读前两个模块的规则版内容
    ai: owned
      ? (content.ai ?? null)
      : freeKeys
        ? pickPreviewSections(content.ai as Record<string, unknown> | null, freeKeys)
        : null,
    aiSource: owned ? (content.aiSource ?? null) : '未解锁',
  }
}
