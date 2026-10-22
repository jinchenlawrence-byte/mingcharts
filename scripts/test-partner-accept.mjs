// 伙伴申请（/partners）验收断言
//
// 断的是什么：
//   ① 校验层：必填/长度/枚举/邮箱格式/蜜罐
//   ② 匿名写入口的安全：限流在写库之前、蜜罐静默丢弃、库写失败不假装成功
//   ③ 页面：简繁两版 + hreflang 双向 + 表单指向正确端点 + 蜜罐字段存在
//   ④ 价目表与文档同源（改价先改文档，再改代码）
//   ⑤ sitemap 收录 · 根 layout 有入口链接

import { readFileSync } from 'node:fs'

let allPass = true
const fail = (m) => { allPass = false; console.log('  ✗ ' + m) }
const near = (p) => new URL(`../${p}`, import.meta.url)

const {
  normalizeApplication, PARTNER_CONTACT_KINDS, PARTNER_VOLUMES, PARTNER_LIMITS,
} = await import('../src/lib/partnerApply.ts')
const { hantAlternates } = await import('../src/lib/hant-seo.ts')
const { default: sitemap } = await import('../src/app/sitemap.ts')

const OK = {
  name: '陈老师', contactKind: 'line', contact: 'chenlaoshi',
  channel: 'IG @chen_bazi', volume: '30-100', region: '台湾', note: '客群以女性为主',
}

// ---------- ① 校验层 ----------
console.log('—— ① 校验层 ——')
let vFail = 0
{
  const r = normalizeApplication(OK)
  if (!r.data) { vFail++; fail(`合法输入被判失败：${r.errors.join('；')}`) }
  else {
    if (r.data.contact_kind !== 'line') { vFail++; fail('contact_kind 未归一') }
    if (r.data.volume !== '30-100') { vFail++; fail('volume 未归一') }
    if (r.data.channel !== 'IG @chen_bazi') { vFail++; fail('channel 被丢掉') }
  }
}
// 选填留空 → 落 null（不是空串，避免库里两种"空"）
{
  const r = normalizeApplication({ ...OK, channel: '', region: '  ', note: '' })
  if (!r.data) { vFail++; fail('选填留空不应失败') }
  else if (r.data.channel !== null || r.data.region !== null || r.data.note !== null) {
    vFail++; fail('选填留空应落 null')
  }
}
const mustFail = [
  ['缺称呼', { ...OK, name: '' }],
  ['称呼过长', { ...OK, name: 'x'.repeat(PARTNER_LIMITS.name + 1) }],
  ['缺联系方式', { ...OK, contact: '' }],
  ['联系方式过长', { ...OK, contact: 'x'.repeat(PARTNER_LIMITS.contact + 1) }],
  ['联系方式类型非法', { ...OK, contactKind: 'telegram' }],
  ['接单量非法', { ...OK, volume: '1000+' }],
  ['邮箱格式不对', { ...OK, contactKind: 'email', contact: 'not-an-email' }],
  ['备注过长', { ...OK, note: 'x'.repeat(PARTNER_LIMITS.note + 1) }],
  ['平台过长', { ...OK, channel: 'x'.repeat(PARTNER_LIMITS.channel + 1) }],
  ['地区过长', { ...OK, region: 'x'.repeat(PARTNER_LIMITS.region + 1) }],
  ['空对象', {}],
  ['null', null],
]
for (const [label, input] of mustFail) {
  const r = normalizeApplication(input)
  if (r.data || r.bot) { vFail++; fail(`${label}：应被拒绝，实际通过`) }
  else if (!r.errors.length) { vFail++; fail(`${label}：拒绝了但没给错误信息`) }
}
// 邮箱合法用例必须通过
if (!normalizeApplication({ ...OK, contactKind: 'email', contact: 'a@b.co' }).data) {
  vFail++; fail('合法邮箱被判失败')
}
// 枚举常量与表单不一致会导致用户永远提交不了
if (PARTNER_CONTACT_KINDS.length !== 5) { vFail++; fail('联系方式类型应为 5 种') }
if (PARTNER_VOLUMES.length !== 4) { vFail++; fail('接单量档位应为 4 档') }
console.log(vFail === 0 ? `✓ 校验：12 类非法输入全拒、合法通过、选填留空落 null、枚举 ${PARTNER_CONTACT_KINDS.length}+${PARTNER_VOLUMES.length} 项` : `✗ 校验失败 ${vFail} 处`)

