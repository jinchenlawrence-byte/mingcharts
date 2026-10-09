/**
 * §5.4 自测：合婚维度字段完整性
 * 男 1990-5-8 16:30 / 女 1992-8-15 9:00
 * 校验：每维度有 basis+verdict；basis 只用四级；dayun=产品设定；year 已拆分
 */
import { paipan } from '../src/lib/paipan'
import { hehun } from '../src/lib/hemun'

const VALID_BASIS = ['典籍', '古法', '民俗', '产品设定']

const m = paipan({ year: 1990, month: 5, day: 8, hour: 16, minute: 30, gender: 1 })
const f = paipan({ year: 1992, month: 8, day: 15, hour: 9, minute: 0, gender: 0 })
const r = hehun(m as any, f as any)

let pass = true
const fail = (msg: string) => { pass = false; console.log('FAIL: ' + msg) }

console.log('=== 维度明细 ===')
for (const d of r.dimensions) {
  console.log(`${d.key} | ${d.name} | 依据:${d.basis} | ${d.level} | ${d.verdict}`)
  if (!d.basis) fail(`${d.key} 缺 basis`)
  if (!d.verdict) fail(`${d.key} 缺 verdict`)
  if (!VALID_BASIS.includes(d.basis)) fail(`${d.key} basis 非四级之一: ${d.basis}`)
}

console.log('\n=== 总观感 ===')
console.log(r.overall)
if (!r.overall) fail('缺 overall')

console.log('\n=== 关键校验 ===')
const dayun = r.dimensions.find(d => d.key === 'dayun')
if (!dayun) fail('缺 dayun 维度')
else if (dayun.basis !== '产品设定') fail(`dayun.basis 应为 产品设定，实际 ${dayun.basis}`)
else console.log('OK dayun.basis = 产品设定')

const keys = r.dimensions.map(d => d.key)
const hasOldYear = keys.includes('year')
const hasSplit = ['yearZodiac', 'yearGanZhi', 'nayin'].every(k => keys.includes(k))
if (hasOldYear) fail('旧 year 维度仍存在（应拆分为 yearZodiac/yearGanZhi/nayin）')
if (!hasSplit) fail('year 未完整拆分为 yearZodiac/yearGanZhi/nayin')
if (!hasOldYear && hasSplit) console.log('OK year 已拆分为 yearZodiac/yearGanZhi/nayin')

console.log(`\n维度总数: ${r.dimensions.length}（7 拆 9 后应为 9）`)
if (r.dimensions.length !== 9) fail(`维度数应为 9，实际 ${r.dimensions.length}`)

console.log('\n=== 内部参考（应保留但降级）===')
console.log(`totalScore=${r.totalScore} grade=${r.grade} gradeLabel=${r.gradeLabel}`)

console.log('\n' + (pass ? 'SELFTEST_PASS' : 'SELFTEST_FAIL'))
process.exit(pass ? 0 : 1)
