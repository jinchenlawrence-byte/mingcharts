// ★ 订阅权益接线断言（档 A 2026-10-18）：把 6 项 SUBSCRIPTION_GRANTS 全部接上会员入口
// ① GRANT_LABELS 覆盖性——展示映射必须覆盖全部 grant（缺项会让会员页/定价页漏权益）
// ② canView 接线——每个 SUBSCRIPTION_GRANT 在 api/ 下有 canView(ent, 'grant') 调用
// ③ 文案单一事实源——pricing/member 页不得再本地定义 GRANT_LABELS，必须 import
// ④ 会员页锁定态统一——含统一提示语 + 链 /pricing
// ⑤ 牙口——grep 判据样本能检出/不误判

import { readFileSync, readdirSync, existsSync } from 'node:fs'

let allPass = true
const fail = (msg) => { allPass = false; console.log('  ✗ ' + msg) }

function walk(dir) {
  const out = []
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = dir + '/' + e.name
    if (e.isDirectory()) { out.push(...walk(p)); continue }
    if (e.isFile() && /\.(ts|tsx)$/.test(e.name)) out.push(p)
  }
  return out
}
const root = new URL('../src/', import.meta.url).pathname.replace(/^\/(\w:)/, '$1').replace(/\\/g, '/')
const allFiles = walk(root)
const relOf = (file) => file.replace(root, 'src/').replace(/\\/g, '/').replace(/\/+/g, '/')
const read = (rel) => readFileSync(root + rel.slice(4), 'utf8')
const exists = (rel) => existsSync(root + rel.slice(4))

const { SUBSCRIPTION_GRANTS, REPORT_GRANTS, SKUS } = await import('../src/lib/pricing.ts')
const { GRANT_LABELS } = await import('../src/lib/grantLabels.ts')

// ---------- ① GRANT_LABELS 覆盖性 ----------
console.log('—— ① GRANT_LABELS 覆盖性（展示映射须覆盖全部 grant）——')
let labelFail = 0
const allGrants = new Set([...SUBSCRIPTION_GRANTS, ...REPORT_GRANTS, 'ask'])
for (const g of allGrants) {
  if (!GRANT_LABELS[g]) { labelFail++; fail(`GRANT_LABELS 缺 grant「${g}」的中文标签`) }
}
// 每个 SKU 的每个 grant 都必须有标签（杜绝新增权益漏文案）
for (const sku of Object.values(SKUS)) {
  for (const g of sku.grants) {
    if (!GRANT_LABELS[g]) { labelFail++; fail(`${sku.id}.grants[${g}] 无标签`) }
  }
}
console.log(labelFail === 0
  ? `✓ GRANT_LABELS 覆盖：${allGrants.size} 个 grant（含 ${SUBSCRIPTION_GRANTS.length} 项订阅权益）全部有中文标签`
  : `✗ GRANT_LABELS 缺项 ${labelFail} 处`)

