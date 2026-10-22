// 分享令牌（命理师白标 v1）验收断言
//
// 断的是什么：
//   ① 令牌形状：43 字符 base64url、随机、不重复
//   ② 有效性判定：吊销 > 过期 > 令牌存在；三种失效原因文案分开
//   ③ 过期时间：默认 90 天，可指定
//   ④ 路径/URL：单一事实源，绝对地址可用于 LINE/微信
//   ⑤ 分享页安全：noindex、force-dynamic、走 service_role、只取渲染必需字段
//   ⑥ 打印：@media print 存在且收在 .hw-print 内 · 打印条是客户端组件
//   ⑦ 运维脚本：建链接/吊销/查看三种模式齐全

import { readFileSync } from 'node:fs'

let allPass = true
const fail = (msg) => { allPass = false; console.log('  ✗ ' + msg) }
const near = (p) => new URL(`../${p}`, import.meta.url)

const {
  generateShareToken, isShareTokenShape, shareExpiryFrom, isShareActive,
  shareInactiveReason, sharePath, shareUrl, SHARE_TTL_DAYS, SHARE_TOKEN_BYTES,
} = await import('../src/lib/reportShare.ts')

// ---------- ① 令牌形状 ----------
console.log('—— ① 令牌形状与随机性 ——')
let tokenFail = 0
const t1 = generateShareToken()
if (!isShareTokenShape(t1)) { tokenFail++; fail(`生成的令牌形状不合法：${t1}`) }
if (t1.length !== 43) { tokenFail++; fail(`令牌应为 43 字符，实际 ${t1.length}`) }
if (SHARE_TOKEN_BYTES !== 32) { tokenFail++; fail('令牌字节数应为 32') }
const many = new Set(Array.from({ length: 50 }, () => generateShareToken()))
if (many.size !== 50) { tokenFail++; fail('50 次生成出现了重复令牌（随机源有问题）') }
for (const bad of ['', 'short', t1.slice(0, 42), t1 + 'x', '中文中文', null, undefined, 123, {}]) {
  if (isShareTokenShape(bad)) { tokenFail++; fail(`非法令牌被放行：${JSON.stringify(bad)}`) }
}
console.log(tokenFail === 0 ? '✓ 令牌：43 字符 base64url、50 次无重复、9 类非法输入全部拒绝' : `✗ 令牌失败 ${tokenFail} 处`)

// ---------- ② 有效性判定 ----------
console.log('—— ② 有效性判定（吊销 > 过期 > 存在）——')
let activeFail = 0
const NOW = new Date('2026-10-22T12:00:00Z')
const future = new Date(NOW.getTime() + 86400_000).toISOString()
const past = new Date(NOW.getTime() - 86400_000).toISOString()
const activeToken = generateShareToken()

const cases = [
  ['有效（未过期未吊销）', { share_token: activeToken, share_expires_at: future, share_revoked_at: null }, true],
  ['无令牌', { share_token: null, share_expires_at: future }, false],
  ['空行', null, false],
  ['已过期', { share_token: activeToken, share_expires_at: past }, false],
  ['已吊销', { share_token: activeToken, share_expires_at: future, share_revoked_at: past }, false],
  ['★ 已吊销且已过期 → 吊销优先', { share_token: activeToken, share_expires_at: past, share_revoked_at: past }, false],
  ['无过期时间（不过期）', { share_token: activeToken, share_expires_at: null }, true],
]
for (const [name, row, want] of cases) {
  const got = isShareActive(row, NOW)
  if (got !== want) { activeFail++; fail(`${name}：isShareActive = ${got}，应为 ${want}`) }
}
// 三种失效原因必须分开（客户看到的文案不同）
const reasonCases = [
  [{ share_token: activeToken, share_revoked_at: past, share_expires_at: future }, 'revoked'],
  [{ share_token: activeToken, share_expires_at: past }, 'expired'],
  [{ share_token: null }, 'missing'],
  [null, 'missing'],
]
for (const [row, want] of reasonCases) {
  const got = shareInactiveReason(row, NOW)
  if (got !== want) { activeFail++; fail(`失效原因 = ${got}，应为 ${want}`) }
}
// 「已吊销且已过期」必须报 revoked 而不是 expired（否则客户以为是过期，会去要求续期）
if (shareInactiveReason({ share_token: activeToken, share_expires_at: past, share_revoked_at: past }, NOW) !== 'revoked') {
  activeFail++; fail('吊销优先原则被破坏：已吊销+已过期应报 revoked')
}
console.log(activeFail === 0 ? '✓ 判定：7 种状态全覆盖，吊销优先于过期，3 类失效原因分开' : `✗ 判定失败 ${activeFail} 处`)

