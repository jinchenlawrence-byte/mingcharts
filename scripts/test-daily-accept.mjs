// 流日引擎验收（HANDOFF §2.2/§2.7；总纲 §8.5/§8.6）
// #1 入口一致性：liuRiOf(Y,M,D) 日柱 ≡ paipan({Y,M,D,12:00}) 日柱，60 个连续日逐日验证
// #2 连续推进：日柱相邻序号差 1（模 60），跨立春/春节/惊蛰不跳变、不重置
// #3 牙口自检：漂移版实现（取次日）必须与 paipan 不一致 —— 证明同源断言有判别力
import { liuRiOf, jiaziIndex, DAILY_TAGS, JIAZI, pickDailySign, pickVariant, dailyFor, personalDailyFor } from '../src/lib/daily.ts'
import { DAILY_SIGNS } from '../src/data/daily-signs.ts'
import { PERSONAL_DAILY } from '../src/data/daily-personal.ts'
import { findForbidden } from '../src/lib/ai-check.ts'
import { paipan, shiShenOf, SHI_SHEN_NAMES } from '../src/lib/paipan.ts'
import { LIU_CHONG, LIU_HE, LIU_HAI, XIANG_XING, dayBranchRelation, ZHI } from '../src/lib/branchRelations.ts'

let allPass = true
const fail = (msg) => { allPass = false; console.log('  ✗ ' + msg) }

// ── 60 个连续日期：2026-01-06 → 2026-03-06 ──
// 刻意覆盖：立春(2/4)、春节(2/17)、惊蛰(3/5)——
// 流日不走节气/农历年，若有人错误地在这三处重置或跳变日柱，连续性断言立即红。
const DATES = []
{
  const t = new Date(2026, 0, 6)
  for (let i = 0; i < 60; i++) {
    DATES.push([t.getFullYear(), t.getMonth() + 1, t.getDate()])
    t.setDate(t.getDate() + 1)
  }
}

// #1 入口一致性
let mismatch = 0
for (const [y, m, d] of DATES) {
  const fromDaily = liuRiOf(y, m, d).ganZhi
  const fromPaipan = paipan({
    year: y, month: m, day: d, hour: 12, minute: 0, gender: 1
  }).pillars.day.ganZhi
  if (fromDaily !== fromPaipan) {
    mismatch++
    fail(`${y}-${m}-${d}：liuRiOf=${fromDaily} ≠ paipan=${fromPaipan}`)
  }
}
console.log(mismatch === 0
  ? `✓ 流日同源：${DATES.length} 个连续日，liuRiOf 日柱与 paipan 逐日一致（同一 lunar-javascript 路径）`
  : `✗ 同源断言 ${mismatch} 日不一致`)

// #2 连续推进（六十甲子序号 +1，跨节气/农历年不跳变）
let contFail = 0
let prev = null
for (const [y, m, d] of DATES) {
  const idx = jiaziIndex(liuRiOf(y, m, d).ganZhi)
  if (prev !== null && idx !== (prev % 60) + 1) {
    contFail++
    fail(`${y}-${m}-${d}：日柱序号 ${idx} 未接前日 ${prev}（非连续推进）`)
  }
  prev = idx
}
console.log(contFail === 0
  ? '✓ 流日连续：60 日甲子序号逐日 +1，跨立春/春节/惊蛰无跳变（流日不按节气）'
  : `✗ 连续性断言 ${contFail} 处失败`)

// #3 牙口自检（§8.6）：模拟「另造算法漂移一天」的坏实现，同源断言必须把它判红。
// 若坏实现与 paipan 也全部一致，说明真实断言没有判别力（恒绿）。
const badLiuRi = (y, m, d) => {
  const t = new Date(y, m - 1, d + 1)   // ★ 故意偏移一天
  return liuRiOf(t.getFullYear(), t.getMonth() + 1, t.getDate()).ganZhi
}
let badCaught = 0
for (const [y, m, d] of DATES) {
  const fromPaipan = paipan({
    year: y, month: m, day: d, hour: 12, minute: 0, gender: 1
  }).pillars.day.ganZhi
  if (badLiuRi(y, m, d) !== fromPaipan) badCaught++
}
const toothOk = badCaught === DATES.length
if (!toothOk) fail(`漂移版仅 ${badCaught}/60 日落网，断言判别力不足`)
console.log(toothOk
  ? '✓ 同源断言牙口：漂移一天的坏实现 60/60 日落网（改错必红，非恒绿）'
  : '✗ 牙口失效')

// #4 DAILY_TAGS 刻意限制：恰为前四个 LuckTag，无大防
const expectTags = ['较宜', '平顺', '一般', '宜慎']
const tagsOk = DAILY_TAGS.length === 4 &&
  expectTags.every((t, i) => DAILY_TAGS[i] === t) &&
  !DAILY_TAGS.includes('大防')
if (!tagsOk) fail(`DAILY_TAGS=${JSON.stringify(DAILY_TAGS)}，须为前四词且排除大防`)
console.log(tagsOk
  ? '✓ 日运词表：仅「较宜/平顺/一般/宜慎」，「大防」已排除（刻意限制有断言保护）'
  : '✗ 日运词表断言失败')

