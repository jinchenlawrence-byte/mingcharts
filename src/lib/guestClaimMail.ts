// 游客认领邮件（先付款后注册 · 阶段 D，2026-11-17）
//
// 触发：报告 ready 时由 guestReport 立即发一次；失败/缺凭据由 /api/cron/guest-orders 补发。
// 纪律（安全关键）：
//   · ★ 令牌在【发信这一刻】才生成：建单时库里只是占位哈希，raw token 从不落库。
//     每次发信都覆盖 claim_token_hash / claim_expires_at —— 重发即轮换，旧链接立即失效。
//   · 缺凭据（RESEND_API_KEY / RESEND_FROM）不抛异常、不悄悄成功：
//     写 claim_email_failed 审计事件（含原因），并打一条 ★ 日志，cron/后台能看出
//     「报告已生成但邮件没发出去」。
//   · 日志与审计都不记录 raw token / magic link（它们是可直接登录的凭证）。
import { createServerSupabase } from '@/lib/supabase'
import { claimExpiryFrom, generateClaimToken, hashClaimToken } from '@/lib/guestOrder'
import { buildClaimEmail, type ClaimLocale } from '@/lib/guestClaimCopy'
import { mailConfigured, sendMail } from '@/lib/resendMail'

type Admin = ReturnType<typeof createServerSupabase>

/** 认领邮件最多补发次数（缺凭据不计入：补配后还会继续发） */
export const CLAIM_EMAIL_MAX_ATTEMPTS = 5

export type ClaimMailOutcome = 'sent' | 'skipped' | 'failed'

interface ClaimOrderRow {
  id: string
  sku: string
  status: string
  locale: string
  buyer_email: string | null
  order_merchant_external_id: string
  report_title: string | null
  claimed_user_id: string | null
  claim_revoked_at: string | null
}

/** 认领页路径（与三棵树对应；callback 的 next 也用它） */
export function claimPathForLocale(locale: string, rawToken: string): string {
  const prefix = locale === 'en' ? '/en' : locale === 'zh-Hant' ? '/tw' : ''
  return `${prefix}/claim/${rawToken}`
}

/** 站点根地址：与 Waffo 用同一个变量，但不依赖支付密钥是否配好 */
function resolveAppUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (!raw) return null
  try {
    return new URL(raw).origin
  } catch {
    return null
  }
}

function asClaimLocale(locale: string): ClaimLocale {
  return locale === 'en' || locale === 'zh-Hant' ? locale : 'zh-Hans'
}

/** 缺凭据时给运维看的一句话（明确到「缺什么」） */
function missingLabel(reason: 'missing_api_key' | 'missing_from'): string {
  return reason === 'missing_api_key' ? 'RESEND_API_KEY' : 'RESEND_FROM'
}

/**
 * 发一封认领邮件。
 * sent    = Resend 已受理
 * skipped = 状态不允许（未 ready / 已认领 / 已退款）
 * failed  = 本次没发出去（原因已写审计；cron 会再试）
 */
