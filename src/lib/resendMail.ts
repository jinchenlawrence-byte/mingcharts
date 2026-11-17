// Resend 发信最小客户端（阶段 D，2026-11-17）
//
// 为什么不用 SDK：只发一种事务邮件，REST 一个 fetch 足够；也避免多一个依赖。
// 纪律：
//   · 密钥与发件地址只从环境变量读（RESEND_API_KEY / RESEND_FROM），代码里不出现任何地址
//   · 缺凭据不抛异常，返回可观测的 reason，由调用方落审计事件（不能静默成功）
//   · 日志只打状态码与 Resend 的错误消息，绝不打印正文/链接（里面有认领令牌）

export type MailSendResult =
  | { ok: true; id: string | null }
  | { ok: false; reason: 'missing_api_key' | 'missing_from' | 'http_error' | 'network'; status?: number; detail?: string }

export interface MailPayload {
  to: string
  subject: string
  html: string
  text: string
}

/** 仅检查配置是否齐备（用于「先判断再轮换令牌」） */
export function mailConfigured(): { ok: true } | { ok: false; reason: 'missing_api_key' | 'missing_from' } {
  if (!process.env.RESEND_API_KEY?.trim()) return { ok: false, reason: 'missing_api_key' }
  if (!process.env.RESEND_FROM?.trim()) return { ok: false, reason: 'missing_from' }
  return { ok: true }
}

export async function sendMail(payload: MailPayload): Promise<MailSendResult> {
  const cfg = mailConfigured()
  if (!cfg.ok) return cfg

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY!.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM!.trim(),
        to: [payload.to],
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
      }),
      // 发信挂起不能拖垮 webhook 的 after() 或 cron（超时按 network 失败处理，可重试）
      signal: AbortSignal.timeout(15000),
    })
    const body = (await res.json().catch(() => null)) as { id?: string; message?: string; name?: string } | null
    if (!res.ok) {
      return {
        ok: false,
        reason: 'http_error',
        status: res.status,
        detail: (body?.message ?? body?.name ?? '').slice(0, 200),
      }
    }
    return { ok: true, id: body?.id ?? null }
  } catch (err) {
    return { ok: false, reason: 'network', detail: (err instanceof Error ? err.message : String(err)).slice(0, 200) }
  }
}
