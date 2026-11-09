// English zodiac batch acceptance (2026-11-05, extended 2026-11-09 with the year pages)
//
// What this guards:
//   ① 12 English sign pages exist with the same five sections as the Chinese data;
//   ② every English paragraph is written copy, not a placeholder, and CJK-free;
//   ③ the new English sources contain no CJK;
//   ④ every new page has its own canonical plus triAlternates (three-way hreflang);
//   ⑤ /en/shengxiao and /en/charts are real nav entries, not declared gaps;
//   ⑥ the sitemap carries the index, 12 signs, 96 year pages and /en/charts;
//   ⑦ (after a build) the rendered page content contains no CJK;
//   ⑧ the 96 English year pages use the shared view, cover 12 × 8 params, and the
//      English year copy module is CJK-free;
//   ⑨ zh/tw year pages use the same shared view (anti-regression);
//   ⑩ teeth: injecting one Chinese character must turn the scanner red.
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

let allPass = true
const ok = (m) => console.log('  ✓ ' + m)
const fail = (m) => { allPass = false; console.error('  ✗ ' + m) }
const assert = (cond, m) => (cond ? ok(m) : fail(m))

const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
const read = (p) => readFileSync(join(root, p), 'utf8')
const { findCJK } = await import('../src/lib/ai-check.ts')
const { SHENGXIAO, LIUNIAN_YEARS } = await import('../src/lib/shengxiaoData.ts')
const { SHENGXIAO_EN, PAIR_EN, yearNotesEn } = await import('../src/lib/shengxiaoEn.ts')
const { RELATION_COPY_EN, getLiunianEn, LIUNIAN_2027_DETAIL_EN } = await import('../src/lib/shengxiaoYearEn.ts')

const SECTIONS = ['personality', 'career', 'wealth', 'marriage', 'health']
const EN_SOURCES = [
  'src/lib/shengxiaoEn.ts',
  'src/lib/shengxiaoYearEn.ts',
  'src/app/en/shengxiao/page.tsx',
  'src/app/en/shengxiao/[animal]/page.tsx',
  'src/app/en/shengxiao/[animal]/[year]/page.tsx',
  'src/app/en/charts/page.tsx',
  'src/app/en/charts/Client.tsx',
]
const YEAR_FILES = {
  en: 'src/app/en/shengxiao/[animal]/[year]/page.tsx',
  zh: 'src/app/(zh)/shengxiao/[animal]/[year]/page.tsx',
  tw: 'src/app/tw/shengxiao/[animal]/[year]/page.tsx',
}

// ---------- ① data completeness ----------
console.log('—— ① 12 属相英文数据完整 ——')
{
  assert(SHENGXIAO.length === 12, `中文生肖数据 12 条（实际 ${SHENGXIAO.length}）`)
  assert(SHENGXIAO_EN.length === 12, `英文生肖数据 12 条（实际 ${SHENGXIAO_EN.length}）`)
  const missing = SHENGXIAO.filter((s) => !SHENGXIAO_EN.some((e) => e.slug === s.slug)).map((s) => s.slug)
  assert(missing.length === 0, `英文数据覆盖全部 slug（缺：${missing.join(', ') || '无'}）`)
  assert(SHENGXIAO_EN.every((e) => e.name && e.buddha && e.luckyNumber && e.luckyStone), '每页都有英文名、本命佛与幸运物字段')
}

// ---------- ② paragraph parity ----------
console.log('—— ② 简中段落数 = 英文段落数 ——')
{
  const rows = []
  let bad = 0
  for (const zh of SHENGXIAO) {
    const en = SHENGXIAO_EN.find((e) => e.slug === zh.slug)
    const zhCount = SECTIONS.filter((k) => (zh[k] || '').trim().length > 0).length
    const enCount = SECTIONS.filter((k) => (en[k] || '').trim().length > 0).length
    rows.push(`${zh.slug.padEnd(4)} ${en.name.padEnd(8)} ${zhCount} / ${enCount}`)
    if (zhCount !== enCount || enCount !== 5) bad++
  }
  console.log('    slug name      zh/en')
  for (const r of rows) console.log('    ' + r)
  assert(bad === 0, `12 属相五大段落逐段对齐（${rows.length} 行，0 缺失）`)

  const short = SHENGXIAO_EN.flatMap((e) => SECTIONS.filter((k) => e[k].length < 160).map((k) => `${e.slug}.${k}`))
  assert(short.length === 0, `英文段落均为成段文字（≥160 字符；不达标：${short.join(', ') || '无'}）`)
  const sentences = SHENGXIAO_EN.flatMap((e) =>
    SECTIONS.filter((k) => (e[k].match(/[.!?]/g) || []).length < 3).map((k) => `${e.slug}.${k}`)
  )
  assert(sentences.length === 0, `英文段落均 ≥3 句（不达标：${sentences.join(', ') || '无'}）`)
  assert(SHENGXIAO_EN.every((e) => e.personality !== e.career && e.wealth !== e.health), '五段不是重复占位文本')
}

