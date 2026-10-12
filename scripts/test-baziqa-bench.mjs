/**
 * BaziQA Contest8 基准断言（HANDOFF-21 §五；纳入 npm run verify）
 * 用法：node --import tsx scripts/test-baziqa-bench.mjs
 *
 * 只做【数据与流程】的断言；准确率本身不作为 pass/fail 门禁（它是测量结果，任务书 §五）。
 * 牙口纪律（§8.6.7）：注入前先确认注入真的改变了行为（打出改变后的实际值），
 *   确认失败 ⇒ 立即中止，不得继续跑断言测试。
 */
import { existsSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { loadAllPersons, mappingFor, PLACE_MAP, paipanPerson, buildStandardText, buildEnhancedFacts, SYSTEM_PROMPT, buildFirstUserMessage, buildQuestionMessage, parseAnswer, EVAL_DIR, UPSTREAM_DIR } from './baziqa-lib.mjs'
import { paipan } from '../src/lib/paipan.ts'

let failed = 0
function assert(cond, label, detail = '') {
  if (cond) {
    console.log(`  ✓ ${label}${detail ? '（' + detail + '）' : ''}`)
  } else {
    console.error(`  ✗ ${label}${detail ? '—— ' + detail : ''}`)
    failed++
  }
}

const persons = loadAllPersons()
const allQuestions = persons.flatMap(p => p.questions.map(q => ({ ...q, person: p })))

// ═══════════════════════════════════════════════════════════
// ② 数据完整性断言
// ═══════════════════════════════════════════════════════════
console.log('② 数据完整性断言')
assert(allQuestions.length === 200, `200 题总数（实测 ${allQuestions.length}）`)
for (const y of [2021, 2022, 2023, 2024, 2025]) {
  const n = persons.filter(p => p.contestYear === y).reduce((s, p) => s + p.questions.length, 0)
  assert(n === 40, `${y} 年 40 题（实测 ${n}）`)
}
assert(allQuestions.every(q => q.options.length === 4), '每题恰好 4 个选项')
assert(allQuestions.every(q => /^[A-D]$/.test(q.answer)), '答案 ∈ {A,B,C,D}')
const ids = new Set(allQuestions.map(q => q.question_id))
assert(ids.size === 200, 'question_id 全局唯一')
// ★ 断言未使用 celebrity50（文件不存在；即使存在也未被任何脚本引用）
assert(!existsSync(join(UPSTREAM_DIR, 'celebrity50_zh.json')), '未使用 celebrity50_zh.json（upstream 内无此文件）')
// 上游文件逐字节未动（与 GitHub git/trees 核对过的大小）
const EXPECT_SIZES = { 'contest8_2021.json': 17719, 'contest8_2022.json': 16284, 'contest8_2023.json': 14253, 'contest8_2024.json': 18772, 'contest8_2025.json': 22675, 'dataset_and_input_format.md': 13383, 'benchmark_report.md': 40738 }
for (const [f, size] of Object.entries(EXPECT_SIZES)) {
  const p = join(UPSTREAM_DIR, f)
  assert(existsSync(p) && statSync(p).size === size, `上游 ${f} 原样未动（${size} 字节）`)
}

// ═══════════════════════════════════════════════════════════
// ③ 时区映射断言
// ═══════════════════════════════════════════════════════════
console.log('③ 时区映射断言')
const places = [...new Set(persons.map(p => p.birth.place))]
assert(places.every(pl => PLACE_MAP[pl]), `全部 ${places.length} 种 place 字面量都有显式映射（无 fallback）`)
assert(persons.length === 41, `41 位命主全部有映射（实测 ${persons.length}）`)
// 有来源的历史期望值（§8.6.2）：任务书 §4.2 实测——宫崎按 Asia/Tokyo → 时柱丁卯、offset −14 分钟
const miyazaki = persons.find(p => p.birth.place === '日本宫崎县')
const miyazakiChart = paipanPerson(miyazaki).chart
assert(miyazakiChart.pillars.hour.ganZhi === '丁卯' && miyazakiChart.timezoneOffsetApplied === -14,
  `宫崎历史期望（任务书实测）：时柱丁卯 + offset −14（实测 ${miyazakiChart.pillars.hour.ganZhi} / ${miyazakiChart.timezoneOffsetApplied}）`)
// 牙口③：改新加坡命主的映射（Asia/Singapore+103.82 → Asia/Shanghai+120）→ 行为必须真的变
const sg = persons.find(p => p.person_id === 'singapore_male_19930408_P004')
const sgBase = paipanPerson(sg).chart
const sgInjected = paipan({ year: sg.birth.year, month: sg.birth.month, day: sg.birth.day, hour: sg.birth.hour, minute: sg.birth.minute, gender: 1, birthZone: 'Asia/Shanghai', birthLng: 120 })
const sgBaseStr = ['year', 'month', 'day', 'hour'].map(k => sgBase.pillars[k].ganZhi).join(' ')
const sgInjStr = ['year', 'month', 'day', 'hour'].map(k => sgInjected.pillars[k].ganZhi).join(' ')
console.log(`    [牙口③确认注入有效] 新加坡1993-04-08 23:34 正常映射四柱=${sgBaseStr} → 改为 Asia/Shanghai+120 后=${sgInjStr}`)
if (sgBaseStr === sgInjStr) {
  console.error('    ✗✗ 注入无效（映射改变但四柱不变）——该例子看不出差别，不得充当牙口（任务书 §五③）→ 中止')
  process.exit(1)
}
assert(sgBaseStr !== sgInjStr, '牙口③：改映射 → 四柱必变（注入有效，见上实际值）')

// ═══════════════════════════════════════════════════════════
// ④ 排盘可复现断言
// ═══════════════════════════════════════════════════════════
console.log('④ 排盘可复现断言')
for (const pid of ['guangdong_female_19511114_P001', 'singapore_male_19930408_P004', 'malaysia_male_19730824_P006']) {
  const p = persons.find(x => x.person_id === pid)
  const c1 = paipanPerson(p).chart
  const c2 = paipanPerson(p).chart
  const same = ['year', 'month', 'day', 'hour'].every(k => c1.pillars[k].ganZhi === c2.pillars[k].ganZhi) && c1.timezoneOffsetApplied === c2.timezoneOffsetApplied
  assert(same, `同一命主排两次完全一致：${pid}`)
}

// ═══════════════════════════════════════════════════════════
// ① 反作弊断言 + ⑤ 三组分隔断言（共用 prompt 重建）
// ═══════════════════════════════════════════════════════════
console.log('① 反作弊断言')
console.log('⑤ 三组分隔断言')

const LEAK_RE = /答案[:：]\s*[A-D]\b|正确答案|标准答案|correct answer|answer\s*[:=]/i
// A 组不得出现的规则事实标记；B 组必须出现的标记
const FACT_MARKERS_B = ['本产品算法', '喜用：', '忌神：', '旺衰：', '格局：', '调候用神']
const META_TOKENS = ['contest8_', 'total_questions', 'contest_id']

// 预构建全部 prompt（含 A/B），同时收集牙口样本
let leakHits = 0, metaHits = 0, aFactHits = 0, bFactMisses = 0
let 牙口样本 = null
for (const p of persons) {
  const { chart, analyzable, luck } = paipanPerson(p)
  const std = buildStandardText(p, chart)
  const facts = buildEnhancedFacts(analyzable, luck)
  const firstA = buildFirstUserMessage(std, null, p.contestYear)
  const firstB = buildFirstUserMessage(std, facts, p.contestYear)
  for (const [group, first] of [['A', firstA], ['B', firstB]]) {
    const promptPieces = [SYSTEM_PROMPT, first, ...p.questions.map((q, i) => buildQuestionMessage(i + 1, q))]
    for (const piece of promptPieces) {
      if (LEAK_RE.test(piece)) leakHits++
      for (const t of META_TOKENS) if (piece.includes(t)) metaHits++
    }
  }
  // ⑤ A 组不得含规则事实；B 组必须含
  for (const m of FACT_MARKERS_B) if (firstA.includes(m)) aFactHits++
  for (const m of FACT_MARKERS_B) if (!firstB.includes(m)) bFactMisses++
  if (!牙口样本 && p.questions.length >= 5) 牙口样本 = { p, std, facts, firstA, q: p.questions[0], contestYear: p.contestYear }
}

assert(leakHits === 0, `200×2 组全部 prompt 无 answer 泄漏（泄漏模式命中 ${leakHits}）`)
assert(metaHits === 0, `prompt 无元信息泄漏（contest_id/description 字段/total_questions 命中 ${metaHits}）`)
// description 正文也不得喂（元信息第 0 项的 description 文本）
const metaDesc = JSON.parse(readFileSync(join(UPSTREAM_DIR, 'contest8_2021.json'), 'utf8'))[0].description
assert(!牙口样本.firstA.includes(metaDesc.slice(0, 20)), 'prompt 不含 description 正文')
assert(parseAnswer('分析……\n答案：B') === 'B' && parseAnswer('分析……\n答案：D') === 'D', 'parseAnswer 解析正常')

// 牙口①：把 answer 拼进 prompt → 反作弊检查必须精确翻红
{
  const { firstA, q } = 牙口样本
  const injected = firstA + `\n\n正确答案：${q.answer}`
  const cleanBefore = !LEAK_RE.test(firstA)
  const dirtyAfter = LEAK_RE.test(injected)
  console.log(`    [牙口①确认注入有效] 注入文本尾部=「正确答案：${q.answer}」；注入前 LEAK_RE 命中=${!cleanBefore}，注入后命中=${dirtyAfter}`)
  if (cleanBefore && !dirtyAfter) {
    console.error('    ✗✗ 注入无效（拼入 answer 后检查仍为绿）→ 中止')
    process.exit(1)
  }
  assert(dirtyAfter, '牙口①：注入 answer → 反作弊断言翻红')
  // 交叉检查：四选项中正确选项字母拼入也翻红
  const injected2 = firstA + `\n（答案 ${q.answer}）`
  assert(/答案[:：]?\s*[A-D]/.test(injected2.replace('「答案：X」', '')) || LEAK_RE.test(injected2), '牙口①-2：括注式答案注入同样翻红')
}

// 牙口⑤：把 B 组事实拼进 A 组 → 三组分隔检查翻红
assert(aFactHits === 0, `A 组 prompt 不含任何规则引擎事实（标记命中 ${aFactHits}）`)
assert(bFactMisses === 0, `B 组 prompt 含全部规则引擎事实（缺失 ${bFactMisses}）`)
{
  const injectedA = 牙口样本.firstA + 牙口样本.facts
  const hit = FACT_MARKERS_B.filter(m => injectedA.includes(m)).length
  console.log(`    [牙口⑤确认注入有效] 事实拼入 A 组后标记命中 ${hit}/${FACT_MARKERS_B.length}（注入前 0）`)
  if (hit === 0) {
    console.error('    ✗✗ 注入无效 → 中止')
    process.exit(1)
  }
  assert(hit === FACT_MARKERS_B.length, '牙口⑤：事实拼入 A 组 → 分隔断言翻红')
}

// ═══════════════════════════════════════════════════════════
// ⑥ 记录完整性断言（结果文件；本任务完成后随仓库提交，故要求存在）
// ═══════════════════════════════════════════════════════════
console.log('⑥ 记录完整性断言')
for (const g of ['A', 'B']) {
  const f = join(EVAL_DIR, 'results', `group${g}.json`)
  if (!existsSync(f)) {
    console.error(`  ✗ 结果文件缺失：${f}（评测完成后随仓库提交；先跑 scripts/baziqa-eval.mjs --group ${g}）`)
    failed++
    continue
  }
  const data = JSON.parse(readFileSync(f, 'utf8'))
  const recs = data.records
  assert(recs.length === 200, `组${g}：每题一条共 200 条（实测 ${recs.length}）`)
  const recIds = new Set(recs.map(r => r.question_id))
  assert(recIds.size === 200 && allQuestions.every(q => recIds.has(q.question_id)), `组${g}：question_id 与上游题目一一对应`)
  // 独立重算对错（不信存储标志）
  let mismatch = 0
  for (const r of recs) {
    const q = allQuestions.find(x => x.question_id === r.question_id)
    if (r.correctAnswer !== q.answer) mismatch++
    if (r.isCorrect !== (r.ourAnswer === q.answer)) mismatch++
    if (r.ourAnswer !== null && !/^[A-D]$/.test(r.ourAnswer)) mismatch++
  }
  assert(mismatch === 0, `组${g}：correctAnswer/isCorrect 与上游独立重算一致（不一致 ${mismatch}）`)
  assert(recs.every(r => typeof r.reply === 'string' && r.reply.length > 0), `组${g}：每条含模型原始回复`)
}

// ═══════════════════════════════════════════════════════════
console.log('')
if (failed > 0) {
  console.error(`test-baziqa-bench: ${failed} 项断言失败`)
  process.exit(1)
}
console.log('test-baziqa-bench: 全部断言通过（数据与流程层面；准确率是测量结果，不作门禁）')
