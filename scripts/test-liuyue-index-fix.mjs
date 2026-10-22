// ★ 流月索引假设缺陷 · 结构性守护（REPLY-流月索引假设缺陷复核 §4.3，2026-10-10）
// 事故：19 号把 liuNian 从「当年起 3 项」扩为「过去 8 年 + 当年 + 未来 2 年」（11 项，首位变 8 年前），
//   三处消费者仍按 liuNian[0] 取「当年」→
//     ① analysis.ts 太岁取错（2026 取到 2018「戌」，应为「午」）→ 流月冲/合太岁整体对错太岁
//     ② aiLiunian.ts liuYueFor 当年恒 null → AI 永远拿不到流月
//     ③ api/liunian route nowYear2=2018 → 当年报告不带流月
//   合起来＝流月功能整体静默失效，而 verify 19 段全绿（旧断言只查取值域、且用假数据）。
//
// 两类断言（复核 §4.3）：
//   ① 源码扫描：生产代码【禁按索引】取流年当年——liuNian[0] / liuNian.slice(0 / liuNian.at(0)
//      白名单形态：.find( / .filter(y => y.current) / .map(（均不被本脚本模式命中）
//   ② 真实命盘 + 真实 buildLuckCycles（不用假数据）：
//      currentYear 与 current 流年项一致；太岁地支＝当年流年地支；
//      流月冲/合太岁逐月精确重算（不多不少，全年恰好各 1 个月）；
//      liuYueFor(当年/明年/后年)===各年数组本体、去年===null；12 月齐全、tag 三档。
//   牙口（开发期手工注入，已实测留痕）：
//     A analysis.ts「const currentNian = liuNian.find(y => y.current)」改回 liuNian[0]
//       → 太岁断言 + 当年流月断言精确翻红
//     B aiLiunian.ts liuYueFor 改读 luck.liuNian[0].year
//       → 当年流月断言翻红（同时①源码扫描翻红）
import { readFileSync, readdirSync } from 'node:fs'
import { paipan, getWangShuai, getGeJu } from '../src/lib/paipan.ts'
import { buildLuckCycles } from '../src/lib/analysis.ts'
import { liuYueFor } from '../src/lib/aiLiunian.ts'
import { LIU_CHONG, LIU_HE, ZHI } from '../src/lib/branchRelations.ts'
import { Solar } from 'lunar-javascript'

let allPass = true
const fail = (msg) => { allPass = false; console.log('  ✗ ' + msg) }
const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')