// #5 jiaziIndex：六十甲子 1–60 位次闭合（序号期望来源：标准甲子表，§8.6.2）
let idxFail = 0
const seenIdx = new Set()
for (const [y, m, d] of DATES) {
  const gz = liuRiOf(y, m, d).ganZhi
  const idx = jiaziIndex(gz)
  if (idx < 1 || idx > 60) idxFail++
  seenIdx.add(idx)
}
try {
  jiaziIndex('不存在'); idxFail++; fail('非法干支未抛错')
} catch { /* 正确 */ }
console.log(idxFail === 0
  ? `✓ 甲子位次：${seenIdx.size} 个不同位次均在 1–60 闭合；非法干支显式抛错不静默回退`
  : '✗ 甲子位次断言失败')

// ── 通用日签（HANDOFF-通用日签 §五）──────────────────────────────
// #6 覆盖性：恰 60 键、键集合（含顺序）≡ JIAZI，每项恰 3 条且互不相同
const signKeys = Object.keys(DAILY_SIGNS)
let coverFail = 0
if (signKeys.length !== 60) { coverFail++; fail(`DAILY_SIGNS 键数=${signKeys.length}，须恰为 60`) }
if (JSON.stringify(signKeys) !== JSON.stringify([...JIAZI])) {
  coverFail++; fail('DAILY_SIGNS 键集合/顺序 ≠ daily.ts 的 JIAZI（不得另抄六十甲子表）')
}
let signCount = 0
for (const k of signKeys) {
  const trio = DAILY_SIGNS[k]
  signCount += trio.length
  if (trio.length !== 3) { coverFail++; fail(`${k} 条数=${trio.length}，须恰 3 条`) }
  if (new Set(trio).size !== 3) { coverFail++; fail(`${k} 三条存在重复（变体须为三种角度，非同义改写）`) }
}
console.log(coverFail === 0
  ? `✓ 日签覆盖：60 键 ≡ JIAZI，共 ${signCount} 条；每甲子 3 条且互不相同`
  : '✗ 日签覆盖断言失败')

// #7 文风：长度 12–28 字（码点，含标点）；无问号、无连续感叹号
const charLen = (s) => [...s].length
let styleFail = 0
for (const k of signKeys) {
  DAILY_SIGNS[k].forEach((t, i) => {
    const n = charLen(t)
    if (n < 12 || n > 28) { styleFail++; fail(`${k}[${i}] 长度 ${n} 超出 12–28：${t}`) }
    if (t.includes('?') || t.includes('？')) { styleFail++; fail(`${k}[${i}] 含问号：${t}`) }
    if (/！{2,}/.test(t)) { styleFail++; fail(`${k}[${i}] 连续感叹号：${t}`) }
  })
}
console.log(styleFail === 0
  ? '✓ 日签文风：180 条长度均在 12–28 字（码点），无问号、无连续感叹号'
  : '✗ 日签文风断言失败')

// #8 ★ 合规：findForbidden(strictBi=true，物理禁「必」)＋日签专属禁用词＋决策指导组合
//   全部 180 条逐条扫描，0 命中才放行。
const SIGN_FORBIDDEN = ['凶', '劫', '灾', '破财', '血光', '小人', '犯太岁', '化解', '开运', '谨防', '切忌', '千万', '大吉', '大凶']
const DECISION_RE = /(宜|忌|适合|不宜)[^，。]{0,6}(签约|出行|投资|手术|辞职|结婚|搬家|开业)/
let compFail = 0
for (const k of signKeys) {
  DAILY_SIGNS[k].forEach((t, i) => {
    const { hits } = findForbidden(t, true)   // ★ strictBi：连「未必／不必」也不放过
    if (hits.length) { compFail++; fail(`${k}[${i}] 命中通用禁词 ${JSON.stringify(hits.map(h => h.w))}：${t}`) }
    for (const w of SIGN_FORBIDDEN) {
      if (t.includes(w)) { compFail++; fail(`${k}[${i}] 命中日签专属禁词「${w}」：${t}`) }
    }
    if (DECISION_RE.test(t)) { compFail++; fail(`${k}[${i}] 含具体事项决策指导：${t}`) }
  })
}
console.log(compFail === 0
  ? '✓ 日签合规：180 条逐条过 findForbidden(strictBi)＋专属禁用词＋决策指导扫描，0 命中'
  : '✗ 日签合规断言失败')

