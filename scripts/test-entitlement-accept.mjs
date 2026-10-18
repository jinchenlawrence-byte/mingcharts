// 权益链路验收（HANDOFF-打通entitlement链路 §四；REPLY-打通entitlement链路验收 §二返修）
// ★ 本轮返修核心：断言 ① 从"测试自己造字面量"改为"真跑生产代码 entitlementsFromRows"
import { readFileSync, readdirSync } from 'node:fs'
import {
  ENTITLEMENT_ENFORCE,
  canView,
  EMPTY_ENTITLEMENTS,
  entitlementsFromRows,
} from '../src/lib/entitlement.ts'
import { SKUS } from '../src/lib/pricing.ts'

let allPass = true
const fail = (msg) => { allPass = false; console.log('  ✗ ' + msg) }

// 在 ENFORCE=true 时模拟判定（canView 在 ENFORCE=false 时恒 true，无法测出差异，
//   所以直接走 canView 的判定路径逻辑：sources.some(id => SKUS[id].grants.includes(grant)))
function canViewEnforced(ent, grant) {
  const sources = [...ent.memberSkus, ...ent.ownedSkus]
  return sources.some((id) => SKUS[id].grants.includes(grant))
}

// ---------- ① ★★★ 真跑 entitlementsFromRows 的行为断言 ----------
// ★ 不再造字面量 Entitlements —— 直接喂数据给生产纯函数，让它真跑排除逻辑。
const now = Date.now()
const futureISO = new Date(now + 86400000 * 30).toISOString()
const pastISO = new Date(now - 86400000 * 30).toISOString()

let behavFail = 0

// ①-1: MOCK_ 流水 → 无 fatebook
const mockEnt = entitlementsFromRows(
  [{ payment_type: 'single', status: 'paid', transaction_id: 'MOCK_123' }],
  null
)
if (mockEnt.ownedSkus.has('fatebook')) {
  behavFail++; fail(`MOCK_ 流水不应产生 fatebook 权益，实得 ownedSkus=[${Array.from(mockEnt.ownedSkus)}]`)
}

// ①-2: 真实单号 → 有 fatebook
const realEnt = entitlementsFromRows(
  [{ payment_type: 'single', status: 'paid', transaction_id: 'WF-2026-001' }],
  null
)
if (!realEnt.ownedSkus.has('fatebook')) {
  behavFail++; fail(`真实流水应产生 fatebook 权益，实得 ownedSkus=[${Array.from(realEnt.ownedSkus)}]`)
}

// ①-3: status 非 paid → 无 fatebook
const unpaidEnt = entitlementsFromRows(
  [{ payment_type: 'single', status: 'pending', transaction_id: 'WF-2026-002' }],
  null
)
if (unpaidEnt.ownedSkus.has('fatebook')) {
  behavFail++; fail(`未支付流水不应产生权益，实得 ownedSkus=[${Array.from(unpaidEnt.ownedSkus)}]`)
}

// ①-4: 会员有效期与过期
const activeMember = entitlementsFromRows(null, {
  is_member: true, member_plan: 'yearly', member_expire_at: futureISO
})
if (activeMember.memberSkus.length !== 1 || activeMember.memberSkus[0] !== 'member_yearly') {
  behavFail++; fail(`有效会员应持 member_yearly，实得 memberSkus=[${activeMember.memberSkus}]`)
}
const expiredMember = entitlementsFromRows(null, {
  is_member: true, member_plan: 'yearly', member_expire_at: pastISO
})
if (expiredMember.memberSkus.length !== 0) {
  behavFail++; fail(`过期会员不应持 SKU，实得 memberSkus=[${expiredMember.memberSkus}]`)
}

// ①-5 ★★★ SKU 归集（2026-10-18 修复）：买紫微深度不得白送命书，且必须真授紫微
const ziweiEnt = entitlementsFromRows(
  [{ payment_type: 'single', status: 'paid', transaction_id: 'WF-2026-003', sku: 'ziwei_deep' }],
  null
)
if (ziweiEnt.ownedSkus.has('fatebook')) {
  behavFail++; fail('买紫微深度不得白送命书（fatebook）—— 旧实现一律归 fatebook 的真实事故')
}
if (!ziweiEnt.ownedSkus.has('ziwei_deep')) {
  behavFail++; fail('买紫微深度必须授予 ziwei_deep（真实事故：付款后未解锁）')
}

