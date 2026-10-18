// ★ 多命盘上限断言（档 A 2026-10-18）：multi_chart 权益的服务端配额
// ① 常量：MULTI_CHART_LIMIT = { free:1, member:5 }（匹配「3–5 个」文案上限）
// ② 纯函数 chartLimitFor：覆盖 multi_chart → 5，否则 1（复用 grantsCover，口径只此一份）
// ③ 服务端硬校验：/api/charts/save 用 chartLimitFor + 计数 + 超限 402
// ④ 前端消费：SaveChart 改走服务端、charts 页展示 n/上限
// ⑤ 牙口：判据有判别力（会员≠免费；bundle3 不含 multi_chart）

import { readFileSync, existsSync } from 'node:fs'

let allPass = true
const fail = (msg) => { allPass = false; console.log('  ✗ ' + msg) }

const root = new URL('../src/', import.meta.url).pathname.replace(/^\/(\w:)/, '$1').replace(/\\/g, '/')
const read = (rel) => readFileSync(root + rel.slice(4), 'utf8')

const { MULTI_CHART_LIMIT } = await import('../src/lib/pricing.ts')
const { chartLimitFor, EMPTY_ENTITLEMENTS, grantsCover } = await import('../src/lib/entitlement.ts')

// ---------- ① 常量 ----------
console.log('—— ① MULTI_CHART_LIMIT 常量 ——')
let constFail = 0
if (MULTI_CHART_LIMIT.free !== 1) { constFail++; fail(`free 上限应为 1，实际 ${MULTI_CHART_LIMIT.free}`) }
if (MULTI_CHART_LIMIT.member !== 5) { constFail++; fail(`member 上限应为 5（「3–5 个」取上限），实际 ${MULTI_CHART_LIMIT.member}`) }
console.log(constFail === 0
  ? '✓ 多命盘上限常量：免费 1 / 会员 5（SUBSCRIPTION_GRANTS 含 multi_chart 的配额）'
  : `✗ 上限常量异常 ${constFail} 处`)

// ---------- ② 纯函数 chartLimitFor ----------
console.log('—— ② chartLimitFor（复用 grantsCover，口径只此一份）——')
const memberYearly = { memberSkus: ['member_yearly'], ownedSkus: [] }
const memberMonthly = { memberSkus: ['member_monthly'], ownedSkus: [] }
const noMember = { memberSkus: [], ownedSkus: [] }
const bundle3 = { memberSkus: [], ownedSkus: ['bundle3'] }
const fatebook = { memberSkus: [], ownedSkus: ['fatebook'] }
const cases = [
  [EMPTY_ENTITLEMENTS, 1, '空权益'],
  [noMember, 1, '无会员'],
  [bundle3, 1, 'bundle3（不含 multi_chart）'],
  [fatebook, 1, 'fatebook（报告类，不含多命盘）'],
  [memberYearly, 5, '年度会员'],
  [memberMonthly, 5, '月度会员'],
]
let fnFail = 0
for (const [ent, exp, label] of cases) {
  const got = chartLimitFor(ent)
  if (got !== exp) { fnFail++; fail(`${label} 上限期望 ${exp}，实际 ${got}`) }
}
console.log(fnFail === 0
  ? `✓ chartLimitFor：${cases.length} 组权益判定全对（会员 5 / 非会员 1）`
  : `✗ chartLimitFor 判定失败 ${fnFail} 处`)

// 独立一致性：chartLimitFor 与 grantsCover(ent,'multi_chart') 必须同向（口径不漂移）
let syncFail = 0
for (const [ent] of cases) {
  const covered = grantsCover(ent, 'multi_chart')
  const isMemberLimit = chartLimitFor(ent) === MULTI_CHART_LIMIT.member
  if (covered !== isMemberLimit) { syncFail++; fail('chartLimitFor 与 grantsCover 口径不一致') }
}
console.log(syncFail === 0
  ? '✓ 口径一致：chartLimitFor 严格等价 grantsCover(ent, multi_chart)'
  : `✗ 口径漂移 ${syncFail} 处`)

// ---------- ③ 服务端硬校验 ----------
console.log('—— ③ /api/charts/save 服务端校验 ——')
let routeFail = 0
const savePath = 'src/app/api/charts/save/route.ts'
if (!existsSync(root + savePath.slice(4))) {
  routeFail++; fail('缺 /api/charts/save 路由')
} else {
  const c = read(savePath)
  if (!/chartLimitFor\s*\(/.test(c)) { routeFail++; fail('save 路由未用 chartLimitFor 判上限') }
  if (!/count:\s*'exact'/.test(c)) { routeFail++; fail('save 路由未做精确计数') }
  if (!/402/.test(c)) { routeFail++; fail('save 路由超限未返 402') }
  if (!/auth\.getUser\s*\(/.test(c)) { routeFail++; fail('save 路由未校验 token 用户') }
  if (/user_id:\s*.*body|body.*user_id|input\.user_id/.test(c)) { routeFail++; fail('save 路由信任了 body 的 user_id（越权风险）') }
}
console.log(routeFail === 0
  ? '✓ 服务端硬校验：chartLimitFor + 精确计数 + 超限 402 + token 鉴权，不采信 body.user_id'
  : `✗ 服务端校验缺失 ${routeFail} 处`)

// ---------- ④ 前端消费 ----------
console.log('—— ④ 前端消费（SaveChart 走服务端 / charts 页展示上限）——')
let feFail = 0
const saveChart = read('src/components/SaveChart.tsx')
if (!/\/api\/charts\/save/.test(saveChart)) { feFail++; fail('SaveChart 未改走 /api/charts/save（仍是客户端直插）') }
if (/supabase\s*\.from\s*\(\s*['"]charts['"]\s*\)\s*\.insert/.test(saveChart)) { feFail++; fail('SaveChart 仍保留客户端直插（绕过服务端上限）') }
const chartsPage = read('src/app/charts/page.tsx')
if (!/\/api\/member\/summary/.test(chartsPage)) { feFail++; fail('charts 页未取上限（未展示 n/上限）') }
console.log(feFail === 0
  ? '✓ 前端消费：SaveChart 改走服务端保存；charts 页展示「已保存 n/上限」'
  : `✗ 前端消费缺失 ${feFail} 处`)

// ---------- 牙口自检 ----------
console.log('—— 牙口自检 ——')
let toothFail = 0
// 会员上限必须 ≠ 免费上限，否则「配额」无判别力
if (chartLimitFor(memberYearly) === chartLimitFor(noMember)) { toothFail++; fail('牙口：会员与免费上限相同，断言无判别力') }
// 假实现（恒返 1）必须被 fnFail 捕获——样本证明
const constImpl = () => 1
if (constImpl(memberYearly) === chartLimitFor(memberYearly)) { toothFail++; fail('牙口：恒返 1 的坏实现未被区分') }
if (!/chartLimitFor\s*\(/.test('chartLimitFor(ent)')) { toothFail++; fail('牙口：chartLimitFor 调用样本未检出') }
console.log(toothFail === 0
  ? '✓ 牙口自检：会员≠免费；恒返值坏实现可被区分；调用样本可检出'
  : '✗ 牙口自检失败')

console.log('\n' + (allPass ? 'MULTICHART_LIMIT_PASS' : 'MULTICHART_LIMIT_FAIL'))
if (!allPass) process.exit(1)