// ---------- ③ 过期时间 ----------
console.log('—— ③ 过期时间 ——')
let expFail = 0
if (SHARE_TTL_DAYS !== 90) { expFail++; fail('默认有效期应为 90 天') }
const exp = shareExpiryFrom(NOW)
const deltaDays = (new Date(exp).getTime() - NOW.getTime()) / 86400_000
if (Math.abs(deltaDays - 90) > 0.001) { expFail++; fail(`默认过期应为 +90 天，实际 +${deltaDays} 天`) }
const exp7 = shareExpiryFrom(NOW, 7)
if (Math.abs((new Date(exp7).getTime() - NOW.getTime()) / 86400_000 - 7) > 0.001) {
  expFail++; fail('自定义天数未生效')
}
console.log(expFail === 0 ? '✓ 过期：默认 +90 天，可指定天数' : `✗ 过期失败 ${expFail} 处`)

// ---------- ④ 路径与 URL ----------
console.log('—— ④ 路径与 URL ——')
let urlFail = 0
if (sharePath(activeToken) !== `/r/${activeToken}`) { urlFail++; fail('sharePath 格式不对') }
if (shareUrl(activeToken) !== `https://www.mingcharts.com/r/${activeToken}`) { urlFail++; fail('shareUrl 默认域名不对') }
if (shareUrl(activeToken, 'https://example.com/') !== `https://example.com/r/${activeToken}`) {
  urlFail++; fail('shareUrl 未处理尾部斜杠')
}
console.log(urlFail === 0 ? '✓ 路径：/r/<token>，绝对地址带默认域名且处理尾斜杠' : `✗ 路径失败 ${urlFail} 处`)

// ---------- ⑤ 分享页安全 ----------
console.log('—— ⑤ 分享页安全 ——')
let pageFail = 0
const page = readFileSync(near('src/app/r/[token]/page.tsx'), 'utf8')
if (!/robots:\s*\{\s*index:\s*false/.test(page)) { pageFail++; fail('分享页未设 noindex（客户隐私 + 防重复内容）') }
if (!page.includes("export const dynamic = 'force-dynamic'")) { pageFail++; fail('分享页必须 force-dynamic（令牌不能进静态缓存）') }
if (!page.includes('createServerSupabase')) { pageFail++; fail('分享页未走 service_role 查报告') }
if (!page.includes('isShareActive')) { pageFail++; fail('分享页未校验链接有效（过期/吊销会照常展示）') }
if (!page.includes('isShareTokenShape')) { pageFail++; fail('分享页未先做令牌形状校验（会被垃圾 token 刷库）') }
// 只取渲染必需字段：不得 select('*')，也不得把 input 原样吐给客户
if (/select\(\s*'\*'\s*\)/.test(page)) { pageFail++; fail("分享页用了 select('*')，应显式列出字段") }
const selectLine = page.match(/\.select\(([^)]*)\)/)?.[1] ?? ''
if (/email|user_id/.test(selectLine)) { pageFail++; fail(`查询字段含隐私列：${selectLine}`) }
// 免责声明必须出现（伙伴协议要求）
if (!page.includes('仅供参考') && !page.includes('不构成')) { pageFail++; fail('分享页缺免责声明') }
// 页脚品牌行（伙伴协议里唯一的硬性要求）
if (!page.includes('由 明理 mingcharts.com 引擎生成')) { pageFail++; fail('分享页缺「由 明理引擎生成」页脚') }
console.log(pageFail === 0 ? '✓ 安全：noindex / force-dynamic / 形状校验 / 有效性校验 / 显式字段 / 免责+品牌页脚' : `✗ 安全失败 ${pageFail} 处`)

