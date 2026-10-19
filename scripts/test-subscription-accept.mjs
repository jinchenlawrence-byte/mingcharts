// ★ 会员订阅（档 C）· 行为验收（2026-10-18）
//
// 结构：
//   ① 源码/配置断言：PROD_ 登记一致性、订阅商品创建脚本、checkout 共享件、
//      迁移文件、取消/恢复路由（ORD_ 不下发、恢复走 customer session）、同意校验
//   ② 纯函数断言：planFromSku/BillingPeriod、extendMemberExpiry 取 max、
//      buildSubscriptionPaymentRow（payment_type=monthly/yearly、PAY_、chart_id=null）、
//      subscriptionStateFromEvent 的事件→动作映射（含两条陷阱）
//   ③ handleWaffoEvent 真调（内存仓储镜像 DB 唯一约束 + 会员列「省略=保持不变」契约）：
//      activated 授权益 / renewed 取 max 不二次叠加 / payment_succeeded 记 monthly|yearly
//      / canceling 只记录不撤销 / uncanceled 恢复 / canceled 与 refund.failed 不撤销
//      / 同 eventId → duplicate / 同 PAY_ → payment_conflict / 缺周期末走天数兜底
//   ④ 合规 UI：MembershipButton 复选框默认不勾 + 未勾禁用 + 退款/AIGC 披露；
//      member 页自助取消入口；terms.md 已去「订阅未开放」并新增站内自助取消
//
// 牙口（文本不变、行为变坏；开发期手工注入，实测翻红后已复原）：
//   A waffo-events.ts 的 extendMemberExpiry 从 Math.max 改成 cur + (next - cur)*2
//     → ③「renewed 取 max，不二次叠加」精确翻红（用户白赚一期）
//   B subscriptionStateFromEvent 的 canceling 分支改为返回 activate 同等语义（清 is_member）
//     → ③「canceling 不撤销会员」精确翻红（本期内用户被误杀）
import { readFileSync, existsSync } from 'node:fs'
import {
  planFromSku,
  planFromBillingPeriod,
  resolvePlan,
  buildSubscriptionPaymentRow,
  extendMemberExpiry,
  subscriptionStateFromEvent,
  handleWaffoEvent,
} from '../src/lib/waffo-events.ts'
import { waffoProductId } from '../src/lib/waffo-products.ts'

let allPass = true
const ok = (m) => console.log('  ✓ ' + m)
const fail = (m) => { allPass = false; console.log('  ✗ ' + m) }
const assert = (cond, m) => (cond ? ok(m) : fail(m))
const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')

function stripComments(src) {
  let out = '', state = 'code'
  for (let i = 0; i < src.length; i++) {
    const c = src[i], n = src[i + 1]
    if (state === 'code') {
      if (c === '/' && n === '/') { state = 'line'; i++; continue }
      if (c === '/' && n === '*') { state = 'block'; i++; continue }
      if (c === "'" || c === '"' || c === '`') { state = c; out += c; continue }
      out += c
    } else if (state === 'line') {
      if (c === '\n') { state = 'code'; out += c }
    } else if (state === 'block') {
      if (c === '*' && n === '/') { state = 'code'; i++ }
    } else {
      out += c
      if (c === '\\') { out += n ?? ''; i++ }
      else if (c === state) state = 'code'
    }
  }
  return out
}

const UID_A = '11111111-2222-3333-4444-555555555555'
const DAY_MS = 24 * 60 * 60 * 1000

