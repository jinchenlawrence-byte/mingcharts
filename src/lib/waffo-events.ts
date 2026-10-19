// ─────────────────────────────────────────────────────────────
// Waffo 支付的纯业务逻辑（不含 SDK / Supabase 具体实现，便于离线行为断言）
//   · 业务单号 MC-<userId>-<ts> 的生成与解析（越权校验依据）
//   · order.completed → payments 行的构造与幂等处理
//   · subscription.* → 会员权益（profiles）与订阅扣款（payments）的构造与幂等处理（档 C）
//   · verify-payment 的兜底对账（快路径 + GraphQL 反查补写）
// ─────────────────────────────────────────────────────────────
import type { WebhookEvent, WebhookEventData } from '@waffo/pancake-ts'
// ★ 套餐定义单一事实源（membership.ts → pricing.ts）：用于渠道未给周期末时的天数兜底。
//   仅值导入 PLANS（服务端离线可用，无 supabase/密钥依赖）；类型导入 PlanId。
import { PLANS, type PlanId } from './membership'

// ── 业务单号 ─────────────────────────────────────────────────
// 长度：MC-(3+1+36+1+13) = 54 字符，远小于 SDK 的 128 上限。
export function makeMerchantOrderId(userId: string): string {
  return `MC-${userId}-${Date.now()}`
}

// 注意 userId 是 UUID（自带 4 个连字符），所以用【最后一个 "-13位数字"】切分，
// 不能用 split('-')[1]。
const ORDER_ID_RE = /^MC-(.+)-(\d{13})$/

export function parseMerchantOrderId(ref: string): { userId: string; ts: number } | null {
  if (typeof ref !== 'string') return null
  const m = ORDER_ID_RE.exec(ref)
  if (!m) return null
  const ts = Number(m[2])
  if (!Number.isSafeInteger(ts) || ts <= 0) return null
  return { userId: m[1], ts }
}

// ── payments 写入行（列名与 supabase/schema.sql 的 payments 表一致）─────────
export interface PaidPaymentRow {
  user_id: string
  // ★ 命盘关联（HANDOFF-命书一份一付 §三，2026-10-13）：
  //   来自 orderMetadata.chartId，经【形态校验】（本文件 normalizeChartIdMeta）＋
  //   【归属校验】（handleWaffoEvent / reconcilePayment 落账前查 charts 表），
  //   任一不过即 null —— 绝不写 NULL 之外的猜测值；null=未关联（天然不匹配任何按盘判定，§〇-8）。
  chart_id: string | null
  amount: number // ★ Number(chargedAmount)，废弃的 amount/total 等字段一律不用
  // ★★ 购买的 SKU（2026-10-18 修复）：权益归集的【唯一依据】。
  //   payment_type='single' 只表示「一次性付款」，不表示买的是哪件商品——
  //   旧实现把所有单次购买一律归成 fatebook，导致买「紫微深度/合婚/地理/年运」
  //   既拿不到对应权益、又白送一份命书（真实事故）。故必须落库真实 SKU。
  //   取值 = checkout 时写入 metadata 的 sku（pricing.ts 的 SkuId）。
  //   空串 = 迁移前的老流水（均为命书单），归集层按历史行为兜底为 fatebook。
  sku: string
  // ★ 档 C（2026-10-18）：订阅扣款为 'monthly' | 'yearly'（会员），一次性订单仍为 'single'。
  //   与 schema.sql 的 CHECK (payment_type IN ('single','monthly','yearly','lifetime')) 对齐。
  payment_type: 'single' | 'monthly' | 'yearly'
  payment_method: 'card'
  status: 'paid'
  transaction_id: string // ★ Waffo 真实支付单号 PAY_xxx；绝不能是 MOCK_ 前缀
  order_merchant_external_id: string // ★ 兜底对账快路径 + 反查用户共同依赖
  paid_at: string // ISO 时间
  // ★ 订阅单号 ORD_xxx（档 C，仅审计；一次性订单为 null）。
  //   不参与判重——判重仍只靠 payments.transaction_id UNIQUE。
  order_id?: string | null
}

