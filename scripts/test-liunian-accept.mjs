// 年运模块验收（HANDOFF-四问题修复 §C；纪律：fallback 真调、接线断言、facts 同源、打命中数+模式）
import { readFileSync, existsSync } from 'node:fs'
import { fallbackLiunianText } from '../src/lib/aiLiunian.ts'
import { findForbidden } from '../src/lib/ai-check.ts'

let allPass = true
const fail = (msg) => { allPass = false; console.log('  ✗ ' + msg) }
const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')
const stripComments = (src) => src.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')

// ---------- ① fallback 行为断言（真调生产函数：喂数据看输出）----------
console.log('—— ① fallbackLiunianText 行为断言 ——')
// 结构化流年事实样例（与 LuckLiuNianItem/LuckLiuYueItem 字段一致；喂数据真跑生产函数）
const item = {
  year: 2026, ganZhi: '丙午', shiShenGan: '食神', shiShenZhi: '正财',
  score: 1, tag: '较宜', current: true, daYunGanZhi: '甲戌',
  relations: ['流年支午合夫妻宫未，关系和合', '流年支合运支戌，多得平台际遇之助'],
  note: '食神主事——才华表达、生活享受；全年倾向积极开展，宜稳中求进。',
  structuralIssues: []
}
const ctx = { favorable: ['木', '火'], unfavorable: ['金'] }
const liuYueFake = [
  { month: 3, ganZhi: '辛卯', jieQi: '惊蛰', rangeLabel: '3/5 - 4/4', shiShenGan: '伤官', score: 1, tag: '较宜', relations: [], note: '伤官主事，展示才华之月。' },
  { month: 7, ganZhi: '乙未', jieQi: '小暑', rangeLabel: '7/6 - 8/6', shiShenGan: '偏印', score: -1, tag: '宜慎', relations: [], note: '偏印主事，宜慎之月。' }
]

let fbFail = 0
// ①-a 无流月（明年/后年）：5 板块、无 monthFlow、各板块 ≥50 字
const fbYear = fallbackLiunianText(2027, { ...item, year: 2027, current: false }, null, ctx)
const BASE_KEYS = ['annualOverview', 'careerFlow', 'wealthFlow', 'loveFlow', 'healthFlow']
for (const k of BASE_KEYS) {
  const v = fbYear[k]
  if (typeof v !== 'string' || v.trim().length < 50) { fbFail++; fail(`规则版 ${k} 缺失或过短（${typeof v === 'string' ? v.length : v} 字）`) }
}
if (fbYear.monthFlow !== undefined) { fbFail++; fail('无流月输入时不应产出 monthFlow 板块（明年/后年严禁编造流月）') }
// ①-b 有流月（当年）：monthFlow 存在且含较宜/宜慎
const fbNow = fallbackLiunianText(2026, item, liuYueFake, ctx)
if (!fbNow.monthFlow) { fbFail++; fail('当年输入应产出 monthFlow 板块') }
else {
  if (!fbNow.monthFlow.includes('3月') || !fbNow.monthFlow.includes('7月')) { fbFail++; fail('monthFlow 未如实引用给定流月（3月/7月）') }
  if (/大吉|大凶/.test(fbNow.monthFlow)) { fbFail++; fail('monthFlow 出现禁用标签 大吉/大凶') }
}
// ①-c 规则版自身合规：默认口径禁用词 0 命中（打命中数）
const fbText = Object.values(fbNow).filter(v => typeof v === 'string').join('')
const fbHits = findForbidden(fbText).hits
if (fbHits.length) { fbFail++; fail(`规则版文案含禁用词 ${fbHits.length} 处：${fbHits.map(h => h.w).join('、')}`) }
// ①-d 免责判据：annualOverview 含三判据词
if (!/仅供参考/.test(fbNow.annualOverview) || !/非确定性/.test(fbNow.annualOverview) || !/不构成/.test(fbNow.annualOverview)) {
  fbFail++; fail('规则版 annualOverview 缺「仅供参考/非确定性/不构成」免责判据词')
}
console.log(fbFail === 0
  ? `✓ 规则版真调：无流月→5板块各≥50字且无monthFlow；当年→monthFlow引用3月/7月；禁用词命中 ${findForbidden(fbText).hits.length}；免责判据词齐备`
  : '✗ 规则版行为断言失败')

