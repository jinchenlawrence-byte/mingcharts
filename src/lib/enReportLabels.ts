// 英文报告展示层映射（仅用于英文页面，不改库）
//
// 两件事：
// 1) 报告类型英文名统一：对外展示一律用 "Location & Direction"，不再出现旧词 Geomancy。
//    历史报告若在展示字段里存了 Geomancy 字面量，这里做一次展示映射，数据本身不动。
// 2) 中文旧报告判定：用正文 CJK 比例（内容特征）而非猜测；仅英文页面使用。

/** 英文报告列表/详情的类型名。技术 kind 不变，只映射展示文案。 */
export const KIND_EN: Record<string, string> = {
  hemun: 'Bazi synastry',
  ziwei: 'Zi Wei Dou Shu',
  geo: 'Location & Direction',
  annual: 'Annual report',
  fatebook: 'Fate Book',
}

/** 历史数据可能残留的旧类型名 → 新展示名（只做展示层替换） */
const LEGACY_KIND_EN: Record<string, string> = {
  Geomancy: 'Location & Direction',
  'Geomancy report': 'Location & Direction report',
  'Geomancy · city analysis': 'Location & Direction · city analysis',
  'Geomancy · cities of wealth': 'Location & Direction · Cities of wealth',
  'Geomancy · Cities of wealth': 'Location & Direction · Cities of wealth',
}

/** 把任意 kind / 历史字面量统一成英文展示名 */
export function kindLabelEn(kind: string): string {
  return KIND_EN[kind] ?? LEGACY_KIND_EN[kind] ?? kind.replace(/Geomancy/g, 'Location & Direction')
}

export const LEGACY_BADGE_EN = 'Chinese legacy report'
export const REGENERATE_EN = 'Regenerate in English'

/** 正文 CJK 比例：CJK 字符 / (CJK 字符 + 拉丁字母)，忽略标点数字空白 */
export function bodyCjkRatio(text: string): number {
  const cjk = (text.match(/[\u4e00-\u9fff]/g) ?? []).length
  const latin = (text.match(/[A-Za-z]/g) ?? []).length
  const total = cjk + latin
  return total === 0 ? 0 : cjk / total
}

/** 从各报告形状里抽取正文文本（AI 各卷 / fatebook paid 卷） */
export function reportBodyTexts(result: unknown): string[] {
  const root = (result ?? {}) as Record<string, unknown>
  const ai = root.ai as Record<string, unknown> | null | undefined
  const source = ai && typeof ai === 'object' ? ai : root
  const texts: string[] = []
  for (const value of Object.values(source)) {
    if (typeof value === 'string' && value.trim()) texts.push(value.trim())
  }
  return texts
}

/**
 * 中文旧报告判定：正文足够长且 CJK 占绝对多数。
 * 阈值 0.5 —— 中文段落通常 >0.9；英文正文（含拼音干支）为 0；混排说明文字不会越过阈值。
 */
export function isLegacyChineseReport(result: unknown): boolean {
  const texts = reportBodyTexts(result)
  if (texts.length === 0) return false
  const joined = texts.join('\n')
  if (joined.replace(/[\u4e00-\u9fff]/g, '').length < 20 && joined.length < 20) return false
  const cjk = (joined.match(/[\u4e00-\u9fff]/g) ?? []).length
  if (cjk < 20) return false
  return bodyCjkRatio(joined) >= 0.5
}