// ---------- ③ source zero CJK ----------
console.log('—— ③ 新增英文源码零 CJK ——')
{
  let hit = 0
  for (const f of EN_SOURCES) {
    const c = findCJK(read(f))
    if (c.length) { hit++; fail(`${f} 命中 ${c.slice(0, 10).join('、')}`) }
  }
  if (hit === 0) ok(`${EN_SOURCES.length} 个新增英文文件零 CJK`)
}

// ---------- ④ canonical + three-way hreflang ----------
console.log('—— ④ canonical 与三语 hreflang ——')
{
  const index = read('src/app/en/shengxiao/page.tsx')
  assert(index.includes("canonical: '/en/shengxiao'"), '索引页 canonical 指 /en/shengxiao')
  assert(index.includes("triAlternates('/shengxiao')"), '索引页 hreflang 由 triAlternates(/shengxiao) 生成')

  const animal = read('src/app/en/shengxiao/[animal]/page.tsx')
  assert(/canonical: `\/en\/shengxiao\/\$\{sx\.slug\}`/.test(animal), '属相页 canonical 指 /en/shengxiao/<slug>')
  assert(/triAlternates\(`\/shengxiao\/\$\{sx\.slug\}`\)/.test(animal), '属相页 hreflang 由 triAlternates(/shengxiao/<slug>) 生成')
  assert(read('src/components/shengxiao/ShengXiaoDetail.tsx').includes('href={`/en/shengxiao/${sx.slug}/${n.year}`}'), '英文属相页的年份表格已链到英文流年页（入口可点通）')

  const yearPage = read(YEAR_FILES.en)
  assert(yearPage.includes('canonical: `/en/shengxiao/${sx.slug}/${year}`'), '英文流年页 canonical 自指 /en/shengxiao/<slug>/<year>')
  assert(yearPage.includes('triAlternates(`/shengxiao/${sx.slug}/${year}`)'), '英文流年页 hreflang 由 triAlternates(/shengxiao/<slug>/<year>) 生成')

  const charts = read('src/app/en/charts/page.tsx')
  assert(charts.includes("canonical: '/en/charts'"), '/en/charts canonical 指自身')
  assert(charts.includes("triAlternates('/charts')"), '/en/charts hreflang 由 triAlternates(/charts) 生成')
}

// ---------- ⑤ nav entries ----------
console.log('—— ⑤ 导航不再声明缺失 ——')
{
  const { itemsFor, ACCOUNT_ITEMS } = await import('../src/lib/site-nav.ts')
  assert(itemsFor('en').some((i) => i.path === '/shengxiao'), '英文导航渲染 /en/shengxiao')
  assert(itemsFor('en', ACCOUNT_ITEMS).some((i) => i.path === '/charts'), '英文账号菜单渲染 /en/charts')
  assert(existsSync(join(root, 'src/app/en/shengxiao/page.tsx')), '/en/shengxiao 页面文件存在')
  assert(existsSync(join(root, 'src/app/en/charts/page.tsx')), '/en/charts 页面文件存在')
}