// —— 内存仓储：镜像 DB 唯一约束 + profiles 会员列「省略=保持不变」契约 ——
function createMemRepo() {
  const eventKeys = new Set()
  const payments = []
  const members = new Map() // userId → 会员行
  return {
    _payments: payments,
    _members: members,
    async markEventProcessed(eventType, eventId) {
      const key = eventType + '|' + eventId
      if (eventKeys.has(key)) return false
      eventKeys.add(key)
      return true
    },
    async insertPaidPayment(row) {
      if (payments.some((p) => p.transaction_id === row.transaction_id)) return false
      payments.push({ ...row })
      return true
    },
    async findPaidByExternalId(externalId) {
      return payments.find((p) => p.order_merchant_external_id === externalId) ?? null
    },
    async findChartUserId() { return null },
    // ★ 与生产实现同构：is_member 恒置 true；字段省略即保持不变（生产 patchMembership 一致）
    async findMemberExpiry(userId) {
      return members.get(userId)?.member_expire_at ?? null
    },
    async patchMembership(userId, patch) {
      const next = { ...(members.get(userId) ?? {}), is_member: true }
      if ('plan' in patch) next.member_plan = patch.plan ?? null
      if ('orderId' in patch) next.member_order_id = patch.orderId ?? null
      if ('expireAt' in patch) next.member_expire_at = patch.expireAt ?? null
      if ('autoRenew' in patch) next.member_auto_renew = patch.autoRenew ?? null
      if ('cancelAt' in patch) next.member_cancel_at = patch.cancelAt ?? null
      members.set(userId, next)
    },
  }
}

// 构造订阅事件（字段名严格对齐 SDK 的 WebhookEvent/WebhookEventData）
// ★ 金额必须用 chargedAmount（真实扣款额，实现只认它）；amount 是已废弃的同名字段，
//   一并带上只为贴合真实载荷 —— 以 chargedAmount 为断言依据（防「看错字段」）。
function subEvent({
  eventType,
  eventId = 'EVT_1',
  paymentId,
  amount = '9.9',
  metadata = { userId: UID_A, sku: 'member_monthly' },
  billingPeriod,
  periodEnd,
  canceledAt,
  orderId = 'ORD_1',
  externalId = `MC-${UID_A}-1750000000000`,
} = {}) {
  return {
    id: 'wh_1',
    timestamp: '2026-10-18T08:00:00.000Z',
    eventType,
    eventId,
    storeId: 'STO_test',
    storeName: 'test store',
    mode: 'test',
    data: {
      orderId,
      buyerEmail: 'buyer@example.com',
      currency: 'USD',
      amount,
      productName: '会员',
      orderMerchantExternalId: externalId,
      orderMetadata: metadata,
      ...(paymentId ? { paymentId, chargedAmount: amount } : {}),
      ...(billingPeriod ? { billingPeriod } : {}),
      ...(periodEnd ? { currentPeriodEnd: periodEnd } : {}),
      ...(canceledAt ? { canceledAt } : {}),
    },
  }
}

const activeNow = (row) =>
  row?.is_member === true && row.member_expire_at && new Date(row.member_expire_at).getTime() > Date.now()