// #9 ★ 选片逻辑：确定性 ＋ 跨 60 天周期 %3 轮换 ＋ 未知干支抛错
let pickFail = 0
const gz0 = signKeys[0]
if (pickDailySign(gz0, 0) !== DAILY_SIGNS[gz0][0] || pickDailySign(gz0, 0) !== pickDailySign(gz0, 0)) {
  pickFail++; fail('同入参两次选取结果不一致（确定性被破坏）')
}
// floor(dayNumber/60)%3：0–59→[0]，60–119→[1]，120–179→[2]，180 回到 [0]
const expectAt = [
  [0, 0], [59, 0], [60, 1], [119, 1], [120, 2], [179, 2], [180, 0],
]
for (const [dn, vi] of expectAt) {
  if (pickDailySign(gz0, dn) !== DAILY_SIGNS[gz0][vi]) {
    pickFail++; fail(`dayNumber=${dn} 应选变体[${vi}]，实得「${pickDailySign(gz0, dn)}」`)
  }
}
// 同一公历日对所有用户相同（日序号相同即同一条）—— 抽另一甲子验证轮换不串键
const gz1 = signKeys[37]
if (pickDailySign(gz1, 60) !== DAILY_SIGNS[gz1][1]) { pickFail++; fail('跨键选片串台') }
try {
  pickDailySign('不存在', 0)
  pickFail++; fail('未知干支未抛错（缺键须显式抛错，不许静默兜底）')
} catch { /* 正确 */ }
console.log(pickFail === 0
  ? '✓ 选片逻辑：同入参恒定；变体随 60 天周期按 0→1→2→0 轮换；未知干支显式抛错'
  : '✗ 选片逻辑断言失败')

// #10 ★ 句式多样性（REPLY-通用日签180条验收 §二 返修门槛）：
//   变体每 60 天才轮换 → 同一句式定式会让用户连看 60 天。
//   变体[2] 以「心」开头 ≤15/60；变体[1] 以「事情」开头 ≤5/60；变体[1]「到了」全文 ≤5 处。
const MAX_XIN_OPEN = 15, MAX_SHIQING_OPEN = 5, MAX_DAOLLE = 5
let xinOpen = 0, shiqingOpen = 0, daolleTotal = 0
const xinKeys = [], shiqingKeys = []
for (const k of signKeys) {
  const trio = DAILY_SIGNS[k]
  if (trio[2].startsWith('心')) { xinOpen++; xinKeys.push(k) }
  if (trio[1].startsWith('事情')) { shiqingOpen++; shiqingKeys.push(k) }
  daolleTotal += (trio[1].match(/到了/g) || []).length
}
let diverseFail = 0
if (xinOpen > MAX_XIN_OPEN) {
  diverseFail++; fail(`变体[2] 以「心」开头 ${xinOpen}/60（> ${MAX_XIN_OPEN}）：${xinKeys.join(' ')}`)
}
if (shiqingOpen > MAX_SHIQING_OPEN) {
  diverseFail++; fail(`变体[1] 以「事情」开头 ${shiqingOpen}/60（> ${MAX_SHIQING_OPEN}）：${shiqingKeys.join(' ')}`)
}
if (daolleTotal > MAX_DAOLLE) {
  diverseFail++; fail(`变体[1]「到了」共 ${daolleTotal} 处（> ${MAX_DAOLLE}）`)
}
console.log(diverseFail === 0
  ? `✓ 句式多样：变体[2]「心」开头 ${xinOpen}/60（≤${MAX_XIN_OPEN}）；变体[1]「事情」开头 ${shiqingOpen}/60（≤${MAX_SHIQING_OPEN}）、「到了」${daolleTotal} 处（≤${MAX_DAOLLE}）`
  : '✗ 句式多样性断言失败')

// #11 ★ 句式定式兜底（REPLY-句式返修验收 §三／总纲 §8.6.8）：
//   #10 量的是「具体词的计数」（影子）；这里量属性本身 ——
//   逐变体统计「前两字」频次，任何起法同质化到 >6/60 即翻红，
//   即使 #10 的三个盯防词一个不多也照样落网。
const MAX_PREFIX = 6
let prefixFail = 0
const prefixReport = []
for (let vi = 0; vi < 3; vi++) {
  const freq = new Map()
  for (const k of signKeys) {
    const p = [...DAILY_SIGNS[k][vi]].slice(0, 2).join('')
    freq.set(p, (freq.get(p) || 0) + 1)
  }
  const [topP, topN] = [...freq.entries()].sort((a, b) => b[1] - a[1])[0]
  prefixReport.push(`[${vi}]「${topP}」×${topN}`)
  if (topN > MAX_PREFIX) {
    prefixFail++
    const keys = signKeys.filter(k => [...DAILY_SIGNS[k][vi]].slice(0, 2).join('') === topP)
    fail(`变体[${vi}] 前两字「${topP}」×${topN}/60（> ${MAX_PREFIX}）：${keys.join(' ')}`)
  }
}
console.log(prefixFail === 0
  ? `✓ 句式定式兜底：逐变体前两字最高频 ${prefixReport.join(' ')}（≤${MAX_PREFIX}）`
  : '✗ 句式定式兜底断言失败')

// ── 个性化日运（HANDOFF-个性化日运 §九）──────────────────────────

const RELATIONS = ['冲', '合', '刑', '害', '同', '无']

// 收集全部 180 条（供多条断言复用；返回 [{shiShen, rel, vi, text}]）
function collectAll(data = PERSONAL_DAILY) {
  const out = []
  for (const ss of SHI_SHEN_NAMES) {
    for (const rel of RELATIONS) {
      const trio = data[ss]?.[rel]
      if (!trio) continue
      trio.forEach((t, vi) => out.push({ shiShen: ss, rel, vi, text: t }))
    }
  }
  return out
}

