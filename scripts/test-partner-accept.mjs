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

// ---------- ⑦ 伙伴包 SKU 与准入闸门（2026-10-22）----------
console.log('—— ⑦ 伙伴包 SKU / 价格 / 闸门 ——')
let skuFail = 0
const {
  SKUS, ONE_TIME_SKUS, PARTNER_PACK_UNITS, PARTNER_PACK_SKUS, PARTNER_PACK_PURCHASABLE, isPartnerPack,
} = await import('../src/lib/pricing.ts')
const { WAFFO_PRODUCTS, waffoProductId } = await import('../src/lib/waffo-products.ts')
{
  // 三个包都在 SKUS 里，价格与份数严格对齐（改价忘了改份数会被测出来）
  const expect = { partner_credits_10: [150, 10], partner_credits_50: [600, 50], partner_credits_200: [1800, 200] }
  for (const [id, [price, units]] of Object.entries(expect)) {
    if (!SKUS[id]) { skuFail++; fail(`SKUS 缺 ${id}`); continue }
    if (SKUS[id].priceUSD !== price) { skuFail++; fail(`${id} 价格 ${SKUS[id].priceUSD}，应为 ${price}`) }
    if (PARTNER_PACK_UNITS[id] !== units) { skuFail++; fail(`${id} 份数 ${PARTNER_PACK_UNITS[id]}，应为 ${units}`) }
    // 每份单价必须落在白标方案的档位价上
    const perUnit = price / units
    const tier = units === 10 ? 15 : units === 50 ? 12 : 9
    if (perUnit !== tier) { skuFail++; fail(`${id} 每份 $${perUnit}，应为档位价 $${tier}`) }
  }
  // grants 必须为空：否则 isReportPurchase 会把它当报告购买，白送报告 + 追问
  for (const s of PARTNER_PACK_SKUS) {
    if ((s.grants ?? []).length !== 0) { skuFail++; fail(`${s.id} 的 grants 必须为空（当前 ${JSON.stringify(s.grants)}）`) }
  }
  // 不得出现在消费者定价页的列表里
  if (ONE_TIME_SKUS.some((s) => isPartnerPack(s.id))) { skuFail++; fail('伙伴包混进了 ONE_TIME_SKUS（会出现在消费者定价页）') }
  // 三个 productId 都已登记且形态正确
  for (const id of Object.keys(expect)) {
    const pid = waffoProductId(id)
    if (!pid || !pid.startsWith('PROD_')) { skuFail++; fail(`${id} 的 productId 未登记或形态不对：${pid}`) }
  }
  // 闸门：翻闸后必须仍保留守卫接线（将来若关闸，checkout 仍能挡住）
  const checkoutSrc = readFileSync(near('src/app/api/checkout/route.ts'), 'utf8')
  if (!checkoutSrc.includes('isPartnerPack(sku)') || !checkoutSrc.includes('PARTNER_PACK_PURCHASABLE')) {
    skuFail++; fail('checkout 未接入伙伴包闸门（钱收了却不会入账）')
  }
  // 2026-10-22：闸门值取决于【账本表是否已在生产库建好】，故不钉死 true/false，
  // 而是钉死不变式：一旦开闸，账本与 webhook 接线必须都在 —— 否则就是"收钱不发货"。
  if (typeof PARTNER_PACK_PURCHASABLE !== 'boolean') {
    skuFail++; fail('PARTNER_PACK_PURCHASABLE 必须是布尔值')
  }
  if (PARTNER_PACK_PURCHASABLE) {
    const creditsLib = readFileSync(near('src/lib/partnerCredits.ts'), 'utf8')
    const hookSrc = readFileSync(near('src/app/api/webhooks/waffo/route.ts'), 'utf8')
    if (!creditsLib.includes('creditPartnerPurchase')) { skuFail++; fail('已开闸但账本库缺入账函数') }
    if (!hookSrc.includes('creditPartnerPurchase')) { skuFail++; fail('已开闸但 webhook 未接入入账') }
  }
  if (Object.keys(WAFFO_PRODUCTS).filter((k) => isPartnerPack(k)).length !== 3) {
    skuFail++; fail('WAFFO_PRODUCTS 里伙伴包应恰为 3 条')
  }
}
console.log(skuFail === 0
  ? '✓ 伙伴包：3 个 SKU 价格/份数/单价对齐档位价；grants 为空；不上定价页；productId 已登记；闸门已开'
  : `✗ 伙伴包失败 ${skuFail} 处`)

