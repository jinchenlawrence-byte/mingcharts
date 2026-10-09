// ★ 门禁接线断言（HANDOFF-geo改真付费与门禁补完 §五）
// ① geo free/locked 结构——行为：真调 /api/geo POST，断言 locked=null + free.geo 存在
// ② canView 接线——grep route 源码：REPORT_GRANTS 每个 grant 有 canView 调用
// ③ 前端消费 locked——grep 4 个页面源码有 locked 读取
// ④ 定价与门禁一致性——grep：ONE_TIME_SKUS 每个 grant 有 canView + locked skus 包含
// ⑤ prompt 同源——grep 四模块 SYSTEM_PROMPT 含 FORBIDDEN_WORDS 全集
// ⑥ ENFORCE=false 回归——ENTITLEMENT_ENFORCE === false + canView 恒 true

import { readFileSync, readdirSync, existsSync } from 'node:fs'

let allPass = true
const fail = (msg) => { allPass = false; console.log('  ✗ ' + msg) }

// ---------- 工具：递归枚举 .ts/.tsx（统一正斜杠）----------
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

// ---------- ① geo free/locked 结构（行为断言：真调 route handler）----------
console.log('—— ① geo free/locked 结构（真调 /api/geo POST）——')
let geoBehaviorFail = 0
try {
  const { ENTITLEMENT_ENFORCE, canView, EMPTY_ENTITLEMENTS } = await import('../src/lib/entitlement.ts')
  const { REPORT_GRANTS, ONE_TIME_SKUS, SKUS } = await import('../src/lib/pricing.ts')

  // ⑥ ENFORCE=false 回归
  console.log('—— ⑥ ENFORCE=false 回归 ——')
  if (ENTITLEMENT_ENFORCE !== false) { fail('ENTITLEMENT_ENFORCE 不是 false（内测期行为会变）'); geoBehaviorFail++ }
  let enforceOk = 0
  for (const g of REPORT_GRANTS) {
    if (canView(EMPTY_ENTITLEMENTS, g)) enforceOk++
    else { fail(`canView(EMPTY, '${g}') 在 ENFORCE=false 时未放行`); geoBehaviorFail++ }
  }
  console.log(enforceOk === REPORT_GRANTS.length && ENTITLEMENT_ENFORCE === false
    ? `✓ ENFORCE=false：canView 对 ${REPORT_GRANTS.length} 个 grant 全放行（内测期行为不变）`
    : `✗ ENFORCE 或 canView 行为异常`)

  // ① 真调 geo route（不加载 .env.local → AI_API_KEY 为空 → generateAIGeo 返回 null → fallback）
  const { POST: geoPOST } = await import('../src/app/api/geo/route.ts')
  const mockReq = { json: async () => ({ year: 1990, month: 6, day: 15, hour: 10, minute: 30, gender: 1, birthZone: 'Asia/Shanghai' }) }
  const geoRes = await geoPOST(mockReq)
  const geoJson = await geoRes.json()
  if (!geoJson.success) { fail(`geo route 返回失败：${geoJson.error}`); geoBehaviorFail++ }
  if (geoJson.data?.locked !== null) { fail(`geo locked 在 ENFORCE=false 时应为 null，实际 ${JSON.stringify(geoJson.data?.locked)}`); geoBehaviorFail++ }
  if (!geoJson.data?.free?.geo) { fail('geo free.geo 不存在（试吃内容缺失）'); geoBehaviorFail++ }
  console.log(geoBehaviorFail === 0
    ? '✓ geo free/locked 结构：ENFORCE=false 时 locked=null，free.geo 含结构化数据'
    : `✗ geo 行为断言失败 ${geoBehaviorFail} 处`)
} catch (e) {
  geoBehaviorFail++; fail(`geo 行为断言异常：${e instanceof Error ? e.message : e}`)
  console.log(`✗ geo 行为断言异常 ${geoBehaviorFail} 处`)
}

// ---------- ② canView 接线（全库级）----------
console.log('—— ② canView 接线（REPORT_GRANTS 每个 grant 有 canView 调用）——')
const { REPORT_GRANTS } = await import('../src/lib/pricing.ts')
let gateFail = 0
for (const grant of REPORT_GRANTS) {
  const re = new RegExp(`canView\\s*\\(\\s*ent\\s*,\\s*['"]${grant}['"]`)
  let found = false
  for (const file of allFiles) {
    if (!file.includes('/api/')) continue
    const content = readFileSync(file, 'utf8')
    if (re.test(content)) { found = true; break }
  }
  if (!found) { fail(`canView(ent, '${grant}') 在 api/ 下无调用`); gateFail++ }
}
console.log(gateFail === 0
  ? `✓ canView 接线：${REPORT_GRANTS.length} 个报告 grant 全部在路由里接了 canView 调用`
  : `✗ canView 接线缺失 ${gateFail} 处`)