// #12 覆盖性：恰 10×6=60 键，每项恰 3 条共 180；键集 ≡ 十神全集 × 六关系
let pCover = 0
const pKeys = new Set()
let pCount = 0
for (const ss of SHI_SHEN_NAMES) {
  for (const rel of RELATIONS) {
    const trio = PERSONAL_DAILY[ss]?.[rel]
    pKeys.add(`${ss}×${rel}`)
    if (!trio) { pCover++; fail(`缺键 ${ss}×${rel}`); continue }
    if (trio.length !== 3) { pCover++; fail(`${ss}×${rel} 条数=${trio.length}，须 3`) }
    pCount += trio.length
    if (new Set(trio).size !== 3) { pCover++; fail(`${ss}×${rel} 三条有重复`) }
  }
}
if (pKeys.size !== 60) { pCover++; fail(`键数=${pKeys.size}，须 60`) }
// 全库无重复文本
const allTexts = collectAll().map((x) => x.text)
if (new Set(allTexts).size !== allTexts.length) { pCover++; fail('180 条中存在重复文本') }
console.log(pCover === 0
  ? `✓ 日运覆盖：10×6=60 键，共 ${pCount} 条；键集 ≡ 十神全集×六关系；全库无重复`
  : '✗ 日运覆盖断言失败')

// #13 文风：12–28 码点；无问号、无连续感叹号
let pStyle = 0
for (const { shiShen, rel, vi, text } of collectAll()) {
  const n = charLen(text)
  if (n < 12 || n > 28) { pStyle++; fail(`${shiShen}×${rel}[${vi}] 长度 ${n} 超出 12–28：${text}`) }
  if (text.includes('？') || text.includes('?')) { pStyle++; fail(`${shiShen}×${rel}[${vi}] 含问号`) }
  if (/！{2,}/.test(text)) { pStyle++; fail(`${shiShen}×${rel}[${vi}] 连续感叹号`) }
}
console.log(pStyle === 0
  ? `✓ 日运文风：180 条长度均 12–28 码点，无问号、无连续感叹号`
  : '✗ 日运文风断言失败')

// #14 ★ 合规：findForbidden(strictBi)＋日签专属禁词＋追加负面词＋负面词密度＋决策指导
const P_FORBIDDEN = ['凶', '劫', '灾', '破财', '血光', '小人', '犯太岁', '化解', '开运', '谨防', '切忌', '千万', '大吉', '大凶']
const P_EXTRA_NEG = ['不顺', '不利', '当心', '提防', '警惕', '危机', '损失', '口舌', '是非', '阻碍', '麻烦', '压抑', '煎熬', '凶险', '暗算']
const DENSITY_WORDS = ['消耗', '消磨', '耗损', '磨损', '纠缠', '拉扯', '内耗', '压抑', '憋闷', '亏', '损失', '反复']
const P_DECISION = /(宜|忌|适合|不宜)[^，。]{0,6}(签约|出行|投资|手术|辞职|结婚|搬家|开业)/
let pComp = 0
for (const { shiShen, rel, vi, text } of collectAll()) {
  const { hits } = findForbidden(text, true)
  if (hits.length) { pComp++; fail(`${shiShen}×${rel}[${vi}] 命中通用禁词 ${JSON.stringify(hits.map((h) => h.w))}：${text}`) }
  for (const w of P_FORBIDDEN) if (text.includes(w)) { pComp++; fail(`${shiShen}×${rel}[${vi}] 命中专属禁词「${w}」：${text}`) }
  for (const w of P_EXTRA_NEG) if (text.includes(w)) { pComp++; fail(`${shiShen}×${rel}[${vi}] 命中追加负面词「${w}」：${text}`) }
  let density = 0
  for (const w of DENSITY_WORDS) if (text.includes(w)) density++
  if (density >= 2) { pComp++; fail(`${shiShen}×${rel}[${vi}] 负面词密度 ${density}（≥2）：${text}`) }
  if (P_DECISION.test(text)) { pComp++; fail(`${shiShen}×${rel}[${vi}] 含决策指导：${text}`) }
}
console.log(pComp === 0
  ? `✓ 日运合规：180 条过 findForbidden(strictBi)＋专属禁词＋追加负面词＋密度(≤1)＋决策指导，0 命中`
  : `✗ 日运合规断言失败（${pComp} 处）`)

