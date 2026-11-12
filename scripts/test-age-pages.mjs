// P0 查询页（生肖年龄 + 民國年次）验收断言。
//
// 用法：
//   npx tsx scripts/test-age-pages.mjs
//
// 覆盖：
//   ① 12 个生肖年龄页 + 51 个民國年次页 + 1 个 hub 的数据正确性
//   ② 立春分界的生肖年份映射
//   ③ 实岁区间 / 虚岁的边界
//   ④ 模板结构（FAQPage、canonical、无 noindex）
//   ⑤ 新页面未进 sitemap、未链到会 410 的 /tw/bazi

import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import {
  AGE_REF_YEAR,
  ROC_FROM,
  ROC_TO,
  ageRangeText,
  ageRow,
  animalAgeRange,
  animalSlugForYear,
  rocNeighborhood,
  rocRange,
  rocRow,
  yearFromRoc,
  zodiacAgeRows,
} from '../src/lib/ageData.ts'
import { SHENGXIAO } from '../src/lib/shengxiaoData.ts'

const ROOT = dirname(fileURLToPath(import.meta.url)) + '/..'
const REF = 2026 // 固定参照年，避免跨年后测试漂移

let f = 0
const fail = (m) => { f++; console.log(`FAIL ${m}`) }
const ok = (m) => console.log(`PASS ${m}`)
const read = (p) => readFileSync(join(ROOT, p), 'utf8')

// ---------- 1. 生肖年份映射（立春口径） ----------
const expectations = [
  [1900, 'shu'], [1977, 'she'], [1988, 'long'], [2000, 'long'],
  [2012, 'long'], [2024, 'long'], [2025, 'she'], [2026, 'ma'], [2027, 'yang'],
]
for (const [year, slug] of expectations) {
  if (animalSlugForYear(year) !== slug) fail(`${year} 年应屬 ${slug}，实际 ${animalSlugForYear(year)}`)
}
ok('生肖年份映射：1900/1977/1988/2000/2012/2024/2025/2026/2027 全部正确')

// ---------- 2. 页数 ----------
if (SHENGXIAO.length !== 12) fail(`生肖数应为 12，实际 ${SHENGXIAO.length}`)
if (rocRange().length !== ROC_TO - ROC_FROM + 1) fail('民國年次页数不等于 51')
if (rocRange()[0] !== 50 || rocRange().at(-1) !== 100) fail('民國年次范围不是 50–100')
ok(`页面规模：12 个生肖年龄页 + ${rocRange().length} 个年次页 + 1 个 hub = ${12 + rocRange().length + 1}`)

// ---------- 3. 生肖年龄表 ----------
for (const sx of SHENGXIAO) {
  const rows = zodiacAgeRows(sx.slug, REF)
  if (rows.length < 8 || rows.length > 9) fail(`${sx.name} 应有 8–9 轮出生年，实际 ${rows.length}`)
  for (let i = 1; i < rows.length; i++) {
    if (rows[i].year - rows[i - 1].year !== 12) fail(`${sx.name} 年份间隔不是 12 年`)
  }
  for (const r of rows) {
    if (r.animal !== sx.slug) fail(`${sx.name} 表中混入了 ${r.year} 年（${r.animal}）`)
    const ageMax = REF - r.year
    if (r.ageMax !== ageMax) fail(`${r.year} 年实岁上限应为 ${ageMax}，实际 ${r.ageMax}`)
    if (r.ageMin !== Math.max(0, ageMax - 1)) fail(`${r.year} 年实岁下限错误`)
    if (r.xu !== ageMax + 1) fail(`${r.year} 年虚岁应为 ${ageMax + 1}，实际 ${r.xu}`)
    if (r.roc !== r.year - 1911) fail(`${r.year} 年民國换算错误`)
  }
  const range = animalAgeRange(sx.slug, REF)
  if (range.count !== rows.length) fail(`${sx.name} 年龄区间统计条数错误`)
  if (range.max !== rows[0].ageMax) fail(`${sx.name} 最大年龄错误`)
}
ok('生肖年龄表：12 × 9 轮的年份、実歲、虛歲、民國年次全部自洽')

// ---------- 4. 年次换算边界 ----------
const r66 = rocRow(66, REF)
if (r66.year !== 1977) fail(`民國66年次应为 1977，实际 ${r66.year}`)
if (r66.animal !== 'she') fail(`1977 年应屬蛇，实际 ${r66.animal}`)
if (r66.ageMin !== 48 || r66.ageMax !== 49 || r66.xu !== 50) {
  fail(`民國66年次岁数应为 48–49 / 虛50，实际 ${r66.ageMin}–${r66.ageMax} / ${r66.xu}`)
}
if (r66.name !== '蛇') fail(`民國66年次繁体生肖名应为「蛇」，实际「${r66.name}」`)

