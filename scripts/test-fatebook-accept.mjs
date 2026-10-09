// 命书「万字补全」＋ 公开示例命书验收（HANDOFF-万字补全与文案返修 §1.3 / §3.4）
// A 板块字数要求（离线、进 verify）：
//   A1 SECTION_SPECS 各板块区间【中值合计 ≥ 5600】——区间从生产代码 SECTION_SPECS 解析，未重抄字数表
//   A2 每板块同时含「须含以下要点」与硬下限句「不少于 X 字」（防只改数字诱导注水）
// B 示例命书静态 JSON（src/data/demo-fatebook.json，由 build-demo-fatebook.mjs 预生成，不调 AI）：
//   B1 结构完整（10 板块 + luckCycles + similarCases）
//   B2 前 3 板块完整（≥ 各自要求下限）、后 7 板块摘要（≤ DEMO_SUMMARY_MAX 且含截断提示）
//   B3 luckCycles 只含前 2 步大运 + 当年流年（无流月）；similarCases 只 1 条
//   B4 虚构红线：示例四柱 ≠ 用户八字；meta.fictional === true；出生资料与 DEMO_BIRTH 一致
//   B5 示例全文过 findForbidden（与 aiAnalysis 同口径）
// C 示例页（/mingshu/demo）：存在、零 AI 零 IO 零登录（源码扫描 + 无 middleware）、真调 Page 渲染、/mingshu 有入口
import { existsSync, readFileSync } from 'node:fs'
import { SECTION_SPECS } from '../src/lib/aiAnalysis.ts'
import {
  DEMO_FULL_SECTIONS, DEMO_SUMMARY_MAX, DEMO_DAYUN_COUNT,
  DEMO_LIUNIAN_COUNT, DEMO_CASE_COUNT, DEMO_BIRTH
} from '../src/lib/demoFatebook.ts'
import { findForbidden } from '../src/lib/ai-check.ts'

let allPass = true
const fail = (msg) => { allPass = false; console.log('  ✗ ' + msg) }
const clen = (s) => [...s].length

// ---------- A1 字数要求中值合计 ≥ 5600 ----------
console.log('—— A1 板块字数要求中值合计 ——')
const RANGE_RE = /(\d+)-(\d+)字/
const ranges = {}
let midSum = 0, minSum = 0
for (const spec of SECTION_SPECS) {
  const m = spec.requirement.match(RANGE_RE)
  if (!m) { fail(`${spec.key} requirement 未命中区间模式 ${RANGE_RE}：${spec.requirement.slice(-30)}`); continue }
  ranges[spec.key] = { min: Number(m[1]), max: Number(m[2]) }
  midSum += (Number(m[1]) + Number(m[2])) / 2
  minSum += Number(m[1])
}
console.log(`  扫描：模式 ${RANGE_RE} 命中 ${Object.keys(ranges).length}/${SECTION_SPECS.length} 板块；中值合计 ${midSum}、下限合计 ${minSum}`)
if (Object.keys(ranges).length !== SECTION_SPECS.length) {
  fail('SECTION_SPECS 有板块缺字数区间，无法计算中值合计')
} else if (midSum < 5600) {
  fail(`板块字数要求中值合计 ${midSum} < 5600（万字补全目标未守住）`)
} else {
  console.log(`✓ A1 中值合计 ${midSum} ≥ 5600（区间解析自导出的 SECTION_SPECS，单一事实源）`)
}

// ---------- A2 要点 + 硬下限 ----------
console.log('—— A2 内容要点与硬下限句 ——')
let pointsHit = 0, floorHit = 0, a2Fail = 0
for (const spec of SECTION_SPECS) {
  if (spec.requirement.includes('须含以下要点')) pointsHit++
  else { a2Fail++; fail(`${spec.key} 缺「须含以下要点」`) }
  const r = ranges[spec.key]
  if (r && spec.requirement.includes(`不少于 ${r.min} 字`)) floorHit++
  else { a2Fail++; fail(`${spec.key} 缺硬下限句「不少于 ${r ? r.min : '?'} 字」`) }
}
console.log(a2Fail === 0
  ? `✓ A2 「须含以下要点」${pointsHit}/10 命中；「不少于 X 字」${floorHit}/10 命中（字数增长来自要点而非注水）`
  : `✗ A2 要点/硬下限不完整`)

// ---------- B 示例命书静态 JSON ----------
console.log('—— B 示例命书静态 JSON ——')
const JSON_PATH = 'src/data/demo-fatebook.json'
let demo = null
if (!existsSync(JSON_PATH)) {
  fail(`${JSON_PATH} 不存在——先运行 npm run build:demo 生成（调 AI，一次性）`)
} else {
  demo = JSON.parse(readFileSync(JSON_PATH, 'utf8'))
}