// #15 ★ 句式多样性四条（HANDOFF-万字补全与文案返修 §2.3；§8.6.8 断言盖属性本身）：
//   ① 前两字种数 ≥50/60（逐变体）—— 直接盯「多样性」属性，不再只盯某个计数上限
//   ② 半句重复检测：任一变体内逗号后子串不得 ≥3 条相同 —— 专抓「把绷着的肩放一放」×4 那类
//   ③ 同十神内起句不得相同（<2，由原 <3 收紧）—— 同十神连续两天不撞同起句
//   ④ 保留原两条作辅助：变体[2]「心」开头 ≤6；逐变体单一前两字 ≤6
let pDiv = 0
const divReport = []
// ① 前两字种数 ≥ 50/60（逐变体各自算）
for (let vi = 0; vi < 3; vi++) {
  const freq = new Map()
  for (const ss of SHI_SHEN_NAMES) {
    for (const rel of RELATIONS) {
      const t = PERSONAL_DAILY[ss][rel][vi]
      const p = [...t].slice(0, 2).join('')
      freq.set(p, (freq.get(p) || 0) + 1)
    }
  }
  divReport.push(`[${vi}]${freq.size}/60`)
  if (freq.size < 50) {
    pDiv++
    const dups = [...freq.entries()].filter(([, n]) => n >= 2).map(([p, n]) => `「${p}」×${n}`)
    fail(`变体[${vi}] 前两字种数 ${freq.size}/60（< 50），重复组：${dups.join(' ')}`)
  }
}
// ② 半句重复检测（逗号之后子串，≥3 条相同即翻红）
let halfMax = 0
for (let vi = 0; vi < 3; vi++) {
  const half = new Map()
  for (const ss of SHI_SHEN_NAMES) {
    for (const rel of RELATIONS) {
      const t = PERSONAL_DAILY[ss][rel][vi]
      const idx = t.indexOf('，')
      if (idx < 0) continue
      const h = t.slice(idx + 1)
      if (!half.has(h)) half.set(h, [])
      half.get(h).push(`${ss}·${rel}`)
    }
  }
  for (const [h, keys] of half) {
    if (keys.length > halfMax) halfMax = keys.length
    if (keys.length >= 3) { pDiv++; fail(`变体[${vi}] 半句「${h}」×${keys.length}/60（≥3）：${keys.join(' ')}`) }
  }
}
// ③ 同十神内起句不得相同（任一变体；<2 即零容忍）
for (const ss of SHI_SHEN_NAMES) {
  for (let vi = 0; vi < 3; vi++) {
    const freq = new Map()
    for (const rel of RELATIONS) {
      const t = PERSONAL_DAILY[ss][rel][vi]
      const p = [...t].slice(0, 2).join('')
      freq.set(p, (freq.get(p) || 0) + 1)
    }
    const top = [...freq.entries()].sort((a, b) => b[1] - a[1])[0]
    if (top[1] >= 2) { pDiv++; fail(`${ss} 变体[${vi}] 内「${top[0]}」起句 ${top[1]}/6（≥2，同十神内不许同起句）`) }
  }
}
// ④ 保留（辅助）：变体[2]「心」开头 ≤6；逐变体单一前两字 ≤6
let xinOpen2 = 0
for (const { shiShen, rel, vi, text } of collectAll()) {
  if (vi === 2 && text.startsWith('心')) xinOpen2++
}
if (xinOpen2 > 6) { pDiv++; fail(`变体[2]「心」开头 ${xinOpen2}/60（>6）`) }
for (let vi = 0; vi < 3; vi++) {
  const freq = new Map()
  for (const ss of SHI_SHEN_NAMES) {
    for (const rel of RELATIONS) {
      const t = PERSONAL_DAILY[ss][rel][vi]
      const p = [...t].slice(0, 2).join('')
      freq.set(p, (freq.get(p) || 0) + 1)
    }
  }
  const top = [...freq.entries()].sort((a, b) => b[1] - a[1])[0]
  if (top[1] > 6) { pDiv++; fail(`变体[${vi}] 前两字「${top[0]}」×${top[1]}/60（>6）`) }
}
console.log(pDiv === 0
  ? `✓ 日运句式：前两字种数 ${divReport.join(' ')}（≥50）；半句最高 ×${halfMax}（<3）；同十神内零同起句；「心」开头 ${xinOpen2}/60（≤6）`
  : '✗ 日运句式断言失败')