const r100 = rocRow(100, REF)
if (r100.year !== 2011 || r100.ageMax !== 15 || r100.xu !== 16) fail('民國100年次换算错误')
if (yearFromRoc(50) !== 1961) fail('民國50年次应为 1961')
if (ageRangeText(ageRow(REF, REF)) !== '0') fail('当年出生应显示 0 岁而不是区间')

const nb = rocNeighborhood(66, REF)
if (nb.length !== 11) fail(`年次邻居应有 11 条，实际 ${nb.length}`)
if (!nb.some((x) => x.roc === 66)) fail('年次邻居未包含当前年次')
if (nb[0].roc !== 61 || nb.at(-1).roc !== 71) fail('年次邻居范围应为 61–71')
ok('民國年次换算：66/100/50 边界与邻居区间正确')

// ---------- 5. 模板结构 ----------
const zodiacSrc = read('src/app/tw/shengxiao/[animal]/age/page.tsx')
const rocSrc = read('src/app/tw/age/[roc]/page.tsx')
const hubSrc = read('src/app/tw/age/page.tsx')
const tableSrc = read('src/components/age/AgeTable.tsx')
const detailSrc = read('src/components/shengxiao/ShengXiaoDetail.tsx')
const sitemapSrc = read('src/app/sitemap.ts')

for (const [name, src] of [['生肖年龄页', zodiacSrc], ['年次页', rocSrc], ['年次 hub', hubSrc]]) {
  if (!src.includes('canonical')) fail(`${name} 缺少 canonical`)
  if (src.includes('index: false')) fail(`${name} 不应 noindex`)
  if (src.includes('/tw/bazi')) fail(`${name} 不应链到会 410 的 /tw/bazi`)
}
if (!zodiacSrc.includes('FAQPage')) fail('生肖年龄页缺少 FAQPage JSON-LD')
if (!rocSrc.includes('FAQPage')) fail('年次页缺少 FAQPage JSON-LD')
if (!zodiacSrc.includes('generateStaticParams')) fail('生肖年龄页缺少 generateStaticParams')
if (!rocSrc.includes('generateStaticParams')) fail('年次页缺少 generateStaticParams')
if (!tableSrc.includes('/tw/age/')) fail('年龄表未把出生年份链到年次页（按年展开的扩展位）')
if (!tableSrc.includes('ROC_FROM') || !tableSrc.includes('ROC_TO')) {
  fail('年龄表未限制年次链范围，会链到 404 的年次页')
}
if (!tableSrc.includes('/tw/shengxiao/')) fail('年龄表未把生肖链回生肖年龄页')
if (!detailSrc.includes('/age')) fail('生肖详情页未加入年龄页入口（内链不成立）')
ok('模板结构：FAQPage / canonical / 可索引 / 双向内链 / 无 410 链接')

// ---------- 6. 不进 sitemap ----------
if (sitemapSrc.includes('/tw/age')) {
  fail('新页面被加入了 sitemap，违反本轮裁决')
}
if (/\/tw\/shengxiao\/[^'"`]*\/age/.test(sitemapSrc)) {
  fail('生肖年龄页被加入了 sitemap，违反本轮裁决')
}
ok('sitemap：未新增 /tw/age 与 /tw/shengxiao/*/age')

// ---------- 7. 文件存在 ----------
for (const p of [
  'src/lib/ageData.ts',
  'src/components/age/AgeTable.tsx',
  'src/app/tw/shengxiao/[animal]/age/page.tsx',
  'src/app/tw/age/page.tsx',
  'src/app/tw/age/[roc]/page.tsx',
]) {
  if (!existsSync(join(ROOT, p))) fail(`缺少文件 ${p}`)
}
ok('文件清单：P0 的 5 个新增文件齐全')

// ---------- 8. 正文厚度（粗略代理：页面源码汉字数） ----------
const cjk = (s) => (s.match(/[\u4e00-\u9fff]/g) || []).length
if (cjk(zodiacSrc) < 800) fail(`生肖年龄页汉字量偏低（${cjk(zodiacSrc)}），目标 ≥800`)
if (cjk(rocSrc) < 700) fail(`年次页汉字量偏低（${cjk(rocSrc)}），目标 ≥700`)
if (cjk(hubSrc) < 400) fail(`年次 hub 汉字量偏低（${cjk(hubSrc)}）`)
ok(`正文厚度：生肖页 ${cjk(zodiacSrc)} 字 / 年次页 ${cjk(rocSrc)} 字 / hub ${cjk(hubSrc)} 字`)

// ---------- 9. 参照年提示 ----------
if (AGE_REF_YEAR < 2026) fail(`AGE_REF_YEAR 异常：${AGE_REF_YEAR}`)
ok(`参照年：运行时 ${AGE_REF_YEAR}，测试固定 ${REF}`)

console.log(f === 0 ? '\n全部通过' : `\n${f} 项失败`)
process.exit(f === 0 ? 0 : 1)
