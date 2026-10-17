// 神煞知识文章与跳转映射回归（纳入 npm run verify，纯本地不耗 API）
//
// 三方一致性（单一事实源链）：
//   paipan.SHEN_SHA_NAMES（51 项神煞名）
//     ↔ shenshaArticles.SHEN_SHA_SLUG（名→slug 映射）
//     ↔ articles.ts「神煞查询」分类文章
// 断言纪律：凡断言「函数行为」必须真调用（shenshaHref 实际调用），源码文本断言仅用于接线守护。
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SHEN_SHA_NAMES } from '../src/lib/paipan.ts'
import { SHEN_SHA_SLUG, KONG_WANG_SLUG, CHANG_SHENG_SLUG, shenshaHref } from '../src/lib/shenshaArticles.ts'
import { articles } from '../src/lib/articles.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

let failures = 0
const check = (ok, line) => {
  if (!ok) failures++
  console.log(`  ${ok ? '✓' : '✗'} ${line}`)
}

// ═══════════════════════════════════════════════════════════
// ① 名字清单：51 项、无重复
// ═══════════════════════════════════════════════════════════
console.log('① SHEN_SHA_NAMES 名字清单')
{
  const names = [...SHEN_SHA_NAMES]
  check(names.length === 51, `SHEN_SHA_NAMES 共 51 项（实测 ${names.length}）`)
  check(new Set(names).size === names.length, 'SHEN_SHA_NAMES 无重复')
}

// ═══════════════════════════════════════════════════════════
// ② 映射 ↔ 名字清单（键集一致 + shenshaHref 真调用）
// ═══════════════════════════════════════════════════════════
console.log('② SHEN_SHA_SLUG 映射与 shenshaHref 真调用')
{
  const names = [...SHEN_SHA_NAMES]
  const mapKeys = Object.keys(SHEN_SHA_SLUG)
  check(mapKeys.length === 51, `SHEN_SHA_SLUG 共 51 键（实测 ${mapKeys.length}）`)
  check(names.every(n => mapKeys.includes(n)) && mapKeys.every(k => names.includes(k)),
    '映射键集与 SHEN_SHA_NAMES 完全一致（多一个少一个都翻红）')

  const hrefOk = names.every(n => shenshaHref(n) === `/article/${SHEN_SHA_SLUG[n]}`)
  check(hrefOk, 'shenshaHref 真调用：51 名全部返回 /article/<slug>')
  check(shenshaHref('不存在的神煞') === null, 'shenshaHref 未知名返回 null（不渲染死链）')

  const slugs = Object.values(SHEN_SHA_SLUG)
  check(new Set(slugs).size === slugs.length, '映射值（slug）无重复')
}

// ═══════════════════════════════════════════════════════════
// ③ 映射值 ↔ articles：每篇存在、属神煞查询分类、可被神煞名检索到
// ═══════════════════════════════════════════════════════════
console.log('③ 文章存在性与检索性（51 项逐一核对）')
{
  const allSlugs = articles.map(a => a.slug)
  check(new Set(allSlugs).size === allSlugs.length, `全部文章 slug 唯一（共 ${allSlugs.length} 篇）`)

  for (const [name, slug] of Object.entries(SHEN_SHA_SLUG)) {
    const a = articles.find(x => x.slug === slug)
    const found = a
      && a.category === 'shensha'
      && (a.title.includes(name) || a.description.includes(name) || a.keywords.includes(name))
    check(!!found, `《${name}》→ /article/${slug}（存在＋分类正确＋按名可检索）`)
  }
}

// ═══════════════════════════════════════════════════════════
// ④ 空亡文章 + 神煞分类无孤儿（反向：分类下所有文章都被映射或空亡收录）
// ═══════════════════════════════════════════════════════════
console.log('④ 空亡文章与孤儿检查')
{
  const kw = articles.find(a => a.slug === KONG_WANG_SLUG)
  check(!!kw && kw.category === 'shensha', `空亡文章存在且属神煞查询：/article/${KONG_WANG_SLUG}`)
  const cs = articles.find(a => a.slug === CHANG_SHENG_SLUG)
  check(!!cs && cs.category === 'shensha', `十二长生文章存在且属神煞查询：/article/${CHANG_SHENG_SLUG}`)

  const known = new Set([...Object.values(SHEN_SHA_SLUG), KONG_WANG_SLUG, CHANG_SHENG_SLUG])
  const catArticles = articles.filter(a => a.category === 'shensha')
  const orphan = catArticles.filter(a => !known.has(a.slug)).map(a => a.slug)
  check(orphan.length === 0,
    `神煞查询分类 ${catArticles.length} 篇无孤儿（未挂映射：${orphan.join('、') || '无'}）`)
}

// ═══════════════════════════════════════════════════════════
// ⑤ chart 页接线：导入映射、神煞渲染为 Link、空亡挂文章、提示语
// ═══════════════════════════════════════════════════════════
console.log('⑤ chart 页接线断言')
{
  const pageSrc = readFileSync(join(ROOT, 'src/app/chart/page.tsx'), 'utf8')
  check(pageSrc.includes("from '@/lib/shenshaArticles'"), 'chart 页导入 shenshaArticles 映射')
  check(pageSrc.includes('shenshaHref(') && pageSrc.includes('<Link'), '神煞名经 shenshaHref 渲染为 Link（点击跳知识文章）')
  check(pageSrc.includes('KONG_WANG_SLUG'), '空亡行挂 KONG_WANG_SLUG 知识文章链接')
  check(pageSrc.includes('CHANG_SHENG_SLUG'), '十二长生行挂 CHANG_SHENG_SLUG 知识文章链接')
  check(pageSrc.includes('可查看对应知识文章'), '页面含「可查看对应知识文章」提示语')
}

// ═══════════════════════════════════════════════════════════
// ⑥ sitemap 由 articles 数组驱动（新文章自动收录）
// ═══════════════════════════════════════════════════════════
console.log('⑥ sitemap 自动收录')
{
  const sitemapSrc = readFileSync(join(ROOT, 'src/app/sitemap.ts'), 'utf8')
  check(sitemapSrc.includes('articles.map'), 'sitemap 由 articles 数组驱动（新文章自动收录，无须登记）')
}

console.log('')
if (failures > 0) {
  console.log(`SHENSHA_ARTICLES_FAIL（${failures} 项失败）`)
  process.exit(1)
}
console.log('SHENSHA_ARTICLES_PASS')
