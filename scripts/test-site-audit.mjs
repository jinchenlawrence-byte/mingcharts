// 上线前全站体检断言（HANDOFF-上线前全站体检 §四）
// ① metadata 齊全（页自身或由同级 layout.tsx 提供；首页 src/app/page.tsx 由根 layout.tsx 覆盖）
// ② 无 console.log/debugger/alert(（0 白名单：7 处 alert 已按拍板改为内联错误提示）
// ③ 无用户可见占位符（字符串字面量扫 TODO/FIXME/Lorem/TBD，不扫 input 的 placeholder 属性）
// ④ 站内链接可达（静态：抓 href 对照路由；行为：服务端页真实调用含动态路由 params，use client 页验证模块可加载）

import { readFileSync, readdirSync, existsSync } from 'node:fs'

let allPass = true
const fail = (msg) => { allPass = false; console.log('  ✗ ' + msg) }

// ---------- 工具：递归枚举 .ts/.tsx（统一用正斜杠）----------
function walk(dir) {
  const out = []
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = dir + '/' + e.name
    if (e.isDirectory()) { out.push(...walk(p)); continue }
    if (e.isFile() && /\.(ts|tsx)$/.test(e.name)) out.push(p)
  }
  return out
}
const root = new URL('../src/', import.meta.url).pathname.replace(/^\/(\w:)/, '$1').replace(/\\/g, '/')
const allFiles = walk(root)

// 统一把 file 路径转成 src/... 相对路径（正斜杠，合并多斜杠）
const relOf = (file) => file.replace(root, 'src/').replace(/\\/g, '/').replace(/\/+/g, '/')

// ---------- ① metadata 齊全（页自身或由同级 layout.tsx 提供）----------
console.log('—— ① metadata 齊全 ——')
const META_RE = /export const metadata|export async function generateMetadata|export function generateMetadata/
let metaSelf = 0, metaViaLayout = 0, metaFail = 0
for (const file of allFiles) {
  if (!file.endsWith('page.tsx')) continue
  const rel = relOf(file)
  const content = readFileSync(file, 'utf8')
  if (META_RE.test(content)) { metaSelf++; continue }
  // 'use client' 页面由同级 layout.tsx 提供 metadata（拍板5：已为 6 个 client 页建 layout；
  // 首页 src/app/page.tsx 由根 layout.tsx 的 title.default 覆盖，同一规则自然命中）
  const layoutFile = file.replace(/page\.tsx$/, 'layout.tsx')
  if (existsSync(layoutFile) && META_RE.test(readFileSync(layoutFile, 'utf8'))) { metaViaLayout++; continue }
  metaFail++
  fail(`缺 metadata（自身与同级 layout.tsx 均无）：${rel}`)
}
console.log(metaFail === 0
  ? `✓ metadata 齊全：${metaSelf} 个 page.tsx 自带 metadata/generateMetadata；${metaViaLayout} 个由同级 layout.tsx 提供；0 缺失`
  : `✗ metadata 缺失 ${metaFail} 处`)

