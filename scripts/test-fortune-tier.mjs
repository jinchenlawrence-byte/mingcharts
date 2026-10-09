// ★★★ 7 档判词分布断言（HANDOFF-7档吉凶判词与禁用词拆表 §五——本任务最重要产出）
// 命理的"准确率"没有 ground truth，但【分布是否合理】可度量（总纲 §8.4 分类模型的分布检验）。
// 三条断言（全部离线、纯函数）：
//   ① 死档检测：7 档每一档至少出现一次（某档恒 0 → 该档阈值不可达，判定写错了）
//   ② 滥用检测：大吉+大凶 合计占比 ≤ 阈值（事故 18=乐观档给太满；事故 19=修完乐观滑向宿命——两侧都压）
//   ③ 反向偏向检测：正向占比与负向占比之差 ≤ 阈值（红线 §8.3-③，防过度乐观↔过度宿命任一塌陷）
// ★ 阈值依据实测分布设定并留有明确余量（见下注释）；不得为通过而调阈值掩盖（§5.3），分布漂移应翻红报警
// 样本：固定确定性网格（13 个出生年 × 12 月 × 2 时辰 × 2 性别 = 624 盘 × 每盘全部大运步 + 三年流年）
import { paipan, getWangShuai, getGeJu } from '../src/lib/paipan.ts'
import { buildLuckCycles, FORTUNE_ADVICE, fortuneTierOf } from '../src/lib/analysis.ts'
import { findForbidden } from '../src/lib/ai-check.ts'

let allPass = true
const fail = (msg) => { allPass = false; console.log('  ✗ ' + msg) }

const TIERS = ['大吉', '吉', '小吉', '平', '小凶', '凶', '大凶']

// ★ 阈值（2026-10-09 步骤①补四柱覆盖后重新标定，7488 样本网格：极端档 12.18%、正负向差 30.21%）：
//   EXTREME_MAX=14%（约 1.15× 实测余量——压"大吉滥用"与"大凶宿命化"两侧漂移）
//   BIAS_MAX=35%（实测 30.21%；样本网格确定性，任何计分改动致偏向加剧超线即翻红报警）
//   ★ 步骤①补年柱/时柱覆盖后，负向占比（43.04%）仍高于正向（12.83%），
//     结构性原因：冲（−1）的无条件扣分多于合/半合助喜（+1）的条件加分。
//     步骤③将做分位校准，届时阈值会再次调整；本步为如实重新标定（非调阈值掩盖）。
const EXTREME_MAX = 0.14
const BIAS_MAX = 0.35

// —— 样本构建（确定性网格，离线纯函数；day=15 避开月界，hour=1/13 覆盖昼夜两组时辰）——
const YEARS = []
for (let y = 1950; y <= 2010; y += 5) YEARS.push(y)
const counts = Object.fromEntries(TIERS.map(t => [t, 0]))
const dyCounts = Object.fromEntries(TIERS.map(t => [t, 0]))
const lnCounts = Object.fromEntries(TIERS.map(t => [t, 0]))
let dyTotal = 0, lnTotal = 0, charts = 0
const unknownTags = []
const liuYueBad = []
for (const year of YEARS) for (let month = 1; month <= 12; month++) for (const hour of [1, 13]) for (const gender of [1, 0]) {
  const chart = paipan({ year, month, day: 15, hour, minute: 0, gender })
  chart.analysis = { wangShuai: getWangShuai(chart), geJu: getGeJu(chart), isPaid: true }
  const luck = buildLuckCycles(chart)
  charts++
  for (const d of luck.daYun) {
    if (!TIERS.includes(d.tag)) { unknownTags.push(`大运${d.ganZhi}:${d.tag}`); continue }
    counts[d.tag]++; dyCounts[d.tag]++; dyTotal++
  }
  for (const y of luck.liuNian) {
    if (!TIERS.includes(y.tag)) { unknownTags.push(`流年${y.ganZhi}:${y.tag}`); continue }
    counts[y.tag]++; lnCounts[y.tag]++; lnTotal++
  }
  // 边界守护（§4.5）：流月只用三档，7 档判词一律不得出现
  for (const m of luck.liuYue) if (!['较宜', '一般', '宜慎'].includes(m.tag)) liuYueBad.push(`${year}-${month} ${m.ganZhi}:${m.tag}`)
}
const total = dyTotal + lnTotal

