// 定价页 SKU 定向验收（2026-11-09）
//
// 起因：英文紫微免费报告的「Unlock the full English report」裸跳 /en/pricing，
//       落地中心是 Fate Book，用户想买紫微却容易买错。
//
// 断的是什么：
//   ① FOCUS_SKUS 与 pricing.ts 的消费者 SKU 完全一致（新增 SKU 不接定位会红）
//   ② isFocusSku 严格：合法 9 个通过；空串/拼写/大小写/空格/伙伴包全部拒绝
//   ③ pricingFocusHref 三语形状：/pricing、/tw/pricing、/en/pricing 且 #sku-<id>
//   ④ 三个定价页：都挂了 PricingFocus、9 个 SKU 都有锚点、命书仍是唯一主推（hw-c-planHot）
//   ⑤ 免费态付费墙：任何指向 /pricing 的字面 href 必须带 ?sku=；英文四模块必须用 pricingFocusHref
//   ⑥ 会员类入口（会员中心 / 开通会员 / 命书页）不得再裸跳 /pricing，必须带 member_monthly / ask_pack
//   ⑦ 非法/缺失 sku：PricingFocus 安静回退（return），不 throw
//
// ★ 全程离线：只读源码 + 纯函数。
import { readFileSync } from 'node:fs'
import { SKUS, ONE_TIME_SKUS, MEMBER_SKUS } from '../src/lib/pricing'
import {
  FOCUS_SKUS,
  isFocusSku,
  skuAnchorId,
  pricingFocusHref,
  skuFocusName,
  skuFocusPrice,
} from '../src/lib/pricingFocus'

let allPass = true
const failures = []
function fail(m) { allPass = false; failures.push(m); console.log('  ✗ ' + m) }
function ok(m) { console.log('  · ' + m) }
function assert(c, msg, failMsg) { if (c) ok(msg); else fail(failMsg ?? msg) }
const read = (p) => readFileSync(p, 'utf8')

const PAGES = [
  ['zh', 'src/app/(zh)/pricing/page.tsx', 'zh-Hans', 'card.buySku'],
  ['tw', 'src/app/tw/pricing/page.tsx', 'zh-Hant', 'card.buySku'],
  ['en', 'src/app/en/pricing/page.tsx', 'en', "'fatebook'"],
]

console.log('—— ① FOCUS_SKUS 与 pricing.ts 同步 ——')
{
  const derived = [...ONE_TIME_SKUS.map((s) => s.id), ...MEMBER_SKUS.map((s) => s.id), 'ask_pack']
  const a = [...FOCUS_SKUS].sort()
  const b = derived.sort()
  assert(JSON.stringify(a) === JSON.stringify(b),
    `FOCUS_SKUS 覆盖 ${FOCUS_SKUS.length} 个消费者 SKU，与 ONE_TIME ∪ MEMBER ∪ ask_pack 一致`,
    `FOCUS_SKUS 与定价 SKU 不同步：焦点=${a.join(',')} 定价=${b.join(',')}`)
  assert(new Set(FOCUS_SKUS).size === FOCUS_SKUS.length, 'FOCUS_SKUS 无重复项')
}

console.log('—— ② isFocusSku 严格校验 ——')
{
  const bad = ['', 'nope', 'ziwei_deep ', ' ZIWEI_DEEP', 'ZIWEI_DEEP', 'partner_credits_10', 'fatebook#x']
  let pass = 0
  for (const sku of FOCUS_SKUS) if (isFocusSku(sku)) pass++
  assert(pass === FOCUS_SKUS.length, `合法 ${FOCUS_SKUS.length} 个 sku 全部识别`)
  const rejected = bad.filter((v) => !isFocusSku(v))
  assert(rejected.length === bad.length,
    `非法值全部拒绝（${bad.length} 个：空串/拼写/大小写/空格/伙伴包/带锚点）`,
    `非法值被误收：${bad.filter((v) => isFocusSku(v)).join(',')}`)
}