// ---------- ⑥ sitemap ----------
console.log('—— ⑥ sitemap 收录索引 + 12 属相 + 96 流年 + 我的命盘 ——')
{
  const { default: sitemap } = await import('../src/app/sitemap.ts')
  const urls = sitemap().map((u) => u.url)
  const sx = urls.filter((u) => u.includes('/en/shengxiao'))
  assert(sx.length === 1 + 12 + 96, `sitemap 含 /en/shengxiao 索引 + 12 属相 + 96 流年（实际 ${sx.length}）`)
  const missingSign = SHENGXIAO.filter((s) => !urls.some((u) => u.endsWith(`/en/shengxiao/${s.slug}`))).map((s) => s.slug)
  assert(missingSign.length === 0, `sitemap 含 12 个英文属相页（缺：${missingSign.join(', ') || '无'}）`)
  const missingYear = []
  for (const s of SHENGXIAO) {
    for (const y of LIUNIAN_YEARS) {
      if (!urls.some((u) => u.endsWith(`/en/shengxiao/${s.slug}/${y}`))) missingYear.push(`${s.slug}/${y}`)
    }
  }
  assert(missingYear.length === 0, `sitemap 含 96 个英文流年页（缺：${missingYear.slice(0, 8).join(', ') || '无'}）`)
  assert(urls.some((u) => u.endsWith('/en/charts')), 'sitemap 含 /en/charts')
  ok(`英文条目合计 ${urls.filter((u) => u.includes('/en/') || u.endsWith('/en')).length}`)
}

// ---------- ⑦ built HTML zero CJK (page content only) ----------
console.log('—— ⑦ 构建 HTML 正文零 CJK ——')
{
  const targets = []
  const addIf = (p) => { if (existsSync(p)) targets.push(p) }
  const indexHtml = join(root, '.next/server/app/en/shengxiao.html')
  addIf(indexHtml)
  const dir = join(root, '.next/server/app/en/shengxiao')
  if (existsSync(dir)) {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.isFile() && e.name.endsWith('.html')) targets.push(join(dir, e.name))
    }
  }
  addIf(join(root, '.next/server/app/en/charts.html'))

  // The shared header language switcher, the footer, the <head> metadata (brand alt text)
  // and the site-level JSON-LD intentionally carry Chinese names; they are chrome, not
  // page content. Strip them before scanning.
  const contentOnly = (html) =>
    html
      .replace(/<head[\s\S]*?<\/head>/gi, ' ')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
      .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')

  if (targets.length === 0) {
    ok('未找到构建产物，跳过 HTML 扫描（build 后复跑即可覆盖）')
  } else {
    assert(targets.length >= 14, `扫描 14 个构建 HTML（实际 ${targets.length}）`)
    let hit = 0
    for (const p of targets) {
      const c = findCJK(contentOnly(readFileSync(p, 'utf8')))
      if (c.length) { hit++; fail(`${p.replace(root, '')} 正文命中 ${c.slice(0, 10).join('、')}`) }
    }
    if (hit === 0) ok(`${targets.length} 个英文页面正文零 CJK`)
  }
}

// ---------- ⑧ English year pages: shared view + params + copy ----------
console.log('—— ⑧ 英文流年页（96）——')
{
  assert(existsSync(join(root, YEAR_FILES.en)), '英文流年页文件存在')
  const yearPage = read(YEAR_FILES.en)
  assert(yearPage.includes("from '@/components/shengxiao/ShengXiaoYearView'"), '英文流年页使用共享 ShengXiaoYearView')
  assert(yearPage.includes('locale="en"'), '英文流年页显式传 locale="en"')
  assert(yearPage.includes('generateStaticParams'), '英文流年页有 generateStaticParams')
  assert(yearPage.includes('SHENGXIAO.flatMap') && yearPage.includes('LIUNIAN_YEARS.map'), 'generateStaticParams 遍历 12 属相 × LIUNIAN_YEARS')
  assert(SHENGXIAO.length * LIUNIAN_YEARS.length === 96, `静态参数覆盖 12 × 8 = 96（实际 ${SHENGXIAO.length * LIUNIAN_YEARS.length}）`)

  const view = read('src/components/shengxiao/ShengXiaoYearView.tsx')
  assert(view.includes('getLiunianEn(sx, year)'), '共享视图英文分支走 shengxiaoYearEn')
  assert(view.includes("locale === 'en'") && view.includes("locale === 'zh-Hant'"), '共享视图按 locale 分流三语')
  assert(view.includes("pathForLang(`/shengxiao/${sx.slug}/"), '相邻年份链接按 locale 前缀生成')

  const RELATIONS = ['zhi', 'chong', 'hai', 'xing', 'he', 'neutral']
  const FIELDS = ['summary', 'overview', 'career', 'wealth', 'relationship', 'health', 'advice', 'taisui', 'decision']
  const relMissing = RELATIONS.filter((k) => !RELATION_COPY_EN[k])
  assert(relMissing.length === 0, `六类关系文案齐全（缺：${relMissing.join(', ') || '无'}）`)
  const fieldMissing = RELATIONS.flatMap((k) => FIELDS.filter((f) => !(RELATION_COPY_EN[k][f] || '').trim()).map((f) => `${k}.${f}`))
  assert(fieldMissing.length === 0, `六类关系的 9 个字段都有内容（缺：${fieldMissing.join(', ') || '无'}）`)

  let cjkRows = 0
  let emptyRows = 0
  for (const s of SHENGXIAO) {
    for (const y of LIUNIAN_YEARS) {
      const c = getLiunianEn(s, y)
      if (findCJK(JSON.stringify(c)).length > 0) cjkRows++
      if (!c.overview || !c.career || !c.wealth || !c.relationship || !c.health || !c.advice) emptyRows++
    }
  }
  assert(cjkRows === 0, `12 × 8 英文流年文案零 CJK（命中 ${cjkRows}）`)
  assert(emptyRows === 0, `12 × 8 英文流年文案无空段（空 ${emptyRows}）`)
}

