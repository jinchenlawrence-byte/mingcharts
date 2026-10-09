// 价格扫尾验收（REPLY-PartA复核 §五-1/2；总纲 §8.6.3）
// ★ 教训（事故 31）：查「某物已消失」必须用【旧形态】去搜，不是新形态。
//   旧人民币价的旧形态＝「¥＋数字」，故扫描判据为 /¥\s*\d/，覆盖 src 全量源码（含注释）。
import { readFileSync, readdirSync } from 'node:fs'
import { SKUS, formatPriceUSD, REPORT_GRANTS, SUBSCRIPTION_GRANTS } from '../src/lib/pricing.ts'
import { PLANS } from '../src/lib/membership.ts'

let allPass = true
const fail = (msg) => { allPass = false; console.log('  ✗ ' + msg) }

// ---------- ① 全量源码扫描：旧形态 ¥价 必须 0 命中 ----------
const OLD_PRICE = /¥\s*\d/g
function walk(dir) {
  const out = []
  // 手写递归（不依赖递归 readdir 的 Dirent.path/parentPath 跨版本差异）
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = dir + '\\' + e.name
    if (e.isDirectory()) { out.push(...walk(p)); continue }
    if (e.isFile() && /\.(ts|tsx)$/.test(e.name)) out.push(p)
  }
  return out
}
const root = new URL('../src/', import.meta.url).pathname.replace(/^\/(\w:)/, '$1')
let hitCount = 0
for (const file of walk(root)) {
  const content = readFileSync(file, 'utf8')
  const hits = content.match(OLD_PRICE)
  if (hits) {
    hitCount += hits.length
    fail(`${file.replace(root, 'src/')} 残留旧价 ${hits.join('、')}`)
  }
}
console.log(hitCount === 0
  ? '✓ 旧价扫尾：src 全量 .ts/.tsx 扫描「¥＋数字」0 命中（旧形态判据，§8.6.3）'
  : `✗ 旧价扫尾失败：${hitCount} 处残留`)

// ---------- ② 判据牙口自检（守护扫描器本身）----------
// 刻意的旧形态样本必须被检出；新形态/非价格不得误报。
// 若后人把正则改弱（如去掉 \s*、改成 ¥\d\d），这里立刻翻红。
const MUST_HIT = ['¥1', '¥ 1', '¥19.9', '¥29.9/月', '命书 ¥ 19.9 / 次']
const MUST_MISS = ['$29.99', '$9.90', '人民币符号¥不带数字', '价格见 pricing.ts']
let toothFail = 0
for (const s of MUST_HIT) {
  if (!new RegExp(OLD_PRICE.source).test(s)) { toothFail++; fail(`牙口：旧形态样本「${s}」未检出`) }
}
for (const s of MUST_MISS) {
  if (new RegExp(OLD_PRICE.source).test(s)) { toothFail++; fail(`牙口：非旧形态「${s}」被误报`) }
}
console.log(toothFail === 0
  ? `✓ 扫描判据牙口：${MUST_HIT.length} 旧形态样本必检出、${MUST_MISS.length} 非旧形态不误报`
  : '✗ 扫描判据牙口失效')

// ---------- ③ SKU 价格＝拍板表（来源：HANDOFF §1.2，期望值有据，§8.6.2）----------
// 顺序即拍板表；改价须同时改任务书，不得只动一处。
const PRICE_TABLE = [
  ['fatebook', 29.99], ['annual_report', 19.99], ['hemun', 29.99],
  ['ziwei_deep', 24.99], ['geo', 19.99], ['bundle3', 59.99],
  ['member_monthly', 9.9], ['member_yearly', 49], ['ask_pack', 4.99]
]
let priceFail = 0
for (const [id, usd] of PRICE_TABLE) {
  if (SKUS[id].priceUSD !== usd) {
    priceFail++
    fail(`SKUS.${id} 价格 $${SKUS[id].priceUSD} ≠ 拍板 $${usd}`)
  }
}
console.log(priceFail === 0
  ? `✓ SKU 价格与拍板表一致：${PRICE_TABLE.length} 项（USD 单一币种，来源 HANDOFF §1.2）`
  : '✗ SKU 价格漂移')

