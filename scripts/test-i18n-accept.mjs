// 繁体树（方案 C 第一版）验收断言
//
// 断的是什么：
//   ① 转换层：干支/「干」字术语/7 档判词不可错；无占位符泄漏；简体恒等
//   ② 真实内容抽检：12 属相的全部正文 + 132 条配对描述转繁后不得残留简体标记字
//   ③ hreflang 矩阵：六项齐全、简繁互指、x-default 指简体；两边都从 lib/hant-seo 生成
//   ④ 繁体树结构：lang=zh-Hant、cookie 同步、落地页链全 12 属相
//   ⑤ sitemap 收录 /tw；简体页 title 未被改动（零回归）

import { readFileSync } from 'node:fs'

let allPass = true
const fail = (msg) => { allPass = false; console.log('  ✗ ' + msg) }
const near = (file) => new URL(`../src/${file}`, import.meta.url)

const { toHant, localize, twinPath } = await import('../src/lib/hant.ts')
const { HANT_HREFLANG, HANT_LOCALES, hantAlternates } = await import('../src/lib/hant-seo.ts')
const { SHENGXIAO, getPeiDui } = await import('../src/lib/shengxiaoData.ts')
const { default: sitemap } = await import('../src/app/sitemap.ts')

// ---------- ① 转换层 ----------
console.log('—— ① 转换层（干支 / 干字术语 / 判词 / 泄漏）——')
let convFail = 0
const mustKeep = [
  ['甲子', '甲子'], ['乙丑', '乙丑'], ['八字干支', '八字干支'], ['干支', '干支'], ['天干', '天干'],
  ['藏干', '藏干'], ['时干', '時干'], ['日干', '日干'], ['十干', '十干'], ['干合', '干合'],
  ['小凶', '小凶'], ['大凶', '大凶'], ['小吉', '小吉'], ['大吉', '大吉'],
]
for (const [src, want] of mustKeep) {
  const got = toHant(src)
  if (got !== want) { convFail++; fail(`toHant('${src}') = '${got}'，应为 '${want}'`) }
}
const mustChange = [
  ['排盘', '排盤'], ['命盘', '命盤'], ['运势', '運勢'], ['免费', '免費'], ['农历', '農曆'],
  ['节气', '節氣'], ['冲太岁', '沖太歲'], ['七杀', '七殺'], ['紫微斗数', '紫微斗數'],
]
for (const [src, want] of mustChange) {
  const got = toHant(src)
  if (got !== want) { convFail++; fail(`toHant('${src}') = '${got}'，应为 '${want}'`) }
}
// 占位符泄漏（私有区字符出现在正文里 = 用户可见乱码）
const leak = toHant('时干与甲子，小凶之局，冲太岁。')
if (/[\uE000\uE001]/.test(leak)) { convFail++; fail(`toHant 泄漏私有区占位符：${JSON.stringify(leak)}`) }
// 简体恒等 + 不跑转换器
if (localize('免费排盘', 'zh-Hans') !== '免费排盘') { convFail++; fail('localize(zh-Hans) 应原样返回') }
if (localize('免费排盘', 'zh-Hant') !== '免費排盤') { convFail++; fail('localize(zh-Hant) 应返回繁体') }
if (toHant('') !== '') { convFail++; fail('空串应原样返回') }
// twinPath：简繁路径互推
const twinCases = [
  ['/shengxiao/shu', 'zh-Hant', '/tw/shengxiao/shu'],
  ['/tw/shengxiao/shu', 'zh-Hant', '/tw/shengxiao/shu'],
  ['/tw/shengxiao/shu', 'zh-Hans', '/shengxiao/shu'],
  ['/', 'zh-Hant', '/tw'],
  ['/tw', 'zh-Hans', '/'],
]
for (const [path, loc, want] of twinCases) {
  const got = twinPath(path, loc)
  if (got !== want) { convFail++; fail(`twinPath('${path}','${loc}') = '${got}'，应为 '${want}'`) }
}
console.log(convFail === 0
  ? '✓ 转换层：干支与「干」字术语（时干→時干）不误转；7 档判词原样；无占位符泄漏；简体恒等'
  : `✗ 转换层失败 ${convFail} 处`)