console.log('—— ③ pricingFocusHref 三语形状 ——')
{
  const cases = [
    ['zh-Hans', '/pricing?sku=ziwei_deep#sku-ziwei_deep'],
    ['zh-Hant', '/tw/pricing?sku=ziwei_deep#sku-ziwei_deep'],
    ['en', '/en/pricing?sku=ziwei_deep#sku-ziwei_deep'],
  ]
  for (const [loc, want] of cases) {
    const got = pricingFocusHref(loc, 'ziwei_deep')
    assert(got === want, `${loc} → ${got}`, `${loc} 期望 ${want}，实际 ${got}`)
  }
  assert(skuAnchorId('member_monthly') === 'sku-member_monthly', '锚点 id = sku-<id>')
  assert(/\$/.test(skuFocusPrice('ziwei_deep')), '确认语价格取 USD 单一事实源')
  assert(skuFocusName('ziwei_deep', 'en') !== SKUS.ziwei_deep.name, '英文确认语用英文商品名')
}

console.log('—— ④ 三个定价页：PricingFocus + 9 个锚点 + 命书主推 ——')
{
  const coverage = [
    'fatebook',
    ...ONE_TIME_SKUS.map((s) => s.id).filter((id) => id !== 'fatebook'),
    ...MEMBER_SKUS.map((s) => s.id),
    'ask_pack',
  ].sort()
  assert(JSON.stringify(coverage) === JSON.stringify([...FOCUS_SKUS].sort()),
    '锚点覆盖清单 = FOCUS_SKUS（命书 + 单报告 + 会员两档 + 追问包）')

  for (const [loc, file, locale, fateAnchor] of PAGES) {
    const src = read(file)
    assert(src.includes(`<PricingFocus locale="${locale}" />`),
      `${loc}：接入 PricingFocus（locale=${locale}）`,
      `${loc}：缺 <PricingFocus locale="${locale}" />`)
    assert(src.includes(`skuAnchorId(${fateAnchor})`),
      `${loc}：命书卡有定位锚点`,
      `${loc}：命书卡缺 skuAnchorId(${fateAnchor})`)
    const idCount = (src.match(/id=\{skuAnchorId\(s\.id\)\}/g) ?? []).length
    assert(idCount >= 2,
      `${loc}：单报告与会员两档各有锚点（id={skuAnchorId(s.id)} × ${idCount}）`,
      `${loc}：skuAnchorId(s.id) 只出现 ${idCount} 次（应 ≥2：单报告 + 会员档）`)
    assert(src.includes("id={skuAnchorId('ask_pack')}"),
      `${loc}：追问包有定位锚点`,
      `${loc}：追问包缺 skuAnchorId('ask_pack')`)
    assert(src.includes('hw-c-planHot'),
      `${loc}：命书仍是主推卡（hw-c-planHot 未降级）`,
      `${loc}：命书主推样式 hw-c-planHot 丢失`)
  }
}

console.log('—— ⑤ 免费态付费墙：指向定价页必须带 sku ——')
{
  const PAYWALL_FILES = [
    'src/components/reports/PreviewLock.tsx',
    'src/components/reports/ZiweiResultView.tsx',
    'src/components/reports/LiunianResultView.tsx',
    'src/components/reports/HemunResultView.tsx',
    'src/components/reports/GeoResultView.tsx',
    'src/components/en/EnRuleTables.tsx',
    'src/app/en/geo/Client.tsx',
    'src/app/en/liunian/Client.tsx',
    'src/app/en/hemun/Client.tsx',
    'src/app/en/ziwei/Client.tsx',
  ]
  let bare = 0
  for (const f of PAYWALL_FILES) {
    const src = read(f)
    const hrefs = src.match(/href="[^"]*\/pricing[^"]*"/g) ?? []
    for (const h of hrefs) if (!h.includes('sku=')) { bare++; fail(`${f}：裸跳定价页 ${h}`) }
  }
  assert(bare === 0, '付费墙内没有裸跳 /pricing 的字面链接')

  assert(read('src/components/reports/PreviewLock.tsx').includes('sku={sku.id}'),
    'UnlockCta 仍把 skus 传给 CheckoutButton（简繁一键直达正确 SKU）',
    'UnlockCta 的 sku={sku.id} 丢失')

  const mods = [
    ['src/app/en/geo/Client.tsx', "'geo'"],
    ['src/app/en/liunian/Client.tsx', "'annual_report'"],
    ['src/app/en/hemun/Client.tsx', "'hemun'"],
  ]
  for (const [f, sku] of mods) {
    const src = read(f)
    assert(src.includes(`pricingFocusHref('en', ${sku})`),
      `${f}：解锁链接带 ${sku}`,
      `${f}：解锁链接未带 ${sku}`)
  }
  const ziwei = read('src/components/reports/ZiweiResultView.tsx')
  assert(ziwei.includes('locked?.skus.find(isFocusSku)') && ziwei.includes('pricingFocusHref(locale, lockedFocusSku)'),
    'ZiweiResultView：英文解锁链接带本模块 sku（紫微修好的关键）',
    'ZiweiResultView：英文解锁链接仍未带 sku')
}

