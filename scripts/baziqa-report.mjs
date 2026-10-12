/**
 * BaziQA Contest8 汇总报告（HANDOFF-21 §6.2）
 * 用法：node --import tsx scripts/baziqa-report.mjs
 * 产出：eval/baziqa/report.md
 * 硬要求：总/分年/分维度、A vs B 逐项对比、与外部基线并排、错题清单≥20、
 *        可比性限制写明、如实报告不美化。
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { loadAllPersons, EVAL_DIR } from './baziqa-lib.mjs'

const paipanData = JSON.parse(readFileSync(join(EVAL_DIR, 'paipan-results.json'), 'utf8'))
const groupA = JSON.parse(readFileSync(join(EVAL_DIR, 'results', 'groupA.json'), 'utf8'))
const groupB = JSON.parse(readFileSync(join(EVAL_DIR, 'results', 'groupB.json'), 'utf8'))
const persons = loadAllPersons()

// ── 维度分类：数据集 categories 字段为预留空数组，不含维度信息（任务书 §2.2），
//    官方未开源其分类脚本 → 此处为【我们自建的关键词分类】，须如实标注。 ──
const DOMAIN_RULES = [
  ['健康', /病|疾|伤|寿|健康|身体|医院|绝症|癌症|残疾|意外|车祸|手术|亚健康|体质|猝/],
  ['感情', /婚|恋|妻|夫|配偶|桃花|感情|异性|女友|男友|嫁|娶|情人|离婚|再婚|恋爱|对象|媒|同居|伴侣/],
  ['财富', /财|富|穷|钱|生意|投资|经商|收入|家产|遗产|经济|负债|破产|发财|家境|置业|房产|土豪|贫困|存款|赌/],
  ['六亲', /父|母|兄弟|姐妹|子女|儿|祖|家人|家庭|亲戚|手足|排行|父母|母亲|父亲|爷爷|奶奶|外公|外婆|过继|抱养|孤/],
  ['事业', /事业|工作|职|官|学业|学历|考试|读书|大学|仕途|成就|地位|名望|创业|升|老板|打工|体制|编制|军|艺术|演艺|出名/],
]
function classifyDomain(q) {
  for (const [name, re] of DOMAIN_RULES) if (re.test(q.question)) return name
  return '其他'
}
const personById = new Map(persons.map(p => [p.person_id, p]))
const allQuestions = [] // { question_id, person_id, contestYear, question, options, answer }
for (const p of persons) for (const q of p.questions) allQuestions.push({ ...q, person_id: p.person_id, contestYear: p.contestYear })
const qById = new Map(allQuestions.map(q => [q.question_id, q]))
const domainOf = new Map(allQuestions.map(q => [q.question_id, classifyDomain(q)]))

// 忠实性校验：结果文件中的 correctAnswer 必须与上游一致（独立重算，不信存储标志）
for (const g of [groupA, groupB]) {
  if (g.records.length !== 200) throw new Error(`结果文件记录数 ${g.records.length} ≠ 200（${g._meta.group}）`)
  for (const r of g.records) {
    const q = qById.get(r.question_id)
    if (!q) throw new Error(`未知 question_id: ${r.question_id}`)
    if (r.correctAnswer !== q.answer) throw new Error(`correctAnswer 与上游不一致: ${r.question_id}`)
    if (r.isCorrect !== (r.ourAnswer === q.answer)) throw new Error(`isCorrect 与重算不一致: ${r.question_id}`)
  }
}

function pct(n, d) { return d ? (n / d * 100).toFixed(2) + '%' : '—' }
function acc(records, filter) {
  const rs = records.filter(filter)
  const correct = rs.filter(r => r.isCorrect).length
  return { total: rs.length, correct, acc: pct(correct, rs.length), invalid: rs.filter(r => r.invalid).length }
}
const YEARS = [2021, 2022, 2023, 2024, 2025]
const DOMAINS = ['感情', '财富', '六亲', '事业', '健康', '其他']

const rows = []
const md = (s) => rows.push(s)

md('# BaziQA Contest8 外部准确率基准 —— 汇总报告')
md('')
md(`- 生成时间：${new Date().toISOString()}`)
md(`- 模型：${groupA._meta.model}（与官方基线 DeepSeek-Chat-v3 同款）；temperature=${groupA._meta.temperature}（固定，可复现）`)
md(`- 协议：同命主多轮连续（官方 Multi-turn 同做法）；ack 为合成固定语句；每题单次测量（官方为多次运行宏平均）`)
md(`- A 组=裸 AI（标准排盘文本）；B 组=AI＋本产品规则引擎结构化事实（旺衰/格局/喜忌/调候/大运九步判词/流年）`)
md(`- token 合计：A input=${groupA._meta.usageTotal.promptTokens} output=${groupA._meta.usageTotal.completionTokens}；B input=${groupB._meta.usageTotal.promptTokens} output=${groupB._meta.usageTotal.completionTokens}`)
md('')
md('> ★ 本任务的价值在于【知道真相】——不理想的结论照写，不美化、不选择性呈现（任务书 §6.2④）。')
md('')

// ── ① 总/分年/分维度 ──
md('## 一、总准确率（含分年、分维度）')
md('')
const totalA = acc(groupA.records, () => true)
const totalB = acc(groupB.records, () => true)
md(`| 组 | 答对/总题 | 总准确率 | 无效作答 |`)
md(`|---|---|---|---|`)
md(`| A 裸AI | ${totalA.correct}/${totalA.total} | **${totalA.acc}** | ${totalA.invalid} |`)
md(`| B AI+规则事实 | ${totalB.correct}/${totalB.total} | **${totalB.acc}** | ${totalB.invalid} |`)
md('')
md('### 分年')
md('')
md('| 年份 | A | B | Δ(B−A) |')
md('|---|---|---|---|')
for (const y of YEARS) {
  const a = acc(groupA.records, r => r.contestYear === y)
  const b = acc(groupB.records, r => r.contestYear === y)
  const dA = parseFloat(a.acc), dB = parseFloat(b.acc)
  md(`| ${y} | ${a.correct}/${a.total} = ${a.acc} | ${b.correct}/${b.total} = ${b.acc} | ${(dB - dA >= 0 ? '+' : '') + (dB - dA).toFixed(2)}pp |`)
}
md('')
md('### 分维度（★ 分类为我们自建关键词规则，数据集 categories 为空数组、官方分类脚本未开源——见可比性限制）')
md('')
md('| 维度 | A | B | Δ(B−A) |')
md('|---|---|---|---|')
for (const d of DOMAINS) {
  const a = acc(groupA.records, r => domainOf.get(r.question_id) === d)
  const b = acc(groupB.records, r => domainOf.get(r.question_id) === d)
  if (!a.total && !b.total) continue
  const dA = parseFloat(a.acc), dB = parseFloat(b.acc)
  md(`| ${d} | ${a.correct}/${a.total} = ${a.acc} | ${b.correct}/${b.total} = ${b.acc} | ${(dB - dA >= 0 ? '+' : '') + (dB - dA).toFixed(2)}pp |`)
}
md('')

// ── ② 逐题配对增益 ──
md('## 二、A vs B 逐题配对')
md('')
const recA = new Map(groupA.records.map(r => [r.question_id, r]))
const recB = new Map(groupB.records.map(r => [r.question_id, r]))
let bothRight = 0, aOnly = 0, bOnly = 0, bothWrong = 0
for (const [qid, a] of recA) {
  const b = recB.get(qid)
  if (a.isCorrect && b.isCorrect) bothRight++
  else if (a.isCorrect && !b.isCorrect) aOnly++
  else if (!a.isCorrect && b.isCorrect) bOnly++
  else bothWrong++
}
md(`两对全对 ${bothRight} ｜ 仅A对 ${aOnly} ｜ 仅B对 ${bOnly} ｜ 两对全错 ${bothWrong}`)
md('')
md(`→ 规则事实带来的净增益：${bOnly} − ${aOnly} = ${bOnly - aOnly} 题（${(bOnly - aOnly) / 2}pp）`)
md('')

// ── ③ 与官方外部基线并排 ──
md('## 三、与官方外部基线并排（任务书 §1.2 表）')
md('')
md('| 模型 | 方法 | 平均准确率 |')
md('|---|---|---|')
md('| DeepSeek-Chat-v3 | Multi-turn | 36.70% |')
md('| DeepSeek-Chat-v3 | Structured | 38.00% |')
md('| DeepSeek-R1 | Multi-turn | 34.10% |')
md('| DeepSeek-R1 | Structured | 35.00% |')
md('| GPT-5.1-Chat | Multi-turn | 32.50% |')
md('| Gemini-2.5-Flash | Multi-turn | 32.40% |')
md('| Gemini-3-Pro | Multi-turn | 32.10% |')
md(`| **我们（${groupA._meta.model}）** | **Multi-turn 裸AI（A组）** | **${totalA.acc}** |`)
md(`| **我们（${groupA._meta.model}）** | **Multi-turn ＋规则事实（B组）** | **${totalB.acc}** |`)
md('| 随机猜（4选1） | — | 25% |')
md('')
md('定位判读（任务书 §1.2）：')
md('')
{
  const vA = parseFloat(totalA.acc), vB = parseFloat(totalB.acc)
  const verdict = (v) => v > 38 ? '明显高于 38% → 规则/结构化事实有价值' : (v >= 32 ? '落在 32–38% 区间 → 与通用模型持平，「靠 AI 提准确率」空间有限' : (v < 25 ? '低于 25%（随机基线）→ 判定比随机还差，必须动摇产品假设' : '在 25–32% 区间 → 低于主流基线'))
  md(`- A 组 ${totalA.acc} → ${verdict(vA)}`)
  md(`- B 组 ${totalB.acc} → ${verdict(vB)}`)
}
md('')

// ── ④ 纯规则引擎（C 组）为何不可行（任务书 §4.3）──
md('## 四、C 组（纯规则引擎）不可行说明')
md('')
md('本产品规则引擎的输出是【结构化事实】：关系（某支冲某宫/某干被合化）、结构病（被合/被冲/被化/被夺/深藏/孤立）、判词（大运/流年 7 档、分维度 吉/平/滞）。')
md('而 Contest8 的题是【具体人生事件】——如「此命出生家境如何？（A富裕/B贫穷/C父从商母是村干部/D父母当官）」「婚姻如何？（A一婚/B二婚/C一生未嫁/D夫早亡）」。')
md('规则引擎不知道「二婚」「家境贫穷」这类事件粒度，它只知道「夫妻宫被冲」「财星深藏」。要把结构化事实映射到 A/B/C/D 选项，必须有 AI 或人工规则承担推理——这正是 B 组在测的东西。')
md('证据示例：任取一命主的规则输出（见 paipan-results.json enhancedFacts 字段），其中没有任何字段能直接对应选项文本。故 C 组【不可行】，不跑。')
md('')

// ── ⑤ 错题清单 ──
md('## 五、错误题目清单（含题干、我们选的、正确的）')
md('')
function wrongTable(group, records) {
  const wrongs = records.filter(r => !r.isCorrect)
  md(`### ${group} 组错题（共 ${wrongs.length} 题，列出至多前 30）`)
  md('')
  md('| # | question_id | 年 | 题干 | 我们选 | 正确 | 备注 |')
  md('|---|---|---|---|---|---|---|')
  wrongs.slice(0, 30).forEach((r, i) => {
    const q = qById.get(r.question_id)
    md(`| ${i + 1} | ${r.question_id} | ${r.contestYear} | ${q.question.replace(/\|/g, '／')} | ${r.ourAnswer ?? '（无效）'} | ${r.correctAnswer} | ${r.invalid ? '答案解析失败' : domainOf.get(r.question_id)} |`)
  })
  md('')
  return wrongs
}
const wrongA = wrongTable('A', groupA.records)
const wrongB = wrongTable('B', groupB.records)
md('错误模式观察（自动生成，供人工判读）：')
md('')
{
  const byDomain = {}
  for (const r of wrongA) {
    const d = domainOf.get(r.question_id)
    byDomain[d] = (byDomain[d] || 0) + 1
  }
  md(`- A 组错题的维度分布：${Object.entries(byDomain).sort((x, y) => y[1] - x[1]).map(([d, n]) => `${d} ${n}`).join('、') || '无错题'}`)
  const invalidA = groupA.records.filter(r => r.invalid).length
  const invalidB = groupB.records.filter(r => r.invalid).length
  md(`- 无效作答（未按格式输出）：A ${invalidA} 题、B ${invalidB} 题——均计错`)
}
md('')

// ── ⑥ 可比性限制（任务书 §6.2⑤）──
md('## 六、可比性限制（★ 数字不是严格同条件对比）')
md('')
md('1. **排盘引擎不同**：官方排盘结果由其外部排盘服务生成且未开源；我们用自己的 paipan 引擎（lunar-javascript＋真太阳时校正＋晚子时约定）。四柱层面已与官方公开范例交叉验证一致（1951 命主 辛卯/己亥/戊午/丁巳 完全一致；节气/纳音/长生/空亡逐字段一致），但口径差异不能排除。')
md('2. **缺字段**：我们缺 神煞（八字神煞表）、胎息、精确起运日期与交运时间；干支关系仅覆盖 冲/合（天干五合/地支六合）/刑/害，缺 暗合/破/三合全局——每个 prompt 文末有【本盘缺字段说明】，模型看不到这些信息。')
md('3. **解码参数不同**：官方未公开 temperature/runs；我们固定 temperature=0 单次测量，官方为多次运行宏平均（单次点估计的方差更大）。')
md('4. **ack 合成**：官方 multi-turn 的排盘确认轮为模型真实回复；我们用固定合成语句（确定性）。')
md('5. **维度分类为自建**：数据集 categories 字段为空数组，官方分类脚本未开源；分维度数字基于我们的关键词规则，仅供方向性参考。')
md('6. **粗粒度出生地**：「美国」（1 人，取美东为代表——美西核验四柱相同，不受影响）、「中国/中国大陆」（3 人，按 120°E 标准经线）。1982 年前马来西亚命主按 tzdata 历史 +7:30 处理（+8 平读核验四柱均相同，不受影响）。')
md('7. **2021 年数据实况**：README 称每年 8 人×5 题，实际 2021 年为 9 人（其中 2 人分别只有 3 题/2 题），总题数仍为 200。')
md('')

// ── ⑦ 时区对照与边界命主（附录）──
md('## 七、附录：place→时区对照表 与 边界命主四柱')
md('')
md('### place → { zone, lng } 对照表（手工核准，逐字面覆盖，无 fallback）')
md('')
md('| place | zone | lng | 粗粒度 | 说明 |')
md('|---|---|---|---|---|')
const seenPlace = new Set()
for (const r of paipanData.records) {
  if (seenPlace.has(r.birth.place)) continue
  seenPlace.add(r.birth.place)
  md(`| ${r.birth.place} | ${r.mapping.zone} | ${r.mapping.lng} | ${r.mapping.coarse ? '★' : ''} | ${r.mapping.note || '—'} |`)
}
md('')
md('### 边界命主四柱（23:00 换日约定；任务书 §2.2 点名的 23:34 与 0:35 在列）')
md('')
md('| person_id | 出生 | utcOffset | 真太阳偏移 | 年柱 | 月柱 | 日柱 | 时柱 |')
md('|---|---|---|---|---|---|---|---|')
for (const b of paipanData.boundaryCases) {
  md(`| ${b.person_id} | ${b.birth} | ${b.utcOffsetHoursApplied}h | ${b.timezoneOffsetApplied}min | ${b.pillars.year} | ${b.pillars.month} | ${b.pillars.day} | ${b.pillars.hour} |`)
}
md('')
md('### 敏感性核验（粗粒度地名与时制歧义）')
md('')
if (paipanData.usSensitivity) {
  md(`- 「美国」命主（${paipanData.usSensitivity.person_id}）：美东主选 ${paipanData.usSensitivity.primaryEast.pillars} ／ 美西核验 ${paipanData.usSensitivity.westCheck.pillars} → 四柱相同=${paipanData.usSensitivity.samePillars}`)
}
for (const s of paipanData.mySensitivity) {
  md(`- 马来西亚 1982 前（${s.person_id} ${s.birth}）：历史 +7:30 主选 ${s.primaryEra.pillars}（utcOff=${s.primaryEra.utcOffsetHoursApplied}h）／ +8 平读 ${s.modernPlus8Check.pillars} → 四柱相同=${s.samePillars}`)
}
md('')
md('---')
md('')
md('> 声明：本报告为【单次抽样、非确定性测量】，不构成对产品判定质量的稳定保证；结果仅用于内部评估与决策参考。')
md('> 数据许可：BaziQA（MIT）© Jiangxi Chen，见 eval/baziqa/LICENSE-MIT.txt 与 README.md 修改声明。')

writeFileSync(join(EVAL_DIR, 'report.md'), rows.join('\n') + '\n', 'utf8')
console.log(`报告已写入 ${join(EVAL_DIR, 'report.md')}`)
console.log(`A=${totalA.acc} B=${totalB.acc} ｜ A错${wrongA.length} B错${wrongB.length} ｜ 配对：仅A对${aOnly} 仅B对${bOnly}`)
