// 阶段三验收：英文规则引擎文案层
// 1) 四个模块的英文视图零 CJK；2) 条目数与中文逐条一致；3) 牙口：注入中文必须翻红。

import { paipan, getWangShuai, getGeJu } from '../src/lib/paipan.ts'
import { hehun } from '../src/lib/hemun.ts'
import { hehunEn, ziweiEn, geoEn, liunianEn, hasCJK } from '../src/lib/enRule.ts'
import { paipanZiwei, analyzeZiwei } from '../src/lib/ziwei.ts'
import { analyzeGeo } from '../src/lib/geo.ts'
import { buildLuckCycles, getFavorSets, tiaoHouWuxing } from '../src/lib/analysis.ts'

let pass = 0
let fail = 0
function assert(cond, msg) {
  if (cond) { pass++; console.log('  ok  ' + msg) }
  else { fail++; console.log('  FAIL ' + msg) }
}
function assertNoCJK(obj, label) {
  const s = JSON.stringify(obj)
  const m = s.match(/[\u4e00-\u9fff]/)
  assert(!m, `${label} 输出零 CJK` + (m ? `（发现「${m[0]}」）` : ''))
}

function chartOf(b) {
  const c = paipan(b)
  c.analysis = { wangShuai: getWangShuai(c), geJu: getGeJu(c), isPaid: true }
  return c
}

const COUPLES = [
  [{ year: 1992, month: 9, day: 14, hour: 19, minute: 0, gender: 1 }, { year: 1995, month: 3, day: 21, hour: 10, minute: 20, gender: 0 }],
  [{ year: 1988, month: 2, day: 6, hour: 8, minute: 0, gender: 1 }, { year: 1990, month: 5, day: 8, hour: 16, minute: 30, gender: 0 }],
  [{ year: 1979, month: 12, day: 11, hour: 23, minute: 40, gender: 1 }, { year: 1983, month: 7, day: 2, hour: 5, minute: 15, gender: 0 }],
]

// ① 合婚：按【维度 key 集合】比对，不再假定中英是九维一一对应。
//
// 为什么允许数量不同（2026-11-14，三柱模式 ea593fb/a75c02e 之后）：
//   · 三柱模式会按「时辰是否可信」动态丢弃依赖时辰的维度，中英各自按同一规则裁剪，
//     但两条规则引擎的落地进度不同 —— 中文已新增「配偶星透干」（spouseStem，三柱可判），
//     英文规则引擎尚未实现，于是中文 10 维、英文 9 维。
//   · 这里只允许【已登记】的差异：英文不得凭空造维度；中文有、英文没有的，必须出现在
//     EN_MISSING_OK 里并写明原因。未登记的缺失一律翻红，防止以后新增维度漏翻英文。
const EN_MISSING_OK = {
  spouseStem: '英文规则引擎尚未实现「配偶星透干」（三柱模式新增维度），待合婚英文线补齐',
}

console.log('\n① 合婚：英文维度集合与中文对齐（允许已登记差异）')
for (const [m, f] of COUPLES) {
  const male = chartOf(m), female = chartOf(f)
  const zh = hehun(male, female)
  const en = hehunEn(male, female)
  const zhByKey = new Map(zh.dimensions.map((d) => [d.key, d]))
  const enByKey = new Map(en.dimensions.map((d) => [d.key, d]))

  const onlyEn = [...enByKey.keys()].filter((k) => !zhByKey.has(k))
  assert(onlyEn.length === 0, `英文不得出现中文没有的维度` + (onlyEn.length ? `（多出：${onlyEn.join(',')}）` : ''))
  const missing = [...zhByKey.keys()].filter((k) => !enByKey.has(k))
  const unexpected = missing.filter((k) => !(k in EN_MISSING_OK))
  assert(unexpected.length === 0, `英文仅缺已登记维度` + (unexpected.length ? `（未登记：${unexpected.join(',')}）` : ''))

  for (const [key, d] of zhByKey) {
    const e = enByKey.get(key)
    if (!e) continue
    assert(e.facts.length === d.facts.length, `${key} facts ${d.facts.length}=${e.facts.length}`)
    assert(e.tags.length === d.tags.length, `${key} tags ${d.tags.length}=${e.tags.length}`)
    assert(e.citations.length === d.citations.length, `${key} citations ${d.citations.length}=${e.citations.length}`)
  }
  assertNoCJK(en, `合婚 ${m.year}/${f.year}`)
}