// ★ 会员列写入补丁（档 C，2026-10-18）。
//   契约：字段【省略 = 保持不变】，显式 null = 清空。
//   is_member 不在此列 —— 由仓库实现恒置 true（本表只在订阅【处于有效态】时写入：
//   激活 / 续期 / 已请求取消（本期内仍有效） / 已恢复）；失效由 member_expire_at 自然表达，
//   故 canceled 不清 is_member（详见 subscriptionStateFromEvent 的陷阱注释）。
export interface MembershipPatch {
  plan?: PlanId
  orderId?: string | null
  expireAt?: string | null
  autoRenew?: boolean
  cancelAt?: string | null
}

// 仓储接口：生产实现见 waffo-repo.ts；测试用内存实现镜像数据库唯一约束。
// ★ 幂等必须落在【数据库唯一约束】上，禁止「先 SELECT 再 INSERT」。
export interface WaffoPaymentRepository {
  // 幂等方案 (a) 辅：processed_webhooks 主键 (event_type,event_id)。
  // 返回 true=首次插入；false=重复投递。
  markEventProcessed(eventType: string, eventId: string): Promise<boolean>
  // 幂等方案 (b) 主：payments.transaction_id UNIQUE。
  // 返回 true=首次插入；false=唯一约束冲突（重复授予）。
  insertPaidPayment(row: PaidPaymentRow): Promise<boolean>
  // verify-payment 快路径：按业务单号查已落账支付。
  findPaidByExternalId(externalId: string): Promise<PaidPaymentRow | null>
  // ★ 命盘归属校验（HANDOFF-命书一份一付 §3.2）：查 charts 表返回该命盘的 user_id。
  //   命盘不存在 → null。落账前用它确认 metadata.chartId 确实属于该买家，
  //   否则恶意构造的 metadata 可把付款关联到【别人的命盘】。
  findChartUserId(chartId: string): Promise<string | null>
  /**
   * ★ SKU 回填（2026-10-18，可选实现）：把 payments.sku 列上线前落库的空 sku 补成真实值。
   * 声明为可选 —— 测试内存实现不必实现它（未实现时 reconcile 跳过回填，行为退化为原样）。
   */
  updatePaymentSku?(externalId: string, sku: string): Promise<void>
  // ★ 档 C（2026-10-18）会员写入，两件套：
  //   ① 读当前到期时间 —— 仅供 renew 的 extendMemberExpiry【取 max】用（不是判重，不是先查后写）
  findMemberExpiry(userId: string): Promise<string | null>
  //   ② 写会员列（service_role，绕 RLS）。is_member 恒置 true（见 MembershipPatch 契约）。
  patchMembership(userId: string, patch: MembershipPatch): Promise<void>
}

// GraphQL 反查得到的标准化支付节点（字段由 route 层从原始响应映射进来）
export interface RemotePaymentNode {
  paymentId: string
  status: string // 'succeeded' 才补写
  chargedAmount: string
  paymentDate?: string | null
  orderMerchantExternalId: string
  userId: string
  sku: string
  // ★ 远端 orderMetadata 里的 chartId（HANDOFF-命书一份一付 §3.2）：
  //   同样【不可信】—— 补写前必须经 normalizeChartIdMeta 形态校验 ＋ 归属校验
  chartId?: string
}

export interface RemotePaymentLookup {
  findSucceededPayment(orderMerchantExternalId: string): Promise<RemotePaymentNode | null>
}

export type HandleEventResult =
  | { kind: 'inserted'; userId: string; chartId: string | null } // ★ 归属随结果外带（2026-10-18）：route 落账后用它把命书写进「我的报告」
  | { kind: 'duplicate' } // processed_webhooks 命中，整条事件此前已处理
  | { kind: 'payment_conflict' } // transaction_id UNIQUE 命中（不同 eventId 的重投）
  | { kind: 'ignored_missing_user' } // metadata 与单号都拿不到 userId：记日志、返 200
  | { kind: 'ignored_invalid_payload'; reason: string } // 金额/单号异常：记日志、返 200
  | { kind: 'ignored_event'; eventType: string } // 订阅/退款/未知事件中【无需动库】者：只记日志
  // ★ 档 C（2026-10-18）订阅事件动库的两种结果：
  | { kind: 'membership_updated'; eventType: string; userId: string; action: 'activate' | 'renew' | 'canceling' | 'uncanceled' } // 写了 profiles 会员列
  | { kind: 'membership_recorded'; eventType: string; userId: string; plan: PlanId } // 订阅扣款已落 payments

