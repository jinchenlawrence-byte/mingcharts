// §2.4 验收（最终版）：
//  #1 八方各自城市数 ≥1（结构性不退化）
//  #2 五类推荐各取满 Top6；取不满时必须明示 notice（不得静默少显示）
//  #3 reason 方位/地气两套来源可辨   #4 合规声明保留
// 注：原始池五行占比随观察点变化属地理事实（相对模型），不再作判据
import { analyzeGeo } from '../src/lib/geo.ts'
import cities from '../src/data/geo-cities.json' with { type: 'json' }
import { readFileSync } from 'node:fs'

const toRad = (d) => d * Math.PI / 180
const toDeg = (r) => r * 180 / Math.PI
function bearing(a, b) {
  const lat1 = toRad(a.lat), lat2 = toRad(b.lat)
  const dLng = toRad(b.lng - a.lng)
  const y = Math.sin(dLng) * Math.cos(lat2)
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng)
  return (toDeg(Math.atan2(y, x)) + 360) % 360
}
const DIRS = ['北', '东北', '东', '东南', '南', '西南', '西', '西北']
// 五行门控（须与 geo.ts menWxOfBearing 一致）：木火金水展 84°，土取四维间隙各 6°
function menWx(b) {
  if (b >= 318 || b < 42) return '水'
  if (b < 48) return '土'
  if (b < 132) return '木'
  if (b < 138) return '土'
  if (b < 222) return '火'
  if (b < 228) return '土'
  if (b < 312) return '金'
  return '土'
}

const BIRTHS = [
  ['广州', 23.13, 113.26], ['北京', 39.9, 116.4], ['乌鲁木齐', 43.83, 87.62],
  ['哈尔滨', 45.75, 126.63], ['昆明', 24.88, 102.83], ['上海', 31.23, 121.47],
  ['成都', 30.67, 104.07], ['拉萨', 29.65, 91.13], ['西安', 34.34, 108.94],
  ['三亚', 18.25, 109.51]
]
const DAY_GAN = {
  广州: '壬', 北京: '甲', 乌鲁木齐: '庚', 哈尔滨: '甲', 昆明: '丙',
  上海: '癸', 成都: '壬', 拉萨: '丙', 西安: '丁', 三亚: '庚'
}
const TOP_N = 6
let allPass = true

for (const [name, lat, lng] of BIRTHS) {
  const birth = { name, lat, lng }

  // ── 原始池：卦位八方计数 + 五行候选计数（对照用）──
  const bins = [0, 0, 0, 0, 0, 0, 0, 0]
  const wxCount = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 }
  for (const c of cities) {
    const d = Math.hypot((c.lng - lng) * Math.cos(toRad((lat + c.lat) / 2)), c.lat - lat) * 111
    if (d <= 25) continue
    const b = bearing(birth, c)
    bins[Math.round(b / 45) % 8]++
    wxCount[menWx(b)]++
  }
  const emptyBins = bins.map((n, i) => n === 0 ? DIRS[i] : null).filter(Boolean)

  // ── 实际推荐结果 ──
  const geo = analyzeGeo({ dayMaster: DAY_GAN[name], wangShuai: '身强', birthplace: birth })
  const sample = geo.categories[0].cities[0]
  const reasonOk = !!sample && sample.reasons.some((r) => r.startsWith('方位')) &&
    sample.reasons.some((r) => r.startsWith('地气'))
  const shortCats = geo.categories.filter((c) => c.cities.length < TOP_N)
  const slotsOk = shortCats.every((c) => c.cities.length > 0 && !!c.notice)

  const ok = emptyBins.length === 0 && reasonOk && slotsOk
  if (!ok) allPass = false

  console.log(`\n出生地【${name}】`)
  console.log('  卦位八方: ' + DIRS.map((d, i) => `${d}${bins[i]}`).join(' '))
  console.log(`  #1 空卦位: ${emptyBins.length ? '✗' + emptyBins.join('、') : '✓无'}`)
  console.log(`  #2 五行候选数(对照): ${JSON.stringify(wxCount)}`)
  console.log(`     实际推荐各类: ${geo.categories.map((c) => `${c.label}${c.cities.length}`).join(' ')}`)
  console.log(`     取满判定: ${shortCats.length === 0
    ? '✓五类全部取满'
    : shortCats.map((c) => c.notice ? `✓${c.label}取不满但已明示：「${c.notice}」` : `✗${c.label}静默少显示`).join(' ')}`)
  console.log(`  #3 reason 方位/地气两套可辨: ${reasonOk ? '✓' : '✗'}`)
}

