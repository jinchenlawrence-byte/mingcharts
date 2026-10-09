// 离线验收：真太阳时全球时区修复（纯本地、不耗 API，纳入 npm run verify）
// 对应任务书 §6：6.1 符号自检、6.2 真太阳时对表、6.3 ★端到端（修复真的接进 paipan 输出）
import { Solar } from 'lunar-javascript'
import {
  getUtcOffsetHours, trueSolarOffsetMinutes, toTrueSolarTime,
  checkDSTTransition, isValidZone, resolveBirthRef
} from '../src/lib/solarTime.ts'
import { paipan } from '../src/lib/paipan.ts'
import { paipanZiwei } from '../src/lib/ziwei.ts'

let failures = 0
const check = (ok, line) => {
  if (!ok) failures++
  console.log(`  ${ok ? '✓' : '✗'} ${line}`)
}

// 时辰地支：hour 23→子；index = floor((hour+1)/2) % 12
const ZHI12 = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']
const hourZhi = (h) => ZHI12[Math.floor((h + 1) / 2) % 12]
const hhmm = (r) => `${String(r.hour).padStart(2, '0')}:${String(r.minute).padStart(2, '0')}`

// ========== 6.1 符号自检（最容易踩的坑；写反符号这里立刻翻红） ==========
console.log('\n====== 6.1 UTC 偏移符号自检（东正西负） ======')
const OFFSET_CASES = [
  ['Asia/Shanghai', 1990, 1, 15, 8],
  ['Asia/Shanghai', 1988, 7, 1, 9],          // 中国 1988 年夏令时
  ['America/New_York', 1990, 1, 15, -5],
  ['America/New_York', 1990, 7, 1, -4],      // 北美夏令时
  ['America/Los_Angeles', 1990, 7, 1, -7],
  ['America/Vancouver', 1990, 1, 15, -8],
]
for (const [zone, y, m, d, expect] of OFFSET_CASES) {
  const got = getUtcOffsetHours(zone, { year: y, month: m, day: d, hour: 14, minute: 30 })
  check(got === expect, `${zone} ${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')} → ${got}（期望 ${expect}）`)
}

// ========== 6.2 真太阳时用例（照任务书 §2.3 对表） ==========
console.log('\n====== 6.2 真太阳时校正对表 ======')
const SOLAR_CASES = [
  // zone, lng, 钟表时刻, 期望真太阳时 HH:MM, 期望时辰
  ['America/New_York', -74.0, { year: 1990, month: 7, day: 1, hour: 14, minute: 30 }, '13:34', '未'],
  ['America/New_York', -74.0, { year: 1990, month: 1, day: 15, hour: 14, minute: 30 }, '14:34', '未'],
  ['America/Los_Angeles', -118.2, { year: 1990, month: 7, day: 1, hour: 14, minute: 30 }, '13:37', '未'],
  ['America/Vancouver', -123.1, { year: 1990, month: 1, day: 15, hour: 8, minute: 30 }, '08:18', '辰'],
  ['Asia/Shanghai', 116.4, { year: 1990, month: 1, day: 15, hour: 14, minute: 30 }, '14:16', '未'],
  ['Asia/Shanghai', 121.5, { year: 1990, month: 1, day: 15, hour: 14, minute: 30 }, '14:36', '未'],
  ['Asia/Shanghai', 116.4, { year: 1988, month: 7, day: 1, hour: 14, minute: 30 }, '13:16', '未'], // 中国夏令时
]
for (const [zone, lng, when, expectTime, expectZhi] of SOLAR_CASES) {
  const r = toTrueSolarTime(zone, lng, when)
  check(hhmm(r) === expectTime && hourZhi(r.hour) === expectZhi,
    `${zone.split('/')[1]} ${when.year}-${when.month}-${when.day} ${String(when.hour).padStart(2, '0')}:${String(when.minute).padStart(2, '0')} @ ${lng} → ${hhmm(r)} ${hourZhi(r.hour)}时（期望 ${expectTime} ${expectZhi}时，偏移 ${r.offsetMin >= 0 ? '+' : ''}${r.offsetMin}）`)
}

