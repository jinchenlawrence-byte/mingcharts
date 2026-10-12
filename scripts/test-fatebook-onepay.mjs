// ★ 命书「一份一付」验收（HANDOFF-命书一份一付 §二/§三/§四，2026-10-13）
//
// 三项链式任务，脚本分三段（随三项 commit 逐步补齐）：
//   ① 购买前要求有命盘（§二）—— 本 commit
//   ② 付款时把命盘关联上（§三）
//   ③ 按盘判定"这一份付过没"（§四）
//
// 断言形态说明：CheckoutButton 为交互组件，项目无 React 渲染测试设施；
// 组件层采用【正则锚定短路语义】的结构断言（先例：pricing CTA 守卫、site-audit 扫描），
// helper 层（latestChartIdOf）为真调行为断言（喂内存 mock、真跑生产逻辑）。
import { readFileSync } from 'node:fs'
import { latestChartIdOf } from '../src/lib/entitlement.ts'
import {
  handleWaffoEvent,
  reconcilePayment,
  buildPaidPaymentRow,
  normalizeChartIdMeta,
  resolveChartIdForUser,
} from '../src/lib/waffo-events.ts'
import { buildCheckoutParams } from '../src/lib/waffo.ts'

let allPass = true
const ok = (m) => console.log('  ✓ ' + m)
const fail = (m) => { allPass = false; console.log('  ✗ ' + m) }
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

// 内存 admin mock：只支持 latestChartIdOf 用到的查询链（from('charts').select().eq().order().limit()）
function chartAdminMock(rows) {
  const calls = []
  return {
    _calls: calls,
    from(table) {
      calls.push(table)
      return {
        select: () => ({
          eq: () => ({
            order: () => ({
              limit: () => Promise.resolve({ data: rows }),
            }),
          }),
        }),
      }
    },
  }
}

// ═══════════════════════════════════════════════════════════
// ① 购买前要求有命盘（HANDOFF §二）
// ═══════════════════════════════════════════════════════════
console.log('—— ① 购买前要求有命盘 ——')

// A. latestChartIdOf 真调行为断言（喂内存 mock、真跑生产逻辑）
{
  const uid = '11111111-2222-3333-4444-555555555555'
  const a1 = chartAdminMock([{ id: 'CHART_NEW' }, { id: 'CHART_OLD' }])
  const gotNew = await latestChartIdOf(a1, uid)
  assert(gotNew === 'CHART_NEW',
    `有命盘 → 返回 created_at 最新一条（got=${gotNew}，期望 CHART_NEW）`)
  assert(a1._calls.length === 1 && a1._calls[0] === 'charts',
    `latestChartIdOf 只查 charts 表（calls=${JSON.stringify(a1._calls)}）`)

  const a2 = chartAdminMock([])
  assert((await latestChartIdOf(a2, uid)) === null, '无命盘（空表）→ 返回 null')

  const a3 = chartAdminMock(null)
  assert((await latestChartIdOf(a3, uid)) === null, '无命盘（data=null）→ 返回 null')
}

// B. ★ /api/checkout 在无命盘时仍可被直接调用（§2.4：① 只是前端引导，不是服务端强制）
//    服务端一旦查 charts，就变成服务端拦截 →「先买后填」不可行。源码去注释后必须 0 命中。
{
  const src = stripComments(read('../src/app/api/checkout/route.ts'))
  const n1 = src.split("from('charts'").length - 1
  const n2 = src.split('latestChartIdOf').length - 1
  assert(n1 === 0, `checkout route 不查 charts（from('charts') 命中 ${n1}，要求 0）`)
  assert(n2 === 0, `checkout route 不做权益预检（latestChartIdOf 命中 ${n2}，要求 0）`)
}

