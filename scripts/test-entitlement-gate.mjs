// ★ 门禁接线断言（HANDOFF-geo改真付费与门禁补完 §五）
// ① geo free/locked 结构——行为：真调 /api/geo POST，断言 locked=null + free.geo 存在
// ② canView 接线——grep route 源码：REPORT_GRANTS 每个 grant 有 canView 调用
// ③ 前端消费 locked——剥注释后精确形态正则（§八-① 收紧：旧 /locked/ 裸词可被注释骗过）
// ④ 定价与门禁一致性——grep：ONE_TIME_SKUS 每个 grant 有 canView + locked skus 包含
// ⑤ prompt 同源——五模块引用 FORBIDDEN_WORDS_PROMPT + 三表拆分语义（A 移出拦截，B/C 保留）
// ⑥ ENFORCE=false 回归——ENTITLEMENT_ENFORCE === false + canView 恒 true

import { readFileSync, readdirSync, existsSync } from 'node:fs'

let allPass = true
const fail = (msg) => { allPass = false; console.log('  ✗ ' + msg) }

// ⚠️ stripComments 不区分字符串内的 // 与 /* */（会误剥字符串内容），仅可用于【正向断言】
//   （要求某形态必须存在；误剥只致假红、不致假绿）；反向断言（要求某形态不存在）不得使用
const stripComments = (src) => src.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')

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

