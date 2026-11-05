// 命书语言归属验收（2026-11-05）
//
// 修的是什么（线上实测）：中文站用户拿到了一份【全英文】命书。
// 根因：中文 chart / charts 页生成请求只传 { token, chart }，不传 locale；
//   后端只能退回 cookie（mc_locale），而用户此前访问过 /en 页面，cookie 已是 en
//   → 报告按英文生成。英文与繁体页当时都显式传了 locale，只有中文漏了。
//
// 判据：凡是会触发命书生成的页面，必须在请求体里显式声明本树语言，
//   不允许依赖 cookie（cookie 会被任意语言页的访问改写）。
import { readFileSync } from 'node:fs'

let allPass = true
const failures = []
function fail(m) { allPass = false; failures.push(m); console.log('  ✗ ' + m) }
function ok(m) { console.log('  · ' + m) }
function assert(c, msg, failMsg) { if (c) ok(msg); else fail(failMsg ?? msg) }

// [文件, 期望的 locale 值]
const PAGES = [
  ['src/app/(zh)/chart/page.tsx', 'zh-Hans'],
  ['src/app/(zh)/charts/page.tsx', 'zh-Hans'],
  ['src/app/tw/chart/Client.tsx', 'zh-Hant'],
  ['src/app/tw/charts/Client.tsx', 'zh-Hant'],
  ['src/app/en/chart/Client.tsx', 'en'],
]

console.log('—— ① 生成请求必须显式带 locale ——')
for (const [f, loc] of PAGES) {
  const src = readFileSync(f, 'utf8')
  const has = new RegExp(`locale:\\s*'${loc}'`).test(src)
  assert(has, `${f}：显式传 locale: '${loc}'`, `${f}：未显式传 locale: '${loc}' —— 会退回 cookie，可能生成错语言`)
}

console.log('—— ② 不允许靠 cookie 兜底 ——')
for (const [f, loc] of PAGES) {
  const src = readFileSync(f, 'utf8')
  // 生成请求体里不得出现 localeFromRequest 之类的服务端兜底依赖（客户端也不该读 cookie 决定语言）
  const bodySnippet = src.slice(Math.max(0, src.indexOf('JSON.stringify({')), src.indexOf('JSON.stringify({') + 200)
  assert(!/mc_locale|LOCALE_COOKIE/.test(bodySnippet),
    `${f}：请求体不读语言 cookie（由页面决定）`,
    `${f}：请求体依赖语言 cookie —— 会被其它语言页的访问带偏`)
}

console.log('')
if (allPass) console.log('CHART_LOCALE_PASS')
else {
  console.log(`CHART_LOCALE_FAIL（${failures.length} 处）`)
  for (const x of failures) console.log('  - ' + x)
}
process.exitCode = allPass ? 0 : 1
