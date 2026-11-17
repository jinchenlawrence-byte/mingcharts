// 游客结账入口 + 成功页游客分支（阶段 B）验收断言
//
// 断两类：
//   A. 三语文案完整性（可直接 import 纯数据模块，不依赖 React/Next 运行时）
//   B. 关键约束是否仍写在代码里（防止后续重构把「只开命书 / 服务端定价 / 登录不显示 /
//      开关关闭 / 状态接口不吐报告」悄悄改掉）
import { readFileSync } from 'node:fs'
import { GUEST_ENTRY_COPY, GUEST_SUCCESS_COPY } from '../src/lib/guestCheckoutCopy.ts'

let allPass = true
const fail = (m) => { allPass = false; console.log('  ✗ ' + m) }
const ok = (m) => console.log('  ✓ ' + m)

const LOCALES = ['zh-Hans', 'zh-Hant', 'en']
const PHASES = [
  'guest_checking', 'guest_pending', 'guest_working', 'guest_ready',
  'guest_failed', 'guest_refunded', 'guest_expired', 'guest_claimed', 'guest_notfound',
]

console.log('—— A. 三语文案 ——')
{
  for (const loc of LOCALES) {
    const entry = GUEST_ENTRY_COPY[loc]
    if (!entry) { fail(`入口文案缺 ${loc}`); continue }
    for (const [k, v] of Object.entries(entry)) {
      if (typeof v !== 'string' || v.trim().length === 0) fail(`入口文案 ${loc}.${k} 为空`)
    }
    if (!entry.desc.includes('30')) fail(`入口文案 ${loc} 未说明 30 天认领窗口`)

    const success = GUEST_SUCCESS_COPY[loc]
    if (!success) { fail(`成功页文案缺 ${loc}`); continue }
    for (const phase of PHASES) {
      const item = success.phases?.[phase]
      if (!item || !item.title?.trim() || !item.body?.trim()) fail(`成功页文案 ${loc}.${phase} 缺失`)
    }
    if (!success.ref.trim()) fail(`成功页 ${loc} 缺业务单号标签`)
  }
  if (LOCALES.length !== 3) fail('语言数量应为 3')
  ok(`三语入口 ${LOCALES.length} 份 × ${Object.keys(GUEST_ENTRY_COPY.en).length} 字段、成功页 ${PHASES.length} 个状态全部齐全`)
}

console.log('—— A2. 繁体不是简体的机械转换 ——')
{
  const hans = GUEST_ENTRY_COPY['zh-Hans']
  const hant = GUEST_ENTRY_COPY['zh-Hant']
  if (hans.toggle === hant.toggle) fail('简繁入口文案相同（疑似未做繁体）')
  if (!hant.toggle.includes('帳號') || hant.toggle.includes('账号')) fail('繁体入口文案用字不对')
  if (!hant.note.includes('郵箱')) fail('繁体说明用字不对')
  ok('繁体逐字写死，用字与简体不同')
}

console.log('—— A3. {email} 占位符 ——')
{
  for (const loc of LOCALES) {
    const ready = GUEST_SUCCESS_COPY[loc].phases.guest_ready.body
    const working = GUEST_SUCCESS_COPY[loc].phases.guest_working.body
    if (!ready.includes('{email}')) fail(`${loc}.guest_ready 缺 {email}`)
    if (!working.includes('{email}')) fail(`${loc}.guest_working 缺 {email}`)
  }
  ok('待生成/已生成两态都带 {email} 占位符')
}

console.log('—— B. 代码约束 ——')
{
  const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')
  const checkoutApi = read('../src/app/api/guest/checkout/route.ts')
  const orderApi = read('../src/app/api/guest/order/route.ts')
  const entryUi = read('../src/components/guest/GuestCheckout.tsx')
  const paywall = read('../src/components/ChartPaywallBar.tsx')
  const successUi = read('../src/components/checkout/CheckoutSuccess.tsx')

  // 只开命书 + 服务端定价
  if (!checkoutApi.includes("const sku = 'fatebook'")) fail('游客结账未写死 fatebook')
  if (!checkoutApi.includes('SKUS[sku].priceUSD')) fail('价格未取服务端 SKUS')
  if (/body[^\n]*amount/i.test(checkoutApi)) fail('接口从请求体读取了金额')
  if (!checkoutApi.includes('GUEST_CHECKOUT_ENABLED')) fail('结账接口没有开关')
  if (!checkoutApi.includes("code: 'GUEST_CLOSED'")) fail('开关关闭时没有明确错误码')

  // 状态接口只回状态/打码邮箱，不吐报告内容
  if (!orderApi.includes('emailMasked')) fail('状态接口缺打码邮箱')
  if (orderApi.includes('report_result') || orderApi.includes('chart_snapshot')) {
    fail('状态接口泄露了报告/命盘内容')
  }
  if (!orderApi.includes('order_merchant_external_id !== ref')) fail('状态接口缺少单号一致性校验')
  if (!orderApi.includes('no-store')) fail('状态接口缺 no-store')

  // 登录用户看不到入口
  if (!entryUi.includes('auth.getSession()')) fail('入口未检查登录态')
  if (!entryUi.includes('if (!guestEnabledOnClient() || !visible) return null')) {
    fail('入口未在未登录确认前隐藏')
  }
  if (!paywall.includes('<GuestCheckout')) fail('付费条未挂游客入口')

  // 成功页游客分支不依赖登录
  if (!successUi.includes("orderRef.startsWith('MCG-')")) fail('成功页未识别游客单号')
  if (!successUi.includes('/api/guest/order?ref=')) fail('成功页没有调用游客状态接口')

  // 登录用户 metadata 逐字不变
  const waffo = read('../src/lib/waffo.ts')
  if (!waffo.includes('...(input.userId ? { userId: input.userId } : {})')) {
    fail('waffo metadata 的 userId 分支被改动')
  }
  if (!waffo.includes('successPath')) fail('waffo 缺少游客成功页落点支持')

  ok('只开命书 / 服务端定价 / 开关 / 登录隐藏 / 状态接口白名单 / metadata 兼容 均成立')
}

console.log(allPass ? '\n全部通过' : '\n存在失败项')
if (!allPass) process.exit(1)
