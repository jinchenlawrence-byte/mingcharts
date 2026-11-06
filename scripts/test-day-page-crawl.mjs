// 日页的抓取边界（2026-11-05）
//
// 背景：/bazi/{year}/{MM}/{DD} 约 2.2 万条薄内容，已设 noindex（不进索引）、
// 不在 sitemap。但 noindex 只阻止【收录】，不阻止【抓取】——爬虫会顺着月页里
// 那 30 条日页链接逐月抓一遍，而日页是 force-dynamic：每抓一次就 SSR 渲染一次，
// 直接消耗 Fluid Active CPU（Hobby 只有 4h / 滚动 30 天，超了会暂停项目）。
//
// 判据：robots 必须挡住日页；同时日页自身仍保留 noindex（双保险，且人类访问不受影响）。
import { readFileSync } from 'node:fs'

let allPass = true
const failures = []
const fail = (m) => { allPass = false; failures.push(m); console.log('  ✗ ' + m) }
const ok = (m) => console.log('  · ' + m)
const assert = (c, msg, fmsg) => (c ? ok(msg) : fail(fmsg ?? msg))

console.log('—— ① robots 挡住日页（爬虫不再触发 SSR）——')
{
  const src = readFileSync('src/app/robots.ts', 'utf8')
  assert(/disallow:\s*\[[^\]]*'\/bazi\/\*\/\*\/\*'/.test(src),
    "robots disallow 含 '/bazi/*/*/*'",
    "robots 未挡住日页 —— 爬虫会逐月抓 2.2 万条 force-dynamic 页面，烧 CPU")
  // 必须保留原有的三条，别为了加新规则把旧规则挤掉
  for (const p of ["'/api/'", "'/charts'", "'/auth'"]) {
    assert(src.includes(p), `robots 仍挡 ${p}`, `robots 丢了 ${p}（新规则覆盖了旧规则）`)
  }
}

console.log('—— ② 日页自身仍是 noindex（双保险）——')
{
  const src = readFileSync('src/app/(zh)/bazi/[year]/[month]/[day]/page.tsx', 'utf8')
  assert(/index:\s*false/.test(src),
    '日页仍是 noindex（不进索引）',
    '日页不再是 noindex —— 薄内容会进索引')
}

console.log('—— ③ 日页不得进 sitemap ——')
{
  const src = readFileSync('src/app/sitemap.ts', 'utf8')
  assert(!/bazi\/\$\{[^}]*\}\/\$\{[^}]*\}\/\$\{/.test(src),
    'sitemap 不含日页 URL',
    'sitemap 又把日页收进来了（2.2 万条会把站点质量分拉低）')
}

console.log('')
if (allPass) console.log('DAY_PAGE_CRAWL_PASS')
else {
  console.log(`DAY_PAGE_CRAWL_FAIL（${failures.length} 处）`)
  for (const x of failures) console.log('  - ' + x)
}
process.exitCode = allPass ? 0 : 1
