// 回归用例自测：1991-04-12 03:10 男（辛未 壬辰 壬子 壬寅）
// 验收：己丑运须 财运滞/事业平，出现"忌杠杆投机"，绝不出"大吉"
import { paipan, getWangShuai, getGeJu } from '../src/lib/paipan.ts'
import { generateAnalysis } from '../src/lib/analysis.ts'

const chart = paipan({ year: 1991, month: 4, day: 12, hour: 3, minute: 10, gender: 1 })
chart.analysis = { wangShuai: getWangShuai(chart), geJu: getGeJu(chart), isPaid: true }
const a = generateAnalysis(chart)

console.log('=== 命局 ===')
console.log('四柱:', chart.pillars.year.ganZhi, chart.pillars.month.ganZhi, chart.pillars.day.ganZhi, chart.pillars.hour.ganZhi)
console.log('日主:', chart.dayMaster, '旺衰:', chart.analysis.wangShuai, '格局:', chart.analysis.geJu)

const lc = a.luckCycles
let pass = true
const allText = JSON.stringify(a) 

// 硬门槛1：不得出现"大吉"
if (allText.includes('大吉')) { console.log('\n✗ 仍出现"大吉"'); pass = false } else { console.log('\n✓ 无"大吉"字样') }
// 不得出现鼓励进攻措辞
if (allText.includes('积极进取') || allText.includes('突破性进展')) { console.log('✗ 仍含鼓励进攻措辞'); pass = false } else { console.log('✓ 无"积极进取/突破性进展"措辞') }

console.log('\n=== 大运逐运（含结构病与分维度） ===')
for (const dy of lc.daYun) {
  console.log(`\n${dy.startAge}岁(${dy.startYear}-${dy.endYear}) ${dy.ganZhi}  tag=${dy.tag}${dy.current ? ' ←当前' : ''}`)
  console.log(`  十神: 干=${dy.shiShenGan} 支=${dy.shiShenZhi}`)
  if (dy.structuralIssues.length) console.log('  结构病: ' + dy.structuralIssues.join('；'))
  console.log(`  事业【${dy.domains.career.tendency}】${dy.domains.career.note}`)
  console.log(`  财运【${dy.domains.wealth.tendency}】${dy.domains.wealth.note}`)
}

// 回归用例核心：找己丑运
const jichou = lc.daYun.find(d => d.ganZhi === '己丑')
console.log('\n=== 己丑运回归校验 ===')
if (!jichou) { console.log('✗ 未找到己丑运'); pass = false }
else {
  console.log(`己丑运 tag=${jichou.tag}`)
  console.log(`事业倾向=${jichou.domains.career.tendency}  财运倾向=${jichou.domains.wealth.tendency}`)
  const jt = JSON.stringify(jichou)
  if (jichou.tag === '大吉') { console.log('✗ 己丑运仍判大吉'); pass = false } else { console.log('✓ 己丑运非大吉') }
  if (jichou.domains.wealth.tendency !== '滞') { console.log('✗ 财运未判滞'); pass = false } else { console.log('✓ 财运判滞') }
  if (jichou.domains.career.tendency !== '平') { console.log('✗ 事业未判平'); pass = false } else { console.log('✓ 事业判平') }
  if (!jt.includes('忌') || !(jt.includes('杠杆') || jt.includes('投机'))) { console.log('✗ 未出现"忌杠杆投机"类警示'); pass = false } else { console.log('✓ 出现"忌杠杆投机"类警示') }
  for (const k of ['印化', '比劫', '深藏', '冲']) {
    if (jt.includes(k)) console.log(`✓ 含结构病要素「${k}」`)
  }
}

// 流月不得有"大吉/吉"
console.log('\n=== 流月标签校验 ===')
const yueTags = [...new Set(lc.liuYue.map(m => m.tag))]
console.log('流月标签集合:', yueTags.join('、'))
if (lc.liuYue.some(m => ['大吉', '吉'].includes(m.tag))) { console.log('✗ 流月仍有吉标签'); pass = false } else { console.log('✓ 流月无"大吉/吉"') }

console.log('\n' + (pass ? 'SELFTEST_PASS' : 'SELFTEST_FAIL'))