// ---------- ③ 前端消费 locked ----------
console.log('—— ③ 前端消费 locked（4 个页面源码有 locked 读取）——')
const FRONTEND_PAGES = [
  'src/app/geo/page.tsx',
  'src/app/ziwei/page.tsx',
  'src/app/hemun/page.tsx',
  'src/app/chart/page.tsx',
]
let feFail = 0
for (const rel of FRONTEND_PAGES) {
  const file = root + rel.slice(4) // src/ -> root
  if (!existsSync(file)) { fail(`文件不存在：${rel}`); feFail++; continue }
  const content = readFileSync(file, 'utf8')
  if (!/locked/.test(content)) { fail(`${rel} 未读取 locked`); feFail++ }
}
console.log(feFail === 0
  ? `✓ 前端消费 locked：${FRONTEND_PAGES.length} 个页面均读取了 data.locked`
  : `✗ 前端未消费 locked ${feFail} 处`)

// ---------- ④ 定价与门禁一致性 ----------
console.log('—— ④ 定价与门禁一致性（每个 one_time SKU 的 grant 有 canView + locked skus）——')
const { ONE_TIME_SKUS } = await import('../src/lib/pricing.ts')
let consistencyFail = 0
for (const sku of ONE_TIME_SKUS) {
  for (const grant of sku.grants) {
    if (!REPORT_GRANTS.includes(grant)) continue // 只查报告类 grant
    // (a) canView 调用存在
    const re = new RegExp(`canView\\s*\\(\\s*ent\\s*,\\s*['"]${grant}['"]`)
    let canViewFound = false
    for (const file of allFiles) {
      if (!file.includes('/api/')) continue
      if (re.test(readFileSync(file, 'utf8'))) { canViewFound = true; break }
    }
    if (!canViewFound) { fail(`${sku.id}.grants[${grant}] 无 canView 调用`); consistencyFail++ }
    // (b) locked skus 包含该 grant
    let lockedFound = false
    for (const file of allFiles) {
      if (!file.includes('/api/')) continue
      const content = readFileSync(file, 'utf8')
      if (new RegExp(`skus.*'${grant}'|'${grant}'.*skus`).test(content)) { lockedFound = true; break }
    }
    if (!lockedFound) { fail(`${sku.id}.grants[${grant}] 未出现在 locked skus`); consistencyFail++ }
  }
}
console.log(consistencyFail === 0
  ? `✓ 定价与门禁一致：${ONE_TIME_SKUS.length} 个 one_time SKU 的报告 grant 全部有 canView + locked skus`
  : `✗ 定价门禁不一致 ${consistencyFail} 处`)

// ---------- ⑤ prompt 与判据同源 ----------
console.log('—— ⑤ prompt 与判据同源（四模块引用 FORBIDDEN_WORDS_PROMPT 模板 + ai-check.ts 定义含全集）——')
const { FORBIDDEN_WORDS } = await import('../src/lib/ai-check.ts')
const AI_MODULES = [
  'src/lib/aiGeo.ts',
  'src/lib/aiZiwei.ts',
  'src/lib/aiHemun.ts',
  'src/lib/aiAnalysis.ts',
]
let promptFail = 0

// (a) ai-check.ts 的 FORBIDDEN_WORDS 定义里包含全部 7 个禁词
// ★ 不能从 import 读（删一个词后 import 也只有 6 个）——必须读源码文本找字面量
const aiCheckContent = readFileSync(root + 'lib/ai-check.ts', 'utf8')
const EXPECTED_WORDS = ['大吉', '大凶', '积极进取', '突破性进展', '必', '一定', '注定']
for (const w of EXPECTED_WORDS) {
  if (!aiCheckContent.includes(`'${w}'`)) { fail(`ai-check.ts FORBIDDEN_WORDS 缺禁词「${w}」`); promptFail++ }
}

// (b) 四模块用 FORBIDDEN_WORDS_PROMPT 模板引用（而非手抄）
for (const rel of AI_MODULES) {
  const file = root + rel.slice(4)
  const content = readFileSync(file, 'utf8')
  if (!content.includes('FORBIDDEN_WORDS_PROMPT')) { fail(`${rel} 未用 FORBIDDEN_WORDS_PROMPT 模板（可能手抄）`); promptFail++ }
}
console.log(promptFail === 0
  ? `✓ prompt 同源：ai-check.ts 定义含 ${EXPECTED_WORDS.length} 个禁词全集；${AI_MODULES.length} 个模块均用 FORBIDDEN_WORDS_PROMPT 模板引用`
  : `✗ prompt 不同源 ${promptFail} 处`)

// ---------- 牙口自检 ----------
console.log('—— 牙口自检 ——')
let toothFail = 0
// ② 牙口：删 geo canView → 应翻红（验证 grep 判据有效）
if (!/canView\s*\(\s*ent\s*,\s*['"]geo['"]/.test("canView(ent, 'geo')")) { toothFail++; fail('牙口：canView geo 样本未检出') }
// ⑤ 牙口：删一个词 → 应翻红
if (!'大吉'.includes('大吉')) { toothFail++; fail('牙口：大吉 字面量未检出') }
// ④ 牙口：locked skus 匹配
if (!/skus.*'fatebook'|'fatebook'.*skus/.test("skus: ['fatebook']")) { toothFail++; fail('牙口：skus fatebook 样本未检出') }
console.log(toothFail === 0
  ? '✓ 牙口自检：canView/skus/禁词 判据样本均能检出'
  : '✗ 牙口自检失败')

console.log('\n' + (allPass ? 'ENTITLEMENT_GATE_PASS' : 'ENTITLEMENT_GATE_FAIL'))
if (!allPass) process.exit(1)