// ★ chartId 形态校验（HANDOFF-命书一份一付 §3.2，§8.6.2 依据分级：不直接信任 metadata）：
//   是 string · 非空 · 长度合理（≤64，UUID 36 字符绰绰有余）→ 原样返回；否则 null。
//   buildPaidPaymentRow（webhook）与 normalizeGraphqlPayment（对账反查）共用此单一事实源。
export function normalizeChartIdMeta(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const v = raw.trim()
  if (v.length === 0 || v.length > 64) return null
  return v
}

// ★ chartId 归属校验（§3.2 安全点单一事实源）：metadata 里的 chartId 必须查 charts 表
//   确认 user_id 等于该买家，否则【恶意构造的 metadata 可把付款关联到别人的命盘】。
//   非法/不属于该用户 → 返回 null（写 NULL、不报错——只是失去关联，§3.2 明文）。
//   ★ 牙口锚点：去掉这里的归属校验 → test-fatebook-onepay ②断言② 精确翻红。
export async function resolveChartIdForUser(
  repo: WaffoPaymentRepository,
  rawChartId: unknown,
  userId: string,
): Promise<string | null> {
  const chartId = normalizeChartIdMeta(rawChartId)
  if (!chartId) return null
  const owner = await repo.findChartUserId(chartId)
  return owner === userId ? chartId : null
}

// 把 order.completed 事件映射成 payments 行；无法得到合法行时返回 null（调用方记日志）。
export function buildPaidPaymentRow(
  data: WebhookEventData,
  nowIso: string = new Date().toISOString(),
): PaidPaymentRow | null {
  const transactionId = data.paymentId
  const externalId = data.orderMerchantExternalId
  if (typeof transactionId !== 'string' || !transactionId.startsWith('PAY_')) return null
  if (typeof externalId !== 'string' || externalId.length === 0) return null

  const amount = Number(data.chargedAmount)
  if (!Number.isFinite(amount) || amount < 0) return null

  // userId 优先取 orderMetadata；缺失时从业务单号兜底解析
  const fromRef = parseMerchantOrderId(externalId)
  const userId = data.orderMetadata?.userId?.trim() || fromRef?.userId || ''
  if (!userId) return null

  const paidAt = data.paymentDate || nowIso

  const metaRec = data.orderMetadata as Record<string, unknown> | undefined
  // chartId：此处只做形态校验；归属校验在落账前统一走 resolveChartIdForUser（查库，纯函数做不了）
  const rawChartId = metaRec?.chartId
  // ★ SKU（2026-10-18 修复）：来自我方 checkout 时写入的 metadata.sku —— 权益归集的唯一依据。
  //   缺失时留空串（老流水/异常载荷）：归集层空 sku 按历史行为兜底为 fatebook，不臆断其它商品。
  const rawSku = metaRec?.sku

  return {
    user_id: userId,
    chart_id: normalizeChartIdMeta(rawChartId),
    amount,
    sku: typeof rawSku === 'string' ? rawSku.trim() : '',
    payment_type: 'single',
    payment_method: 'card',
    status: 'paid',
    transaction_id: transactionId,
    order_merchant_external_id: externalId,
    paid_at: paidAt,
  }
}

// ── 会员订阅（档 C，2026-10-18）：纯函数 + 事件分支 ───────────
// 设计要点：webhook 只管【把渠道事实写进 profiles/payments】；有效期判定仍是
// getMembership 按 member_expire_at 比对当下时间——所以「取消请求」与「终止」
// 都不需要（也不允许）改 is_member，避免把「本期内仍可用」错杀成失效。