// ---------- ② 门禁接线（订阅 grant，全库级）----------
// ★ multi_chart 是「配额」而非「能否查看」：走 chartLimitFor（配额口径，复用 grantsCover），
//   刻意不走 canView —— 否则 ENFORCE=false 时 canView 恒真会让所有用户都算会员。
//   其余 5 项内容型权益一律走 canView。
console.log('—— ② 门禁接线（内容型 grant 走 canView；multi_chart 走 chartLimitFor 配额）——')
let gateFail = 0
const CONTENT_GRANTS = SUBSCRIPTION_GRANTS.filter((g) => g !== 'multi_chart')
for (const grant of CONTENT_GRANTS) {
  const re = new RegExp(`canView\\s*\\(\\s*ent\\s*,\\s*['"]${grant}['"]`)
  let found = false
  for (const file of allFiles) {
    if (!file.includes('/api/')) continue
    if (re.test(readFileSync(file, 'utf8'))) { found = true; break }
  }
  if (!found) { gateFail++; fail(`canView(ent, '${grant}') 在 api/ 下无调用`) }
}
let multiFound = false
for (const file of allFiles) {
  if (!file.includes('/api/')) continue
  if (/chartLimitFor\s*\(/.test(readFileSync(file, 'utf8'))) { multiFound = true; break }
}
if (!multiFound) { gateFail++; fail('multi_chart 未在 api/ 下用 chartLimitFor 校验配额') }
console.log(gateFail === 0
  ? `✓ 门禁接线：${CONTENT_GRANTS.length} 项内容权益走 canView；multi_chart 走 chartLimitFor 配额（共 ${SUBSCRIPTION_GRANTS.length} 项订阅权益全部接线）`
  : `✗ 门禁接线缺失 ${gateFail} 处`)

// ---------- ③ 文案单一事实源 ----------
console.log('—— ③ 文案单一事实源（pricing/member 页 import GRANT_LABELS，不本地定义）——')
let srcFail = 0
for (const rel of ['src/app/pricing/page.tsx', 'src/app/member/page.tsx']) {
  if (!exists(rel)) { srcFail++; fail(`${rel} 不存在`); continue }
  const c = read(rel)
  if (!/from\s+['"]@\/lib\/grantLabels['"]/.test(c)) { srcFail++; fail(`${rel} 未 import GRANT_LABELS（文案可能漂移）`) }
  if (/const\s+GRANT_LABELS\s*[:=]/.test(c)) { srcFail++; fail(`${rel} 仍本地定义 GRANT_LABELS（须抽到共享模块）`) }
}
// 权益事实只认 SUBSCRIPTION_GRANTS：页面不得出现整表硬编码
const memberSrc = exists('src/app/member/page.tsx') ? read('src/app/member/page.tsx') : ''
if (/['"]daily['"]\s*,\s*['"]liuyue['"]/.test(memberSrc)) { srcFail++; fail('member 页硬编码了权益字面量表') }
console.log(srcFail === 0
  ? '✓ 文案单源：pricing/member 页均 import GRANT_LABELS，无本地权益字面量表'
  : `✗ 文案单源缺失 ${srcFail} 处`)

// ---------- ④ 会员页锁定态统一 ----------
console.log('—— ④ 会员页锁定态统一（提示语 + 链 /pricing）——')
let lockFail = 0
if (!memberSrc.includes('本项为会员权益')) { lockFail++; fail('member 页缺统一锁定提示语「本项为会员权益」') }
if (!/href="\/pricing"/.test(memberSrc)) { lockFail++; fail('member 页锁定态未链到 /pricing') }
console.log(lockFail === 0
  ? '✓ 会员页锁定态：统一提示语 + 链 /pricing（与 api/daily 的 closed 范式一致）'
  : `✗ 会员页锁定态缺失 ${lockFail} 处`)

// ---------- 牙口自检 ----------
console.log('—— 牙口自检 ——')
let toothFail = 0
if (!/canView\s*\(\s*ent\s*,\s*['"]liuyue['"]/.test("canView(ent, 'liuyue')")) { toothFail++; fail('牙口：canView liuyue 样本未检出') }
if (/const\s+GRANT_LABELS\s*[:=]/.test('const GRANT_LABELS = {}')) { /* 命中即正确 */ } else { toothFail++; fail('牙口：本地 GRANT_LABELS 定义未检出') }
if (!/from\s+['"]@\/lib\/grantLabels['"]/.test("import { GRANT_LABELS } from '@/lib/grantLabels'")) { toothFail++; fail('牙口：GRANT_LABELS import 样本未检出') }
console.log(toothFail === 0
  ? '✓ 牙口自检：canView 接线 / 本地定义 / import 判据样本均能检出'
  : '✗ 牙口自检失败')

console.log('\n' + (allPass ? 'MEMBER_GRANTS_PASS' : 'MEMBER_GRANTS_FAIL'))
if (!allPass) process.exit(1)