// ---------- ② 真实内容抽检 ----------
console.log('—— ② 真实内容抽检（12 属相全正文 + 配对描述）——')
let contentFail = 0
// 只用「繁体里绝不可能出现」的简体字形做标记（干/冲/里/后/富 等繁简同形或有歧义的已剔除）
const HANS_MARKS = '体运盘历势费农节气时机关现说话词种门问题实际场长让认为会应该还这个号义阴阳买卖贵贱寿'
const markRe = new RegExp(`[${HANS_MARKS}]`)
let scanned = 0
for (const sx of SHENGXIAO) {
  const fields = [sx.personality, sx.career, sx.wealth, sx.marriage, sx.health]
  for (const body of fields) {
    scanned++
    const hant = toHant(body)
    const hit = hant.match(markRe)
    if (hit) { contentFail++; fail(`属${sx.name} 正文转繁后残留简体「${hit[0]}」：${hant.slice(0, 60)}…`) }
  }
  for (const other of SHENGXIAO) {
    const pd = getPeiDui(sx, other.name)
    scanned++
    const hant = toHant(pd.desc)
    const hit = hant.match(markRe)
    if (hit) { contentFail++; fail(`属${sx.name}+${other.name} 配对描述残留简体「${hit[0]}」`) }
  }
}
console.log(contentFail === 0
  ? `✓ 内容：扫描 ${scanned} 段正文（${SHENGXIAO.length} 属相 × 5 板块 + 132 条配对），繁体输出 0 处简体残留`
  : `✗ 内容残留 ${contentFail} 处`)

