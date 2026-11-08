// 英文方位之城：本地化 + 免费分层 + 语义色 断言（2026-11-08）
//
// 事故形态：线上 /en/geo 的城市名是拼音（Mian Lan / Yin Du Ni Xi Ya / Bali），
// 且免费态把五类城市全部展开。前者是旧代码 pinyinName() + 旧数据没有 en 列；
// 后者是英文规则表 EnGeoRules 从未接入 PREVIEW_FREE 试读白名单。
import { readFileSync } from 'node:fs'
import { analyzeGeo, geoScoreTier } from '../src/lib/geo.ts'
import { geoEn } from '../src/lib/enRule.ts'
import { PREVIEW_FREE } from '../src/lib/reportPreview.ts'
import { tEn } from '../src/lib/i18n.ts'
import { SKUS } from '../src/lib/pricing.ts'
import cities from '../src/data/geo-cities.json' with { type: 'json' }

let allPass = true
const failures = []
const fail = (m) => { allPass = false; failures.push(m); console.log('  ✗ ' + m) }
const ok = (m) => console.log('  · ' + m)
const assert = (c, msg, fmsg) => (c ? ok(msg) : fail(fmsg ?? msg))

const CJK = /[\u4e00-\u9fff]/
const PINYIN = ['Mian Lan', 'Yin Du Ni Xi Ya', 'Lundun', 'Niuyue', 'Lundeng', 'Lundon', 'Luo Shan Ji', 'Da Ban']
const EN_BY_ZH = new Map(cities.map((c) => [c.name, c.en]))
const REGION_EN = new Set(cities.map((c) => c.regionEn))

const BIRTHS = [
  ['广州', 23.13, 113.26, '甲', '身旺'],
  ['北京', 39.9, 116.4, '壬', '身弱'],
  ['乌鲁木齐', 43.83, 87.62, '庚', '身旺'],
  ['哈尔滨', 45.75, 126.63, '丙', '身弱'],
  ['上海', 31.23, 121.47, '癸', '身旺'],
  ['成都', 30.67, 104.07, '丁', '身弱'],
  ['拉萨', 29.65, 91.13, '戊', '身旺'],
  ['三亚', 18.25, 109.51, '辛', '身弱'],
  ['西安', 34.34, 108.94, '乙', '身旺'],
  ['昆明', 24.88, 102.83, '己', '身弱'],
]

console.log('—— ① 英文城市名不得回退到拼音/CJK ——')
let checkedNames = 0
for (const [name, lat, lng, dayMaster, wangShuai] of BIRTHS) {
  const geo = analyzeGeo({
    dayMaster,
    wangShuai,
    birthplace: { name, lat, lng },
    currentCity: { name: 'Moscow', lat: 55.75, lng: 37.62 },
  })
  const view = geoEn(geo)
  const names = [
    view.birthplace,
    view.currentCity?.name,
    ...view.categories.flatMap((c) => c.cities.map((city) => city.name)),
  ].filter(Boolean)
  for (const n of names) {
    checkedNames++
    assert(!CJK.test(n), `${name}：城市名 ${n} 不含 CJK`)
    assert(!PINYIN.includes(n), `${name}：城市名 ${n} 不是已知拼音`)
    if (n !== 'Moscow' && n !== name) {
      assert(REGION_EN.size > 0 && [...EN_BY_ZH.values()].includes(n) || n === 'Moscow',
        `${name}：城市名 ${n} 可反查 geo-cities.en`)
    }
  }
  for (const c of view.categories) {
    for (const city of c.cities) {
      assert(city.region === '' || REGION_EN.has(city.region),
        `${name}：地区 ${city.region} 来自 regionEn`,
        `${name}：地区 ${city.region} 不是 regionEn（可能是中文或拼音）`)
    }
  }
  const blob = JSON.stringify(view)
  for (const p of PINYIN) {
    assert(!blob.includes(p), `${name}：结果中不含拼音 ${p}`,
      `${name}：结果仍含拼音 ${p}`)
  }
}
ok(`共校验 ${checkedNames} 个英文城市名`)

