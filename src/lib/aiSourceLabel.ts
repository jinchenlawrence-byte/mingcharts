// AI 文字来源标签（三语单一事实源）
//
// 背景（2026-11-09）：此前 4 个报告模块的所有 AI 失败一律显示「规则版（AI结果未过合规校验）」，
// 用户与客服都无法分辨是无 key、超时、截断还是真合规命中。入库的 aiSource 保持中文稳定值
// （缓存/真 AI 判据依赖），展示层统一经本文件按 locale 输出简体 / 繁体 / 英文。
import type { SiteLang } from './lang'
import { localize } from './hant'
import { isAiFailCode, uniqHits, type AiFailCode } from './aiReason'

export interface AiSourceViewData {
  aiSource?: string | null
  /** 失败原因码（route 下发；旧报告可能缺失） */
  aiReason?: string | null
  /** 失败细节（板块名 / 依据分级缺失等） */
  aiReasonDetail?: string | null
  /** 合规命中词 */
  aiHits?: string[] | null
  /** 紫微：本次降级为规则版的板块数 */
  aiDegraded?: number | null
  /** 紫微：板块总数（12） */
  aiSections?: number | null
}

type ReasonLabel = (detail: string, hits: string[]) => string

const HANS: Record<AiFailCode, ReasonLabel> = {
  no_key: () => '规则版（AI 服务未配置密钥）',
  http_error: (d) => d ? `规则版（AI 服务暂时不可用，HTTP ${d}）` : '规则版（AI 服务暂时不可用）',
  timeout: () => '规则版（AI 服务响应超时）',
  truncated: () => '规则版（AI 输出被长度上限截断）',
  json_invalid: () => '规则版（AI 返回内容格式无法解析）',
  section_short: (d) => d ? `规则版（AI 输出板块内容过短：${d}）` : '规则版（AI 输出板块内容过短）',
  compliance: (d, hits) => hits.length
    ? `规则版（AI 输出未通过合规校验：命中「${hits.join('」「')}」）`
    : `规则版（AI 输出未通过合规校验：${d || '规则校验未通过'}）`,
  unknown: () => '规则版（AI 生成失败，原因未知）',
}

const HANT: Record<AiFailCode, ReasonLabel> = {
  no_key: () => '規則版（AI 服務未設定金鑰）',
  http_error: (d) => d ? `規則版（AI 服務暫時無法使用，HTTP ${d}）` : '規則版（AI 服務暫時無法使用）',
  timeout: () => '規則版（AI 服務回應逾時）',
  truncated: () => '規則版（AI 輸出因長度上限被截斷）',
  json_invalid: () => '規則版（AI 回傳內容格式無法解析）',
  section_short: (d) => d ? `規則版（AI 輸出的板塊內容過短：${d}）` : '規則版（AI 輸出的板塊內容過短）',
  compliance: (d, hits) => hits.length
    ? `規則版（AI 輸出未通過合規校驗：命中「${hits.join('」「')}」）`
    : `規則版（AI 輸出未通過合規校驗：${d || '規則校驗未通過'}）`,
  unknown: () => '規則版（AI 產生失敗，原因未知）',
}

const EN: Record<AiFailCode, ReasonLabel> = {
  no_key: () => 'Rule-based version (AI service is not configured)',
  http_error: (d) => d ? `Rule-based version (AI service temporarily unavailable, HTTP ${d})` : 'Rule-based version (AI service temporarily unavailable)',
  timeout: () => 'Rule-based version (AI service timed out)',
  truncated: () => 'Rule-based version (AI output was cut off by the length limit)',
  json_invalid: () => 'Rule-based version (AI returned an unreadable format)',
  section_short: (d) => d ? `Rule-based version (AI returned a section that was too short: ${d})` : 'Rule-based version (AI returned a section that was too short)',
  compliance: (_d, hits) => hits.length
    ? `Rule-based version (AI output failed the compliance check: ${hits.map((h) => `"${h}"`).join(', ')})`
    : 'Rule-based version (AI output failed the compliance check)',
  unknown: () => 'Rule-based version (AI generation failed for an unknown reason)',
}

const TABLES: Record<SiteLang, Record<AiFailCode, ReasonLabel>> = {
  'zh-Hans': HANS,
  'zh-Hant': HANT,
  en: EN,
}

function degradedLabel(degraded: number, total: number, locale: SiteLang): string {
  if (degraded >= total) {
    if (locale === 'zh-Hant') return `規則版（${total} 個板塊全部回退為規則版）`
    if (locale === 'en') return `Rule-based version (all ${total} sections were rule-based)`
    return `规则版（${total} 个板块全部回退为规则版）`
  }
  if (locale === 'zh-Hant') return `AI 深度解讀（${total} 個板塊中 ${degraded} 個為規則版）`
  if (locale === 'en') return `AI in-depth reading (${degraded} of ${total} sections use the rule-based text)`
  return `AI 深度解读（${total} 个板块中 ${degraded} 个为规则版）`
}

function regularSourceLabel(aiSource: string, locale: SiteLang): string {
  if (aiSource === '未解锁') {
    if (locale === 'zh-Hant') return '未解鎖'
    if (locale === 'en') return 'Locked'
    return '未解锁'
  }
  if (aiSource.includes('当日 AI 额度')) {
    if (locale === 'zh-Hant') return '規則版（當日 AI 額度已用盡，次日恢復）'
    if (locale === 'en') return 'Rule-based version (daily AI quota used up; restores tomorrow)'
    return '规则版（当日 AI 额度已用尽，次日恢复）'
  }
  if (aiSource.includes('登录后可见')) {
    if (locale === 'zh-Hant') return '規則版（登入後可見 AI 深度解讀）'
    if (locale === 'en') return 'Rule-based version (sign in to view the AI reading)'
    return '规则版（登录后可见 AI 深度解读）'
  }
  return localize(aiSource, locale)
}

/**
 * 报告展示用的文字来源标签。
 * · 成功（含紫微部分降级）→「AI 深度解读」；degraded>0 时补「N 个板块中 X 个为规则版」
 * · 失败 → 按 reason 输出具体原因（三语）
 * · 旧报告（无 aiReason）→ 回退原文，不误标
 */
export function aiSourceLabel(data: AiSourceViewData, locale: SiteLang): string {
  const src = (data.aiSource ?? '').trim()
  if (!src) return ''

  if (src.startsWith('AI 深度解读')) {
    const total = Math.max(1, Math.trunc(data.aiSections ?? 12))
    const degraded = Math.max(0, Math.min(total, Math.trunc(data.aiDegraded ?? 0)))
    if (degraded > 0) return degradedLabel(degraded, total, locale)
    if (locale === 'zh-Hant') return 'AI 深度解讀'
    if (locale === 'en') return 'AI in-depth reading'
    return 'AI 深度解读'
  }

  const reason = isAiFailCode(data.aiReason) ? data.aiReason : null
  if (!reason) return regularSourceLabel(src, locale)

  const detail = String(data.aiReasonDetail ?? '')
  const hits = uniqHits(data.aiHits)
  return TABLES[locale][reason](detail, hits)
}
