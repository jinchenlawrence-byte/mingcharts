/**
 * 合婚引擎 · 三柱模式验收（2026-11-11）
 * 覆盖四条硬约束：
 *  ① 三柱模式不得返回 level / delta（是 undefined，不是 0、不是 '平'）
 *  ② 三柱盘时柱为 null，且不被任何默认时刻伪造
 *  ③ 三柱模式 overall / grade / totalScore / gradeLabel 一律 null
 *  ④ 四柱模式行为不变（回归）
 * 运行：npx tsx scripts/test-hemun-threepillar.mjs
 */
import { hehun, DIM_REQUIRES } from '../src/lib/hemun.ts'

let fail = 0
const ok = (cond, msg) => {
  if (cond) { console.log('  PASS ' + msg) } else { console.log('  FAIL ' + msg); fail++ }
}

function chart({ year, month, day, hour = null, dm, gender = 1 }) {
  return {
    dayMaster: dm,
    input: { gender },
    lunarDate: '',
    pillars: {
      year: { gan: year[0], zhi: year[1], ganZhi: year },
      month: { gan: month[0], zhi: month[1], ganZhi: month },
      day: { gan: day[0], zhi: day[1], ganZhi: day },
      hour: hour ? { gan: hour[0], zhi: hour[1], ganZhi: hour } : null,
    },
    analysis: { wangShuai: '身弱', geJu: '正官格' },
  }
}

// 男方：甲子 丙寅 戊午（时柱未知）；女方：己巳 丁卯 庚子（时柱未知）
const male3 = chart({ year: '甲子', month: '丙寅', day: '戊午', dm: '戊' })
const female3 = chart({ year: '己巳', month: '丁卯', day: '庚子', dm: '庚', gender: 0 })
const r3 = hehun(male3, female3, new Date('2026-11-11'))

console.log('\n① 三柱模式：依赖时柱的维度不得有 level/delta')
const hourDims = r3.dimensions.filter(d => (DIM_REQUIRES[d.key] ?? []).includes('hour'))
ok(hourDims.length === 5, `依赖时柱的维度数量 = ${hourDims.length}（期望 5：配偶星/五行互补/婚姻宫/十神互见/大运同步）`)
for (const d of hourDims) {
  ok(d.status === 'skipped_missing_hour', `${d.key} 状态为 skipped_missing_hour（实际 ${d.status}）`)
  ok(!('level' in d) && d.level === undefined, `${d.key} 无 level 字段${d.level === undefined ? '' : '（实际 ' + String(d.level) + '）'}`)
  ok(!('delta' in d) && d.delta === undefined, `${d.key} 无 delta 字段${d.delta === undefined ? '' : '（实际 ' + String(d.delta) + '）'}`)
  ok(typeof d.reason === 'string' && d.reason.length > 0, `${d.key} 带 reason 说明`)
}

console.log('\n② 三柱盘：时柱必须为 null，且不被 12:00 伪造')
ok(male3.pillars.hour === null, '输入盘时柱保持 null')
ok(r3.male.ganZhi.hour === '', `输出 brief.hour 为空字符串（实际 "${r3.male.ganZhi.hour}"）`)
ok(!JSON.stringify(r3).includes('午时'), '结果中不含任何伪造的午时描述')
const calculated3 = r3.dimensions.filter(d => d.status === 'calculated')
ok(calculated3.length === 5, `三柱可算维度 = ${calculated3.length}（生肖/年柱/纳音/日柱/配偶星透干）`)

console.log('\n③ 三柱模式：总分相关字段一律 null')
for (const k of ['overall', 'grade', 'totalScore', 'gradeLabel']) {
  ok(r3[k] === null, `${k} 为 null${r3[k] === null ? '' : '（实际 ' + String(r3[k]) + '）'}`)
}
ok(r3.mode === 'three-pillar', `mode = ${r3.mode}`)
ok(Array.isArray(r3.missingPillars) && r3.missingPillars.includes('hour'), 'missingPillars 含 hour')

console.log('\n④ 四柱模式回归')
const male4 = chart({ year: '甲子', month: '丙寅', day: '戊午', hour: '庚申', dm: '戊' })
const female4 = chart({ year: '己巳', month: '丁卯', day: '庚子', hour: '丙子', dm: '庚', gender: 0 })
const r4 = hehun(male4, female4, new Date('2026-11-11'))
ok(r4.mode === 'four-pillar', `mode = ${r4.mode}`)
ok(r4.missingPillars.length === 0, 'missingPillars 为空')
ok(r4.dimensions.every(d => d.status === 'calculated'), '全部维度均为 calculated')
ok(r4.dimensions.every(d => typeof d.level === 'string' && typeof d.delta === 'number'), '全部维度均有 level 与 delta')
ok(typeof r4.totalScore === 'number' && r4.totalScore >= 0 && r4.totalScore <= 100, `totalScore 为数字（${r4.totalScore}）`)
ok(typeof r4.overall === 'string' && r4.overall.length > 0, `overall 非空（${r4.overall}）`)
ok(r4.male.ganZhi.hour === '庚申', `brief.hour 正确（${r4.male.ganZhi.hour}）`)

console.log(fail === 0 ? '\nRESULT: PASS（全部断言通过）' : `\nRESULT: FAIL（${fail} 条断言失败）`)
process.exit(fail === 0 ? 0 : 1)