// C. CheckoutButton 前端预检：charts 预检先于发起支付，且无命盘分支短路（return）
{
  const src = stripComments(read('../src/components/CheckoutButton.tsx'))
  const nCharts = src.split('latestChartIdOf(').length - 1
  assert(nCharts >= 1, `CheckoutButton 接线 latestChartIdOf 单一事实源（命中 ${nCharts}）`)
  const posQuery = src.indexOf('latestChartIdOf(')
  const posFetch = src.indexOf("fetch('/api/checkout'")
  assert(posQuery >= 0 && posFetch >= 0 && posQuery < posFetch,
    `预检（charts 查询）在发起支付（/api/checkout）之前（${posQuery} < ${posFetch}）`)
  // 短路语义：无命盘（!chartId）分支内必须在发起支付前 return——
  // 牙口锚点：把分支里的 return 改成 ;（文本几乎不变、行为变坏：继续走 fetch）→ 此正则不命中 → 翻红
  const shortCircuit = /if\s*\(!chartId\)\s*\{[^{}]*\breturn\b/.test(src)
  assert(shortCircuit, '无命盘分支短路成立（if (!chartId) { … return }，不继续发起支付）')
  assert(src.includes('先免费排盘'), '无命盘引导文案「先免费排盘」存在')
  assert(src.includes('/?returnTo=/pricing'), '引导链接带 returnTo=/pricing')
  assert(!/\balert\(/.test(src), '无命盘分支不弹 alert（§2.3：页内可点下一步）')
}

// ═══════════════════════════════════════════════════════════
// ② 付款时把命盘关联上（HANDOFF §三）
// ═══════════════════════════════════════════════════════════
console.log('—— ② 付款时把命盘关联上 ——')

const UID_A = '11111111-2222-3333-4444-555555555555'
const UID_B = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
const CHART_A = 'chart-aaaa-1111' // 属 UID_A
const CHART_B = 'chart-bbbb-2222' // 属 UID_B

// 内存仓储：镜像 DB 唯一约束 + charts 归属数据（waffo-accept memRepo 同型，加 charts）
function createMemRepo() {
  const eventKeys = new Set()
  const payments = []
  const charts = [
    { id: CHART_A, user_id: UID_A },
    { id: CHART_B, user_id: UID_B },
  ]
  return {
    _payments: payments,
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

function paidEvent({ eventId = 'EVT_X1', paymentId = 'PAY_X1', metadata = { userId: UID_A, sku: 'fatebook' } } = {}) {
  return {
    id: 'wh_x', timestamp: '2026-10-13T08:00:00.000Z', eventType: 'order.completed',
    eventId, storeId: 'STO_test', storeName: 't', mode: 'test',
    data: {
      orderId: 'ORD_X', orderStatus: 'succeeded', buyerEmail: 'b@e.com',
      orderMerchantExternalId: `MC-${UID_A}-1760000000001`,
      orderMetadata: metadata, chargedAmount: '29.99',
      paymentId, paymentDate: '2026-10-13T08:00:00.000Z',
    },
  }
}

// 断言①：metadata 带合法且归属该用户的 chartId → payments.chart_id 等于它
{
  const repo = createMemRepo()
  const r = await handleWaffoEvent(paidEvent({ metadata: { userId: UID_A, sku: 'fatebook', chartId: CHART_A } }), repo)
  assert(r.kind === 'inserted' && repo._payments[0]?.chart_id === CHART_A,
    `断言① 合法 chartId → 落账等于它（kind=${r.kind}，chart_id=${repo._payments[0]?.chart_id}）`)
}

// 断言②：★ chartId 不属于该 userId（属 UID_B）→ 写 NULL 不报错（§3.2 安全点）
{
  const repo = createMemRepo()
  const r = await handleWaffoEvent(paidEvent({ eventId: 'EVT_X2', paymentId: 'PAY_X2',
    metadata: { userId: UID_A, sku: 'fatebook', chartId: CHART_B } }), repo)
  assert(r.kind === 'inserted' && repo._payments[0]?.chart_id === null,
    `断言② chartId 属他人 → 落 NULL 不报错（kind=${r.kind}，chart_id=${repo._payments[0]?.chart_id}）`)

  // 命盘不存在（谁都不属）→ 同样 NULL
  const repo2 = createMemRepo()
  await handleWaffoEvent(paidEvent({ eventId: 'EVT_X3', paymentId: 'PAY_X3',
    metadata: { userId: UID_A, sku: 'fatebook', chartId: 'chart-nonexist-9999' } }), repo2)
  assert(repo2._payments[0]?.chart_id === null, '断言②b chartId 不存在 → 落 NULL')
}

// 断言③：metadata 无 chartId → 写 NULL 不报错（test-waffo-accept ③ 已有同型断言，此处独立真调）
{
  const repo = createMemRepo()
  const r = await handleWaffoEvent(paidEvent(), repo)
  assert(r.kind === 'inserted' && repo._payments[0]?.chart_id === null,
    `断言③ metadata 无 chartId → 落 NULL（kind=${r.kind}，chart_id=${repo._payments[0]?.chart_id}）`)
}

// 形态校验 normalizeChartIdMeta 真调（§3.2：string · 非空 · ≤64）
{
  assert(normalizeChartIdMeta(CHART_A) === CHART_A, '形态校验：合法 UUID 形态原样通过')
  assert(normalizeChartIdMeta(undefined) === null, '形态校验：undefined → null')
  assert(normalizeChartIdMeta(123) === null, '形态校验：非 string → null')
  assert(normalizeChartIdMeta('') === null && normalizeChartIdMeta('   ') === null, '形态校验：空串/纯空白 → null')
  assert(normalizeChartIdMeta('c'.repeat(65)) === null, '形态校验：>64 字符 → null')
  // buildPaidPaymentRow 内联形态校验：坏形态在行构造即落 NULL
  const rowBad = buildPaidPaymentRow({
    paymentId: 'PAY_Y1', orderMerchantExternalId: `MC-${UID_A}-1760000000002`,
    orderMetadata: { userId: UID_A, chartId: 'x'.repeat(65) }, chargedAmount: '29.99',
  })
  assert(rowBad?.chart_id === null, '行构造：坏形态 chartId → 行内即 NULL')
}

// resolveChartIdForUser 单一事实源真调（归属校验的唯一实现点——牙口锚点）
{
  const repo = createMemRepo()
  assert((await resolveChartIdForUser(repo, CHART_A, UID_A)) === CHART_A, '归属校验：本人命盘 → 通过')
  assert((await resolveChartIdForUser(repo, CHART_B, UID_A)) === null, '归属校验：他人命盘 → null')
  assert((await resolveChartIdForUser(repo, 'chart-nonexist-9999', UID_A)) === null, '归属校验：命盘不存在 → null')
}

// 对账补写路径同样带归属校验（§3.2：reconcilePayment 的 :179 路径）
{
  const repo = createMemRepo()
  const remote = { async findSucceededPayment() {
    return { paymentId: 'PAY_X9', status: 'succeeded', chargedAmount: '29.99',
      paymentDate: null, orderMerchantExternalId: `MC-${UID_A}-1760000000009`,
      userId: UID_A, sku: 'fatebook', chartId: CHART_B } // 远端 metadata 给了别人的命盘
  } }
  const out = await reconcilePayment({ repo, remote, userId: UID_A, ref: `MC-${UID_A}-1760000000009` })
  assert(out.status === 'owned' && repo._payments[0]?.chart_id === null,
    `对账补写：远端 chartId 属他人 → 补写行 chart_id NULL（got=${repo._payments[0]?.chart_id}）`)
  // 远端给本人命盘 → 补写行带关联
  // （单号时间戳必须纯数字——parseMerchantOrderId 对非数字 ts 返回 rejected，不进补写）
  const repo2 = createMemRepo()
  const remote2 = { async findSucceededPayment() {
    return { paymentId: 'PAY_XA', status: 'succeeded', chargedAmount: '29.99',
      paymentDate: null, orderMerchantExternalId: `MC-${UID_A}-1760000000010`,
      userId: UID_A, sku: 'fatebook', chartId: CHART_A }
  } }
  await reconcilePayment({ repo: repo2, remote: remote2, userId: UID_A, ref: `MC-${UID_A}-1760000000010` })
  assert(repo2._payments[0]?.chart_id === CHART_A, '对账补写：远端 chartId 属本人 → 补写行带关联')
}

// checkout 透传链路：buildCheckoutParams metadata + route 源码接线
{
  const params = buildCheckoutParams({
    productId: 'PROD_test', orderMerchantExternalId: `MC-${UID_A}-1760000000003`,
    buyerEmail: 'a@b.com', userId: UID_A, sku: 'fatebook', chartId: CHART_A,
    appUrl: 'http://localhost:3000', storeId: 'STO_x',
  })
  assert(params.metadata.chartId === CHART_A, `buildCheckoutParams：metadata.chartId 透传（got=${params.metadata.chartId}）`)
  const paramsNoChart = buildCheckoutParams({
    productId: 'PROD_test', orderMerchantExternalId: `MC-${UID_A}-1760000000004`,
    buyerEmail: 'a@b.com', userId: UID_A, sku: 'fatebook',
    appUrl: 'http://localhost:3000', storeId: 'STO_x',
  })
  assert(paramsNoChart.metadata.chartId === '', 'buildCheckoutParams：未带 chartId → metadata 落空串（webhook 写 NULL）')

  const routeSrc = stripComments(read('../src/app/api/checkout/route.ts'))
  assert(routeSrc.includes('body?.chartId'), 'checkout route 读 body.chartId（§3.1）')
  assert(routeSrc.includes('chartId: chartId || undefined'), 'checkout route 把 chartId 传进 buildCheckoutParams')
  const waffoSrc = stripComments(read('../src/lib/waffo.ts'))
  assert(/chartId:\s*input\.chartId\s*\?\?/.test(waffoSrc), 'waffo.ts metadata 含 chartId（§3.1：走 metadata 不改单号）')
}

console.log('\n' + (allPass ? 'FATEBOOK_ONEPAY_PASS' : 'FATEBOOK_ONEPAY_FAIL'))
if (!allPass) process.exit(1)