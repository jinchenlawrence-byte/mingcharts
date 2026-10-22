// 输出语言（OutputLocale）验收断言 —— §六「AI 命书语言」前置项的牙口
//
// 断的是什么：
//   ① 解析矩阵（认得 / 认不得 / 别名），默认必须回落到 zh-Hans
//   ② 默认路径【逐字不变】：不带 locale 时 system prompt 与旧版完全一致（零回归）
//   ③ 收银台语言映射到 Waffo 的 CashierLanguage 取值（zh-Hant-TW，SDK 里没有裸 zh-Hant）
//   ④ 六个 AI 模块都走同一个 localeDirective（防「只改一半」）
//   ⑤ 行为层：真调 aiAnalysis / aiAsk，抓真实请求体的 system 消息
//   ⑥ 繁体禁用词不再绕过合规校验（註定 / 積極進取 / 突破性進展）
//   ⑦ 六条 API route 都把 locale 传下去了

import { readFileSync } from 'node:fs'

let allPass = true
const fail = (msg) => { allPass = false; console.log('  ✗ ' + msg) }

// 必须在 import AI 模块【之前】设好，模块顶层读 env
process.env.AI_API_KEY = process.env.AI_API_KEY || 'test-key-not-real'

const {
  parseLocale, resolveLocale, localeDirective, checkoutLanguage,
  HANT_OUTPUT_DIRECTIVE, LOCALE_COOKIE, OUTPUT_LOCALES, localeFromRequest,
} = await import('../src/lib/locale.ts')
const { findForbidden, FORBIDDEN_WORDS, FORBIDDEN_WORDS_HANT } = await import('../src/lib/ai-check.ts')

// ---------- ① 解析矩阵 ----------
console.log('—— ① parseLocale / resolveLocale ——')
let parseFail = 0
const ok = (v, want) => {
  const got = parseLocale(v)
  if (got !== want) { parseFail++; fail(`parseLocale(${JSON.stringify(v)}) = ${JSON.stringify(got)}，应为 ${JSON.stringify(want)}`) }
}
ok('zh-Hans', 'zh-Hans'); ok('zh-CN', 'zh-Hans'); ok('ZH-HANS', 'zh-Hans'); ok(' cn ', 'zh-Hans')
ok('zh-Hant', 'zh-Hant'); ok('zh-TW', 'zh-Hant'); ok('zh-HK', 'zh-Hant'); ok('tw', 'zh-Hant'); ok('HANT', 'zh-Hant')
for (const bad of ['en', '', '   ', null, undefined, 123, {}, [], 'zh']) ok(bad, null)
if (resolveLocale('en', 'zh-Hant') !== 'zh-Hant') { parseFail++; fail('resolveLocale 未按候选顺序取第一个认得的') }
if (resolveLocale('en', null, '{}') !== 'zh-Hans') { parseFail++; fail('resolveLocale 全认不得时应回落 zh-Hans') }
// localeFromRequest：body 优先于 cookie
const fakeReq = (cookieVal) => ({ cookies: { get: (n) => (n === LOCALE_COOKIE && cookieVal ? { value: cookieVal } : undefined) } })
if (localeFromRequest(fakeReq('zh-Hant'), { locale: 'zh-Hans' }) !== 'zh-Hans') { parseFail++; fail('body.locale 应优先于 cookie') }
if (localeFromRequest(fakeReq('zh-Hant'), {}) !== 'zh-Hant') { parseFail++; fail('body 无 locale 时应读 cookie') }
if (localeFromRequest(fakeReq(null), {}) !== 'zh-Hans') { parseFail++; fail('既无 body 也无 cookie 时应回落 zh-Hans') }
if (localeFromRequest(null, null) !== 'zh-Hans') { parseFail++; fail('request 为 null 时不应抛错，应回落 zh-Hans') }
console.log(parseFail === 0 ? '✓ 解析：繁体/简体别名全中；en/空/null/数字/对象 一律 null；回落链 body ＞ cookie ＞ 默认' : `✗ 解析失败 ${parseFail} 处`)

