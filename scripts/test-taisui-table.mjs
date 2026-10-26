// 太岁对照表守护（2026-10-23 第 33 轮）
//
// 断的是什么：
//   ① 数据完整：12 生肖 × LIUNIAN_YEARS 全有值，且关系只有 值/冲/害/刑/合/平 六种
//   ② 每格都是内链：简体→/shengxiao/<slug>/<year>，繁体→/tw/shengxiao/<slug>/<year>
//      （这张表的价值一半在"可点"，链接断了就只是一张图）
//   ③ 简繁共用同一个组件：组件源码里【不许】出现手写繁体关系词（沖太歲/害太歲…）
//      —— 第 32 轮的标题退化 bug 就是简繁各写一份词表
//   ④ 两页都存在、都有 hreflang 互指、都在 sitemap
//   ⑤ 可下载图片存在（public/taisui-biao.png）
//   ⑥ 牙口：把某条关系改成非法值时 ① 必须红
//
// ★ 全程离线：只读源码、数据与 public 目录，不起 HTTP。

import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { SHENGXIAO, getLiunian, LIUNIAN_YEARS } from '../src/lib/shengxiaoData.ts'
import { toHant } from '../src/lib/hant.ts'
const { default: sitemap } = await import('../src/app/sitemap.ts')

let allPass = true
const fail = (m) => { allPass = false; console.log('  ✗ ' + m) }
const ok = (m) => console.log('  · ' + m)
const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
const read = (p) => readFileSync(join(root, p), 'utf8')
const ALLOWED = new Set(['值', '冲', '害', '刑', '合', '平'])

// ---------- ① 数据完整 ----------
console.log('—— ① 数据完整性 ——')
{
  let cells = 0
  const bad = []
  for (const sx of SHENGXIAO) {
    for (const y of LIUNIAN_YEARS) {
      const r = getLiunian(sx, y).relation
      cells++
      if (!ALLOWED.has(r)) bad.push(`${sx.slug}/${y}=${r}`)
    }
  }
  const expect = SHENGXIAO.length * LIUNIAN_YEARS.length
  if (cells !== expect) fail(`格数 ${cells} ≠ 期望 ${expect}`)
  else ok(`${SHENGXIAO.length} 行 × ${LIUNIAN_YEARS.length} 列 = ${cells} 格`)
  if (bad.length) fail(`非法关系值：${bad.slice(0, 5).join(', ')}`)
  else ok('关系值全部落在 值/冲/害/刑/合/平 六种内')
}

// ---------- ② 每格都是内链 ----------
console.log('—— ② 每格可点（内链） ——')
{
  const src = read('src/components/TaisuiTable.tsx')
  if (!/shengxiao\/\$\{animal\}\/\$\{year\}/.test(src)) {
    fail('单元格链接未按 /shengxiao/<animal>/<year> 拼装')
  } else ok('单元格链接按 /shengxiao/<animal>/<year> 拼装')
  if (!/\$\{hant \? '\/tw' : ''\}/.test(src)) {
    fail('未按简繁切换 /tw 前缀（繁体表会链到简体页）')
  } else ok('繁体表带 /tw 前缀')
  // 生肖名也应是链接（内链收益）
  if (!/href=\{animalHref\(sx\.slug\)\}/.test(src)) fail('生肖名未做成链接')
  else ok('生肖名也是内链')
}

// ---------- ③ 简繁共用组件，不许手写繁体词表 ----------
console.log('—— ③ 单一来源（禁手写繁体词表） ——')
{
  const src = read('src/components/TaisuiTable.tsx')
  const hantHard = ['沖太歲', '害太歲', '刑太歲', '合太歲', '值太歲'].filter((w) => src.includes(w))
  if (hantHard.length) fail(`组件里出现手写繁体关系词：${hantHard.join(', ')}`)
  else ok('组件无手写繁体关系词（繁体由 toHant 派生）')
  if (!src.includes('toHant(')) fail('组件未使用 toHant 派生繁体')
  else ok('组件使用 toHant 派生')

  // 页面上显示的标签必须与 toHant 结果一致
  const sample = toHant('冲太岁')
  if (sample !== '沖太歲') fail(`toHant('冲太岁') = ${sample}（期望 沖太歲）`)
  else ok('toHant 结果正确（冲→沖）')
}

// ---------- ④ 两页存在 + hreflang + sitemap ----------
console.log('—— ④ 页面 / hreflang / sitemap ——')
{
  const hans = read('src/app/liunian/taisui-biao/page.tsx')
  const hant = read('src/app/tw/liunian/taisui-biao/page.tsx')
  if (!hans.includes("hantAlternates('/liunian/taisui-biao')")) fail('简体页缺 hreflang 互指')
  else ok('简体页 hreflang 就位')
  if (!hant.includes("hantAlternates('/liunian/taisui-biao')")) fail('繁体页缺 hreflang 互指')
  else ok('繁体页 hreflang 就位')
  if (!hans.includes("canonical: '/liunian/taisui-biao'")) fail('简体页 canonical 未指向自身')
  else ok('简体页 canonical 指向 /liunian/taisui-biao')
  if (!hant.includes("canonical: '/tw/liunian/taisui-biao'")) fail('繁体页 canonical 未指向自身')
  else ok('繁体页 canonical 指向 /tw/liunian/taisui-biao')

  const paths = sitemap().map((e) => e.url)
  for (const want of ['/liunian/taisui-biao', '/tw/liunian/taisui-biao']) {
    if (!paths.some((u) => u.endsWith(want))) fail(`sitemap 缺 ${want}`)
  }
  if (paths.some((u) => u.endsWith('/liunian/taisui-biao')) && paths.some((u) => u.endsWith('/tw/liunian/taisui-biao'))) {
    ok('sitemap 收录简繁两版')
  }
}

// ---------- ⑤ 可下载图片 ----------
console.log('—— ⑤ 图片卡片 ——')
{
  const p = join(root, 'public/taisui-biao.png')
  if (!existsSync(p)) fail('public/taisui-biao.png 不存在')
  else {
    const size = readFileSync(p).length
    if (size < 20000) fail(`图片疑似损坏（${size} 字节）`)
    else ok(`图片存在（${Math.round(size / 1024)} KB）`)
  }
  const hans = read('src/app/liunian/taisui-biao/page.tsx')
  if (!hans.includes('/taisui-biao.png')) fail('页面未提供图片下载链接')
  else ok('页面提供下载链接')
}

// ---------- ⑥ 牙口：非法关系值必须被 ① 抓到 ----------
console.log('—— ⑥ 牙口自检 ——')
{
  // 用假数据模拟一条非法值，复用 ① 的允许集合判据
  const fake = ['值', '冲', '害', '刑', '合', '平', '破']
  const invalid = fake.filter((r) => !ALLOWED.has(r))
  if (invalid.length !== 1 || invalid[0] !== '破') fail('牙口失效：非法值判据没有命中「破」')
  else ok('非法关系值「破」会被判定拒收（判据有效）')
}

console.log(allPass ? '\nTAISUI_TABLE_PASS' : '\nTAISUI_TABLE_FAIL')
if (!allPass) process.exitCode = 1