/** 从 metadata.sku 判套餐：'member_monthly' → 'monthly'，'member_yearly' → 'yearly'。 */
export function planFromSku(sku: unknown): PlanId | null {
  if (sku === 'member_monthly') return 'monthly'
  if (sku === 'member_yearly') return 'yearly'
  return null
}

/** 从渠道计费周期判套餐；weekly/quarterly 未开售 → null（不臆断）。 */
export function planFromBillingPeriod(bp: unknown): PlanId | null {
  if (bp === 'monthly') return 'monthly'
  if (bp === 'yearly') return 'yearly'
  return null
}

/**
 * ★ 套餐判定单一事实源：① 首选 orderMetadata.sku（我方 checkout 自己写入，最可靠）；
 *   ② 兜底 billingPeriod（渠道字段）。都判不出 → null（调用方按 noop 记日志，不猜）。
 */
export function resolvePlan(data: WebhookEventData): PlanId | null {
  return planFromSku(data.orderMetadata?.sku) ?? planFromBillingPeriod(data.billingPeriod)
}

/**
 * ★ 订阅扣款的 payments 行（payment_succeeded 事件）。
 *   · payment_type = 'monthly' | 'yearly'（不再是 'single'）——会员续期与一次性购买可区分
 *   · sku = 会员 SKU —— 权益归集的唯一依据
 *   · transaction_id = PAY_xxx —— 幂等仍靠 payments.transaction_id UNIQUE
 *   · chart_id = null —— 订阅与单个命盘无关
 */
export function buildSubscriptionPaymentRow(
  data: WebhookEventData,
  plan: PlanId,
  nowIso: string = new Date().toISOString(),
): PaidPaymentRow | null {
  const transactionId = data.paymentId
  if (typeof transactionId !== 'string' || !transactionId.startsWith('PAY_')) return null

  const amount = Number(data.chargedAmount)
  if (!Number.isFinite(amount) || amount < 0) return null

  const userId = eventUserId(data)
  if (!userId) return null

  // 业务单号：订阅事件通常继承订单的 MC-<userId>-<ts>；异常缺失时用当前时间兜底，
  // 使这一行仍是【可审计的完整流水】（该列对订阅只作审计，reconcile 只用一次性订单的 ref）。
  const externalId = data.orderMerchantExternalId?.trim() || makeMerchantOrderId(userId)

  return {
    user_id: userId,
    chart_id: null,
    amount,
    sku: plan === 'monthly' ? 'member_monthly' : 'member_yearly',
    payment_type: plan,
    payment_method: 'card',
    status: 'paid',
    transaction_id: transactionId,
    order_merchant_external_id: externalId,
    paid_at: data.paymentDate || nowIso,
    order_id: data.orderId ?? null,
  }
}

/**
 * ★ 续期到期时间：取 max(现有到期, 本次周期末)，**不**无条件 +30/+365。
 *   理由：renewed 可能被重复投递，加法会二次叠加（用户白赚一期）；
 *   currentPeriodEnd 由渠道给出，已是权威的「本期末」，取 max 幂等且单调。
 *   注意：渠道给的是 ISO【日期】串（如 "2026-05-01"），不可解析时保留现有值（不降级为 null 清空）。
 */
export function extendMemberExpiry(
  currentIso: string | null,
  periodEndIso: string | null,
): string | null {
  const cur = currentIso ? new Date(currentIso).getTime() : NaN
  const next = periodEndIso ? new Date(periodEndIso).getTime() : NaN
  const curOk = Number.isFinite(cur)
  const nextOk = Number.isFinite(next)
  if (!curOk && !nextOk) return null
  if (!curOk) return new Date(next).toISOString()
  if (!nextOk) return new Date(cur).toISOString()
  return new Date(Math.max(cur, next)).toISOString()
}