// ---------- ② 指令内容 ----------
console.log('—— ② localeDirective 与默认零改动 ——')
let dirFail = 0
if (localeDirective() !== '') { dirFail++; fail('不带 locale 时必须返回空串（默认路径逐字不变）') }
if (localeDirective('zh-Hans') !== '') { dirFail++; fail('zh-Hans 必须返回空串') }
if (localeDirective('bogus') !== '') { dirFail++; fail('认不得的取值必须返回空串，不得误开繁体') }
if (localeDirective(null) !== '') { dirFail++; fail('null 必须返回空串') }
if (localeDirective('zh-Hant') !== HANT_OUTPUT_DIRECTIVE) { dirFail++; fail('zh-Hant 应返回 HANT_OUTPUT_DIRECTIVE 本体') }
for (const needle of ['繁體中文', '不得繁簡混用', '干支', '註定', '積極進取', '突破性進展']) {
  if (!HANT_OUTPUT_DIRECTIVE.includes(needle)) { dirFail++; fail(`繁体指令缺纪律项「${needle}」`) }
}
if (HANT_OUTPUT_DIRECTIVE.includes('简体中文') || HANT_OUTPUT_DIRECTIVE.includes('简体')) {
  dirFail++; fail('繁体指令里出现了「简体」字样，会把模型带偏')
}
console.log(dirFail === 0 ? '✓ 指令：默认/简体/未知一律空串；繁体指令含 3 条纪律且不含「简体」字样' : `✗ 指令失败 ${dirFail} 处`)

// ---------- ③ 收银台语言 ----------
console.log('—— ③ checkoutLanguage ——')
let payFail = 0
const CASHIER_OK = new Set(['zh-Hans', 'zh-Hant-TW', 'zh-Hant-HK']) // Waffo CashierLanguage 子集
const pay = (v, want) => {
  const got = checkoutLanguage(v)
  if (got !== want) { payFail++; fail(`checkoutLanguage(${JSON.stringify(v)}) = ${got}，应为 ${want}`) }
  if (!CASHIER_OK.has(got)) { payFail++; fail(`checkoutLanguage(${JSON.stringify(v)}) = ${got} 不在 Waffo 允许的取值里`) }
}
pay(undefined, 'zh-Hans'); pay('zh-Hans', 'zh-Hans'); pay('zh-Hant', 'zh-Hant-TW'); pay('tw', 'zh-Hant-TW'); pay('garbage', 'zh-Hans')
console.log(payFail === 0 ? '✓ 收银台：默认 zh-Hans 不变；繁体映射 zh-Hant-TW（SDK 无裸 zh-Hant）' : `✗ 收银台失败 ${payFail} 处`)

// ---------- ④ 六个模块单一事实源 ----------
console.log('—— ④ 六个 AI 模块接线 ——')
let wireFail = 0
const MODULES = ['aiAnalysis', 'aiAsk', 'aiGeo', 'aiHemun', 'aiLiunian', 'aiZiwei']
for (const m of MODULES) {
  const src = readFileSync(new URL(`../src/lib/${m}.ts`, import.meta.url), 'utf8')
  if (!src.includes("import { localeDirective, type OutputLocale } from './locale'")) {
    wireFail++; fail(`${m}.ts 未从 lib/locale 引入 localeDirective`)
  }
  if (!src.includes('SYSTEM_PROMPT + localeDirective(opts?.locale)')) {
    wireFail++; fail(`${m}.ts 的 system 消息未走 SYSTEM_PROMPT + localeDirective(opts?.locale)`)
  }
  if (!src.includes('opts?: { locale?: OutputLocale }')) {
    wireFail++; fail(`${m}.ts 的函数签名未接收 opts.locale`)
  }
  // 防手抄：指令正文只许在 lib/locale.ts 出现一次
  if (src.includes('【輸出語言') || src.includes('繁體中文')) {
    wireFail++; fail(`${m}.ts 手抄了繁体指令正文 —— 必须引用 localeDirective（单一事实源）`)
  }
}
console.log(wireFail === 0 ? `✓ 接线：${MODULES.length} 个模块均 SYSTEM_PROMPT + localeDirective(opts?.locale)，无手抄指令` : `✗ 接线失败 ${wireFail} 处`)