// ========== 6.3 ★ 端到端：修复必须真的传导到 paipan() 的四柱输出 ==========
console.log('\n====== 6.3 端到端：纽约命盘四柱（防「改了偏移却没接进排盘链路」） ======')
const whenNY = { year: 1990, month: 7, day: 1, hour: 14, minute: 30 }
// 被修对象：走完整 paipan，内部按 zone+tzdata 解析
const fixed = paipan({ ...whenNY, gender: 1, birthLng: -74.0, birthZone: 'America/New_York' })
// 独立期望路径：直接用 13:34（未时）问 lunar-javascript
const expectedHourGZ = Solar.fromYmdHms(1990, 7, 1, 13, 34, 0).getLunar().getEightChar().getTime()
// 旧 bug 结果：01:34（丑时）
const bugHourGZ = paipan({ ...whenNY, hour: 1, minute: 34, gender: 1 }).pillars.hour.ganZhi
// 日期不变：日柱仍是 1990-07-01
const expectedDayGZ = Solar.fromYmdHms(1990, 7, 1, 12, 0, 0).getLunar().getEightChar().getDay()

check(fixed.timezoneOffsetApplied === -56, `实际生效偏移 ${fixed.timezoneOffsetApplied} 分（期望 -56）`)
check(fixed.pillars.hour.ganZhi === expectedHourGZ,
  `时柱 ${fixed.pillars.hour.ganZhi} ＝ 13:34 未时推算值 ${expectedHourGZ}`)
check(fixed.pillars.hour.ganZhi !== bugHourGZ,
  `时柱 ${fixed.pillars.hour.ganZhi} ≠ 旧 bug 的 01:34 丑时值 ${bugHourGZ}`)
check(fixed.pillars.day.ganZhi === expectedDayGZ,
  `日柱 ${fixed.pillars.day.ganZhi}（日期未变，期望 ${expectedDayGZ}）`)

// 紫微链路同样验证（任务书 §3：紫微也用真太阳时）
console.log('\n====== 6.3b 端到端：紫微·温哥华命盘时辰随修复改变 ======')
const zwFixed = paipanZiwei(
  { year: 1990, month: 1, day: 15, hour: 8, minute: 30, gender: 1, birthLng: -123.1, birthZone: 'America/Vancouver' }
)
// 旧算法偏移 -972 分 → 1990-01-14 16:18（申时）
const zwBug = paipanZiwei(
  { year: 1990, month: 1, day: 15, hour: 8, minute: 30, gender: 1, timezoneOffset: -972 }
)
const fixedMing = zwFixed.palaces[zwFixed.mingIndex].majorStars.map(s => s.name).join('、')
const bugMing = zwBug.palaces[zwBug.mingIndex].majorStars.map(s => s.name).join('、')
check(zwFixed.timezoneOffsetApplied === -12, `紫微实际生效偏移 ${zwFixed.timezoneOffsetApplied} 分（期望 -12）`)
check(fixedMing !== bugMing, `命宫主星随时辰改变：修复「${fixedMing}」≠ 旧bug「${bugMing}」`)

