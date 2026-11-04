// 内容对等断言（2026-11-04 统一第二批）
//
// 第二批的目标是「页面区块信息对等」：以简体为基准，繁体/英文缺的区块补回来。
// 本脚本守护三件事：
//   ① 首页四个共享区块（示例盘/信任条/命书样例/更多查询）在三棵树都渲染，且 locale 正确；
//   ② 英文排盘结果页的四个补齐区块（十卷卷名条、规则版说明、古籍相似命例、神煞口径）仍在；
//   ③ 会员中心 / 支付成功页在简繁两树复用同一实现（MemberCenter / CheckoutSuccess），
//      且关键的取消自动续费、伙伴额度、轮询多态没有在抽组件时被丢掉。
//
// 牙口（文本不变、行为变坏；开发期手工注入，实测翻红后已复原）：
//   把 src/app/tw/page.tsx 的 `<TrustBar locale="zh-Hant" />` 删掉 →
//   ②「繁体首页信任条」翻红（本脚本末尾用内存篡改自动验证该牙口确实会报错）。
import { readFileSync } from 'node:fs'

let allFail = 0
const ok = (m) => console.log('  ✓ ' + m)
const fail = (m) => { allFail++; console.log('  ✗ ' + m) }
const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')
const assert = (cond, m) => (cond ? ok(m) : fail(m))

const HOME_BLOCKS = ['ExampleChart', 'TrustBar', 'FatebookSample', 'MoreQueries']

// 返回 { 组件名: locale | null }；null 表示该树缺这个区块（正是要抓的漂移）。
function homeBlocks(src) {
  const out = {}
  for (const b of HOME_BLOCKS) {
    const m = src.match(new RegExp(`<${b}\\s+locale="([^"]+)"`))
    out[b] = m ? m[1] : null
  }
  return out
}

console.log('—— ① 首页区块三语对齐 ——')
const homeZh = read('../src/app/(zh)/HomeClient.tsx')
const homeTw = read('../src/app/tw/page.tsx')
const homeEn = read('../src/app/en/page.tsx')
const sections = read('../src/components/home/HomeSections.tsx')

for (const [name, src, locale] of [
  ['简体', homeZh, 'zh-Hans'],
  ['繁体', homeTw, 'zh-Hant'],
  ['英文', homeEn, 'en'],
]) {
  const got = homeBlocks(src)
  const missing = HOME_BLOCKS.filter((b) => got[b] !== locale)
  assert(missing.length === 0, `${name}首页渲染四个共享区块且 locale=${locale}` + (missing.length ? `（缺/错：${missing.join(', ')}）` : ''))
}

