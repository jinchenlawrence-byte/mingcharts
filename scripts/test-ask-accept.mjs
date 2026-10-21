// AI 追问（ask_pack）验收（docs/追问功能实现方案）
// 覆盖：① 次数单一事实源（ASK_PACK_SIZE / MEMBER_ASK_PER_MONTH / ASK_PER_REPORT）② 硬拒答分类
//       ③ 拒答/免责话术自证合规 ④ askQuotaFromRows 派生额度边界（追问包 + 报告赠送 + 会员每月）
//       ⑤ route 接线（付费门槛、拒答先于 AI 调用、额度 402、落库）⑥ 合规示范自证
import { readFileSync } from 'node:fs'
import { SKUS, ASK_PACK_SIZE, MEMBER_ASK_PER_MONTH, ASK_PER_REPORT } from '../src/lib/pricing.ts'
import { GRANT_LABELS } from '../src/lib/grantLabels.ts'
import { askQuotaFromRows, askMonthStart } from '../src/lib/entitlement.ts'
import {
  classifyAskQuestion,
  refusalText,
  ASK_DISCLAIMER,
  ASK_FALLBACK_TEXT,
  ASK_REFUSAL_RULES,
} from '../src/lib/aiAsk.ts'
import { findForbidden, FORBIDDEN_FEWSHOT } from '../src/lib/ai-check.ts'

let allPass = true
const fail = (msg) => { allPass = false; console.log('  ✗ ' + msg) }
const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')
const strip = (s) => s.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')

// ---------- ① 次数单一事实源：ASK_PACK_SIZE / MEMBER_ASK_PER_MONTH ----------
{
  let f = 0
  if (ASK_PACK_SIZE !== 10) { f++; fail(`ASK_PACK_SIZE 应为 10，实得 ${ASK_PACK_SIZE}`) }
  if (MEMBER_ASK_PER_MONTH !== 8) { f++; fail(`MEMBER_ASK_PER_MONTH 应为 8，实得 ${MEMBER_ASK_PER_MONTH}`) }
  if (ASK_PER_REPORT !== 5) { f++; fail(`ASK_PER_REPORT 应为 5，实得 ${ASK_PER_REPORT}`) }
  // desc / 标签必须由常量派生，不得另写字面量
  if (!SKUS.ask_pack.desc.includes(String(ASK_PACK_SIZE))) {
    f++; fail(`ask_pack.desc 未含 ${ASK_PACK_SIZE}（未派生）：${SKUS.ask_pack.desc}`)
  }
  if (!GRANT_LABELS.ask.includes(String(ASK_PACK_SIZE))) {
    f++; fail(`GRANT_LABELS.ask 未含 ${ASK_PACK_SIZE}（未派生）：${GRANT_LABELS.ask}`)
  }
  for (const id of ['member_monthly', 'member_yearly']) {
    if (!SKUS[id].desc.includes(String(MEMBER_ASK_PER_MONTH))) {
      f++; fail(`${id}.desc 未含会员每月追问额度 ${MEMBER_ASK_PER_MONTH}（未派生）`)
    }
  }
  // 源码守卫：次数不得在别处硬编码数字
  const pricingSrc = strip(read('../src/lib/pricing.ts'))
  if (/追问\s*\d/.test(pricingSrc)) { f++; fail('pricing.ts 硬编码了「追问 N 次」字面量') }
  const grantSrc = strip(read('../src/lib/grantLabels.ts'))
  if (/追问\s*\d|V2/.test(grantSrc)) { f++; fail('grantLabels.ts 的 ask 标签硬编码了数字/V2') }
  console.log(f === 0
    ? `✓ 单一事实源：ASK_PACK_SIZE=${ASK_PACK_SIZE}，MEMBER_ASK_PER_MONTH=${MEMBER_ASK_PER_MONTH}，ASK_PER_REPORT=${ASK_PER_REPORT}，desc/标签均派生`
    : '✗ 单一事实源断言失败')
}

