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
  for (const forbidden of ['data.result', '<HemunResultView', '<GeoResultView']) {
    assert(!src.includes(forbidden), `${file} 不引用中文结果数据/组件（${forbidden}）`)
  }
  if (file.includes('/ziwei/')) {
    // 2026-11-05：紫微并入共享骨架 —— 简/繁/英同一区块顺序与卡片规格，英文只走 enRule 文案层
    assert(!src.includes('EnZiweiRules'), `${file} 不再引用独立英文紫微表`)
    assert(src.includes('ziweiEn('), `${file} 用 enRule 英文重写层`)
    assert(src.includes('<ZiweiResultView'), `${file} 渲染共享结果骨架`)
    assert(src.includes('locale="en"'), `${file} 共享骨架传 locale=en`)
  } else {
    assert(!src.includes('<ZiweiResultView'), `${file} 不引用中文结果组件（<ZiweiResultView）`)
  }
  // 结构化字段只允许作为英文规则表/重写层的入参，不得直接渲染中文结果
  for (const token of ['data.chart', 'data.analysis', 'data.geo']) {
    const leaked = src.split('\n').filter((l) => l.includes(token) && !l.includes('Rules') && !l.includes('ziweiEn'))
    assert(leaked.length === 0, `${file} 结构化字段仅作为英文重写入参（${token}）`)
  }
  if (file.includes('/ziwei/')) {
    assert(src.includes('<ZiweiResultView'), `${file} 结果区由共享骨架渲染（含 AI 英文段落与 locked preview）`)
  } else {
    assert(src.includes('data.ai'), `${file} 渲染 AI 英文段落`)
    assert(src.includes('data.locked?.preview'), `${file} 渲染英文 locked preview`)
  }
}
// 英文 UI 文案表本身也必须零 CJK
assert(findCJK(read('src/lib/ziweiUiEn.ts')).length === 0, 'src/lib/ziweiUiEn.ts 零 CJK')

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
  // 2026-11-04 统一第一批：三棵树导航收口到 lib/site-nav.ts（locale 参数化）。
  // 旧断言在 layout 源码里找 href 字面量，现已不成立；改为按语言解析真实 URL 后断言。
  const { navHrefs, itemsFor, ACCOUNT_ITEMS } = await import('../src/lib/site-nav.ts')
  const { pathForLang } = await import('../src/lib/lang.ts')
  const enAll = [...navHrefs('en'), ...itemsFor('en', ACCOUNT_ITEMS).map((i) => pathForLang(i.path, 'en'))]
  for (const href of ['/hemun', '/ziwei', '/geo', '/liunian', '/reports', '/member', '/account']) {
    assert(enAll.includes(pathForLang(href, 'en')), `英文导航含 ${pathForLang(href, 'en')}`)
  }
  // 三套语言树的五个工具入口必须齐全且不隐藏（移动端只允许横向滚动，不得 hidden）。
  for (const lang of ['zh-Hans', 'zh-Hant', 'en']) {
    for (const href of ['/hemun', '/ziwei', '/geo', '/liunian']) {
      assert(navHrefs(lang).includes(pathForLang(href, lang)), `${lang} 导航含 ${pathForLang(href, lang)}`)
    }
  }
  const header = read('src/components/SiteHeader.tsx')
  const navSection = header.slice(header.indexOf('<nav'), header.indexOf('</nav>'))
  assert(!/hidden\s+(sm|md|lg):/.test(navSection), '导航工具项未按断点隐藏')
  {
    const mb = read('src/components/MembershipButton.tsx')
    assert(mb.includes("'/en/member'") && mb.includes("'/tw/member'"), '会员按钮按语言落 /en/member 或 /tw/member，不落中文 /member')
  }
  assert(read('src/lib/waffo.ts').includes("'/en/checkout/success'"), '英文购买成功回跳 /en/checkout/success')
  const pricing = read('src/app/en/pricing/page.tsx')
  assert(pricing.includes('returnTo="/en/checkout/success"'), '英文定价页购买携带英文成功回跳')
  assert(read('src/app/en/chart/Client.tsx').includes('returnTo="/en/checkout/success"'), '英文命书购买携带英文成功回跳')
}

// ---------- ⑥ 阶段二：英文术语硬约束 + 拼音干支溯源 ----------
console.log('—— ⑥ 英文术语与拼音干支溯源 ——')
{
  const { makeAnalysisComplianceValidator } = await import('../src/lib/aiAnalysis.ts')
  const { pinyinGanzhi } = await import('../src/lib/ai-check.ts')
  // 事实集只含 甲子 / 丙寅（浏览器就是这两组）
  const v = makeAnalysisComplianceValidator(new Set(['甲子', '丙寅']), true)
  assert(v({ overview: 'The Four Pillars of this Bazi chart begin with Jia Zi and Bing Yin. For reference only.' }) === null, '合法拼音组合（Jia Zi / Bing Yin）通过')
  const bad = v({ overview: 'This Bazi chart has Ding Wei in the month pillar. For reference only.' })
  assert(bad !== null && bad.includes('未溯源'), '注入未溯源拼音必须翻红（Ding Wei）')
  assert(pinyinGanzhi('Jia Zi and jia-zi and Bing Yin').length === 2, '拼音抽取去重并归一化（Jia Zi / Bing Yin）')
  const aiSrc = read('src/lib/aiAnalysis.ts')
  for (const term of ['Four Pillars', 'Ten Gods', 'True Solar Time', 'Bazi']) {
    assert(aiSrc.includes(term), `英文系统提示/板块硬约束包含术语 ${term}`)
  }
  assert(aiSrc.includes('EN_REQUIRED_TERMS'), '出口术语检查已接线（EN_REQUIRED_TERMS）')
}

