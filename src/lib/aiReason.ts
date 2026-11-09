// AI 失败原因（单一事实源）：把「AI 没出结果」拆成可区分、可统计的 reason
//
// 背景（2026-11-09 线上取证）：4 个报告模块把生成器的所有 null 一律写成
// 「规则版（AI结果未过合规校验）」，无 key / HTTP 错误 / 超时 / 截断 / JSON 解析失败 /
// 板块字数不足 / 真合规命中 全部混成一个标签，排查无门，失败路径的 usage 也被丢弃。
// 本文件只定义「失败是什么」，不改任何校验规则。
import type { AIUsage } from './ai-types'

export type AiFailCode =
  | 'no_key'       // 未配置 AI_API_KEY
  | 'http_error'   // HTTP 非 2xx（429/503 等，带 status）
  | 'timeout'      // AbortError 超时
  | 'truncated'    // finish_reason=length
  | 'json_invalid' // 内容不是可解析的 JSON 对象
  | 'section_short' // 板块缺失或低于字数下限
  | 'compliance'   // 真·合规命中（尽量带命中词）
  | 'unknown'      // 其他异常兜底

export const AI_FAIL_CODES: readonly AiFailCode[] = [
  'no_key', 'http_error', 'timeout', 'truncated',
  'json_invalid', 'section_short', 'compliance', 'unknown',
] as const

export interface AiFailure {
  code: AiFailCode
  /** 人读细节：板块名、HTTP 状态、解析错误、依据分级缺失等 */
  detail?: string
  /** 合规命中词（code=compliance 时尽量非空） */
  hits?: string[]
  /** HTTP 状态码（code=http_error 时） */
  status?: number
  /** 失败前已消耗的 token（失败路径不得丢弃） */
  usage?: AIUsage
  durationMs?: number
}

export function isAiFailCode(v: unknown): v is AiFailCode {
  return typeof v === 'string' && (AI_FAIL_CODES as readonly string[]).includes(v)
}

export function uniqHits(hits?: readonly string[] | null): string[] {
  return [...new Set((hits ?? []).map((h) => h.trim()).filter(Boolean))]
}

/** 聚合多条板块级失败：取出现次数最多的 code，命中词取并集 */
export function dominantFailure(failures: readonly AiFailure[]): AiFailure | null {
  if (!failures.length) return null
  const counts = new Map<AiFailCode, number>()
  for (const f of failures) counts.set(f.code, (counts.get(f.code) ?? 0) + 1)
  let top: AiFailCode = failures[0].code
  let topCount = -1
  for (const [code, n] of counts) {
    if (n > topCount) { top = code; topCount = n }
  }
  const picked = failures.filter((f) => f.code === top)
  return {
    code: top,
    detail: picked.find((f) => f.detail)?.detail,
    hits: uniqHits(picked.flatMap((f) => f.hits ?? [])),
  }
}

/**
 * 入库/旧渲染用的【中文稳定标签】。
 * ★ 必须以「规则版」开头：reportGate.isRuleVersion 与缓存自愈判据都依赖这个子串。
 */
export function aiSourceCode(f: AiFailure | null | undefined): string {
  if (!f) return '规则版（AI 生成失败，原因未知）'
  const hits = uniqHits(f.hits)
  switch (f.code) {
    case 'no_key':
      return '规则版（AI 服务未配置密钥）'
    case 'http_error':
      return f.status
        ? `规则版（AI 服务暂时不可用，HTTP ${f.status}）`
        : '规则版（AI 服务暂时不可用）'
    case 'timeout':
      return '规则版（AI 服务响应超时）'
    case 'truncated':
      return '规则版（AI 输出被长度上限截断）'
    case 'json_invalid':
      return '规则版（AI 返回内容格式无法解析）'
    case 'section_short':
      return f.detail
        ? `规则版（AI 输出板块内容过短：${f.detail}）`
        : '规则版（AI 输出板块内容过短）'
    case 'compliance':
      if (hits.length) return `规则版（AI 输出未通过合规校验：命中「${hits.join('」「')}」）`
      return `规则版（AI 输出未通过合规校验：${f.detail || '规则校验未通过'}）`
    case 'unknown':
      return '规则版（AI 生成失败，原因未知）'
  }
}