// 订阅事件要做的动作（纯判定，不做 IO；由 applySubscriptionAction 落库）
export type SubscriptionAction =
  | { kind: 'activate'; plan: PlanId; orderId: string | null; periodEnd: string | null }
  | { kind: 'renew'; plan: PlanId; orderId: string | null; periodEnd: string | null }
  | { kind: 'record_payment'; plan: PlanId }
  | { kind: 'canceling'; canceledAt: string | null }
  | { kind: 'uncanceled' }
  | { kind: 'noop'; reason: string }

/**
 * 事件 → 动作。这是订阅行为的【唯一判定处】（纯函数，可离线逐条断言）。
 *
 * ★★ 两个陷阱（任务书 §3.4，官方文档原文要点）：
 *   1) 首期款会【双发】subscription.activated（挂订单，授权益）与
 *      subscription.payment_succeeded（挂扣款，记账），两者独立投递、都可能重投：
 *      授权益看 activated，记账看 payment_succeeded，各自做幂等，别重复授予。
 *   2) subscription.canceling 只是「请求取消、本期内仍有效」→ 只记录【不撤销】；
 *      只有 subscription.canceled（约在 currentPeriodEnd 才到达）才撤销。
 *      refund.failed 表示退款未完成 → 同样【不撤销】。
 */
export function subscriptionStateFromEvent(
  eventType: string,
  data: WebhookEventData,
): SubscriptionAction {
  switch (eventType) {
    case 'subscription.activated': {
      const plan = resolvePlan(data)
      if (!plan) return { kind: 'noop', reason: '无法从 sku/billingPeriod 判定套餐' }
      return {
        kind: 'activate',
        plan,
        orderId: data.orderId ?? null,
        periodEnd: data.currentPeriodEnd ?? null,
      }
    }
    // renewed = 本期滚动续费；recovered = 逾期后重试扣款成功（本期同样已滚动）→ 同语义
    case 'subscription.renewed':
    case 'subscription.recovered': {
      const plan = resolvePlan(data)
      if (!plan) return { kind: 'noop', reason: '无法从 sku/billingPeriod 判定套餐' }
      return {
        kind: 'renew',
        plan,
        orderId: data.orderId ?? null,
        periodEnd: data.currentPeriodEnd ?? null,
      }
    }
    // ★ 纯扣款事件：不含 orderStatus/currentPeriodEnd（d.ts 明示）→ 只记账，不碰会员有效期
    case 'subscription.payment_succeeded': {
      const plan = resolvePlan(data)
      if (!plan) return { kind: 'noop', reason: '无法从 sku/billingPeriod 判定套餐' }
      return { kind: 'record_payment', plan }
    }
    // ★ 陷阱 2：只记录「已请求取消」，本期内仍有效 → 不动 is_member
    case 'subscription.canceling':
      return { kind: 'canceling', canceledAt: data.canceledAt ?? null }
    case 'subscription.uncanceled':
      return { kind: 'uncanceled' }
    // 终止：到期自然失效（getMembership 按 member_expire_at 判），不清 is_member
    case 'subscription.canceled':
      return { kind: 'noop', reason: '订阅终止：到期自然失效，仅记日志' }
    case 'subscription.past_due':
      return { kind: 'noop', reason: '续费失败：等渠道重试/恢复事件，仅记日志' }
    default:
      // refund.succeeded / refund.failed（★ 退款未完成不撤销，陷阱 2）/ plan_changed 系列
      return { kind: 'noop', reason: '非会员状态事件：仅记日志' }
  }
}

// 订阅事件的归属用户：优先 orderMetadata.userId（我方 checkout 写入），缺失时从业务单号兜底解析
function eventUserId(data: WebhookEventData): string {
  const fromMeta = data.orderMetadata?.userId?.trim() || ''
  if (fromMeta) return fromMeta
  return parseMerchantOrderId(data.orderMerchantExternalId ?? '')?.userId ?? ''
}

// ISO/日期串规范化；不可解析 → null
function toIsoOrNull(raw: string | null | undefined): string | null {
  if (!raw) return null
  const ms = new Date(raw).getTime()
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null
}

const DAY_MS = 24 * 60 * 60 * 1000

