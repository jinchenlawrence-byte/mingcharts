// 四柱干支自洽验收（P0-子时换日四柱矛盾 §5.3；总纲 §8.5/§8.6）
//
// ★ 判据与流派无关：只用「输出的柱自己」按硬规矩互相校验，抓的是【四柱彼此矛盾】——
//   无论换日约定是晚子时(23:00)还是早子时(00:00)，下列两式都必须成立。
//
//   ① 五鼠遁（日→时）：时干由日干唯一决定
//        甲己日起甲子、乙庚丙子、丙辛戊子、丁壬庚子、戊癸壬子
//        hourGanIdx = (dayGanIdx%5*2 + hourZhiIdx) % 10
//   ② 五虎遁（年→月）：月干由年干唯一决定
//        甲己年起丙寅、乙庚戊寅、丙辛庚寅、丁壬壬寅、戊癸甲寅
//        monthGanIdx = (yearGanIdx%5*2 + 2 + (monthZhiIdx-2)) % 10
import { paipan } from '../src/lib/paipan.ts'

const GAN = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸']
const ZHI = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥']
const ganIdx = (g) => GAN.indexOf(g)
const zhiIdx = (z) => ZHI.indexOf(z)

// ── 纯校验函数（脱离 paipan，便于牙口测试）──
/** 五鼠遁：给定日干、时柱，返回 true＝自洽 */
function wuShu(dayGan, hourGan, hourZhi) {
  const expect = (ganIdx(dayGan) % 5 * 2 + zhiIdx(hourZhi)) % 10
  return ganIdx(hourGan) === expect
}
/** 五虎遁：给定年干、月柱，返回 true＝自洽 */
function wuHu(yearGan, monthGan, monthZhi) {
  const n = (zhiIdx(monthZhi) - 2 + 12) % 12   // 相对寅月的偏移
  const expect = (ganIdx(yearGan) % 5 * 2 + 2 + n) % 10
  return ganIdx(monthGan) === expect
}

let allPass = true
const fail = (msg) => { allPass = false; console.log('  ✗ ' + msg) }

// ── 全量时刻扫描：多日期 × 48 时刻（每小时 :00/:30）──
// 日期刻意覆盖：普通日、立春前夕、夏至、闰日、用户本命日、春分
const DAYS = [
  [2026, 1, 6], [2026, 1, 7], [2026, 2, 3], [2026, 6, 15],
  [2024, 2, 29], [1991, 4, 12], [2026, 3, 20]
]
let wsBad = [], whBad = [], total = 0
for (const [y, m, d] of DAYS) {
  for (let h = 0; h < 24; h++) {
    for (const mi of [0, 30]) {
      const r = paipan({ year: y, month: m, day: d, hour: h, minute: mi, gender: 1 })
      const p = r.pillars
      total++
      if (!wuShu(p.day.gan, p.hour.gan, p.hour.zhi)) {
        wsBad.push(`${y}-${m}-${d} ${h}:${String(mi).padStart(2, '0')} 日${p.day.ganZhi} 时${p.hour.ganZhi}`)
      }
      if (!wuHu(p.year.gan, p.month.gan, p.month.zhi)) {
        whBad.push(`${y}-${m}-${d} ${h}:${String(mi).padStart(2, '0')} 年${p.year.ganZhi} 月${p.month.ganZhi}`)
      }
    }
  }
}

// 修复前：五鼠遁在 23:00–23:59 必然失败（每日期 2 处）；修复后 0 处。
// ★ 牙口关键：判据必须【严格为 0】，不允许「只有 23 点的少数例外」——
//   流派无关意味着任何例外都不是流派差异，而是矛盾。
if (wsBad.length === 0) {
  console.log(`✓ 五鼠遁：${total} 个时刻，日干推时干 100% 自洽（23 点无例外）`)
} else {
  console.log(`✗ 五鼠遁 ${wsBad.length}/${total} 个时刻矛盾：`)
  for (const s of wsBad.slice(0, 14)) console.log('    ' + s)
  fail('日柱与时柱违反五鼠遁')
}
console.log(whBad.length === 0
  ? `✓ 五虎遁：${total} 个时刻，年干推月干 100% 自洽`
  : `✗ 五虎遁 ${whBad.length} 处矛盾：` + whBad.slice(0, 8).join('；'))
if (whBad.length) fail('年柱与月柱违反五虎遁')

// ── 判据牙口自检（§8.6）：坏柱必被判红、好柱必放行 ──
// 若校验函数对「日干被替换」也放行，说明它只是死值比较、无判别力。
let tooth = 0
// 庚日 子时：五鼠遁应为丙子时。坏样本（时干戊）必判 false；原始硬规矩必 true。
if (wuShu('庚', '戊', '子')) { tooth++; fail('五鼠遁牙口：庚日戊子时未判矛盾') }
if (!wuShu('庚', '丙', '子')) { tooth++; fail('五鼠遁牙口：庚日丙子时被误判') }
// 乙年 寅月：五虎遁应为戊寅月。换月干庚 → 必 false；原始必 true。
if (wuHu('乙', '庚', '寅')) { tooth++; fail('五虎遁牙口：乙年庚寅月未判矛盾') }
if (!wuHu('乙', '戊', '寅')) { tooth++; fail('五虎遁牙口：乙年戊寅月被误判') }
// 五鼠遁公式闭合：甲日十二时支推出的时干，前 10 支须为十干不重复
const hourGans = ZHI.map((z) => GAN[(ganIdx('甲') % 5 * 2 + zhiIdx(z)) % 10])
if (new Set(hourGans.slice(0, 10)).size !== 10) { tooth++; fail('五鼠遁甲日十干不闭合') }
// 五虎遁公式闭合：甲年 寅→丑 十二月干须十干齐备
const monthGans = ZHI.map((z) => GAN[(ganIdx('甲') % 5 * 2 + 2 + ((zhiIdx(z) - 2 + 12) % 12)) % 10])
if (new Set(monthGans).size !== 10) { tooth++; fail('五虎遁甲年十二月十干不齐备') }
console.log(tooth === 0
  ? `✓ 判据牙口：坏干必红、硬规矩必绿（4 拦截 4 放行 ＋ 五鼠/五虎十干闭合）`
  : '✗ 判据牙口失效')

console.log('\n' + (allPass ? 'GANZHI_CONSISTENCY_PASS' : 'GANZHI_CONSISTENCY_FAIL'))
if (!allPass) process.exit(1)