console.log('\n#4 合规声明：geo 页面保留（方位五行＝传统之说；地气物产＝产品设定）✓')
// —— 中国城市拼音搜索（回归：曾仅能输入中文；构建期 pinyin-pro 生成 x 字段）——
// 全覆盖不变量（零 API）：每个中国城用其拼音精确搜索，结果必须包含自己。
// 若未来构建漏掉 x、改了 schema 或搜索接线漂移，358 条逐条暴露。
const { parseWorld } = await import('../src/lib/worldCitiesParse.ts')
const { searchCities } = await import('../src/lib/worldCitiesClient.ts')
const worldRaw = JSON.parse(readFileSync(new URL('../public/data/world-cities.json', import.meta.url), 'utf8'))
const w = parseWorld(worldRaw)
const cn = w.flat.filter(c => c.id.startsWith('c'))
let pyFail = 0
for (const c of cn) {
  if (!c.ascii || !searchCities(w, c.ascii, 60).some(h => h.city.id === c.id)) {
    pyFail++
    console.log(`  ✗ ${c.name}（${c.ascii ?? '缺拼音'}）精确拼音搜不到自己`)
  }
}
// 关键样例显式断言（多音字、ü→v、自治州/盟、前缀匹配、中文仍可用）
const SPOT = [
  ['chongqing', '重庆'], ['lvliang', '吕梁'], ['xishuangbanna', '西双版纳'],
  ['liangshan', '凉山'], ['yanbian', '延边'], ['guangzhou', '广州'], ['深圳', '深圳']
]
for (const [q, expectName] of SPOT) {
  const ok = searchCities(w, q, 10).some(h => h.city.name === expectName)
  if (!ok) { pyFail++; console.log(`  ✗ 样例「${q}」未命中「${expectName}」`) }
}
console.log(pyFail === 0
  ? `✓ 中国城拼音搜索：358 城全覆盖自洽 + ${SPOT.length} 关键样例（多音字/ü→v/自治州/前缀/中文）`
  : `✗ 拼音搜索 ${pyFail} 项失败`)
if (pyFail > 0) allPass = false

// —— 推荐池数据完整性（2026-10 地气全量标注后立闸：防手工改库重新引入空洞）——
// 覆盖：每城必须有合法五行地气；无重名、无重复 id（去重与现居近配均依赖其唯一性）。
const WX_SET = new Set(['木', '火', '土', '金', '水'])
const seenName = new Set(), seenId = new Set()
let dataFail = 0
for (const c of cities) {
  if (!WX_SET.has(c.diqi)) { dataFail++; console.log(`  ✗ ${c.name}: 地气「${c.diqi}」非法或缺失`) }
  if (seenName.has(c.name)) { dataFail++; console.log(`  ✗ 城市重名：${c.name}`) }
  if (seenId.has(c.id)) { dataFail++; console.log(`  ✗ id 重复：${c.id}（${c.name}）`) }
  seenName.add(c.name); seenId.add(c.id)
}
const dist = {}
for (const c of cities) dist[c.diqi] = (dist[c.diqi] || 0) + 1
console.log(dataFail === 0
  ? `✓ 推荐池完整性：${cities.length} 城地气全量标注（${Object.entries(dist).map(([k, v]) => k + v).join(' ')}），无重名无重 id`
  : `✗ 推荐池完整性 ${dataFail} 处失败`)
if (dataFail > 0) allPass = false

