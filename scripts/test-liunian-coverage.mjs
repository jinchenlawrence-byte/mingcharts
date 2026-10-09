// ★ 流年/大运四柱覆盖度断言（HANDOFF-流年四柱覆盖补齐 步骤②）
// 根因缺口此前无任何断言守护——本脚本结构性钉死「年柱/时柱必须被检查」。
// 三条断言：①四柱全查（冲/合/伏吟/半合）②各柱独立可同时命中 ③关系描述必含柱名
// 牙口：删年柱检查块 → ①必须精确翻红（§8.6.7：注入前先确认有效）
import { paipan, getWangShuai, getGeJu } from '../src/lib/paipan.ts'
import { buildLuckCycles } from '../src/lib/analysis.ts'

let allPass = true
const fail = (msg) => { allPass = false; console.log('  ✗ ' + msg) }

// 该用户命盘（任务书 §1.1 实测，用户已核验）：1991-04-12 03:10 男
// 四柱 辛未 壬辰 壬子 壬寅 · 身强 · 七杀格 · 喜用土火木
function buildUserChart() {
  const chart = paipan({ year: 1991, month: 4, day: 12, hour: 3, minute: 10, gender: 1 })
  chart.analysis = { wangShuai: getWangShuai(chart), geJu: getGeJu(chart), isPaid: true }
  return chart
}
const chart = buildUserChart()

// —— ① 四柱全查：年柱/时柱的 冲/合/伏吟/半合 必须全部检出 ——
console.log('—— ① 四柱全查（年柱/时柱 冲/合/伏吟/半合 全部检出）——')
let covFail = 0
const cases = [
  { year: 2021, ganZhi: '辛丑', expect: '流年支丑冲年柱未', reason: '年支相冲（丑冲未）' },
  { year: 2019, ganZhi: '己亥', expect: '流年支亥合时柱寅', reason: '时支六合（亥合寅）' },
  { year: 2023, ganZhi: '癸卯', expect: '流年支与年柱半合木局', reason: '年支半合（亥卯未）' },
  { year: 2022, ganZhi: '壬寅', expect: '流年与时柱伏吟', reason: '时柱整柱伏吟' },
]
for (const c of cases) {
  const luck = buildLuckCycles(chart, new Date(c.year, 5, 15))
  const y = luck.liuNian.find(l => l.year === c.year)
  if (!y) { covFail++; fail(`${c.year}${c.ganZhi} 不在流年列表中`); continue }
  const hit = y.relations.some(r => r.includes(c.expect))
  if (!hit) { covFail++; fail(`${c.year}${c.ganZhi} 未检出「${c.expect}」（${c.reason}）`) }
}
console.log(covFail === 0
  ? `✓ 四柱全查：${cases.length} 个用例全部检出（年柱冲/时柱合/年柱半合/时柱伏吟）`
  : '✗ 四柱覆盖存在缺口')

// —— ② 各柱独立、可同时命中（非互斥）——
console.log('\n—— ② 各柱独立可同时命中（用 2019 己亥：年柱半合 + 时柱六合）——')
const luck2019 = buildLuckCycles(chart, new Date(2019, 5, 15))
const y2019 = luck2019.liuNian.find(l => l.year === 2019)
const rels2019 = y2019 ? y2019.relations : []
const hasYearBanHe = rels2019.some(r => r.includes('年柱半合'))
const hasHourLiuHe = rels2019.some(r => r.includes('合时柱'))
let indepFail = 0
if (!hasYearBanHe) { indepFail++; fail('2019 己亥未检出年柱半合木局') }
if (!hasHourLiuHe) { indepFail++; fail('2019 己亥未检出时柱六合') }
if (rels2019.length < 2) { indepFail++; fail(`2019 己亥仅 ${rels2019.length} 条关系，预期年柱+时柱两条独立命中`) }
console.log(indepFail === 0
  ? `✓ 各柱独立：2019 己亥同时检出年柱半合 + 时柱六合（共 ${rels2019.length} 条，非互斥）`
  : '✗ 各柱独立断言失败')

// —— ③ 关系描述必须含柱名（可回溯）——
console.log('\n—— ③ 关系描述必含柱名（防止无法回溯的无主语措辞）——')
// 收集所有流年关系描述，断言不含「伏吟，事宜」「相合，合作」这类无柱名的残缺句
let nameFail = 0
const allRelations = []
for (let yr = 2018; yr <= 2028; yr++) {
  const lk = buildLuckCycles(chart, new Date(yr, 5, 15))
  for (const y of lk.liuNian) allRelations.push(...y.relations)
}
// 允许的柱名关键词（年柱/月柱/日柱/时柱/夫妻宫/提纲/月令/日主/年干/月干/时干/运支等）
const PILLAR_KEYWORDS = /年柱|月柱|日柱|时柱|夫妻宫|提纲|月令|日主|年干|月干|时干|运支|运干|运临|太岁|流年|大运|岁运/
const nameless = allRelations.filter(r => !PILLAR_KEYWORDS.test(r))
if (nameless.length) { nameFail += nameless.length; fail(`关系描述缺柱名 ${nameless.length} 处：${nameless.slice(0, 3).join('；')}`) }
console.log(nameFail === 0
  ? `✓ 柱名回溯：${allRelations.length} 条关系描述全部含柱名（无主语残缺句）`
  : '✗ 存在无柱名关系描述')

// —— 牙口：删年柱检查 → ①必须精确翻红（注入前先确认有效）——
//   注入方式：临时改 analysis.ts 把年支检查注释掉（本脚本用源码扫描验证判据结构，
//   实际牙口在开发期手工注入验证；此处用正则断言守护「年支检查块存在」）
console.log('\n—— 牙口：年柱检查块存在性守护 ——')
import { readFileSync } from 'node:fs'
const src = readFileSync(new URL('../src/lib/analysis.ts', import.meta.url), 'utf8')
let toothFail = 0
// 年支检查块必须存在（含「年柱」「祖上/父母宫」）
if (!src.includes("pillarName: '年柱'")) { toothFail++; fail('analysis.ts 缺年柱检查块（pillarName: 年柱）') }
if (!src.includes("pillarName: '时柱'")) { toothFail++; fail('analysis.ts 缺时柱检查块（pillarName: 时柱）') }
console.log(toothFail === 0
  ? '✓ 年柱/时柱检查块存在（删任一即翻红）'
  : '✗ 年柱/时柱检查块缺失')

console.log('\n' + (allPass ? 'LIUNIAN_COVERAGE_PASS' : 'LIUNIAN_COVERAGE_FAIL'))
if (!allPass) process.exit(1)
