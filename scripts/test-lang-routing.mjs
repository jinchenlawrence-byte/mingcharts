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
    ['TW', 'zh-Hant'], ['HK', 'zh-Hant'], ['MO', 'zh-Hant'],
    ['MY', 'zh-Hans'], ['SG', 'zh-Hans'],
    ['GB', 'en'], ['US', 'en'], ['CA', 'en'], ['AU', 'en'], ['NZ', 'en'], ['IE', 'en'],
    ['CN', 'zh-Hans'], ['JP', 'zh-Hans'], ['', 'zh-Hans'], [null, 'zh-Hans'], ['unknown', 'zh-Hans'],
  ]
  let f = 0
  for (const [cc, want] of cases) {
    const got = langFromCountry(cc)
    if (got !== want) { f++; fail(`langFromCountry(${JSON.stringify(cc)}) = ${got}，应为 ${want}`) }
  }
  if (f === 0) ok(`地区映射：TW/HK/MO→繁、MY/SG→简、GB/US/CA/AU/NZ/IE→英、其余（含 CN/未知/空）→简（${cases.length} 例）`)
}

// ---------- ② 语言 cookie 存在即不跳转 / 爬虫豁免 ----------
console.log('—— ② 语言 cookie 存在即不跳转、爬虫豁免 ——')
{
  let f = 0
  if (decideRootLang({ cookie: 'en', country: 'TW', userAgent: 'Mozilla' }) !== 'zh-Hans') { f++; fail('已存在 mc_lang=en 时不得跳转，应留在简体根') }
  if (decideRootLang({ cookie: 'zh-Hant', country: 'SG', userAgent: 'Mozilla' }) !== 'zh-Hans') { f++; fail('已存在 mc_lang=zh-Hant 时不得跳转，应留在简体根') }
  if (decideRootLang({ askedCookie: '1', country: 'GB', userAgent: 'Mozilla' }) !== 'zh-Hans') { f++; fail('已存在 mc_lang_asked 时不得跳转，应留在简体根') }
  if (decideRootLang({ cookie: null, country: 'TW', userAgent: 'Mozilla' }) !== 'zh-Hant') { f++; fail('首次访问 TW 应识别为繁体') }
  if (decideRootLang({ cookie: null, country: 'GB', userAgent: 'Mozilla' }) !== 'en') { f++; fail('首次访问 GB 应识别为英文') }
  if (decideRootLang({ cookie: null, country: 'MY', userAgent: 'Mozilla' }) !== 'zh-Hans') { f++; fail('首次访问 MY 应识别为简体') }
  if (decideRootLang({ cookie: null, country: 'CN', userAgent: 'Mozilla' }) !== 'zh-Hans') { f++; fail('中国大陆必须落在简体且不跳转') }
  if (decideRootLang({ cookie: null, country: null, userAgent: 'Mozilla' }) !== 'zh-Hans') { f++; fail('无国家头必须落在简体且不跳转') }
  if (decideRootLang({ cookie: null, country: 'TW', userAgent: 'Mozilla/5.0 (compatible; Googlebot/2.1)' }) !== 'zh-Hans') { f++; fail('Googlebot 不得被地理重定向（应留在简体）') }
  if (decideRootLang({ cookie: null, country: 'TW', userAgent: 'Bingbot' }) !== 'zh-Hans') { f++; fail('Bingbot 不得被地理重定向') }
  if (isCrawler('Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 Chrome/41.0 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)') !== true) { f++; fail('isCrawler 未识别 Googlebot 真实 UA') }
  if (isCrawler('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15') !== false) { f++; fail('isCrawler 把普通浏览器误判为爬虫') }
  if (f === 0) ok('mc_lang / mc_lang_asked 任一存在即不跳；首次访问仅明确地区跳；CN/未知/无头→简；爬虫不跳')
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
  const need = { 'zh-Hans': '/pricing', 'zh-Hant': '/tw/pricing', en: '/en/pricing', 'x-default': '/pricing' }
  let f = 0
  for (const [k, v] of Object.entries(need)) if (alt[k] !== v) { f++; fail(`triAlternates['${k}'] = ${alt[k]}，应为 ${v}`) }
  if (!alt['zh-TW'] || !alt['zh-HK'] || !alt['zh-MO']) { f++; fail('triAlternates 缺台/港/澳地区标签') }
  // 三语页面各自 canonical + 互指
  const pages = [
    ['src/app/(zh)/page.tsx', "canonical: '/'"],
    ['src/app/tw/layout.tsx', "canonical: '/tw'"],
    ['src/app/en/layout.tsx', "canonical: '/en'"],
    ['src/app/(zh)/pricing/page.tsx', "canonical: '/pricing'"],
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
  // 2026-11 收录整治：matcher 额外包含 /bazi 的年/月/日归一规则，仅用于补零 308，不做语言跳转。
  // 2026-11-06 收窄：由 /bazi/:path* 改为三条「未补零」规则，日页不再每个请求都进 middleware。
  if (!src.includes("'/'") || (src.match(/\/bazi\/:year\(/g) || []).length < 3) {
    f++; fail('proxy matcher 不是「根路径 + /bazi 补零归一（收窄后）」。')
  }
  if (src.includes("'/bazi/:path*'")) { f++; fail('proxy matcher 仍是全量通配 /bazi/:path*（未收窄）') }
  {
    const entries = (src.match(/matcher:\s*\[([^\]]*)\]/) || [])[1] || ''
    if (entries.includes('/tw') || entries.includes('/en')) { f++; fail('proxy matcher 误含 /tw 或 /en（会重定向深链）') }
  }
  if (!src.includes("x-vercel-ip-country")) { f++; fail('proxy 未读取 x-vercel-ip-country') }
  if (!src.includes('isCrawler') && !src.includes('decideRootLang')) { f++; fail('proxy 未做爬虫豁免（isCrawler / decideRootLang 均未接）') }
  if (!src.includes('LANG_COOKIE')) { f++; fail('proxy 未读取 mc_lang cookie') }
  if (!src.includes('LANG_ASKED_COOKIE')) { f++; fail('proxy 未读取 mc_lang_asked cookie') }
  if (/cookies\.set/.test(src)) { f++; fail('proxy 自动跳转不应写语言 cookie（否则第二次访问不再按地区跳）') }
  if (!src.includes('NextResponse.next()')) { f++; fail('proxy 无放行分支') }
  if (f === 0) ok('语言跳转仍只发生在 "/"（/bazi 仅做补零 308）；读 Vercel 国家头；爬虫豁免；读两种语言 cookie 且不写；无头时放行不报错')
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
  for (const p of ['/en', '/en/chart', '/en/pricing', '/en/mingshu', '/en/liunian', '/en/hemun', '/en/ziwei', '/en/geo', '/en/terms', '/en/privacy']) {
    if (!urls.some((u) => u.endsWith(p))) fail(`sitemap 缺 ${p}`)
  }
  ok('sitemap 收录 10 条英文页')
}

// ---------- ⑧ 三棵 root layout 的服务端 lang ----------
console.log('—— ⑧ 服务端首屏 <html lang> ——')
{
  let f = 0
  const roots = [
    ['src/app/(zh)/layout.tsx', 'zh-CN'],
    ['src/app/tw/layout.tsx', 'zh-Hant'],
    ['src/app/en/layout.tsx', 'en'],
  ]
  for (const [file, want] of roots) {
    if (!existsSync(join(root, file))) { f++; fail(`${file} 不存在（顶层 layout 已移除，需各自 root layout）`); continue }
    const src = read(file)
    if (!src.includes(`lang="${want}"`)) { f++; fail(`${file} 未在服务端输出 lang="${want}"`) }
    if (!src.includes('<SiteChrome')) { f++; fail(`${file} 未挂载 SiteChrome（会丢埋点/页脚/JSON-LD）`) }
  }
  if (existsSync(join(root, 'src/app/layout.tsx'))) { f++; fail('顶层 src/app/layout.tsx 仍存在，多个 root layout 不会生效') }
  if (f === 0) ok('(zh) → zh-CN、tw → zh-Hant、en → en；三棵 root layout 各挂 SiteChrome；顶层 layout 已移除')
}

// ---------- ⑨ 根路径语言提示条 / 繁体导航登录 ----------
console.log('—— ⑨ 语言提示条与繁体登录入口 ——')
{
  let f = 0
  const home = read('src/app/(zh)/HomeClient.tsx')
  if (!home.includes('<LangPromptBar')) { f++; fail('简体首页未渲染语言提示条') }
  const bar = read('src/components/LangPromptBar.tsx')
  if (!bar.includes('LANG_ASKED_COOKIE')) { f++; fail('提示条未写 mc_lang_asked（会反复打扰）') }
  if (!bar.includes('hasLanguageChoice')) { f++; fail('提示条未在已有语言选择时隐藏') }
  if (!bar.includes('href="/tw"') || !bar.includes('href="/en"')) { f++; fail('提示条缺繁体/英文入口') }
  if (!bar.includes('data-lang-prompt="1"')) { f++; fail('提示条缺稳定标记（HTTP 断言无法识别）') }
  // 2026-11-04 统一第一批：登录入口来自共享 SiteHeader（locale 参数化），
  // 断言从“layout 里找字面量”改为“三语都解析出登录入口”。
  for (const lang of ['zh-Hans', 'zh-Hant', 'en']) {
    const href = pathForLang('/auth', lang)
    if (!read('src/components/SiteHeader.tsx').includes('pathForLang(\'/auth\', locale)')) {
      f++; fail('共享 SiteHeader 未按 locale 输出登录入口')
    }
    if (href !== (lang === 'zh-Hans' ? '/auth' : lang === 'zh-Hant' ? '/tw/auth' : '/en/auth')) {
      f++; fail(`${lang} 登录入口解析错误：${href}`)
    }
  }
  if (f === 0) ok('根路径提示条三选一、写 mc_lang_asked、已选隐藏；/tw 导航含 /tw/auth')
}

// ---------- ⑦ 切换写 cookie ----------
console.log('—— ⑦ 语言切换写 cookie ——')
{
  let f = 0
  // 2026-11-04 统一第一批：Hans/Hant 两份切换器合并为 LangSwitcher。
  const src = read('src/components/LangSwitcher.tsx')
  if (!src.includes('LANG_COOKIE') || !src.includes('document.cookie')) { f++; fail('LangSwitcher 未写 mc_lang cookie') }
  for (const label of ['简体', '繁體', 'English']) {
    if (!src.includes(label)) { f++; fail(`LangSwitcher 缺 ${label} 切换入口`) }
  }
  if (f === 0) ok('语言切换器含简/繁/英入口，点击写 mc_lang（不依赖 IP）')
}

// ---------- 牙口 ----------
console.log('—— 牙口自检 ——')
{
  let f = 0
  if (langFromCountry('TW') !== 'zh-Hant') f++
  if (langFromCountry('MO') !== 'zh-Hant') f++
  if (langFromCountry('JP') !== 'zh-Hans') f++
  if (decideRootLang({ cookie: 'en', country: 'TW', userAgent: '' }) !== 'zh-Hans') f++
  if (triAlternates('/x').en !== '/en/x') f++
  if (triAlternates('/x')['x-default'] !== '/x') f++
  if (f) fail('牙口：映射/不跳转/hreflang 判据样本失效')
  else ok('牙口：地区映射、cookie 不跳、hreflang 判据均可触发')
}

console.log('\n' + (allPass ? 'LANG_ROUTING_PASS' : 'LANG_ROUTING_FAIL'))
process.exit(allPass ? 0 : 1)
