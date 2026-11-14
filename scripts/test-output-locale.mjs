// 产出语言守门（2026-11-05）
//
// 背景：一天内连出三次「中文站产出英文内容」——
//   ① 命书生成  ② 我的命盘重生成  ③ 追问回答
// 同一个根因：请求体没带 locale，服务端回落到 mc_locale cookie，
// 而 cookie 会被任意语言页的访问改写（用户点过 /en 就变 en）。
//
// 现在的机制（两层）：
//   ① lib/locale.ts 的 localeFromRequest 只认 body.locale，不再读 cookie；
//   ② 所有产出型请求必须显式声明 locale —— 本脚本扫描源码守住这一条。
//
// 这条测试的价值：以后再新增入口忘了带 locale，验不通过，
// 而不是等用户拿到另一门语言的报告才发现。
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

let allPass = true
const failures = []
const fail = (m) => { allPass = false; failures.push(m); console.log('  ✗ ' + m) }
const ok = (m) => console.log('  · ' + m)
const assert = (c, msg, fmsg) => (c ? ok(msg) : fail(fmsg ?? msg))

console.log('—— ① localeFromRequest 不得再读 cookie ——')
{
  const src = readFileSync('src/lib/locale.ts', 'utf8')
  const fnStart = src.indexOf('export function localeFromRequest')
  assert(fnStart > 0, '能找到 localeFromRequest')
  const fnBody = src.slice(fnStart, fnStart + 400)
  assert(!/LOCALE_COOKIE|fromCookie|cookies\?\./.test(fnBody),
    'localeFromRequest 只认 body.locale（cookie 不再影响产出语言）',
    'localeFromRequest 仍读 cookie —— 产出语言会被其它语言页的访问带偏')
}

console.log('—— ② 所有产出型请求必须带 locale ——')
// 产出型 = 这些接口会生成命理内容（或决定收银台语言），语言必须由调用方声明。
//
// ★ 精确到路由，不认前缀（2026-11-14）：
//   旧写法用 near.includes('/api/hemun')，会把 /api/hemun/share 也算成产出型 —— 但它只签发
//   分享 token（HMAC），不产出任何语言相关正文，本来就不需要 locale；同理 /api/member
//   前缀会把 /api/membership（订阅收银台，需要 locale）和 /api/member/summary（GET 只读）
//   一起吞进来。现在改成「路径后必须是边界」：/api/hemun/share、/api/membership/cancel
//   这类子路径不再命中，同时补上真正需要 locale 的 /api/membership。
const CONTENT_APIS = [
  '/api/ask', '/api/geo', '/api/hemun', '/api/liunian', '/api/ziwei',
  '/api/paipan', '/api/unlock', '/api/fatebook', '/api/checkout',
  '/api/membership', // 订阅收银台：locale 决定收银台显示语言
]

// 路径后必须是边界（引号 / 反引号 / ? / 空白 / 模板变量…），不能是 \w、/、-。
const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const hitContentApi = (near) =>
  CONTENT_APIS.find((a) => new RegExp(escRe(a) + String.raw`(?![\w/-])`).test(near))

// 判据自检：防止以后又把「前缀命中」写回来
assert(!hitContentApi(`fetch('/api/hemun/share'`),
  '判据自检：/api/hemun/share 不算产出型',
  '判据过宽：/api/hemun/share 被算成产出型请求')
assert(!hitContentApi(`fetch('/api/geo/token'`),
  '判据自检：/api/geo 的子路径不算产出型',
  '判据过宽：/api/geo 子路径被算成产出型请求')
assert(!hitContentApi(`fetch('/api/ziwei/share'`),
  '判据自检：/api/ziwei 的子路径不算产出型',
  '判据过宽：/api/ziwei 子路径被算成产出型请求')
assert(!hitContentApi(`fetch('/api/membership/cancel'`),
  '判据自检：/api/membership/cancel 不算产出型',
  '判据过宽：/api/membership/cancel 被算成产出型请求')
assert(!!hitContentApi(`fetch('/api/hemun'`),
  '判据自检：/api/hemun 本身仍算产出型',
  '判据过严：/api/hemun 没被识别成产出型请求')