// 共享组件内部的文案表必须是三语完整：tsc 的 Record<SiteLang, …> 已强制三键，
// 这里再守住「没有被悄悄降级成单一语言」。
assert((sections.match(/Record<SiteLang/g) || []).length >= 4, 'HomeSections 的文案表以 Record<SiteLang> 声明（tsc 强制三语齐全）')
assert(/['"]zh-Hant['"]\s*:/.test(sections) && /\ben\s*:/.test(sections), 'HomeSections 同时含繁体与英文文案键')
assert(!/href="\/pricing"/.test(sections) && /pathForLang\('\/pricing', locale\)/.test(sections), '命书样例 CTA 走 pathForLang（不会把 /tw、/en 用户送出语言树）')
assert(/pathForLang\(m\.path, locale\)/.test(sections), '更多查询链接走 pathForLang')

// 简体原有区块不得被删（信息只能多不能少）
for (const marker of ['hw-pillars', 'hw-trust', 'hw-sample', 'hw-more']) {
  assert(homeZh.includes(marker) || sections.includes(marker), `简体原有区块标记仍存在：${marker}`)
}

console.log('—— ② 英文排盘结果页补齐区块 ——')
const enChart = read('../src/app/en/chart/Client.tsx')
assert(enChart.includes('The ten volumes of the Fate Book') && enChart.includes('hw-c-vols'), '英文结果页有「命书十卷」卷名条')
assert(enChart.includes('rule-engine summary') && enChart.includes('hw-pv-em'), '英文结果页有「规则版 vs AI 精批」解释段')
assert(enChart.includes('Similar cases in the classics') && /paid\.similarCases/.test(enChart), '英文结果页有「古籍相似命例」区块')
assert(enChart.includes('Peach Blossom, Travelling Horse'), '英文结果页有神煞取法说明（三合组/年支日支口径）')
assert(/Schools differ|reference point|folk tradition/i.test(enChart), '神煞段落含流派差异与「仅供参考」口径')

console.log('—— ③ 会员中心：简繁同源 ——')
const memberZhPage = read('../src/app/(zh)/member/page.tsx')
const memberTwPage = read('../src/app/tw/member/page.tsx')
const member = read('../src/components/member/MemberCenter.tsx')
assert(memberZhPage.includes('MemberCenter') && memberZhPage.includes('zh-Hans'), '简体会员中心复用 MemberCenter（zh-Hans）')
assert(memberTwPage.includes('MemberCenter') && memberTwPage.includes('zh-Hant'), '繁体会员中心复用 MemberCenter（zh-Hant）')
assert(member.includes('BenefitsGrid') && member.includes('SUBSCRIPTION_GRANTS'), '会员中心有权益宫格（由 SUBSCRIPTION_GRANTS 派生）')
assert(member.includes('UsageRow') && member.includes('/api/ask'), '会员中心有追问额度（读 /api/ask）')
assert(member.includes('/api/membership/cancel') && /取消自动续费/.test(member), '会员中心有站内「取消自动续费」出口')
assert(member.includes('WAFFO_PORTAL_URL'), '会员中心保留支付门户兜底链接')
assert(/push|PushOptIn/.test(member), '会员中心仍挂每日提醒开关')

console.log('—— ④ 支付成功页：简繁同源 ——')
const successZh = read('../src/app/(zh)/checkout/success/page.tsx')
const successTw = read('../src/app/tw/checkout/success/page.tsx')
const success = read('../src/components/checkout/CheckoutSuccess.tsx')
assert(successZh.includes('CheckoutSuccess') && successZh.includes('zh-Hans'), '简体支付成功页复用 CheckoutSuccess（zh-Hans）')
assert(successTw.includes('CheckoutSuccess') && successTw.includes('zh-Hant'), '繁体支付成功页复用 CheckoutSuccess（zh-Hant）')
assert(success.includes('POLL_MAX_TIMES'), '支付成功页保留权益轮询多态（POLL_MAX_TIMES）')
assert(success.includes('partner_credits'), '支付成功页保留伙伴额度分流')
assert(success.includes('/api/membership?token='), '支付成功页保留会员态查询（/api/membership）')
assert(success.includes('sessionStorage') && success.includes('/api/verify-payment'), '支付成功页保留 ?ref= 主 + sessionStorage 辅 + verify-payment 兜底')
assert(success.includes("locale === 'zh-Hant'") && success.includes('載入中'), '繁体支付成功页的加载态为繁体（不落简体文案）')

console.log('—— ⑤ 牙口自检（内存篡改，不落盘）——')
{
  const broken = homeTw.replace('<TrustBar locale="zh-Hant" />', '')
  const got = homeBlocks(broken)
  assert(got.TrustBar === null, '删掉繁体首页信任条后，区块检测必须翻红（TrustBar=null）')
  const brokenEn = homeEn.replace(/<MoreQueries locale="en" \/>/, '')
  assert(homeBlocks(brokenEn).MoreQueries === null, '删掉英文首页更多查询后，区块检测必须翻红（MoreQueries=null）')
}

if (allFail) {
  console.log(`CONTENT_PARITY_FAIL（${allFail} 项）`)
  process.exitCode = 1
} else {
  console.log('CONTENT_PARITY_PASS')
}
