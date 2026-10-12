// ★ Waffo 支付集成 · 行为验收（HANDOFF-Waffo支付集成 §九，2026-10-10）
//
// 结构：
//   ① 配置/源码断言：env 模板、schema 四项变更、raw body 验签、密钥不进客户端、
//      幂等只靠唯一约束（禁先查后写）、成功页轮询参数、门户链接
//   ② 真实密码学验签：自生成 RSA 密钥对，用真的 SDK verifyWebhook 跑
//      合法 / 篡改 / ±40min 合法 / ±50min 拒绝（容差取生产导出的常量）
//      —— 内置平台公钥对应的私钥不在我方手里，「密钥身份」一环只能联调时用
//         Waffo 真实投递证明（回执已列为联调项），此处证明的是验签机制与容差行为本身。
//   ③ handleWaffoEvent 幂等真调：同 (eventType,eventId) 两次只一条；
//      不同 eventId 同 PAY_ 单号走 transaction_id UNIQUE 冲突；异常载荷不授权益。
//   ④ 权益链路：PAY_ 真流水→授予 fatebook；MOCK_ 不授予；按业务单号能查回那一行。
//   ⑤ reconcilePayment 兜底对账：快路径不调远端；越权/坏单号拒绝；
//      远端 succeeded 补写（含业务单号）；pending 不补写。
//   ⑥ checkout 参数纯函数：storeId/metadata/单号/includePaymentMethods/
//      绝对 https successUrl?ref=；非 https 拒绝；SKU 未登记 → null。
//
// 牙口（文本不变、行为变坏；开发期手工注入，实测翻红后已复原）：
//   A waffo-events.ts markEventProcessed(eventType, eventId) 改 eventId + '-x'
//     → ③「去重键必须是真实 (eventType,eventId) 原值」精确翻红
//       （去重键被污染：官方重投的真实 eventId 永远撞不上，processed_webhooks 形同虚设）
//   B buildPaidPaymentRow 删掉 order_merchant_external_id 字段
//     → ③「order_merchant_external_id 已写入」断言翻红
//       （verify-payment 的补写行在另一代码路径，由 ⑤ 独立断言守护）
import { readFileSync, readdirSync } from 'node:fs'
import { generateKeyPairSync, createSign, createPrivateKey } from 'node:crypto'
import { verifyWebhook } from '@waffo/pancake-ts'
import {
  makeMerchantOrderId,
  parseMerchantOrderId,
  buildPaidPaymentRow,
  handleWaffoEvent,
  reconcilePayment,
  normalizeGraphqlPayment,
} from '../src/lib/waffo-events.ts'
import { buildCheckoutParams, WAFFO_WEBHOOK_TOLERANCE_MS } from '../src/lib/waffo.ts'
import { waffoProductId, WAFFO_PORTAL_URL } from '../src/lib/waffo-products.ts'
import { entitlementsFromRows } from '../src/lib/entitlement.ts'

let allPass = true
const ok = (m) => console.log('  ✓ ' + m)
const fail = (m) => { allPass = false; console.log('  ✗ ' + m)
}
const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')
const assert = (cond, m) => (cond ? ok(m) : fail(m))

// 注释剥离（负向源码扫描专用，避免注释里的示例/禁令文本造成误报）
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
const UID_B = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'

// —— 内存仓储：镜像生产 DB 的两个唯一约束（processed_webhooks PK / payments.transaction_id UNIQUE）——
// ★ charts：命盘归属数据（HANDOFF-命书一份一付 §3.2），findChartUserId 按它校验。
function createMemRepo() {
  const eventKeys = new Set()
  const payments = []
  const charts = []
  return {
    _payments: payments,
    _eventKeys: eventKeys,
    _charts: charts,
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
    async findChartUserId(chartId) {
      return charts.find((c) => c.id === chartId)?.user_id ?? null
    },
  }
}

function paidEvent({
  eventId = 'EVT_1',
  paymentId = 'PAY_1',
  amount = '29.99',
  externalId,
  metadata = { userId: UID_A, sku: 'fatebook' },
  paymentDate = '2026-10-10T08:00:00.000Z',
  eventType = 'order.completed',
} = {}) {
  return {
    id: 'wh_1',
    timestamp: '2026-10-10T08:00:00.000Z',
    eventType,
    eventId,
    storeId: 'STO_test',
    storeName: 'test store',
    mode: 'test',
    data: {
      orderId: 'ORD_1',
      orderStatus: 'succeeded',
      buyerEmail: 'buyer@example.com',
      orderMerchantExternalId: externalId ?? `MC-${UID_A}-1760000000000`,
      orderMetadata: metadata,
      chargedAmount: amount,
      paymentId,
      paymentStatus: 'succeeded',
      paymentMethod: 'card',
      paymentLast4: '0110',
      paymentDate,
    },
  }
}

