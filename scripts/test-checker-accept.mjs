// 离线验收：依据混淆判据（FAIL/INFO 两档）的 10 个回归用例
// 对应任务书 §1.4；纯本地、不耗 API，纳入 npm run verify
// 铁律：不仅要验「否定句不再误报」，还必须验「真违规仍判 FAIL」——含 2 条同句肯定+否定边界
import { classifyConfuse, withComplianceRetry } from '../src/lib/ai-check.ts'

// [期望档位, 句子]
const CASES = [
  ['info', '四、婚期与近一两年节奏：男命当前行甲申运，女命当前行甲辰运，此为大运同步的产品设定参考指标，仅作节奏参考，非命理典籍所载'],
  ['info', '生肖配对属于民俗层面，不是典籍所载的判据'],
  ['info', '大运同步为产品设定指标，典籍无此判据'],
  ['info', '纳音合婚出自唐宋古法，并非典籍主流判据'],
  ['info', '生肖合冲属民间俗论，典籍未载'],
  ['fail', '生肖配对源自典籍《渊海子平》，为合婚首要判据'],
  ['fail', '大运同步乃典籍所载之合婚法则'],
  ['fail', '纳音之法，典籍有明训'],
  ['fail', '生肖配对源自典籍所载，并非民俗之谈'],
  ['fail', '大运同步为典籍所载判据，并非后世新增'],
  // 扩样轮新增：「不可混为一谈」紧邻否定 → INFO；「不仅」递进 → FAIL（防止否定词放松）
  ['info', '三者依据等级不同，生肖为俗论、纳音为古法、干支生克为典籍，不可混为一谈'],
  ['fail', '生肖合婚与典籍所载一致，不仅如此，年支亦无冲克'],
  // 实抽误报句（顺序变体：典籍在前、混淆词在后的三者分级）→ 合规 INFO
  ['info', '三者依据等级不同：干支生克为典籍所重，纳音为唐宋古法之遗，生肖则为民间俗论']
]

let allOk = true
CASES.forEach(([expect, sentence], i) => {
  const { fail, info } = classifyConfuse(sentence)
  const got = fail.length ? 'fail' : 'info'
  const ok = got === expect
  if (!ok) allOk = false
  console.log(`${ok ? '✓' : '✗'} 用例${i + 1} 期望 ${expect.toUpperCase()} → ${got.toUpperCase()}：「${sentence.slice(0, 24)}…」`)
  if (!ok) {
    console.log(`   fail=[${fail.join(' | ')}] info=[${info.join(' | ')}]`)
  }
})

// —— REPLY 复核 §六-2：aiAnalysis 合规「接线」对称性（离线、零 API）——
// 教训：ai-check.ts 判据统一了，但 aiAnalysis 的 validate 曾漏接 findForbidden，
// 「务必/势必/必定」类绝对化措辞会直接上线。此段让【接线本身】有牙，防再次漂移。
// 口径（findForbidden 默认，否定式豁免）：务必/势必/必定 → 拦截；
// 未必/不可避免 → 否定式豁免放行；「不必」由 sanitize 先替换为「无须」，到不了校验。
const { makeAnalysisComplianceValidator } = await import('../src/lib/aiAnalysis.ts')
const validateWiring = makeAnalysisComplianceValidator(new Set(['甲子', '乙丑']))
const WIRING_BLOCK = ['务必谨慎行事', '势必有所取舍', '必定如此', '流年丙寅大吉'] // 末条验干支溯源仍优先
const WIRING_PASS = ['此事未必如愿', '竞争压力不可避免', '运程起伏难免，宜稳守为上']
for (const s of WIRING_BLOCK) {
  const r = validateWiring({ overview: s })
  // 校验器消息带具体命中项（如「检出禁用词：务必」），按前缀判定 violation 类别
  const ok = typeof r === 'string' && (r.startsWith('检出禁用词') || r.startsWith('检出未溯源干支'))
  if (!ok) allOk = false
  console.log(`${ok ? '✓' : '✗'} 接线拦截「${s}」→ ${r ?? '✗ 未拦截，会漏上线'}`)
}
for (const s of WIRING_PASS) {
  const r = validateWiring({ overview: s })
  const ok = r === null
  if (!ok) allOk = false
  console.log(`${ok ? '✓' : '✗'} 接线放行「${s}」→ ${r === null ? 'null（豁免正确）' : `${r}（误拦！）`}`)
}

// ---------- withComplianceRetry：带反馈重试 + 首次失败留痕（2026-10-18 付费回退事故）----------
// 背景：付费模块（紫微/合婚/地理/年运）AI 输出被禁用词校验退回时回退规则版，付费用户看到
//   「规则版（AI结果未过合规校验）」→ 不满意要退款。原先两个问题：
//     ① 首次退回【不打印原因】——线上只看到"回退了"，无法判断是哪个词触发的（「必」是单字、
//        「一定」是词，改法完全不同），排查无门；
//     ② 重试【不带反馈】——同 prompt + temperature 0.8 盲重试，模型极可能再次写出同一个词。
// 本段真调 withComplianceRetry（假 attempt 记录两次收到的 feedback），把两个修法都钉住。
const seen = []
const warns = []
const origWarn = console.warn
console.warn = (...a) => { warns.push(a.join(' ')) }
const retried = await withComplianceRetry(
  async (feedback) => {
    seen.push(feedback)
    return seen.length === 1 ? { text: '务必谨慎行事' } : { text: '宜谨慎行事' }
  },
  (r) => (r.text.includes('务必') ? '检出禁用词：务必' : null),
  'selftest'
)
// 二轮仍不合规 → 放弃 AI 结果（调用方回退规则版）
const giveUp = await withComplianceRetry(
  async () => ({ text: '势必有所取舍' }),
  (r) => (r.text.includes('势必') ? '检出禁用词：势必' : null),
  'selftest2'
)
// 首次调用就失败（无响应）→ 不该白花一次重试的 API 成本
let nullCalls = 0
const nullCase = await withComplianceRetry(
  async () => { nullCalls++; return null },
  () => null,
  'selftest3'
)
console.warn = origWarn

const RETRY_CASES = [
  [seen[0] === undefined, `首次调用不带反馈（保持首次请求形态不变）：feedback=${String(seen[0])}`],
  [seen.length === 2, `不合规时重试一次（总调用次数 ${seen.length}）`],
  [seen[1] === '检出禁用词：务必', `重试把退回原因回灌给 attempt（feedback=${String(seen[1])}）`],
  [retried?.text === '宜谨慎行事', `重试合规后返回重试结果（得「${retried?.text}」）`],
  [warns.some((w) => w.includes('首次输出不合规') && w.includes('务必')),
    `首次不合规必须留痕且带具体命中词（warn：${warns.filter((w) => w.includes('首次')).join(' / ') || '无'}）`],
  [giveUp === null && warns.some((w) => w.includes('重试后仍不合规')),
    '重试仍不合规 → 返回 null 且打印「重试后仍不合规」（回退必须可见）'],
  [nullCalls === 1 && nullCase === null, `首次调用失败不重试（调用次数 ${nullCalls}，返回 ${String(nullCase)}）`],
]
for (const [ok, line] of RETRY_CASES) {
  if (!ok) allOk = false
  console.log(`${ok ? '✓' : '✗'} ${line}`)
}

console.log(allOk ? 'CHECKER_ACCEPT_PASS' : 'CHECKER_ACCEPT_FAIL')
process.exit(allOk ? 0 : 1)