// ①-6 ★★★ 五个单次 SKU 逐个核对：各授自身；除 bundle3（正含 fatebook）外不得白送命书
for (const sku of ['annual_report', 'hemun', 'ziwei_deep', 'geo', 'bundle3']) {
  const e = entitlementsFromRows(
    [{ payment_type: 'single', status: 'paid', transaction_id: 'WF-X', sku }], null
  )
  if (!e.ownedSkus.has(sku)) { behavFail++; fail(`${sku} 付款未授予自身权益`) }
  if (!SKUS[sku].grants.includes('fatebook') && e.ownedSkus.has('fatebook')) {
    behavFail++; fail(`${sku} 不应白送 fatebook（其 grants 不含）`)
  }
}

// ①-7 未知/脏 sku → 不授予任何权益（防脏数据放大权益）
const dirtyEnt = entitlementsFromRows(
  [{ payment_type: 'single', status: 'paid', transaction_id: 'WF-Y', sku: ' admin ' }], null
)
if (dirtyEnt.ownedSkus.size !== 0) {
  behavFail++; fail(`未知 sku 不得授予权益，实得 [${[...dirtyEnt.ownedSkus]}]`)
}

// ①-8 空 sku（payments.sku 列上线前的老流水，当时只有命书单）→ 仍归 fatebook（历史兼容）
const legacyEnt = entitlementsFromRows(
  [{ payment_type: 'single', status: 'paid', transaction_id: 'WF-Z' }], null
)
if (!legacyEnt.ownedSkus.has('fatebook')) {
  behavFail++; fail('空 sku 老流水应仍归 fatebook（历史兼容，不可丢老用户命书）')
}


// ①-a 静态守卫：源码必须含 startsWith('MOCK_') 排除逻辑
const entSrc = readFileSync(
  new URL('../src/lib/entitlement.ts', import.meta.url), 'utf8'
)
const entCode = entSrc.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')
if (!entCode.includes("startsWith('MOCK_')")) {
  behavFail++; fail('entitlement.ts 代码不含 startsWith(\'MOCK_\') 排除逻辑（被注释或删除）')
}

console.log(behavFail === 0
  ? '✓ 行为断言：MOCK_流水→无fatebook / 真实单号→有fatebook / 未支付→无 / 会员有效期与过期；'
    + '★按sku归集(买紫微不白送命书且真授紫微/五SKU逐个核对/脏sku不授/空sku归fatebook兼容)；源码含排除逻辑'
  : '✗ 行为断言失败')

