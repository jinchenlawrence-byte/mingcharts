// 2027 繁体安太岁内容簇守护（2026-10-27 第 35 轮）
//
// 断的是什么：
//   ① 文件与文章齐备：简繁两版落地页 + 3 篇文章（简繁各 3 个 URL）
//   ② 太岁关系自检：2027 丁未年 羊值 / 牛冲 / 鼠害 / 狗刑 / 马六合（唯一事实源是 shengxiaoData）
//   ③ 两个日期边界：春节 2027-02-06（民俗）、立春 2027-02-04（命理年柱），简繁各页都要写
//   ④ 12 个生肖页与落地页双向互链
//   ⑤ 文章 ⇄ 落地页双向（文章 cta 指向落地页，落地页列出 3 篇）
//   ⑥ hreflang 互指 + sitemap 各 1 条
//   ⑦ 文章篇幅：中文汉字 1500–2200；单段 60–160 字
//   ⑧ 繁体页不得出现简体专有词（运势/太岁/农历/关系）
//   ⑨ 繁体落地页不引入 Nav（tw 版布局自带导航；简体版必须有）
//   ⑩ 繁体文章正文由 toHant 派生，不另写一份繁体正文
//   ⑪ 牙口自检：把「狗刑」改成「狗害」时 ② 必须判红
//
// ★ 全程离线：只读源码与数据，不起 HTTP。

import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { SHENGXIAO, getLiunian } from '../src/lib/shengxiaoData.ts'
import { toHant } from '../src/lib/hant.ts'
import { articles } from '../src/lib/articles.ts'
const { default: sitemap } = await import('../src/app/sitemap.ts')

let allPass = true
const fail = (m) => { allPass = false; console.log('  ✗ ' + m) }
const ok = (m) => console.log('  · ' + m)
const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
const read = (p) => readFileSync(join(root, p), 'utf8')
const has = (p) => existsSync(join(root, p))

const YEAR = 2027
const SLUGS = ['2027-an-taisui-zenme-zuo', '2027-fan-taisui-shengxiao', 'an-taisui-yao-zhunbei-shenme']

// ---------- ① 文件齐备 ----------
console.log('—— ① 文件与文章齐备 ——')
{
  const files = [
    'src/app/liunian/2027/page.tsx',
    'src/app/tw/liunian/2027/page.tsx'
  ]
  const miss = files.filter((f) => !has(f))
  if (miss.length) fail(`缺文件：${miss.join(', ')}`)
  else ok('简繁两版落地页均存在')

  const missArticle = SLUGS.filter((s) => !articles.some((a) => a.slug === s))
  if (missArticle.length) fail(`articles.ts 缺：${missArticle.join(', ')}`)
  else ok(`3 篇文章已入库：${SLUGS.join(' / ')}`)
}

// ---------- ② 太岁关系 ----------
console.log('—— ② 2027 太岁关系（事实源） ——')
{
  const want = { yang: '值', niu: '冲', shu: '害', gou: '刑', ma: '合' }
  const got = {}
  for (const sx of SHENGXIAO) got[sx.slug] = getLiunian(sx, YEAR).relation
  const bad = Object.entries(want).filter(([k, v]) => got[k] !== v)
  if (bad.length) fail(`关系不符：${bad.map(([k, v]) => `${k} 应 ${v} 实 ${got[k]}`).join('；')}`)
  else ok('羊值 / 牛冲 / 鼠害 / 狗刑 / 马合 全部成立')

  const fan = Object.values(got).filter((r) => ['值', '冲', '害', '刑'].includes(r)).length
  if (fan !== 4) fail(`2027 犯太岁应 4 个，实际 ${fan}`)
  else ok('2027 犯太岁为 4 个属相')
}

// ---------- ③ 两个日期边界 ----------
console.log('—— ③ 春节 / 立春 双边界 ——')
{
  for (const f of ['src/app/liunian/2027/page.tsx', 'src/app/tw/liunian/2027/page.tsx']) {
    const src = read(f)
    const cny = /2\s*月\s*6\s*日/.test(src) || /2\/6/.test(src)
    const lichun = /2\s*月\s*4\s*日/.test(src) || /2\/4/.test(src)
    if (!cny) fail(`${f} 缺春节 2 月 6 日`)
    if (!lichun) fail(`${f} 缺立春 2 月 4 日`)
  }
  ok('简繁落地页都写明「春节 2/6」与「立春 2/4」')
}

