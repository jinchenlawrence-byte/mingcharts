// 流年页标题退化 · 离线断言（第 32 轮）
//
// 缺陷：96 页 × 简繁中 45 页 relation==='平' 的标题写成「运势详解：运势」，
//   繁体同样「運勢詳解：運勢」；keywords 变成「2029年运势」废词。
// 根因：简繁两个路由各手写一份「关系→词」映射，'平' 分支被写成「运势/運勢」。
//
// 断的是（对应任务书 §四）：
//   ① 96 页 × 简繁标题不含退化串
//   ② 45 个 '平' 页：冒号后为 TAISUI_TITLE_WORD['平']（简）/ toHant(...)（繁）
//   ③ 45 个 '平' 页 keywords 不含「2029年运势」废词
//   ④ 96 页标题主体 ≤ 30 字（简繁分别算）
//   ⑤ 非 '平' 关系标题用词与修复前逐字一致（期望词表写死在本文件）
//   ⑥ 两个路由源码内不再出现 '平': '运势' / '平': '運勢' 字面量
//   ⑦ 繁体标题 === toHant(简体标题)（逐页，防手工漂移）
//
// ★ 全程离线：标题按页面同一模板拼装，不发请求、不启动 Next。

import { readFileSync } from 'node:fs'
import { SHENGXIAO, LIUNIAN_YEARS, getLiunian, TAISUI_TITLE_WORD, TAISUI_KEYWORD_WORD } from '../src/lib/shengxiaoData.ts'
import { toHant } from '../src/lib/hant.ts'

let allPass = true
const fail = (m) => { allPass = false; console.log('  ✗ ' + m) }
const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')

// 与页面模板逐字一致（改模板请同步这里，否则 ④⑦ 会红——这是有意的）
const titleSans = (year, name, word) => `${year}年属${name}运势详解：${word}，事业财运感情健康全解`
const titleHant = (year, name, word) => `${year}年屬${name}運勢詳解：${word}，事業財運感情健康全解`

// 修复前逐字词表（⑤ 的唯一基准；改任何一个字都必须先改这里并说明原因）
const EXPECT_NON_PING = {
  '值': '本命年值太岁',
  '冲': '冲太岁',
  '害': '害太岁',
  '刑': '刑太岁',
  '合': '合太岁',
}

const cases = []
for (const sx of SHENGXIAO) {
  for (const y of LIUNIAN_YEARS) {
    const ln = getLiunian(sx, y)
    cases.push({
      sx, y, relation: ln.relation,
      titleSans: titleSans(y, sx.name, TAISUI_TITLE_WORD[ln.relation]),
      titleHant: titleHant(y, toHant(sx.name), toHant(TAISUI_TITLE_WORD[ln.relation])),
      kw: `${y}年${TAISUI_KEYWORD_WORD[ln.relation]}`,
    })
  }
}
const ping = cases.filter((c) => c.relation === '平')
const nonPing = cases.filter((c) => c.relation !== '平')
console.log(`—— 样本：${cases.length} 页（'平' ${ping.length} 页 / 非平 ${nonPing.length} 页）——`)
if (cases.length !== 96) fail(`样本数 ${cases.length}（期望 96 = 12 生肖 × 8 年）`)
if (ping.length === 0) fail('样本里没有 relation===\'平\' 的页面，断言形同虚设')

// ---------- ① 退化串 ----------
{
  const bad = cases.filter((c) => c.titleSans.includes('运势详解：运势') || c.titleHant.includes('運勢詳解：運勢'))
  if (bad.length) fail(`① 退化标题 ${bad.length} 页：${bad.slice(0, 5).map((c) => c.titleSans).join(' | ')}`)
  else console.log(`  · ① 96 页 × 简繁 标题均不含「运势详解：运势 / 運勢詳解：運勢」`)
}

// ---------- ② '平' 页冒号后用词 ----------
{
  // ★ 期望值写死，不拿 TAISUI_TITLE_WORD['平'] 自证（否则常量本身写错时 ② 永远绿，牙口失效）
  const EXPECT_PING = '平顺之年'
  if (TAISUI_TITLE_WORD['平'] !== EXPECT_PING) fail(`② TAISUI_TITLE_WORD['平'] = 「${TAISUI_TITLE_WORD['平']}」（期望 ${EXPECT_PING}）`)
  const bad = ping.filter((c) => !c.titleSans.includes(`：${EXPECT_PING}，`))
  const badH = ping.filter((c) => !c.titleHant.includes(`：${toHant(EXPECT_PING)}，`))
  if (bad.length) fail(`② 简体 '平' 页 ${bad.length} 个冒号后不是「${TAISUI_TITLE_WORD['平']}」`)
  if (badH.length) fail(`② 繁体 '平' 页 ${badH.length} 个冒号后不是「${toHant(TAISUI_TITLE_WORD['平'])}」`)
  if (!bad.length && !badH.length) {
    console.log(`  · ② ${ping.length} 个 '平' 页：简体冒号后=「${TAISUI_TITLE_WORD['平']}」/ 繁体=「${toHant(TAISUI_TITLE_WORD['平'])}」`)
  }
  if (toHant('平顺之年') !== '平順之年') fail(`② toHant('平顺之年') = 「${toHant('平顺之年')}」（期望 平順之年）`)
}