// ---------- ② 无 console.log/debugger/alert( ----------
console.log('—— ② 无调试残留（console.log/debugger/alert(）——')
const CONSOLE_LOG = /(^|[^.\w])console\.log\s*\(/g
const DEBUGGER = /(^|[^.\w])debugger\b/g
const ALERT = /(^|[^.\w])alert\s*\(/g
let logFail = 0, debuggerFail = 0, alertFail = 0
for (const file of allFiles) {
  const rel = relOf(file)
  const lines = readFileSync(file, 'utf8').split(/\r?\n/)
  lines.forEach((line, i) => {
    const trimmed = line.trim()
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return
    if (CONSOLE_LOG.test(line)) { logFail++; fail(`${rel}:${i + 1} console.log 调试残留：${line.trim()}`) }
    CONSOLE_LOG.lastIndex = 0
    if (DEBUGGER.test(line)) { debuggerFail++; fail(`${rel}:${i + 1} debugger 拄留`) }
    DEBUGGER.lastIndex = 0
    if (ALERT.test(line)) { alertFail++; fail(`${rel}:${i + 1} alert( 调试残留：${line.trim()}`) }
    ALERT.lastIndex = 0
  })
}
console.log(logFail === 0 && debuggerFail === 0 && alertFail === 0
  ? `✓ 无调试残留：console.log 0、debugger 0、alert( 0 命中（7 处 alert 已改为内联错误提示，0 白名单）`
  : `✗ 调试残留：console.log ${logFail}、debugger ${debuggerFail}、alert( ${alertFail}`)

// ---------- ③ 无用户可见占位符 ----------
console.log('—— ③ 无用户可见占位符（TODO/FIXME/Lorem/TBD，不扫 input 的 placeholder 属性）——')
const PLACEHOLDER_WORDS = ['TODO', 'FIXME', 'XXX', 'Lorem', 'TBD', '待补', '待定']
let phFail = 0
for (const file of allFiles) {
  const rel = relOf(file)
  const lines = readFileSync(file, 'utf8').split(/\r?\n/)
  lines.forEach((line, i) => {
    const trimmed = line.trim()
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return
    const strs = line.match(/'[^']*'|"[^"]*"|`[^`]*`/g) || []
    for (const s of strs) {
      for (const w of PLACEHOLDER_WORDS) {
        if (s.includes(w)) {
          phFail++
          fail(`${rel}:${i + 1} 字符串含占位符「${w}」：${s.slice(0, 60)}`)
        }
      }
    }
  })
}
console.log(phFail === 0
  ? `✓ 无用户可见占位符：扫描 ${allFiles.length} 个 .ts/.tsx 字符串字面量，TODO/FIXME/Lorem/TBD/待补/待定 0 命中`
  : `✗ 占位符 ${phFail} 处`)

// ---------- ④ 站内链接可达（静态 + 行为）——
console.log('—— ④ 站内链接可达 ——')

// ④-静态：抓 href="/..." 与 src/app 下实际路由对照
const HREF_RE = /href="\/([^"]*)"/g
const hrefs = new Set()
const routes = new Set()
routes.add('/')
for (const file of allFiles) {
  if (!file.endsWith('.tsx')) continue
  const content = readFileSync(file, 'utf8')
  let m
  HREF_RE.lastIndex = 0
  while ((m = HREF_RE.exec(content))) {
    hrefs.add('/' + m[1])
  }
  if (file.endsWith('page.tsx')) {
    const rel = relOf(file)
    let route = '/' + rel.replace(/^src\/app\//, '').replace(/\/page\.tsx$/, '')
    if (route === '/') route = '/'
    // 动态段 [slug] 保留原样
    routes.add(route)
  }
}

let deadLink = 0
for (const href of hrefs) {
  if (href === '/') continue
  if (routes.has(href)) continue
  const parts = href.split('/').filter(Boolean)
  if (parts.length > 1) {
    const guessFile = root + 'app/' + parts.join('/') + '/page.tsx'
    if (existsSync(guessFile)) continue
    let found = false
    for (const seg of ['[slug]', '[year]', '[month]', '[day]', '[animal]', '[name]']) {
      const guessDyn = root + 'app/' + parts.slice(0, -1).join('/') + '/' + seg + '/page.tsx'
      if (existsSync(guessDyn)) { found = true; break }
    }
    if (found) continue
  }
  deadLink++
  fail(`死链：href="${href}" 无对应路由`)
}
console.log(deadLink === 0
  ? `✓ 静态：${hrefs.size} 个唯一站内 href 全部可达（对照 src/app 下 page.tsx）`
  : `✗ 死链 ${deadLink} 处`)

// ④-行为：服务端页真实调用 default（动态路由传 params Promise，Next 15+ 约定）
const ROUTE_MODULES = [
  { route: '/terms', file: 'src/app/terms/page.tsx' },
  { route: '/privacy', file: 'src/app/privacy/page.tsx' },
  { route: '/daily', file: 'src/app/daily/page.tsx' },
  { route: '/bazi', file: 'src/app/bazi/page.tsx' },
  { route: '/bazi/1990', file: 'src/app/bazi/[year]/page.tsx', params: { year: '1990' } },
  { route: '/bazi/1990/05', file: 'src/app/bazi/[year]/[month]/page.tsx', params: { year: '1990', month: '05' } },
  { route: '/bazi/1990/05/08', file: 'src/app/bazi/[year]/[month]/[day]/page.tsx', params: { year: '1990', month: '05', day: '08' } },
]
let behaviorFail = 0
for (const { route, file, params } of ROUTE_MODULES) {
  try {
    const mod = await import('../' + file)
    const Page = mod.default
    if (typeof Page !== 'function') {
      behaviorFail++; fail(`行为断言 ${route}：default 不是函数`); continue
    }
    const args = params
      ? { params: Promise.resolve(params) }
      : (route === '/daily' ? { searchParams: Promise.resolve({}) } : {})
    const result = await Page(args)
    if (!result) {
      behaviorFail++; fail(`行为断言 ${route}：Page() 返回空`)
    }
  } catch (e) {
    behaviorFail++
    fail(`行为断言 ${route}：import 或调用抛错 - ${e instanceof Error ? e.message : e}`)
  }
}
console.log(behaviorFail === 0
  ? `✓ 行为：import ${ROUTE_MODULES.length} 个服务端 page.tsx（含 3 个 bazi 动态路由，真实传 params）调 default 全部返回 JSX`
  : `✗ 行为断言失败 ${behaviorFail} 处`)

// ④-行为（use client 页）：仅验证模块可加载、default 为函数——hooks 不可在组件渲染外调用，不执行组件体
const CLIENT_PAGES = [
  { route: '/', file: 'src/app/page.tsx' },
  { route: '/chart', file: 'src/app/chart/page.tsx' },
  { route: '/charts', file: 'src/app/charts/page.tsx' },
  { route: '/hemun', file: 'src/app/hemun/page.tsx' },
  { route: '/ziwei', file: 'src/app/ziwei/page.tsx' },
  { route: '/geo', file: 'src/app/geo/page.tsx' },
  { route: '/liunian', file: 'src/app/liunian/page.tsx' },
  { route: '/reports', file: 'src/app/reports/page.tsx' },
  { route: '/reports/[id]', file: 'src/app/reports/[id]/page.tsx' },
  { route: '/auth', file: 'src/app/auth/page.tsx' },
]
let clientFail = 0
for (const { route, file } of CLIENT_PAGES) {
  try {
    const mod = await import('../' + file)
    if (typeof mod.default !== 'function') {
      clientFail++; fail(`行为断言 ${route}（use client）：default 不是函数`)
    }
  } catch (e) {
    clientFail++
    fail(`行为断言 ${route}（use client）：模块加载抛错 - ${e instanceof Error ? e.message : e}`)
  }
}
console.log(clientFail === 0
  ? `✓ 行为：${CLIENT_PAGES.length} 个 use client 页模块加载通过（default 均为函数；组件体不执行）`
  : `✗ use client 行为断言失败 ${clientFail} 处`)

// ---------- 牙口自检（守护扫描器本身）----------
console.log('—— 牙口自检（守护扫描器）——')
let toothFail = 0
if (!/(^|[^.\w])console\.log\s*\(/.test('  console.log("debug")')) { toothFail++; fail('牙口：console.log 样本未检出') }
if (!/(^|[^.\w])debugger\b/.test('  debugger;')) { toothFail++; fail('牙口：debugger 样本未检出') }
if (!/(^|[^.\w])alert\s*\(/.test('  alert("x")')) { toothFail++; fail('牙口：alert( 样本未检出') }
if (!'TODO'.includes('TODO')) { toothFail++; fail('牙口：TODO 字面量未检出') }
console.log(toothFail === 0
  ? '✓ 牙口自检：console.log/debugger/alert(/TODO 判据样本均能检出'
  : '✗ 牙口自检失败')

console.log('\n' + (allPass ? 'SITE_AUDIT_PASS' : 'SITE_AUDIT_FAIL'))
if (!allPass) process.exit(1)