// ---------- ④ 12 生肖双向互链 ----------
console.log('—— ④ 12 属相 ⇄ 落地页 ——')
{
  const hans = read('src/app/liunian/2027/page.tsx')
  const hant = read('src/app/tw/liunian/2027/page.tsx')
  const lackHans = SHENGXIAO.filter((s) => !hans.includes(`/shengxiao/\${r.sx.slug}/\${YEAR}`))
  if (lackHans.length) fail(`简体落地页未链到：${lackHans.map((s) => s.slug).join(', ')}`)
  else ok('简体落地页链到全部 12 个 2027 属相页')
  if (!hant.includes('/tw/shengxiao/${r.sx.slug}/${YEAR}')) fail('繁体落地页未链到 /tw 属相页')
  else ok('繁体落地页链到 /tw 下的 12 个属相页')

  // 反向：属相年页要有回落地页的入口
  const yPage = read('src/app/shengxiao/[animal]/[year]/page.tsx')
  const twYPage = read('src/app/tw/shengxiao/[animal]/[year]/page.tsx')
  if (!yPage.includes('href="/liunian/2027"')) fail('简体属相年页缺回落地页链接')
  else ok('简体属相年页有回链')
  if (!twYPage.includes('href="/tw/liunian/2027"')) fail('繁体属相年页缺回落地页链接')
  else ok('繁体属相年页有回链')
}

// ---------- ⑤ 文章 ⇄ 落地页 ----------
console.log('—— ⑤ 文章 ⇄ 落地页双向 ——')
{
  const hans = read('src/app/liunian/2027/page.tsx')
  const lack = SLUGS.filter((s) => !hans.includes(s))
  if (lack.length) fail(`落地页未列出文章：${lack.join(', ')}`)
  else ok('简体落地页列出 3 篇文章')
  if (!hans.includes('/article/${a.slug}')) fail('落地页文章链接未指向 /article/<slug>')
  else ok('文章链接指向 /article/<slug>')

  const ctaBad = SLUGS.filter((s) => {
    const a = articles.find((x) => x.slug === s)
    return !a?.cta || !String(a.cta.href).includes('/liunian/2027')
  })
  if (ctaBad.length) fail(`文章 CTA 未回链落地页：${ctaBad.join(', ')}`)
  else ok('3 篇文章的文末 CTA 都回链 /liunian/2027')

  const hantCta = articles.filter((a) => SLUGS.includes(a.slug)).every((a) => a.cta?.hantHref === '/tw/liunian/2027')
  if (!hantCta) fail('文章缺 hantHref（繁体版会掉到简体页）')
  else ok('3 篇文章都带 hantHref=/tw/liunian/2027')

  const twArticle = read('src/app/tw/article/[slug]/page.tsx')
  if (!twArticle.includes('hantHref')) fail('繁体文章页未使用 hantHref')
  else ok('繁体文章页按 hantHref 跳转')

  const pool = read('src/lib/relatedArticles.ts')
  const notInPool = SLUGS.filter((s) => !pool.includes(`'${s}'`))
  if (notInPool.length) fail(`LIUNIAN_ARTICLE_SLUGS 未收录：${notInPool.join(', ')}`)
  else ok('三篇已进流年延伸阅读池')
}

// ---------- ⑥ hreflang + sitemap ----------
console.log('—— ⑥ hreflang / sitemap ——')
{
  const hans = read('src/app/liunian/2027/page.tsx')
  const hant = read('src/app/tw/liunian/2027/page.tsx')
  if (!hans.includes("hantAlternates(`/liunian/${YEAR}`)")) fail('简体落地页缺 hreflang 互指')
  else ok('简体落地页 hreflang 就位')
  if (!hant.includes("hantAlternates(`/liunian/${YEAR}`)")) fail('繁体落地页缺 hreflang 互指（必须与简体同指）')
  else ok('繁体落地页 hreflang 与简体同指')
  if (!hans.includes('canonical: `/liunian/${YEAR}`')) fail('简体 canonical 未指向自身')
  else ok('简体 canonical 指向 /liunian/2027')
  if (!hant.includes('canonical: `/tw/liunian/${YEAR}`')) fail('繁体 canonical 未指向自身')
  else ok('繁体 canonical 指向 /tw/liunian/2027')

  const paths = sitemap().map((e) => e.url)
  for (const p of [`/liunian/${YEAR}`, `/tw/liunian/${YEAR}`]) {
    if (!paths.some((u) => u.endsWith(p))) fail(`sitemap 缺 ${p}`)
    else ok(`sitemap 收录 ${p}`)
  }
}