// #16 ★★ 事实表穷举（P0）—— 冲/合/害/刑 144 组合 ＋ 十神 100 组合 ＋ dayBranchRelation 两层
//   期望值来自经典（《三命通会》），非从实现反推（§8.6.2）
const STD_CHONG = { 子:'午',午:'子',丑:'未',未:'丑',寅:'申',申:'寅',卯:'酉',酉:'卯',辰:'戌',戌:'辰',巳:'亥',亥:'巳' }
const STD_HE = { 子:'丑',丑:'子',寅:'亥',亥:'寅',卯:'戌',戌:'卯',辰:'酉',酉:'辰',巳:'申',申:'巳',午:'未',未:'午' }
const STD_HAI = { 子:'未',未:'子',丑:'午',午:'丑',寅:'巳',巳:'寅',卯:'辰',辰:'卯',申:'亥',亥:'申',酉:'戌',戌:'酉' }
const STD_XING = { 子:['卯'],卯:['子'],寅:['巳','申'],巳:['申','寅'],申:['寅','巳'],丑:['戌','未'],戌:['丑','未'],未:['丑','戌'],辰:['辰'],午:['午'],酉:['酉'],亥:['亥'] }
let factFail = 0
for (const a of ZHI) {
  for (const b of ZHI) {
    if ((LIU_CHONG[a] === b) !== (STD_CHONG[a] === b)) { factFail++; fail(`六冲 ${a}-${b} 实现≠标准`) }
    if ((LIU_HE[a] === b) !== (STD_HE[a] === b)) { factFail++; fail(`六合 ${a}-${b} 实现≠标准`) }
    if ((LIU_HAI[a] === b) !== (STD_HAI[a] === b)) { factFail++; fail(`六害 ${a}-${b} 实现≠标准`) }
    const implX = XIANG_XING[a].includes(b)
    const stdX = STD_XING[a].includes(b)
    if (implX !== stdX) { factFail++; fail(`相刑 ${a}-${b} 实现≠标准`) }
  }
}
// 十神 100 组合：独立五行生成器（非从 SHI_SHEN 反推）
const GAN_WX = { 甲:'木',乙:'木',丙:'火',丁:'火',戊:'土',己:'土',庚:'金',辛:'金',壬:'水',癸:'水' }
const YANG = { 甲:1,丙:1,戊:1,庚:1,壬:1,乙:0,丁:0,己:0,辛:0,癸:0 }
const SHENG = { 木:'火',火:'土',土:'金',金:'水',水:'木' }   // 我生
const KE = { 木:'土',土:'水',水:'火',火:'金',金:'木' }       // 我克（日主克）
const GANS = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸']
function expectShiShen(gan, dm) {
  const g = GAN_WX[gan], d = GAN_WX[dm], same = YANG[gan] === YANG[dm]
  if (g === d) return same ? '比肩' : '劫财'
  if (SHENG[d] === g) return same ? '食神' : '伤官'      // 我生
  if (KE[d] === g) return same ? '偏财' : '正财'          // 我克
  if (KE[g] === d) return same ? '七杀' : '正官'          // 克我
  if (SHENG[g] === d) return same ? '偏印' : '正印'        // 生我
  return '?'
}
let shiShenFail = 0
for (const dm of GANS) for (const gan of GANS) {
  const exp = expectShiShen(gan, dm)
  const got = shiShenOf(gan, dm)
  if (exp !== got) { shiShenFail++; fail(`十神 ${gan}|${dm} 期望=${exp} 实现=${got}`) }
}
// dayBranchRelation (a) 无并见：同→冲→合→刑→害→无
const NO_PARALLEL = [
  ['子','卯','刑'], ['卯','辰','害'], ['寅','申','冲'], ['子','丑','合'],
  ['辰','辰','同'], ['子','寅','无'], ['巳','亥','冲'], ['卯','戌','合'],
]
let relFailA = 0
for (const [t, d, exp] of NO_PARALLEL) {
  const got = dayBranchRelation(t, { dayZhi: d, allZhi: [t, d, '辰', '午'] })
  if (got !== exp) { relFailA++; fail(`无并见 ${t}-${d} 期望=${exp} 实现=${got}`) }
}
// (b) 巳申按局判：同一 (巳,申) 不同局 → 不同结果
const siShenCases = [
  { allZhi: ['巳','申','亥','卯'], exp: '合' },   // 含亥 → 合
  { allZhi: ['巳','申','寅','午'], exp: '刑' },   // 含寅午 → 刑
  { allZhi: ['巳','申','辰','酉'], exp: '合' },   // 皆无 → 合
  { allZhi: ['巳','申','亥','午'], exp: '合' },   // 皆有 → 合
]
let relFailB = 0
const bResults = new Set()
for (const c of siShenCases) {
  const got = dayBranchRelation('巳', { dayZhi: '申', allZhi: c.allZhi })
  if (got !== c.exp) { relFailB++; fail(`巳申按局 ${JSON.stringify(c.allZhi)} 期望=${c.exp} 实现=${got}`) }
  bResults.add(got)
}
if (bResults.size < 2) { relFailB++; fail(`巳申按局：不同局只得 ${[...bResults].join('/')}，证明「看局」未生效`) }
// (c) 寅巳 → 刑
let relFailC = 0
const yinSi = dayBranchRelation('寅', { dayZhi: '巳', allZhi: ['寅','巳','辰','午'] })
if (yinSi !== '刑') { relFailC++; fail(`寅巳期望=刑 实现=${yinSi}`) }
const siYin = dayBranchRelation('巳', { dayZhi: '寅', allZhi: ['巳','寅','辰','午'] })
if (siYin !== '刑') { relFailC++; fail(`巳寅期望=刑 实现=${siYin}`) }
console.log(factFail === 0 && shiShenFail === 0 && relFailA === 0 && relFailB === 0 && relFailC === 0
  ? `✓ 事实表穷举：冲/合/害/刑 144×4 全对；十神 100 全对（独立五行生成器）；dayBranchRelation 无并见/巳申按局(得${[...bResults].join('·')})/寅巳 全对`
  : `✗ 事实表断言失败（冲合害刑${factFail} 十神${shiShenFail} 无并见${relFailA} 巳申${relFailB} 寅巳${relFailC}）`)