// ---------- ③ 前端消费 locked（剥注释 + 精确形态正则，§八-① 收紧）----------
console.log('—— ③ 前端消费 locked（5 个页面：剥注释后匹配 .locked?. / .locked && 消费形态）——')
// ★ 17 轮 ResultView 重构后，geo/ziwei/hemun/liunian 的 locked 消费在共享组件里（页面薄壳）
//   语义不变：「前端消费 locked」—— 页面自身或其 ResultView 组件任一处消费即通过
// ★ 旧判据 /locked/ 裸词 → 一句 // locked 注释即可骗过（复核注入 B 证实）；
//   收紧为剥注释后的消费形态正则（与 ②/④ 的 canView 精确正则同范式）
// ★ 消费形态有两种：成员访问 data.locked?. / .locked && ；解构后裸用 locked && / locked?.
//   （GeoResultView/ZiweiResultView 均为 const { …, locked } = data 后 {locked && (…)}）
//   类型声明 locked?: 与解构声明 { …, locked } = data 均不匹配（后随 ?: 或 }，非 ?. / &&）
const LOCKED_CONSUME_RE = /(\.|(?<![.\w?]))locked\s*(\?\.|&&)/
const FRONTEND_PAGES = [
  ['src/app/geo/page.tsx', 'src/components/reports/GeoResultView.tsx'],
  ['src/app/ziwei/page.tsx', 'src/components/reports/ZiweiResultView.tsx'],
  ['src/app/hemun/page.tsx', 'src/components/reports/HemunResultView.tsx'],
  ['src/app/liunian/page.tsx', 'src/components/reports/LiunianResultView.tsx'],
  ['src/app/chart/page.tsx'],
]
let feFail = 0
for (const candidates of FRONTEND_PAGES) {
  const hit = candidates.some((rel) => {
    const file = root + rel.slice(4) // src/ -> root
    return existsSync(file) && LOCKED_CONSUME_RE.test(stripComments(readFileSync(file, 'utf8')))
  })
  if (!hit) { fail(`${candidates[0]} 未消费 locked（剥注释后无 .locked?. / .locked && 形态；模式：${LOCKED_CONSUME_RE}）`); feFail++ }
}
console.log(feFail === 0
  ? `✓ 前端消费 locked：${FRONTEND_PAGES.length} 个页面均有真实消费形态（剥注释+精确正则，命中 ${FRONTEND_PAGES.length} 处）`
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

// ---------- ⑤ prompt 与判据同源（三表拆分语义 + 五模块引用派生）----------
console.log('—— ⑤ prompt 与判据同源（A 类判词移出拦截、B/C 保留；五模块引用 FORBIDDEN_WORDS_PROMPT）——')
const { FORBIDDEN_WORDS, FORBIDDEN_WORDS_PROMPT, findForbidden } = await import('../src/lib/ai-check.ts')
const AI_MODULES = [
  'src/lib/aiGeo.ts',
  'src/lib/aiZiwei.ts',
  'src/lib/aiHemun.ts',
  'src/lib/aiAnalysis.ts',
  'src/lib/aiLiunian.ts',  // ★ 最后一处手抄已收编（7档任务 §4.2.2②）
]
let promptFail = 0

// (a) 三表拆分语义（★ 行为断言，真调 findForbidden）：
//   · 拦截表恰为 B+C 五词（A 类 7 档判词已移出）
//   · A 类放行：findForbidden('大吉/大凶') → 0 命中
//   · B/C 仍拦截：务必（含必）/积极进取 → 有命中
const BC_WORDS = ['必', '一定', '注定', '积极进取', '突破性进展']
if (JSON.stringify([...FORBIDDEN_WORDS]) !== JSON.stringify(BC_WORDS)) { fail(`FORBIDDEN_WORDS 应恰为 B+C 五词，实际 ${JSON.stringify(FORBIDDEN_WORDS)}`); promptFail++ }
if (findForbidden('此运大吉，流年大凶').hits.length !== 0) { fail('A 类判词（大吉/大凶）仍被拦截，未移出'); promptFail++ }
for (const probe of ['务必谨慎', '积极进取']) {
  if (!findForbidden(probe).hits.length) { fail(`B/C 类词「${probe}」未被拦截`); promptFail++ }
}
// ★ 不能从 import 读三表定义是否齐全（删一个词 import 也会同步）——读源码文本找字面量
const aiCheckContent = readFileSync(root + 'lib/ai-check.ts', 'utf8')
if (!/ENABLED_JUDGMENT_WORDS\s*=\s*\[\s*'大吉',\s*'吉',\s*'小吉',\s*'平',\s*'小凶',\s*'凶',\s*'大凶'\s*\]/.test(aiCheckContent)) { fail('ai-check.ts 缺 ENABLED_JUDGMENT_WORDS 7 档字面量'); promptFail++ }
// (a-2) 派生 prompt 文本：不得再把「大吉/大凶」列为禁词或替换范例（遗留表述）
if (FORBIDDEN_WORDS_PROMPT.includes('大吉') || FORBIDDEN_WORDS_PROMPT.includes('大凶')) { fail('FORBIDDEN_WORDS_PROMPT 仍含 大吉/大凶（遗留表述）'); promptFail++ }
for (const w of BC_WORDS) {
  if (!FORBIDDEN_WORDS_PROMPT.includes(w)) { fail(`FORBIDDEN_WORDS_PROMPT 缺 B/C 词「${w}」`); promptFail++ }
}

// (b) 五模块用 FORBIDDEN_WORDS_PROMPT 模板引用（而非手抄）
for (const rel of AI_MODULES) {
  const file = root + rel.slice(4)
  const content = readFileSync(file, 'utf8')
  if (!content.includes('FORBIDDEN_WORDS_PROMPT')) { fail(`${rel} 未用 FORBIDDEN_WORDS_PROMPT 模板（可能手抄）`); promptFail++ }
}
console.log(promptFail === 0
  ? `✓ prompt 同源：拦截表恰为 B+C ${BC_WORDS.length} 词（A 类 7 档判词已移出并真调验证放行/拦截）；${AI_MODULES.length} 个模块均用 FORBIDDEN_WORDS_PROMPT 模板引用`
  : `✗ prompt 不同源 ${promptFail} 处`)

// ---------- 牙口自检 ----------
console.log('—— 牙口自检 ——')
let toothFail = 0
// ② 牙口：删 geo canView → 应翻红（验证 grep 判据有效）
if (!/canView\s*\(\s*ent\s*,\s*['"]geo['"]/.test("canView(ent, 'geo')")) { toothFail++; fail('牙口：canView geo 样本未检出') }
// ③ 牙口：精确形态判据有效——成员访问 / 解构后裸用 均命中；注释 / 类型声明不命中
if (!LOCKED_CONSUME_RE.test(stripComments('const x = data.locked && 1'))) { toothFail++; fail('牙口：data.locked && 消费形态未检出') }
if (!LOCKED_CONSUME_RE.test(stripComments('{locked && ('))) { toothFail++; fail('牙口：locked && 解构消费形态未检出') }
if (LOCKED_CONSUME_RE.test(stripComments('// data.locked &&'))) { toothFail++; fail('牙口：注释里的 locked 假消费被误判为真') }
// ⑤ 牙口：A 类放行 / B 类拦截 行为探针（findForbidden 语义真实有效）
if (findForbidden('此运大吉').hits.length !== 0) { toothFail++; fail('牙口：A 类「大吉」放行探针失败') }
if (!findForbidden('必定如此').hits.length) { toothFail++; fail('牙口：B 类「必定」（含必）拦截探针失败') }
// ④ 牙口：locked skus 匹配
if (!/skus.*'fatebook'|'fatebook'.*skus/.test("skus: ['fatebook']")) { toothFail++; fail('牙口：skus fatebook 样本未检出') }
console.log(toothFail === 0
  ? '✓ 牙口自检：canView/skus/locked消费形态/禁词放行与拦截 判据样本均能检出'
  : '✗ 牙口自检失败')

console.log('\n' + (allPass ? 'ENTITLEMENT_GATE_PASS' : 'ENTITLEMENT_GATE_FAIL'))
if (!allPass) process.exit(1)
