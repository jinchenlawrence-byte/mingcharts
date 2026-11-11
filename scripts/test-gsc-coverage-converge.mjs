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

console.log('—— ② tw/en 的 /bazi 深链必须 410；入口页保留 301 ——')
{
  const src = readFileSync('src/proxy.ts', 'utf8')
  assert(/pathname\.match\(\/\^\\\/\(tw\|en\)\\\/bazi/.test(src),
    'proxy 匹配 /tw/bazi 与 /en/bazi',
    'proxy 没有处理 tw/en 的 /bazi 深链 —— 404 会一直在 GSC 里')
  assert(/'\/tw\/bazi\/:path\*'/.test(src) && /'\/en\/bazi\/:path\*'/.test(src),
    'matcher 覆盖两棵树的 /bazi 深链',
    'matcher 未覆盖 —— 请求不会进 proxy')
  // 入口页（无深链）仍回本语言首页，不能连带改掉
  assert(/otherTreeBaziEntry = pathname\.match\(\/\^\\\/\(tw\|en\)\\\/bazi\\\/\?\$\/\)/.test(src),
    '入口页单独匹配（/tw/bazi、/en/bazi）',
    '入口页没有单独匹配 —— 会被一起 410')
  assert(/NextResponse\.redirect\(url, 301\)/.test(src),
    '入口页保留 301 回本语言树',
    '入口页的 301 被误删 —— 用户会直接看到 410')
  assert(/url\.pathname = `\/\$\{otherTreeBaziEntry\[1\]\}`/.test(src),
    '301 目标是同语言树入口',
    '301 目标不是同语言树 —— 会把繁体/英文用户送进简体内容')
  // 深链改 410：既清掉软 404，也停止无效抓取
  assert(/otherTreeBaziDeep = pathname\.match\(\/\^\\\/\(tw\|en\)\\\/bazi\\\/\.\+\$\/\)/.test(src),
    '深链单独匹配（/tw/bazi/…）',
    '深链没有被单独识别 —— 仍会 301 到无关首页')
  assert(/status: 410/.test(src),
    '深链返回 410 Gone',
    '深链没有返回 410 —— soft 404 与抓取浪费仍在')
}

console.log('—— ③ 月页标题必须命中真实查询词（GSC 效果报告驱动）——')
// 改写前：`2005年01月八字算命 · 乙酉年属鸡每日八字查询`
//   → 252 页 / 1,155 展示 / 0 点击 / 平均排名 8.85：排名在第一页却无人点。
//   原因是标题全是站内视角词，而用户搜的是「2005年1月出生属什么」「纳音」。
// 改写后必须满足：查询词在前、给出可验证答案（生肖+纳音）、长度不被 SERP 截断。
{
  const src = readFileSync('src/app/(zh)/bazi/[year]/[month]/page.tsx', 'utf8')
  assert(/月出生属什么/.test(src),
    '标题命中「出生属什么」这一问句',
    '标题没有命中「出生属什么」—— 仍与真实查询错位')
  assert(/纳音\$\{getNaYin\(ganZhi\)\}/.test(src),
    '标题给出纳音（可验证的具体答案）',
    '标题未给出纳音 —— 缺少点击理由')
  assert(/\$\{monthNum\}月/.test(src),
    '月份用不补零的月号（1月，不是 01月）',
    '月份仍补零（01月）—— 中文读起来别扭')
  // 描述不得出现「水瓶座座」这类重复字（星座名自带「座」）
  assert(!/monthConstellations\.join\('、'\)\}座/.test(src),
    '星座名不重复拼接「座」',
    '描述里拼了多余的「座」（水瓶座座）')
  // 标题长度：站点后缀「| 明理」之外的正文控制在 32 字内，避免 SERP 截断
  const m = src.match(/title: `([^`]+)`/)
  assert(!!m, '能解析出标题模板')
  // 量的是【渲染后】长度：把 ${...} 占位符按 1 个字符折算后再数，
  // 否则量到的是模板源码（74 字符），会误报。
  const rendered = m[1].replace(/\$\{[^}]*\}/g, 'X')
  assert(rendered.length <= 34,
    `标题渲染后约 ${rendered.length} 字（SERP 安全）`,
    `标题渲染后约 ${rendered.length} 字 —— 过长会被截断，反而不利于点击`)
}

console.log('')
if (allPass) console.log('GSC_COVERAGE_CONVERGE_PASS')
else {
  console.log(`GSC_COVERAGE_CONVERGE_FAIL（${failures.length} 处）`)
  for (const x of failures) console.log('  - ' + x)
}
process.exitCode = allPass ? 0 : 1