console.log('—— ② 免费分层白名单必须命中真实类别 ——')
{
  const geo = analyzeGeo({
    dayMaster: '甲', wangShuai: '身旺',
    birthplace: { name: '广州', lat: 23.13, lng: 113.26 },
  })
  const keys = new Set(geo.categories.map((c) => c.key))
  for (const k of PREVIEW_FREE.geo) {
    assert(keys.has(k), `PREVIEW_FREE.geo「${k}」是真实类别`,
      `PREVIEW_FREE.geo「${k}」不是类别 key（幽灵 key，永远匹配不到）`)
  }
  assert(PREVIEW_FREE.geo.length >= 1 && PREVIEW_FREE.geo.length <= 2,
    `FREE.geo 免费类别数 ${PREVIEW_FREE.geo.length} 在 1–2 之间`,
    `FREE.geo 免费类别数 ${PREVIEW_FREE.geo.length} 超出 1–2`)
}

console.log('—— ③ 英文规则表必须接试读门禁 ——')
{
  const src = readFileSync('src/components/en/EnRuleTables.tsx', 'utf8')
  for (const token of ['previewOnly', 'freeCats', 'lockedCats', 'LockedCard', 'UnlockCta', 'PREVIEW_FREE.geo']) {
    assert(src.includes(token), `EnRuleTables 含 ${token}`, `EnRuleTables 缺少 ${token} —— 试读门禁未接入`)
  }
  assert(!/view\.categories\.map\(/.test(src), '类别明细不再裸渲染 view.categories',
    '类别明细仍是 view.categories.map —— 免费态会全量展开')
}

console.log('—— ④ 解锁按钮不得漏中文（SKU 名必须有英文词条）——')
{
  for (const id of ['geo', 'ziwei_deep', 'hemun', 'annual_report']) {
    const en = tEn(SKUS[id].name)
    assert(!CJK.test(en), `解锁按钮 ${id} → ${en}`, `解锁按钮 ${id} 漏中文：${en}`)
  }
}

console.log('—— ⑤ 分类语义色 / 分数分级真实存在 ——')
{
  assert(geoScoreTier(69.9) === 'neutral', '69.9 → neutral')
  assert(geoScoreTier(70) === 'good', '70 → good')
  assert(geoScoreTier(44.9) === 'bad', '44.9 → bad')
  const css = readFileSync('src/app/globals.css', 'utf8')
  for (const k of ['wealth', 'career', 'patron', 'home', 'talent']) {
    assert(css.includes(`.hw-cat--${k}`), `CSS 有 hw-cat--${k}`)
  }
  for (const k of ['good', 'flat', 'bad']) {
    assert(css.includes(`.hw-badge--${k}`), `CSS 有 hw-badge--${k}`)
  }
  for (const k of ['good', 'neutral', 'bad']) {
    assert(css.includes(`.hw-scorebar--${k}`), `CSS 有 hw-scorebar--${k}`,
      `CSS 缺 hw-scorebar--${k} —— 该档分数条没有语义色`)
  }
}

console.log('—— ⑥ 打印/导出（PNG/PDF）必须保留语义色 ——')
{
  const css = readFileSync('src/app/globals.css', 'utf8')
  const at = css.indexOf('@media print')
  const block = css.slice(at)
  assert(at > 0, '存在 @media print 段')
  assert(block.includes('print-color-adjust: exact'),
    '打印段对 .hw-print 保留配色（否则导出图里分类色/徽章底色全丢）',
    '打印段未设 print-color-adjust: exact —— 导出 PNG/PDF 会丢掉所有语义色')
  assert(!/\.hw-print \.hw-dim,/.test(block),
    '打印段不覆盖 .hw-dim 的语义左边框',
    '打印段仍把 .hw-dim 边框刷成灰色 —— 九维度色带在导出图里消失')
  assert(!/\.hw-print \.hw-badge,/.test(block) && !/\.hw-print \.hw-basis\b(?!-)/.test(block),
    '打印段不覆盖 .hw-badge / .hw-basis 的语义边框',
    '打印段覆盖了徽章/依据边框色 —— 吉平凶与来源徽章在导出图里被抹平')
}

console.log('')
if (allPass) console.log('EN_GEO_LOCALE_PASS')
else {
  console.log(`EN_GEO_LOCALE_FAIL（${failures.length} 处）`)
  for (const x of failures) console.log('  - ' + x)
}
process.exitCode = allPass ? 0 : 1