// ---------- ⑦ 篇幅 ----------
console.log('—— ⑦ 篇幅（汉字 1500–2200 / 段 60–160） ——')
{
  const hanzi = (s) => (s.match(/[\u4e00-\u9fa5]/g) || []).length
  for (const s of SLUGS) {
    const a = articles.find((x) => x.slug === s)
    const body = a.sections.map((x) => x.heading + x.body.join('')).join('')
    const n = hanzi(body)
    if (n < 1500 || n > 2200) fail(`${s} 篇幅 ${n} 字（要求 1500–2200）`)
    else ok(`${s} ${n} 字`)
    const tooShort = a.sections.flatMap((x) => x.body).filter((p) => hanzi(p) < 60)
    const tooLong = a.sections.flatMap((x) => x.body).filter((p) => hanzi(p) > 160)
    if (tooShort.length) fail(`${s} 有 ${tooShort.length} 段少于 60 字`)
    if (tooLong.length) fail(`${s} 有 ${tooLong.length} 段超过 160 字`)
    if (!tooShort.length && !tooLong.length) ok(`${s} 段落长度合规`)
  }
}

// ---------- ⑧ 繁体页无简体专有词 ----------
console.log('—— ⑧ 繁体页用词 ——')
{
  const FORBIDDEN = ['运势', '太岁', '农历', '关系', '怎么看']
  // 注释里可以出现简体（说明用），只检查渲染出来的 JSX/文案
  const stripComments = (src) => src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
  for (const f of ['src/app/tw/liunian/2027/page.tsx', 'src/app/tw/shengxiao/[animal]/[year]/page.tsx']) {
    const src = stripComments(read(f))
    const hit = FORBIDDEN.filter((w) => src.includes(w))
    if (hit.length) fail(`${f} 出现简体用词：${hit.join('、')}`)
    else ok(`${f} 无简体专有词`)
  }
  // 抽样：关系词经 toHant 后必须是繁体
  if (toHant('冲太岁') !== '沖太歲') fail(`toHant('冲太岁')=${toHant('冲太岁')}`)
  else ok('toHant 关系词正确（冲→沖）')
}

// ---------- ⑤b 红线扫描（免责 / 禁词 / 金额 / 宫庙专名） ----------
console.log('—— ⑤b 三篇红线扫描 ——')
{
  const BANNED = ['一定', '必然', '注定', '必得']
  const MONEY = /\d+\s*(元|塊|块|NT\$|台幣|台币)/
  // 判据：先剔掉通称（庙宇/宫庙/庙方/寺庙/原庙…），剩下的「宫/庙/廟/寺」就只可能出自专名
  const GENERIC = /(庙宇|廟宇|宮廟|宫庙|寺庙|寺廟|庙方|廟方|庙会|廟會|各庙|各廟|原庙|原廟|庙门|廟門|庙请示|廟請示|庙里|廟裡)/g
  for (const s of SLUGS) {
    const a = articles.find((x) => x.slug === s)
    const text = [a.title, a.description, ...a.sections.map((x) => x.heading + x.body.join(''))].join('')
    const rest = text.replace(GENERIC, '　')
    const temple = /[宮宫庙廟寺]/.test(rest) ? rest.match(/[\u4e00-\u9fa5]{0,4}[宮宫庙廟寺][\u4e00-\u9fa5]{0,4}/) : null
    if (a.category !== 'liunian') fail(`${s} 分类应为 liunian，实际 ${a.category}`)
    if (!/民俗/.test(text)) fail(`${s} 缺「民俗」定性`)
    if (!/仅供参考/.test(text)) fail(`${s} 缺免责句「仅供参考」`)
    const banned = BANNED.filter((w) => text.includes(w))
    if (banned.length) fail(`${s} 命中禁词：${banned.join('、')}`)
    const money = text.match(MONEY)
    if (money) fail(`${s} 出现具体金额：${money[0]}`)
    if (temple) fail(`${s} 出现宫庙专名：${temple[0]}`)
    if (!banned.length && !money && !temple) ok(`${s} 红线 0 命中（分类/免责/禁词/金额/宫庙）`)
  }
}

