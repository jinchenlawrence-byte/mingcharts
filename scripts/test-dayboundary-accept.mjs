// 归日一致性验收（HANDOFF-统一晚子时 §四；P0-紫微盘重复构建 §六；总纲 §8.5/8.5.1/8.6）
//
// ★ 判据刻意写成【约定无关】：不写死「23:30 应属次日」（改约定就要改断言），
//   只断言「同一个子时的两个时刻（d 23:30 与 d+1 00:30），所有入口必须指向同一归日」——
//   无论晚子时还是早子时都成立，只抓「模块之间打架」。
//
// ★ 另含二次构建守护：带真太阳时偏移且跨时辰的案例，analyzeZiwei 的运限必须出自
//   chart 自身（chart.ziweiDateStr/TimeIndex），而不是原始 input。改回 input 必红。
import { paipan } from '../src/lib/paipan.ts'
import { paipanZiwei, analyzeZiwei } from '../src/lib/ziwei.ts'
import { liuRiOf, dailyDateInZone } from '../src/lib/daily.ts'
import { astro } from 'iztro'

let allPass = true
const fail = (msg) => { allPass = false; console.log('  ✗ ' + msg) }
const fmt = (d) => `${d.year}-${d.month}-${d.day}`

/** 在 zone 内取「目标墙钟时刻」对应的 UTC 瞬间（扫描 ±26h，DST 安全，命中唯一） */
function atLocal(zone, y, m, d, h, mi) {
  const guess = Date.UTC(y, m - 1, d, h, mi)
  for (let off = -26 * 3600000; off <= 26 * 3600000; off += 900000) {
    const t = new Date(guess + off)
    const p = new Intl.DateTimeFormat('en-US', {
      timeZone: zone, hour12: false,
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
    }).formatToParts(t)
    const g = (x) => Number(p.find((q) => q.type === x).value)
    let hh = g('hour'); if (hh === 24) hh = 0
    if (g('year') === y && g('month') === m && g('day') === d && hh === h && g('minute') === mi) return t
  }
  throw new Error(`atLocal 未命中：${zone} ${y}-${m}-${d} ${h}:${mi}`)
}

// ── 子时时刻对：[d 23:30, d+1 00:30]（窗口覆盖普通日/除夕春节/年末/闰日/DST时区）──
const NOW_PAIRS = [
  [[2026, 1, 6, 23, 30], [2026, 1, 7, 0, 30], 'Asia/Shanghai'],
  [[2026, 2, 16, 23, 30], [2026, 2, 17, 0, 30], 'Asia/Shanghai'],  // 除夕→春节
  [[2026, 12, 31, 23, 30], [2027, 1, 1, 0, 30], 'Asia/Shanghai'],
  [[2024, 2, 29, 23, 30], [2024, 3, 1, 0, 30], 'Asia/Shanghai'],
  [[2026, 7, 15, 23, 30], [2026, 7, 16, 0, 30], 'America/New_York'],  // 夏令时
  // ★ 含【整点】的子时对：'24' 只在恰好午夜出现，而此前用例两头都避开整点（§8.6.7-二）
  [[2026, 1, 6, 23, 0], [2026, 1, 7, 0, 0], 'Asia/Shanghai'],
  [[2026, 7, 15, 23, 0], [2026, 7, 16, 0, 0], 'America/New_York']
]

let pairFail = 0
for (const [m1, m2, zone] of NOW_PAIRS) {
  // ① 八字：两日柱相同
  const day1 = paipan({ year: m1[0], month: m1[1], day: m1[2], hour: m1[3], minute: m1[4], gender: 1 }).pillars.day.ganZhi
  const day2 = paipan({ year: m2[0], month: m2[1], day: m2[2], hour: m2[3], minute: m2[4], gender: 1 }).pillars.day.ganZhi
  // ② 紫微：两农历日相同（晚子时推进后同日）
  const zw1 = paipanZiwei({ year: m1[0], month: m1[1], day: m1[2], hour: m1[3], minute: m1[4], gender: 1 })
  const zw2 = paipanZiwei({ year: m2[0], month: m2[1], day: m2[2], hour: m2[3], minute: m2[4], gender: 1 })
  // ③ 日运：两归日相同（UTC 瞬间按时区还原墙钟）
  const dd1 = dailyDateInZone(zone, atLocal(zone, ...m1))
  const dd2 = dailyDateInZone(zone, atLocal(zone, ...m2))
  // ④ 跨模块同一归日：日运归日 ＝ 紫微构建日期；八字日柱 ＝ 该归日的 liuRiOf
  const crossA = fmt(dd1) === zw1.ziweiDateStr
  const crossB = day1 === liuRiOf(dd1.year, dd1.month, dd1.day).ganZhi

  const ok = day1 === day2 && zw1.lunarDate === zw2.lunarDate &&
    fmt(dd1) === fmt(dd2) && crossA && crossB
  if (!ok) {
    pairFail++
    fail(`子时对 ${m1.slice(0, 3).join('/')}23:30↔${m2.slice(0, 3).join('/')}00:30：` +
      `八字${day1}/${day2} 紫微${zw1.lunarDate}/${zw2.lunarDate} 日运${fmt(dd1)}/${fmt(dd2)} ` +
      `跨模块${crossA ? '✓' : '✗'}${crossB ? '✓' : '✗'}`)
  }
}
console.log(pairFail === 0
  ? `✓ 归日一致性（约定无关）：${NOW_PAIRS.length} 个子时时刻对，八字/紫微/日运＋跨模块四支全指向同一归日`
  : `✗ 归日一致性 ${pairFail} 对失败`)

