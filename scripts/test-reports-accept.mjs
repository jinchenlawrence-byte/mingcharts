// 报告资产化验收（HANDOFF-四问题修复 §D；纪律：函数行为断言必须真调用、每条断言打命中数+模式）
// 覆盖：reports 表/RLS、saveReport 静默降级、四 route 接保存、四页面传 token、共享 View 回看分发
import { readFileSync, existsSync } from 'node:fs'
import { deriveReportTitle, REPORT_KIND_LABELS, saveReport } from '../src/lib/reportSave.ts'

let allPass = true
const fail = (msg) => { allPass = false; console.log('  ✗ ' + msg) }
const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')
// ⚠️ stripComments 不区分字符串内的 // 与 /* */（会误剥字符串内容），仅可用于【正向断言】
//   （要求某形态必须存在；误剥只致假红、不致假绿）；反向断言（要求某形态不存在）不得使用
const stripComments = (src) => src.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')

// ---------- ① deriveReportTitle 行为断言（真调生产纯函数，§纪律）----------
console.log('—— ① deriveReportTitle 行为断言 ——')
const TITLE_CASES = [
  ['hemun', { year: 1990, month: 5, day: 8, gender: 1, partnerYear: 1992, partnerMonth: 3, partnerDay: 2, partnerGender: 0 },
    '男1990-5-8 × 女1992-3-2 合婚详批'],
  ['hemun', { year: 1985, month: 12, day: 31, gender: 0, partnerYear: 1986, partnerMonth: 1, partnerDay: 1, partnerGender: 1 },
    '女1985-12-31 × 男1986-1-1 合婚详批'],
  ['annual', { year: 1990, month: 5, day: 8, targetYear: 2026 }, '1990-5-8 · 2026 流年详批'],
  ['annual', { year: 2000, month: 1, day: 9, targetYear: 2027 }, '2000-1-9 · 2027 流年详批'],
  ['ziwei', { year: 1990, month: 5, day: 8, hour: 16, gender: 0 }, '1990-5-8 16时 女 · 紫微深度'],
  ['geo', { year: 1990, month: 5, day: 8, hour: 16, gender: 1 }, '1990-5-8 16时 男 · 地理方位'],
]
let titleFail = 0
for (const [kind, input, want] of TITLE_CASES) {
  const got = deriveReportTitle(kind, input)
  if (got !== want) { titleFail++; fail(`deriveReportTitle(${kind}) =「${got}」≠「${want}」`) }
}
const KINDS = ['hemun', 'ziwei', 'geo', 'annual']
for (const k of KINDS) {
  if (!REPORT_KIND_LABELS[k]) { titleFail++; fail(`REPORT_KIND_LABELS 缺 ${k}`) }
}
console.log(titleFail === 0
  ? `✓ 标题派生：${TITLE_CASES.length} 用例真跑通过；REPORT_KIND_LABELS 四类齐全`
  : '✗ 标题派生失败')

// ---------- ② saveReport 静默降级行为断言（真调：无 token → null，不抛错）----------
console.log('—— ② saveReport 静默降级 ——')
let saveFail = 0
let savedNull = null
try {
  savedNull = await saveReport(null, { kind: 'geo', title: 'x', input: {}, result: {} })
} catch (e) {
  saveFail++; fail(`saveReport(null) 不应抛错，实抛：${e instanceof Error ? e.message : e}`)
}
if (savedNull !== null) { saveFail++; fail(`saveReport(null) 应返回 null，实得 ${savedNull}`) }
const saveSrc = stripComments(read('../src/lib/reportSave.ts'))
const GUARDS = ["if (!token) return null", "auth.getUser(token)", "console.warn('[report-save]"]
for (const g of GUARDS) {
  if (!saveSrc.includes(g)) { saveFail++; fail(`reportSave.ts 缺守卫「${g}」（模式：includes，剥注释后扫描）`) }
}
console.log(saveFail === 0
  ? `✓ 静默降级：saveReport(null) 真调返回 null 不抛错；源码含 token 门禁/getUser 校验/warn 留痕（${GUARDS.length} 守卫全中）`
  : '✗ 静默降级断言失败')