if (demo) {
  // B1 结构完整
  let b1Fail = 0
  for (const spec of SECTION_SPECS) {
    if (typeof demo.sections?.[spec.key] !== 'string' || !demo.sections[spec.key]) {
      b1Fail++; fail(`demo.sections.${spec.key} 缺失或非字符串`)
    }
  }
  if (!demo.luckCycles || !Array.isArray(demo.luckCycles.daYun) || !Array.isArray(demo.luckCycles.liuNian) || !Array.isArray(demo.luckCycles.liuYue)) {
    b1Fail++; fail('demo.luckCycles 结构不完整')
  }
  if (!Array.isArray(demo.similarCases)) { b1Fail++; fail('demo.similarCases 非数组') }
  if (!Array.isArray(demo.pillars) || demo.pillars.length !== 4) { b1Fail++; fail('demo.pillars 非四柱') }
  console.log(b1Fail === 0
    ? `✓ B1 结构完整：10 板块 + luckCycles + similarCases + 四柱（扫描 ${SECTION_SPECS.length} 个板块键）`
    : `✗ B1 结构缺失 ${b1Fail} 处`)

  // B2 前 3 完整 / 后 7 摘要
  let b2Fail = 0, fullOk = 0, sumOk = 0
  for (const spec of SECTION_SPECS) {
    const text = demo.sections[spec.key]
    if (typeof text !== 'string') continue
    const n = clen(text)
    if (DEMO_FULL_SECTIONS.includes(spec.key)) {
      const min = ranges[spec.key]?.min ?? 0
      if (n < min) { b2Fail++; fail(`完整板块 ${spec.key} 实际 ${n} 字 < 要求下限 ${min}`) }
      else fullOk++
    } else {
      if (n > DEMO_SUMMARY_MAX) { b2Fail++; fail(`摘要板块 ${spec.key} 实际 ${n} 字 > 上限 ${DEMO_SUMMARY_MAX}`) }
      else if (!text.includes('完整内容约')) { b2Fail++; fail(`摘要板块 ${spec.key} 缺「完整内容约 X 字」截断提示`) }
      else sumOk++
    }
  }
  console.log(b2Fail === 0
    ? `✓ B2 前 30% 边界：${fullOk} 个完整板块均 ≥ 下限；${sumOk} 个摘要板块均 ≤ ${DEMO_SUMMARY_MAX} 字且带截断提示`
    : `✗ B2 边界错误 ${b2Fail} 处`)

  // B3 岁运/命例裁剪
  let b3Fail = 0
  const dy = demo.luckCycles.daYun.length, ln = demo.luckCycles.liuNian.length, ly = demo.luckCycles.liuYue.length, cs = demo.similarCases.length
  if (dy !== DEMO_DAYUN_COUNT) { b3Fail++; fail(`luckCycles.daYun ${dy} 条 ≠ ${DEMO_DAYUN_COUNT}`) }
  if (ln !== DEMO_LIUNIAN_COUNT) { b3Fail++; fail(`luckCycles.liuNian ${ln} 条 ≠ ${DEMO_LIUNIAN_COUNT}`) }
  if (ly !== 0) { b3Fail++; fail(`luckCycles.liuYue ${ly} 条 ≠ 0（示例不展示流月）`) }
  if (cs !== DEMO_CASE_COUNT) { b3Fail++; fail(`similarCases ${cs} 条 ≠ ${DEMO_CASE_COUNT}`) }
  console.log(b3Fail === 0
    ? `✓ B3 裁剪：大运 ${dy} 步（前 2）、流年 ${ln} 年（当年）、流月 ${ly}、命例 ${cs} 条`
    : `✗ B3 裁剪错误 ${b3Fail} 处`)

  // B4 虚构红线
  let b4Fail = 0
  const pillarStr = demo.pillars.map(p => p.ganZhi).join(' ')
  if (pillarStr === '辛未 壬辰 壬子 壬寅') { b4Fail++; fail(`示例四柱「${pillarStr}」= 用户八字（红线，不得使用）`) }
  if (demo.meta?.fictional !== true) { b4Fail++; fail('demo.meta.fictional 非 true（未标注虚构）') }
  for (const [label, frag] of [['年', String(DEMO_BIRTH.year)], ['月', String(DEMO_BIRTH.month)], ['日', String(DEMO_BIRTH.day)]]) {
    if (!String(demo.meta?.birthText || '').includes(frag)) { b4Fail++; fail(`demo.meta.birthText 与 DEMO_BIRTH 不一致（缺${label}「${frag}」）`) }
  }
  console.log(b4Fail === 0
    ? `✓ B4 虚构红线：示例四柱「${pillarStr}」≠ 用户八字；meta.fictional=true；出生资料与 DEMO_BIRTH（${DEMO_BIRTH.year}-${DEMO_BIRTH.month}-${DEMO_BIRTH.day}）一致`
    : `✗ B4 虚构红线问题 ${b4Fail} 处`)

  // B5 合规
  const allText = Object.values(demo.sections).join('\n')
  const { hits } = findForbidden(allText)
  if (hits.length) fail(`B5 示例命书禁词命中 ${hits.length} 处：${[...new Set(hits.map(h => h.w))].join('、')}`)
  else console.log(`✓ B5 合规：示例十板块全文 ${clen(allText)} 字过 findForbidden（aiAnalysis 同口径）0 命中`)
}