// ---------- ⑥ 打印 ----------
console.log('—— ⑥ 打印样式 ——')
let printFail = 0
const css = readFileSync(near('src/app/globals.css'), 'utf8')
if (!css.includes('@media print')) { printFail++; fail('globals.css 缺 @media print') }
const printBlock = css.slice(css.indexOf('@media print'))
if (!printBlock.includes('.hw-print')) { printFail++; fail('打印样式未收在 .hw-print 容器内（会波及全站打印）') }
if (!printBlock.includes('hw-print-hide')) { printFail++; fail('打印样式未隐藏操作条 .hw-print-hide') }
if (!printBlock.includes('break-inside')) { printFail++; fail('缺分页控制（break-inside），十卷会被拦腰截断') }
const bar = readFileSync(near('src/components/reports/SharePrintBar.tsx'), 'utf8')
if (!bar.includes("'use client'")) { printFail++; fail('SharePrintBar 必须是客户端组件（window.print）') }
if (!bar.includes('window.print')) { printFail++; fail('SharePrintBar 未调用 window.print') }
console.log(printFail === 0 ? '✓ 打印：@media print 收在 .hw-print、隐藏操作条、控制分页、按钮走 window.print' : `✗ 打印失败 ${printFail} 处`)

// ---------- ⑦ 运维脚本 ----------
console.log('—— ⑦ 运维脚本 ——')
let scriptFail = 0
const script = readFileSync(near('scripts/share-link.mjs'), 'utf8')
for (const mode of ['--revoke', '--show']) {
  if (!script.includes(mode)) { scriptFail++; fail(`share-link.mjs 缺 ${mode} 模式`) }
}
if (!script.includes('SUPABASE_SERVICE_ROLE_KEY')) { scriptFail++; fail('share-link.mjs 未使用 service_role') }
if (!script.includes('isShareActive')) { scriptFail++; fail('share-link.mjs 未复用有效性判定（会重复造链接）') }
if (!script.includes('reportShare.ts')) { scriptFail++; fail('share-link.mjs 未复用 lib/reportShare（令牌规则会漂移）') }
// 数据库迁移文件必须在
const sql = readFileSync(near('supabase/share.sql'), 'utf8')
for (const col of ['share_token', 'share_expires_at', 'share_revoked_at']) {
  if (!sql.includes(col)) { scriptFail++; fail(`share.sql 缺列 ${col}`) }
}
if (!sql.includes('idx_reports_share_token')) { scriptFail++; fail('share.sql 缺唯一索引（令牌重复会串报告）') }
console.log(scriptFail === 0 ? '✓ 运维：脚本三模式齐全并复用 lib；迁移含三列 + 唯一索引' : `✗ 运维失败 ${scriptFail} 处`)

// ---------- 牙口自检 ----------
console.log('—— 牙口自检（守护断言本身）——')
let toothFail = 0
if (isShareActive({ share_token: 'x' }, NOW)) { /* 形状不校验，仅判定存在 */ }
if (!isShareActive({ share_token: activeToken }, NOW)) { toothFail++; fail('牙口：有效行被判无效') }
if (isShareActive({ share_token: activeToken, share_revoked_at: past }, NOW)) { toothFail++; fail('牙口：吊销行被判有效') }
if (isShareTokenShape('x'.repeat(43)) !== true) { toothFail++; fail('牙口：合法形状被判非法') }
if (generateShareToken() === activeToken) { toothFail++; fail('牙口：令牌固定不变？') }
console.log(toothFail === 0 ? '✓ 牙口：有效性/形状/随机性 判据样本均能触发' : '✗ 牙口自检失败')

console.log('\n' + (allPass ? 'SHARE_ACCEPT_PASS' : 'SHARE_ACCEPT_FAIL'))
process.exit(allPass ? 0 : 1)
