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

// 硬门槛1：B/C 两类禁用词（积极进取/突破性进展）绝不可出现
// ★ 7 档判词启用后「大吉」是合法判词（A 类移出拦截），不再全文禁「大吉」——
//   改为断言：大运/流年 tag 全部落在 7 档集合内（无越界标签）
const FORTUNE_TIERS = ['大吉', '吉', '小吉', '平', '小凶', '凶', '大凶']
const dyTags = lc.daYun.map(d => d.tag), lnTags = lc.liuNian.map(y => y.tag)
if (dyTags.concat(lnTags).every(t => FORTUNE_TIERS.includes(t))) { console.log('\n✓ 大运/流年 tag 均在 7 档集合内') }
else { console.log('\n✗ 大运/流年 tag 越界：' + dyTags.concat(lnTags).filter(t => !FORTUNE_TIERS.includes(t)).join('、')); pass = false }
// 不得出现鼓励进攻措辞（C 类行动指令，事故 18 致害者）
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
  // ★ 事故 18 纪律的新形态（任务20 方案 ii 拍板更新）：己丑运有 ≥2 个结构病 → cap=1 → tag 最高「小吉」。
  //   精确钉死「小吉」：score=2 被 cap=1 压到 s=1 → 小吉；若 cap 被进一步放宽到 2 会给「吉」→ 翻红。
  //   （旧规 cap=0 最高「平」已被方案 ii 取代：纯放宽，负向/大凶不变；梯度保留——病越多评价越低）
  if (jichou.tag !== '小吉') { console.log(`✗ 己丑运（${jichou.structuralIssues.length}个结构病）tag=${jichou.tag}，期望「小吉」（cap=1 封顶）`); pass = false } else { console.log(`✓ 己丑运（${jichou.structuralIssues.length}个结构病）封顶「小吉」（方案 ii：多重结构病仍被压制，不及其上「吉」）`) }
  if (jichou.domains.wealth.tendency !== '滞') { console.log('✗ 财运未判滞'); pass = false } else { console.log('✓ 财运判滞') }
  if (jichou.domains.career.tendency !== '平') { console.log('✗ 事业未判平'); pass = false } else { console.log('✓ 事业判平') }
  if (!jt.includes('忌') || !(jt.includes('杠杆') || jt.includes('投机'))) { console.log('✗ 未出现"忌杠杆投机"类警示'); pass = false } else { console.log('✓ 出现"忌杠杆投机"类警示') }
  for (const k of ['印化', '比劫', '深藏', '冲']) {
    if (jt.includes(k)) console.log(`✓ 含结构病要素「${k}」`)
  }
}

// 流月红线：只用「较宜/一般/宜慎」三档，7 档判词一律不得出现
console.log('\n=== 流月标签校验 ===')
const yueTags = [...new Set(lc.liuYue.map(m => m.tag))]
console.log('流月标签集合:', yueTags.join('、'))
const LIUYUE_TAGS = ['较宜', '一般', '宜慎']
if (lc.liuYue.every(m => LIUYUE_TAGS.includes(m.tag))) { console.log('✓ 流月仅用三档（7 档判词未越界）') } else { console.log('✗ 流月出现三档外标签：' + yueTags.filter(t => !LIUYUE_TAGS.includes(t)).join('、')); pass = false }

console.log('\n' + (pass ? 'SELFTEST_PASS' : 'SELFTEST_FAIL'))