// —— ① 源码扫描：生产代码禁按索引取 liuNian 当年 ——
console.log('—— ① 源码扫描：禁 liuNian[0] / liuNian.slice(0 / liuNian.at(0)（白名单 .find/.filter(current)/.map）——')
// 注释剥离：逐字符跟踪引号/模板串/行注释/块注释状态（反向断言不得用简陋正则，避免漏扫字符串同侧代码）
function stripComments(src) {
  let out = '', state = 'code' // code | line | block | sq | dq | tpl
  for (let i = 0; i < src.length; i++) {
    const c = src[i], n = src[i + 1]
    if (state === 'code') {
      if (c === '/' && n === '/') { state = 'line'; i++; continue }
      if (c === '/' && n === '*') { state = 'block'; i++; continue }
      if (c === "'") { state = 'sq'; out += c; continue }
      if (c === '"') { state = 'dq'; out += c; continue }
      if (c === '`') { state = 'tpl'; out += c; continue }
      out += c
    } else if (state === 'line') {
      if (c === '\n') { state = 'code'; out += c }
    } else if (state === 'block') {
      if (c === '*' && n === '/') { state = 'code'; i++ }
    } else if (state === 'sq') {
      out += c
      if (c === '\\') { out += n ?? ''; i++ }
      else if (c === "'") state = 'code'
    } else if (state === 'dq') {
      out += c
      if (c === '\\') { out += n ?? ''; i++ }
      else if (c === '"') state = 'code'
    } else if (state === 'tpl') {
      out += c
      if (c === '\\') { out += n ?? ''; i++ }
      else if (c === '`') state = 'code'
    }
  }
  return out
}
const FORBIDDEN = [
  { re: /\bliuNian\s*\[\s*0\s*\]/g, name: 'liuNian[0]' },
  { re: /\bliuNian\s*\.\s*slice\s*\(\s*0\b/g, name: 'liuNian.slice(0' },
  { re: /\bliuNian\s*\.\s*at\s*\(\s*0\s*\)/g, name: 'liuNian.at(0)' }
]
const files = readdirSync(new URL('../src', import.meta.url), { recursive: true })
  .filter(f => f.endsWith('.ts') || f.endsWith('.tsx'))
let scanHits = 0
for (const f of files) {
  const code = stripComments(read('../src/' + f))
  for (const { re, name } of FORBIDDEN) {
    re.lastIndex = 0
    const hits = code.match(re)
    if (hits) { scanHits += hits.length; fail(`src/${f} 检出禁用形态「${name}」${hits.length} 处（模式：${re}）`) }
  }
}
console.log(scanHits === 0
  ? `✓ 索引扫描：扫描 ${files.length} 个 src 文件，三模式（${FORBIDDEN.map(p => p.name).join(' / ')}）命中 ${scanHits}`
  : `✗ 索引扫描共 ${scanHits} 处命中`)

// 正向接线：显式字段必须真的被三处消费（打命中数）
const wiring = [
  ['src/lib/analysis.ts', /currentYear/g],
  ['src/lib/aiLiunian.ts', /luck\.currentYear/g],
  ['src/app/api/liunian/route.ts', /luck\.currentYear/g]
]
let wireFail = 0
for (const [f, re] of wiring) {
  const code = stripComments(read('../' + f))
  const n = (code.match(re) || []).length
  if (n === 0) { wireFail++; fail(`${f} 未消费显式字段（模式 ${re} 命中 0）`) }
  else console.log(`  · ${f}：${re} 命中 ${n}`)
}
if (wireFail === 0) console.log('✓ 显式字段 currentYear 三处接线齐备（analysis 产出 / aiLiunian 读 / route 读）')

// —— ② 真实命盘 + 真实 buildLuckCycles ——
// 用户命盘：1991-04-12 03:10 男 · 辛未 壬辰 壬子 壬寅 · 身强 · 七杀格 · 喜用土火木
function buildUserChart() {
  const chart = paipan({ year: 1991, month: 4, day: 12, hour: 3, minute: 10, gender: 1 })
  chart.analysis = { wangShuai: getWangShuai(chart), geJu: getGeJu(chart), isPaid: true }
  return chart
}
const chart = buildUserChart()
const TAGS = new Set(['较宜', '一般', '宜慎'])
// 多个锚定年份（固定时钟，不依赖运行年）：避免只对 2026 单年过审
const ANCHORS = [2024, 2026, 2030]
let behFail = 0

for (const Y of ANCHORS) {
  const luck = buildLuckCycles(chart, new Date(Y, 5, 15))

  // ②-a currentYear 单一事实源：与 liuNian 中 current 项【恰好一项】年份一致
  const curs = luck.liuNian.filter(y => y.current)
  if (curs.length !== 1) { behFail++; fail(`${Y}：current 流年项 ${curs.length} 个（期望恰好 1）`) }
  if (luck.currentYear !== Y) { behFail++; fail(`${Y}：luck.currentYear=${luck.currentYear}（期望 ${Y}）`) }
  if (curs[0] && curs[0].year !== Y) { behFail++; fail(`${Y}：current 项 year=${curs[0].year}（期望 ${Y}）`) }

  // ②-b 太岁＝当年流年地支（独立用 Solar 链重算年柱，不吃生产代码的结论）
  const expectYearGZ = Solar.fromYmdHms(Y, 6, 15, 12, 0, 0).getLunar().getEightChar().getYear()
  if (!curs[0] || curs[0].ganZhi !== expectYearGZ) {
    behFail++; fail(`${Y}：当年流年干支=${curs[0]?.ganZhi}（独立重算 ${expectYearGZ}）`)
  }
  const taiSui = expectYearGZ[1]

  // ②-c 流月 12 条齐全；月支＝公历月中所在节令月（1月15→丑…12月15→子）；tag 三档
  if (luck.liuYue.length !== 12) { behFail++; fail(`${Y}：流月 ${luck.liuYue.length} 条（期望 12）`) }
  for (const m of luck.liuYue) {
    if (m.month < 1 || m.month > 12) { behFail++; fail(`${Y}：非法月份序号 ${m.month}`) }
    // m 是公历月（取公历 m 月 15 日所在节令月）：1月15日在小寒后→丑月、2月立春后→寅月…12月大雪后→子月
    const expectZhi = ZHI[m.month % 12]
    if (m.ganZhi[1] !== expectZhi) { behFail++; fail(`${Y} ${m.month}月：月支=${m.ganZhi[1]}（期望 ${expectZhi}，公历月中所在节令月）`) }
    if (!TAGS.has(m.tag)) { behFail++; fail(`${Y} ${m.month}月：tag=${m.tag} 不在 较宜/一般/宜慎`) }
  }

  // ②-d 太岁一致性【逐月精确重算】：冲/合太岁关系必须不多不少
  //   生产判定：LUCK_CHONG[月支]===太岁 → 冲；LUCK_HE[月支]===太岁 → 合（if/else if 互斥）
  let chongMonths = [], heMonths = []
  for (const m of luck.liuYue) {
    const z = m.ganZhi[1]
    const expectChong = LIU_CHONG[z] === taiSui
    const expectHe = !expectChong && LIU_HE[z] === taiSui
    const hasChong = m.relations.some(r => r.includes('月支冲太岁'))
    const hasHe = m.relations.some(r => r.includes('月支合太岁'))
    if (hasChong) chongMonths.push(m.month)
    if (hasHe) heMonths.push(m.month)
    if (hasChong !== expectChong) {
      behFail++; fail(`${Y} ${m.month}月（${z}月）：冲太岁关系=${hasChong}（重算应=${expectChong}，太岁=${taiSui}）`)
    }
    if (hasHe !== expectHe) {
      behFail++; fail(`${Y} ${m.month}月（${z}月）：合太岁关系=${hasHe}（重算应=${expectHe}，太岁=${taiSui}）`)
    }
  }
  // 太岁的冲支、合支在 12 月支中各出现恰好一次 → 全年必恰好各 1 个月命中
  if (chongMonths.length !== 1) { behFail++; fail(`${Y}：冲太岁月份 ${chongMonths.length} 个（期望恰好 1）：${chongMonths}`) }
  if (heMonths.length !== 1) { behFail++; fail(`${Y}：合太岁月份 ${heMonths.length} 个（期望恰好 1）：${heMonths}`) }
  console.log(`  · ${Y}（太岁 ${taiSui}）：冲太岁在 ${chongMonths.join(',')} 月 / 合太岁在 ${heMonths.join(',')} 月（逐月精确重算一致）`)

  // ②-e liuYueFor：当年/明年/后年给各自数组本体；往年一律 null（严禁 AI 编造三年外的流月）
  if (liuYueFor(Y, luck) !== luck.liuYue) { behFail++; fail(`${Y}：liuYueFor(当年) 未返回 liuYue 本体`) }
  if (liuYueFor(Y - 1, luck) !== null) { behFail++; fail(`${Y}：liuYueFor(${Y - 1}) 应返回 null`) }
  for (const dy of [1, 2]) {
    const arr = luck.liuYueByYear[Y + dy]
    if (!arr || arr.length !== 12) { behFail++; fail(`${Y}：liuYueByYear[${Y + dy}] 缺失或非 12 条（实际 ${arr?.length ?? '无'}）`); continue }
    if (liuYueFor(Y + dy, luck) !== arr) { behFail++; fail(`${Y}：liuYueFor(${Y + dy}) 未返回该年数组本体`) }
    // ★ 未来年太岁必须取【该年】地支：沿用当年太岁是 2026-10-10 事故的同类错误
    const futTaiSui = luck.liuNian.find(y => y.year === Y + dy)?.ganZhi?.[1]
    const futChong = arr.filter(m => m.relations.some(r => r.includes('月支冲太岁'))).length
    const futHe = arr.filter(m => m.relations.some(r => r.includes('月支合太岁'))).length
    if (!futTaiSui) { behFail++; fail(`${Y}：未找到 ${Y + dy} 的流年干支，无法核对未来年太岁`) }
    else if (futChong !== 1 || futHe !== 1) {
      behFail++; fail(`${Y + dy}（太岁 ${futTaiSui}）：冲太岁 ${futChong} 月 / 合太岁 ${futHe} 月（期望各 1）`)
    }
  }
}

// ②-f 事故现场钉死：2026 丙午年，公历 12 月（大雪后子月）子午冲必冲太岁、
//   公历 7 月（小暑后未月）午未合必合太岁；旧缺陷太岁取 2018「戌」时，
//   是公历 4 月辰月冲（辰戌冲）、3 月卯月合（卯戌合）——退化必翻红
{
  const luck = buildLuckCycles(chart, new Date(2026, 5, 15))
  const withTaiSui = (monthNo) => luck.liuYue.find(m => m.month === monthNo).relations
    .filter(r => r.includes('太岁'))
  const m12 = withTaiSui(12), m7 = withTaiSui(7), m4 = withTaiSui(4), m3 = withTaiSui(3)
  if (!m12.some(r => r.includes('冲'))) { behFail++; fail(`2026：12 子月应冲午太岁，实际 ${m12.join('；') || '无'} `) }
  if (!m7.some(r => r.includes('合'))) { behFail++; fail(`2026：7 未月应合午太岁，实际 ${m7.join('；') || '无'} `) }
  if (m4.length || m3.length) { behFail++; fail(`2026：4 辰月/3 卯月不应有太岁关系（旧缺陷对错 2018 戌太岁的残留）：${[...m4, ...m3].join('；')}`) }
  if (m12.length && m7.length && !m4.length && !m3.length) {
    console.log('  · 2026 现场钉死：12 子月冲午太岁 / 7 未月合午太岁；辰月、卯月无太岁关系（太岁非 2018 戌）')
  }
}
console.log(behFail === 0
  ? `✓ 流月功能：${ANCHORS.length} 个锚定年份全部通过（currentYear 一致/太岁逐月精确/三年均有流月·往年无/12月三档）`
  : '✗ 流月功能断言失败')

console.log('\n' + (allPass && scanHits === 0 && wireFail === 0 && behFail === 0 ? 'LIUYUE_INDEX_FIX_PASS' : 'LIUYUE_INDEX_FIX_FAIL'))
if (!allPass) process.exit(1)
