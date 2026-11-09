// 日页越界日期的状态码守门（2026-11-09）
//
// 口径：/bazi/{year}/{MM}/{DD} 只覆盖 1950-01-01 ～ 2010-12-31。
//   · 边界日（1950-01-01、2010-12-31）必须 200
//   · 范围外（1949 及更早、2011 及更晚）必须 410 Gone
//
// 为什么是 410 而不是 404/200：
//   日页本身 noindex，410 是搜索引擎的「已删除」信号；404 会被当作「暂时找不到」继续抓，
//   200 则把约 2 万条越界薄内容当成有效页留在索引里。两者都不该退回去。
//
// 为什么在 proxy.ts 判定：页面组件只能经 notFound() 返回 404，无法自行返回 410；
//   边缘层是当前唯一能给出 410 的位置。
import { readFileSync } from 'node:fs'

let allPass = true
const failures = []
const fail = (m) => { allPass = false; failures.push(m); console.log('  ✗ ' + m) }
const ok = (m) => console.log('  · ' + m)
const assert = (c, msg, fmsg) => (c ? ok(msg) : fail(fmsg ?? msg))

const proxy = readFileSync('src/proxy.ts', 'utf8')

console.log('—— ① 越界年份必须返回 410，且不是 404 ——')
assert(/yearNum\s*<\s*1950\s*\|\|\s*yearNum\s*>\s*2010/.test(proxy),
  'proxy 以 1950 / 2010 为边界判定越界年份',
  'proxy 丢了 1950/2010 边界判定 —— 越界日期会被重新当成有效页')
assert(/status:\s*410/.test(proxy),
  '越界响应状态码为 410',
  '越界响应不是 410（可能被改回 200，或退化成 404）')
assert(!/notFound\s*\(/.test(proxy),
  'proxy 未用 notFound()（410 不能退化成 404）',
  'proxy 出现了 notFound() —— 410 被退化成 404')

console.log('—— ② 日页路径必须进入 proxy，否则 410 判不到 ——')
assert(/['"]\/bazi\/:year\(\\\\d\{1,4\}\)\/:month\(\\\\d\{2\}\)\/:day\(\\\\d\{2\}\)['"]/.test(proxy),
  'matcher 覆盖已补零的 /bazi/:year/:month/:day',
  'matcher 未覆盖规范的日页路径 —— 越界日期会直接落到页面并返回 200')

console.log('—— ③ 410 响应必须带明确语义（noindex + 人话说明）——')
assert(/x-robots-tag['"]:\s*['"]noindex/i.test(proxy),
  '410 响应带 X-Robots-Tag: noindex',
  '410 响应缺 X-Robots-Tag —— 删除信号不够明确')
assert(/1950-01-01/.test(proxy) && /2010-12-31/.test(proxy),
  '410 响应体写明了支持范围（1950-01-01 ～ 2010-12-31）',
  '410 响应体没写支持范围 —— 用户与爬虫都看不出为什么是 Gone')

console.log('—— ④ 日页自身的合法性下限不得宽于 1950 ——')
{
  const page = readFileSync('src/app/(zh)/bazi/[year]/[month]/[day]/page.tsx', 'utf8')
  // 页面仍保留自己的兜底校验（1900-2100）只为「非 4 位年份/异常参数」的直出；
  // 真正的收录口径以 proxy 的 1950-2010 为准。这里只守住「页面不要放宽到 410 之外还渲染正常页」。
  assert(!/yearNum\s*<\s*1949/.test(page),
    '日页未把下界放宽到 1949',
    '日页把下界放到了 1949 —— 与 410 边界冲突')
}

if (!allPass) {
  console.log('\n✗ 日页 410 守门失败：')
  failures.forEach((f) => console.log('  - ' + f))
  process.exit(1)
}
console.log('\n✓ 日页 410 守门通过')