// ---------- ② AI 模块合规接线（源码断言，剥注释后扫描）----------
console.log('—— ② aiLiunian 合规接线 ——')
const aiSrc = stripComments(read('../src/lib/aiLiunian.ts'))
let aiFail = 0
const WIRING = [
  ['withComplianceRetry(', '重试编排未接线'],
  ['unknownGanzhi(text, facts)', '干支溯源未接线'],
  ['findForbidden(text).hits.length', '禁用词检查未接线（默认口径）'],
  ["replaceAll('不必', '无须')", '「不必→无须」安全替换缺失'],
  ['chart.taiYuan, chart.mingGong', 'facts 事实集缺胎元/命宫（须与 prompt 逐字对齐）'],
  ['includeMonthFlow ? [...SECTION_SPECS_BASE, MONTHFLOW_SPEC] : SECTION_SPECS_BASE', '板块结构未按当年/非当年条件化'],
]
for (const [pat, why] of WIRING) {
  if (!aiSrc.includes(pat)) { aiFail++; fail(`aiLiunian.ts 缺「${pat}」——${why}（模式：includes，剥注释）`) }
}
if (aiSrc.includes('findForbidden(text, true)')) { aiFail++; fail('年运应使用 findForbidden 默认口径（非合婚 strictBi），检出 findForbidden(text, true)') }
// 禁词清单（aiGeo 教训：prompt 缺禁词清单 → 模型偶发输出含禁词被拦截回退）
for (const w of ['大吉', '大凶', '一定', '注定', '替换范例']) {
  if (!aiSrc.includes(w)) { aiFail++; fail(`SYSTEM_PROMPT 禁词清单缺「${w}」`) }
}
// 免责语（overview 固定免责 + 兜底追加）
if (!aiSrc.includes('仅供参考，非确定性结论，不构成')) { aiFail++; fail('SYSTEM_PROMPT/兜底缺固定免责语') }
console.log(aiFail === 0
  ? `✓ 合规接线：重试/溯源/禁词（默认口径）/不必替换/facts含胎元命宫/板块条件化 ${WIRING.length} 判据全中；禁词清单与免责语齐备`
  : '✗ 合规接线断言失败')

// ---------- ③ route：targetYear 校验 + 规则引擎同源 + 保存 ----------
console.log('—— ③ /api/liunian route ——')
const routeSrc = stripComments(read('../src/app/api/liunian/route.ts'))
let rFail = 0
const R_NEEDS = [
  ['![nowYear, nowYear + 1, nowYear + 2].includes(targetYear)', 'targetYear 未限定今年/明年/后年'],
  ['仅支持今年、明年或后年', '校验失败缺中文 400 提示'],
  ['buildLuckCycles(', '未用规则引擎 buildLuckCycles（严禁另造算法）'],
  ['luck.liuNian.find(y => y.year === targetYear)', '目标流年未从规则引擎 liuNian 取（同源断言）'],
  ['? luck.liuYue : null', '流月未按「仅当年」条件给出'],
  ["kind: 'annual'", '报告未以 annual 类别保存'],
  ['saveReport(', '未接报告保存'],
  ['locked:', '缺 locked 双写层'],
  ["'annual_report'", 'locked 未挂 annual_report SKU'],
]
for (const [pat, why] of R_NEEDS) {
  if (!routeSrc.includes(pat)) { rFail++; fail(`route 缺「${pat}」——${why}`) }
}
console.log(rFail === 0
  ? `✓ route：目标年三档校验+中文400；流年事实取自 buildLuckCycles 同源；流月仅当年；报告按 annual 保存并双写 locked（${R_NEEDS.length} 判据全中）`
  : '✗ route 断言失败')

// ---------- ④ 页面与导航 ----------
console.log('—— ④ /liunian 页面 ——')
let pFail = 0
if (!existsSync(new URL('../src/app/liunian/page.tsx', import.meta.url))) { pFail++; fail('/liunian/page.tsx 不存在') }
else {
  const pageSrc = read('../src/app/liunian/page.tsx')
  if (!pageSrc.includes("'use client'")) { pFail++; fail('/liunian 页缺 use client') }
  for (const w of ['今年', '明年', '后年']) {
    if (!pageSrc.includes(w)) { pFail++; fail(`/liunian 年份选项缺「${w}」`) }
  }
  if (!pageSrc.includes('targetYear')) { pFail++; fail('/liunian 页未传 targetYear') }
  if (!pageSrc.includes('LiunianResultView')) { pFail++; fail('/liunian 页未用共享渲染组件') }
  if (!pageSrc.includes('会员不含报告')) { pFail++; fail('/liunian 页缺「会员不含报告」披露') }
}
if (!existsSync(new URL('../src/app/liunian/layout.tsx', import.meta.url))) { pFail++; fail('缺 /liunian/layout.tsx（metadata）') }
const viewSrc = read('../src/components/reports/LiunianResultView.tsx')
if (!viewSrc.includes('export interface LiunianResultData')) { pFail++; fail('LiunianResultView 缺导出数据类型') }
const navSrc = read('../src/components/Nav.tsx')
if (!navSrc.includes('href="/liunian"')) { pFail++; fail('Nav 缺「年运报告」链接') }
if (!navSrc.includes('href="/reports"')) { pFail++; fail('Nav 缺「我的报告」链接') }
console.log(pFail === 0
  ? `✓ 页面：/liunian（use client+三档年份+共享View+定价披露）、layout、Nav 年运/我的报告链接齐备`
  : '✗ 页面断言失败')

console.log('\n' + (allPass ? 'LIUNIAN_ACCEPT_PASS' : 'LIUNIAN_ACCEPT_FAIL'))
if (!allPass) process.exit(1)