assert(!!hitContentApi(`fetch('/api/ziwei?regen=1'`),
  '判据自检：带查询串仍算产出型',
  '判据过严：/api/ziwei?regen=1 没被识别成产出型请求')

const files = []
;(function walk(d) {
  for (const e of readdirSync(d)) {
    const f = join(d, e)
    const st = statSync(f)
    if (st.isDirectory()) walk(f)
    else if (/\.(ts|tsx)$/.test(e)) files.push(f)
  }
})('src')

const gaps = []
for (const f of files) {
  const src = readFileSync(f, 'utf8')
  let idx = 0
  while ((idx = src.indexOf('JSON.stringify({', idx)) >= 0) {
    // 用括号配对取完整对象（多行、展开运算符都能吃）
    const start = idx + 'JSON.stringify('.length
    let depth = 0
    let end = -1
    for (let i = start; i < src.length; i++) {
      const c = src[i]
      if (c === '{' || c === '(' || c === '[') depth++
      else if (c === '}' || c === ')' || c === ']') { depth--; if (depth === 0) { end = i; break } }
    }
    if (end < 0) break
    const body = src.slice(start, end + 1)
    const near = src.slice(Math.max(0, idx - 900), idx)
    const api = hitContentApi(near)
    if (api && !/\blocale\b/.test(body)) {
      gaps.push(`${f}:${src.slice(0, idx).split('\n').length} → ${api}`)
    }
    idx = end + 1
  }
}
assert(gaps.length === 0,
  `产出型请求全部显式带 locale（扫描 ${files.length} 个文件）`,
  `这些产出型请求没带 locale：\n      ${gaps.join('\n      ')}`)

console.log('—— ③ 报告缓存键必须含 locale ——')
// 事故形态（2026-11-05 实测）：同一命盘先出过中文紫微报告，
// 英文站请求命中同一缓存键 → 英文用户拿到整篇中文。
// 缓存键不含语言，等于「谁先算谁定语言」。
{
  const routes = ['src/app/api/geo/route.ts', 'src/app/api/hemun/route.ts', 'src/app/api/ziwei/route.ts']
  for (const f of routes) {
    const src = readFileSync(f, 'utf8')
    const m = src.match(/reportCacheKey\([^)]*\)/)
    assert(!!m, `${f}：有缓存键构造`)
    const hasLocale = /locale/.test(m?.[0] ?? '')
    assert(hasLocale,
      `${f}：缓存键含 locale（跨语言不会命中同一份缓存）`,
      `${f}：缓存键不含 locale —— 中文报告会被英文站命中`)
  }
}

console.log('—— ④ 英文报告的降级兜底必须是英文 ——')
// 事故形态（2026-11-05 实测）：英文紫微报告「趋避建议」一卷 AI 连续未过校验，
// 降级到规则版兜底 —— 而规则版只有中文 → 整份报告出现中英混排。
{
  const src = readFileSync('src/lib/aiZiwei.ts', 'utf8')
  assert(/export function englishFallbackText/.test(src),
    '存在英文降级兜底 englishFallbackText',
    '缺英文降级兜底 —— 英文报告降级时会落入中文文案')
  assert(/isEn\s*\?\s*englishFallbackText/.test(src),
    '英文报告选英文兜底（isEn ? englishFallbackText : fallbackZiweiText）',
    '调用处未按语言选择兜底 —— 英文仍会落到中文规则版')
  // 英文兜底函数体内不得出现中文（否则等于换了个地方混排）
  const i = src.indexOf('export function englishFallbackText')
  const body = src.slice(i, src.indexOf('\n}', i))
  const cjk = body.match(/[\u4e00-\u9fa5]/g) ?? []
  assert(cjk.length === 0,
    '英文兜底函数体内无中文字符',
    `英文兜底函数体内有 ${cjk.length} 个中文字符`)
}

console.log('')
if (allPass) console.log('OUTPUT_LOCALE_PASS')
else {
  console.log(`OUTPUT_LOCALE_FAIL（${failures.length} 处）`)
  for (const x of failures) console.log('  - ' + x)
}
process.exitCode = allPass ? 0 : 1