// ---------- ② 蜜罐 ----------
console.log('—— ② 蜜罐 ——')
let botFail = 0
{
  const r = normalizeApplication({ ...OK, company: 'ACME Inc' })
  if (!r.bot) { botFail++; fail('蜜罐字段被填时应判为机器人') }
  if (r.data) { botFail++; fail('机器人请求不应返回可写库的数据') }
  // 蜜罐命中时不应报字段错误（否则会告诉机器人"你被识别了"）
  if (r.errors.length) { botFail++; fail('蜜罐命中时不该返回错误信息') }
  const clean = normalizeApplication({ ...OK, company: '' })
  if (clean.bot) { botFail++; fail('蜜罐留空不应判机器人') }
}
console.log(botFail === 0 ? '✓ 蜜罐：填了即静默丢弃（不返回数据、不返回错误）' : `✗ 蜜罐失败 ${botFail} 处`)

// ---------- ③ 匿名写入口的安全 ----------
console.log('—— ③ 写入口安全（route）——')
let routeFail = 0
const route = readFileSync(near('src/app/api/partner/apply/route.ts'), 'utf8')
{
  const limitPos = route.indexOf('checkRateLimit')
  const insertPos = route.indexOf('.insert(')
  if (limitPos < 0) { routeFail++; fail('route 未限流（匿名写入口必须有桶）') }
  if (insertPos < 0) { routeFail++; fail('route 未写库') }
  if (limitPos > insertPos) { routeFail++; fail('限流必须在写库之前（否则被刷时仍会写库）') }
  if (!route.includes('APPLY_RULES')) { routeFail++; fail('route 未用 APPLY_RULES（限流桶不对）') }
  if (!route.includes('clientKey(null')) { routeFail++; fail('route 未按 IP 限流（匿名请求应传 null userId）') }
  if (!/bot/.test(route)) { routeFail++; fail('route 未处理蜜罐命中') }
  if (!route.includes('status: 429')) { routeFail++; fail('route 缺 429 分支') }
  if (!/status: 500/.test(route)) { routeFail++; fail('写库失败必须报 500（申请是真实商机，不能假装成功）') }
  // 不能把 service_role 客户端或原始错误抛给客户端
  if (/NextResponse\.json\(\s*error\s*\)/.test(route)) { routeFail++; fail('route 把原始错误对象直接返回了（可能泄露内部信息）') }
}
// 限流桶命名必须与 route 用的一致
const rl = readFileSync(near('src/lib/rateLimit.ts'), 'utf8')
if (!rl.includes("bucket: 'partner_apply_hour'")) { routeFail++; fail('rateLimit.ts 缺 partner_apply_hour 桶') }
if (!rl.includes("bucket: 'partner_apply_day'")) { routeFail++; fail('rateLimit.ts 缺 partner_apply_day 桶') }
console.log(routeFail === 0 ? '✓ 写入口：限流在写库前、按 IP、429/500 分支齐、错误不透传' : `✗ 写入口失败 ${routeFail} 处`)