// ---------- ② ★★ membership POST 不含 admin.from(（充分条件，抓换写法）----------
const membershipSrc = readFileSync(
  new URL('../src/app/api/membership/route.ts', import.meta.url), 'utf8'
)
let writeFail = 0
const postMatch = membershipSrc.match(/export async function POST[\s\S]*$/)
if (!postMatch) { writeFail++; fail('membership/route.ts 未找到 POST 方法') }
else {
  const postBody = postMatch[0]
  // 剥注释后检查代码区
  const postCode = postBody.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')
  // ★ 充分条件：POST 体内不得出现任何 admin.from( 调用
  //   不管是 .from('profiles').update 还是 .from('payments').insert，
  //   只要 POST 不碰 admin.from(，就一定不写库
  if (postCode.includes('admin.from(') || postCode.includes('admin\n      .from(') || postCode.includes('.from(')) {
    // 进一步检查：是否是 admin.xxx.from( 形式
    if (/admin[\s\S]*?\.from\(/.test(postCode)) {
      writeFail++; fail('membership POST 仍含 admin.from( —— 不得在 POST 内查写任何表')
    }
  }
  if (!postBody.includes('trial: true')) {
    writeFail++; fail('membership POST 未返回 trial:true')
  }
  if (!postBody.includes('ENTITLEMENT_ENFORCE')) {
    writeFail++; fail('membership POST 未引用 ENTITLEMENT_ENFORCE')
  }
}
console.log(writeFail === 0
  ? '✓ 不落库：membership POST 不含 admin.from(，返回 trial:true，引用 ENFORCE 开关'
  : '✗ 不落库断言失败')

// ---------- ②b unlock POST 不写 payments、走 canView ----------
const unlockSrc = readFileSync(
  new URL('../src/app/api/unlock/route.ts', import.meta.url), 'utf8'
)
let unlockWriteFail = 0
const unlockPost = unlockSrc.match(/export async function POST[\s\S]*$/)
if (!unlockPost) { unlockWriteFail++; fail('unlock/route.ts 未找到 POST 方法') }
else {
  const upBody = unlockPost[0]
  const upCode = upBody.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')
  // unlock POST 不得写 payments（不得含 admin.from('payments').insert）
  if (/admin[\s\S]*?\.from\(\s*['"]payments['"]\)[\s\S]*?\.insert\(/.test(upCode)) {
    unlockWriteFail++; fail('unlock POST 仍含 payments.insert —— 不得写假流水')
  }
  if (upCode.includes('MOCK_')) {
    unlockWriteFail++; fail('unlock POST 代码仍含 MOCK_ 前缀')
  }
  if (!upBody.includes('canView')) {
    unlockWriteFail++; fail('unlock POST 未调用 canView')
  }
  // ★ 断言意图（§8.5.1）：unlock 门禁必须走 entitlement 模块单一判定函数，不得路由内自判。
  //   HANDOFF-命书一份一付 §四后，unlock 已由 getEntitlements+canView 粗判升级为
  //   canViewFatebookForChart 按盘判定（同在 entitlement.ts，单一判定意图不变），
  //   按 §8.6.2 期望值跟随事实更新：两者任一在即视为接线。
  if (!(upBody.includes('canViewFatebookForChart') || upBody.includes('getEntitlements'))) {
    unlockWriteFail++; fail('unlock POST 未接线 entitlement 门禁（canViewFatebookForChart/getEntitlements）')
  }
  if (!upBody.includes('402')) {
    unlockWriteFail++; fail('unlock POST 拒绝时未返回 402')
  }
}
console.log(unlockWriteFail === 0
  ? '✓ 不写假流水：unlock POST 不含 payments.insert / MOCK_，判定走 canView，拒绝返回 402'
  : '✗ 不写假流水断言失败')

// ---------- ③ ★★ 架构约束：payments 写入只允许支付链路 ----------
// payments 是"账"——除 Waffo 支付回调 / 兜底补单外，全 src 不得写它。
// 唯一合规写入者：src/lib/waffo-repo.ts（webhook 与 verify-payment 共用的幂等写入）。
function walk(dir) {
  const out = []
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = dir + '\\' + e.name
    if (e.isDirectory()) { out.push(...walk(p)); continue }
    if (e.isFile() && /\.(ts|tsx)$/.test(e.name)) out.push(p)
  }
  return out
}
const srcRoot = new URL('../src/', import.meta.url).pathname.replace(/^\/(\w:)/, '$1')
// 支付链路唯一合规写入者白名单（HANDOFF-Waffo支付集成 §5.3/§5.4）
const PAY_WRITE_ALLOWLIST = ['src/lib/waffo-repo.ts']
let payWriteFail = 0
const payWriteHits = []
for (const file of walk(srcRoot)) {
  const content = readFileSync(file, 'utf8')
  const code = content.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')
  // 查 .from('payments').insert 或 .from("payments").insert
  if (/\.from\(\s*['"]payments['"]\s*\)[\s\S]*?\.insert\(/.test(code)) {
    const rel = file.replace(srcRoot, 'src/').replace(/\\/g, '/').replace(/\/+/g, '/')
    if (!PAY_WRITE_ALLOWLIST.includes(rel)) payWriteHits.push(rel)
  }
}
if (payWriteHits.length > 0) {
  payWriteFail++
  fail(`payments 表出现非支付链路写入：${payWriteHits.join('、')}`)
}
console.log(payWriteFail === 0
  ? `✓ 架构约束：payments 写入仅白名单 [${PAY_WRITE_ALLOWLIST.join('、')}]，越界 ${payWriteHits.length} 处`
  : '✗ 架构约束断言失败')

// ---------- ④ canView 分支正确性 ----------
let branchFail = 0
if (!canView(EMPTY_ENTITLEMENTS, 'fatebook')) {
  branchFail++; fail('ENFORCE=false 时 canView 应恒 true')
}
if (!canView(EMPTY_ENTITLEMENTS, 'daily')) {
  branchFail++; fail('ENFORCE=false 时 canView 应恒 true（任意 grant）')
}
const memberOnlyEnt = { memberSkus: ['member_yearly'], ownedSkus: new Set() }
if (canViewEnforced(memberOnlyEnt, 'fatebook') !== false) {
  branchFail++; fail('ENFORCE=true 时会员 canView(fatebook) 应为 false（订阅不含报告）')
}
if (canViewEnforced(memberOnlyEnt, 'daily') !== true) {
  branchFail++; fail('ENFORCE=true 时会员 canView(daily) 应为 true（订阅含 daily）')
}
if (ENTITLEMENT_ENFORCE !== false) {
  branchFail++; fail(`ENTITLEMENT_ENFORCE 必须为 false，当前为 ${ENTITLEMENT_ENFORCE}`)
}
console.log(branchFail === 0
  ? `✓ canView 分支：ENFORCE=${ENTITLEMENT_ENFORCE} 恒放行；模拟 ENFORCE=true 时会员不含 fatebook、含 daily`
  : '✗ canView 分支断言失败')

console.log('\n' + (allPass ? 'ENTITLEMENT_ACCEPT_PASS' : 'ENTITLEMENT_ACCEPT_FAIL'))
if (!allPass) process.exit(1)
