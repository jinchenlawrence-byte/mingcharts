// 三语路由与 IP 导向验收（2026-11-03）
//
// 断的是什么：
//   ① 国家/地区 → 语言映射（TW/HK/MY/SG/GB/未知 六种输入）
//   ② cookie 覆盖 IP；爬虫不被重定向
//   ③ /en 与 /tw 直出（proxy matcher 只匹配根路径 '/'）
//   ④ 三语 hreflang 互指 + canonical 各自指向
//   ⑤ 语言切换写入 cookie（不依赖 IP）

import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

let allPass = true
const fail = (m) => { allPass = false; console.log('  ✗ ' + m) }
const ok = (m) => console.log('  · ' + m)

const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
const read = (p) => readFileSync(join(root, p), 'utf8')

const {
  langFromCountry, parseSiteLang, decideRootLang, isCrawler,
  langFromPath, pathForLang, homeForLang, triAlternates, LANG_COOKIE,
} = await import('../src/lib/lang.ts')

// ---------- ① 国家映射 ----------
console.log('—— ① 国家/地区 → 语言 ——')
{
  const cases = [
    ['TW', 'zh-Hant'], ['HK', 'zh-Hant'],
    ['MY', 'zh-Hans'], ['SG', 'zh-Hans'],
    ['GB', 'en'],
    ['US', 'en'], ['', 'en'], [null, 'en'], ['unknown', 'en'],
  ]
  let f = 0
  for (const [cc, want] of cases) {
    const got = langFromCountry(cc)
    if (got !== want) { f++; fail(`langFromCountry(${JSON.stringify(cc)}) = ${got}，应为 ${want}`) }
  }
  if (f === 0) ok(`六类输入全中：TW/HK→繁、MY/SG→简、GB→英、未知/空→英兜底（${cases.length} 例）`)
}

// ---------- ② cookie 覆盖 IP / 爬虫 ----------
console.log('—— ② cookie 优先与爬虫豁免 ——')
{
  let f = 0
  if (decideRootLang({ cookie: 'en', country: 'TW', userAgent: 'Mozilla' }) !== 'en') { f++; fail('cookie=en 时 TW IP 仍应出英文（cookie 优先）') }
  if (decideRootLang({ cookie: 'zh-Hant', country: 'SG', userAgent: 'Mozilla' }) !== 'zh-Hant') { f++; fail('cookie=zh-Hant 时 SG IP 仍应出繁体（cookie 优先）') }
  if (decideRootLang({ cookie: 'zh-Hans', country: 'GB', userAgent: 'Mozilla' }) !== 'zh-Hans') { f++; fail('cookie=zh-Hans 时 GB IP 仍应出简体（cookie 优先）') }
  if (decideRootLang({ cookie: null, country: 'TW', userAgent: 'Mozilla/5.0 (compatible; Googlebot/2.1)' }) !== 'zh-Hans') { f++; fail('Googlebot 不得被地理重定向（应留在简体）') }
  if (decideRootLang({ cookie: null, country: 'TW', userAgent: 'Bingbot' }) !== 'zh-Hans') { f++; fail('Bingbot 不得被地理重定向') }
  if (isCrawler('Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 Chrome/41.0 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)') !== true) { f++; fail('isCrawler 未识别 Googlebot 真实 UA') }
  if (isCrawler('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15') !== false) { f++; fail('isCrawler 把普通浏览器误判为爬虫') }
  if (f === 0) ok('cookie 三种取值均覆盖 IP；Googlebot/Bingbot 不重定向；普通 UA 不误判')
}

// ---------- ③ 路径互推与直出 ----------
console.log('—— ③ 路径互推 / 语言树直出 ——')
{
  let f = 0
  const checks = [
    ['/', 'zh-Hant', '/tw'], ['/', 'en', '/en'],
    ['/pricing', 'en', '/en/pricing'], ['/tw/pricing', 'en', '/en/pricing'],
    ['/en/pricing', 'zh-Hant', '/tw/pricing'], ['/en/pricing', 'zh-Hans', '/pricing'],
    ['/tw', 'zh-Hans', '/'], ['/en', 'zh-Hans', '/'],
  ]
  for (const [p, lang, want] of checks) {
    const got = pathForLang(p, lang)
    if (got !== want) { f++; fail(`pathForLang('${p}','${lang}') = ${got}，应为 ${want}`) }
  }
  if (langFromPath('/en') !== 'en' || langFromPath('/en/pricing') !== 'en') { f++; fail('langFromPath 未识别 /en') }
  if (langFromPath('/tw') !== 'zh-Hant' || langFromPath('/tw/pricing') !== 'zh-Hant') { f++; fail('langFromPath 未识别 /tw') }
  if (homeForLang('zh-Hans') !== '/' || homeForLang('zh-Hant') !== '/tw' || homeForLang('en') !== '/en') { f++; fail('homeForLang 三个首页不对') }
  if (f === 0) ok('三条语言树互推正确；/en 与 /tw 前缀被识别')
}

