// AI 调用基础设施（单一事实源）：并发阀门、429/503 退避、max_tokens 分档、失败可观测
//
// 背景（2026-11-03）：线上付费用户 2/3 拿不到命书 AI 报告。根因是两个：
//   ① 十板块一次并行打 10 个请求，遇到 429/503 没有退避，整批一起炸；
//   ② 单板块固定 max_tokens=2000，长板块（大运流年/格局/调候）被截断，
//      JSON 不完整 → 整份 null → 用户拿到规则版。
// 本文件只做「怎么调用」；「写什么」仍由各 ai*.ts 的 prompt/校验负责。

import type { AIUsage } from './ai-types'

/** 并发阀门：默认 2，可用 AI_CONCURRENCY 覆盖（1–10 夹取） */
function intEnv(name: string, fallback: number, min: number, max: number): number {
  const raw = Number(process.env[name])
  if (!Number.isFinite(raw) || raw <= 0) return fallback
  return Math.min(max, Math.max(min, Math.trunc(raw)))
}

export function aiConcurrency(): number {
  return intEnv('AI_CONCURRENCY', 2, 1, 10)
}

/** 429/503 最大重试次数（不含首次请求） */
export function aiMaxRetries(): number {
  return intEnv('AI_MAX_RETRIES', 3, 0, 6)
}

/**
 * 板块 max_tokens 分档（用户拍板 2026-11-03：按板块分档）。
 * 键为各模块的 section key；未列出的键走 fallback（默认 2000）。
 * escalated=true 用于「该板块重试一次」，放大 2 倍。
 */
const SECTION_TOKEN_TIERS: Record<string, number> = {
  // 命书十卷（2026-11-03 实测回填：1200/800 档在「500-600 字」板块仍截断两次，故上调）
  overview: 1600,
  personality: 1600,
  yongShen: 1600,
  geJuAnalysis: 2400,
  tiaoHou: 2400,
  daYunAnalysis: 2400,
  career: 1600,
  marriage: 1600,
  children: 1200,
  health: 1200,
  // 紫微十二卷
  palaces: 2400,
  transforms: 2000,
  patterns: 2000,
  decadal: 2400,
  yearly: 2000,
  advice: 1600,
}

export function sectionMaxTokens(key: string, escalated = false, fallback = 2000): number {
  const base = SECTION_TOKEN_TIERS[key] ?? fallback
  // 截断重试放大 2 倍（cap 4000）：实测 ×1.5 仍可能二次截断
  return escalated ? Math.min(4000, base * 2) : base
}

/** 失败可观测（只写日志：不落用户正文、不落密钥） */
export interface AiRunStats {
  module: string
  /** 实际发出的 HTTP 请求数（含重试） */
  requests: number
  /** 429/503 退避次数 */
  retries: number
  /** 因 finish_reason=length 触发的截断次数 */
  truncations: number
  /** 单板块合规则重写次数 */
  sectionRetries: number
  /** 最终降级为规则版的板块 key */
  degraded: string[]
  startedAt: number
  usage: AIUsage
}

export function newStats(module: string): AiRunStats {
  return {
    module,
    requests: 0,
    retries: 0,
    truncations: 0,
    sectionRetries: 0,
    degraded: [],
    startedAt: Date.now(),
    usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
  }
}

export function addUsage(stats: AiRunStats, usage?: AIUsage): void {
  if (!usage) return
  stats.usage.prompt_tokens += usage.prompt_tokens || 0
  stats.usage.completion_tokens += usage.completion_tokens || 0
  stats.usage.total_tokens += usage.total_tokens || 0
}

/** 每份报告收尾打一行结构化日志：板块成功数/重试/截断/降级/耗时/token */
export function logAiStats(stats: AiRunStats, opts: { locale?: string; total: number }): void {
  const ok = opts.total - stats.degraded.length
  console.info(
    `[ai-stats] module=${stats.module} locale=${opts.locale || 'zh-Hans'} ` +
      `sections=${ok}/${opts.total} requests=${stats.requests} retries=${stats.retries} ` +
      `truncations=${stats.truncations} sectionRetries=${stats.sectionRetries} ` +
      `degraded=${stats.degraded.length ? stats.degraded.join(',') : 'none'} ` +
      `duration=${Date.now() - stats.startedAt}ms ` +
      `tokens=${stats.usage.total_tokens}(prompt ${stats.usage.prompt_tokens}/completion ${stats.usage.completion_tokens})`
  )
}

