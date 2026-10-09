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

// ①-a 静态守卫：源码必须含 startsWith('MOCK_') 排除逻辑
const entSrc = readFileSync(
  new URL('../src/lib/entitlement.ts', import.meta.url), 'utf8'
)
const entCode = entSrc.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')
if (!entCode.includes("startsWith('MOCK_')")) {
  behavFail++; fail('entitlement.ts 代码不含 startsWith(\'MOCK_\') 排除逻辑（被注释或删除）')
}

console.log(behavFail === 0
  ? '✓ 行为断言：MOCK_流水→无fatebook / 真实单号→有fatebook / 未支付→无 / 会员有效期与过期；源码含排除逻辑'
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
  if (!upBody.includes('getEntitlements')) {
    unlockWriteFail++; fail('unlock POST 未调用 getEntitlements')
  }
  if (!upBody.includes('402')) {
    unlockWriteFail++; fail('unlock POST 拒绝时未返回 402')
  }
}
console.log(unlockWriteFail === 0
  ? '✓ 不写假流水：unlock POST 不含 payments.insert / MOCK_，判定走 canView，拒绝返回 402'
  : '✗ 不写假流水断言失败')

// ---------- ③ ★★ 架构约束：payments 全 src 零写入（除支付回调外）----------
// payments 是"账"——除将来的支付回调 webhook 外，全 src 不得写它。
// 当前还没有 webhook，所以全 src 写 payments 的地方应为 0。
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
let payWriteFail = 0
const payWriteHits = []
for (const file of walk(srcRoot)) {
  const content = readFileSync(file, 'utf8')
  const code = content.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')
  // 查 .from('payments').insert 或 .from("payments").insert
  if (/\.from\(\s*['"]payments['"]\s*\)[\s\S]*?\.insert\(/.test(code)) {
    payWriteHits.push(file.replace(srcRoot, 'src/'))
  }
}
if (payWriteHits.length > 0) {
  payWriteFail++
  fail(`payments 表仍有写入（应仅由支付回调写）：${payWriteHits.join('、')}`)
}
console.log(payWriteFail === 0
  ? `✓ 架构约束：payments 全 src 零写入（除支付回调外）—— 当前 ${payWriteHits.length} 处`
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