// ---------- ④ 页面与表单 ----------
console.log('—— ④ 页面与表单 ——')
let pageFail = 0
const hans = readFileSync(near('src/app/partners/page.tsx'), 'utf8')
const hant = readFileSync(near('src/app/tw/partners/page.tsx'), 'utf8')
for (const [name, src, canonical] of [
  ['简体 /partners', hans, "canonical: '/partners'"],
  ['繁体 /tw/partners', hant, "canonical: '/tw/partners'"],
]) {
  if (!src.includes(canonical)) { pageFail++; fail(`${name} canonical 不对`) }
  if (!src.includes('hantAlternates(')) { pageFail++; fail(`${name} 未用 hantAlternates（hreflang 会单边失效）`) }
}
// 简繁互指必须落在同一组 URL 上
const alt = hantAlternates('/partners')
if (alt['zh-Hans'] !== '/partners' || alt['zh-Hant'] !== '/tw/partners') {
  pageFail++; fail(`/partners 的 hreflang 映射不对：${JSON.stringify(alt)}`)
}
const form = readFileSync(near('src/components/partners/PartnerApplyForm.tsx'), 'utf8')
if (!form.includes('/api/partner/apply')) { pageFail++; fail('表单未提交到 /api/partner/apply') }
if (!form.includes('company')) { pageFail++; fail('表单缺蜜罐字段 company') }
if (!form.includes('aria-hidden')) { pageFail++; fail('蜜罐区应对读屏隐藏（aria-hidden）') }
if (!form.includes("'use client'")) { pageFail++; fail('申请表单必须是客户端组件') }
const landing = readFileSync(near('src/components/partners/PartnerLanding.tsx'), 'utf8')
for (const needle of ['PRICE_ROWS', 'localize', '#apply', '你会不会抢我的客户']) {
  if (!landing.includes(needle)) { pageFail++; fail(`落地页缺「${needle}」`) }
}
// 价目表三档必须都在（防止改价改一半）
if ((landing.match(/t200:/g) || []).length !== 4) { pageFail++; fail('价目表应有 4 行且都含 200 份档') }
console.log(pageFail === 0 ? '✓ 页面：简繁双版 + hreflang 互指 + 表单端点/蜜罐/客户端组件 + 落地页 5 类要素齐' : `✗ 页面失败 ${pageFail} 处`)

// ---------- ⑤ 价目表与文档同源 ----------
console.log('—— ⑤ 价目表与白标方案同源 ——')
let docFail = 0
const doc = readFileSync(near('docs/推广-命理师白标方案.md'), 'utf8')
for (const price of ['| 15.00 | 12.00 | **9.00** |', '| 13.00 | 10.00 | 7.50 |', '| 10.00 | 8.00 | 6.00 |', '| 30.00 | 24.00 | 18.00 |']) {
  if (!doc.includes(price)) { docFail++; fail(`白标方案文档里找不到价目行：${price}`) }
}
// 代码侧：200 份档必须与文档一致（9 / 7.5 / 6 / 18）
const codePrices = [...landing.matchAll(/t200: ([\d.]+)/g)].map((m) => Number(m[1]))
const expect = [9, 7.5, 6, 18]
if (JSON.stringify(codePrices) !== JSON.stringify(expect)) {
  docFail++; fail(`代码价目与文档不一致：代码 ${JSON.stringify(codePrices)}，应为 ${JSON.stringify(expect)}`)
}
console.log(docFail === 0 ? '✓ 价目：文档 4 行与代码 200 份档（9 / 7.5 / 6 / 18）逐项对齐' : `✗ 价目不同源 ${docFail} 处`)

// ---------- ⑥ sitemap 与入口 ----------
console.log('—— ⑥ sitemap 与入口 ——')
let siteFail = 0
const urls = sitemap().map((e) => e.url)
for (const want of ['/partners', '/tw/partners']) {
  if (!urls.some((u) => u.endsWith(want))) { siteFail++; fail(`sitemap 缺 ${want}`) }
}
const layout = readFileSync(near('src/app/layout.tsx'), 'utf8')
if (!layout.includes('href="/partners"')) { siteFail++; fail('根 layout 页脚没有 /partners 入口') }
console.log(siteFail === 0 ? '✓ sitemap 收录简繁两版；根页脚有入口' : `✗ sitemap/入口失败 ${siteFail} 处`)

// ---------- 牙口自检 ----------
console.log('—— 牙口自检（守护断言本身）——')
let toothFail = 0
if (normalizeApplication({ ...OK, name: '' }).errors.length === 0) { toothFail++; fail('牙口：缺称呼竟然通过') }
if (!normalizeApplication({ ...OK, company: 'x' }).bot) { toothFail++; fail('牙口：蜜罐判据失效') }
if (hantAlternates('/partners')['zh-Hant'] === '/partners') { toothFail++; fail('牙口：hreflang 推导失效') }
if (!sitemap().some((e) => e.url.endsWith('/partners'))) { toothFail++; fail('牙口：sitemap 判据失效') }
console.log(toothFail === 0 ? '✓ 牙口：校验/蜜罐/hreflang/sitemap 判据均能触发' : '✗ 牙口自检失败')

console.log('\n' + (allPass ? 'PARTNER_ACCEPT_PASS' : 'PARTNER_ACCEPT_FAIL'))
process.exit(allPass ? 0 : 1)
