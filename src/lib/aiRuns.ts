// AI 运行观测写入（ai_runs）
//
// 目标（2026-11-09）：成功与失败两条路径都留痕，失败时 usage 不再被丢弃。
// ★ 静默降级：观测写入失败只会 console.warn，绝不阻断报告生成主流程。
import type { SupabaseClient } from '@supabase/supabase-js'
import type { AIUsage } from './ai-types'
import type { AiFailCode } from './aiReason'

export type AiRunOutcome = 'success' | 'partial' | 'failure'

export interface AiRunInput {
  module: string
  locale: string
  outcome: AiRunOutcome
  reason?: AiFailCode | null
  hits?: string[]
  /** 降级为规则版的板块数（紫微） */
  degraded?: number
  /** 板块总数（紫微 12） */
  sections?: number
  usage?: AIUsage | null
  durationMs?: number | null
  requestId?: string | null
  deploymentId?: string | null
}

/** Vercel 部署标识：优先 deployment id，回退 commit sha */
export function aiDeploymentId(): string | null {
  return process.env.VERCEL_DEPLOYMENT_ID || process.env.VERCEL_GIT_COMMIT_SHA || null
}

export async function logAiRun(client: SupabaseClient | null, input: AiRunInput): Promise<void> {
  if (!client) return
  try {
    const usage = input.usage
    const { error } = await client.from('ai_runs').insert({
      module: input.module,
      locale: input.locale,
      outcome: input.outcome,
      reason: input.reason ?? null,
      hits: input.hits ?? [],
      degraded: input.degraded ?? 0,
      sections: input.sections ?? null,
      prompt_tokens: usage?.prompt_tokens ?? 0,
      completion_tokens: usage?.completion_tokens ?? 0,
      total_tokens: usage?.total_tokens ?? 0,
      duration_ms: input.durationMs ?? null,
      request_id: input.requestId ?? null,
      deployment_id: input.deploymentId ?? aiDeploymentId(),
    } as never)
    if (error) console.warn('[ai-runs] 观测记录写入失败:', error.message)
  } catch (e) {
    console.warn('[ai-runs] 观测记录写入异常:', e instanceof Error ? e.message : String(e))
  }
}