// ========== §二 仅时区路径：标准中央经线自动剥夏令时（用户已验证 6/6 的算法） ==========
//
// 背景：「其它」路径用户只选时区、不给经度。旧逻辑 resolveBirthRef 对仅 zone 返回 null
//   → 偏移 0，夏令时日内差 60 分钟。现经度取标准中央经线 min(1月,7月偏移)×15，
//   使公式 (stdLng − 当时偏移×15)×4 在 DST 日恰好 −60 分。
//
// ★ 下列四组 DST 用例的日期刻意落在夏令时期间——搬到冬天会无声通过（偏移变 0），
//   故每组配「牙口自检」：旧逻辑（偏移 0）的时柱必须与剥 DST 后不同。
console.log('\n====== §二 仅时区：六组对表（DST 日期 + 牙口自检） ======')
// [zone, 出生日期, 期望校正分钟, 期望标准经线经度]
const ZONE_ONLY_CASES = [
  ['America/New_York',    { year: 1990, month: 7, day: 15 }, -60, -75],   // 北美夏令时
  ['America/New_York',    { year: 1990, month: 1, day: 15 }, 0, -75],     // 冬季
  ['America/Los_Angeles', { year: 1990, month: 7, day: 15 }, -60, -120],
  ['Asia/Shanghai',       { year: 1990, month: 1, day: 15 }, 0, 120],
  ['Asia/Shanghai',       { year: 1988, month: 7, day: 15 }, -60, 120],   // 中国 1986–91 夏令时
  ['Australia/Sydney',    { year: 1990, month: 1, day: 15 }, -60, 150],   // 南半球夏季 DST
]
for (const [zone, d, expectOff, expectStd] of ZONE_ONLY_CASES) {
  // 时刻刻意取 13:30（未时）：−60 后 12:30（午时），跨时辰，牙口成立
  const when = { ...d, hour: 13, minute: 30 }
  const ref = resolveBirthRef({ manualZone: zone, when })
  const tag = `${zone.split('/').pop()} ${when.year}-${String(when.month).padStart(2, '0')}-${when.day}`

  check(ref !== null && ref.lng === expectStd && ref.zone === zone,
    `${tag}：标准经线 ${ref?.lng}°（期望 ${expectStd}°）`)

  const off = ref ? trueSolarOffsetMinutes(ref.lng, zone, when) : 0
  check(off === expectOff,
    `${tag} 13:30：真太阳时校正 ${off} 分（期望 ${expectOff}）`)

  // 牙口自检：与旧逻辑（仅时区→偏移 0）对比时柱
  const corrected = paipan({ ...when, gender: 1, birthLng: ref.lng, birthZone: zone })
  const oldBug = paipan({ ...when, gender: 1 })
  if (expectOff !== 0) {
    check(corrected.pillars.hour.ganZhi !== oldBug.pillars.hour.ganZhi,
      `牙口自检：剥 DST 时柱 ${corrected.pillars.hour.ganZhi} ≠ 旧逻辑 ${oldBug.pillars.hour.ganZhi}（日期若改成冬天此自检即翻红）`)
  } else {
    check(corrected.pillars.hour.ganZhi === oldBug.pillars.hour.ganZhi,
      `非 DST 日期：校正 0 分，时柱 ${corrected.pillars.hour.ganZhi} 与不校正一致`)
  }
}

// ========== §1.5 全年夏令时（战时时间）：固定参考年 vs 出生年 ==========
//
// ★ 日期是刻意选的（§8.6.1）：1942-02-09 ~ 1945-09-30 美国「战时时间」全年 UTC−4
//   无冬季回落（纽约标准本应 −5）；英国二战双夏令时 1943 夏季 +2（标准 0）。
//   这三条是「全年夏令时」这一唯一能区分【固定参考年】与【出生年】两种
//   推算基准的场景 —— 改成普通年份（或把参考年改回出生年）牙口即失。
//   牙口自检（§8.6.1）：断言「按出生年推算时结果与期望不同」，
//   防后人把 STD_REF_YEAR 改回出生年而无声退化。
//   te:true = 出生年法必异（有牙）；te:false = 零回归用例（两法本就一致）。
const WARTIME_CASES = [
  { zone: 'America/New_York',    y: 1943, m: 7, te: true,  off: -60,  std: -75 },
  { zone: 'America/Chicago',     y: 1943, m: 7, te: true,  off: -60,  std: -90 },
  { zone: 'Europe/London',       y: 1943, m: 7, te: true,  off: -120, std: 0 },
  { zone: 'America/New_York',    y: 1944, m: 7, te: true,  off: -60,  std: -75 },
  { zone: 'Australia/Adelaide',  y: 1990, m: 1, te: false, off: -60,  std: 142.5 }, // 半小时时区×南半球
]
console.log('\n====== §1.5 全年夏令时（战时）：固定参考年 5 例 ======')
for (const c of WARTIME_CASES) {
  const when = { year: c.y, month: c.m, day: 15, hour: 13, minute: 30 }
  const tag = `${c.zone.split('/').pop()} ${c.y}-${String(c.m).padStart(2, '0')}`
  const ref = resolveBirthRef({ manualZone: c.zone, when })
  check(ref !== null && ref.lng === c.std && ref.zone === c.zone,
    `${tag}：标准经线 ${ref?.lng}°（期望 ${c.std}°，固定参考年 2020）`)

  const off = ref ? trueSolarOffsetMinutes(ref.lng, c.zone, when) : 0
  check(off === c.off, `${tag} 13:30：校正 ${off} 分（期望 ${c.off}）`)

  // 牙口自检：改用「出生年」推算时，结果必须与期望不同
  if (c.te) {
    const byProbe = (m) => getUtcOffsetHours(c.zone, { year: c.y, month: m, day: 15, hour: 12, minute: 0 })
    const byOff = trueSolarOffsetMinutes(Math.min(byProbe(1), byProbe(7)) * 15, c.zone, when)
    check(byOff !== c.off,
      `牙口自检：出生年推算法得 ${byOff} ≠ ${c.off}（若相等，此日期已无判别力，须换用例）`)
  }

  // 时柱牙口：剥 DST 后时柱 ≠ 不校正（旧 bug）
  const corrected = paipan({ ...when, gender: 1, birthLng: ref.lng, birthZone: c.zone })
  const oldBug = paipan({ ...when, gender: 1 })
  check(corrected.pillars.hour.ganZhi !== oldBug.pillars.hour.ganZhi,
    `牙口自检：校正时柱 ${corrected.pillars.hour.ganZhi} ≠ 不校正 ${oldBug.pillars.hour.ganZhi}`)
}

