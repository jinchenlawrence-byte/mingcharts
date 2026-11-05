// 产出语言守门（2026-11-05）
//
// 背景：一天内连出三次「中文站产出英文内容」——
//   ① 命书生成  ② 我的命盘重生成  ③ 追问回答
// 同一个根因：请求体没带 locale，服务端回落到 mc_locale cookie，
// 而 cookie 会被任意语言页的访问改写（用户点过 /en 就变 en）。
//
// 现在的机制（两层）：
//   ① lib/locale.ts 的 localeFromRequest 只认 body.locale，不再读 cookie；
//   ② 所有产出型请求必须显式声明 locale —— 本脚本扫描源码守住这一条。
//
// 这条测试的价值：以后再新增入口忘了带 locale，验不通过，
// 而不是等用户拿到另一门语言的报告才发现。
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

let allPass = true
const failures = []
const fail = (m) => { allPass = false; failures.push(m); console.log('  ✗ ' + m) }
const ok = (m) => console.log('  · ' + m)
const assert = (c, msg, fmsg) => (c ? ok(msg) : fail(fmsg ?? msg))

console.log('—— ① localeFromRequest 不得再读 cookie ——')
{
  const src = readFileSync('src/lib/locale.ts', 'utf8')
  const fnStart = src.indexOf('export function localeFromRequest')
  assert(fnStart > 0, '能找到 localeFromRequest')
  const fnBody = src.slice(fnStart, fnStart + 400)
  assert(!/LOCALE_COOKIE|fromCookie|cookies\?\./.test(fnBody),
    'localeFromRequest 只认 body.locale（cookie 不再影响产出语言）',
    'localeFromRequest 仍读 cookie —— 产出语言会被其它语言页的访问带偏')
}

console.log('—— ② 所有产出型请求必须带 locale ——')
// 产出型 = 这些接口会生成命理内容，语言必须由调用方声明
const CONTENT_APIS = [
  '/api/ask', '/api/geo', '/api/hemun', '/api/liunian', '/api/ziwei',
  '/api/paipan', '/api/unlock', '/api/fatebook', '/api/member', '/api/checkout',
]

const files = []
;(function walk(d) {
  for (const e of readdirSync(d)) {
    const f = join(d, e)
    const st = statSync(f)
    if (st.isDirectory()) walk(f)
    else if (/\.(ts|tsx)$/.test(e)) files.push(f)
  }
})('src')

const gaps = []
for (const f of files) {
  const src = readFileSync(f, 'utf8')
  let idx = 0
  while ((idx = src.indexOf('JSON.stringify({', idx)) >= 0) {
    // 用括号配对取完整对象（多行、展开运算符都能吃）
    const start = idx + 'JSON.stringify('.length
    let depth = 0
    let end = -1
    for (let i = start; i < src.length; i++) {
      const c = src[i]
      if (c === '{' || c === '(' || c === '[') depth++
      else if (c === '}' || c === ')' || c === ']') { depth--; if (depth === 0) { end = i; break } }
    }
    if (end < 0) break
    const body = src.slice(start, end + 1)
    const near = src.slice(Math.max(0, idx - 900), idx)
    const api = CONTENT_APIS.find((a) => near.includes(a))
    if (api && !/\blocale\b/.test(body)) {
      gaps.push(`${f}:${src.slice(0, idx).split('\n').length} → ${api}`)
    }
    idx = end + 1
  }
}
assert(gaps.length === 0,
  `产出型请求全部显式带 locale（扫描 ${files.length} 个文件）`,
  `这些产出型请求没带 locale：\n      ${gaps.join('\n      ')}`)

console.log('')
if (allPass) console.log('OUTPUT_LOCALE_PASS')
else {
  console.log(`OUTPUT_LOCALE_FAIL（${failures.length} 处）`)
  for (const x of failures) console.log('  - ' + x)
}
process.exitCode = allPass ? 0 : 1
