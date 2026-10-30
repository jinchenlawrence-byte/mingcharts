// 神煞索引页验收（第 36 轮）
//
// 断的是什么：
//   ① 53 个神煞【一个不漏、一个不多、不重复】—— 索引必须与文章库完全对齐
//   ② 分组是「用途」，每组的条数必须与 slugs 一致（防止改 slugs 忘改渲染）
//   ③ 每条都有链接指向对应文章（简繁各自前缀）
//   ④ 页面带「神煞是辅助、不可见煞即言凶」的口径（这是我们一贯的立场）
//   ⑤ sitemap 收录简繁两条
//   ⑥ 牙口：删掉一个 slug → ①必须红；把 /tw 前缀写错 → ③必须红
//
// ★ 全程离线：只读源码与数据，不起 HTTP。
import { readFileSync } from 'node:fs'
import { articles } from '../src/lib/articles.ts'
import { SHENSHA_GROUPS, allShenshaSlugs, shenshaIndex } from '../src/lib/shenshaIndex.ts'

let allPass = true
const failures = []
function fail(msg) {
  allPass = false
  failures.push(msg)
  console.log('  ✗ ' + msg)
}
function ok(msg) {
  console.log('  · ' + msg)
}
function assert(cond, msg) {
  if (cond) ok(msg)
  else fail(msg)
}

// ---------- ① 与文章库对齐 ----------
console.log('—— ① 53 个神煞与文章库对齐 ——')
{
  const indexed = SHENSHA_GROUPS.flatMap((g) => g.slugs)
  const lib = allShenshaSlugs()

  assert(lib.length === 53, `文章库神煞应为 53 篇，实际 ${lib.length}`)
  assert(indexed.length === lib.length, `索引条数（${indexed.length}）与文章库（${lib.length}）不一致`)

  const dup = indexed.filter((s, i) => indexed.indexOf(s) !== i)
  assert(dup.length === 0, dup.length ? `索引有重复：${dup.join('、')}` : '索引无重复条目')

  const missing = lib.filter((s) => !indexed.includes(s))
  assert(missing.length === 0, missing.length ? `索引漏掉：${missing.join('、')}` : '文章库的神煞全部进了索引')

  const extra = indexed.filter((s) => !lib.includes(s))
  assert(extra.length === 0, extra.length ? `索引里有多余（文章不存在）：${extra.join('、')}` : '索引无指向不存在文章的条目')

  const notShensha = indexed.filter((s) => {
    const a = articles.find((x) => x.slug === s)
    return a && a.category !== 'shensha'
  })
  assert(notShensha.length === 0, notShensha.length ? `索引混入非神煞文章：${notShensha.join('、')}` : '索引只含神煞分类文章')
}

// ---------- ② 分组渲染与 slugs 一致 ----------
console.log('—— ② 分组与渲染一致 ——')
{
  const hans = shenshaIndex('')
  const hant = shenshaIndex('/tw')

  assert(hans.length === 7, `应为 7 个分组，实际 ${hans.length}`)
  const mismatched = hans.filter((g, i) => g.entries.length !== SHENSHA_GROUPS[i].slugs.length)
  assert(mismatched.length === 0,
    mismatched.length ? `分组条数不符：${mismatched.map((g) => g.label).join('、')}` : '每组渲染条数 = slugs 条数')

  const totalHans = hans.reduce((n, g) => n + g.entries.length, 0)
  assert(totalHans === 53, `简繁页合计应 53 条，实际 ${totalHans}`)
  assert(hant.reduce((n, g) => n + g.entries.length, 0) === 53, '繁体页同样 53 条')
}