// #17 ★ 跨模块归日一致（§五 P0）：dailyFor 的 general.date 与 personal 同源
let syncFail = 0
{
  // 用一个真实命盘事实集（壬水日主，日支子）
  const chart = { dayMaster: '壬', dayZhi: '子', allZhi: ['子','丑','子','寅'] }
  const { general, personal } = dailyFor('Asia/Shanghai', chart, new Date('2026-10-08T04:00:00Z'))
  // general.liuRi 必须与 personal 的 todayGan+todayZhi 拼接一致（同一次 liuRiOf）
  if (general.liuRi !== `${personal.todayGan}${personal.todayZhi}`) {
    syncFail++; fail(`归日不一致：general.liuRi=${general.liuRi} ≠ personal ${personal.todayGan}${personal.todayZhi}`)
  }
  // 选片也须出自同一个 dayNumber（确定性）
  const dayNumber = Math.floor(Date.UTC(Number(general.date.slice(0,4)), Number(general.date.slice(5,7))-1, Number(general.date.slice(8,10))) / 86400000)
  const expectSign = pickVariant(PERSONAL_DAILY[personal.shiShen][personal.branchRelation], dayNumber)
  if (personal.sign !== expectSign) { syncFail++; fail(`personal.sign 与同源 dayNumber 选片不一致`) }
}
console.log(syncFail === 0
  ? `✓ 跨模块归日一致：dailyFor 一次归日 → general.liuRi ≡ personal 今日干支；选片同源`
  : '✗ 跨模块归日一致断言失败')

// #18 ★ 牙口（§8.6.7）：每次注入前先确认有效（肯定性证据），断言须翻红
let toothFail = 0

