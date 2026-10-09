// 将 geo-annotations.mjs 的地气标注与世界城市合入 src/data/geo-cities.json
// 用法：node --import tsx scripts/merge-geo-cities.mjs
// 规则：
//   1. DIQI 只补空——已标注且值不同 → 冲突报错拒绝写入（防误覆盖既有 174 条策展）
//   2. WORLD 按 ascii 名+国家从 world-cities.json 解析坐标，重名时用 admin 提示消歧；
//      解析失败（0 命中或多义）→ 报错退出，绝不静默猜
//   3. 完整性闸门：合并后不允许存在 diqi 为空的城市
//   4. 幂等：重复运行结果一致（新增世界城按 cn 去重）
import { readFileSync, writeFileSync } from 'node:fs'
import { DIQI, WORLD } from './geo-annotations.mjs'
import { parseWorld } from '../src/lib/worldCitiesParse.ts'

const FILE = 'src/data/geo-cities.json'
const cities = JSON.parse(readFileSync(FILE, 'utf8'))

// ---------- ① 补齐地气 ----------
let filled = 0
const conflicts = []
const missing = []
for (const [name, [diqi, reason]] of Object.entries(DIQI)) {
  const c = cities.find((x) => x.name === name)
  if (!c) { missing.push(name); continue }
  if (c.diqi) {
    if (c.diqi !== diqi) conflicts.push(`${c.name}: 已有「${c.diqi}」≠ 标注「${diqi}」`)
    continue
  }
  c.diqi = diqi
  c.diqiReason = reason
  filled++
}
if (missing.length) {
  console.error(`✗ 标注表里有 ${missing.length} 城不在 geo-cities.json：${missing.join('、')}`)
  process.exit(1)
}
if (conflicts.length) {
  console.error(`✗ ${conflicts.length} 条与既有标注冲突，拒绝合并：\n  ` + conflicts.join('\n  '))
  process.exit(1)
}

// ---------- ② 新增世界城市 ----------
const world = parseWorld(JSON.parse(readFileSync('public/data/world-cities.json', 'utf8')))
let nextId = Math.max(...cities.map((c) => c.id)) + 1
const added = []
const resolveFail = []
for (const w of WORLD) {
  if (cities.some((c) => c.name === w.cn)) continue // 幂等：已合入则跳过
  let hits = world.flat.filter((c) => c.countryCode === w.cc && (c.ascii === w.wn || c.name === w.wn))
  if (hits.length > 1 && w.admin) hits = hits.filter((c) => c.admin1Name.includes(w.admin))
  if (hits.length !== 1) {
    resolveFail.push(
      `✗ ${w.cn}（${w.wn}@${w.cc}${w.admin ? '/' + w.admin : ''}）命中 ${hits.length}：` +
      hits.slice(0, 5).map((h) => `${h.name}(${h.admin1Name})`).join('、')
    )
    continue
  }
  const g = hits[0]
  cities.push({
    name: w.cn, region: w.region, lat: g.lat, lng: g.lng,
    diqi: w.diqi[0], diqiReason: w.diqi[1], id: nextId++
  })
  added.push(`${w.cn}←${g.name}(${g.admin1Name},${g.lat},${g.lng})`)
}
if (resolveFail.length) {
  console.error(`✗ ${resolveFail.length} 座世界城解析失败（多义或未收录），请补 admin 提示或改名：\n  ` + resolveFail.join('\n  '))
  process.exit(1)
}

// ---------- ③ 完整性闸门 ----------
const empty = cities.filter((c) => !c.diqi)
const dupName = Object.entries(cities.reduce((m, c) => ((m[c.name] = (m[c.name] || 0) + 1), m), {})).filter(([, n]) => n > 1)
const dupId = new Set(cities.map((c) => c.id)).size !== cities.length
if (empty.length) { console.error(`✗ 仍有 ${empty.length} 城无地气：${empty.map((c) => c.name).join('、')}`); process.exit(1) }
if (dupName.length) { console.error(`✗ 城市重名：${dupName.map(([n]) => n).join('、')}`); process.exit(1) }
if (dupId) { console.error('✗ id 重复'); process.exit(1) }

// ---------- ④ 写回 ----------
writeFileSync(FILE, JSON.stringify(cities))
const dist = {}
for (const c of cities) dist[c.diqi] = (dist[c.diqi] || 0) + 1
console.log(`✓ 补齐地气 ${filled} 城，新增世界城 ${added.length} 座，总数 ${cities.length}`)
console.log(`  五行分布: ${JSON.stringify(dist)}`)
console.log(`  ${added.slice(0, 8).join('；')}${added.length > 8 ? ` …等 ${added.length} 座` : ''}`)