// ========== 附：中国非夏令时期零回归（验收标准 #4） ==========
console.log('\n====== 中国 5 城：新算法偏移 ＝ 旧算法 (lng−120)×4（非夏令时日期） ======')
const CHINA_CITIES = [
  ['北京', 116.4, -14],
  ['上海', 121.5, 6],
  ['乌鲁木齐', 87.6, -130],
  ['广州', 113.26, -27],
  ['哈尔滨', 126.5, 26],
]
const nonDst = { year: 1990, month: 1, day: 15, hour: 14, minute: 30 }
for (const [name, lng, expect] of CHINA_CITIES) {
  const got = trueSolarOffsetMinutes(lng, 'Asia/Shanghai', nonDst)
  const oldFormula = Math.round((lng - 120) * 4)
  check(got === oldFormula && got === expect,
    `${name} ${lng} → ${got} 分（旧算法 ${oldFormula}，期望 ${expect}）`)
}

// ========== 附：夏令时切换点提示（任务书 §5.3） ==========
console.log('\n====== 夏令时切换点检测（gap / 重复时刻） ======')
const gap = checkDSTTransition('America/New_York', { year: 2021, month: 3, day: 14, hour: 2, minute: 30 })
const ambiguous = checkDSTTransition('America/New_York', { year: 2021, month: 11, day: 7, hour: 1, minute: 30 })
check(gap?.kind === 'gap', `2021-03-14 02:30 → ${gap?.kind || '未检出'}（期望 gap）：${gap?.message || ''}`)
check(ambiguous?.kind === 'ambiguous', `2021-11-07 01:30 → ${ambiguous?.kind || '未检出'}（期望 ambiguous）：${ambiguous?.message || ''}`)

// ========== 附：时区合法性校验（自由填写入口的防线） ==========
console.log('\n====== IANA 时区校验 ======')
check(isValidZone('Asia/Shanghai') === true, 'Asia/Shanghai 合法')
check(isValidZone('America/New_York') === true, 'America/New_York 合法')
check(isValidZone('Mars/Phobos') === false, 'Mars/Phobos 非法')
check(isValidZone('America/Toronto2') === false, 'America/Toronto2 非法')

// ========== 汇总 ==========
console.log('\n========================================')
if (failures) {
  console.log(`SOLAR_TIME_FAIL（${failures} 项断言失败）`)
  process.exit(1)
}
console.log('SOLAR_TIME_PASS')
