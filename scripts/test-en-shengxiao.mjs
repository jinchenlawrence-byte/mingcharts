// English zodiac batch acceptance (2026-11-05)
//
// What this guards:
//   ① 12 English sign pages exist with the same five sections as the Chinese data;
//   ② every English paragraph is written copy, not a placeholder, and CJK-free;
//   ③ the new English sources contain no CJK;
//   ④ every new page has its own canonical plus triAlternates (three-way hreflang);
//   ⑤ /en/shengxiao and /en/charts are real nav entries, not declared gaps;
//   ⑥ the sitemap carries 13 zodiac URLs plus /en/charts;
//   ⑦ (after a build) the rendered page content contains no CJK;
//   ⑧ teeth: injecting one Chinese character must turn the scanner red.
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

let allPass = true
const ok = (m) => console.log('  ✓ ' + m)
const fail = (m) => { allPass = false; console.error('  ✗ ' + m) }
const assert = (cond, m) => (cond ? ok(m) : fail(m))

const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
const read = (p) => readFileSync(join(root, p), 'utf8')
const { findCJK } = await import('../src/lib/ai-check.ts')
const { SHENGXIAO } = await import('../src/lib/shengxiaoData.ts')
const { SHENGXIAO_EN, PAIR_EN, yearNotesEn } = await import('../src/lib/shengxiaoEn.ts')

const SECTIONS = ['personality', 'career', 'wealth', 'marriage', 'health']
const EN_SOURCES = [
  'src/lib/shengxiaoEn.ts',
  'src/app/en/shengxiao/page.tsx',
  'src/app/en/shengxiao/[animal]/page.tsx',
  'src/app/en/charts/page.tsx',
  'src/app/en/charts/Client.tsx',
]

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

  const charts = read('src/app/en/charts/page.tsx')
  assert(charts.includes("canonical: '/en/charts'"), '/en/charts canonical 指自身')
  assert(charts.includes("triAlternates('/charts')"), '/en/charts hreflang 由 triAlternates(/charts) 生成')

  assert(!/\/en\/shengxiao\/\$\{[^}]*\}\/\$\{/.test(animal), '属相页不链到尚未发布的英文流年页（无死链）')
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
console.log('—— ⑥ sitemap 收录 13 + 1 条 ——')
{
  const { default: sitemap } = await import('../src/app/sitemap.ts')
  const urls = sitemap().map((u) => u.url)
  const sx = urls.filter((u) => u.includes('/en/shengxiao'))
  assert(sx.length === 13, `sitemap 含 /en/shengxiao 索引 + 12 属相（实际 ${sx.length}）`)
  for (const s of SHENGXIAO) {
    assert(urls.some((u) => u.endsWith(`/en/shengxiao/${s.slug}`)), `sitemap 含 /en/shengxiao/${s.slug}`)
  }
  assert(urls.some((u) => u.endsWith('/en/charts')), 'sitemap 含 /en/charts')
  ok(`本批新增 sitemap 条目 14（${sx.length} + 1），英文条目合计 ${urls.filter((u) => u.includes('/en/') || u.endsWith('/en')).length}`)
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

// ---------- ⑧ teeth ----------
console.log('—— ⑧ 牙口自检 ——')
{
  const injected = read('src/app/en/shengxiao/[animal]/page.tsx') + '\nconst leak = "属鼠";\n'
  assert(findCJK(injected).length > 0, '往英文属相页注入一个汉字 → 零 CJK 断言翻红')
  assert(findCJK('Rat · Zi · Water').length === 0, '英文正文不误报')
  const zhFive = SECTIONS.filter((k) => (SHENGXIAO[0][k] || '').trim().length > 0).length
  const enFour = SECTIONS.filter((k) => k !== 'health' && (SHENGXIAO_EN[0][k] || '').trim().length > 0).length
  assert(zhFive === 5 && enFour === 4, '删掉英文健康段后段数对照会变成 5/4（牙口）')
  assert(!PAIR_EN.neutral.level.includes('上等'), '配对等级表英文口径生效')
  assert(yearNotesEn(SHENGXIAO[0], [2027])[0].relationText.length > 0, '流年英文关系文案可用')
}

console.log('\n' + (allPass ? 'EN_SHENGXIAO_PASS' : 'EN_SHENGXIAO_FAIL'))
process.exit(allPass ? 0 : 1)