// —— 真实分布表（★ 必须输出实际数字，不只打印"通过"）——
console.log(`\n=== 7 档真实分布（${charts} 盘 × 大运${dyTotal}步 + 流年${lnTotal}步 = ${total} 个样本）===`)
console.log('档位      大运    流年    合计     占比')
for (const t of TIERS) {
  console.log(`${t.padEnd(4)}    ${String(dyCounts[t]).padStart(5)}  ${String(lnCounts[t]).padStart(5)}  ${String(counts[t]).padStart(5)}   ${(counts[t] / total * 100).toFixed(2)}%`)
}
const extreme = counts['大吉'] + counts['大凶']
const pos = counts['大吉'] + counts['吉'] + counts['小吉']
const neg = counts['小凶'] + counts['凶'] + counts['大凶']
console.log(`极端档（大吉+大凶）：${extreme} 条 = ${(extreme / total * 100).toFixed(2)}%（阈值 ≤ ${(EXTREME_MAX * 100).toFixed(0)}%）`)
console.log(`正向（大吉+吉+小吉）${(pos / total * 100).toFixed(2)}% ｜ 负向（小凶+凶+大凶）${(neg / total * 100).toFixed(2)}% ｜ 差 ${(Math.abs(pos - neg) / total * 100).toFixed(2)}%（阈值 ≤ ${(BIAS_MAX * 100).toFixed(0)}%）`)

// —— ① 死档检测 ——
console.log('\n—— ① 死档检测（每档至少出现一次）——')
let deadFail = 0
for (const t of TIERS) {
  if (counts[t] < 1) { deadFail++; fail(`档位「${t}」在 ${total} 个样本中出现 0 次——阈值不可达或判定写错`) }
}
console.log(deadFail === 0 ? `✓ 死档检测：7 档全部出现（最少档位 ${Math.min(...TIERS.map(t => counts[t]))} 条）` : '✗ 存在死档')

// —— ② 滥用检测（两侧都压）——
if (extreme / total > EXTREME_MAX) { fail(`极端档占比 ${(extreme / total * 100).toFixed(2)}% 超阈值 ${(EXTREME_MAX * 100).toFixed(0)}%（大吉/大凶滥用或宿命化）`) }
console.log(extreme / total <= EXTREME_MAX ? `✓ 滥用检测：极端档 ${(extreme / total * 100).toFixed(2)}% ≤ ${(EXTREME_MAX * 100).toFixed(0)}%` : '✗ 极端档超阈值')

// —— ③ 反向偏向检测 ——
if (Math.abs(pos - neg) / total > BIAS_MAX) { fail(`正负向占比差 ${(Math.abs(pos - neg) / total * 100).toFixed(2)}% 超阈值 ${(BIAS_MAX * 100).toFixed(0)}%（过度乐观↔过度宿命塌陷）`) }
console.log(Math.abs(pos - neg) / total <= BIAS_MAX ? `✓ 偏向检测：正负向占比差 ${(Math.abs(pos - neg) / total * 100).toFixed(2)}% ≤ ${(BIAS_MAX * 100).toFixed(0)}%` : '✗ 正负向失衡')

// —— ④ 越界守护：tag 全部落在 7 档集合；流月只用三档 ——
console.log('\n—— ④ 边界守护 ——')
if (unknownTags.length) { fail(`大运/流年 tag 越界 ${unknownTags.length} 处：${unknownTags.slice(0, 3).join('、')}`) }
if (liuYueBad.length) { fail(`流月出现三档外标签 ${liuYueBad.length} 处：${liuYueBad.slice(0, 3).join('、')}`) }
console.log(!unknownTags.length && !liuYueBad.length ? '✓ 边界守护：大运/流年 tag 全在 7 档集合内；流月全用 较宜/一般/宜慎 三档' : '✗ 边界被突破')

// —— ⑤ 元断言（§6.1）：7 句判词建议语逐句过 findForbidden → 0 命中 ——
//   守护"放开了 A 类，但没有顺手把 B/C 也放进来"
console.log('\n—— ⑤ 判词语合规（7 句 × findForbidden，打命中数）——')
let adviceHits = 0
for (const t of TIERS) {
  const { hits } = findForbidden(FORTUNE_ADVICE[t])
  adviceHits += hits.length
  if (hits.length) fail(`判词「${t}」含禁用词：${hits.map(h => h.w).join('、')}（句：${FORTUNE_ADVICE[t]}）`)
}
console.log(adviceHits === 0 ? `✓ 判词语合规：7 句逐句过 findForbidden，命中数 ${adviceHits}` : '✗ 判词语含禁用词')