export async function sendClaimEmail(admin: Admin, guestOrderId: string): Promise<ClaimMailOutcome> {
  const { data, error } = await admin
    .from('guest_orders')
    .select(
      'id, sku, status, locale, buyer_email, order_merchant_external_id, report_title, claimed_user_id, claim_revoked_at',
    )
    .eq('id', guestOrderId)
    .maybeSingle()
  if (error) throw error
  const order = data as ClaimOrderRow | null
  if (!order) return 'skipped'
  if (order.status !== 'ready' || order.claimed_user_id || order.claim_revoked_at) return 'skipped'

  if (!order.buyer_email) {
    await audit(admin, guestOrderId, 'claim_email_failed', { reason: 'missing_buyer_email' })
    console.error(`[guest-claim-mail] ★认领邮件未发出（订单缺少买家邮箱） guest=${guestOrderId}`)
    return 'failed'
  }
  if (order.sku !== 'fatebook') return 'skipped'

  // ★ 先检查配置：缺凭据时【不轮换令牌】（没发出去的链接不该让旧链接失效）
  const cfg = mailConfigured()
  if (!cfg.ok) {
    await audit(admin, guestOrderId, 'claim_email_failed', {
      reason: cfg.reason,
      missing: missingLabel(cfg.reason),
    })
    console.error(
      `[guest-claim-mail] ★报告已生成但认领邮件未发出：缺少 ${missingLabel(cfg.reason)} guest=${guestOrderId}`,
    )
    return 'failed'
  }

  const appUrl = resolveAppUrl()
  if (!appUrl) {
    await audit(admin, guestOrderId, 'claim_email_failed', {
      reason: 'app_url_missing',
      missing: 'NEXT_PUBLIC_APP_URL',
    })
    console.error(`[guest-claim-mail] ★认领邮件未发出：缺少 NEXT_PUBLIC_APP_URL guest=${guestOrderId}`)
    return 'failed'
  }

  // ★ 发信这一刻才生成 raw token，并覆盖占位哈希（重发即轮换）
  const rawToken = generateClaimToken()
  const rotated = await admin
    .from('guest_orders')
    .update({
      claim_token_hash: hashClaimToken(rawToken),
      claim_expires_at: claimExpiryFrom(),
      claim_revoked_at: null,
    })
    .eq('id', guestOrderId)
    .eq('status', 'ready')
    .is('claimed_user_id', null)
    .select('id')
  if (rotated.error) throw rotated.error
  if (!rotated.data || rotated.data.length === 0) return 'skipped'

  const claimPath = claimPathForLocale(order.locale, rawToken)
  const claimUrl = `${appUrl}${claimPath}`

  const link = await buildMagicLink(admin, order.buyer_email)
  if (!link.ok) {
    await audit(admin, guestOrderId, 'claim_email_failed', { reason: link.reason, detail: link.detail })
    console.error(
      `[guest-claim-mail] ★认领邮件未发出（生成登录链接失败） guest=${guestOrderId}: ${link.reason}`,
    )
    return 'failed'
  }

  const magicUrl = `${appUrl}/auth/callback?token_hash=${encodeURIComponent(link.hashedToken)}&type=magiclink&next=${encodeURIComponent(claimPath)}`
  const mail = buildClaimEmail({
    locale: asClaimLocale(order.locale),
    magicUrl,
    claimUrl,
    ref: order.order_merchant_external_id,
    title: order.report_title ?? 'Fate Book',
  })

  const sent = await sendMail({
    to: order.buyer_email,
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
  })
  if (!sent.ok) {
    await audit(admin, guestOrderId, 'claim_email_failed', {
      reason: sent.reason,
      status: sent.status ?? null,
      detail: sent.detail ?? null,
    })
    console.error(
      `[guest-claim-mail] ★报告已生成但认领邮件未发出 guest=${guestOrderId} reason=${sent.reason}` +
        (sent.status ? ` status=${sent.status}` : ''),
    )
    return 'failed'
  }

  // 审计只记可核对的信息，不记链接/令牌
  await audit(admin, guestOrderId, 'claim_email_sent', {
    email: order.buyer_email,
    resend_id: sent.id,
  })
  return 'sent'
}

type MagicLinkResult =
  | { ok: true; hashedToken: string }
  | { ok: false; reason: string; detail?: string }

/**
 * 生成 magiclink 的 hashed_token（给自有域名 callback 用）。
 * 账号不存在时先建号（邮箱已确认，不要求设密码），再重试一次。
 */
