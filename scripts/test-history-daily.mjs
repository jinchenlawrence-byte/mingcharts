// ★ 历史日运回看断言（档 A 2026-10-18）：history 权益靠 dailyFor 逐日重算（零存储）
// ① 逐日重算：最近 7 天日期严格递减、互不相同
// ② 归日同源：general.liuRi ≡ personal.todayGan+todayZhi（与 test-daily-accept #17 同铁律）
// ③ 日柱连续：相邻日甲子序号差 1（mod 60）——证明是真实逐日重算，非伪造
// ④ 确定性：同入参两次结果一致
// ⑤ 路由接线：/api/member/summary 用 dailyFor + canView(ent,'history')

import { readFileSync } from 'node:fs'

let allPass = true
const fail = (msg) => { allPass = false; console.log('  ✗ ' + msg) }

const { dailyFor, jiaziIndex } = await import('../src/lib/daily.ts')

// 真实命盘事实集（壬水日主，日支子）
const FACTS = { dayMaster: '壬', dayZhi: '子', allZhi: ['子', '丑', '子', '寅'] }
const ZONE = 'Asia/Shanghai'
const BASE = new Date('2026-10-18T04:00:00Z') // 北京 12:00，避开晚子时边界
const DAYS = 7

// 复演 api/member/summary 的 historyDaily 取数方式
function historyRun(base) {
  const out = []
  for (let i = 0; i < DAYS; i++) {
    const { general, personal } = dailyFor(ZONE, FACTS, new Date(base.getTime() - i * 86400000))
    if (!personal) continue
    out.push({ date: general.date, liuRi: general.liuRi, shiShen: personal.shiShen, sign: personal.sign })
  }
  return out
}

const days = historyRun(BASE)

// ---------- ① 逐日重算 ----------
console.log('—— ① 逐日重算（最近 7 天日期递减、互不相同）——')
let rangeFail = 0
if (days.length !== DAYS) { rangeFail++; fail(`应得 ${DAYS} 天，实际 ${days.length}`) }
const dateSet = new Set(days.map((d) => d.date))
if (dateSet.size !== days.length) { rangeFail++; fail(`日期存在重复：${days.map((d) => d.date).join(' ')}`) }
for (let i = 1; i < days.length; i++) {
  if (!(days[i].date < days[i - 1].date)) { rangeFail++; fail(`日期未严格递减：${days[i - 1].date} → ${days[i].date}`) }
}
console.log(rangeFail === 0
  ? `✓ 逐日重算：${DAYS} 天日期严格递减且互不相同（${days[DAYS - 1].date} … ${days[0].date}）`
  : `✗ 逐日重算断言失败 ${rangeFail} 处`)

// ---------- ② 归日同源 ----------
console.log('—— ② 归日同源（general.liuRi ≡ personal 今日干支）——')
let syncFail = 0
for (let i = 0; i < DAYS; i++) {
  const { general, personal } = dailyFor(ZONE, FACTS, new Date(BASE.getTime() - i * 86400000))
  if (general.liuRi !== `${personal.todayGan}${personal.todayZhi}`) {
    syncFail++; fail(`${general.date}：general.liuRi=${general.liuRi} ≠ personal ${personal.todayGan}${personal.todayZhi}`)
  }
}
console.log(syncFail === 0
  ? '✓ 归日同源：7 天 dailyFor 的 general 与 personal 干支一致（同一次归日）'
  : `✗ 归日同源断言失败 ${syncFail} 处`)

// ---------- ③ 日柱连续（真实逐日重算）----------
console.log('—— ③ 日柱连续（相邻日甲子序号差 1 mod 60）——')
let contFail = 0
let prev = jiaziIndex(days[0].liuRi)
for (let i = 1; i < days.length; i++) {
  const idx = jiaziIndex(days[i].liuRi)
  const expect = ((prev - 2) % 60 + 60) % 60 + 1 // 往前一天 → 序号 -1（1..60 闭合）
  if (idx !== expect) { contFail++; fail(`${days[i].date}：序号 ${idx} 未接前日 ${prev}（期望 ${expect}）`) }
  prev = idx
}
console.log(contFail === 0
  ? `✓ 日柱连续：回看 ${DAYS} 天序号逐日 -1，证明是真实逐日重算（非伪造时间线）`
  : `✗ 日柱连续断言失败 ${contFail} 处`)

// ---------- ④ 确定性 ----------
console.log('—— ④ 确定性（同入参两次一致）——')
let detFail = 0
if (JSON.stringify(historyRun(BASE)) !== JSON.stringify(days)) { detFail++; fail('同入参两次历史日运结果不一致') }
console.log(detFail === 0
  ? '✓ 确定性：同入参两次重算结果逐字一致（零随机、零 IO）'
  : '✗ 确定性断言失败')

// ---------- ⑤ 路由接线 ----------
console.log('—— ⑤ /api/member/summary 路由接线 ——')
let routeFail = 0
const route = readFileSync(new URL('../src/app/api/member/summary/route.ts', import.meta.url), 'utf8')
if (!/dailyFor\s*\(/.test(route)) { routeFail++; fail('summary 路由未用 dailyFor 算历史日运') }
if (!/canView\s*\(\s*ent\s*,\s*['"]history['"]/.test(route)) { routeFail++; fail("summary 路由缺 canView(ent,'history') 门禁") }
if (/console\.log\s*\(/.test(route)) { routeFail++; fail('summary 路由残留 console.log（应为 console.error）') }
console.log(routeFail === 0
  ? "✓ 路由接线：summary 用 dailyFor 重算历史 + canView(ent,'history') 门禁"
  : `✗ 路由接线缺失 ${routeFail} 处`)

// ---------- 牙口自检 ----------
console.log('—— 牙口自检 ——')
let toothFail = 0
// 伪造时间线（每天返回同一日期）必须被 ① 检出——样本证明
const fakeDays = Array.from({ length: DAYS }, () => '2026-10-18')
if (new Set(fakeDays).size === fakeDays.length) { toothFail++; fail('牙口：伪造同日时间线未被识别') }
if (!/dailyFor\s*\(/.test('dailyFor(zone, facts, d)')) { toothFail++; fail('牙口：dailyFor 调用样本未检出') }
if (!/canView\s*\(\s*ent\s*,\s*['"]history['"]/.test("canView(ent, 'history')")) { toothFail++; fail('牙口：canView history 样本未检出') }
console.log(toothFail === 0
  ? '✓ 牙口自检：伪造同日时间线可识别；dailyFor / canView 判据样本可检出'
  : '✗ 牙口自检失败')

console.log('\n' + (allPass ? 'HISTORY_DAILY_PASS' : 'HISTORY_DAILY_FAIL'))
if (!allPass) process.exit(1)