// ---------- ③ hreflang 矩阵 ----------
console.log('—— ③ hreflang 矩阵 ——')
let seoFail = 0
if (HANT_LOCALES.length !== 4) { seoFail++; fail('繁体语系标签应为 4 个（zh-Hant/zh-TW/zh-HK/zh-MO）') }
if (HANT_HREFLANG.length !== 6) { seoFail++; fail(`完整语言集应为 6 项，实际 ${HANT_HREFLANG.length}`) }
const alt = hantAlternates('/shengxiao/shu')
const expectAlt = {
  'zh-Hans': '/shengxiao/shu',
  'zh-Hant': '/tw/shengxiao/shu',
  'zh-TW': '/tw/shengxiao/shu',
  'zh-HK': '/tw/shengxiao/shu',
  'zh-MO': '/tw/shengxiao/shu',
  'x-default': '/shengxiao/shu',
}
for (const [k, v] of Object.entries(expectAlt)) {
  if (alt[k] !== v) { seoFail++; fail(`alternates['${k}'] = ${alt[k]}，应为 ${v}`) }
}
if (Object.keys(alt).length !== 6) { seoFail++; fail(`alternates 应恰为 6 键，实际 ${Object.keys(alt).length}`) }
// 两边都必须从同一函数生成（防一边手写、一边不写 → hreflang 单向失效）
for (const f of ['app/shengxiao/[animal]/page.tsx', 'app/tw/shengxiao/[animal]/page.tsx']) {
  const src = readFileSync(near(f), 'utf8')
  if (!src.includes('hantAlternates(')) { seoFail++; fail(`${f} 未使用 hantAlternates（hreflang 必须单一来源）`) }
  if (/hreflang|zh-Hant', '\//.test(src) && src.includes("'zh-TW':")) { seoFail++; fail(`${f} 手写了 alternates 字面量`) }
}
console.log(seoFail === 0 ? '✓ hreflang：6 键齐全、繁体四标签同指 /tw、x-default 指简体；两页同源生成' : `✗ hreflang 失败 ${seoFail} 处`)

// ---------- ④ 繁体树结构 ----------
console.log('—— ④ 繁体树结构 ——')
let treeFail = 0
const layout = readFileSync(near('app/tw/layout.tsx'), 'utf8')
if (!layout.includes('lang="zh-Hant"')) { treeFail++; fail('tw/layout.tsx 缺 lang="zh-Hant"') }
if (!layout.includes('LocaleSync')) { treeFail++; fail('tw/layout.tsx 未挂载 LocaleSync（cookie 不会写）') }
const sync = readFileSync(near('components/LocaleSync.tsx'), 'utf8')
if (!sync.includes('document.cookie') || !sync.includes('LOCALE_COOKIE')) { treeFail++; fail('LocaleSync 未写 mc_locale cookie') }
if (!sync.includes("'use client'")) { treeFail++; fail('LocaleSync 必须是客户端组件（服务端不能写 cookie）') }
const landing = readFileSync(near('app/tw/page.tsx'), 'utf8')
if (!landing.includes('SHENGXIAO.map')) { treeFail++; fail('/tw 落地页未列出 12 属相') }
const detail = readFileSync(near('app/tw/shengxiao/[animal]/page.tsx'), 'utf8')
for (const label of ['性格特點', '事業運', '財運', '婚姻感情', '健康養生', '生肖配對表', '幸運物']) {
  if (!detail.includes(label)) { treeFail++; fail(`繁体详情页缺板块「${label}」`) }
}
// 繁体页不得直接引用简体 Nav（否则导航文案混语言）
for (const f of ['app/tw/page.tsx', 'app/tw/shengxiao/page.tsx', 'app/tw/shengxiao/[animal]/page.tsx']) {
  const src = readFileSync(near(f), 'utf8')
  if (src.includes("from '@/components/Nav'")) { treeFail++; fail(`${f} 引用了简体 Nav，导航会混语言`) }
}
console.log(treeFail === 0 ? '✓ 结构：lang=zh-Hant、cookie 同步就位、落地页链 12 属相、详情页板块齐全、未混用简体导航' : `✗ 结构失败 ${treeFail} 处`)

// ---------- ⑤ sitemap 与简体零回归 ----------
console.log('—— ⑤ sitemap 收录 /tw 与简体零回归 ——')
let siteFail = 0
const urls = sitemap().map((e) => e.url)
const has = (want) => urls.some((u) => u.endsWith(want))
for (const want of ['/tw', '/tw/shengxiao', '/tw/shengxiao/shu', '/tw/shengxiao/zhu']) {
  if (!has(want)) { siteFail++; fail(`sitemap 缺 ${want}`) }
}
for (const want of ['/shengxiao/shu', '/bazi', '/article']) {
  if (!has(want)) { siteFail++; fail(`sitemap 丢了原有 ${want}`) }
}
const twCount = urls.filter((u) => u.includes('/tw')).length
if (twCount !== 14) { siteFail++; fail(`/tw 条目应为 14（落地页+索引+12 属相），实际 ${twCount}`) }
// 简体页 title 模板不得被本次改动动过
const hansPage = readFileSync(near('app/shengxiao/[animal]/page.tsx'), 'utf8')
if (!hansPage.includes('title: `属${sx.name}的命运详解')) {
  siteFail++; fail('简体生肖页的 title 模板被改了（零回归要求：繁体化不得动简体文案）')
}
console.log(siteFail === 0 ? `✓ sitemap：新增 ${twCount} 条 /tw，原有简体条目未丢；简体 title 模板未变` : `✗ sitemap/回归失败 ${siteFail} 处`)

// ---------- 牙口自检 ----------
console.log('—— 牙口自检（守护断言本身）——')
let toothFail = 0
if (toHant('免费') === '免费') { toothFail++; fail('牙口：转换器没在工作（免费 未变繁体）') }
if (!markRe.test('运')) { toothFail++; fail('牙口：简体标记字判据失效') }
if (markRe.test('運')) { toothFail++; fail('牙口：繁体字被误判为简体标记') }
if (hantAlternates('/x')['zh-Hant'] !== '/tw/x') { toothFail++; fail('牙口：hreflang 推导失效') }
console.log(toothFail === 0 ? '✓ 牙口：转换/标记字/hreflang 判据样本均能触发' : '✗ 牙口自检失败')

console.log('\n' + (allPass ? 'I18N_ACCEPT_PASS' : 'I18N_ACCEPT_FAIL'))
process.exit(allPass ? 0 : 1)