// ---------- ⑦ 支付链路（英文）----------
// 用户追问「英文支付链路还有没有中文残留」后补的守门（2026-11-09）。
// 覆盖：下单 / 会员订阅的报错串、收银台语言、英文成功页与各购买入口的回跳。
console.log('—— ⑦ 英文支付链路零中文 ——')
{
  // a) 收银台语言：英文入口必须把 Waffo 托管页设成 en，不能掉回简体
  const { checkoutLanguage } = await import('../src/lib/locale.ts')
  assert(checkoutLanguage('en') === 'en', '收银台语言：locale=en → Waffo language=en')
  assert(checkoutLanguage('zh-Hans') === 'zh-Hans' && checkoutLanguage('zh-Hant') === 'zh-Hant-TW', '收银台语言：简/繁映射不变')
  const { buildCheckoutParams } = await import('../src/lib/waffo.ts')
  const base = {
    productId: 'PROD_test', orderMerchantExternalId: 'MC_test', buyerEmail: 'a@b.com',
    userId: 'u1', sku: 'fatebook', appUrl: 'https://www.mingcharts.com', storeId: 'STO_test',
  }
  assert(buildCheckoutParams({ ...base, locale: 'en' }).language === 'en', 'createSession 入参 language=en（英文入口）')
  assert(buildCheckoutParams({ ...base }).language === 'zh-Hans', '缺省 locale 仍为 zh-Hans（零回归）')

  // b) 下单接口：英文入口的报错串必须英文（CheckoutButton 会原样显示 error）
  const call = async (handler, body) => {
    const res = await handler(new Request('http://localhost/api', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    }))
    return { status: res.status, json: await res.json() }
  }
  const { POST: checkoutPost } = await import('../src/app/api/checkout/route.ts')
  const en400 = await call(checkoutPost, { token: '', sku: '', locale: 'en' })
  assert(en400.status === 400 && en400.json.error === 'Missing or invalid parameters', `/api/checkout 参数缺失（en）→ 英文：${en400.json.error}`)
  assert(findCJK(en400.json.error).length === 0, '/api/checkout 英文报错串零 CJK')
  const zh400 = await call(checkoutPost, { token: '', sku: '' })
  assert(zh400.json.error === '参数缺失或格式错误', `/api/checkout 缺省 locale 仍为中文（零回归）：${zh400.json.error}`)
  const enSku = await call(checkoutPost, { token: 'x', sku: 'nope', locale: 'en' })
  assert(/^[A-Za-z0-9 ,.'!-]+$/.test(enSku.json.error || ''), `/api/checkout 未开放商品（en）→ 英文：${enSku.json.error}`)

  // c) 会员订阅接口：同意校验等业务报错同样按 locale
  const { POST: memberPost } = await import('../src/app/api/membership/route.ts')
  const mMissing = await call(memberPost, { token: '', plan: '', locale: 'en' })
  assert(mMissing.json.error === 'Missing parameters', `/api/membership 参数缺失（en）→ 英文：${mMissing.json.error}`)
  const mConsent = await call(memberPost, { token: 'x', plan: 'monthly', agreeAutoRenew: false, locale: 'en' })
  assert(mConsent.json.code === 'CONSENT_REQUIRED' && findCJK(mConsent.json.error).length === 0, `/api/membership 未勾选同意（en）→ 英文零 CJK：${mConsent.json.error}`)

  // d) 英文购买入口：按钮语言、登录页与成功回跳都在 /en
  for (const [file, marker] of [
    ['src/app/en/pricing/page.tsx', 'returnTo="/en/checkout/success"'],
    ['src/app/en/chart/Client.tsx', 'returnTo="/en/checkout/success"'],
    ['src/app/en/mingshu/page.tsx', 'returnTo="/en/checkout/success"'],
  ]) {
    const src = read(file)
    assert(src.includes('locale="en"') && src.includes('authPath="/en/auth"'), `${file} 购买按钮 locale=en 且登录落 /en/auth`)
    assert(src.includes(marker), `${file} 支付成功回跳英文成功页`)
  }
  assert(read('src/app/en/pricing/page.tsx').includes('<MembershipButton'), '英文定价页会员按钮来自共享组件')
  assert(read('src/components/MembershipButton.tsx').includes('en ?'), '会员按钮错误/文案有英文分支')
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