// ════════════════ ① 配置 / 源码断言 ════════════════
console.log('—— ① 配置与源码结构 ——')

const envExample = read('../.env.example')
for (const k of ['WAFFO_MERCHANT_ID', 'WAFFO_PRIVATE_KEY', 'WAFFO_STORE_ID', 'NEXT_PUBLIC_APP_URL']) {
  assert(envExample.includes(k), `.env.example 含 ${k}`)
}

const waffoSrc = read('../src/lib/waffo.ts')
assert(/45\s*\*\s*60\s*\*\s*1000/.test(waffoSrc), '容差常量钉死 45*60*1000（45 分钟）')
assert(waffoSrc.includes("typeof window !== 'undefined'"), 'waffo.ts 有客户端引用即炸的守卫')
assert(!/NEXT_PUBLIC_WAFFO/.test(waffoSrc), 'WAFFO 密钥不带 NEXT_PUBLIC_ 前缀')
assert(!/BEGIN (RSA )?PRIVATE KEY/.test(waffoSrc), 'waffo.ts 中无硬编码私钥')

const productsSrc = stripComments(read('../src/lib/waffo-products.ts'))
// ★ 登记规则（waffo-products.ts 注释明文）：PROD_ 单号【只在映射这一处登记】——
//   全 src 扫描：waffo-products.ts 之外（去注释后）不得出现 PROD_ 字面量，防散落硬编码。
//   （原断言「映射中无 PROD_」写于 fatebook 未登记时期；d8d436c 登记真实单号后前提失效，
//     按 §8.6.2 期望值跟随事实更新，防散落的意图保留。）
{
  const PROD_LIT = /['"]PROD_[A-Za-z0-9]+['"]/
  let scanned = 0
  const walk = (dirUrl, rel) => {
    for (const e of readdirSync(new URL(dirUrl, import.meta.url), { withFileTypes: true })) {
      if (e.isDirectory()) { walk(dirUrl + e.name + '/', rel + e.name + '/'); continue }
      if (e.isFile() && /\.(ts|tsx)$/.test(e.name)) {
        const relPath = rel + e.name
        if (relPath === 'lib/waffo-products.ts') continue
        scanned++
        if (PROD_LIT.test(stripComments(read('../src/' + relPath)))) {
          fail(`PROD_ 单号散落在映射之外的 src/${relPath}（登记规则：只在 waffo-products.ts 一处）`)
        }
      }
    }
  }
  walk('../src/', '')
  assert(scanned > 0, `全 src 扫描执行有效（扫描 ${scanned} 个 .ts/.tsx 文件）`)
}

const schema = read('../supabase/schema.sql')
assert(
  /payment_method IN \('card', 'wechat', 'alipay', 'stripe'\)/.test(schema),
  "schema: payment_method CHECK 含 'card'",
)
assert(schema.includes('order_merchant_external_id TEXT'), 'schema: payments 新增 order_merchant_external_id 列')
assert(
  /CONSTRAINT payments_transaction_id_key UNIQUE \(transaction_id\)/.test(schema),
  'schema: transaction_id UNIQUE 约束',
)
assert(
  /CREATE TABLE IF NOT EXISTS processed_webhooks[\s\S]*PRIMARY KEY \(event_type, event_id\)/.test(schema),
  'schema: processed_webhooks 表 + (event_type,event_id) 主键',
)
assert(schema.includes('idx_payments_omer'), 'schema: order_merchant_external_id 索引')
// 旧库迁移段也要在（单文件双份事实）
assert(schema.includes('ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_payment_method_check'), 'schema: 附旧库迁移段')

const webhookRoute = read('../src/app/api/webhooks/waffo/route.ts')
assert(/await request\.text\(\)/.test(webhookRoute), 'webhook 路由用 request.text() 取原始 body')
assert(!/request\.json\(/.test(stripComments(webhookRoute)), 'webhook 路由不出现 request.json()（验签必须对原文）')
assert(webhookRoute.includes("'x-waffo-signature'"), 'webhook 路由读 x-waffo-signature 头')
assert(webhookRoute.includes('verifyWaffoEvent'), 'webhook 路由走统一验签函数')

const eventsSrc = read('../src/lib/waffo-events.ts')
// chart_id 链路（HANDOFF-命书一份一付 §三）：metadata.chartId → 形态校验 → 落账前归属校验
assert(eventsSrc.includes('normalizeChartIdMeta'), 'chartId 形态校验单一事实源 normalizeChartIdMeta 存在')
assert(eventsSrc.includes('resolveChartIdForUser'), 'chartId 归属校验单一事实源 resolveChartIdForUser 存在')
assert(eventsSrc.includes('findChartUserId'), '仓储接口含 findChartUserId（归属校验查 charts 表）')
assert(eventsSrc.includes("data.paymentId"), 'transaction_id 取 data.paymentId（PAY_ 单号）')
assert(eventsSrc.includes('Number(data.chargedAmount)'), 'amount 取 Number(chargedAmount)')
assert(!/data\.amount\b|data\.total\b|data\.subtotal\b/.test(eventsSrc), '不使用废弃的 amount/total/subtotal 字段')
assert(/activated[\s\S]{0,400}payment_succeeded/.test(eventsSrc), '注释写明陷阱一：activated+payment_succeeded 双发')
assert(/canceling[\s\S]{0,200}不撤销/.test(eventsSrc), '注释写明陷阱二：canceling 不撤销 / canceled 才撤销')
assert(/refund\.failed[\s\S]{0,60}不撤销/.test(eventsSrc), '注释写明 refund.failed 不撤销')

const repoSrc = read('../src/lib/waffo-repo.ts')
assert(repoSrc.includes("'23505'"), '仓储识别 PG 23505 唯一冲突')
{
  // insertPaidPayment 方法体内禁止先 select（并发下不可靠）
  const body = repoSrc.match(/async insertPaidPayment[\s\S]*?\n    \},/)[0]
  assert(!/\.select\(/.test(body), 'insertPaidPayment 不做先查后写（只靠 UNIQUE 约束）')
}
assert(
  /findPaidByExternalId[\s\S]*?\.eq\('order_merchant_external_id'/.test(repoSrc),
  '快路径按 order_merchant_external_id 查',
)

const checkoutRoute = read('../src/app/api/checkout/route.ts')
assert(checkoutRoute.includes('WaffoPancakeError'), 'checkout 捕获 WaffoPancakeError')
assert(checkoutRoute.includes('SKU_UNAVAILABLE'), '未配置 productId 返回 SKU_UNAVAILABLE（非 500）')
assert(checkoutRoute.includes('makeMerchantOrderId'), 'checkout 生成 MC- 业务单号')

const verifyRoute = read('../src/app/api/verify-payment/route.ts')
assert(verifyRoute.includes('.graphql.query'), 'verify-payment 用 SDK GraphQL 反查')
assert(verifyRoute.includes('orderMerchantExternalId'), 'verify-payment 接收业务单号')
assert(verifyRoute.includes("status: 403") || verifyRoute.includes('{ status: 403 }'), '越权/坏单号返 403')

const successPage = read('../src/app/checkout/success/page.tsx')
assert(successPage.includes("searchParams.get('ref')"), '成功页以 URL ?ref= 为主来源')
assert(successPage.includes('waffo_checkout_ref'), '成功页保留 sessionStorage 补充来源')
assert(successPage.includes('POLL_MAX_TIMES = 15'), '成功页轮询上限 15 次')
assert(successPage.includes('POLL_INTERVAL_MS = 2000'), '成功页轮询间隔 2 秒')
assert(successPage.includes('hello@mingcharts.com'), '终态文案含客服邮箱')
assert(successPage.includes('href="/"') && successPage.includes('href="/pricing"'), '终态含返回首页/价格页链接')
assert(successPage.includes('ownedSkus.includes'), '成功页按 ownedSkus 判定（不看恒真的 canView）')
assert(successPage.includes('/api/verify-payment'), '轮询无果后调 verify-payment 兜底')

const reportsPage = read('../src/app/reports/page.tsx')
assert(
  reportsPage.includes("from '@/lib/waffo-products'") && /href=\{WAFFO_PORTAL_URL\}/.test(reportsPage),
  '账户区（我的报告）引用 WAFFO_PORTAL_URL 门户链接',
)
assert(
  WAFFO_PORTAL_URL === 'https://pancake.waffo.ai/consumer/portal/login',
  '门户 URL 为任务书 §3.6 统一入口（不带 email 参数）',
)

// ════════════════ ② 真实密码学验签（真 SDK + 自生成 RSA 对）════════════════
console.log('—— ② verifyWebhook 真实行为（RSA-SHA256，生产容差常量）——')
assert(WAFFO_WEBHOOK_TOLERANCE_MS === 45 * 60 * 1000, '容差常量 = 2700000ms')

const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
const pubPem = publicKey.export({ type: 'spki', format: 'pem' })
const privKeyObj = createPrivateKey(privateKey.export({ type: 'pkcs8', format: 'pem' }))

const baseEvent = paidEvent()
const signHeader = (payload, t) => {
  const sig = createSign('RSA-SHA256').update(`${t}.${payload}`).sign(privKeyObj, 'base64')
  return `t=${t},v1=${sig}`
}
const verifyAt = (payload, t) =>
  verifyWebhook(payload, signHeader(payload, t), {
    toleranceMs: WAFFO_WEBHOOK_TOLERANCE_MS,
    futureToleranceMs: WAFFO_WEBHOOK_TOLERANCE_MS,
    publicKey: pubPem,
  })

{
  const payload = JSON.stringify(baseEvent)
  const now = Date.now()
  let parsed
  try {
    parsed = verifyAt(payload, now)
  } catch (e) { fail('合法签名+当前时间戳应通过：' + e.message) }
  assert(parsed && parsed.eventType === 'order.completed', '合法签名事件被正确解析')

  let tamperedRejected = false
  try {
    verifyWebhook(payload + ' ', signHeader(payload, now), { publicKey: pubPem, toleranceMs: WAFFO_WEBHOOK_TOLERANCE_MS })
  } catch { tamperedRejected = true }
  assert(tamperedRejected, '篡改 body（加一个空格）验签拒绝')

  let badSigRejected = false
  try {
    verifyWebhook(payload, `t=${now},v1=ZmFrZWZha2U=`, { publicKey: pubPem, toleranceMs: WAFFO_WEBHOOK_TOLERANCE_MS })
  } catch { badSigRejected = true }
  assert(badSigRejected, '伪造签名拒绝')

  const minus40 = verifyAt(payload, now - 40 * 60 * 1000)
  assert(minus40.eventId === 'EVT_1', '-40 分钟时间戳在容差内，通过')
  const plus40 = verifyAt(payload, now + 40 * 60 * 1000)
  assert(plus40.eventId === 'EVT_1', '+40 分钟时间戳在容差内，通过（对称窗）')

  const rejectAt = (t, label) => {
    let rejected = false
    try { verifyAt(payload, t) } catch { rejected = true }
    assert(rejected, label)
  }
  rejectAt(now - 50 * 60 * 1000, '-50 分钟超出容差，拒绝（防重放）')
  rejectAt(now + 50 * 60 * 1000, '+50 分钟超出容差，拒绝')
}

// ════════════════ ③ handleWaffoEvent 幂等与字段（真调）════════════════
console.log('—— ③ 事件处理幂等 + payments 行字段 ——')
{
  const repo = createMemRepo()
  const event = paidEvent()
  const r1 = await handleWaffoEvent(event, repo)
  const r2 = await handleWaffoEvent(event, repo)
  assert(r1.kind === 'inserted', 'order.completed 首次处理 → inserted')
  assert(r2.kind === 'duplicate', '同一 (eventType,eventId) 重投 → duplicate')
  assert(repo._payments.length === 1, '同一事件投递两次，payments 只有一条')
  assert(repo._eventKeys.has('order.completed|EVT_1'), '去重键必须是真实 (eventType,eventId) 原值')
  assert(repo._eventKeys.size === 1, 'processed_webhooks 只留一条痕')

  const row = repo._payments[0]
  assert(row.user_id === UID_A, 'user_id 来自 metadata.userId')
  assert(row.amount === 29.99 && typeof row.amount === 'number', 'amount = Number(chargedAmount) = 29.99')
  assert(row.payment_type === 'single', "payment_type = 'single'")
  assert(row.payment_method === 'card', "payment_method = 'card'")
  assert(row.status === 'paid', "status = 'paid'")
  assert(row.transaction_id === 'PAY_1' && row.transaction_id.startsWith('PAY_'), 'transaction_id = PAY_ 真实单号')
  assert(row.order_merchant_external_id === `MC-${UID_A}-1760000000000`, 'order_merchant_external_id 已写入')
  // 默认事件 metadata 无 chartId → 落 NULL（HANDOFF-命书一份一付 §3.3 断言③同型）
  assert(row.chart_id === null, 'metadata 无 chartId → chart_id 落 NULL（不报错）')
  assert(row.paid_at === '2026-10-10T08:00:00.000Z', 'paid_at 取 paymentDate')

  // 不同事件、同一支付单号（另一条链路重投）→ transaction_id UNIQUE 兜底
  const r3 = await handleWaffoEvent(paidEvent({ eventId: 'EVT_2', paymentId: 'PAY_1' }), repo)
  assert(r3.kind === 'payment_conflict', '不同 eventId 同 PAY_ 单号 → payment_conflict')
  assert(repo._payments.length === 1, '冲突后 payments 仍只有一条')

  // metadata 缺 userId，但业务单号可解析 → 兜底成功
  const repo2 = createMemRepo()
  const fallback = await handleWaffoEvent(
    paidEvent({ eventId: 'EVT_3', paymentId: 'PAY_3', metadata: {}, externalId: `MC-${UID_A}-1760000000003` }),
    repo2,
  )
  assert(fallback.kind === 'inserted' && repo2._payments[0].user_id === UID_A, 'metadata 缺失时按 MC- 单号兜底解析用户')

  // metadata 与单号都拿不到用户 → 记日志返 200（ignored_missing_user），不落账
  const repo3 = createMemRepo()
  const noUser = await handleWaffoEvent(
    paidEvent({ eventId: 'EVT_4', paymentId: 'PAY_4', metadata: {}, externalId: 'UNKNOWN-REF' }),
    repo3,
  )
  assert(noUser.kind === 'ignored_missing_user', '无用户归属 → ignored_missing_user（人工补单）')
  assert(repo3._payments.length === 0, '无用户归属不写 payments')

  // 异常金额 / MOCK 单号 → invalid payload，不落账
  const repo4 = createMemRepo()
  const badAmount = await handleWaffoEvent(paidEvent({ eventId: 'EVT_5', paymentId: 'PAY_5', amount: 'abc' }), repo4)
  assert(badAmount.kind === 'ignored_invalid_payload', 'chargedAmount 非法 → ignored_invalid_payload')
  const mockTxn = await handleWaffoEvent(paidEvent({ eventId: 'EVT_6', paymentId: 'MOCK_6' }), repo4)
  assert(mockTxn.kind === 'ignored_invalid_payload', 'MOCK_ 单号不被当作真实支付落账')
  assert(repo4._payments.length === 0, '异常载荷均不写 payments')

  // 非购买事件 → 只记日志
  const repo5 = createMemRepo()
  const sub = await handleWaffoEvent(paidEvent({ eventType: 'subscription.activated', eventId: 'EVT_7' }), repo5)
  assert(sub.kind === 'ignored_event' && sub.eventType === 'subscription.activated', '订阅事件 → ignored_event')
  assert(repo5._payments.length === 0, '非购买事件不写 payments')
}

// ════════════════ ④ 权益链路（真 entitlementsFromRows）════════════════
console.log('—— ④ 权益归集：PAY_ 授予 / MOCK_ 排除 / 业务单号反查 ——')
{
  const entReal = entitlementsFromRows(
    [{ payment_type: 'single', status: 'paid', transaction_id: 'PAY_9' }],
    null,
  )
  assert(entReal.ownedSkus.has('fatebook'), '真实 PAY_ 已支付流水 → 拥有 fatebook')

  const entMock = entitlementsFromRows(
    [{ payment_type: 'single', status: 'paid', transaction_id: 'MOCK_9' }],
    null,
  )
  assert(!entMock.ownedSkus.has('fatebook'), 'MOCK_ 模拟流水 → 不授予 fatebook')

  const repo = createMemRepo()
  await repo.insertPaidPayment({
    user_id: UID_A, chart_id: null, amount: 29.99, payment_type: 'single',
    payment_method: 'card', status: 'paid', transaction_id: 'PAY_10',
    order_merchant_external_id: `MC-${UID_A}-1760000000010`, paid_at: new Date().toISOString(),
  })
  const found = await repo.findPaidByExternalId(`MC-${UID_A}-1760000000010`)
  assert(found !== null && found.transaction_id === 'PAY_10', '能按 order_merchant_external_id 查回那一行（硬要求 13）')
}

// ════════════════ ⑤ reconcilePayment 兜底对账（真调）════════════════
console.log('—— ⑤ verify-payment 对账：快路径 / 越权 / 远端补写 / pending ——')
{
  const ref = `MC-${UID_A}-1760000000020`
  const paidRow = {
    user_id: UID_A, chart_id: null, amount: 29.99, payment_type: 'single',
    payment_method: 'card', status: 'paid', transaction_id: 'PAY_20',
    order_merchant_external_id: ref, paid_at: '2026-10-10T09:00:00.000Z',
  }

  // 快路径：本地已有 → 远端一次都不许调
  const repo1 = createMemRepo()
  await repo1.insertPaidPayment(paidRow)
  let remoteCalls1 = 0
  const remote1 = { async findSucceededPayment() { remoteCalls1++; throw new Error('快路径不应调远端') } }
  const fast = await reconcilePayment({ repo: repo1, remote: remote1, userId: UID_A, ref })
  assert(fast.status === 'owned' && remoteCalls1 === 0, '本地已落账走快路径，不调 Waffo')

  // 越权：单号属于 A，B 来查 → 拒绝
  const repo2 = createMemRepo()
  let remoteCalls2 = 0
  const remote2 = { async findSucceededPayment() { remoteCalls2++; return null } }
  const cross = await reconcilePayment({ repo: repo2, remote: remote2, userId: UID_B, ref })
  assert(cross.status === 'rejected' && remoteCalls2 === 0, '业务单号不属于当前用户 → rejected 且不查询')
  const broken = await reconcilePayment({
    repo: createMemRepo(), remote: remote2, userId: UID_A, ref: 'MC-not-a-valid-ref',
  })
  assert(broken.status === 'rejected', '无法解析 userId 的单号 → rejected')

  // 远端反查 succeeded → 补写（含业务单号），再查走快路径
  const repo3 = createMemRepo()
  let remoteCalls3 = 0
  const remote3 = {
    async findSucceededPayment(r) {
      remoteCalls3++
      if (remoteCalls3 > 1) throw new Error('补写成功后第二次应走快路径')
      return {
        paymentId: 'PAY_30', status: 'succeeded', chargedAmount: '29.99',
        paymentDate: '2026-10-10T09:05:00.000Z', orderMerchantExternalId: r,
        userId: UID_B, sku: 'fatebook', // 故意给别人的 userId：必须以登录态为准
      }
    },
  }
  const backfill = await reconcilePayment({ repo: repo3, remote: remote3, userId: UID_A, ref })
  assert(backfill.status === 'owned', '远端 succeeded 但本地无记录 → 补写后 owned')
  assert(repo3._payments.length === 1, '补写恰好一条 payments')
  assert(repo3._payments[0].order_merchant_external_id === ref, '补写行带 order_merchant_external_id')
  assert(repo3._payments[0].user_id === UID_A, '补写 user_id 以登录态为准，不信远端 metadata')
  const again = await reconcilePayment({ repo: repo3, remote: remote3, userId: UID_A, ref })
  assert(again.status === 'owned' && remoteCalls3 === 1, '补写后再查走快路径')

  // 远端也没有 → pending
  const pending = await reconcilePayment({
    repo: createMemRepo(),
    remote: { async findSucceededPayment() { return null } },
    userId: UID_A, ref,
  })
  assert(pending.status === 'pending', '本地与远端均无成功支付 → pending')
}

// GraphQL 容错映射
console.log('—— ⑤b normalizeGraphqlPayment ——')
{
  const ref = `MC-${UID_A}-1760000000040`
  const node = normalizeGraphqlPayment({
    payments: [
      { id: 'PAY_X1', status: 'failed', chargedAmount: '29.99', orderMerchantExternalId: ref },
      { id: 'PAY_X2', status: 'succeeded', chargedAmount: '29.99', paymentDate: '2026-10-10T10:00:00Z', orderMerchantExternalId: ref },
    ],
  })
  assert(node !== null && node.paymentId === 'PAY_X2' && node.status === 'succeeded', '从 payments 集合中挑出 succeeded 节点')
  assert(
    normalizeGraphqlPayment({ payments: [{ id: 'PAY_X3', status: 'pending', orderMerchantExternalId: ref }] }) === null,
    '无 succeeded 节点 → null（按 pending 处理）',
  )
  assert(normalizeGraphqlPayment(null) === null, '空响应 → null')
}

// ════════════════ ⑥ 业务单号 + checkout 参数纯函数 ════════════════
console.log('—— ⑥ 单号规则 / buildCheckoutParams / SKU 映射 ——')
{
  const orderId = makeMerchantOrderId(UID_A)
  const parsed = parseMerchantOrderId(orderId)
  assert(/^MC-[0-9a-f-]{36}-\d{13}$/.test(orderId), '单号形态 MC-<uuid>-<13位毫秒>')
  assert(orderId.length <= 128, `单号长度 ${orderId.length} ≤ SDK 128 上限`)
  assert(parsed !== null && parsed.userId === UID_A, '解析出的 userId 与原 UUID（含连字符）完全一致')
  for (const bad of ['MC-x', 'PAY_1', 'MC-u-abc', `MC-${UID_A}-12`, '随便写的']) {
    assert(parseMerchantOrderId(bad) === null, `坏单号被拒：${bad}`)
  }

  const params = buildCheckoutParams({
    productId: 'PROD_live',
    orderMerchantExternalId: orderId,
    buyerEmail: '  Buyer@Example.COM ',
    userId: UID_A,
    sku: 'fatebook',
    appUrl: 'https://www.mingcharts.com',
    storeId: 'STO_live',
  })
  assert(params.storeId === 'STO_live', 'createSession 透传 storeId（SDK .d.ts 漏声明、运行时支持）')
  assert(params.productId === 'PROD_live' && params.currency === 'USD', 'productId + currency USD')
  assert(params.buyerEmail === 'buyer@example.com', 'buyerEmail trim + 小写归一')
  assert(params.language === 'zh-Hans', 'language zh-Hans')
  assert(Array.isArray(params.includePaymentMethods) && params.includePaymentMethods.length === 1 && params.includePaymentMethods[0] === 'card', '仅开放 card（includePaymentMethods）')
  assert(params.orderMerchantExternalId === orderId, 'orderMerchantExternalId = MC- 单号')
  assert(params.metadata.userId === UID_A && params.metadata.sku === 'fatebook', 'metadata 带 userId/sku（字符串值）')
  assert(
    params.successUrl === `https://www.mingcharts.com/checkout/success?ref=${encodeURIComponent(orderId)}`,
    'successUrl 为绝对 https 且带 ?ref=业务单号',
  )

  // 本地 http 开发地址放行；非环回 http 拒绝
  assert(
    buildCheckoutParams({
      productId: 'PROD_x', orderMerchantExternalId: orderId, buyerEmail: 'a@b.c',
      userId: UID_A, sku: 'fatebook', appUrl: 'http://localhost:3000', storeId: 'STO_x',
    }).successUrl.startsWith('http://localhost:3000/'),
    'localhost http 开发地址放行',
  )
  let rejectedHttp = false
  try {
    buildCheckoutParams({
      productId: 'PROD_x', orderMerchantExternalId: orderId, buyerEmail: 'a@b.c',
      userId: UID_A, sku: 'fatebook', appUrl: 'http://example.com', storeId: 'STO_x',
    })
  } catch { rejectedHttp = true }
  assert(rejectedHttp, '非环回的 http 地址拒绝（successUrl 必须 https）')

  // fatebook 已登记真实 productId（d8d436c）→ 购买按钮可用；未登记 SKU 仍返回 null
  assert(typeof waffoProductId('fatebook') === 'string' && waffoProductId('fatebook').startsWith('PROD_'),
    'fatebook 已登记 productId（PROD_ 前缀，购买入口可用）')
  assert(waffoProductId('annual_report') === null, '未登记 SKU → null（购买入口显示即将推出）')
}

// ════════════════ 收尾 ════════════════
if (allPass) {
  console.log('\n✅ test-waffo-accept 全部通过')
  process.exit(0)
} else {
  console.log('\n❌ test-waffo-accept 存在失败断言')
  process.exit(1)
}