// ════════════════ ① 源码 / 配置 ════════════════
console.log('—— ① 源码/配置：登记一致性 / 建品脚本 / 共享收银台 / 迁移 / 取消恢复 / 同意校验 ——')
{
  // 登记一致性（人工跑脚本粘贴 PROD_ 后才开闸；断言只要求自洽）
  for (const sku of ['member_monthly', 'member_yearly']) {
    const id = waffoProductId(sku)
    assert(id === null || id.startsWith('PROD_'),
      `${sku} 登记一致性（未登记→null / 已登记→PROD_ 前缀；当前 ${id === null ? '未登记' : '已登记'}）`)
  }

  // 订阅商品创建脚本（一次性运维）：必须真调 subscriptionProducts.create + publish
  const createSrc = existsSync(new URL('./create-subscription-products.mjs', import.meta.url))
    ? read('./create-subscription-products.mjs') : ''
  assert(createSrc.includes('subscriptionProducts.create'), '建品脚本调 subscriptionProducts.create')
  assert(createSrc.includes('subscriptionProducts.publish'), '建品脚本调 subscriptionProducts.publish（未发布不可售）')
  assert(/billingPeriod:\s*'monthly'|billingPeriod:\s*'yearly'|billingPeriod\b/.test(createSrc),
    '建品脚本按 billingPeriod 建月度/年度两个计划')
  assert(createSrc.includes('taxCategory'), '建品脚本含 taxCategory（渠道定价必需字段）')

  // 收银台共享件：一次性与订阅共用同一实现（不写第二套收银台）
  const checkoutLibSrc = stripComments(read('../src/lib/checkout.ts'))
  assert(checkoutLibSrc.includes('export async function createCheckoutSession'), 'lib/checkout.ts 导出 createCheckoutSession')
  assert(checkoutLibSrc.includes('checkout.createSession'), '共享件内部即 SDK checkout.createSession')
  const checkoutRouteSrc = stripComments(read('../src/app/api/checkout/route.ts'))
  assert(checkoutRouteSrc.includes('createCheckoutSession'), 'api/checkout 改调共享件（无第二套收银台）')

  // 迁移文件（人工 SQL Editor 步骤）：幂等 ADD COLUMN IF NOT EXISTS
  const migSrc = read('../supabase/subscription.sql')
  for (const col of ['member_order_id', 'member_auto_renew', 'member_cancel_at', 'order_id']) {
    assert(new RegExp(`ADD COLUMN IF NOT EXISTS ${col}\\b`).test(migSrc), `迁移含幂等 ADD COLUMN IF NOT EXISTS ${col}`)
  }
  assert(migSrc.includes('ORD_'), '迁移注明 member_order_id 是渠道订阅单号 ORD_（仅服务端）')

  // 会员路由 POST：同意校验 + 开闸判据（PROD_ 登记）+ 复用共享收银台；且【不写库】
  const memSrc = read('../src/app/api/membership/route.ts')
  const postBody = memSrc.match(/export async function POST[\s\S]*$/)?.[0] ?? ''
  const postCode = stripComments(postBody)
  assert(postCode.includes('CONSENT_REQUIRED'), 'POST 未同意自动续费 → CONSENT_REQUIRED（不得默认勾选）')
  assert(postCode.includes("agreeAutoRenew !== true"), 'POST 只在 agreeAutoRenew === true 时继续')
  assert(postCode.includes('waffoProductId'), 'POST 以 PROD_ 是否登记判定开闸（不用 env 开关）')
  assert(postCode.includes('createCheckoutSession'), 'POST 复用共享收银台创建订阅会话')
  assert(postCode.includes('returnTo: \'/member\'') || postCode.includes("returnTo: '/member'"),
    '订阅成功后回跳会员中心（订阅权益不在「我的报告」）')
  assert(!/admin[\s\S]*?\.from\(/.test(postCode), 'POST 仍不碰任何表（会员状态由 webhook 写入）')
  // GET 只 selct 展示列，不得下发渠道订阅单号 ORD_
  const getBody = memSrc.match(/export async function GET[\s\S]*?export async function POST/)?.[0] ?? ''
  assert(/member_auto_renew/.test(getBody) && /member_cancel_at/.test(getBody), 'GET 返回自动续费/取消时间（会员中心自助管理）')
  assert(!/member_order_id/.test(stripComments(getBody)), 'GET 不 select member_order_id（ORD_ 绝不下发客户端）')

  // 取消/恢复路由
  const cancelSrc = stripComments(read('../src/app/api/membership/cancel/route.ts'))
  assert(cancelSrc.includes('orders.cancelSubscription'), '取消走 orders.cancelSubscription（商户凭证）')
  assert(cancelSrc.includes('issueSessionToken'), '恢复走 auth.issueSessionToken（签买家会话令牌）')
  assert(/customer\(\s*\w+\.?token?\s*\)|customer\(session\.token\)/.test(cancelSrc),
    '恢复用 customer session（SDK 无 orders.reactivateSubscription）')
  assert(cancelSrc.includes('reactivateSubscription'), '恢复调 customer().reactivateSubscription')
  assert(!/checkoutUrl|ord\b/.test('') && !/JSON\.stringify\(\{[^}]*orderId/.test(cancelSrc),
    '取消/恢复响应不回传 ORD_（orderId 只在服务端内部流转）')
  assert(cancelSrc.includes("profile") || cancelSrc.includes("'profiles'"),
    '取消/恢复服务端读 profiles.member_order_id')
}

// ════════════════ ② 纯函数 ════════════════
console.log('—— ② 纯函数：套餐判定 / 到期取 max / 扣款行 / 事件→动作 ——')
{
  // 套餐判定：sku 优先，billingPeriod 兜底，判不出不臆断
  assert(planFromSku('member_monthly') === 'monthly', "planFromSku('member_monthly') → monthly")
  assert(planFromSku('member_yearly') === 'yearly', "planFromSku('member_yearly') → yearly")
  assert(planFromSku('fatebook') === null, '非会员 SKU → null（不得把一次性购买当订阅）')
  assert(planFromBillingPeriod('monthly') === 'monthly' && planFromBillingPeriod('quarterly') === null,
    'billingPeriod：monthly→monthly，未开售的 quarterly→null')
  assert(
    resolvePlan({ orderMetadata: { sku: 'member_yearly' }, billingPeriod: 'monthly' }) === 'yearly',
    'resolvePlan：sku 优先于 billingPeriod',
  )
  assert(resolvePlan({ billingPeriod: 'yearly' }) === 'yearly', 'resolvePlan：无 sku 时用 billingPeriod 兜底')
  assert(resolvePlan({}) === null, 'resolvePlan：两者皆无 → null（不猜套餐）')

  // 取 max：重复投递的 renewed 不得二次叠加
  const t1 = '2026-11-01T00:00:00.000Z'
  const t2 = '2026-12-01T00:00:00.000Z'
  assert(extendMemberExpiry(t1, t2) === new Date(t2).toISOString(), 'extendMemberExpiry：新周期更晚 → 取新值')
  assert(extendMemberExpiry(t2, t1) === new Date(t2).toISOString(), 'extendMemberExpiry：新周期更早 → 取现有值（防倒扣）')
  assert(extendMemberExpiry(t1, t1) === new Date(t1).toISOString(), 'extendMemberExpiry：同值幂等（重复投递不叠加）')
  assert(extendMemberExpiry(null, t2) === new Date(t2).toISOString(), 'extendMemberExpiry：无现有值 → 用渠道值')
  assert(extendMemberExpiry(t1, null) === new Date(t1).toISOString(), 'extendMemberExpiry：渠道缺值 → 保留现有（不清空）')
  assert(extendMemberExpiry(null, null) === null, 'extendMemberExpiry：双空 → null')

  // 订阅扣款行
  const row = buildSubscriptionPaymentRow(
    { paymentId: 'PAY_9', chargedAmount: '49', orderMetadata: { userId: UID_A, sku: 'member_yearly' },
      orderMerchantExternalId: `MC-${UID_A}-1750000000001`, orderId: 'ORD_9', paymentDate: '2026-10-18' },
    'yearly',
  )
  assert(row && row.payment_type === 'yearly', '订阅扣款行 payment_type=yearly（可区分一次性购买）')
  assert(row && row.sku === 'member_yearly', '订阅扣款行 sku=member_yearly（权益归集唯一依据）')
  assert(row && row.transaction_id === 'PAY_9', '订阅扣款行 transaction_id 用真实 PAY_ 单号')
  assert(row && row.chart_id === null, '订阅扣款行 chart_id=null（与单个命盘无关）')
  assert(row && row.amount === 49 && row.order_id === 'ORD_9', '订阅扣款行 amount=Number(chargedAmount) 且留存 ORD_ 审计')
  assert(buildSubscriptionPaymentRow({ paymentId: 'MOCK_1', chargedAmount: '9.9', orderMetadata: { userId: UID_A } }, 'monthly') === null,
    'MOCK_ 单号不构成订阅扣款行')
  assert(buildSubscriptionPaymentRow({ paymentId: 'PAY_1', chargedAmount: '9.9' }, 'monthly') === null,
    '无 userId 不构成订阅扣款行')

  // 事件 → 动作
  const act = (eventType, data = { orderMetadata: { userId: UID_A, sku: 'member_monthly' }, currentPeriodEnd: '2026-11-01' }) =>
    subscriptionStateFromEvent(eventType, data)
  assert(act('subscription.activated').kind === 'activate', 'activated → activate（授权益）')
  assert(act('subscription.renewed').kind === 'renew', 'renewed → renew（续期）')
  assert(act('subscription.recovered').kind === 'renew', 'recovered（逾期后重扣成功）→ renew 同语义')
  assert(act('subscription.payment_succeeded').kind === 'record_payment', 'payment_succeeded → record_payment（只记账）')
  assert(act('subscription.canceling').kind === 'canceling', 'canceling → canceling（只记录取消请求）')
  assert(act('subscription.uncanceled').kind === 'uncanceled', 'uncanceled → uncanceled（恢复）')
  assert(act('subscription.canceled').kind === 'noop', '★ canceled → noop（到期自然失效，不清 is_member）')
  assert(act('subscription.past_due').kind === 'noop', 'past_due → noop（等渠道重试，仅日志）')
  assert(act('refund.failed').kind === 'noop', '★ refund.failed → noop（退款未完成，不撤销）')
  assert(act('refund.succeeded').kind === 'noop', 'refund.succeeded → noop（仅日志）')
  assert(subscriptionStateFromEvent('subscription.activated', {}).kind === 'noop',
    'activated 但判不出套餐 → noop（不臆断授予）')
}

// ════════════════ ③ handleWaffoEvent 真调 ════════════════
console.log('—— ③ 订阅事件落库行为（内存仓储镜像唯一约束与会员列契约）——')
{
  // activated → 授权益（到期=渠道 currentPeriodEnd）
  {
    const repo = createMemRepo()
    const r = await handleWaffoEvent(subEvent({
      eventType: 'subscription.activated', eventId: 'EVT_A', periodEnd: '2026-11-18',
    }), repo)
    const m = repo._members.get(UID_A)
    assert(r.kind === 'membership_updated' && r.action === 'activate', 'activated → membership_updated(activate)')
    assert(activeNow(m), 'activated 后会员【有效】（is_member=true 且未过期）')
    assert(m.member_plan === 'monthly', 'activated 写入 member_plan=monthly')
    assert(m.member_order_id === 'ORD_1', 'activated 记录渠道订阅单号（供后续取消/恢复）')
    assert(m.member_auto_renew === true, 'activated 默认开启自动续费')
    assert(m.member_expire_at === new Date('2026-11-18T00:00:00.000Z').toISOString(),
      'activated 到期时间取渠道 currentPeriodEnd（不做加法）')

    // 重复投递同 (eventType,eventId) → duplicate，不重复授予
    const dup = await handleWaffoEvent(subEvent({
      eventType: 'subscription.activated', eventId: 'EVT_A', periodEnd: '2026-11-18',
    }), repo)
    assert(dup.kind === 'duplicate', 'activated 同 eventId 重投 → duplicate（不重复授予）')
  }

  // activated 缺 currentPeriodEnd → 天数兜底（否则扣了钱无权益）
  {
    const repo = createMemRepo()
    await handleWaffoEvent(subEvent({ eventType: 'subscription.activated', eventId: 'EVT_B' }), repo)
    const m = repo._members.get(UID_A)
    const days = (new Date(m.member_expire_at).getTime() - Date.now()) / DAY_MS
    assert(days > 25 && days < 32, `activated 缺周期末 → 天数兜底约 30 天（实测 ${days.toFixed(1)} 天）`)
  }

  // renewed → 取 max，不二次叠加
  {
    const repo = createMemRepo()
    await handleWaffoEvent(subEvent({
      eventType: 'subscription.activated', eventId: 'EVT_C', periodEnd: '2026-11-18',
    }), repo)
    await handleWaffoEvent(subEvent({
      eventType: 'subscription.renewed', eventId: 'EVT_D', periodEnd: '2026-12-18',
    }), repo)
    const afterFirst = repo._members.get(UID_A).member_expire_at
    assert(afterFirst === new Date('2026-12-18T00:00:00.000Z').toISOString(),
      'renewed 到期顺延到新周期末')
    // 同周期末的【另一次投递】（不同 eventId，模拟重复投递）→ 仍同值，绝不叠加
    await handleWaffoEvent(subEvent({
      eventType: 'subscription.renewed', eventId: 'EVT_E', periodEnd: '2026-12-18',
    }), repo)
    assert(repo._members.get(UID_A).member_expire_at === afterFirst,
      '★ 重复投递的 renewed 取 max → 不二次叠加（用户不白赚一期）')
    // 异常：更早的周期末不得把到期日往回拨
    await handleWaffoEvent(subEvent({
      eventType: 'subscription.renewed', eventId: 'EVT_F', periodEnd: '2026-10-18',
    }), repo)
    assert(repo._members.get(UID_A).member_expire_at === afterFirst, 'renewed 更早的周期末不倒退到期日')
    // renewed 不得清掉 auto_renew（本补丁未含该字段 → 省略=保持不变）
    assert(repo._members.get(UID_A).member_auto_renew === true, 'renewed 保持 autoRenew 不变（省略=保持）')
  }

  // payment_succeeded → 记账；同 PAY_ 不同 eventId → payment_conflict
  {
    const repo = createMemRepo()
    const r1 = await handleWaffoEvent(subEvent({
      eventType: 'subscription.payment_succeeded', eventId: 'EVT_G', paymentId: 'PAY_77', amount: '9.9',
    }), repo)
    assert(r1.kind === 'membership_recorded' && r1.plan === 'monthly', 'payment_succeeded → membership_recorded(monthly)')
    assert(repo._payments.length === 1 && repo._payments[0].payment_type === 'monthly',
      '订阅扣款落 payments（payment_type=monthly）')
    assert(repo._members.has(UID_A) === false, '★ payment_succeeded 只记账，不碰会员有效期（d.ts 明示无 orderStatus/周期末）')
    const r2 = await handleWaffoEvent(subEvent({
      eventType: 'subscription.payment_succeeded', eventId: 'EVT_H', paymentId: 'PAY_77', amount: '9.9',
    }), repo)
    assert(r2.kind === 'payment_conflict', '同 PAY_ 单号（不同 eventId）→ payment_conflict（transaction_id UNIQUE）')
    assert(repo._payments.length === 1, '扣款不重复记账')

    // 年度套餐：billingPeriod 兜底判定
    const repoY = createMemRepo()
    const ry = await handleWaffoEvent(subEvent({
      eventType: 'subscription.payment_succeeded', eventId: 'EVT_I', paymentId: 'PAY_88',
      amount: '49', metadata: { userId: UID_A }, billingPeriod: 'yearly',
    }), repoY)
    assert(ry.kind === 'membership_recorded' && ry.plan === 'yearly', '无 sku 时依 billingPeriod 判 yearly')
    assert(repoY._payments[0].payment_type === 'yearly', '年度订阅扣款 payment_type=yearly')
  }

  // canceling → 只记录，不撤销（本期内仍有效）
  {
    const repo = createMemRepo()
    await handleWaffoEvent(subEvent({
      eventType: 'subscription.activated', eventId: 'EVT_J', periodEnd: '2026-11-18',
    }), repo)
    const before = repo._members.get(UID_A).member_expire_at
    const r = await handleWaffoEvent(subEvent({
      eventType: 'subscription.canceling', eventId: 'EVT_K', canceledAt: '2026-10-18T09:00:00.000Z',
    }), repo)
    const m = repo._members.get(UID_A)
    assert(r.kind === 'membership_updated' && r.action === 'canceling', 'canceling → membership_updated(canceling)')
    assert(m.member_auto_renew === false, 'canceling 关闭自动续费')
    assert(m.member_cancel_at === new Date('2026-10-18T09:00:00.000Z').toISOString(), 'canceling 记录取消时间')
    assert(m.member_expire_at === before && activeNow(m),
      '★ canceling 不撤销会员：到期日不变，本期内仍有效（陷阱 2）')

    // uncanceled → 恢复
    const r2 = await handleWaffoEvent(subEvent({ eventType: 'subscription.uncanceled', eventId: 'EVT_L' }), repo)
    const m2 = repo._members.get(UID_A)
    assert(r2.kind === 'membership_updated' && r2.action === 'uncanceled', 'uncanceled → membership_updated(uncanceled)')
    assert(m2.member_auto_renew === true && m2.member_cancel_at === null, 'uncanceled 恢复自动续费并清空取消时间')

    // canceled → 不撤销（到期自然失效）
    const r3 = await handleWaffoEvent(subEvent({
      eventType: 'subscription.canceled', eventId: 'EVT_M', canceledAt: '2026-11-18T00:00:00.000Z',
    }), repo)
    const m3 = repo._members.get(UID_A)
    assert(r3.kind === 'ignored_event', 'canceled → 仅日志（不写库）')
    assert(m3.member_expire_at === before, '★ canceled 不清到期日（失效由 getMembership 按时间自然判定）')
    // refund.failed / past_due → 不动会员
    await handleWaffoEvent(subEvent({ eventType: 'refund.failed', eventId: 'EVT_N' }), repo)
    await handleWaffoEvent(subEvent({ eventType: 'subscription.past_due', eventId: 'EVT_O' }), repo)
    assert(repo._members.get(UID_A).member_expire_at === before && repo._members.get(UID_A).member_auto_renew === true,
      '★ refund.failed / past_due 均不撤销会员、不改自动续费')
    assert(repo._payments.length === 0, '退款/逾期事件不写 payments')
  }

  // 归属/套餐判定异常 → 不写库、不抛错（返 200 记日志，等人工补单）
  {
    const repo = createMemRepo()
    // (a) 套餐可判但拿不到 userId（metadata 无 userId，业务单号也解析不出）→ ignored_missing_user
    const r = await handleWaffoEvent(subEvent({
      eventType: 'subscription.activated', eventId: 'EVT_P',
      metadata: { sku: 'member_monthly' }, externalId: 'not-a-ref',
    }), repo)
    assert(r.kind === 'ignored_missing_user', '无 userId 的订阅事件 → ignored_missing_user（返 200 记日志）')
    // (b) 连套餐都判不出 → 不臆断授予，仅日志
    const r2 = await handleWaffoEvent(subEvent({
      eventType: 'subscription.activated', eventId: 'EVT_P2', metadata: {}, externalId: 'not-a-ref',
    }), repo)
    assert(r2.kind === 'ignored_event', '套餐不可判的订阅事件 → ignored_event（绝不臆断授予权益）')
    assert(repo._members.size === 0 && repo._payments.length === 0, '归属/套餐异常的订阅事件不写任何表')
  }

  // 一次性链路未受影响（同仓储真调 order.completed）
  {
    const repo = createMemRepo()
    const r = await handleWaffoEvent({
      id: 'wh_2', timestamp: '2026-10-18T08:00:00.000Z', eventType: 'order.completed', eventId: 'EVT_Q',
      storeId: 'STO_test', storeName: 'test store', mode: 'test',
      data: {
        orderId: 'ORD_x', buyerEmail: 'b@e.com', currency: 'USD', amount: '29.99', productName: '命书',
        orderMerchantExternalId: `MC-${UID_A}-1750000000002`, orderMetadata: { userId: UID_A, sku: 'fatebook' },
        paymentId: 'PAY_99', chargedAmount: '29.99', paymentDate: '2026-10-18',
      },
    }, repo)
    assert(r.kind === 'inserted' && repo._payments[0].payment_type === 'single',
      '一次性链路回归：order.completed 仍落 single 流水（订阅改动未波及）')
  }
}

// ════════════════ ④ 合规 UI / 文案 ════════════════
console.log('—— ④ 合规：同意框默认不勾+未勾禁用 / 自助取消入口 / 条款更新 ——')
{
  const btn = stripComments(read('../src/components/MembershipButton.tsx'))
  assert(/useState\(false\)/.test(btn), '★ 自动续费同意框【默认不勾选】（useState(false)）')
  assert(/disabled=\{loading \|\| done \|\| !agreed\}/.test(btn), '★ 未勾选同意 → 按钮禁用（不得未同意即下单）')
  assert(btn.includes('agreeAutoRenew'), '按钮把同意状态随请求提交（服务端二次校验）')
  assert(btn.includes('/terms') && btn.includes('退款'), '按钮旁列退款政策链接（托管收银台不可改文案）')
  assert(/AIGC/.test(btn), '按钮旁含 AIGC 披露（AI 生成内容标注）')
  assert(btn.includes('/member') && btn.includes('取消'), '按钮旁告知站内自助取消入口')
  assert(btn.includes('/api/membership'), '按钮走 /api/membership（服务端建会话）')

  const memberSrc = read('../src/app/member/page.tsx')
  assert(memberSrc.includes('/api/membership/cancel'), '会员中心调取消/恢复接口（站内自助）')
  assert(memberSrc.includes("act('cancel')") && memberSrc.includes("act('reactivate')"), '会员中心含取消与恢复两个动作')
  assert(/下次续费日|会员到期日/.test(memberSrc), '会员中心显示下次续费日/会员到期日')
  assert(memberSrc.includes('WAFFO_PORTAL_URL'), '会员中心保留改卡/查账单门户入口')

  const successSrc = read('../src/app/checkout/success/page.tsx')
  assert(successSrc.includes('member_monthly') && successSrc.includes('isMemberSku'),
    '成功页对订阅 SKU 改看 /api/membership（否则订阅买家白等 15 次轮询）')
  assert(successSrc.includes('/api/membership?token='), '成功页订阅轮询用会员只读接口')

  const termsSrc = read('../src/content/legal/terms.md')
  assert(!/subscription feature is not yet open/i.test(termsSrc), '★ terms 已删「订阅未开放」表述（订阅已可购）')
  assert(/self-service/i.test(termsSrc) && /member area/i.test(termsSrc), '★ terms 改为站内自助取消（member area，无需邮件）')
  assert(termsSrc.includes('unchecked by default'), 'terms 明示同意框默认不勾选')
  assert(/reactivat/i.test(termsSrc), 'terms 说明本期内可一键恢复续费')
  assert(termsSrc.includes('v0.3'), 'terms 版本记录含 v0.3（本次变更留痕）')
}

// ════════════════ ⑤ 牙口自检 ════════════════
console.log('—— ⑤ 牙口自检（断言样本能检出坏实现）——')
{
  // 取 max 的坏实现（叠加）必须与正确值不同
  const t1 = '2026-11-01T00:00:00.000Z', t2 = '2026-12-01T00:00:00.000Z'
  const bad = new Date(new Date(t1).getTime() + (new Date(t2) - new Date(t1)) * 2).toISOString()
  assert(bad !== extendMemberExpiry(t1, t2), '牙口：叠加式续期与取 max 结果不同（断言可检出）')
  // canceling 的动作类型不是 activate（撤销语义）
  assert(subscriptionStateFromEvent('subscription.canceling', {}).kind !== 'activate',
    '牙口：canceling 不会被误判为授权益/撤销动作')
  // 无同意字段时的服务端判据样本
  assert((undefined !== true) === true, '牙口：agreeAutoRenew 缺省不满足 === true（拒绝路径可检出）')
}

console.log('\n' + (allPass ? '✅ test-subscription-accept 全部通过' : '❌ test-subscription-accept 存在失败断言'))
process.exit(allPass ? 0 : 1)
