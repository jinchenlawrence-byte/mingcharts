// 报告级权益判定（单一事实源，2026-11-08）
// ★ 背景：追问入口与「重新生成报告」曾各自写条件，导致同一份免费试读报告
//   看不到追问、却看到付费动作。这里把两处统一到同一组判定：
//   · paid：这份报告是否已付费解锁（以详情页按当前权益重算后的 locked 为准）
//   · canAsk / askRemaining：能否追问、剩余次数（次数由服务端 /api/ask 下发）
//   · canRegen / regenRemaining：能否重新生成（现有定价页未承诺次数，故不限次）
// ★ 纯函数，客户端与服务端都可引用；不读数据库、不做网络请求。
import { REPORT_GATE, canRegenContent } from './reportGate'
import type { ReportKind } from './reportSave'

export interface ReportAccess {
  /** 这份报告是否已付费解锁 */
  paid: boolean
  /** 免费试读（paid 的反面，便于 UI 直接分支） */
  trial: boolean
  /** 能否追问（报告已付费 + 账号有追问权益） */
  canAsk: boolean
  /** 剩余追问次数；null = 尚未取到 */
  askRemaining: number | null
  /** 能否重新生成（报告已付费；详情页还要看存档输入是否完整） */
  canRegen: boolean
  /** 可用重新生成次数；null = 现有定价未承诺次数（不新造上限，由服务端限流兜底） */
  regenRemaining: null
}

/**
 * 这份报告是否已付费解锁。
 * · 详情页的 content 已经过 gateReportForDetail 按当前权益重算：locked=null 即可见全文。
 * · 模块页的 content 来自生成接口：未付费时 locked 非空、preview.only=true。
 * · 命书（fatebook）正文在 charts 表，不走本判定，视为已付费。
 */
export function isReportPaid(kind: ReportKind, content: unknown): boolean {
  const gate = REPORT_GATE[kind]
  if (!gate) return true
  if (!content || typeof content !== 'object') return false
  const c = content as { locked?: unknown; preview?: { only?: boolean } | null }
  if (c.preview?.only === true) return false
  return c.locked == null
}

export function reportAccess(args: {
  kind: ReportKind
  content?: unknown
  ask?: { allowed?: boolean; remaining?: number | null } | null
  /** 详情页传入存档 input；模块页不传（不存在回放问题） */
  regenInput?: unknown
}): ReportAccess {
  const paid = isReportPaid(args.kind, args.content)
  const askAllowed = args.ask?.allowed === true
  const askRemaining = typeof args.ask?.remaining === 'number' ? args.ask.remaining : null
  return {
    paid,
    trial: !paid,
    canAsk: paid && askAllowed,
    askRemaining,
    canRegen: paid && (args.regenInput === undefined || canRegenContent(args.kind, args.regenInput)),
    regenRemaining: null,
  }
}