// —— ⑥ fortuneTierOf 逐点映射（真调生产函数；§5.2 三条牙口的精确落点）——
//   分布断言是统计性守护（阈值有余量），本组逐点钉死：cap 三级（事故 18 纪律）+ 每个分档阈值点
console.log('\n—— ⑥ fortuneTierOf 逐点映射（真调生产函数）——')
const TIER_CASES = [
  [4, [], '大吉'], [3, [], '大吉'],                 // s>=3 → 大吉
  [2, [], '吉'], [1, [], '小吉'],                    // s=2吉 / s=1小吉
  [0, [], '平'], [-1, [], '平'],                     // s=0,-1 → 平（中位区）
  [-2, [], '小凶'], [-3, [], '凶'], [-4, [], '大凶'], [-5, [], '大凶'],
  [4, ['被合'], '吉'],                              // 1 个结构病 cap=2 → s=2 → 吉
  [4, ['被合', '被冲'], '小吉'],                    // ≥2 个结构病 cap=1（方案 ii）→ s=1 → 小吉
  [-5, ['被合', '被冲'], '大凶'],                   // 反向不设 floor
]
let mapFail = 0
for (const [score, issues, want] of TIER_CASES) {
  const got = fortuneTierOf(score, issues)
  if (got !== want) { mapFail++; fail(`fortuneTierOf(${score}, ${issues.length}个结构病) = 「${got}」，期望「${want}」`) }
}
console.log(mapFail === 0 ? `✓ 逐点映射：${TIER_CASES.length} 个边界点全中（含 cap 三级与反向无 floor）` : '✗ 逐点映射断言失败')

// —— ⑦ 断言 A + B：cap 的【档位语义】守护（HANDOFF-判词封顶分级 §二-2.2，本任务最重要产出）——
//   上一轮「注释说最高小吉、代码却给吉」之所以没被发现，根因就是没有任何断言守护 cap 对应的档位上限。
//   score=99（极高）使 cap 成为唯一约束——否则测的是分数而不是 cap。
//   ★ 断言 A（上限）：0 病→可达大吉；1 病→≤吉；≥2 病→≤小吉（用精确值钉死，强于 ≤：cap 抬高/压低都翻红）
//   ★ 断言 B（可达性，不可省）：0 病 + 高 score【确实能】拿大吉——只测上限不测可达性，大吉永不可达也测不出
console.log('\n—— ⑦ 断言 A/B：cap 档位语义（上限＋可达性，score=99 使 cap 成唯一约束）——')
const tierRank = { '大吉': 7, '吉': 6, '小吉': 5, '平': 4, '小凶': 3, '凶': 2, '大凶': 1 }
let capFail = 0
const CAP_CASES = [
  // [score, issues, 精确期望, 上限语义]
  [99, [], '大吉', '0 病 → 可达「大吉」（断言 A 上限 + 断言 B 可达性）'],
  [99, ['被合'], '吉', '1 病 → ≤「吉」（cap=2）'],
  [99, ['被合', '被冲'], '小吉', '≥2 病 → ≤「小吉」（cap=1，方案 ii）'],
  [99, ['被合', '被冲', '伏吟'], '小吉', '3 病 → ≤「小吉」（cap=1）'],
]
for (const [score, issues, want, desc] of CAP_CASES) {
  const got = fortuneTierOf(score, issues)
  if (got !== want) { capFail++; fail(`cap 语义：fortuneTierOf(${score}, ${issues.length}病) = 「${got}」，期望「${want}」（${desc}）`) }
}
// 断言 B 显式可达性（独立成句，语义醒目）：存在某个 score 使 0 病拿到大吉
if (tierRank[fortuneTierOf(99, [])] !== tierRank['大吉']) { capFail++; fail('断言 B 可达性：0 病 + 高 score 未能拿到「大吉」——大吉形同虚设') }
console.log(capFail === 0
  ? `✓ cap 档位语义：${CAP_CASES.length} 点全中（0病→大吉可达 / 1病→最高吉 / ≥2病→最高小吉）`
  : '✗ cap 档位语义断言失败')

console.log('\n' + (allPass ? 'FORTUNE_TIER_PASS' : 'FORTUNE_TIER_FAIL'))
if (!allPass) process.exit(1)