// ---------- ⑤ 行为层：抓真实请求体 ----------
console.log('—— ⑤ 行为：真实调用抓 system 消息 ——')
let behaveFail = 0
const captured = []
const realFetch = globalThis.fetch
// 行为层会把 AI 降级日志打到 stderr（我们故意喂 '{}' 让它判不合格），测试期静音，免得 verify 输出被淹
const realWarn = console.warn
const realError = console.error
console.warn = () => {}
console.error = () => {}
globalThis.fetch = async (_url, init) => {
  try { captured.push(JSON.parse(init.body)) } catch { captured.push(null) }
  const body = { choices: [{ message: { content: '{}' } }] }
  return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } })
}

const { paipan, getWangShuai, getGeJu } = await import('../src/lib/paipan.ts')
const { generateAIAnalysis } = await import('../src/lib/aiAnalysis.ts')
const { generateAskAnswer } = await import('../src/lib/aiAsk.ts')

const base = paipan({ year: 1990, month: 5, day: 8, hour: 10, minute: 0, gender: 1 })
const chart = { ...base, analysis: { wangShuai: getWangShuai(base), geJu: getGeJu(base), isPaid: true } }

const systemOf = (n) => captured[n]?.messages?.find((x) => x.role === 'system')?.content ?? ''

// 5-1 不带 locale（旧调用方式，逐字兼容）
captured.length = 0
await generateAIAnalysis(chart)
const sysDefault = systemOf(0)
if (!sysDefault) { behaveFail++; fail('默认调用未抓到 system 消息（可能因 AI_API_KEY 缺失提前返回 null）') }
if (sysDefault.includes('【輸出語言')) { behaveFail++; fail('默认调用竟带上了繁体指令 —— 默认路径被污染') }

// 5-2 显式 zh-Hans 必须与默认【逐字相同】
captured.length = 0
await generateAIAnalysis(chart, { locale: 'zh-Hans' })
const sysHans = systemOf(0)
if (sysHans !== sysDefault) { behaveFail++; fail('locale=zh-Hans 与不带 locale 的 system prompt 不一致（应逐字相同）') }

// 5-3 zh-Hant 必须 = 默认 + 指令（只追加、不改写）
captured.length = 0
await generateAIAnalysis(chart, { locale: 'zh-Hant' })
const sysHant = systemOf(0)
if (sysHant !== sysDefault + HANT_OUTPUT_DIRECTIVE) {
  behaveFail++; fail('繁体 system prompt 不等于「默认 + HANT_OUTPUT_DIRECTIVE」（重试时不得重复追加）')
}

// 5-4 追问同口径
captured.length = 0
await generateAskAnswer(chart, '今年事业如何？', { locale: 'zh-Hant' })
const sysAsk = systemOf(0)
if (!sysAsk.endsWith(HANT_OUTPUT_DIRECTIVE)) { behaveFail++; fail('aiAsk 的 system prompt 未追加繁体指令') }
if (sysAsk.includes(HANT_OUTPUT_DIRECTIVE + HANT_OUTPUT_DIRECTIVE)) { behaveFail++; fail('aiAsk 重复追加了繁体指令') }

globalThis.fetch = realFetch
console.warn = realWarn
console.error = realError
console.log(behaveFail === 0
  ? '✓ 行为：默认/zh-Hans 逐字相同且无指令；zh-Hant 恰为「默认+指令」；aiAsk 同口径（4 次真实请求体已抓取断言）'
  : `✗ 行为断言失败 ${behaveFail} 处`)