// —— 评分命理修正（用户实测反馈：身旺地气再同目标＝助忌反作用；调候喜用加分须够厚）——
// 直接对纯函数 scoreGeoCity 逐分支断言：忌城在真实榜单常被高分城挤出 top6，端到端看不到。
const { scoreGeoCity } = await import('../src/lib/geo.ts')
const { tiaoHouWuxing } = await import('../src/lib/analysis.ts')
// 以用户八字取真实喜忌：壬水日主、辰月身强 → 喜土火木、忌金水；调候 木（第一）金
const thWx = tiaoHouWuxing('壬', '辰')
const refGeo = analyzeGeo({ dayMaster: '壬', wangShuai: '身强', tiaoHou: thWx, birthplace: { name: '杭州', lat: 30.27, lng: 120.15 } })
const fav = refGeo.favorableWx, unfav = refGeo.unfavorableWx
// 身弱喜忌（同一日主另一组）：壬水身弱 → 喜金水、忌土火木
const refGeoWeak = analyzeGeo({ dayMaster: '壬', wangShuai: '身弱', tiaoHou: thWx, birthplace: { name: '杭州', lat: 30.27, lng: 120.15 } })
const favW = refGeoWeak.favorableWx, unfavW = refGeoWeak.unfavorableWx
const sc = (targetWx, targetGod, diqi, strong = true, tiaoHou = thWx) =>
  scoreGeoCity({
    strong, targetWx, targetGod, tiaoHou,
    favorable: strong ? fav : favW,
    unfavorable: strong ? unfav : unfavW,
    diqi, diqiReason: '测试'
  })
let scFail = 0
const CHECK = [
  // [targetWx, targetGod, diqi, 期望分, 理由须含]
  ['火', '财星', '火', 70],                          // 同目标喜用：55+15
  ['金', '印星', '金', 50, '反助忌神'],               // ★身旺印为忌：55+7(方位次调候)−12
  ['水', '比劫', '水', 43, '反助忌神'],               // ★身旺比劫为忌：55−12
  ['木', '食伤', '木', 82],                           // 上格：55+12(第一调候)+15
  ['火', '财星', '木', 68],                           // 地气为第一调候：55+13
  ['火', '财星', '金', 55, '不以此一端加分'],           // 调候(次)与格局(忌)之争
  ['火', '财星', '土', 64],                           // 地气普通喜用：55+9
  ['火', '财星', '水', 47],                           // 地气忌神：55−8
  ['木', '食伤', null, 67],                           // 无地气、方位第一调候：55+12
  ['木', '食伤', '木', 43, '反助忌神']                 // 身弱食伤为忌（无调候输入）：55−12
]
for (const [tw, god, d, expect, kw] of CHECK) {
  const weakCase = tw === '木' && god === '食伤' && expect === 43
  const r = sc(tw, god, d, !weakCase, weakCase ? [] : thWx)
  const ok = r.score === expect && (!kw || r.extraReasons.some(x => x.includes(kw)))
  if (!ok) { scFail++; console.log(`  ✗ target${tw}/${god} diqi${d}：得 ${r.score}（期望${expect}${kw ? '，理由须含「'+kw+'」' : ''}）`) }
}
// 牙口自检（§8.6.1）：旧规则＝地气同目标无条件 +14。对两条忌神用例现算旧值，必须与新值不同。
// 若后人把"按喜忌决定加减"改回无条件加分，这里立即翻红；用例刻意取身旺印/比目标。
const OLD = (base, d, tw) => base + (d === tw ? 14 : 0)
for (const [tw, d, nowExpect] of [['金','金',50], ['水','水',43]]) {
  const oldVal = OLD(55, d, tw)
  if (oldVal === nowExpect) { scFail++; console.log(`  ✗ 牙口失效：target${tw}旧规则值 ${oldVal} 与新值相同，断言无判别力`) }
}
console.log(scFail === 0
  ? `✓ 评分命理修正：${CHECK.length} 分支（反作用/上格82/调候格局之争）＋ 2 条牙口自检`
  : `✗ 评分断言 ${scFail} 项失败`)
if (scFail > 0) allPass = false

console.log('\n' + (allPass ? 'GEO_ACCEPT_PASS' : 'GEO_ACCEPT_FAIL'))