// ---------- ④ 派生关系：formatPriceUSD + PLANS 兼容导出 ----------
let deriveFail = 0
const FMT = [[29.99, '$29.99'], [49, '$49'], [0, '$0'], [4.99, '$4.99']]
for (const [n, expect] of FMT) {
  if (formatPriceUSD(n) !== expect) { deriveFail++; fail(`formatPriceUSD(${n})=${formatPriceUSD(n)} ≠ ${expect}`) }
}
if (PLANS.monthly.price !== 9.9 || PLANS.monthly.days !== 30) {
  deriveFail++; fail('PLANS.monthly 未从 SKUS.member_monthly 正确派生')
}
if (PLANS.yearly.price !== 49 || PLANS.yearly.days !== 365) {
  deriveFail++; fail('PLANS.yearly 未从 SKUS.member_yearly 正确派生')
}
console.log(deriveFail === 0
  ? '✓ 派生正确：formatPriceUSD 4 样例 + PLANS 兼容导出从 SKUS 派生（无第二份价目）'
  : '✗ 派生断言失败')

// ---------- ⑤ ★ 权益表（HANDOFF-会员权益修复 §1.6-②）----------
const GRANT_TABLE = {
  fatebook:       ['fatebook'],
  annual_report:  ['annual_report'],
  hemun:          ['hemun'],
  ziwei_deep:     ['ziwei_deep'],
  geo:            ['geo'],
  bundle3:        ['fatebook', 'ziwei_deep', 'geo'],
  member_monthly: SUBSCRIPTION_GRANTS,
  member_yearly:  SUBSCRIPTION_GRANTS,
  ask_pack:       ['ask'],
}
const ALL_GRANTS = [...REPORT_GRANTS, ...SUBSCRIPTION_GRANTS, 'ask']
let grantFail = 0
for (const [id, want] of Object.entries(GRANT_TABLE)) {
  const got = SKUS[id].grants ?? []
  if (got.length !== want.length || !want.every((g) => got.includes(g))) {
    grantFail++; fail(`SKUS.${id}.grants=[${got}] ≠ 拍板 [${want}]`)
  }
  for (const g of SKUS[id].grants ?? []) {
    if (!ALL_GRANTS.includes(g)) { grantFail++; fail(`SKUS.${id}.grants 含非法 grant「${g}」`) }
  }
}
// ★★ 核心守护：会员 grants 与报告类 grant 交集必须为空（订阅不含报告）
for (const id of ['member_monthly', 'member_yearly']) {
  const inter = (SKUS[id].grants ?? []).filter((g) => REPORT_GRANTS.includes(g))
  if (inter.length) { grantFail++; fail(`★ ${id} 含报告类 grant [${inter}] —— 订阅不得含报告`) }
}
console.log(grantFail === 0
  ? `✓ 权益表：${Object.keys(GRANT_TABLE).length} 个 SKU 与拍板一致；★ 会员与报告类交集为空（订阅不含报告）`
  : '✗ 权益表断言失败')

// ---------- ⑥ ★ 裸数字金额扫描（补上"带 ¥ 的文案"之外的形态，§8.6.3）----------
// 判据：amount:/price: 后紧跟数字字面量即命中；priceUSD: 不误报（"price"后是 U 不是 :）。
const BARE_AMOUNT = /\b(amount|price)\s*:\s*\d/g
let bareFail = 0
for (const file of walk(root)) {
  const hits = readFileSync(file, 'utf8').match(BARE_AMOUNT)
  if (hits) { bareFail++; fail(`${file.replace(root, 'src/')} 残留裸数字金额 ${hits.join('、')}`) }
}
console.log(bareFail === 0
  ? '✓ 裸数字金额：src 全量扫描 amount:/price: 字面量 0 命中（价格须取自 SKUS）'
  : `✗ 裸数字金额 ${bareFail} 处残留`)

console.log('\n' + (allPass ? 'PRICING_ACCEPT_PASS' : 'PRICING_ACCEPT_FAIL'))
if (!allPass) process.exit(1)