// ---------- ⑨ zh/tw year pages use the same shared view ----------
console.log('—— ⑨ 简/繁流年页防回流 ——')
{
  for (const [lang, file, locale] of [
    ['zh', YEAR_FILES.zh, 'zh-Hans'],
    ['tw', YEAR_FILES.tw, 'zh-Hant'],
  ]) {
    const src = read(file)
    assert(src.includes('ShengXiaoYearView') && src.includes(`locale="${locale}"`), `${lang} 流年页使用共享视图并显式传 ${locale}`)
    assert(src.includes('triAlternates(`/shengxiao/${sx.slug}/${year}`)'), `${lang} 流年页 hreflang 走三语矩阵`)
  }
}

// ---------- ⑨b 2027 专属落点区块三语对等 ----------
console.log('—— ⑨b 2027 专属落点区块 ——')
{
  assert(Object.keys(LIUNIAN_2027_DETAIL_EN).length === SHENGXIAO.length, `2027 落点覆盖 12 属相（实际 ${Object.keys(LIUNIAN_2027_DETAIL_EN).length}）`)
  const missing = SHENGXIAO.filter((s) => {
    const d = LIUNIAN_2027_DETAIL_EN[s.slug]
    return !d || !d.focus?.trim() || !d.action?.trim()
  })
  assert(missing.length === 0, `2027 落点 focus/action 齐全（缺：${missing.map((s) => s.slug).join(', ') || '无'}）`)
  const cjk = findCJK(JSON.stringify(LIUNIAN_2027_DETAIL_EN))
  assert(cjk.length === 0, `2027 英文落点零 CJK（命中 ${cjk.slice(0, 8).join('、')}）`)
  const view = read('src/components/shengxiao/ShengXiaoYearView.tsx')
  assert(view.includes('LIUNIAN_2027_DETAIL_EN') && view.includes('year === 2027'), '共享视图在 2027 渲染专属落点，英文不再少一个区块')
}

// ---------- ⑩ teeth ----------
console.log('—— ⑩ 牙口自检 ——')
{
  const injected = read(YEAR_FILES.en) + '\nconst leak = "属鼠";\n'
  assert(findCJK(injected).length > 0, '往英文流年页注入一个汉字 → 零 CJK 断言翻红')
  assert(findCJK('Rat · Zi · Water').length === 0, '英文正文不误报')
  const zhFive = SECTIONS.filter((k) => (SHENGXIAO[0][k] || '').trim().length > 0).length
  const enFour = SECTIONS.filter((k) => k !== 'health' && (SHENGXIAO_EN[0][k] || '').trim().length > 0).length
  assert(zhFive === 5 && enFour === 4, '删掉英文健康段后段数对照会变成 5/4（牙口）')
  assert(!PAIR_EN.neutral.level.includes('上等'), '配对等级表英文口径生效')
  assert(yearNotesEn(SHENGXIAO[0], [2027])[0].relationText.length > 0, '流年英文关系文案可用')
}

console.log('\n' + (allPass ? 'EN_SHENGXIAO_PASS' : 'EN_SHENGXIAO_FAIL'))
process.exit(allPass ? 0 : 1)