/** 并发受限地依次执行（保持结果顺序）；limit<=1 即完全串行 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const out = new Array<R>(items.length)
  let cursor = 0
  const workers = Array.from({ length: Math.min(Math.max(1, limit), items.length) }, async () => {
    while (true) {
      const index = cursor++
      if (index >= items.length) return
      out[index] = await fn(items[index], index)
    }
  })
  await Promise.all(workers)
  return out
}

export interface CompletionOutcome {
  ok: boolean
  status: number
  content?: string
  /** finish_reason=length：输出被 max_tokens 截断 */
  truncated: boolean
  usage?: AIUsage
  error?: string
}

interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: string }; finish_reason?: string }>
  usage?: AIUsage
  error?: { message?: string }
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/** 指数退避 + 抖动（429/503 专用）：800ms 起，上限 8s */
function backoffMs(attempt: number): number {
  const base = Math.min(8000, 800 * 2 ** attempt)
  return Math.round(base * (1 + Math.random() * 0.35))
}

/**
 * 带退避的 chat/completions 请求。
 * ★ 只对 429/503（限流/过载）退避重试；4xx 其他错误立即返回，避免无谓烧额度。
 * ★ 超时（AbortError）不重试：单次已等满 AI_TIMEOUT_MS，再等一次只会拖垮请求。
 */
export async function requestCompletion(args: {
  baseUrl: string
  apiKey: string
  model: string
  messages: Array<{ role: string; content: string }>
  maxTokens: number
  temperature: number
  timeoutMs: number
  json?: boolean
  stats?: AiRunStats
}): Promise<CompletionOutcome> {
  const maxRetries = aiMaxRetries()
  let lastStatus = 0
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), args.timeoutMs)
    try {
      if (args.stats) args.stats.requests++
      const res = await fetch(`${args.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${args.apiKey}`,
        },
        body: JSON.stringify({
          model: args.model,
          max_tokens: args.maxTokens,
          temperature: args.temperature,
          ...(args.json === false ? {} : { response_format: { type: 'json_object' } }),
          messages: args.messages,
        }),
        signal: controller.signal,
      })
      lastStatus = res.status

      if (!res.ok) {
        // 429/503 是限流/过载：退避后重试（用户拍板 2026-11-03 第1条）
        if ((res.status === 429 || res.status === 503) && attempt < maxRetries) {
          if (args.stats) args.stats.retries++
          const wait = backoffMs(attempt)
          console.warn(`[ai-call] HTTP ${res.status}，退避 ${wait}ms 后重试（第 ${attempt + 1}/${maxRetries} 次）`)
          await sleep(wait)
          continue
        }
        return { ok: false, status: res.status, truncated: false, error: `HTTP ${res.status}` }
      }

      const data = (await res.json()) as ChatCompletionResponse
      if (data.error) {
        return { ok: false, status: res.status, truncated: false, error: data.error.message }
      }
      const choice = data.choices?.[0]
      const content = choice?.message?.content
      if (!content) return { ok: false, status: res.status, truncated: false, error: 'empty content' }
      const truncated = choice?.finish_reason === 'length'
      if (truncated && args.stats) args.stats.truncations++
      return { ok: true, status: res.status, content, truncated, usage: data.usage }
    } catch (err) {
      // 超时不重试（见上）
      const aborted = err instanceof Error && err.name === 'AbortError'
      return {
        ok: false,
        status: lastStatus || 0,
        truncated: false,
        error: aborted ? 'timeout' : err instanceof Error ? err.message : String(err),
      }
    } finally {
      clearTimeout(timer)
    }
  }
  return { ok: false, status: lastStatus, truncated: false, error: 'retries exhausted' }
}

/** 剥离可能的 markdown 代码块并解析 JSON；失败返回 null */
export function parseJsonObject(content: string): Record<string, unknown> | null {
  const jsonText = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
  try {
    const parsed = JSON.parse(jsonText)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null
  } catch {
    return null
  }
}
