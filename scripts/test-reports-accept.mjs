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

console.log('\n' + (allPass ? 'REPORTS_ACCEPT_PASS' : 'REPORTS_ACCEPT_FAIL'))
if (!allPass) process.exit(1)
