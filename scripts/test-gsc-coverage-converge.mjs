// GSC 覆盖报告驱动的两条收敛（2026-11-10）
//
// 数据依据（28 天，GSC 导出）：
//   · 索引：「已发现-尚未编入索引」528 条，其中 430 条是 /bazi，
//     年份分布 1950s 71 / 1960s 84 / 1970s 78 / 1980s 90 / 1990s 87 / 2000-2010 仅 20
//     → Google 看过这些页面（结构几乎一样），判定不值得收录。
//   · 效果：/bazi 全段 1,318 次展示、0 次点击
//     → noindex 掉零流量损失。
//   · 索引：404 里有 6 条是 /tw/bazi/… 与 /en/bazi/… 的深链（那两棵树没有 /bazi 路由）。
//
// 因此两条收敛：
//   ① 1990 年之前的月页 noindex（页面仍可访问，人类照用）
//   ② tw/en 的 /bazi 深链 301 到对应语言树入口（清 404，且不把用户扔进简体）
import { readFileSync } from 'node:fs'

let allPass = true
const failures = []
const fail = (m) => { allPass = false; failures.push(m); console.log('  ✗ ' + m) }
const ok = (m) => console.log('  · ' + m)
const assert = (c, msg, fmsg) => (c ? ok(msg) : fail(fmsg ?? msg))

console.log('—— ① 1990 前的月页必须 noindex ——')
{
  const src = readFileSync('src/app/(zh)/bazi/[year]/[month]/page.tsx', 'utf8')
  assert(/robots:\s*yearNum < 1990 \|\| yearNum > 2010/.test(src),
    '月页按年份边界给 noindex（1990–2010 之外）',
    '月页未按年份收敛 —— 历史月页会继续占用抓取预算与质量信号')
  assert(/index:\s*false/.test(src),
    'noindex 判定确实写了 index: false',
    'noindex 判定缺 index: false')
  assert(/follow:\s*true/.test(src),
    '保留 follow（站内链接仍可传递）',
    '缺 follow: true —— 会切断站内权重传递')
  // 1990–2010 是有效区间，不能被误伤成 noindex
  assert(/yearNum < 1990 \|\| yearNum > 2010/.test(src),
    '边界方向正确：只排除区间外的年份',
    '边界写反了 —— 会把有效年份也排除')
}

console.log('—— ② tw/en 的 /bazi 深链必须 301 到本语言树 ——')
{
  const src = readFileSync('src/proxy.ts', 'utf8')
  assert(/pathname\.match\(\/\^\\\/\(tw\|en\)\\\/bazi/.test(src),
    'proxy 匹配 /tw/bazi 与 /en/bazi',
    'proxy 没有处理 tw/en 的 /bazi 深链 —— 404 会一直在 GSC 里')
  assert(/NextResponse\.redirect\(url, 301\)/.test(src),
    '用 301 永久重定向',
    '没看到 301 —— 404 不会被永久清理')
  // 目标必须是本语言树入口，不能是 /bazi（否则繁体/英文用户被扔进简体内容）
  assert(/url\.pathname = `\/\$\{otherTreeBazi\[1\]\}`/.test(src),
    '重定向目标是同语言树入口',
    '重定向目标不是同语言树 —— 会把繁体/英文用户送进简体内容')
  assert(/'\/tw\/bazi\/:path\*'/.test(src) && /'\/en\/bazi\/:path\*'/.test(src),
    'matcher 覆盖两棵树的 /bazi 深链',
    'matcher 未覆盖 —— 请求不会进 proxy')
}

console.log('')
if (allPass) console.log('GSC_COVERAGE_CONVERGE_PASS')
else {
  console.log(`GSC_COVERAGE_CONVERGE_FAIL（${failures.length} 处）`)
  for (const x of failures) console.log('  - ' + x)
}
process.exitCode = allPass ? 0 : 1