console.log('\n② 紫微：英文条目数与中文一致')
for (const b of [COUPLES[0][0], COUPLES[1][0], COUPLES[2][0]]) {
  const chart = paipanZiwei(b)
  const now = new Date('2026-11-03')
  const zh = analyzeZiwei(chart, now)
  const en = ziweiEn(chart, zh, now)
  assert(zh.patterns.length === en.patterns.length, `格局 ${zh.patterns.length}=${en.patterns.length}`)
  zh.patterns.forEach((p, i) => {
    assert(en.patterns[i].required.length === (p.required ?? []).length, `格局 ${i} required 条数一致`)
  })
  assert(zh.transforms.length === en.transforms.length, `四化 ${zh.transforms.length}=${en.transforms.length}`)
  assert(Object.keys(zh.palaces).length === en.palaces.length, `十二宫 ${Object.keys(zh.palaces).length}=${en.palaces.length}`)
  assert(zh.decadal.transforms.length === en.decadal.transforms.length, `大限四化 ${zh.decadal.transforms.length}=${en.decadal.transforms.length}`)
  assert(zh.decadal.tags.length === en.decadal.tags.length, `大限标签 ${zh.decadal.tags.length}=${en.decadal.tags.length}`)
  assert(zh.yearly.stars.length === en.yearly.stars.length, `流年星曜 ${zh.yearly.stars.length}=${en.yearly.stars.length}`)
  assert(zh.yearly.tags.length === en.yearly.tags.length, `流年标签 ${zh.yearly.stars.length}=${en.yearly.tags.length}`)
  if (zh.monthly) assert(zh.monthly.tags.length === en.monthly.tags.length, `流月标签一致`)
  assertNoCJK(en, `紫微 ${b.year}`)
}

console.log('\n③ 方位：英文理由条数与中文一致')
for (const b of [COUPLES[1][0], COUPLES[2][1]]) {
  const chart = chartOf(b)
  const tiaoHou = tiaoHouWuxing(chart.dayMaster, chart.pillars.month.zhi)
  const geo = analyzeGeo({
    dayMaster: chart.dayMaster,
    wangShuai: chart.analysis.wangShuai,
    tiaoHou,
    birthplace: { name: '北京', region: '中国 北京', lat: 39.9042, lng: 116.4074 },
    currentCity: { name: '上海', region: '中国 上海', lat: 31.2304, lng: 121.4737 },
  })
  const en = geoEn(geo, tiaoHou)
  assert(geo.categories.length === en.categories.length, `类别 ${geo.categories.length}=${en.categories.length}`)
  geo.categories.forEach((c, i) => {
    assert(c.cities.length === en.categories[i].cities.length, `${c.key} 城市数一致`)
    c.cities.forEach((city, j) => {
      assert(city.reasons.length === en.categories[i].cities[j].reasons.length, `${c.key} 第 ${j} 城 reasons ${city.reasons.length}=${en.categories[i].cities[j].reasons.length}`)
    })
  })
  if (geo.currentCity) {
    assert(geo.currentCity.effects.length === en.currentCity.effects.length, `现居影响条数 ${geo.currentCity.effects.length}=${en.currentCity.effects.length}`)
    assert(geo.currentCity.advice.length === en.currentCity.advice.length, `现居建议条数 ${geo.currentCity.advice.length}=${en.currentCity.advice.length}`)
  }
  assertNoCJK(en, `方位 ${b.year}`)
}

console.log('\n④ 年运：英文条目数与中文一致')
for (const b of [COUPLES[1][0], COUPLES[0][0]]) {
  const chart = chartOf(b)
  const luck = buildLuckCycles(chart)
  const fs = getFavorSets(chart)
  const cur = luck.daYun.find((d) => d.current) ?? luck.daYun[0]
  const en = liunianEn({ favorable: fs.favorable, unfavorable: fs.unfavorable, curDaYun: cur, liuNian: luck.liuNian, liuYue: luck.liuYue })
  assert(luck.liuNian.length === en.liuNian.length, `流年行数 ${luck.liuNian.length}=${en.liuNian.length}`)
  luck.liuNian.forEach((d, i) => {
    assert(d.relations.length === en.liuNian[i].relations.length, `${d.year} relations ${d.relations.length}=${en.liuNian[i].relations.length}`)
    assert(d.structuralIssues.length === en.liuNian[i].issues.length, `${d.year} issues ${d.structuralIssues.length}=${en.liuNian[i].issues.length}`)
    assert(en.liuNian[i].note.length > 20, `${d.year} 英文断语非空`)
  })
  assert(cur.relations.length === en.curDaYun.relations.length, `大运 relations 一致`)
  assert(cur.structuralIssues.length === en.curDaYun.issues.length, `大运 issues 一致`)
  assert(luck.liuYue.length === en.liuYue.length, `流月行数 ${luck.liuYue.length}=${en.liuYue.length}`)
  assertNoCJK(en, `年运 ${b.year}`)
}

console.log('\n⑤ 牙口：注入中文必须翻红')
assert(hasCJK('八字 reads well'), 'hasCJK 对含中文文本返回 true')
assert(!hasCJK('The Four Pillars of this Bazi chart are Jia Zi and Yi Chou'), 'hasCJK 对纯英文返回 false')
{
  const male = chartOf(COUPLES[1][0]), female = chartOf(COUPLES[1][1])
  const en = hehunEn(male, female)
  en.dimensions[0].facts.push('这是注入的中文句子')
  assert(hasCJK(JSON.stringify(en)), '注入中文后 hasCJK 必须翻红（true）')
}

console.log(`\n结果：pass=${pass} fail=${fail}`)
if (fail > 0) process.exit(1)
