// 构建页数下限断言（2026-11-06）
//
// 为什么需要它：
//   2026-11 的 `855c3b6` 把 480 个月页（/bazi/1950/01 … /bazi/1989/12）从
//   「构建期预渲染」改成「按需 ISR」，Next 的 `Generating static pages` 计数从
//   **1399 掉到 919**。1399 是 855c3b6 之前的旧口径，不是"页面丢了四百页"。
//   本脚本把口径固定成两个**与 Next 文案无关**的硬数字，防止下一轮再把口径变化误读成页面缺失。
//
// 两个下限：
//   ① .next/prerender-manifest.json 的 route 数 ≥ 897（含 5 个 metadata 路由）
//   ② .next/server/app 下构建期 html 文件数 ≥ 892（运行时按需生成的 ISR 页只会更多）
//
// 运行：node scripts/check-page-count.mjs  （verify 链里自动跑；需先 npm run build）
// 牙口：node scripts/check-page-count.mjs --root <临时目录>  （供自检注入缩水的 .next）

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const argv = process.argv.slice(2)
const rootArg = argv.indexOf('--root')
const ROOT =
  rootArg >= 0 && argv[rootArg + 1]
    ? path.resolve(argv[rootArg + 1])
    : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const MANIFEST_MIN = 897 // 1399 是 855c3b6 之前的旧口径，勿以它做基线
const APP_HTML_MIN = 892

const NEXT = path.join(ROOT, '.next')
const MANIFEST = path.join(NEXT, 'prerender-manifest.json')
const APP_DIR = path.join(NEXT, 'server', 'app')

if (!fs.existsSync(MANIFEST) || !fs.existsSync(APP_DIR)) {
  console.error('FAIL 找不到 .next 构建产物，请先 npm run build')
  process.exit(1)
}

const routes = Object.keys(JSON.parse(fs.readFileSync(MANIFEST, 'utf8')).routes || {})

function countHtml(dir) {
  let n = 0
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) n += countHtml(full)
    else if (entry.name.endsWith('.html')) n++
  }
  return n
}
const html = countHtml(APP_DIR)

console.log('prerender-manifest routes:', routes.length, `(下限 ${MANIFEST_MIN})`)
console.log('build-time app html     :', html, `(下限 ${APP_HTML_MIN})`)

const failures = []
if (routes.length < MANIFEST_MIN) {
  failures.push(`prerender-manifest route ${routes.length} < ${MANIFEST_MIN}（1399 是 855c3b6 之前的旧口径，下降了说明有路由从预渲染变成按需/被删）`)
}
if (html < APP_HTML_MIN) {
  failures.push(`app html ${html} < ${APP_HTML_MIN}（同上：855c3b6 之后基线是 892，不是 1372）`)
}

if (failures.length) {
  console.error(`\nFAIL (${failures.length})`)
  for (const f of failures) console.error(`  - ${f}`)
  process.exit(1)
}
console.log('PASS  page-count floor')
