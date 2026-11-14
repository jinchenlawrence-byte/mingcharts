// 英文文章库守门（2026-11-14，第一批）
//
// 断的是什么：
//   ① slug 必须与简体 /article 逐一一致：不重命名、不重复、不凭空新增
//   ② 分类集合与顺序与简体 ARTICLE_CATEGORIES 完全一致
//   ③ 结构完整：段数 / 每段段落数与简体原文一一对应（防止「缩译成摘要」）
//   ④ 英文树零 CJK：正文、标题、描述、关键词都不许出现汉字（原典词句用拼音 + 英文释义）
//   ⑤ 页面层：canonical 自指 /en/article/<slug>、hreflang 走 triAlternates、内链不链回中文树
//   ⑥ sitemap 收录索引 + 8 个分类 + 已翻译文章（只提交真实存在的页）
//   ⑦ 覆盖率自检：第一批要求每个分类至少 1 篇（第二批铺满后改成全量对齐）
import { existsSync, readFileSync } from 'node:fs'
import { articles, ARTICLE_CATEGORIES } from '../src/lib/articles.ts'
import { articlesEn, ARTICLE_CATEGORIES_EN, getArticleEn } from '../src/lib/articlesEn/index.ts'
import { triAlternates } from '../src/lib/lang.ts'

let pass = 0
let fail = 0
const assert = (cond, msg) => {
  if (cond) { pass++; console.log('  ok  ' + msg) }
  else { fail++; console.log('  FAIL ' + msg) }
}

const CJK = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/

console.log('\n① slug 与简体逐一一致')
const zhBySlug = new Map(articles.map((a) => [a.slug, a]))
const enSlugs = new Set(articlesEn.map((a) => a.slug))
assert(articlesEn.length === enSlugs.size, `英文文章 slug 无重复（${articlesEn.length} 篇）`)
const extra = articlesEn.filter((a) => !zhBySlug.has(a.slug)).map((a) => a.slug)
assert(extra.length === 0, `英文没有简体不存在的 slug` + (extra.length ? `（多出：${extra.join(', ')}）` : ''))
const renamed = articlesEn.filter((a) => zhBySlug.has(a.slug) && zhBySlug.get(a.slug).category !== a.category)
assert(renamed.length === 0, `英文分类与简体一致` + (renamed.length ? `（不一致：${renamed.map((a) => a.slug).join(', ')}）` : ''))
console.log(`     已翻译 ${articlesEn.length} / ${articles.length} 篇`)

console.log('\n② 分类集合与顺序')
assert(
  ARTICLE_CATEGORIES_EN.length === ARTICLE_CATEGORIES.length &&
    ARTICLE_CATEGORIES_EN.every((c, i) => c.slug === ARTICLE_CATEGORIES[i].slug),
  `英文分类 ${ARTICLE_CATEGORIES_EN.length} 个，slug 与顺序同简体`,
)

console.log('\n③ 结构与原文一一对应（段数 / 段内段落数）')
for (const a of articlesEn) {
  const zh = zhBySlug.get(a.slug)
  if (!zh) continue
  assert(a.sections.length === zh.sections.length, `${a.slug} sections ${zh.sections.length}=${a.sections.length}`)
  for (let i = 0; i < Math.min(a.sections.length, zh.sections.length); i++) {
    assert(
      a.sections[i].body.length === zh.sections[i].body.length,
      `${a.slug} 第 ${i + 1} 段 body ${zh.sections[i].body.length}=${a.sections[i].body.length}`,
    )
  }
  assert(!CJK.test(a.title), `${a.slug} 标题无 CJK`)
  assert(a.title.trim().length > 10, `${a.slug} 标题非空且像英文标题`)
  assert(a.description.trim().length > 40, `${a.slug} description 有实质长度`)
  assert(a.keywords.length >= 2, `${a.slug} keywords ≥ 2`)
}

console.log('\n④ 英文树零 CJK')
const cjkHits = articlesEn.filter((a) => CJK.test(JSON.stringify(a))).map((a) => a.slug)
assert(cjkHits.length === 0, `文章数据零 CJK（${articlesEn.length} 篇）` + (cjkHits.length ? `（命中：${cjkHits.join(', ')}）` : ''))
{
  const files = [
    'src/app/en/article/page.tsx',
    'src/app/en/article/[slug]/page.tsx',
    'src/lib/articlesEn/index.ts',
    'src/lib/articlesEn/types.ts',
  ]
  // 只检查「代码与文案」：注释沿用站内惯例可写中文（en/layout.tsx 等既有文件也如此），
  // 所以先剥掉 // 行注释与 /* */ 块注释，再查 CJK。
  const stripComments = (src) =>
    src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
  const bad = files.filter((f) => CJK.test(stripComments(readFileSync(f, 'utf8'))))
  assert(bad.length === 0, `英文文章页面/模块的代码与文案零 CJK（注释除外，${files.length} 个文件）` + (bad.length ? `（命中：${bad.join(', ')}）` : ''))
}