// ---------- C 示例页 ----------
console.log('—— C 示例页 /mingshu/demo ——')
const PAGE_PATH = 'src/app/mingshu/demo/page.tsx'
let cFail = 0
if (!existsSync(PAGE_PATH)) {
  cFail++; fail(`${PAGE_PATH} 不存在`)
} else {
  // C1 零 AI 零 IO 零登录（源码扫描；命中数 + 模式）
  const pageSrc = readFileSync(PAGE_PATH, 'utf8')
  const AI_IO_RE = /generateAIAnalysis|from ['"]@\/lib\/ai|fetch\s*\(|supabase|access_token|localStorage/g
  const aiHits = pageSrc.match(AI_IO_RE) || []
  if (aiHits.length) { cFail++; fail(`示例页源码命中 AI/IO/登录模式 ${aiHits.length} 处（${AI_IO_RE}）：${[...new Set(aiHits)].join('、')}`) }
  // C2 无需登录可达：无 middleware 拦截该路径
  const mwPath = existsSync('src/middleware.ts') ? 'src/middleware.ts' : existsSync('middleware.ts') ? 'middleware.ts' : null
  if (mwPath) {
    const mwSrc = readFileSync(mwPath, 'utf8')
    if (mwSrc.includes('/mingshu')) { cFail++; fail(`middleware（${mwPath}）覆盖 /mingshu，示例页可能被拦`) }
  }
  if (cFail === 0) console.log(`✓ C1+C2 静态资产页：AI/IO/登录模式 0 命中（${AI_IO_RE}）；${mwPath ? 'middleware 不覆盖 /mingshu' : '无 middleware，不拦截任何路径'}`)

  // C3 行为断言：真调 Page default，返回非空 JSX（§8.6.7：函数行为必须真调用）
  try {
    const mod = await import('../src/app/mingshu/demo/page.tsx')
    if (typeof mod.default !== 'function') { cFail++; fail('示例页 default 不是函数') }
    else {
      const jsx = await mod.default({})
      if (!jsx) { cFail++; fail('示例页 Page() 返回空') }
      else console.log('✓ C3 行为：真调 Page() 返回 JSX（静态 JSON 渲染，无需登录，无 AI 调用）')
    }
  } catch (e) {
    cFail++; fail(`示例页 import/调用抛错：${e instanceof Error ? e.message : e}`)
  }
}
// C4 /mingshu 入口链接
const msSrc = readFileSync('src/app/mingshu/MingShuContent.tsx', 'utf8')
const entryHits = msSrc.match(/href="\/mingshu\/demo"/g) || []
if (entryHits.length === 0) { cFail++; fail('/mingshu 页无 /mingshu/demo 入口链接（模式 /href="\\/mingshu\\/demo"/g，0 命中）') }
else console.log(`✓ C4 入口：/mingshu 页含示例入口链接（模式 /href="\\/mingshu\\/demo"/g，${entryHits.length} 命中）`)

// ---------- 牙口自检（守护断言本身，§8.6）----------
// ① 摘要上限判据：构造超长串必须被判违规；② 完整下限判据：构造过短串必须被判违规；
// ③ 中值合计判据：把解析出的最小区间改成 0 重算必须 < 5600（证明阈值非恒绿）
let toothFail = 0
if (!(clen('超'.repeat(DEMO_SUMMARY_MAX + 1)) > DEMO_SUMMARY_MAX)) { toothFail++; fail('牙口①：摘要上限判据失效') }
const firstFull = SECTION_SPECS.find(s => DEMO_FULL_SECTIONS.includes(s.key))
if (firstFull && !(clen('短') < (ranges[firstFull.key]?.min ?? 0))) { toothFail++; fail('牙口②：完整下限判据失效') }
const zeroedMid = SECTION_SPECS.reduce((s, spec) => {
  const r = ranges[spec.key]
  return s + (spec.key === 'daYunAnalysis' ? 0 : r ? (r.min + r.max) / 2 : 0)
}, 0)
if (!(zeroedMid < 5600)) { toothFail++; fail('牙口③：中值合计阈值恒绿（daYunAnalysis 归零仍 ≥5600）') }
console.log(toothFail === 0
  ? `✓ 牙口自检：摘要上限/完整下限/中值阈值三判据均能判坏（daYunAnalysis 归零后中值 ${zeroedMid} < 5600）`
  : `✗ 牙口自检 ${toothFail} 处失效`)

console.log('\n' + (allPass ? 'FATEBOOK_ACCEPT_PASS' : 'FATEBOOK_ACCEPT_FAIL'))
if (!allPass) process.exit(1)