// ★★ 开通到期时间（含兜底）：渠道 currentPeriodEnd 是【可选】字段——
//   若事件里缺失/不可解析，退回套餐天数（否则会出现「已扣款却无任何会员权益」）。
function activateExpiryIso(plan: PlanId, periodEnd: string | null): string | null {
  const fromChannel = toIsoOrNull(periodEnd)
  if (fromChannel) return fromChannel
  const days = PLANS[plan]?.days ?? 0
  return days > 0 ? new Date(Date.now() + days * DAY_MS).toISOString() : null
}

// ★★ 续期到期时间（含兜底 + 取 max）：渠道给了周期末 → extendMemberExpiry 取 max（防重复叠加）；
//   渠道未给 → 从 max(现有到期, 现在) 顺延套餐天数（否则「扣了钱却不续期」）。
function renewExpiryIso(current: string | null, plan: PlanId, periodEnd: string | null): string | null {
  const fromChannel = toIsoOrNull(periodEnd)
  if (fromChannel) return extendMemberExpiry(current, fromChannel)
  const days = PLANS[plan]?.days ?? 0
  if (days <= 0) return current
  const curMs = current ? new Date(current).getTime() : NaN
  const base = Number.isFinite(curMs) ? Math.max(curMs, Date.now()) : Date.now()
  return new Date(base + days * DAY_MS).toISOString()
}

// 把订阅动作落库（幂等闸口与一次性链路共用 processed_webhooks）
async function applySubscriptionAction(
  event: WebhookEvent<WebhookEventData>,
  action: SubscriptionAction,
  repo: WaffoPaymentRepository,
  nowIso: string,
): Promise<HandleEventResult> {
  const { eventType, eventId } = event
  const userId = eventUserId(event.data)
  if (!userId) return { kind: 'ignored_missing_user' }

  // 幂等闸口 (a)：先插 processed_webhooks，主键冲突即重复投递——不做任何后续动作。
  const firstTime = await repo.markEventProcessed(eventType, eventId)
  if (!firstTime) return { kind: 'duplicate' }

  switch (action.kind) {
    case 'activate': {
      // 首期开通：到期时间以渠道 currentPeriodEnd 为准（权威值，不做加法；缺失则天数兜底）
      const patch: MembershipPatch = {
        plan: action.plan,
        expireAt: activateExpiryIso(action.plan, action.periodEnd),
        autoRenew: true,
        cancelAt: null,
      }
      // ★ 订阅单号只在【真的有】时写入：契约「省略=保持不变」，故不得用 null 覆盖已存的 ORD_
      if (action.orderId) patch.orderId = action.orderId
      await repo.patchMembership(userId, patch)
      return { kind: 'membership_updated', eventType, userId, action: 'activate' }
    }

    case 'renew': {
      // ★ 取 max，防重复投递的 renewed 二次叠加；auto_renew / cancel_at 保持不动
      const current = await repo.findMemberExpiry(userId)
      const patch: MembershipPatch = {
        plan: action.plan,
        expireAt: renewExpiryIso(current, action.plan, action.periodEnd),
      }
      if (action.orderId) patch.orderId = action.orderId
      await repo.patchMembership(userId, patch)
      return { kind: 'membership_updated', eventType, userId, action: 'renew' }
    }

    case 'record_payment': {
      const row = buildSubscriptionPaymentRow(event.data, action.plan, nowIso)
      if (!row) return { kind: 'ignored_invalid_payload', reason: '订阅扣款 paymentId/chargedAmount 异常' }
      // 幂等闸口 (b)：transaction_id UNIQUE，冲突即已记过账
      const inserted = await repo.insertPaidPayment(row)
      return inserted
        ? { kind: 'membership_recorded', eventType, userId, plan: action.plan }
        : { kind: 'payment_conflict' }
    }

    case 'canceling':
      // ★ 只记录取消请求：本期内仍有效，不得撤销 is_member（陷阱 2）
      await repo.patchMembership(userId, {
        autoRenew: false,
        cancelAt: toIsoOrNull(action.canceledAt),
      })
      return { kind: 'membership_updated', eventType, userId, action: 'canceling' }

    case 'uncanceled':
      await repo.patchMembership(userId, { autoRenew: true, cancelAt: null })
      return { kind: 'membership_updated', eventType, userId, action: 'uncanceled' }

    case 'noop':
      return { kind: 'ignored_event', eventType }
  }
}