// ---------- ③ keywords 废词 ----------
{
  const bad = ping.filter((c) => c.kw === `${c.y}年运势`)
  const kwBad = ping.filter((c) => TAISUI_KEYWORD_WORD[c.relation] === '运势')
  if (bad.length) fail(`③ '平' 页 keywords 废词 ${bad.length} 个：${bad.slice(0, 5).map((c) => c.kw).join(', ')}`)
  if (kwBad.length) fail(`③ TAISUI_KEYWORD_WORD['平'] 仍是「运势」`)
  if (!bad.length && !kwBad.length) {
    console.log(`  · ③ ${ping.length} 个 '平' 页 keywords 用「${TAISUI_KEYWORD_WORD['平']}」（如 ${ping[0].kw}），无「年运势」废词`)
  }
}

// ---------- ④ 标题主体长度 ----------
{
  const longestS = cases.reduce((m, c) => (c.titleSans.length > m.titleSans.length ? c : m))
  const longestH = cases.reduce((m, c) => (c.titleHant.length > m.titleHant.length ? c : m))
  const over = cases.filter((c) => c.titleSans.length > 30 || [...c.titleHant].length > 30)
  if (over.length) {
    fail(`④ 标题主体超 30 字 ${over.length} 页：最长简 ${longestS.titleSans.length} 字（${longestS.titleSans}）/ 繁 ${[...longestH.titleHant].length} 字（${longestH.titleHant}）`)
  } else {
    console.log(`  · ④ 最长：简体 ${longestS.titleSans.length} 字「${longestS.titleSans}」/ 繁体 ${[...longestH.titleHant].length} 字「${longestH.titleHant}」`)
  }
}

// ---------- ⑤ 非 '平' 页零变化 ----------
{
  const bad = nonPing.filter((c) => TAISUI_TITLE_WORD[c.relation] !== EXPECT_NON_PING[c.relation])
  if (bad.length) fail(`⑤ 非 '平' 页用词漂移 ${bad.length} 个：${bad.slice(0, 5).map((c) => `${c.relation}→${TAISUI_TITLE_WORD[c.relation]}`).join(', ')}`)
  else {
    console.log(`  · ⑤ 非平 ${nonPing.length} 页用词与修复前逐字一致（${Object.entries(EXPECT_NON_PING).map(([k, v]) => `${k}→${v}`).join(' / ')}）`)
  }
}

// ---------- ⑥ 源码无手写第二份映射 ----------
{
  const files = ['../src/app/shengxiao/[animal]/[year]/page.tsx', '../src/app/tw/shengxiao/[animal]/[year]/page.tsx']
  let hits = 0
  for (const f of files) {
    const code = read(f)
    for (const [needle, label] of [["'平': '运势'", "'平': '运势'"], ["'平': '運勢'", "'平': '運勢'"], ["'平':'运势'", "'平':'运势'"], ["'平':'運勢'", "'平':'運勢'"]]) {
      if (code.includes(needle)) { hits++; fail(`⑥ ${f.replace('../src/', '')} 仍含字面量 ${label}`) }
    }
    // 反向接线：必须真的从单一来源取值
    if (!code.includes('TAISUI_TITLE_WORD')) { hits++; fail(`⑥ ${f.replace('../src/', '')} 未引用 TAISUI_TITLE_WORD`) }
  }
  if (hits === 0) console.log('  · ⑥ 两个路由均无「平→运势/運勢」字面量，且都引用 TAISUI_TITLE_WORD')
}

// ---------- ⑦ 繁体 === toHant(简体) ----------
{
  const bad = cases.filter((c) => toHant(c.titleSans) !== c.titleHant)
  if (bad.length) {
    fail(`⑦ 简繁派生不一致 ${bad.length} 页，例：\n      简→繁 ${toHant(bad[0].titleSans)}\n      页面繁 ${bad[0].titleHant}`)
  } else {
    console.log(`  · ⑦ 96 页繁体标题全部 === toHant(简体标题)`)
  }
}

// ---------- 汇总 ----------
console.log(allPass
  ? `\n✓ ${cases.length} 页（含 '平' ${ping.length} 页）标题全部通过；简繁合计 ${cases.length * 2} 个页面`
  : '\n✗ 存在失败断言')
console.log(allPass ? 'LIUNIAN_TITLE_PASS' : 'LIUNIAN_TITLE_FAIL')
if (!allPass) process.exit(1)