// ---------- ② 硬拒答分类：5 类必拒，正常命理问题必放行 ----------
{
  let f = 0
  const refusalCases = [
    ['medical', '我是不是得了癌症，命盘能看出来吗'],
    ['legal', '我这场官司能赢吗'],
    ['investment', '我该买哪只股票'],
    ['life_death', '我还能活多久'],
    ['life_decision', '我该不该辞职'],
  ]
  for (const [cat, q] of refusalCases) {
    const got = classifyAskQuestion(q)
    if (got !== cat) { f++; fail(`「${q}」应判 ${cat}，实得 ${got}`) }
  }
  // 规则表必须覆盖 5 类（防被删）
  const cats = ASK_REFUSAL_RULES.map(r => r.category)
  for (const c of ['medical', 'legal', 'investment', 'life_death', 'life_decision']) {
    if (!cats.includes(c)) { f++; fail(`拒答规则缺类别 ${c}`) }
  }
  const normalCases = [
    '今年我的事业运势有什么需要注意的地方',
    '我的婚姻宫对感情模式有什么影响',
    '命局里的用神是什么，为什么取它',
    '我的财运趋势如何',
    '性格天赋适合往哪个方向发展',
  ]
  for (const q of normalCases) {
    const got = classifyAskQuestion(q)
    if (got !== null) { f++; fail(`正常命理问题「${q}」不应拒答，实得 ${got}`) }
  }
  console.log(f === 0
    ? '✓ 硬拒答：5 类例句均命中；5 条正常命理问题均放行'
    : '✗ 硬拒答分类断言失败')
}

// ---------- ③ 拒答 / 免责 / 兜底话术自证合规（不过 findForbidden）----------
{
  let f = 0
  for (const rule of ASK_REFUSAL_RULES) {
    const t = refusalText(rule.category)
    const { hits } = findForbidden(t)
    if (hits.length) { f++; fail(`拒答话术(${rule.category})含禁用词：${[...new Set(hits.map(h => h.w))].join('、')}`) }
    if (!/倾向|权衡/.test(t)) { f++; fail(`拒答话术(${rule.category})缺「倾向/权衡」改写法`) }
  }
  for (const [name, t] of [['免责句', ASK_DISCLAIMER], ['兜底句', ASK_FALLBACK_TEXT]]) {
    const { hits } = findForbidden(t)
    if (hits.length) { f++; fail(`${name}含禁用词：${[...new Set(hits.map(h => h.w))].join('、')}`) }
  }
  console.log(f === 0
    ? '✓ 话术自证：5 类拒答话术 + 免责句 + 兜底句均通过 findForbidden，拒答含改写法'
    : '✗ 话术合规断言失败')
}

