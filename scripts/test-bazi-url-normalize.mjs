// 校验 /bazi 年月日 URL 补零归一。
// 默认静态检查源码；设置 SITE_URL 时追加线上 HTTP 断言（308 一跳 + 规范页 200 自指 canonical）。
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const src = readFileSync(new URL('../src/proxy.ts', import.meta.url), 'utf8')
assert(src.includes("match(/^\\/bazi\\/(\\d{4})"), 'proxy 未匹配 /bazi 年份路径')
assert(src.includes("padStart(2, '0')"), 'proxy 未对月/日补零')
assert(src.includes('NextResponse.redirect(url, 308)'), 'proxy 未使用 308 永久重定向')
assert(src.includes("'/bazi/:path*'"), 'proxy matcher 未限定 /bazi')
console.log('静态检查通过：proxy 对 /bazi 的非补零月/日做 308 归一')

const BASE = process.env.SITE_URL
if (!BASE) {
  console.log('未设置 SITE_URL，跳过线上 HTTP 断言')
  process.exit(0)
}

const cases = [
  { from: '/bazi/1990/3', to: '/bazi/1990/03' },
  { from: '/bazi/1990/3/15', to: '/bazi/1990/03/15' },
  { from: '/bazi/1990/03/5', to: '/bazi/1990/03/05' },
  { from: '/bazi/1990/3/5', to: '/bazi/1990/03/05' },
]

let failed = 0
for (const c of cases) {
  const res = await fetch(BASE + c.from, { redirect: 'manual' })
  const loc = res.headers.get('location') || ''
  const ok = res.status === 308 && loc.endsWith(c.to)
  if (!ok) failed++
  console.log(`${ok ? 'PASS' : 'FAIL'} ${c.from} -> ${res.status} ${loc}`)
}

for (const p of ['/bazi/1990/03', '/bazi/1990/03/15']) {
  const res = await fetch(BASE + p, { redirect: 'manual' })
  const html = await res.text()
  const canon = (html.match(/<link rel="canonical" href="([^"]*)"/) || [])[1] || ''
  const ok = res.status === 200 && canon.endsWith(p)
  if (!ok) failed++
  console.log(`${ok ? 'PASS' : 'FAIL'} ${p} -> ${res.status} canonical=${canon}`)
}

if (failed) {
  console.error(`线上断言失败 ${failed} 项`)
  process.exit(1)
}
console.log('线上 HTTP 断言全部通过')