async function buildMagicLink(admin: Admin, email: string): Promise<MagicLinkResult> {
  const first = await admin.auth.admin.generateLink({ type: 'magiclink', email })
  if (!first.error) {
    const token = first.data?.properties?.hashed_token
    if (token) return { ok: true, hashedToken: token }
    return { ok: false, reason: 'link_missing_token' }
  }

  if (!isUserNotFound(first.error)) {
    return { ok: false, reason: 'generate_link_failed', detail: first.error.message.slice(0, 200) }
  }

  const created = await admin.auth.admin.createUser({ email, email_confirm: true })
  if (created.error && !/already|exists|registered/i.test(created.error.message)) {
    return { ok: false, reason: 'create_user_failed', detail: created.error.message.slice(0, 200) }
  }

  const second = await admin.auth.admin.generateLink({ type: 'magiclink', email })
  if (second.error) {
    return { ok: false, reason: 'generate_link_failed', detail: second.error.message.slice(0, 200) }
  }
  const token = second.data?.properties?.hashed_token
  if (!token) return { ok: false, reason: 'link_missing_token' }
  return { ok: true, hashedToken: token }
}

function isUserNotFound(err: { message?: string; status?: number }): boolean {
  const msg = err.message ?? ''
  return err.status === 404 || /user not found|no user|not found/i.test(msg)
}

export interface ClaimMailRetryResult {
  sent: number
  failed: number
  skipped: number
  /** true = 凭据没配齐，本轮整体跳过（不烧审计次数，补配后继续发） */
  notConfigured?: boolean
}

/**
 * cron 补发：ready 且从未成功发过、失败次数未用尽的订单。
 * ★ 缺凭据直接整体跳过：否则每 10 分钟写一条失败事件，审计表会被噪音淹没。
 */
export async function retryClaimEmails(admin: Admin, limit = 2): Promise<ClaimMailRetryResult> {
  const cfg = mailConfigured()
  if (!cfg.ok) {
    console.warn(
      `[guest-claim-mail] 认领邮件暂停补发：缺少 ${missingLabel(cfg.reason)}（报告已生成，配置后会自动补发）`,
    )
    return { sent: 0, failed: 0, skipped: 0, notConfigured: true }
  }

  const { data, error } = await admin
    .from('guest_orders')
    .select('id')
    .eq('status', 'ready')
    .is('claimed_user_id', null)
    .is('claim_revoked_at', null)
    // 付款后 60 秒内不抢：先让 webhook 的 after() 把首封邮件发完，避免两封
    // 同时发出、后一封把前一封的链接轮换掉（旧链接失效给用户看）
    .lt('paid_at', new Date(Date.now() - 60 * 1000).toISOString())
    .order('paid_at', { ascending: true })
    .limit(limit * 5)
  if (error) throw error
  if (!data?.length) return { sent: 0, failed: 0, skipped: 0 }

  const ids = data.map((o) => (o as { id: string }).id)
  const { data: events, error: evErr } = await admin
    .from('guest_order_events')
    .select('guest_order_id, event')
    .in('guest_order_id', ids)
    .in('event', ['claim_email_sent', 'claim_email_failed'])
  if (evErr) throw evErr

  const sentIds = new Set<string>()
  const failures = new Map<string, number>()
  for (const e of (events ?? []) as { guest_order_id: string; event: string }[]) {
    if (e.event === 'claim_email_sent') sentIds.add(e.guest_order_id)
    else failures.set(e.guest_order_id, (failures.get(e.guest_order_id) ?? 0) + 1)
  }

  const out: ClaimMailRetryResult = { sent: 0, failed: 0, skipped: 0 }
  let processed = 0
  for (const id of ids) {
    if (processed >= limit) break
    if (sentIds.has(id)) continue
    if ((failures.get(id) ?? 0) >= CLAIM_EMAIL_MAX_ATTEMPTS) continue
    const outcome = await sendClaimEmail(admin, id)
    if (outcome === 'sent') {
      out.sent++
      processed++
    } else if (outcome === 'failed') {
      out.failed++
      processed++
    } else {
      out.skipped++
    }
  }
  return out
}

async function audit(
  admin: Admin,
  guestOrderId: string,
  event: 'claim_email_sent' | 'claim_email_failed',
  detail: Record<string, unknown>,
): Promise<void> {
  try {
    await admin.from('guest_order_events').insert({ guest_order_id: guestOrderId, event, detail })
  } catch (e) {
    console.warn('[guest-claim-mail] 写审计流水失败（不阻断）:', e)
  }
}