// ---------- ④ askQuotaFromRows 派生额度边界（追问包 + 会员每月）----------
{
  let f = 0
  const P = (over = {}) => ({ payment_type: 'single', status: 'paid', transaction_id: 'WF-A', sku: 'ask_pack', ...over })
  const M = (over = {}) => ({ is_member: true, member_plan: 'monthly', member_expire_at: '2099-01-01T00:00:00Z', ...over })
  const eq = (got, want, label) => { if (got !== want) { f++; fail(`${label}：期望 ${want}，实得 ${got}`) } }

  // 追问包（终身，不重置）
  eq(askQuotaFromRows([], 0, 0, null).total, 0, '无流水→0')
  eq(askQuotaFromRows([P()], 0, 0, null).pack, ASK_PACK_SIZE, '一包未用→10')
  eq(askQuotaFromRows([P()], ASK_PACK_SIZE, 0, null).pack, 0, '一包用尽→0')
  eq(askQuotaFromRows([P()], ASK_PACK_SIZE + 5, 0, null).pack, 0, '超额消耗→夹到 0')
  eq(askQuotaFromRows([P(), P()], 5, 0, null).pack, 2 * ASK_PACK_SIZE - 5, '两包叠加→20-5')
  eq(askQuotaFromRows([P({ transaction_id: 'MOCK_1' })], 0, 0, null).pack, 0, 'MOCK_ 流水不授予')
  eq(askQuotaFromRows([P({ status: 'pending' })], 0, 0, null).pack, 0, '未支付不授予')
  eq(askQuotaFromRows([P({ sku: 'fatebook' })], 0, 0, null).pack, 0, '非 ask_pack 不授予')
  eq(askQuotaFromRows([P({ sku: ' ask_pack ' })], 0, 0, null).pack, ASK_PACK_SIZE, 'sku 带空格仍识别')

  // 会员每月额度（自然月重置，不累计）
  eq(askQuotaFromRows([], 0, 0, M()).member, MEMBER_ASK_PER_MONTH, '会员本月未用→8')
  eq(askQuotaFromRows([], 0, MEMBER_ASK_PER_MONTH, M()).member, 0, '会员本月用尽→0')
  eq(askQuotaFromRows([], 0, MEMBER_ASK_PER_MONTH + 3, M()).member, 0, '会员超额消耗→夹到 0')
  eq(askQuotaFromRows([], 0, 3, M()).member, MEMBER_ASK_PER_MONTH - 3, '会员用 3 次→剩 5')
  eq(askQuotaFromRows([], 0, 0, M({ member_plan: 'yearly' })).member, MEMBER_ASK_PER_MONTH, '年费会员同享每月 8 次')
  eq(askQuotaFromRows([], 0, 0, M({ is_member: false })).member, 0, '非会员→0')
  eq(askQuotaFromRows([], 0, 0, M({ member_expire_at: '2020-01-01T00:00:00Z' })).member, 0, '会员已过期→0')
  eq(askQuotaFromRows([], 0, 0, null).member, 0, '无档案→0')

  // 报告赠送额度（每份单次报告，终身，不重置）——第 6 参数为「已用报告赠送次数」
  eq(askQuotaFromRows([P({ sku: 'fatebook' })], 0, 0, null).report, ASK_PER_REPORT, '一份命书→赠 5 次')
  eq(askQuotaFromRows([P({ sku: 'fatebook' }), P({ sku: 'annual_report' })], 0, 0, null).report, 2 * ASK_PER_REPORT, '两份报告→赠 10 次')
  eq(askQuotaFromRows([P({ sku: 'bundle3' })], 0, 0, null).report, ASK_PER_REPORT, '三合一套餐算一份→赠 5 次')
  eq(askQuotaFromRows([P({ sku: 'fatebook' })], 0, 0, null, Date.now(), ASK_PER_REPORT).report, 0, '报告赠送用尽→0')
  eq(askQuotaFromRows([P({ sku: 'fatebook' })], 0, 0, null, Date.now(), ASK_PER_REPORT + 3).report, 0, '报告赠送超额→夹到 0')
  eq(askQuotaFromRows([P()], 0, 0, null).report, 0, '追问包不赠报告额度')
  eq(askQuotaFromRows([P({ sku: 'fatebook', transaction_id: 'MOCK_1' })], 0, 0, null).report, 0, 'MOCK_ 报告不授予')
  eq(askQuotaFromRows([P({ sku: 'fatebook', status: 'pending' })], 0, 0, null).report, 0, '未支付报告不授予')
  // 付费门槛：买过任意付费内容 allowed=true，否则 false
  eq(askQuotaFromRows([P({ sku: 'fatebook' })], 0, 0, null).allowed, true, '买过报告→allowed')
  eq(askQuotaFromRows([P()], 0, 0, null).allowed, true, '买过追问包→allowed')
  eq(askQuotaFromRows([], 0, 0, M()).allowed, true, '在期会员→allowed')
  eq(askQuotaFromRows([], 0, 0, null).allowed, false, '没买过→allowed=false')
  eq(askQuotaFromRows([], 0, 0, M({ member_expire_at: '2020-01-01T00:00:00Z' })).allowed, false, '会员过期且无购买→false')

  // 两种额度叠加：合计 = 包剩余 + 会员本月剩余（互不挤占）
  eq(askQuotaFromRows([P()], 4, 3, M()).total, (ASK_PACK_SIZE - 4) + (MEMBER_ASK_PER_MONTH - 3), '包剩余 + 会员剩余')
  // 三源叠加：会员 5 + 报告 4 + 追问包 6
  eq(
    askQuotaFromRows([P(), P({ sku: 'fatebook' })], 4, 3, M(), Date.now(), 1).total,
    (ASK_PACK_SIZE - 4) + (MEMBER_ASK_PER_MONTH - 3) + (ASK_PER_REPORT - 1),
    '会员 + 报告赠送 + 追问包 三源合计'
  )
  // 自然月边界：北京时间 11-01 00:30 属于 11 月；10-31 23:59 属于 10 月
  eq(askMonthStart(new Date('2026-10-31T16:30:00Z').getTime()), '2026-10-31T16:00:00.000Z', '跨月瞬间按北京时间归月（11 月）')
  eq(askMonthStart(new Date('2026-10-31T15:59:59Z').getTime()), '2026-09-30T16:00:00.000Z', '10-31 23:59（北京）仍归 10 月')
  console.log(f === 0
    ? '✓ 额度派生：追问包终身 + 报告赠送 + 会员每月 8 次 + 付费门槛 + 叠加/过期/归月 边界全过'
    : '✗ 额度派生断言失败')
}