console.log('—— ⑥ 会员类入口带 sku，不再裸跳 ——')
{
  const CASES = [
    ['src/components/member/MemberCenter.tsx', ["L('/pricing', 'member_monthly')", "L('/pricing', 'ask_pack')"]],
    ['src/app/en/member/page.tsx', ["pricingFocusHref('en', 'member_monthly')", "pricingFocusHref('en', 'ask_pack')"]],
    ['src/app/(zh)/charts/page.tsx', ["pricingFocusHref('zh-Hans', 'member_monthly')"]],
    ['src/app/tw/charts/Client.tsx', ["pricingFocusHref('zh-Hant', 'member_monthly')"]],
    ['src/app/en/charts/Client.tsx', ["pricingFocusHref('en', 'member_monthly')"]],
    ['src/app/(zh)/mingshu/MingShuContent.tsx', ["pricingFocusHref('zh-Hans', 'member_monthly')", "pricingFocusHref('zh-Hans', 'fatebook')"]],
    ['src/app/tw/mingshu/MingShuContent.tsx', ["pricingFocusHref('zh-Hant', 'member_monthly')", "pricingFocusHref('zh-Hant', 'fatebook')"]],
  ]
  for (const [f, needles] of CASES) {
    const src = read(f)
    for (const n of needles) assert(src.includes(n), `${f}：带 ${n}`)
    assert(!/href="\/(tw\/|en\/)?pricing"/.test(src),
      `${f}：无裸跳定价页链接`,
      `${f}：仍有裸跳定价页链接`)
  }
}

console.log('—— ⑦ 非法/缺失 sku 安静回退 ——')
{
  const src = read('src/components/PricingFocus.tsx')
  assert(src.includes('if (!isFocusSku(raw)) return'),
    '非法/缺失 sku 直接 return（默认版面，不报错）',
    'PricingFocus 缺少 isFocusSku 守卫')
  assert(!/\bthrow\b/.test(src), 'PricingFocus 不抛错')
  assert(src.includes('window.location.search') && !src.includes('useSearchParams'),
    '用 location.search 读取，避开静态页 useSearchParams bailout',
    'PricingFocus 读取方式不符合静态导出要求')
  assert(src.includes('setTimeout(mark, 500)') && src.includes('requestAnimationFrame(mark)'),
    '高亮在 rAF + 500ms 兜底打标（幂等）',
    'PricingFocus 缺少高亮兜底打标')
  assert(!src.includes('scrollTo('),
    '滚动交给原生 #sku- 锚点，不用 JS scrollTo 抢滚动（水合期会被重置到页底）',
    'PricingFocus 仍用 JS scrollTo，会与 Next 水合抢滚动')
  for (const bad of ['', 'bogus', 'partner_credits_10']) {
    assert(!isFocusSku(bad), `回退判据覆盖：${JSON.stringify(bad)} 不定位`)
  }
}

console.log('')
if (allPass) console.log('PRICING_FOCUS_PASS')
else {
  console.log(`PRICING_FOCUS_FAIL（${failures.length} 处）`)
  for (const f of failures) console.log('  - ' + f)
}
process.exitCode = allPass ? 0 : 1
