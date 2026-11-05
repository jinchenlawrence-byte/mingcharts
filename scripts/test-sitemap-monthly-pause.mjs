// 第 3 步断言：732 个月页暂缓提交 sitemap（页面仍可访问、仍可索引，不是 noindex）。
//
// 用法：
//   npx tsx scripts/test-sitemap-monthly-pause.mjs
//   SITE_URL=https://www.mingcharts.com npx tsx scripts/test-sitemap-monthly-pause.mjs

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import * as sitemapModule from '../src/app/sitemap.ts'

const ROOT = dirname(fileURLToPath(import.meta.url)) + '/..'
let f = 0
const fail = m => { f++; console.log(`FAIL ${m}`) }
const ok = m => console.log(`PASS ${m}`)

const src = readFileSync(join(ROOT, 'src/app/sitemap.ts'), 'utf8')
if (!src.includes('INCLUDE_BAZI_MONTHLY_IN_SITEMAP = false')) {
  fail('sitemap 开关 INCLUDE_BAZI_MONTHLY_IN_SITEMAP 未显式设为 false')
}
if (!src.includes('GSC')) fail('sitemap 开关缺少「等 GSC 数据后再决定」的说明注释')
if (!src.includes('仍然 200、仍然可索引')) fail('sitemap 注释未说明月页不是 noindex')
ok('开关与注释存在：月页暂缓提交，非 noindex')

// tsx 对 TS 默认导出的 CJS interop 会多包一层，这里兼容两种形态。
const rawModule = sitemapModule.default
const sitemap = typeof rawModule === 'function' ? rawModule : rawModule?.default
if (typeof sitemap !== 'function') {
  console.log('FAIL 无法加载 sitemap 默认导出')
  process.exit(1)
}
const entries = sitemap()
const paths = entries.map(e => e.url.replace(/^https?:\/\/[^/]+/, ''))
const monthly = paths.filter(p => /^\/bazi\/\d{4}\/\d{2}$/.test(p))
const yearPages = paths.filter(p => /^\/bazi\/\d{4}$/.test(p))

if (monthly.length !== 0) fail(`sitemap 仍含 ${monthly.length} 条月页（例：${monthly.slice(0, 3).join(', ')}）`)
else ok('sitemap 不再包含任何 /bazi/{year}/{MM} 月页')
if (yearPages.length !== 61) fail(`sitemap 年页数 ${yearPages.length}，期望 61`)
else ok('sitemap 仍保留 61 个年页')
if (!paths.includes('/bazi')) fail('sitemap 缺少 /bazi 索引页')
if (entries.length !== 615) fail(`sitemap 总数 ${entries.length}，期望 615`)
else ok('sitemap 总数 615（601 + 14 条英文生肖/我的命盘）')

const hant = paths.filter(p => p.startsWith('/tw')).length
const en = paths.filter(p => p.startsWith('/en')).length
const zh = paths.length - hant - en
console.log(`sitemap 语言分布（撤出后）：zh=${zh} / tw=${hant} / en=${en} / 合计=${paths.length}`)
console.log(`sitemap 语言分布（撤出前）：zh=${zh + 732} / tw=${hant} / en=${en} / 合计=${paths.length + 732}`)

// 月页源码：仍可索引（有自指 canonical，无 noindex）。
const monthSrc = readFileSync(join(ROOT, 'src/app/(zh)/bazi/[year]/[month]/page.tsx'), 'utf8')
if (!monthSrc.includes('canonical: `/bazi/${year}/${month}`')) fail('月页缺少自指 canonical')
if (/robots\s*:\s*\{[^}]*index\s*:\s*false/.test(monthSrc)) fail('月页被设为 noindex，违反「暂缓提交」')
ok('月页源码仍可索引：canonical 自指、无 noindex')

const BASE = process.env.SITE_URL
if (BASE) {
  const res = await fetch(`${BASE}/bazi/1990/03`, { redirect: 'manual' })
  if (res.status !== 200) fail(`线上 /bazi/1990/03 状态 ${res.status}`)
  else {
    const html = await res.text()
    if (!html.includes(`rel="canonical" href="${BASE}/bazi/1990/03"`)) fail('线上 /bazi/1990/03 canonical 未自指')
    if (/name="robots"[^>]*noindex/.test(html)) fail('线上 /bazi/1990/03 含 noindex')
    console.log('PASS 线上 /bazi/1990/03 → 200，canonical 自指，可索引')
  }

  const sm = await fetch(`${BASE}/sitemap.xml`)
  if (sm.status !== 200) fail(`线上 sitemap.xml 状态 ${sm.status}`)
  else {
    const xml = await sm.text()
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1])
    const bad = locs.filter(u => /\/bazi\/\d{4}\/\d{2}$/.test(u))
    if (bad.length) fail(`线上 sitemap 仍含 ${bad.length} 条月页`)
    else ok(`线上 sitemap 无月页，共 ${locs.length} 条`)
  }
} else {
  console.log('未设置 SITE_URL，跳过线上断言')
}

if (f > 0) {
  console.log(`\n${f} 项失败`)
  process.exit(1)
}
console.log('\n月页暂缓提交断言全部通过')
