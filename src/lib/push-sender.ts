// ─────────────────────────────────────────────────────────────
// Web Push 发送端（仅服务端 / Node runtime）。
//
// ★ VAPID 私钥只在此处读取（服务端 env），绝不进客户端 bundle。
// ★ 10s 超时：单个 endpoint 卡住不拖垮整轮定时任务。
// ★ setPushSenderForTest 对齐 src/lib/supabase.ts 的注入点先例 ——
//   验收脚本可注入假发送器，密封运行（不触真实推送网关）。生产代码永不调用。
// ─────────────────────────────────────────────────────────────
import webpush from 'web-push'
import type { PushSubInput } from './push-repo'

export interface SendResult {
  statusCode: number
  ok: boolean
  /** 该 endpoint 已失效（404/410）：应停用，不再重试 */
  gone?: boolean
  error?: string
}

export type PushSender = (sub: PushSubInput, payload: string) => Promise<SendResult>

let injectedSender: PushSender | null = null

/** ★ 测试注入点：注入假发送器（传 null 复原） */
export function setPushSenderForTest(fn: PushSender | null): void {
  injectedSender = fn
}

/** 该状态码表示订阅已失效（浏览器/推送服务已注销该 endpoint） */
export function isEndpointGone(statusCode: number): boolean {
  return statusCode === 404 || statusCode === 410
}

let vapidReady = false
function ensureVapid(): void {
  if (vapidReady) return
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT
  if (!pub || !priv || !subject) {
    throw new Error('VAPID 未配置（需 NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT）')
  }
  webpush.setVapidDetails(subject, pub, priv)
  vapidReady = true
}

/** 单条推送发送（带 10s 超时）。失败不抛错，统一以 SendResult 表达。 */
export async function sendNotification(sub: PushSubInput, payload: string): Promise<SendResult> {
  if (injectedSender) return injectedSender(sub, payload)
  ensureVapid()
  try {
    const res = await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      payload,
      { timeout: 10000 }
    )
    return { statusCode: res.statusCode, ok: res.statusCode >= 200 && res.statusCode < 300 }
  } catch (e) {
    const statusCode = (e as { statusCode?: number }).statusCode ?? 0
    return {
      statusCode,
      ok: false,
      gone: isEndpointGone(statusCode),
      error: e instanceof Error ? e.message : String(e),
    }
  }
}
