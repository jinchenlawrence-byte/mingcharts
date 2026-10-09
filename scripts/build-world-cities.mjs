// 构建全球城市库：GeoNames（CC-BY 4.0）+ 现有中国策展城市 → public/data/world-cities.json
//
// 只下载三个小文件（任务书 §3.4：不下 alternateNamesV2）：
//   cities15000.zip      约 2.5 万城，表第 18 列即 IANA 时区
//   admin1CodesASCII.txt 州/省英文名
//   countryInfo.txt      国家英文名
//
// 命名范围（§3.4）：中国城市中文名（保留 358 城策展数据）；外国城市英文名。
// 加分项：22 个北美策展城的中文名按坐标匹配回 GeoNames 城，作为搜索别名（aliasZh）。
//
// 运行：node scripts/build-world-cities.mjs
import { mkdirSync, existsSync, writeFileSync, statSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'
import zlib from 'node:zlib'
import { pinyin } from 'pinyin-pro'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CACHE = join(ROOT, '.geonames-cache')
const OUT_DIR = join(ROOT, 'public', 'data')
const BASE = 'https://download.geonames.org/export/dump/'

mkdirSync(CACHE, { recursive: true })
mkdirSync(OUT_DIR, { recursive: true })

async function download(name) {
  const dest = join(CACHE, name)
  if (existsSync(dest) && statSize(dest) > 0) {
    console.log(`  已缓存 ${name}`)
    return dest
  }
  process.stdout.write(`  下载 ${name} ... `)
  const res = await fetch(BASE + name)
  if (!res.ok) throw new Error(`下载失败 ${name}: HTTP ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  writeFileSync(dest, buf)
  console.log(`${(buf.length / 1024).toFixed(0)} KB`)
  return dest
}
function statSize(p) {
  return statSync(p).size
}

// zip 解压：Node 无内置 zip，用 PowerShell（Windows 环境）
function unzip(zipPath, expectedFile) {
  const txt = join(CACHE, expectedFile)
  if (existsSync(txt)) return txt
  console.log(`  解压 ${expectedFile}`)
  execSync(
    `powershell -NoProfile -Command "Expand-Archive -Force -LiteralPath '${zipPath}' -DestinationPath '${CACHE}'"`,
    { stdio: 'pipe' }
  )
  if (!existsSync(txt)) throw new Error(`解压后未找到 ${expectedFile}`)
  return txt
}

// ───────── 下载 ─────────
console.log('① GeoNames 数据')
const zip = await download('cities15000.zip')
const countryFile = await download('countryInfo.txt')
const adminFile = await download('admin1CodesASCII.txt')
const citiesFile = unzip(zip, 'cities15000.txt')

// ───────── 解析 ─────────
console.log('② 解析')

// 国家：ISO2 → 英文名（# 开头为注释行）
const countryName = new Map()
for (const line of readFileSync(countryFile, 'utf8').split('\n')) {
  if (!line || line.startsWith('#')) continue
  const f = line.split('\t')
  if (f[0] && f[4]) countryName.set(f[0], f[4])
}

// 州/省："US.CA" → 英文名
const adminName = new Map()
for (const line of readFileSync(adminFile, 'utf8').split('\n')) {
  if (!line) continue
  const f = line.split('\t')
  if (f[0]) adminName.set(f[0], f[1])
}

// 外国城市（排除中国——中国用策展数据）。按 国家 → admin1 聚合
// 紧凑键名：c=code n=name a=admin1 t=cities i=id x=ascii a=lat o=lng z=zone h=中文别名
const byCountry = new Map() // cc → Map(adm1code → rows[])
for (const line of readFileSync(citiesFile, 'utf8').split('\n')) {
  if (!line) continue
  const f = line.split('\t')
  const cc = f[8]
  if (!cc || cc === 'CN') continue
  const zone = f[17]
  if (!zone) continue
  const lat = parseFloat(f[4]), lng = parseFloat(f[5])
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue
  const row = { i: Number(f[0]), n: f[1] }
  if (f[2] && f[2] !== f[1]) row.x = f[2]
  row.a = round4(lat)
  row.o = round4(lng)
  row.z = zone
  if (!byCountry.has(cc)) byCountry.set(cc, new Map())
  const adm = byCountry.get(cc)
  const a1 = f[10] || ''
  if (!adm.has(a1)) adm.set(a1, [])
  adm.get(a1).push(row)
}

// 中国策展数据：358 城（无 nameEn 的记录），按省聚合；id 加前缀避免与 GeoNames 混淆
// ★ x = 该城中文名的无声调拼音（pinyin-pro 构建期生成），使「输入拼音也能搜到中国城市」。
//   用数据源生成而非坐标去猜 GeoNames 行：后者会把自治州匹配到驻地（凉山→Xichang）、
//   让邻城压过正主（深圳→元朗、珠海→澳门），且依赖 GeoNames 拼写质量（Lueliang 误拼）。
const curated = JSON.parse(readFileSync(join(ROOT, 'src', 'data', 'birth-cities.json'), 'utf8'))
const cnByProv = new Map()
for (const c of curated) {
  if (c.nameEn) continue
  const row = { i: 'c' + c.id, n: c.name, a: round4(c.lat), o: round4(c.lng), z: c.zone || 'Asia/Shanghai' }
  // 拼音：无声调、无空格；ü → v（键盘输入惯例，如「吕梁」= lvliang）
  const py = pinyin(c.name, { toneType: 'none', type: 'array' }).join('').replace(/ü/g, 'v')
  if (py && py !== c.name) row.x = py
  if (!cnByProv.has(c.province)) cnByProv.set(c.province, [])
  cnByProv.get(c.province).push(row)
}
byCountry.set('CN', cnByProv)

// 22 北美策展城中文名 → 各挂给距离最近的【唯一】GeoNames 城（0.05° 内）。
// 注意不能「每条 GeoNames 行独立找」——同城周围的城区（布鲁克林、皇后区…）都会被挂上，
// 曾因此产生 139 个别名污染搜索。
const zhByCoord = curated.filter(c => c.nameEn).map(c => ({ lat: c.lat, lng: c.lng, zh: c.name }))
let aliasCount = 0
for (const z of zhByCoord) {
  let best = null
  let bestD = 0.05
  for (const adm of byCountry.values()) {
    for (const rows of adm.values()) {
      for (const r of rows) {
        const d = Math.hypot(z.lat - r.a, z.lng - r.o)
        if (d < bestD) { bestD = d; best = r }
      }
    }
  }
  if (best) { best.h = z.zh; aliasCount++ }
}

// ───────── 组装并排序 ─────────
console.log('③ 组装')
const countries = []
for (const [cc, adm] of byCountry) {
  const admin1 = []
  for (const [code, rows] of adm) {
    rows.sort((a, b) => a.n.localeCompare(b.n))
    const fullCode = cc === 'CN' ? code : `${cc}.${code}`
    admin1.push({
      c: fullCode,
      n: cc === 'CN' ? code : (adminName.get(`${cc}.${code}`) || code || '—'),
      t: rows
    })
  }
  admin1.sort((a, b) => a.n.localeCompare(b.n))
  countries.push({ c: cc, n: cc === 'CN' ? 'China' : (countryName.get(cc) || cc), a: admin1 })
}
countries.sort((a, b) => a.n.localeCompare(b.n))

const data = { v: 1, countries }
const json = JSON.stringify(data)
const out = join(OUT_DIR, 'world-cities.json')
writeFileSync(out, json)

const gz = zlib.gzipSync(Buffer.from(json), { level: 9 }).length
let cityCount = 0
for (const c of countries) for (const a of c.a) cityCount += a.t.length
console.log('④ 体积核对（任务书 §3.3 预算 gzip ≤ 800 KB）')
console.log(`  国家 ${countries.length}｜城市 ${cityCount}｜原始 ${(json.length / 1024).toFixed(0)} KB｜gzip ${(gz / 1024).toFixed(0)} KB`)
if (gz > 800 * 1024) {
  console.log('  ⚠ 超出预算，应改为按国家分片（任务书 §3.3）')
  process.exit(1)
}
console.log(`  中文搜索别名挂接 ${aliasCount} 个`)
// 拼音覆盖率自检：358 城应全部带 x（若 pinyin-pro 对某名漏生成，此处立刻可见）
let cnTotal = 0, cnWithPy = 0
for (const rows of cnByProv.values()) for (const r of rows) { cnTotal++; if (r.x) cnWithPy++ }
console.log(`  中国城拼音覆盖 ${cnWithPy}/${cnTotal}`)
if (cnWithPy !== cnTotal) {
  console.log('  ⚠ 拼音未全覆盖，检查 pinyin-pro 生成结果')
  process.exit(1)
}
console.log('WORLD_CITIES_BUILD_PASS')

function round4(n) {
  return Math.round(n * 10000) / 10000
}