// ---------- ⑥ 繁体禁词不再绕过 ----------
console.log('—— ⑥ 繁体禁用词判据 ——')
let wordFail = 0
if (JSON.stringify([...FORBIDDEN_WORDS]) !== JSON.stringify(['必', '一定', '注定', '积极进取', '突破性进展'])) {
  wordFail++; fail(`FORBIDDEN_WORDS 必须仍是 B+C 五词（test-entitlement-gate 会断言），实际 ${JSON.stringify(FORBIDDEN_WORDS)}`)
}
if (FORBIDDEN_WORDS_HANT.length !== 3) { wordFail++; fail('FORBIDDEN_WORDS_HANT 应为 3 项（注定/积极进取/突破性进展的繁体形态）') }
const mustHit = [
  ['这段关系註定难以长久', '註定'],
  ['投資上宜積極進取', '積極進取'],
  ['今年將迎來突破性進展', '突破性進展'],
  ['此局务必谨慎行事', '必'],
  ['你一定能实现目标', '一定'],
  ['这段关系注定难以长久', '注定'],
]
for (const [text, w] of mustHit) {
  const { hits } = findForbidden(text)
  if (!hits.some((h) => h.w === w)) { wordFail++; fail(`繁体/简体违规写法未被检出：「${text}」应命中「${w}」`) }
}
// 否定式豁免在繁体下仍生效（否则会白吃重试 → 退回规则版）
if (findForbidden('並非註定如此').hits.length !== 0) {
  wordFail++; fail('「並非註定」应走否定豁免（繁体否定词 並非 未被识别）')
}
console.log(wordFail === 0 ? '✓ 判据：繁体三词与简体五词同罪；「並非註定」正确豁免；FORBIDDEN_WORDS 仍是五词' : `✗ 判据失败 ${wordFail} 处`)

// ---------- ⑦ 路由传参 ----------
console.log('—— ⑦ API route 传参 ——')
let routeFail = 0
const ROUTES = {
  'unlock/route.ts': 'generateAIAnalysis(analyzable, { locale })',
  'ask/route.ts': 'generateAskAnswer(chart as AnalyzableChart, q, { locale })',
  'liunian/route.ts': 'generateAILiunian(analyzable, luck, targetYear, { locale })',
  'ziwei/route.ts': 'generateAIZiwei(chart, analysis, { locale })',
  'geo/route.ts': 'generateAIGeo(analysis, { locale })',
  'hemun/route.ts': 'generateAIHemun(male, female, result, { locale })',
  'checkout/route.ts': 'localeFromRequest(request, body)',
  'membership/route.ts': 'localeFromRequest(req)',
}
for (const [f, needle] of Object.entries(ROUTES)) {
  const src = readFileSync(new URL(`../src/app/api/${f}`, import.meta.url), 'utf8')
  if (!src.includes(needle)) { routeFail++; fail(`${f} 未接上：缺 ${needle}`) }
  if (!src.includes("from '@/lib/locale'")) { routeFail++; fail(`${f} 未 import lib/locale`) }
}
console.log(routeFail === 0 ? `✓ 路由：${Object.keys(ROUTES).length} 条 route 均接上 lib/locale 并下传` : `✗ 路由失败 ${routeFail} 处`)

// ---------- 牙口自检 ----------
console.log('—— 牙口自检（守护断言本身）——')
let toothFail = 0
if (parseLocale('zh-Hant') !== 'zh-Hant') { toothFail++; fail('牙口：parseLocale 正常值都判不对') }
if (localeDirective('zh-Hant') === '') { toothFail++; fail('牙口：繁体指令返回空，断言等于空转') }
const { hits: toothHits } = findForbidden('這段關係註定难以长久')
if (toothHits.length === 0) { toothFail++; fail('牙口：繁体禁词样本未被检出，⑤⑥ 的断言会假通过') }
if (OUTPUT_LOCALES.length !== 2) { toothFail++; fail('牙口：OUTPUT_LOCALES 应为 2 项') }
console.log(toothFail === 0 ? '✓ 牙口：解析/指令/繁体禁词/取值表 判据样本均能触发' : '✗ 牙口自检失败')

console.log('\n' + (allPass ? 'LOCALE_ACCEPT_PASS' : 'LOCALE_ACCEPT_FAIL'))
process.exit(allPass ? 0 : 1)
