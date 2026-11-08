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

const HOME_BLOCKS = ['ExampleChart', 'TrustBar', 'FatebookSample', 'MoreQueries', 'FeatureBento']

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

// —— ①b 核心区块标记对等（2026-11-09）——
// 上一轮只按「组件名 + 文案表」比对，漏掉了首页功能 Bento：繁体退化成灰框列表、
// 英文只剩 4 张文字卡，内容在、形态不在，组件名比对照样全绿。
// 现在三语首页的核心区块统一挂 data-section 稳定标记，缺一个即报错。
console.log('—— ①b 三语首页核心区块标记对等 ——')
const CORE_SECTIONS = ['hero', 'trust', 'features', 'fatebook', 'more', 'faq']
const SHARED_MARKERS = {
  TrustBar: 'trust',
  FatebookSample: 'fatebook',
  MoreQueries: 'more',
  FeatureBento: 'features',
}

for (const [comp, marker] of Object.entries(SHARED_MARKERS)) {
  assert(
    sections.includes(`export function ${comp}`) && sections.includes(`data-section="${marker}"`),
    `共享区块 ${comp} 挂载 data-section="${marker}"`
  )
}

for (const [name, src] of [
  ['简体', homeZh],
  ['繁体', homeTw],
  ['英文', homeEn],
]) {
  const got = new Set([...src.matchAll(/data-section="([a-z-]+)"/g)].map((m) => m[1]))
  for (const [comp, marker] of Object.entries(SHARED_MARKERS)) {
    if (new RegExp(`<${comp}\\s`).test(src)) got.add(marker)
  }
  const missing = CORE_SECTIONS.filter((s) => !got.has(s))
  assert(
    missing.length === 0,
    `${name}首页核心区块齐全（${CORE_SECTIONS.length} 个）` + (missing.length ? `（缺：${missing.join(', ')}）` : '')
  )
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

console.log('—— ④b 十二生肖三语收敛到共享组件 ——')
// 2026-11-09：繁体生肖索引/详情一直是早期独立实现（两列灰框 + 灰标签），
// 简体与英文则各自写了一套几乎相同的 JSX。现在三语只渲染
// components/shengxiao/ShengXiaoIndex 与 ShengXiaoDetail，页面文件只剩外壳。
const SX_INDEX_PAGES = [
  ['简体', '../src/app/(zh)/shengxiao/page.tsx', 'zh-Hans'],
  ['繁体', '../src/app/tw/shengxiao/page.tsx', 'zh-Hant'],
  ['英文', '../src/app/en/shengxiao/page.tsx', 'en'],
]
const SX_DETAIL_PAGES = [
  ['简体', '../src/app/(zh)/shengxiao/[animal]/page.tsx', 'zh-Hans'],
  ['繁体', '../src/app/tw/shengxiao/[animal]/page.tsx', 'zh-Hant'],
  ['英文', '../src/app/en/shengxiao/[animal]/page.tsx', 'en'],
]
const sxIndexSrc = read('../src/components/shengxiao/ShengXiaoIndex.tsx')
const sxDetailSrc = read('../src/components/shengxiao/ShengXiaoDetail.tsx')

const INDEX_MARKERS = ['zodiac-index', 'zodiac-grid', 'zodiac-year', 'zodiac-explain']
const DETAIL_MARKERS = ['zodiac-detail', 'zodiac-header', 'zodiac-section', 'zodiac-lucky', 'zodiac-pairs', 'zodiac-liunian', 'zodiac-cta']

for (const marker of INDEX_MARKERS) {
  assert(sxIndexSrc.includes(`data-section="${marker}"`), `生肖索引共享组件挂载 data-section="${marker}"`)
}
for (const marker of DETAIL_MARKERS) {
  assert(sxDetailSrc.includes(`data-section="${marker}"`), `生肖详情共享组件挂载 data-section="${marker}"`)
}

for (const [name, path, locale] of SX_INDEX_PAGES) {
  const src = read(path)
  assert(new RegExp(`<ShengXiaoIndex\\s+locale="${locale}"`).test(src), `${name}生肖索引渲染共享组件 ShengXiaoIndex（locale=${locale}）`)
  // 页面文件不得再出现区块级 JSX（h2/卡片墙），否则说明还在维护第二套实现
  assert(!/hw-c-secTitle|hw-zod\b|hw-c-two/.test(src), `${name}生肖索引页没有残留独立区块 JSX`)
}
for (const [name, path, locale] of SX_DETAIL_PAGES) {
  const src = read(path)
  assert(new RegExp(`<ShengXiaoDetail\\s+locale="${locale}"`).test(src), `${name}生肖详情渲染共享组件 ShengXiaoDetail（locale=${locale}）`)
  assert(!/hw-c-secTitle|hw-c-box/.test(src), `${name}生肖详情页没有残留独立区块 JSX`)
}

// 关键样式令牌：共享组件只允许 hw- 令牌与 Tailwind 语义色，不得出现硬编码色值，
// 否则三语会再次出现「同一模块两套观感」。
for (const [label, src] of [['索引', sxIndexSrc], ['详情', sxDetailSrc]]) {
  assert(!/#[0-9a-fA-F]{3,6}\b/.test(src), `生肖${label}共享组件不含硬编码色值（只用 hw- 令牌）`)
  assert(/hw-zx/.test(src) && /hw-c-pg/.test(src), `生肖${label}共享组件沿用 hw-c-pg / hw-zx 视觉令牌`)
}

console.log('—— ④c 每日日签：三语同构 + 五行配色只进卡片 ——')
// 2026-11-09：/en/daily 此前是 404（简繁已有），补齐时不允许复制英文专用页；
// 同时新增「按当日日柱天干给卡片内层上五行色」——页面底色必须仍是全站灰底。
const DAILY_PAGES = [
  ['简体', '../src/app/(zh)/daily/page.tsx', 'zh-Hans'],
  ['繁体', '../src/app/tw/daily/page.tsx', 'zh-Hant'],
  ['英文', '../src/app/en/daily/page.tsx', 'en'],
]
const dailyView = read('../src/components/daily/DailyView.tsx')
const dailyElementSrc = read('../src/lib/dailyElement.ts')
const paletteSrc = read('../src/lib/visual-tokens.ts')
const dailyCss = read('../src/app/globals.css')

for (const [name, path, locale] of DAILY_PAGES) {
  const src = read(path)
  assert(new RegExp(`<DailyView\\s+locale="${locale}"`).test(src), `${name}日签渲染共享组件 DailyView（locale=${locale}）`)
  assert(!/hw-d-card|hw-d-quote|hw-d-el/.test(src), `${name}日签页没有残留卡片 JSX（避免第二套实现）`)
}
for (const marker of ['daily', 'daily-hero', 'daily-card', 'daily-zone', 'daily-cta']) {
  assert(dailyView.includes(`data-section="${marker}"`), `日签共享组件挂载 data-section="${marker}"`)
}

// 五行底色只能挂在卡片上：全站页面级选择器不得引用 --d-tint
for (const sel of ['html', 'body', '.hw-page']) {
  const rule = dailyCss.match(new RegExp(`(^|\\n)\\s*${sel.replace('.', '\\.')}\\s*\\{[^}]*\\}`, 'g')) || []
  assert(!rule.some((r) => r.includes('--d-tint')), `${sel} 不参与日签五行底色（整页仍是 --hw-bg）`)
}
assert(/\.hw-d-card--el\s*\{[^}]*background:\s*var\(--d-tint/.test(dailyCss), '卡片内层用 --d-tint 作背景（只此一层）')
assert((dailyView.match(/'--d-tint':/g) || []).length === 1, '日签五行 tint 只在日签卡上设置了一次')
assert(!/style=\{\{[^}]*(background|backgroundColor)/.test(dailyView), '日签共享组件没有页面级内联背景')

// 五行 → 色令牌：五个键齐全，bar 必须与 :root 的 --hw-<el> 同值（复用同一套色板）
const PALETTE_RE = /(wood|fire|earth|metal|water):\s*\{\s*bar:\s*'(#[0-9a-fA-F]{6})'[^}]*tint:\s*'(#[0-9a-fA-F]{6})'[^}]*tintDark:\s*'(#[0-9a-fA-F]{6})'/g
const palette = {}
for (const m of paletteSrc.matchAll(PALETTE_RE)) palette[m[1]] = { bar: m[2].toLowerCase(), tint: m[3], tintDark: m[4] }
assert(Object.keys(palette).length === 5, '五行色板五键齐全（wood/fire/earth/metal/water）')
for (const el of ['wood', 'fire', 'earth', 'metal', 'water']) {
  const token = (dailyCss.match(new RegExp(`--hw-${el}:\\s*(#[0-9a-fA-F]{3,6})`)) || [])[1]
  assert(!!token && token.toLowerCase().startsWith(palette[el]?.bar.slice(0, 4)), `${el} 色带复用 --hw-${el} 令牌（不另造色）`)
}

// 天干 → 五行：十个天干全部覆盖，并且落在五个色键上（复用 analysis.GAN_WUXING）
const ganMap = [...dailyElementSrc.matchAll(/^\s*([甲乙丙丁戊己庚辛壬癸]):\s*'(\w+)'/gm)]
assert(ganMap.length === 0, '天干映射不在这里重写（统一取自 analysis.GAN_WUXING）')
assert(/import\s*\{\s*GAN_WUXING\s*\}\s*from\s*'\.\/analysis'/.test(dailyElementSrc), '天干→五行复用排盘同一套 GAN_WUXING')
assert(/from '\.\/visual-tokens'/.test(dailyElementSrc), '五行色板收口在 visual-tokens.ts（不散落在页面里）')

// 英文文案层：60 甲子齐全、每条三句、零 CJK（英文页不得回退中文）
const signsEn = read('../src/data/daily-signs-en.ts')
const keys = [...signsEn.matchAll(/^\s*([\u4e00-\u9fa5]{2}):\s*\[/gm)].map((m) => m[1])
assert(keys.length === 60, `英文日签 60 甲子齐全（当前 ${keys.length}）`)
const trios = [...signsEn.matchAll(/^\s*[\u4e00-\u9fa5]{2}:\s*\[([\s\S]*?)\n\s*\],/gm)]
assert(trios.length === 60 && trios.every((t) => (t[1].match(/'/g) || []).length === 6), '英文日签每条正好三句')
const enStrings = [...signsEn.matchAll(/'([^']*)'/g)].map((m) => m[1])
assert(enStrings.length > 0 && enStrings.every((s) => !/[\u4e00-\u9fa5]/.test(s)), '英文日签文案零 CJK（英文页不得回退中文）')

console.log('—— ⑤ 牙口自检（内存篡改，不落盘）——')
{
  const broken = homeTw.replace('<TrustBar locale="zh-Hant" />', '')
  const got = homeBlocks(broken)
  assert(got.TrustBar === null, '删掉繁体首页信任条后，区块检测必须翻红（TrustBar=null）')
  const brokenEn = homeEn.replace(/<MoreQueries locale="en" \/>/, '')
  assert(homeBlocks(brokenEn).MoreQueries === null, '删掉英文首页更多查询后，区块检测必须翻红（MoreQueries=null）')
  const brokenBento = homeEn.replace(/<FeatureBento locale="en" \/>/, '')
  assert(!/<FeatureBento\s/.test(brokenBento) && homeBlocks(brokenBento).FeatureBento === null, '删掉英文首页功能 Bento 后，区块检测必须翻红（FeatureBento=null）')
  // 生肖牙口：把繁体详情页换回独立 JSX（不再引用共享组件）必须翻红
  const brokenSx = read('../src/app/tw/shengxiao/[animal]/page.tsx').replace(/<ShengXiaoDetail\s+locale="zh-Hant" sx=\{sx\} \/>/, '<div className="hw-c-box" />')
  assert(!/<ShengXiaoDetail\s/.test(brokenSx), '删掉繁体生肖详情的共享组件后，收敛检测必须翻红')
  // 日签牙口：英文页若退回独立实现（不再引用 DailyView）必须翻红
  const brokenDaily = read('../src/app/en/daily/page.tsx').replace(/<DailyView\s+locale="en"[^/]*\/>/, '<div className="hw-d-card" />')
  assert(!/<DailyView\s/.test(brokenDaily), '英文日签退回独立实现后，三语同构检测必须翻红')
}

if (allFail) {
  console.log(`CONTENT_PARITY_FAIL（${allFail} 项）`)
  process.exitCode = 1
} else {
  console.log('CONTENT_PARITY_PASS')
}