// ---------- ③ 四 route 接 saveReport（源码断言：剥注释后扫描）----------
console.log('—— ③ 四 route 报告保存接线 ——')
const ROUTES = [
  ['hemun', '../src/app/api/hemun/route.ts'],
  ['ziwei', '../src/app/api/ziwei/route.ts'],
  ['geo', '../src/app/api/geo/route.ts'],
  ['annual', '../src/app/api/liunian/route.ts'],
]
let routeFail = 0
for (const [kind, path] of ROUTES) {
  if (!existsSync(new URL(path, import.meta.url))) { routeFail++; fail(`${path} 不存在`); continue }
  const code = stripComments(read(path))
  const P = (label) => `（${label}）`
  if (!code.includes('saveReport(')) { routeFail++; fail(`${path} 未调 saveReport ${P('includes saveReport(')}`) }
  // 首参必须是 token：防「saveReport(null,…)」式注入（保存静默失效而其余文本不变）
  if (!/saveReport\(\s*token\b/.test(code)) { routeFail++; fail(`${path} saveReport 首参不是 token（模式：/saveReport\\(\\s*token\\b/）`) }
  if (!code.includes(`kind: '${kind}'`)) { routeFail++; fail(`${path} 未以 kind='${kind}' 保存 ${P(`includes kind: '${kind}'`)}`) }
  if (!code.includes('deriveReportTitle(')) { routeFail++; fail(`${path} 未用 deriveReportTitle 统一标题`) }
  if (!code.includes('reportId')) { routeFail++; fail(`${path} 返回未带 reportId`) }
}
console.log(routeFail === 0
  ? `✓ 保存接线：${ROUTES.length} 个 route（hemun/ziwei/geo/liunian）均调 saveReport+deriveReportTitle 并返回 reportId`
  : '✗ route 保存接线失败')

// ---------- ④ 四页面传 token（登录用户才保存；游客静默跳过）----------
console.log('—— ④ 页面 token 接线 ——')
const PAGES = [
  ['合婚', '../src/app/hemun/page.tsx'],
  ['紫微', '../src/app/ziwei/page.tsx'],
  ['地理', '../src/app/geo/page.tsx'],
  ['年运', '../src/app/liunian/page.tsx'],
]
let pageFail = 0
for (const [name, path] of PAGES) {
  const code = stripComments(read(path))
  if (!code.includes('getAuthToken()')) { pageFail++; fail(`${name}页 未调 getAuthToken ${P('includes getAuthToken()')}`) }
  if (!code.includes('{ token }')) { pageFail++; fail(`${name}页 未把 token 放进请求体 ${P('includes { token }')}`) }
  if (!code.includes('reportId')) { pageFail++; fail(`${name}页 未读取 reportId 更新保存提示`) }
}
console.log(pageFail === 0
  ? `✓ token 接线：${PAGES.length} 个页面均 getAuthToken → 请求体带 token → 按 reportId 提示`
  : '✗ 页面 token 接线失败')

// ---------- ⑤ 共享 View 与回看分发（防双渲染器漂移）----------
console.log('—— ⑤ 共享 View 与 /reports 回看 ——')
let viewFail = 0
const VIEWS = ['HemunResultView', 'ZiweiResultView', 'GeoResultView', 'LiunianResultView']
for (const v of VIEWS) {
  const f = new URL(`../src/components/reports/${v}.tsx`, import.meta.url)
  if (!existsSync(f)) { viewFail++; fail(`缺共享组件 ${v}.tsx`) }
}
for (const [name, path] of PAGES) {
  const code = read(path)
  if (!code.includes('@/components/reports/')) { viewFail++; fail(`${name}页 未使用共享 ResultView 渲染`) }
}
const detailSrc = read('../src/app/reports/[id]/page.tsx')
for (const v of VIEWS) {
  if (!detailSrc.includes(v)) { viewFail++; fail(`/reports/[id] 未按 kind 分发到 ${v}`) }
}
const listSrc = read('../src/app/reports/page.tsx')
for (const need of ["from('reports')", "REPORT_KIND_LABELS", "order('created_at', { ascending: false })"]) {
  if (!listSrc.includes(need)) { viewFail++; fail(`/reports 列表页缺「${need}」`) }
}
if (!existsSync(new URL('../src/app/reports/layout.tsx', import.meta.url))) { viewFail++; fail('缺 /reports/layout.tsx（metadata）') }
if (!existsSync(new URL('../src/app/reports/[id]/layout.tsx', import.meta.url))) { viewFail++; fail('缺 /reports/[id]/layout.tsx（metadata）') }
console.log(viewFail === 0
  ? `✓ 共享渲染：4 个 ResultView 组件齐备，生成页与 /reports/[id] 回看页共用；列表页查 reports 按 created_at 倒序`
  : '✗ 共享 View 断言失败')

// ---------- ⑥ schema：reports 表 + RLS 三策略 ----------
console.log('—— ⑥ reports 表结构 ——')
let schemaFail = 0
const sql = read('../supabase/schema.sql')
const SQL_NEEDS = [
  'CREATE TABLE IF NOT EXISTS reports',
  "kind TEXT NOT NULL CHECK (kind IN ('hemun', 'ziwei', 'geo', 'annual', 'fatebook'))",
  'ALTER TABLE reports ENABLE ROW LEVEL SECURITY',
  'FOR SELECT USING (auth.uid() = user_id)',
  'FOR INSERT WITH CHECK (auth.uid() = user_id)',
  'FOR DELETE USING (auth.uid() = user_id)',
  'idx_reports_user_id',
  'idx_reports_created_at',
]
for (const n of SQL_NEEDS) {
  if (!sql.includes(n)) { schemaFail++; fail(`schema.sql 缺「${n}」`) }
}
console.log(schemaFail === 0
  ? `✓ 表结构：reports 表/RLS/SELECT+INSERT+DELETE 三策略/双索引齐备（${SQL_NEEDS.length} 项判据全中）`
  : '✗ schema 断言失败')

// ---------- ⑦ ★★★ 读取侧重算（2026-10-18 事故修复：付费后回看仍显示「未解锁」）----------
// 事故链条：生成时未解锁 → 入库 ai=null/locked 非空 → 详情页【直接渲染这一行】→ 付费等于没生效。
// 修法：入库只存内容（见 ⑧），渲染前按【当前权益】重算 locked/ai/aiSource（本段真调用守护）。
console.log('—— ⑦ 读取侧重算 gateReportForDetail（真调用）——')
let gateFail = 0
const { gateReportForDetail, REPORT_GATE } = await import('../src/lib/reportGate.ts')
const { SKUS: SKU_TABLE } = await import('../src/lib/pricing.ts')

// 内容里【带着全文】（新入库形态）：未持有必须看不到全文，已持有必须看到
const FULL = { locked: { skus: ['ziwei_deep'], preview: '旧快照文案' }, ai: '紫微全文内容', aiSource: 'AI 深度解读' }
const noEnt = { memberSkus: [], ownedSkus: [] }
const notOwned = gateReportForDetail('ziwei', FULL, noEnt)
if (notOwned.ai !== null) { gateFail++; fail(`未持有不得看到 ai 全文，实得 ${JSON.stringify(notOwned.ai)}`) }
if (!notOwned.locked || !notOwned.locked.preview) { gateFail++; fail('未持有应给 locked.preview') }
if (notOwned.locked.preview === '旧快照文案') { gateFail++; fail('未持有文案应即时重算（不是入库旧快照）') }

const ownedEnt = { memberSkus: [], ownedSkus: ['ziwei_deep'] }
const owned = gateReportForDetail('ziwei', FULL, ownedEnt)
if (owned.ai !== '紫微全文内容') { gateFail++; fail(`已持有必须看到全文，实得 ${JSON.stringify(owned.ai)}`) }
if (owned.locked !== null) { gateFail++; fail('已持有 locked 应为 null') }

// 交叉不得越权：买合婚不得解锁紫微；会员不含报告；bundle3 三件套应隐式解锁紫微
if (gateReportForDetail('ziwei', FULL, { memberSkus: [], ownedSkus: ['hemun'] }).ai !== null) {
  gateFail++; fail('买合婚不得解锁紫微（SKU 交叉越权）')
}
if (gateReportForDetail('ziwei', FULL, { memberSkus: ['member_yearly'], ownedSkus: [] }).ai !== null) {
  gateFail++; fail('会员不应解锁报告（订阅 grants 不含报告）')
}
if (gateReportForDetail('ziwei', FULL, { memberSkus: [], ownedSkus: ['bundle3'] }).ai !== '紫微全文内容') {
  gateFail++; fail('bundle3 应隐式解锁紫微（含 ziwei_deep）')
}
// 命书不走本重算（正文在 charts.chart_data）
const fbPass = gateReportForDetail('fatebook', { x: 1 }, noEnt)
if (fbPass.x !== 1) { gateFail++; fail('fatebook 应原样透传（不走 reportGate）') }

// 门禁口径与价目表同源：每类的 sku 其 grants 必须真含该 grant（防文案/权益漂移）
for (const [kind, g] of Object.entries(REPORT_GATE)) {
  if (!g) { if (kind !== 'fatebook') { gateFail++; fail(`REPORT_GATE 缺 ${kind}`) } ; continue }
  if (!SKU_TABLE[g.sku] || !SKU_TABLE[g.sku].grants.includes(g.grant)) {
    gateFail++; fail(`REPORT_GATE.${kind} 的 sku=${g.sku} grants 不含 ${g.grant}（口径漂移）`)
  }
}
// 就地补算门禁 canRegenContent：只在【存档完整且回放忠实】时才允许补算（2026-10-18 复核）
// 依据：年运存档 input 即 route 的扁平请求体且含全量要素 → 回放同盘；其余模块回放会算出另一张盘。
const { canRegenContent } = await import('../src/lib/reportGate.ts')
const ANNUAL_FULL = {
  year: 1990, month: 5, day: 8, hour: 16, minute: 15, gender: 0,
  targetYear: 2026, birthZone: 'Asia/Shanghai', birthLng: 121.47, nowYear: 2026
}
if (!canRegenContent('annual', ANNUAL_FULL)) {
  gateFail++; fail('年运存档完整时应允许就地补算（否则付费用户必须重填出生信息）')
}
if (canRegenContent('annual', { year: 1990, month: 5, day: 8, hour: 16, gender: 0, targetYear: 2026 })) {
  gateFail++; fail('年运存档缺 minute/出生地时不得补算（回放会算出另一张盘）')
}
const noTargetYear = { ...ANNUAL_FULL }
delete noTargetYear.targetYear
if (canRegenContent('annual', noTargetYear)) {
  gateFail++; fail('年运存档缺 targetYear 时不得补算')
}
for (const k of ['ziwei', 'hemun', 'geo']) {
  if (canRegenContent(k, { ...ANNUAL_FULL })) {
    gateFail++; fail(`${k} 不得开启就地补算（存档形态不足以忠实回放，会展示另一张盘）`)
  }
}
if (canRegenContent('fatebook', { ...ANNUAL_FULL })) { gateFail++; fail('命书不走补算') }
if (canRegenContent('annual', null)) { gateFail++; fail('存档为空不得补算') }

// 详情页必须走重算，不得直接渲染 row.result
const detailCode = stripComments(read('../src/app/reports/[id]/page.tsx'))
if (!detailCode.includes('gateReportForDetail(')) { gateFail++; fail('/reports/[id] 未按当前权益重算（缺 gateReportForDetail）') }
if (!detailCode.includes("'/api/entitlements'")) { gateFail++; fail('/reports/[id] 未取当前权益（缺 /api/entitlements）') }
if (!detailCode.includes('canRegenContent(')) { gateFail++; fail('/reports/[id] 未按存档完整性决定是否补算（缺 canRegenContent）') }
if (!detailCode.includes('regenApi')) { gateFail++; fail('/reports/[id] 补算未走 REPORT_GATE.regenApi') }
console.log(gateFail === 0
  ? '✓ 读取侧重算：内容带全文时未持有不可见、已持有可见；交叉不越权；会员不含报告；bundle3 隐式解锁；详情页接线'
  : '✗ 读取侧重算断言失败')

// ---------- ⑧ ★★ 入库只存内容 + 覆盖写 + payments.sku（2026-10-18）----------
console.log('—— ⑧ 入库纪律与 payments.sku ——')
let storeFail = 0
for (const [kind, path] of ROUTES) {
  const code = stripComments(read(path))
  if (!code.includes('stripEntitlementState(')) { storeFail++; fail(`${kind} route 入库未剥权益状态（会把 locked 存进库）`) }
  if (!code.includes('CacheKey(')) { storeFail++; fail(`${kind} route 未设 cacheKey（重复点击堆积重复报告）`) }
  // 版本号：三模块用 reportCacheKey(kind, X_CACHE_VERSION…)；年运沿用其既有 annualCacheKey（实现内含 ANNUAL_CACHE_VERSION）
  if (kind === 'annual') {
    if (!code.includes('annualCacheKey(')) { storeFail++; fail('annual route 未用 hourlyCacheKey 系列（annualCacheKey）') }
  } else if (!/_CACHE_VERSION/.test(code)) {
    storeFail++; fail(`${kind} route cacheKey 未带版本号（改算法不会失效重建）`)
  }
}
// 版本常量四份齐备（改 AI prompt / 判据必须 +1）
const cacheCode = stripComments(read('../src/lib/reportCache.ts'))
for (const v of ['ANNUAL_CACHE_VERSION', 'HEMUN_CACHE_VERSION', 'ZIWEI_CACHE_VERSION', 'GEO_CACHE_VERSION']) {
  if (!cacheCode.includes(v)) { storeFail++; fail(`reportCache.ts 缺版本常量 ${v}`) }
}
// schema：payments.sku 列 + 老库迁移语句
const sqlSku = read('../supabase/schema.sql')
for (const n of ['ALTER TABLE payments ADD COLUMN IF NOT EXISTS sku TEXT', 'sku TEXT']) {
  if (!sqlSku.includes(n)) { storeFail++; fail(`schema.sql 缺「${n}」`) }
}
// 归集查 payments.sku（不做则一律 fatebook 的手误会白送命书）
const entCode2 = stripComments(read('../src/lib/entitlement.ts'))
if (!entCode2.includes("select('payment_type, status, transaction_id, sku')")) {
  storeFail++; fail('entitlement.ts 未查 payments.sku（权益归集依赖它）')
}
if (!entCode2.includes('skuOfPayment(')) { storeFail++; fail('entitlement.ts 未按流水 sku 归集（旧实现一律 fatebook）') }
if (!read('../src/lib/waffo-repo.ts').includes('updatePaymentSku')) {
  storeFail++; fail('缺 SKU 回填（老流水 sku 为空 → 已购用户永远拿不到权益）')
}
console.log(storeFail === 0
  ? '✓ 入库纪律：四 route 剥权益状态+覆盖写+版本号；payments.sku 列与迁移语句就位；归集按 sku 且可回填'
  : '✗ 入库纪律断言失败')

console.log('\n' + (allPass ? 'REPORTS_ACCEPT_PASS' : 'REPORTS_ACCEPT_FAIL'))
if (!allPass) process.exit(1)