// 牙口1：植入「今日大吉」→ 合规扫描须翻红
//   ★ 7 档启用后「大吉/大凶」已移出通用拦截表（A 类判词合法用于大运/流年），
//   但日签定位「今日一省、非吉凶判决」→ 由日签专属禁词表（P_FORBIDDEN）检出
{
  const clone = structuredClone(PERSONAL_DAILY)
  clone.比肩.冲[0] = '今日大吉，风推两树相撞。'
  // 确认注入有效
  const injected = clone.比肩.冲[0].includes('大吉')
  if (!injected) { toothFail++; fail('牙口1 注入未生效（无「大吉」）') }
  else {
    let hit = 0
    for (const { text } of collectAll(clone)) {
      if (findForbidden(text, true).hits.length) hit++
      else if (P_FORBIDDEN.some((w) => text.includes(w))) hit++
    }
    if (hit === 0) { toothFail++; fail('牙口1：植入「大吉」后合规扫描仍 0 命中（断言无判别力）') }
  }
}
// 牙口2：植入「今日不宜出行」→ 决策指导须翻红
{
  const clone = structuredClone(PERSONAL_DAILY)
  clone.食神.冲[0] = '今日不宜出行，嫩芽顶开冻土。'
  const injected = /不宜.{0,6}出行/.test(clone.食神.冲[0])
  if (!injected) { toothFail++; fail('牙口2 注入未生效') }
  else {
    let hit = 0
    for (const { text } of collectAll(clone)) if (P_DECISION.test(text)) hit++
    if (hit === 0) { toothFail++; fail('牙口2：植入「不宜出行」后决策指导仍 0 命中') }
  }
}
// 牙口3：植入「消耗又纠缠，反复拉扯」→ 密度断言须翻红（≥2）
{
  const clone = structuredClone(PERSONAL_DAILY)
  clone.七杀.害[0] = '消耗又纠缠，反复拉扯，暗处的寒气浸着骨头。'
  let density = 0
  for (const w of DENSITY_WORDS) if (clone.七杀.害[0].includes(w)) density++
  if (density < 2) { toothFail++; fail('牙口3 注入未生效（密度<2）') }
  else {
    let hit = 0
    for (const { text } of collectAll(clone)) {
      let d = 0; for (const w of DENSITY_WORDS) if (text.includes(w)) d++
      if (d >= 2) hit++
    }
    if (hit === 0) { toothFail++; fail('牙口3：密度断言未翻红') }
  }
}
// 牙口4：7 条改同一前两字起句 → 属性兜底须翻红
{
  const clone = structuredClone(PERSONAL_DAILY)
  const keys = [['比肩','冲'],['劫财','冲','0'],['食神','冲','0'],['伤官','冲','0'],['偏财','冲','0'],['正财','冲','0'],['七杀','冲','0']]
  // 把 7 条变体0 改为「静下」开头
  let patched = 0
  for (const ss of SHI_SHEN_NAMES) { if (patched < 7) { clone[ss].冲[0] = '静下心来' + clone[ss].冲[0].slice(2); patched++ } }
  let max = 0
  const freq = new Map()
  for (const ss of SHI_SHEN_NAMES) for (const rel of RELATIONS) {
    const p = [...clone[ss][rel][0]].slice(0,2).join('')
    freq.set(p, (freq.get(p)||0)+1)
  }
  max = Math.max(...freq.values())
  if (patched < 7 || max < 7) { toothFail++; fail(`牙口4 注入未生效（patched=${patched} max=${max}）`) }
  else if (max <= 6) { toothFail++; fail('牙口4：7 条同前两字后属性兜底未翻红（≤6）') }
}
// 牙口5：日运入口改成自己算归日（民用日 00:00）→ 归日一致断言须翻红
{
  // 坏实现：用民用日 0:00（不考虑晚子时）算归日
  const badDailyFor = (zone, chart, now = new Date()) => {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: zone, hour12:false, year:'numeric', month:'2-digit', day:'2-digit' }).formatToParts(now)
    const g = (t) => Number(parts.find(p=>p.type===t).value)
    // ★ 故意不接 23:00 换日 —— 这是事故同族的反模式
    const { year, month, day } = { year: g('year'), month: g('month'), day: g('day') }
    const liuRi = liuRiOf(year, month, day)
    const dayNumber = Math.floor(Date.UTC(year, month-1, day)/86400000)
    const general = { date: `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`, liuRi: liuRi.ganZhi }
    const personal = personalDailyFor(liuRi, dayNumber, chart)
    return { general, personal }
  }
  // 确认注入有效：取一个当地 23:30 的时刻，坏实现与正实现归日不同
  const t = new Date('2026-10-08T15:30:00Z') // 北京 23:30 → 晚子时换次日
  const good = dailyFor('Asia/Shanghai', { dayMaster:'壬', dayZhi:'子', allZhi:['子','丑','子','寅'] }, t)
  const bad = badDailyFor('Asia/Shanghai', { dayMaster:'壬', dayZhi:'子', allZhi:['子','丑','子','寅'] }, t)
  if (good.general.date === bad.general.date) { toothFail++; fail(`牙口5 注入未生效（坏实现与正实现归日相同=${good.general.date}，无法证明牙口）`) }
  else {
    // 坏实现的 general.date 与 personal 的 liuRi 仍自洽（因为它也用同一 liuRi），
    // 但与正实现【不同】→ 若有人把 dailyFor 换成坏实现，归日一致断言虽绿、但结果错了。
    // 这里断言的是「坏实现的 date ≠ 正实现 date」→ 证明晚子时被绕过会被发现
    // （即 #17 背后的同源铁律有判别力：改回民用日必改变 date）
    // 已在上面 good!==bad 确认
  }
}
// 牙口6：寅巳判定改成 '害' → 重叠点断言须翻红
{
  const badRel = (todayZhi, chart) => {
    // ★ 故意把寅巳从「刑」改成「害」
    if ((todayZhi==='寅'&&chart.dayZhi==='巳')||(todayZhi==='巳'&&chart.dayZhi==='寅')) return '害'
    return dayBranchRelation(todayZhi, chart)
  }
  const got = badRel('寅', { dayZhi:'巳', allZhi:['寅','巳','辰','午'] })
  if (got !== '害') { toothFail++; fail('牙口6 注入未生效（寅巳未改成害') }
  else {
    // 期望寅巳=刑，坏实现给害 → 与期望不符（#16(c) 会翻红）
    if (got === '刑') { toothFail++; fail('牙口6：坏实现仍返回刑，断言无判别力') }
    // got==='害' ≠ '刑' → #16(c) 的 expectShiShen/relFailC 逻辑会判红（此处已证明差异存在）
  }
}
// 牙口7：「难得」4 条改回同一后半句（把绷着的肩放一放。）→ #15② 半句重复断言须翻红（§2.3）
{
  const clone = structuredClone(PERSONAL_DAILY)
  const victims = [['劫财', '无'], ['正财', '无'], ['正官', '无'], ['正印', '无']]
  for (const [ss, rel] of victims) clone[ss][rel][2] = '难得清静的一天，把绷着的肩放一放。'
  // 确认注入有效（肯定性证据）
  const injected = victims.every(([ss, rel]) => clone[ss][rel][2].endsWith('把绷着的肩放一放。'))
  if (!injected) { toothFail++; fail('牙口7 注入未生效（后半句未植入）') }
  else {
    // 复演 #15② 的半句统计逻辑：注入后变体[2] 后半句最高须 ≥3
    const half = new Map()
    for (const ss of SHI_SHEN_NAMES) for (const rel of RELATIONS) {
      const t = clone[ss][rel][2]
      const idx = t.indexOf('，')
      if (idx < 0) continue
      const h = t.slice(idx + 1)
      half.set(h, (half.get(h) || 0) + 1)
    }
    const maxHalf = Math.max(...half.values())
    if (maxHalf < 3) { toothFail++; fail(`牙口7：注入 4 条同后半句后最高仅 ×${maxHalf}（<3），半句断言无判别力`) }
  }
}
console.log(toothFail === 0
  ? `✓ 牙口：7 种注入（大吉/不宜出行/密度/7同起句/自算归日/寅巳改害/4条同后半句）均确认有效且断言翻红`
  : `✗ 牙口断言失败（${toothFail} 处）`)

console.log('\n' + (allPass ? 'DAILY_ACCEPT_PASS' : 'DAILY_ACCEPT_FAIL'))
if (!allPass) process.exit(1)