console.log('\n⑤ canonical / hreflang / 内链方向')
{
  const idx = readFileSync('src/app/en/article/page.tsx', 'utf8')
  assert(idx.includes("canonical: '/en/article'"), '索引页 canonical 自指 /en/article')
  assert(idx.includes("triAlternates('/article')"), '索引页 hreflang 走 triAlternates(/article)')

  const dyn = readFileSync('src/app/en/article/[slug]/page.tsx', 'utf8')
  assert(dyn.includes('canonical: `/en/article/${slug}`'), '文章/分类页 canonical 自指 /en/article/<slug>')
  assert(dyn.includes('triAlternates(`/article/${slug}`)'), '文章/分类页 hreflang 三语互指')
  assert(!/href=["'`]\/article\//.test(dyn), '英文文章页内链不链回简体 /article')
  assert(!/href=["'`]\/tw\//.test(dyn), '英文文章页内链不链回繁体 /tw')
  assert(dyn.includes("href: '/en/chart'") && dyn.includes("href: '/en/hemun'"), '文末 CTA 只指向 /en 树')

  // hreflang 矩阵本身自检（抽样）
  const langs = triAlternates('/article/shenme-shi-bazi')
  assert(langs['zh-Hans'] === '/article/shenme-shi-bazi', 'triAlternates zh-Hans 指简体')
  assert(langs['zh-Hant'] === '/tw/article/shenme-shi-bazi', 'triAlternates zh-Hant 指繁体')
  assert(langs.en === '/en/article/shenme-shi-bazi', 'triAlternates en 指英文')
}

console.log('\n⑥ sitemap 收录')
{
  const sm = readFileSync('src/app/sitemap.ts', 'utf8')
  assert(sm.includes("from '@/lib/articlesEn'"), 'sitemap 引入英文文章数据')
  assert(sm.includes('`${BASE_URL}/en/article`'), 'sitemap 收录 /en/article 索引')
  assert(sm.includes('ARTICLE_CATEGORIES_EN.map'), 'sitemap 收录 8 个英文分类')
  assert(sm.includes('articlesEn.map'), 'sitemap 收录已翻译文章（只提交真实存在的页）')
}

console.log('\n⑦ 全量对账（94 篇收口）')
// 一条总账断言同时覆盖：slug 唯一性、分类归属、逐分类篇数对齐、总数对齐。
const countBy = (list, slug) => list.filter((a) => a.category === slug).length
const ledger = ARTICLE_CATEGORIES.map((c) => {
  const zhN = countBy(articles, c.slug)
  const enN = countBy(articlesEn, c.slug)
  return { slug: c.slug, zhN, enN, aligned: zhN === enN }
})
for (const row of ledger) {
  console.log(`     ${row.slug}: ${row.enN}/${row.zhN}${row.aligned ? '' : '  ← 未对齐'}`)
}
const unaligned = ledger.filter((r) => !r.aligned).map((r) => `${r.slug} ${r.enN}/${r.zhN}`)
const dupSlugs = articlesEn.length - enSlugs.size
const missingSlugs = articles.filter((a) => !enSlugs.has(a.slug)).map((a) => a.slug)
const badCategory = articlesEn.filter((a) => zhBySlug.get(a.slug)?.category !== a.category)
assert(
  unaligned.length === 0 && dupSlugs === 0 && missingSlugs.length === 0 && badCategory.length === 0,
  `${articlesEn.length}/${articles.length}，分类分布与简体逐类一致` +
    (unaligned.length ? `（未对齐：${unaligned.join('、')}）` : '') +
    (dupSlugs ? `（重复 slug ${dupSlugs} 个）` : '') +
    (missingSlugs.length ? `（缺 ${missingSlugs.length} 篇：${missingSlugs.slice(0, 5).join(', ')}…）` : '') +
    (badCategory.length ? `（分类归属错：${badCategory.map((a) => a.slug).join(', ')}）` : ''),
)

// 反向自检（--self-test）：模拟「删掉一篇英文」，上面的总账判据必须翻红，
// 防止判据退化成永远为真。用法：tsx scripts/test-en-articles.mjs --self-test
if (process.argv.includes('--self-test')) {
  const withoutOne = articlesEn.slice(0, -1)
  const broken = ARTICLE_CATEGORIES.map((c) => ({
    zhN: countBy(articles, c.slug),
    enN: countBy(withoutOne, c.slug),
  }))
  const flips = broken.some((r) => r.zhN !== r.enN)
  const totalFlips = withoutOne.length !== articles.length
  if (flips && totalFlips) {
    console.log('  ok  反向自检：删掉 1 篇后全量对齐判据如期翻红（分类与总数同时少 1）')
    pass++
  } else {
    console.log('  FAIL 反向自检：删掉 1 篇后判据没有翻红，说明对齐判据失效')
    fail++
  }
}

// 页面数：8 个分类 + 已翻译文章（与 generateStaticParams 同口径）
{
  const files = existsSync('src/app/en/article/[slug]/page.tsx')
  assert(files, '英文文章动态路由存在')
  assert(getArticleEn(articlesEn[0]?.slug ?? '') !== undefined || articlesEn.length === 0, 'getArticleEn 能按 slug 取到文章')
  console.log(`     页面数：1 索引 + ${ARTICLE_CATEGORIES_EN.length} 分类 + ${articlesEn.length} 文章`)
}

console.log(`\nEN_ARTICLES_${fail === 0 ? 'PASS' : 'FAIL'}（pass=${pass} fail=${fail}）`)
if (fail > 0) process.exit(1)