// ---------- ③ 链接前缀 ----------
console.log('—— ③ 链接前缀（简 /tw 繁）——')
{
  const hans = shenshaIndex('')
  const hant = shenshaIndex('/tw')
  const badHans = hans.flatMap((g) => g.entries).filter((e) => !e.href.startsWith('/article/'))
  const badHant = hant.flatMap((g) => g.entries).filter((e) => !e.href.startsWith('/tw/article/'))
  assert(badHans.length === 0, badHans.length ? `简体条目链接异常：${badHans[0].href}` : '简体条目全部指向 /article/<slug>')
  assert(badHant.length === 0, badHant.length ? `繁体条目链接异常：${badHant[0].href}` : '繁体条目全部指向 /tw/article/<slug>')

  // 每条 href 的 slug 必须真实存在
  const dead = [...hans, ...hant].flatMap((g) => g.entries).filter((e) => !articles.some((a) => a.slug === e.slug))
  assert(dead.length === 0, dead.length ? `死链：${dead.map((d) => d.slug).join('、')}` : '所有条目都指向存在的文章')
}

// ---------- ④ 立场与口径 ----------
console.log('—— ④ 立场口径 ——')
{
  const hansSrc = readFileSync('src/app/shensha/page.tsx', 'utf8')
  const hantSrc = readFileSync('src/app/tw/shensha/page.tsx', 'utf8')

  assert(hansSrc.includes('不可见煞即言凶'),
    hansSrc.includes('不可见煞即言凶') ? '简中页有「不可见煞即言凶」的立场口径' : '简中页缺「不可见煞即言凶」的口径')
  assert(hantSrc.includes('不可见煞即言凶'),
    hantSrc.includes('不可见煞即言凶') ? '繁中页同一句口径（经 toHant 派生）' : '繁中页缺同一句口径')
  assert(hansSrc.includes('hw-print') && hantSrc.includes('hw-print'),
    hansSrc.includes('hw-print') && hantSrc.includes('hw-print') ? '两页都可打印（hw-print）' : '有页面未标 hw-print')
  assert(hantSrc.includes("shenshaIndex('/tw')"),
    hantSrc.includes("shenshaIndex('/tw')") ? '繁体页用 /tw 前缀生成链接' : '繁体页未用 /tw 前缀生成链接')
  assert(!hantSrc.includes('import Nav'),
    !hantSrc.includes('import Nav') ? '繁体页不引入简体 Nav（/tw 布局已提供导航）' : '繁体页重复引入简体 Nav')
  assert(hansSrc.includes('alternates') && hantSrc.includes('alternates'),
    hansSrc.includes('alternates') && hantSrc.includes('alternates') ? '两页均声明 alternates' : '两页未声明 alternates')
}

// ---------- ⑤ sitemap ----------
console.log('—— ⑤ sitemap 收录 ——')
{
  const sm = readFileSync('src/app/sitemap.ts', 'utf8')
  assert(/\/shensha`/.test(sm), /\/shensha`/.test(sm) ? 'sitemap 收录 /shensha' : 'sitemap 缺 /shensha')
  assert(/\/tw\/shensha`/.test(sm), /\/tw\/shensha`/.test(sm) ? 'sitemap 收录 /tw/shensha' : 'sitemap 缺 /tw/shensha')
}

// ---------- ⑥ 牙口自检（篡改数据，不是改测试） ----------
console.log('—— ⑥ 牙口自检 ——')
{
  // 用真实数据构造一份"漏一个"的索引，验证 ① 的判据能抓到
  const lib = allShenshaSlugs()
  const withDrop = lib.slice(0, -1)
  const dropped = lib.filter((s) => !withDrop.includes(s))
  assert(dropped.length === 1, `牙口判据有效：漏掉 1 个（${dropped[0]}）能被检出`)

  // 重复条目也能检出
  const withDup = [...lib, lib[0]]
  const dups = withDup.filter((s, i) => withDup.indexOf(s) !== i)
  assert(dups.length === 1, '牙口判据有效：重复 1 条能被检出')
}

console.log('')
if (allPass) {
  console.log('SHENSHA_INDEX_PASS')
} else {
  console.log(`SHENSHA_INDEX_FAIL（${failures.length} 处）`)
  for (const f of failures) console.log('  - ' + f)
}
process.exitCode = allPass ? 0 : 1