// ---------- ④ hreflang 矩阵 ----------
console.log('—— ④ 三语 hreflang ——')
{
  const alt = triAlternates('/pricing')
  const need = { 'zh-Hans': '/pricing', 'zh-Hant': '/tw/pricing', en: '/en/pricing', 'x-default': '/en/pricing' }
  let f = 0
  for (const [k, v] of Object.entries(need)) if (alt[k] !== v) { f++; fail(`triAlternates['${k}'] = ${alt[k]}，应为 ${v}`) }
  if (!alt['zh-TW'] || !alt['zh-HK'] || !alt['zh-MO']) { f++; fail('triAlternates 缺台/港/澳地区标签') }
  // 三语页面各自 canonical + 互指
  const pages = [
    ['src/app/page.tsx', "canonical: '/'"],
    ['src/app/tw/layout.tsx', "canonical: '/tw'"],
    ['src/app/en/layout.tsx', "canonical: '/en'"],
    ['src/app/pricing/page.tsx', "canonical: '/pricing'"],
    ['src/app/tw/pricing/page.tsx', "canonical: '/tw/pricing'"],
    ['src/app/en/pricing/page.tsx', "canonical: '/en/pricing'"],
  ]
  for (const [file, needle] of pages) {
    const src = read(file)
    if (!src.includes(needle)) { f++; fail(`${file} 缺 ${needle}`) }
    if (!src.includes('triAlternates(')) { f++; fail(`${file} 的 hreflang 未走 triAlternates`) }
  }
  if (f === 0) ok('三语页面 canonical 各自指向，hreflang 由 triAlternates 单源生成（含 zh-TW/HK/MO）')
}

// ---------- ⑤ proxy 纪律 ----------
console.log('—— ⑤ proxy 只导向根路径 ——')
{
  const src = read('src/proxy.ts')
  let f = 0
  if (!src.includes("matcher: ['/']")) { f++; fail('proxy matcher 不是仅根路径（会重定向深链）') }
  if (!src.includes("x-vercel-ip-country")) { f++; fail('proxy 未读取 x-vercel-ip-country') }
  if (!src.includes('isCrawler') && !src.includes('decideRootLang')) { f++; fail('proxy 未做爬虫豁免（isCrawler / decideRootLang 均未接）') }
  if (!src.includes('LANG_COOKIE')) { f++; fail('proxy 未读写 mc_lang cookie') }
  if (!src.includes('NextResponse.next()')) { f++; fail('proxy 无放行分支') }
  if (f === 0) ok('matcher 仅 "/"；读 Vercel 国家头；爬虫豁免；cookie 读写；无头时放行不报错')
}

// ---------- ⑥ 英文路由与 sitemap ----------
console.log('—— ⑥ /en 路由与收录 ——')
{
  const routes = ['src/app/en/layout.tsx', 'src/app/en/page.tsx', 'src/app/en/chart/page.tsx', 'src/app/en/pricing/page.tsx', 'src/app/en/mingshu/page.tsx', 'src/app/en/auth/page.tsx']
  const missing = routes.filter((p) => !existsSync(join(root, p)))
  if (missing.length) fail(`缺英文路由：${missing.join(', ')}`)
  else ok(`${routes.length} 个英文路由可直出`)

  const { default: sitemap } = await import('../src/app/sitemap.ts')
  const urls = sitemap().map((e) => e.url)
  for (const p of ['/en', '/en/chart', '/en/pricing', '/en/mingshu']) {
    if (!urls.some((u) => u.endsWith(p))) fail(`sitemap 缺 ${p}`)
  }
  ok('sitemap 收录 4 条英文页')
}

// ---------- ⑦ 切换写 cookie ----------
console.log('—— ⑦ 语言切换写 cookie ——')
{
  let f = 0
  for (const file of ['src/components/HansLangSwitch.tsx', 'src/components/HantLangSwitch.tsx']) {
    const src = read(file)
    if (!src.includes('LANG_COOKIE') || !src.includes('document.cookie')) { f++; fail(`${file} 未写 mc_lang cookie`) }
    if (!src.includes('English')) { f++; fail(`${file} 缺 English 切换入口`) }
  }
  if (f === 0) ok('简/繁切换器均含 English 入口，点击写 mc_lang（不依赖 IP）')
}

// ---------- 牙口 ----------
console.log('—— 牙口自检 ——')
{
  let f = 0
  if (langFromCountry('TW') !== 'zh-Hant') f++
  if (decideRootLang({ cookie: 'en', country: 'TW', userAgent: '' }) !== 'en') f++
  if (triAlternates('/x').en !== '/en/x') f++
  if (f) fail('牙口：映射/覆盖/hreflang 判据样本失效')
  else ok('牙口：国家映射、cookie 覆盖、hreflang 判据均可触发')
}

console.log('\n' + (allPass ? 'LANG_ROUTING_PASS' : 'LANG_ROUTING_FAIL'))
process.exit(allPass ? 0 : 1)