// ── 负对照（判据自身牙口）：非子时对（d 22:30 ↔ d+1 00:30）必须【不】满足同一归日 ──
const [n1, n2] = [[2026, 1, 6, 22, 30], [2026, 1, 7, 0, 30]]
const neg1 = paipan({ year: n1[0], month: n1[1], day: n1[2], hour: n1[3], minute: n1[4], gender: 1 }).pillars.day.ganZhi
const neg2 = paipan({ year: n2[0], month: n2[1], day: n2[2], hour: n2[3], minute: n2[4], gender: 1 }).pillars.day.ganZhi
let tooth = 0
if (neg1 === neg2) { tooth++; fail('负对照：22:30 与 00:30 竟同柱，判据无判别力') }
// 坏归日函数（偏移一天）必须打破子时对 ③
const brokenDaily = (zone, now) => {
  const d = dailyDateInZone(zone, now)
  const t = new Date(Date.UTC(d.year, d.month - 1, d.day + 1))
  return { year: t.getUTCFullYear(), month: t.getUTCMonth() + 1, day: t.getUTCDate() }
}
if (fmt(brokenDaily('Asia/Shanghai', atLocal('Asia/Shanghai', ...NOW_PAIRS[0][0]))) ===
    fmt(dailyDateInZone('Asia/Shanghai', atLocal('Asia/Shanghai', ...NOW_PAIRS[0][1])))) {
  tooth++; fail('坏归日函数未被识破，③ 无牙')
}
console.log(tooth === 0
  ? '✓ 归日判据牙口：非子时对正确判异；偏移一天的坏归日函数落网'
  : '✗ 归日判据牙口失效')

// ── P0 守护：紫微二次构建（校正 vs 原始）──────────────────────────
const NOW = new Date(2026, 9, 7, 12, 0, 0)
const chart = paipanZiwei({
  year: 1991, month: 4, day: 12, hour: 3, minute: 10, gender: 1,
  birthLng: 87.6, birthZone: 'Asia/Shanghai'
})
let guard = 0
// B1 案例前提：原始与校正确实分叉（否则守护无意义）
if (chart.input.hour !== 3 || chart.ziweiTimeIndex !== 1) { guard++; fail('校正时辰未变，案例无牙') }
const rawAstro = astro.astrolabeBySolarDate('1991-4-12', 2, '男')
const rawMingStars = rawAstro.palaces.find((p) => p.name === '命宫').majorStars.map((s) => s.name).sort().join(',')
const fixMingStars = chart.palaces[chart.mingIndex].majorStars.map((s) => s.name).sort().join(',')
if (rawMingStars === fixMingStars) { guard++; fail('原始/校正盘命宫星未分叉，案例无牙') }
// B2 运限必须出自 chart 参数：固定盘大限 ≠ 原始盘大限，且 analyzeZiwei 大限 = 固定盘
const hf = astro.astrolabeBySolarDate(chart.ziweiDateStr, chart.ziweiTimeIndex, '男').horoscope(NOW)
const hr = rawAstro.horoscope(NOW)
const fixedGZ = hf.decadal.heavenlyStem + hf.decadal.earthlyBranch
const rawGZ = hr.decadal.heavenlyStem + hr.decadal.earthlyBranch
const a = analyzeZiwei(chart, NOW)
const fixedBase = chart.palaces.find((p) => p.earthlyBranch === hf.decadal.earthlyBranch).name
if (fixedGZ === rawGZ) { guard++; fail('固定/原始大限未分叉，守护无牙') }
if (a.decadal.ganZhi !== fixedGZ || a.decadal.basePalace !== fixedBase) {
  guard++; fail(`analyzeZiwei 大限 ${a.decadal.ganZhi}@${a.decadal.basePalace} 非出自 chart（应为 ${fixedGZ}@${fixedBase}）`)
}
// ★ 若入口二改回 chart.input 推导：a.decadal.ganZhi 变回 rawGZ（'戊戌'）→ 立即红
console.log(guard === 0
  ? `✓ 二次构建守护：校正/原始盘命宫星分叉；大限 ${fixedGZ} vs ${rawGZ}；analyzeZiwei 大限出自 chart 单一事实源`
  : '✗ 二次构建守护失败')

console.log('\n' + (allPass && tooth === 0 && guard === 0 ? 'DAYBOUNDARY_ACCEPT_PASS' : 'DAYBOUNDARY_ACCEPT_FAIL'))
if (!(allPass && tooth === 0 && guard === 0)) process.exit(1)
