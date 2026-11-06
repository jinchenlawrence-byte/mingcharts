// 日页的边界守门（2026-11-05，历经三次修正后的最终口径）
//
// 对象：/bazi/{year}/{MM}/{DD}（约 2.2 万条薄内容）
//
// 三条已定的事实（别再退回旧做法）：
//   1. 日页是 noindex —— 所以 robots 【不能】Disallow 它。
//      挡住抓取后 Google 读不到 noindex，已收录 URL 会长期卡在
//      「已编入索引，但被 robots.txt 屏蔽」，比不挡更难清理。
//   2. 省 CPU 的正解是 ISR，不是 robots / UA 判断：
//      日页曾用 force-dynamic，线上响应头是 private, no-cache, no-store，
//      每次访问都重算排盘。现改为 revalidate + generateStaticParams
//      （只预渲染最近 30 天，其余按需生成后缓存），实测 X-Vercel-Cache: HIT。
//      ★ 只删 force-dynamic 不够：没有 generateStaticParams 的路由会被 Next
//        判为 ƒ 动态渲染，revalidate 不落地。
//   3. 月页不再在服务端 HTML 里输出 30 条日页链接（折叠组件），减少被发现的入口。
//      ★ 不要做「爬虫给空壳、真人给全文」的 UA 分流 —— 那是 cloaking。
//
// 本文件的断言与上面三条一一对应；改了做法就要一起改这里。
import { readFileSync } from 'node:fs'

let allPass = true
const failures = []
const fail = (m) => { allPass = false; failures.push(m); console.log('  ✗ ' + m) }
const ok = (m) => console.log('  · ' + m)
const assert = (c, msg, fmsg) => (c ? ok(msg) : fail(fmsg ?? msg))

console.log('—— ① robots 不得挡住日页（否则 noindex 读不到）——')
// ★ 2026-11-05 修正：先前这里要求 robots Disallow 日页，是错的 ——
//   日页是 noindex。robots 挡住抓取后 Google 读不到 noindex，
//   已收录 URL 会卡在「已编入索引，但被 robots.txt 屏蔽」，比不挡更难清理。
//   省 CPU 的正解是 ISR（见 ②），不是 robots。
{
  const src = readFileSync('src/app/robots.ts', 'utf8')
  assert(!/disallow:\s*\[[^\]]*'\/bazi\/\*\/\*\/\*'/.test(src),
    'robots 未 Disallow 日页（noindex 可被读到）',
    'robots 又挡住日页 —— noindex 读不到，URL 会长期卡在「已编入索引但被屏蔽」')
  for (const p of ["'/api/'", "'/charts'", "'/auth'"]) {
    assert(src.includes(p), `robots 仍挡 ${p}`, `robots 丢了 ${p}`)
  }
}

console.log('—— ② 日页必须是 ISR，不能 force-dynamic ——')
// 实测（2026-11-05）：force-dynamic 时线上响应头是
//   Cache-Control: private, no-cache, no-store  ·  X-Vercel-Cache: MISS
// 即每次访问都重算排盘 —— robots 与折叠只能减少请求数，降不了单次成本。
{
  const src = readFileSync('src/app/(zh)/bazi/[year]/[month]/[day]/page.tsx', 'utf8')
  assert(!/export const dynamic = 'force-dynamic'/.test(src),
    '日页未使用 force-dynamic（ISR 缓存生效）',
    '日页仍是 force-dynamic —— 每个请求都重算，ISR 形同虚设')
  assert(/export const revalidate = \d+/.test(src),
    '日页声明了 revalidate（ISR 缓存周期）',
    '日页没有 revalidate —— 不会缓存')
  assert(/index:\s*false/.test(src),
    '日页仍是 noindex（薄内容不进索引）',
    '日页不再 noindex —— 2.2 万条薄内容会进索引')
}

console.log('—— ②B 日页必须有 generateStaticParams（否则 Next 判为 ƒ，ISR 不生效）——')
// 实测教训（2026-11-05）：只删 force-dynamic 不够 ——
// 动态段路由若没有 generateStaticParams，Next 仍判为 ƒ（每次请求渲染），
// 线上响应头依旧是 `private, no-cache, no-store`。补一个小的预渲染集合后
// 才被判定可静态化，其余日期走按需 ISR。
{
  const src = readFileSync('src/app/(zh)/bazi/[year]/[month]/[day]/page.tsx', 'utf8')
  assert(/export function generateStaticParams\(\)/.test(src),
    '日页提供 generateStaticParams（路由被判定可静态化）',
    '日页缺 generateStaticParams —— Next 会判为 ƒ，ISR 缓存不生效')
  assert(/export const dynamicParams = true/.test(src),
    'dynamicParams = true（未预渲染的日期按需生成并缓存）',
    '未声明 dynamicParams —— 未预渲染的日期会 404，而不是按需生成')
}

console.log('—— ③ 日页不得进 sitemap ——')
{
  const src = readFileSync('src/app/sitemap.ts', 'utf8')
  assert(!/bazi\/\$\{[^}]*\}\/\$\{[^}]*\}\/\$\{/.test(src),
    'sitemap 不含日页 URL',
    'sitemap 又把日页收进来了（2.2 万条会把站点质量分拉低）')
}

console.log('—— ④ 月页不得在服务端 HTML 里输出日页链接 ——')
// B 方案（2026-11-05）：日页是站内工具。若月页把 30 条日页链接写进 HTML，
// 抓取方就能发现它们 —— 每条日页都是 force-dynamic，被抓一次渲染一次。
// 判据：月页必须用 MonthDays 组件（折叠），且自己不直接渲染 /bazi/{y}/{m}/{d} 链接。
{
  const month = readFileSync('src/app/(zh)/bazi/[year]/[month]/page.tsx', 'utf8')
  assert(/<MonthDays\s/.test(month),
    '月页使用折叠组件 MonthDays',
    '月页未使用折叠组件 —— 日页链接会直接进 HTML')
  assert(!/href=\{`\/bazi\/\$\{year\}\/\$\{month\}\/\$\{/.test(month),
    '月页不再直接输出日页链接',
    '月页仍直接渲染日页链接 —— 抓取方会发现 2.2 万条日页')
  const comp = readFileSync('src/components/bazi/MonthDays.tsx', 'utf8')
  assert(/useState/.test(comp) && /open \?/.test(comp),
    'MonthDays 默认折叠、点击才渲染链接',
    'MonthDays 未做折叠 —— 链接仍在首屏 HTML')
}

console.log('')
if (allPass) console.log('DAY_PAGE_CRAWL_PASS')
else {
  console.log(`DAY_PAGE_CRAWL_FAIL（${failures.length} 处）`)
  for (const x of failures) console.log('  - ' + x)
}
process.exitCode = allPass ? 0 : 1
