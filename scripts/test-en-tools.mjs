// 英文工具页（合婚 / 紫微 / 方位）验收（2026-11-03）
//
// 断的是什么：
//   ① 三个英文页面源码零 CJK（UI 文案不能漏中文）
//   ② 结果区只渲染 AI 英文段落或英文 locked preview，绝不渲染中文规则表
//   ③ API locale=en 时 locked preview 用英文常量
//   ④ 牙口：往源码注入一句中文，零 CJK 断言必须翻红

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

let allPass = true
const fail = (m) => { allPass = false; console.log('  ✗ ' + m) }
const ok = (m) => console.log('  · ' + m)
const assert = (cond, m) => (cond ? ok(m) : fail(m))

const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
const read = (p) => readFileSync(join(root, p), 'utf8')
const { findCJK } = await import('../src/lib/ai-check.ts')

const clients = [
  'src/app/en/hemun/Client.tsx',
  'src/app/en/ziwei/Client.tsx',
  'src/app/en/geo/Client.tsx',
  'src/app/en/account/page.tsx',
  'src/app/en/member/page.tsx',
  'src/app/en/reports/page.tsx',
  'src/app/en/reports/[id]/page.tsx',
  'src/app/en/pricing/page.tsx',
  'src/app/en/checkout/success/page.tsx',
]

// ---------- ① 源码零 CJK ----------
console.log('—— ① 英文工具页源码零 CJK ——')
for (const file of clients) {
  const src = read(file)
  const cjk = findCJK(src)
  assert(cjk.length === 0, `${file} 零 CJK（命中：${cjk.slice(0, 10).join('、')}）`)
}
for (const file of clients.slice(0, 3)) {
  assert(read(file).includes("locale: 'en'"), `${file} 请求携带 locale=en`)
}

// ---------- ② 结果区不渲染中文规则表 ----------
console.log('—— ② 结果区只渲染英文 AI / 英文 preview ——')
for (const file of clients.slice(0, 3)) {
  const src = read(file)
  for (const forbidden of ['data.result', 'data.geo', 'data.chart', 'data.analysis', '<HemunResultView', '<ZiweiResultView', '<GeoResultView']) {
    assert(!src.includes(forbidden), `${file} 不引用中文结果数据/组件（${forbidden}）`)
  }
  assert(src.includes('data.ai'), `${file} 渲染 AI 英文段落`)
  assert(src.includes('data.locked?.preview'), `${file} 渲染英文 locked preview`)
}

// ---------- ③ API 英文 locked preview ----------
console.log('—— ③ API locale=en 的 locked preview ——')
for (const [file, marker] of [
  ['src/app/api/hemun/route.ts', 'HEMUN_LOCKED_PREVIEW_EN'],
  ['src/app/api/ziwei/route.ts', 'ZIWEI_LOCKED_PREVIEW_EN'],
  ['src/app/api/geo/route.ts', 'GEO_LOCKED_PREVIEW_EN'],
]) {
  const src = read(file)
  assert(src.includes(marker), `${file} 定义英文 preview`)
  assert(src.includes("locale === 'en'"), `${file} 按 locale 选择英文 preview`)
  assert(/lockedPreview/.test(src), `${file} locked 响应使用 locale 化 preview`)
}

// ---------- ⑤ 第三步链路：导航 / 会员中心 / 支付成功 ----------
console.log('—— ⑤ 账户、会员、报告列表与支付回跳 ——')
{
  const layout = read('src/app/en/layout.tsx')
  for (const href of ['/en/reports', '/en/member', '/en/account']) {
    assert(layout.includes(`href="${href}"`), `英文导航含 ${href}`)
  }
  {
    const mb = read('src/components/MembershipButton.tsx')
    assert(mb.includes("'/en/member'") && mb.includes("'/tw/member'"), '会员按钮按语言落 /en/member 或 /tw/member，不落中文 /member')
  }
  assert(read('src/lib/waffo.ts').includes("'/en/checkout/success'"), '英文购买成功回跳 /en/checkout/success')
  const pricing = read('src/app/en/pricing/page.tsx')
  assert(pricing.includes('returnTo="/en/checkout/success"'), '英文定价页购买携带英文成功回跳')
  assert(read('src/app/en/chart/Client.tsx').includes('returnTo="/en/checkout/success"'), '英文命书购买携带英文成功回跳')
}

// ---------- ④ 牙口：注入中文必须翻红 ----------
console.log('—— ④ 零 CJK 断言牙口 ——')
{
  const injected = read(clients[0]) + '\nconst leak = "这句话是中文";\n'
  assert(findCJK(injected).length > 0, '往英文工具页注入中文后能被检出')
  assert(findCJK('\n').length === 0, '空行/英文不误报')
}

console.log('\n' + (allPass ? 'EN_TOOLS_PASS' : 'EN_TOOLS_FAIL'))
process.exit(allPass ? 0 : 1)