// ---------- ⑧ 额度账本（纯函数 + 接线）----------
console.log('—— ⑧ 额度账本 ——')
let creditFail = 0
const {
  unitsForSku, balanceOf, amountMatchesSku, getPartnerBalance, creditPartnerPurchase, spendPartnerUnits,
} = await import('../src/lib/partnerCredits.ts')
{
  // 份数映射
  if (unitsForSku('partner_credits_10') !== 10) { creditFail++; fail('10 份档映射不对') }
  if (unitsForSku('partner_credits_50') !== 50) { creditFail++; fail('50 份档映射不对') }
  if (unitsForSku('partner_credits_200') !== 200) { creditFail++; fail('200 份档映射不对') }
  if (unitsForSku('fatebook') !== null) { creditFail++; fail('非伙伴包不应返回份数') }
  // 余额求和（含负数与脏数据）
  if (balanceOf([]) !== 0) { creditFail++; fail('空账本余额应为 0') }
  if (balanceOf([{ delta: 10 }, { delta: -3 }]) !== 7) { creditFail++; fail('余额求和不对') }
  if (balanceOf([{ delta: NaN }]) !== 0) { creditFail++; fail('脏数据不应污染余额') }
  // 金额比对：这是抓「收单方标错价」的唯一地方
  if (!amountMatchesSku('partner_credits_10', 150)) { creditFail++; fail('$150 应匹配 10 份档') }
  if (!amountMatchesSku('partner_credits_10', 150.005)) { creditFail++; fail('1 分以内容差应通过') }
  if (amountMatchesSku('partner_credits_10', 15)) { creditFail++; fail('★ $15（少一个零）必须判为不匹配') }
  if (amountMatchesSku('partner_credits_200', 180)) { creditFail++; fail('★ $180 必须判为不匹配') }
  // 函数存在性（避免只有骨架没实现）
  for (const fn of [getPartnerBalance, creditPartnerPurchase, spendPartnerUnits]) {
    if (typeof fn !== 'function') { creditFail++; fail('partnerCredits 导出缺失') }
  }
  // webhook 必须接线，且幂等键用支付单号
  const hook = readFileSync(near('src/app/api/webhooks/waffo/route.ts'), 'utf8')
  if (!hook.includes('creditPartnerPurchase')) { creditFail++; fail('webhook 未接入伙伴额度入账') }
  if (!hook.includes('buildPaidPaymentRow')) { creditFail++; fail('webhook 未复用 buildPaidPaymentRow 取 sku/金额') }
  if (!hook.includes('isPartnerPack')) { creditFail++; fail('webhook 未判定伙伴包') }
  // 入账失败必须 error 级日志（这是「钱收了没额度」的唯一信号）
  if (!/★伙伴额度入账失败[\s\S]{0,200}console\.error|console\.error\([\s\S]{0,80}★伙伴额度入账失败/.test(hook)) {
    creditFail++; fail('入账失败未用 console.error 告警（需要人工补账，不能只 warn）')
  }
  // ★ 退款冲抵（2026-10-22）：额度是另一本账，payments 置 refunded 不会自动退额度
  if (!hook.includes('clawbackPartnerUnits')) { creditFail++; fail('webhook 退款分支未接入额度冲抵（退了钱额度还在）') }
  if (!/payment_refunded[\s\S]{0,2500}clawbackPartnerUnits/.test(hook)) {
    creditFail++; fail('冲抵未挂在 payment_refunded 分支内')
  }
  const { clawbackPartnerUnits } = await import('../src/lib/partnerCredits.ts')
  if (typeof clawbackPartnerUnits !== 'function') { creditFail++; fail('partnerCredits 缺 clawbackPartnerUnits') }
  // 退款冲抵必须允许扣成负数并标记欠账（与 spend 的余额校验刻意不同）
  const clawSrc = readFileSync(near('src/lib/partnerCredits.ts'), 'utf8')
  if (!/negative:\s*balance\s*<\s*0/.test(clawSrc)) { creditFail++; fail('退款冲抵未标记欠账（negative 标志）') }
  if (!clawSrc.includes("reason: 'refund'")) { creditFail++; fail("退款冲抵未用 reason='refund'（无法与 consum 区分审计）") }
  // SQL 迁移必须存在幂等索引
  const sql = readFileSync(near('supabase/partner-credits.sql'), 'utf8')
  for (const idx of ['idx_partner_credits_purchase_ref', 'idx_partner_credits_consume_ref', 'idx_partner_credits_refund_ref']) {
    if (!sql.includes(idx)) { creditFail++; fail(`partner-credits.sql 缺幂等索引 ${idx}`) }
  }
  if (!sql.includes('ENABLE ROW LEVEL SECURITY')) { creditFail++; fail('partner-credits.sql 未开 RLS') }
}
console.log(creditFail === 0
  ? '✓ 账本：份数映射/余额求和/金额容差（$15 与 $180 必须不匹配）；webhook 接线 + error 告警；SQL 含两个幂等索引 + RLS'
  : `✗ 账本失败 ${creditFail} 处`)

// ---------- ⑨ 来源披露（2026-10-23 新增）----------
// 判的是什么：报告开头必须声明「由明理引擎生成」，且繁简两版与转换层一致；
// 伙伴不能靠"暗示手写"卖钱 —— 这是 §3-2 的落地断言。
{
  let discFail = 0
  const notePath = near('src/components/reports/ReportOriginNote.tsx')
  const noteSrc = readFileSync(notePath, 'utf8')

  // 组件必须导出两串常量（繁体是预生成，避免客户端引 opencc-js）
  const { REPORT_ORIGIN_HANS, REPORT_ORIGIN_HANT } = await import('../src/components/reports/ReportOriginNote.tsx')
  if (typeof REPORT_ORIGIN_HANS !== 'string' || REPORT_ORIGIN_HANS.length < 20) {
    discFail++; fail('ReportOriginNote 缺简体来源说明常量')
  }
  if (!REPORT_ORIGIN_HANS.includes('引擎') || !REPORT_ORIGIN_HANS.includes('经典')) {
    discFail++; fail('来源说明没写清「引擎生成」与「所引经典」')
  }
  // ★ 繁体常量必须等于 toHant(简体) —— 否则两版会漂移（改文案只改一边就会红）
  const { toHant } = await import('../src/lib/hant.ts')
  if (toHant(REPORT_ORIGIN_HANS) !== REPORT_ORIGIN_HANT) {
    discFail++; fail(`繁体来源说明与 toHant(简体) 不一致：\n    toHant => ${toHant(REPORT_ORIGIN_HANS)}\n    常量   => ${REPORT_ORIGIN_HANT}`)
  }
  // 繁体常量必须真的是繁体（防有人把简体复制过去）
  if (REPORT_ORIGIN_HANT.includes('报告') || REPORT_ORIGIN_HANT.includes('经典') || REPORT_ORIGIN_HANT.includes('解读')) {
    discFail++; fail('繁体来源说明里混入了简体字')
  }

  // 分享页（伙伴交付给客户的那个页面）必须渲染它，且放在标题下方而不是页脚
  const shareSrc = readFileSync(near('src/app/r/[token]/page.tsx'), 'utf8')
  if (!shareSrc.includes('ReportOriginNote')) { discFail++; fail('分享页未渲染来源说明（客户看不到披露）') }
  if (!/<h1 className="hw-c-h1">\{row!\.title\}<\/h1>\s*\{?\/?\*?[\s\S]{0,220}ReportOriginNote/.test(shareSrc)) {
    discFail++; fail('来源说明不在报告标题附近（放在页脚等于没有披露）')
  }
  if (!shareSrc.includes('LOCALE_COOKIE')) { discFail++; fail('分享页未按访客语言切换披露文案') }

  // 落地页必须把「分工」讲明，并给出披露话术（伙伴才推得动）
  const landingSrc = readFileSync(near('src/components/partners/PartnerLanding.tsx'), 'utf8')
  for (const must of ['分工说清楚', '我用工具按你的盘生成的', '不该暗示是手写']) {
    if (!landingSrc.includes(must)) { discFail++; fail(`伙伴落地页缺少「${must}」`) }
  }

  // 协议要点必须把「禁止宣称自研」升级为「披露义务」+ 违约条款兜底
  const doc = readFileSync(near('docs/推广-命理师白标方案.md'), 'utf8')
  for (const must of ['披露义务', '不得以任何方式暗示报告为本人手写', 'C-1. 给伙伴的披露话术', '问题不在"用工具"，在"用工具还宣称手工"']) {
    if (!doc.includes(must)) { discFail++; fail(`白标方案缺「${must}」`) }
  }
  if (!/10\. 违约[\s\S]{0,120}暗示手写/.test(doc)) { discFail++; fail('违约条款未覆盖「暗示手写」') }

  console.log(discFail === 0
    ? '✓ 披露：报告开头声明引擎生成；繁简两版与 toHant 一致；落地页给话术；协议升级为义务 + 违约兜底'
    : `✗ 披露失败 ${discFail} 处`)
}

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
