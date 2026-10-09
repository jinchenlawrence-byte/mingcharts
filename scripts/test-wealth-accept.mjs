// §3.4 财运维度验收：1991-04-12 03:10 男（辛未 壬辰 壬子 壬寅）
// ① 带财星大运的财运倾向 ≠ 无财星大运
// ② 丁亥/丙戌 措辞体现「财现但易破」
// ③ 己丑运仍须 财运滞、事业平、出现"忌杠杆投机"
// ④ 不得回退"大吉"
import { paipan, getWangShuai, getGeJu } from '../src/lib/paipan.ts'
import { generateAnalysis } from '../src/lib/analysis.ts'

const chart = paipan({ year: 1991, month: 4, day: 12, hour: 3, minute: 10, gender: 1 })
chart.analysis = { wangShuai: getWangShuai(chart), geJu: getGeJu(chart), isPaid: true }
const a = generateAnalysis(chart)
const dy = a.luckCycles.daYun

let pass = true
const check = (cond, msg) => { console.log((cond ? '✓ ' : '✗ ') + msg); if (!cond) pass = false }

check(!JSON.stringify(a).includes('大吉'), '全分析无「大吉」字样')

console.log('\n=== 九步大运财运/事业 ===')
for (const d of dy) {
  console.log(`${d.ganZhi}（${d.shiShenGan}/${d.shiShenZhi}）: 事业${d.domains.career.tendency} 财运${d.domains.wealth.tendency}`)
}

// 定位各运
const find = (gz) => dy.find((d) => d.ganZhi === gz)
const dinghai = find('丁亥')
const bingxu = find('丙戌')
const jichou = find('己丑')
const wuCaiYuns = dy.filter((d) =>
  !['正财', '偏财'].includes(d.shiShenGan) && !['正财', '偏财'].includes(d.shiShenZhi))

console.log('\n=== ① 带财星 vs 无财星 倾向区分 ===')
check(dinghai && dinghai.domains.wealth.tendency === '平', `丁亥（正财透干）财运倾向=平（实际：${dinghai?.domains.wealth.tendency}）`)
check(bingxu && bingxu.domains.wealth.tendency === '平', `丙戌（偏财透干）财运倾向=平（实际：${bingxu?.domains.wealth.tendency}）`)
check(wuCaiYuns.every((d) => d.domains.wealth.tendency === '滞'), `无财星大运（${wuCaiYuns.map(d=>d.ganZhi).join('/')}）财运皆滞`)
check(dinghai.domains.wealth.tendency !== wuCaiYuns[0].domains.wealth.tendency, '带财星与无财星倾向确实不同')

console.log('\n=== ② 丁亥/丙戌 措辞「财现但易破」 ===')
for (const [name, d] of [['丁亥', dinghai], ['丙戌', bingxu]]) {
  const n = d.domains.wealth.note
  const hasXian = n.includes('财') && (n.includes('现') || n.includes('机会') || n.includes('显现'))
  const hasPo = n.includes('破') || n.includes('耗')
  console.log(`${name}: ${n}`)
  check(hasXian && hasPo, `${name} 措辞含「财现/机会」且含「破/耗」`)
}

console.log('\n=== ③ 己丑运回归（正确结论不动） ===')
check(jichou.domains.wealth.tendency === '滞', `己丑财运=滞（实际：${jichou.domains.wealth.tendency}）`)
check(jichou.domains.career.tendency === '平', `己丑事业=平（实际：${jichou.domains.career.tendency}）`)
const jt = JSON.stringify(jichou)
check(jt.includes('忌') && (jt.includes('杠杆') || jt.includes('投机')), '己丑运出现「忌杠杆投机」类警示')

console.log('\n=== 财运 note 区分度 ===')
const uniq = [...new Set(dy.map((d) => d.domains.wealth.note))]
console.log(`去重后财运文案 ${uniq.length} 种（原 2 种）`)
check(uniq.length >= 3, '财运文案 ≥3 种，区分度恢复')

console.log('\n' + (pass ? 'WEALTH_ACCEPT_PASS' : 'WEALTH_ACCEPT_FAIL'))