// 处理一个【已验签】的 webhook 事件。路由层必须先验签再调本函数。
export async function handleWaffoEvent(
  event: WebhookEvent<WebhookEventData>,
  repo: WaffoPaymentRepository,
  nowIso: string = new Date().toISOString(),
): Promise<HandleEventResult> {
  const { eventType, eventId } = event

  // ── 订阅域（档 C）：先纯判定要不要动库；无需动库的（退款/终止/逾期…）只留给路由层记日志 ──
  if (eventType !== 'order.completed') {
    const action = subscriptionStateFromEvent(eventType, event.data)
    if (action.kind === 'noop') return { kind: 'ignored_event', eventType }
    return applySubscriptionAction(event, action, repo, nowIso)
  }

  // 幂等闸口 (a)：先插 processed_webhooks，主键冲突即重复投递——不做任何后续动作。
  const firstTime = await repo.markEventProcessed(eventType, eventId)
  if (!firstTime) return { kind: 'duplicate' }

  const row = buildPaidPaymentRow(event.data, nowIso)
  if (!row) {
    // metadata 缺失/单号非法/金额异常：不抛错（抛错只会触发无意义重试），
    // 返 200 并依赖日志告警 → 人工补单。事件已在 processed_webhooks 留痕。
    const hasUser =
      (event.data.orderMetadata?.userId ?? '').length > 0 ||
      parseMerchantOrderId(event.data.orderMerchantExternalId ?? '') !== null
    return hasUser
      ? { kind: 'ignored_invalid_payload', reason: 'paymentId/chargedAmount/externalId 异常' }
      : { kind: 'ignored_missing_user' }
  }

  // ★ 命盘归属校验（HANDOFF-命书一份一付 §3.2 安全点）：metadata.chartId 必须属于该买家，
  //   否则写 NULL 不报错（单一事实源 resolveChartIdForUser；断言②有牙口守护）。
  const chartId = await resolveChartIdForUser(repo, event.data.orderMetadata?.chartId, row.user_id)
  const rowOwned: PaidPaymentRow = { ...row, chart_id: chartId }

  // 幂等闸口 (b)：transaction_id UNIQUE，冲突即已授过权益。
  const inserted = await repo.insertPaidPayment(rowOwned)
  return inserted ? { kind: 'inserted', userId: row.user_id, chartId } : { kind: 'payment_conflict' }
}

// ── 兜底对账（/api/verify-payment）──────────────────────────
export type ReconcileResult =
  | { status: 'rejected' } // 单号不属于该用户 / 无法解析：拒绝（防越权）
  | { status: 'pending' } // 本地与 Waffo 都查不到成功支付
  | { status: 'owned'; row: PaidPaymentRow }

