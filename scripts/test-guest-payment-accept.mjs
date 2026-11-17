// 游客支付落账与生成补偿（阶段 C）验收断言
//
// A. 纯函数：事件分流、支付行构造（user_id 必须为 null）
// B. 静态约束：游客分支必须在 handleWaffoEvent 之前；登录分支未被改写；
//    生成物不写 reports；cron 与 vercel 配置就位；重试上限 3 次
import { readFileSync } from 'node:fs'
import { readGuestOrderEvent, buildGuestPaymentRow } from '../src/lib/guestWaffo.ts'

let allPass = true
const fail = (m) => { allPass = false; console.log('  ✗ ' + m) }
const ok = (m) => console.log('  ✓ ' + m)

const ev = (over = {}) => ({
  eventType: 'order.completed',
  eventId: 'EVT_1',
  data: {
    orderId: 'ORD_1',
    buyerEmail: 'Buyer@Example.COM ',
    orderMerchantExternalId: 'MCG-9f1d2c3b-4a5e-4f60-8b71-2c3d4e5f6a7b-1763300000000',
    chargedAmount: '29.99',
    currency: 'USD',
    productName: 'Fate Book',
    paymentId: 'PAY_abc123',
    paymentMethod: 'card',
    paymentDate: '2026-11-17T10:00:00.000Z',
    orderMetadata: { mode: 'guest', guestOrderId: '9f1d2c3b-4a5e-4f60-8b71-2c3d4e5f6a7b', sku: 'fatebook' },
    ...over,
  },
})

console.log('—— A. 事件分流 ——')
{
  // 登录用户事件（只有 userId）绝不能进游客分支
  const login = ev({ orderMetadata: { userId: 'u-1', sku: 'fatebook' }, orderMerchantExternalId: 'MC-u-1-1763300000000' })
  if (readGuestOrderEvent(login) !== null) fail('登录用户事件被误判为游客事件')

  const guest = readGuestOrderEvent(ev())
  if (guest?.kind !== 'guest' || guest.order.guestOrderId !== '9f1d2c3b-4a5e-4f60-8b71-2c3d4e5f6a7b') {
    fail('标准游客事件解析失败')
  }

  // 只有 MCG- 单号（退款事件可能没有 metadata）
  const refund = ev({
    eventType: 'refund.succeeded',
    orderMetadata: {},
    paymentId: 'PAY_abc123',
    refundedAmount: '29.99',
  })
  const r = readGuestOrderEvent(refund)
  if (r?.kind !== 'guest' || r.order.guestOrderId !== '9f1d2c3b-4a5e-4f60-8b71-2c3d4e5f6a7b') {
    fail('仅凭 MCG- 单号未能识别游客退款')
  }

  // metadata 与单号不一致 → 非法
  const bad = ev({ orderMetadata: { mode: 'guest', guestOrderId: '00000000-0000-0000-0000-000000000001', sku: 'fatebook' } })
  if (readGuestOrderEvent(bad)?.kind !== 'guest_invalid') fail('metadata 与单号不一致时未判非法')

  const noId = ev({ orderMetadata: { mode: 'guest', sku: 'fatebook' }, orderMerchantExternalId: 'MC-u-1-1' })
  if (readGuestOrderEvent(noId)?.kind !== 'guest_invalid') fail('mode=guest 但无单号时未判非法')

  ok('登录事件不误判；游客事件可解析；不一致/缺单号判非法')
}

console.log('—— A2. 支付行 ——')
{
  const row = buildGuestPaymentRow(ev(), { guestOrderId: '9f1d2c3b-4a5e-4f60-8b71-2c3d4e5f6a7b', ref: 'x' }, '2026-11-17T10:00:01.000Z')
  if (!row) { fail('合法事件未构造出支付行') }
  else {
    if (row.user_id !== null) fail('游客支付行 user_id 必须为 null')
    if (row.guest_order_id !== '9f1d2c3b-4a5e-4f60-8b71-2c3d4e5f6a7b') fail('guest_order_id 未写入')
    if (row.amount !== 29.99) fail('金额解析错误')
    if (row.buyer_email !== 'buyer@example.com') fail('邮箱未归一')
    if (row.sku !== 'fatebook') fail('sku 丢失')
    if (row.status !== 'paid' || row.payment_type !== 'single') fail('状态/类型不对')
  }

  if (buildGuestPaymentRow(ev({ paymentId: 'ORD_x' }), { guestOrderId: 'x', ref: 'x' }, 't')) fail('非 PAY_ 单号被接受')
  if (buildGuestPaymentRow(ev({ chargedAmount: 'abc' }), { guestOrderId: 'x', ref: 'x' }, 't')) fail('非法金额被接受')
  if (buildGuestPaymentRow(ev({ orderMetadata: { mode: 'guest', sku: '' } }), { guestOrderId: 'x', ref: 'x' }, 't')) {
    fail('缺 sku 被接受')
  }
  ok('user_id=null / 金额与邮箱归一 / 非法载荷全部拒绝')
}

console.log('—— B. 代码约束 ——')
{
  const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')
  const route = read('../src/app/api/webhooks/waffo/route.ts')
  const report = read('../src/lib/guestReport.ts')
  const cron = read('../src/app/api/cron/guest-orders/route.ts')
  const vercel = JSON.parse(read('../vercel.json'))

  const guestIdx = route.indexOf('readGuestOrderEvent(event)')
  const loginIdx = route.indexOf('handleWaffoEvent(event, repo)')
  if (guestIdx < 0 || loginIdx < 0) fail('webhook 缺少游客分支或登录分支')
  if (!(guestIdx < loginIdx)) fail('游客分支必须在 handleWaffoEvent 之前')
  if (!route.includes("case 'guest_paid'")) fail('缺少 guest_paid 分支')
  if (!route.includes('after(async () =>')) fail('游客生成未放到 after() 后台')
  if (!route.includes("return NextResponse.json({ error: 'processing failed' }, { status: 500 })")) {
    fail('游客异常未返回 5xx 触发重试')
  }

  if (/\.from\('reports'\)/.test(report)) fail('游客生成不得写 reports')
  if (!report.includes('GUEST_GENERATION_MAX_ATTEMPTS = 3')) fail('重试上限不是 3')
  if (!report.includes(".eq('generation_attempts', attempts)")) fail('缺少乐观锁')
  if (!report.includes("status: 'failed'")) fail('失败未落 failed 状态')

  if (!cron.includes('CRON_SECRET')) fail('cron 缺少鉴权')
  if (!cron.includes('GUEST_GENERATION_MAX_ATTEMPTS')) fail('cron 未过滤用尽重试的单')
  if (!Array.isArray(vercel.crons) || !vercel.crons.some((c) => c.path === '/api/cron/guest-orders')) {
    fail('vercel.json 未注册 guest-orders cron')
  }

  ok('游客分支先于登录分支；不写 reports；3 次上限；cron 与 vercel 就位')
}

console.log(allPass ? '\n全部通过' : '\n存在失败项')
if (!allPass) process.exit(1)