// ---------- ⑤ route 接线（拒答先于 AI 调用、额度 402、落库 ask_messages）----------
{
  let f = 0
  const src = read('../src/app/api/ask/route.ts')
  const code = strip(src)
  if (!code.includes('classifyAskQuestion')) { f++; fail('route 未调用 classifyAskQuestion（硬拒答）') }
  if (!code.includes('getAskRemaining')) { f++; fail('route 未接线 getAskRemaining（额度单一事实源）') }
  if (!code.includes('ASK_QUOTA_EXHAUSTED')) { f++; fail('route 缺 ASK_QUOTA_EXHAUSTED（402 码）') }
  if (!code.includes('ENTITLEMENT_ENFORCE')) { f++; fail('route 未引用 ENTITLEMENT_ENFORCE 开关') }
  if (!code.includes('generateAskAnswer')) { f++; fail('route 未调用 generateAskAnswer') }
  if (!/\.from\(\s*['"]ask_messages['"]\s*\)[\s\S]*?\.insert\(/.test(code)) {
    f++; fail('route 未向 ask_messages 落库')
  }
  // ★ 扣减来源（2026-10-21）：会员额度 → 报告赠送 → 追问包；落库必须带 credit_source
  if (!code.includes("credit_source")) { f++; fail('route 落库未标记 credit_source（额度来源无法区分）') }
  if (!/quota\.member\s*>\s*0\s*\?\s*'member'\s*:\s*quota\.report\s*>\s*0\s*\?\s*'report'\s*:\s*'pack'/.test(code)) {
    f++; fail('route 未按「会员额度 → 报告赠送 → 追问包」选择 credit_source')
  }
  if (!code.includes('memberRemaining')) { f++; fail('route 未下发 memberRemaining（会员每月额度明细）') }
  if (!code.includes('reportRemaining')) { f++; fail('route 未下发 reportRemaining（报告赠送额度明细）') }
  // ★ 付费门槛（2026-10-21）：未买过任何付费内容必须 403，且先于 AI 生成
  if (!code.includes('ASK_REQUIRES_PAID')) { f++; fail('route 缺 ASK_REQUIRES_PAID（付费门槛 403 码）') }
  if (!/quota\.allowed/.test(code) || !code.includes('allowed: quota.allowed')) {
    f++; fail('route 未下发/校验 allowed（追问与付费内容绑定）')
  }
  const iGate = code.indexOf('ASK_REQUIRES_PAID')
  const iGen = code.indexOf('await generateAskAnswer')
  if (iGate < 0 || iGen < 0 || iGate > iGen) {
    f++; fail('付费门槛未先于 AI 调用（顺序错误）')
  }
  // ★ 顺序守卫：拒答判定必须【先于】AI 生成（零成本、不扣额）
  const iRef = code.indexOf('classifyAskQuestion')
  if (iRef < 0 || iGen < 0 || iRef > iGen) { f++; fail('拒答判定未先于 AI 调用（顺序错误）') }
  console.log(f === 0
    ? '✓ route 接线：付费门槛(403)→拒答(先)→额度(402)→AI 生成→落库 ask_messages'
    : '✗ route 接线断言失败')
}

// ---------- ⑥ 合规示范自证（FORBIDDEN_FEWSHOT + 问答场景整句）----------
{
  let f = 0
  for (const [bad, good] of FORBIDDEN_FEWSHOT) {
    if (findForbidden(bad).hits.length === 0) { f++; fail(`示范 before 未被拦截（示范失效）：${bad}`) }
    if (findForbidden(good).hits.length > 0) { f++; fail(`示范 after 仍被拦截：${good}`) }
  }
  // 问答场景整句：违规 vs 合规
  const badAsk = '你今年投资股票必然会大赚，务必积极进取'
  const goodAsk = '你今年在财帛方面往往有阶段性的进展，投资决策宜稳中求进、并自行权衡'
  if (findForbidden(badAsk).hits.length === 0) { f++; fail('问答违规示范未被拦截') }
  if (findForbidden(goodAsk).hits.length > 0) {
    f++; fail(`问答合规示范被拦截：${[...new Set(findForbidden(goodAsk).hits.map(h => h.w))].join('、')}`)
  }
  console.log(f === 0
    ? '✓ 合规示范自证：词组 few-shot + 问答整句（before 必拦 / after 必过）'
    : '✗ 合规示范断言失败')
}

// ---------- ⑦ 追问面板的购买入口（2026-10-21：剩余 0 次必须给购买按钮）----------
{
  let f = 0
  const panel = strip(read('../src/components/AskPanel.tsx'))
  const route = strip(read('../src/app/api/ask/route.ts'))

  // 服务端下发开关：前端不得自行判断 env（单一事实源）
  if (!/enforced:\s*ENTITLEMENT_ENFORCE/.test(route)) {
    f++; fail('GET /api/ask 未下发 enforced（前端将无法区分内测/收费口径）')
  }
  if (!panel.includes('setEnforced')) { f++; fail('Panel 未接收 enforced') }

  // ★ 牙口：购买入口的条件必须同时覆盖「初始即 0 次」与「刚被 402」
  if (!/const quotaOut\s*=\s*enforced\s*&&/.test(panel)) {
    f++; fail('Panel 未按 enforced 派生 quotaOut（额满仍可能不显示购买入口）')
  }
  if (!/quotaOut\s*&&\s*\(/.test(panel)) { f++; fail('购买入口未由 quotaOut 控制') }
  if (/remaining !== null && remaining <= 0/.test(panel) === false) {
    f++; fail('quotaOut 未覆盖「首次加载即剩余 0」的情形（本次修复的核心场景）')
  }
  if (!panel.includes('exhausted ||')) { f++; fail('quotaOut 未覆盖「追问时收到 402」的情形') }

  // 购买入口本身：ask_pack + 已登记商品才可点
  if (!/<CheckoutButton[\s\S]{0,200}sku="ask_pack"/.test(panel)) { f++; fail('缺少 ask_pack 购买按钮') }
  if (!/requireChart=\{false\}/.test(panel)) { f++; fail('追问包与命盘无关，应 requireChart=false') }
  if (!panel.includes("waffoProductId('ask_pack')")) { f++; fail('购买按钮未按商品登记状态决定可用') }

  // 额满时输入区禁用，避免每次点击都白跑 402
  if (!/disabled=\{quotaOut\}/.test(panel)) { f++; fail('额满时输入框未禁用') }
  if (!/disabled=\{sending \|\| quotaOut/.test(panel)) { f++; fail('额满时追问按钮未禁用') }

  console.log(f === 0
    ? '✓ 追问面板：剩余 0 即显示购买入口（enforced 服务端下发）+ 额满禁用输入'
    : '✗ 追问面板购买入口断言失败')
}

console.log('\n' + (allPass ? 'ASK_ACCEPT_PASS' : 'ASK_ACCEPT_FAIL'))
if (!allPass) process.exit(1)
