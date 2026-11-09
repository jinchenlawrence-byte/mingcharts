// 年页内容断言：61 个 /bazi/{year} 必须是有厚度的差异化内容，并能被索引。
//
// 用法：
//   npx tsx scripts/test-year-pages-content.mjs
//   SITE_URL=https://www.mingcharts.com npx tsx scripts/test-year-pages-content.mjs   # 追加线上断言
//
// 内容度量优先读取 .next/server/app/bazi/{year}.html（构建产物，验证 SSR 真实输出）；
// 产物缺失或早于源码时回退到 yearPageData 的合成文本，并在输出里标注。

import { readFileSync, statSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { getYearPageData } from '../src/lib/yearPageData.ts'
import { JIEQI } from '../src/lib/jieqiData.ts'

const ROOT = dirname(fileURLToPath(import.meta.url)) + '/..'
const YEARS = Array.from({ length: 61 }, (_, i) => 1950 + i)

let f = 0
const fail = m => { f++; console.log(`FAIL ${m}`) }
const ok = m => console.log(`PASS ${m}`)

// ---------- 1. 源码结构断言（防止后续改动把区块删掉） ----------
const pageSrc = readFileSync(join(ROOT, 'src/app/(zh)/bazi/[year]/page.tsx'), 'utf8')
const helperSrc = readFileSync(join(ROOT, 'src/lib/yearPageData.ts'), 'utf8')

if (!pageSrc.includes('getYearPageData')) fail('年页未使用 yearPageData 统一数据源')
if (!pageSrc.includes('年柱与五行')) fail('年页缺少「年柱与五行」区块')
if (!pageSrc.includes('二十四节气与月令')) fail('年页缺少「二十四节气与月令」区块')
if (!pageSrc.includes('各月出生查询')) fail('年页缺少「各月出生查询」区块')
if (!pageSrc.includes('常见问题')) fail('年页缺少 FAQ 区块')
if (!pageSrc.includes('href="/bazi"')) fail('年页缺少返回 /bazi 索引页的上行内链')
if (!pageSrc.includes('FAQPage')) fail('年页缺少 FAQPage JSON-LD')
if (!helperSrc.includes('getJieQiTable')) fail('节气日期未由 lunar-javascript 计算')
if (!helperSrc.includes("throw new Error")) fail('节气数量异常时未显式报错')
if (pageSrc.includes("robots:") && pageSrc.includes('index: false')) fail('年页不应 noindex')
ok('结构断言：年页包含年柱/节气/月份内链/FAQ/上行内链，且未 noindex')

// ---------- 2. 内容度量 ----------
const stripHtml = html => {
  const main = (html.match(/<main[\s\S]*?<\/main>/) || [html])[0]
  return main
    .replace(/<header[\s\S]*?<\/header>/gi, ' ')
    .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<\/?(p|div|li|ul|td|th|tr|table|h1|h2|h3|nav|section|dl|dt|dd)[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
}

const countCjk = t => (t.match(/[\u3400-\u9fff]/g) || []).length

// 只按句末标点切句：表格单元格、导航短语不参与「正文重复句」统计。
const sentences = t => t
  .split(/[。！？!?]+/)
  .map(s => s.replace(/\s+/g, '').trim())
  .filter(s => countCjk(s) >= 6)

// 合成文本：与页面同源，但只用于构建产物缺失时的回退。
const synth = d => [
  d.summary, d.ganTrait, d.zhiTrait, d.naYinTrait, d.relationTrait,
  ...d.jieqi.map(j => `${j.name} ${j.dateLabel} ${j.type} ${j.monthZhi ? j.monthZhi + '月' : '不换月令'}`),
  ...d.months.map(m => m.description),
  // ★ 2026-11-09：页面渲染的是「{year}年{month}月出生查询 →」内链文案，
  //   合成文本也必须带上同一文案，否则源码改动后构建产物过期、回退到合成文本时，
  //   下面「12 个月份内链文案」的断言会整批误红（61×12=732 项）。
  ...d.months.map(m => `${d.year}年${m.month}月出生查询`),
  ...d.faqs.flatMap(q => [q.q, q.a]),
  `${d.year}年出生的人生肖属${d.zodiacName}，五行属${d.zhiElement}，纳音为${d.naYin}。`,
].join('\n')

const SOURCE_MTIME = Math.max(
  statSync(join(ROOT, 'src/app/(zh)/bazi/[year]/page.tsx')).mtimeMs,
  statSync(join(ROOT, 'src/lib/yearPageData.ts')).mtimeMs,
)

function loadText(year) {
  const htmlPath = join(ROOT, `.next/server/app/bazi/${year}.html`)
  if (existsSync(htmlPath) && statSync(htmlPath).mtimeMs >= SOURCE_MTIME) {
    return { text: stripHtml(readFileSync(htmlPath, 'utf8')), html: readFileSync(htmlPath, 'utf8'), source: 'built-html' }
  }
  const d = getYearPageData(year)
  return { text: synth(d), html: '', source: 'synthetic' }
}

const measured = YEARS.map(y => {
  const d = getYearPageData(y)
  const { text, html, source } = loadText(y)
  return { year: y, cjk: countCjk(text), sents: new Set(sentences(text)), text, html, source, data: d }
})

const sourceLabel = measured.every(m => m.source === 'built-html')
  ? 'built-html'
  : measured.some(m => m.source === 'built-html') ? 'mixed' : 'synthetic'
console.log(`内容来源：${sourceLabel}`)

const counts = measured.map(m => m.cjk).sort((a, b) => a - b)
const min = counts[0]
const max = counts[counts.length - 1]
const median = counts[Math.floor(counts.length / 2)]
console.log(`61 页正文汉字数：min=${min} median=${median} max=${max}`)

if (min < 1000) fail(`存在正文少于 1000 汉字的年页（min=${min}）`)
else ok(`61 个年页正文均 ≥ 1000 汉字（min=${min}）`)

// ---------- 3. 每页必备内容抽查（全部 61 页） ----------
for (const m of measured) {
  const d = m.data
  if (m.html) {
    if (m.html.includes('noindex')) fail(`${m.year} 年页含 noindex`)
    if (!m.html.includes(`rel="canonical" href="https://www.mingcharts.com/bazi/${m.year}"`)) {
      fail(`${m.year} 年页 canonical 未自指`)
    }
    for (const j of JIEQI) {
      if (!m.text.includes(j.name)) fail(`${m.year} 年页缺少节气 ${j.name}`)
    }
    if (!m.text.includes(`${m.year}年全年 ${d.daysInYear} 天`)) fail(`${m.year} 年页缺少年度天数`)
    if (!m.text.includes(`${d.lichun.month}月${d.lichun.day}日`)) fail(`${m.year} 年页缺少立春日期`)
  }
  if (d.jieqi.length !== 24) fail(`${m.year} 节气数不是 24`)
  if (d.months.length !== 12) fail(`${m.year} 月份内链不是 12 条`)
  if (d.faqs.length < 3 || d.faqs.length > 5) fail(`${m.year} FAQ 数量 ${d.faqs.length} 不在 3–5`)
  for (const mo of d.months) {
    if (!m.text.includes(`${m.year}年${mo.month}月出生查询`)) fail(`${m.year} 年页缺少 ${mo.month} 月内链文案`)
  }
}
if (f === 0) ok('每页：24 节气 / 12 月份差异化内链 / 3–5 条 FAQ / 天数与立春日期齐全')

// ---------- 4. 相似度抽检（≥10 对） ----------
const pairs = [
  [1950, 1951], [1950, 2010], [1951, 1961], [1960, 1970],
  [1970, 1980], [1980, 1990], [1990, 2000], [2000, 2010],
  [1990, 1991], [1955, 2005], [1965, 1985], [1975, 1995],
]
const byYear = new Map(measured.map(m => [m.year, m]))
console.log('相似度抽检（重复句 / 较少页句数）：')
let worst = 0
let worstPair = ''
for (const [a, b] of pairs) {
  const A = byYear.get(a).sents
  const B = byYear.get(b).sents
  let shared = 0
  for (const s of A) if (B.has(s)) shared++
  const base = Math.min(A.size, B.size)
  const ratio = base ? shared / base : 1
  if (ratio > worst) { worst = ratio; worstPair = `${a}↔${b}` }
  console.log(`  ${a} vs ${b}: shared=${shared} / min=${base} = ${(ratio * 100).toFixed(1)}%`)
  if (process.env.DEBUG_YEAR_PAIRS === `${a}-${b}`) {
    for (const s of A) if (B.has(s)) console.log(`    · ${s.slice(0, 80)}`)
  }
}
if (worst > 0.35) fail(`最高重复句比例 ${(worst * 100).toFixed(1)}%（${worstPair}）超过 35%`)
else ok(`12 对抽检最高重复句比例 ${(worst * 100).toFixed(1)}%（${worstPair}）≤ 35%`)

// ---------- 5. 线上断言（可选） ----------
const BASE = process.env.SITE_URL
if (BASE) {
  const sample = [1950, 1970, 1990, 2000, 2010]
  for (const y of sample) {
    const res = await fetch(`${BASE}/bazi/${y}`, { redirect: 'manual' })
    if (res.status !== 200) { fail(`线上 /bazi/${y} 状态 ${res.status}`); continue }
    const html = await res.text()
    if (!html.includes(`rel="canonical" href="${BASE}/bazi/${y}"`)) fail(`线上 /bazi/${y} canonical 未自指`)
    if (/name="robots"[^>]*noindex/.test(html)) fail(`线上 /bazi/${y} 含 noindex`)
    console.log(`PASS 线上 /bazi/${y} → 200，canonical 自指，可索引`)
  }
} else {
  console.log('未设置 SITE_URL，跳过线上断言')
}

if (f > 0) {
  console.log(`\n${f} 项失败`)
  process.exit(1)
}
console.log('\n年页内容断言全部通过')