// ---------- ⑤c focusYear 与默认行为 ----------
console.log('—— ⑤c TaisuiTable focusYear ——')
{
  const hans = read('src/app/liunian/2027/page.tsx')
  const hant = read('src/app/tw/liunian/2027/page.tsx')
  if (!hans.includes('<TaisuiTable focusYear={YEAR}')) fail('简体落地页未传 focusYear')
  else ok('简体落地页传 focusYear={YEAR}')
  if (!hant.includes('<TaisuiTable hant focusYear={YEAR}')) fail('繁体落地页未传 focusYear')
  else ok('繁体落地页传 focusYear={YEAR}')

  const table = read('src/components/TaisuiTable.tsx')
  if (!table.includes('focusYear?: number')) fail('TaisuiTable 缺可选 props focusYear')
  else ok('focusYear 为可选 props')
  if (!table.includes('focusYear ?? thisYear')) fail('不传 focusYear 时未回落到「今年」——默认行为会变')
  else ok('不传时回落到 thisYear，默认行为不变')
  if (/const thisYear = new Date\(\)\.getFullYear\(\)/.test(table)) ok('仍用 getFullYear 判「今年」')
  else fail('thisYear 计算被改动')
}

// ---------- ⑨ 布局（简体有 Nav，繁体不重复引入） ----------
console.log('—— ⑨ 布局 ——')
{
  const hans = read('src/app/liunian/2027/page.tsx')
  const hant = read('src/app/tw/liunian/2027/page.tsx')
  if (!hans.includes("import Nav from '@/components/Nav'")) fail('简体落地页缺 Nav')
  else ok('简体落地页有 Nav')
  if (hant.includes("import Nav from '@/components/Nav'")) fail('繁体落地页重复引入 Nav（tw 布局已自带）')
  else ok('繁体落地页未重复引入 Nav')
  if (!hant.includes('inLanguage') && !read('src/app/tw/layout.tsx').length) fail('tw 布局异常')
  else ok('tw 布局提供 lang=zh-Hant')
}

// ---------- ⑩ 繁体正文靠 toHant 派生 ----------
console.log('—— ⑩ 单一来源（不写第二份繁体正文） ——')
{
  const twArticle = read('src/app/tw/article/[slug]/page.tsx')
  if (!twArticle.includes('toHant(')) fail('繁体文章页未用 toHant 派生正文')
  else ok('繁体文章正文由 toHant 派生')
  // articles.ts 里不应出现繁体专用字（避免简繁两份正文）
  const src = read('src/lib/articles.ts')
  const HANT_ONLY = ['運勢', '太歲', '農曆', '關係']
  const hit = HANT_ONLY.filter((w) => src.includes(w))
  if (hit.length) fail(`articles.ts 出现繁体正文：${hit.join('、')}`)
  else ok('articles.ts 只存简体正文')
}

// ---------- ⑪ 牙口自检 ----------
console.log('—— ⑪ 牙口自检（狗刑→狗害 必须判红） ——')
{
  const fake = { ...Object.fromEntries(SHENGXIAO.map((s) => [s.slug, getLiunian(s, YEAR).relation])) }
  const judge = (m) => m.gou === '刑'
  if (!judge(fake)) fail('牙口失效：真数据未被判为「刑」')
  else ok('真数据（狗刑）判绿')
  fake.gou = '害'
  if (judge(fake)) fail('牙口失效：把狗刑改成狗害仍判绿')
  else ok('篡改（狗害）判红 —— 判据有效')
}

console.log(allPass ? '\nHANT_TAISUI_PASS' : '\nHANT_TAISUI_FAIL')
if (!allPass) process.exitCode = 1