export async function reconcilePayment(deps: {
  repo: WaffoPaymentRepository
  remote: RemotePaymentLookup
  userId: string
  ref: string
  nowIso?: string
}): Promise<ReconcileResult> {
  const { repo, remote, userId, ref } = deps
  const parsed = parseMerchantOrderId(ref)
  // ★ 解析不出 userId，或单号归属与登录用户不一致 → 拒绝（不做任何查询）
  if (!parsed || parsed.userId !== userId) return { status: 'rejected' }

  // ① 快路径：按业务单号查本地 payments（不用 transaction_id，那是 PAY_ 单号）
  const local = await repo.findPaidByExternalId(ref)
  if (local && local.status === 'paid') {
    // ★ SKU 回填（2026-10-18）：payments.sku 列上线【之前】落库的流水 sku 为空，
    //   而权益归集必须按 sku —— 不补的话，已买过紫微/合婚/地理/年运的用户永远拿不到
    //   自己的权益（真实事故）。首次方：我方 checkout 一直把 sku 写进 metadata，
    //   故远端 orderMetadata 里必有真实 sku；仅当本地缺失时才反查（正常快路径零额外请求）。
    if (!local.sku && repo.updatePaymentSku) {
      const node = await remote.findSucceededPayment(ref)
      if (node && node.status === 'succeeded' && node.sku) {
        await repo.updatePaymentSku(ref, node.sku)
        return { status: 'owned', row: { ...local, sku: node.sku } }
      }
    }
    return { status: 'owned', row: local }
  }

  // ② 反查 Waffo：webhook 可能丢了（3 次重试失败后无手动重发）
  const node = await remote.findSucceededPayment(ref)
  if (!node || node.status !== 'succeeded') return { status: 'pending' }

  // ★ 补写行同样做命盘归属校验（§3.2）：远端 metadata 的 chartId 同样不可信
  const chartId = await resolveChartIdForUser(repo, node.chartId, userId)

  const row: PaidPaymentRow = {
    user_id: userId, // 以登录态为准，不信远端 metadata 里的 userId
    chart_id: chartId,
    amount: Number(node.chargedAmount),
    sku: node.sku, // ★ 补写行同样按真实 SKU 归集（node.sku 由远端 orderMetadata 映射而来）
    payment_type: 'single',
    payment_method: 'card',
    status: 'paid',
    transaction_id: node.paymentId,
    order_merchant_external_id: ref,
    paid_at: node.paymentDate || deps.nowIso || new Date().toISOString(),
  }
  if (!Number.isFinite(row.amount) || row.amount < 0 || !row.transaction_id.startsWith('PAY_')) {
    return { status: 'pending' }
  }

  // ③ 补写（同一套幂等写入；冲突也视为已解锁）。
  //    ★ 必须带 order_merchant_external_id —— 否则下次快路径仍查不到。
  await repo.insertPaidPayment(row)
  const recheck = await repo.findPaidByExternalId(ref)
  return { status: 'owned', row: recheck ?? row }
}

// 把 GraphQL 原始响应容错映射为标准化节点；字段名以联调真实响应为准（回执列为校正点）。
// 取 payments 集合中第一个 succeeded 节点；没有则 null（调用方据此再试 onetimeOrders 或判 pending）。
export function normalizeGraphqlPayment(raw: unknown): RemotePaymentNode | null {
  type AnyRec = Record<string, unknown>
  const pick = (o: AnyRec, ...keys: string[]): unknown => {
    for (const k of keys) {
      if (o[k] !== undefined && o[k] !== null) return o[k]
    }
    return undefined
  }
  const obj = (raw ?? {}) as AnyRec
  const list = (pick(obj, 'payments') ?? []) as unknown[]
  const node = list.find((n) => {
    const r = (n ?? {}) as AnyRec
    return String(pick(r, 'status') ?? '').toLowerCase() === 'succeeded'
  }) as AnyRec | undefined
  if (!node) return null

  const paymentId = String(pick(node, 'paymentId', 'id') ?? '')
  const chargedAmount = String(pick(node, 'chargedAmount', 'amount') ?? '')
  const orderMerchantExternalId = String(pick(node, 'orderMerchantExternalId') ?? '')
  const paymentDateRaw = pick(node, 'paymentDate', 'createdAt')
  const meta = (pick(node, 'orderMetadata', 'metadata') ?? {}) as AnyRec
  const userId = String(meta.userId ?? '')
  const sku = String(meta.sku ?? 'fatebook')
  // ★ chartId 只做形态归一（RemotePaymentNode.chartId?: string）；归属校验在补写前统一做（§3.2）
  const chartIdRaw = normalizeChartIdMeta(meta.chartId)
  if (!paymentId || !chargedAmount || !orderMerchantExternalId) return null

  return {
    paymentId,
    status: 'succeeded',
    chargedAmount,
    paymentDate: paymentDateRaw ? String(paymentDateRaw) : null,
    orderMerchantExternalId,
    userId,
    sku,
    ...(chartIdRaw ? { chartId: chartIdRaw } : {}),
  }
}
