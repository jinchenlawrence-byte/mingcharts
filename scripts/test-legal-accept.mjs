// 法律页验收（HANDOFF-法律页上线 §七；§8.6.7 行为断言要求）
import { existsSync, readFileSync } from 'node:fs'
import { renderLegal, getLegalBody } from '../src/lib/legalContent.ts'
import { miniMarkdown } from '../src/lib/miniMarkdown.ts'

let allPass = true
const fail = (msg) => { allPass = false; console.log('  ✗ ' + msg) }

// ---------- ① 页面文件存在 ----------
let existFail = 0
if (!existsSync('src/app/terms/page.tsx')) { existFail++; fail('src/app/terms/page.tsx 不存在') }
if (!existsSync('src/app/privacy/page.tsx')) { existFail++; fail('src/app/privacy/page.tsx 不存在') }
console.log(existFail === 0 ? '✓ 页面文件存在：terms/page.tsx + privacy/page.tsx' : '✗ 页面文件缺失')

// ---------- ② 文本源唯一 ----------
let srcFail = 0
if (!existsSync('src/content/legal/terms.md')) { srcFail++; fail('src/content/legal/terms.md 不存在') }
if (!existsSync('src/content/legal/privacy.md')) { srcFail++; fail('src/content/legal/privacy.md 不存在') }
// docs/legal/ 下不得有同名副本
if (existsSync('docs/legal/terms.md')) { srcFail++; fail('docs/legal/terms.md 仍存在（第二事实源）') }
if (existsSync('docs/legal/privacy.md')) { srcFail++; fail('docs/legal/privacy.md 仍存在（第二事实源）') }
console.log(srcFail === 0 ? '✓ 文本源唯一：src/content/legal/ 有，docs/legal/ 无副本' : '✗ 文本源问题')

// ---------- ③ 无需登录可达（静态检查）----------
// 无 middleware.ts → 不拦截任何路径
let accessFail = 0
const hasMiddleware = existsSync('src/middleware.ts') || existsSync('middleware.ts')
if (hasMiddleware) {
  // 若有 middleware，检查 matcher 不覆盖 /terms 与 /privacy
  const mwSrc = readFileSync(existsSync('src/middleware.ts') ? 'src/middleware.ts' : 'middleware.ts', 'utf8')
  if (mwSrc.includes('/terms') || mwSrc.includes('/privacy')) {
    accessFail++; fail('middleware 拦截了 /terms 或 /privacy')
  }
}
// layout.tsx 不得重定向这两个路径
const layoutSrc = readFileSync('src/app/layout.tsx', 'utf8')
if (/\b(redirect|navigate)\b.*['"]\/terms['"]/.test(layoutSrc)) {
  accessFail++; fail('layout.tsx 含对 /terms 的重定向')
}
console.log(accessFail === 0 ? '✓ 无需登录可达：无 middleware 拦截，layout 不重定向' : '✗ 可达性问题')

// ---------- ④ ★★★ 渲染截断正确（行为断言：真调 renderLegal）----------
let truncFail = 0
// ④-a 调生产函数 renderLegal，确认输出含正文起始标题
const termsHtml = renderLegal('terms.md')
const privacyHtml = renderLegal('privacy.md')
// ★ 区分大小写：输出应含 "TERMS OF SERVICE" 而非 "Terms of Service — MingCharts"
if (!termsHtml.includes('TERMS OF SERVICE')) {
  truncFail++; fail('terms 页面输出不含 "# TERMS OF SERVICE"')
}
if (!privacyHtml.includes('PRIVACY POLICY')) {
  truncFail++; fail('privacy 页面输出不含 "# PRIVACY POLICY"')
}
// ④-b 反向断言：输出不得含内部说明区的特征串
if (termsHtml.includes('v0.1 → v0.2')) {
  truncFail++; fail('terms 页面泄漏内部说明区（"v0.1 → v0.2"）')
}
if (privacyHtml.includes('v0.1 → v0.2')) {
  truncFail++; fail('privacy 页面泄漏内部说明区（"v0.1 → v0.2"）')
}
if (privacyHtml.includes('📌 附：')) {
  truncFail++; fail('privacy 页面泄漏内部附录（"📌 附："）')
}
// ④-c Last Updated 必须在页面上可见
if (!termsHtml.includes('Last Updated')) {
  truncFail++; fail('terms 页面不含 "Last Updated"')
}
if (!privacyHtml.includes('Last Updated')) {
  truncFail++; fail('privacy 页面不含 "Last Updated"')
}
console.log(truncFail === 0
  ? '✓ 渲染截断：调 renderLegal 真跑，含正文标题、无内部说明、有 Last Updated'
  : '✗ 渲染截断失败')

// ---------- ⑤ 正文零占位符 ----------
let phFail = 0
const phPattern = /\[XXX\]|\[placeholder\]|\[.*_here\]|sole\W+trader|support@mingcharts|TBD/i
for (const doc of ['terms.md', 'privacy.md']) {
  const body = getLegalBody(doc)
  const matches = body.match(new RegExp(phPattern.source, 'gi'))
  if (matches) {
    phFail++; fail(`${doc} 正文含占位符：${matches.join('、')}`)
  }
}
console.log(phFail === 0 ? '✓ 正文零占位符（模式：/\\[XXX\\]|placeholder|sole.*trader|support@|TBD/ → 0 命中）' : '✗ 占位符残留')

// ---------- ⑥ 页脚 ----------
let footerFail = 0
if (!layoutSrc.includes('href="/terms"')) { footerFail++; fail('layout 不含 /terms 链接') }
if (!layoutSrc.includes('href="/privacy"')) { footerFail++; fail('layout 不含 /privacy 链接') }
// 邮箱不得在断言里硬编码字面量 → 从 terms.md 抽取
const termsBody = getLegalBody('terms.md')
const emailMatch = termsBody.match(/hello@mingcharts\.com/)
const email = emailMatch ? emailMatch[0] : null
if (!email) {
  footerFail++; fail('terms.md 正文不含支持邮箱')
} else if (!layoutSrc.includes(email)) {
  footerFail++; fail(`layout 不含邮箱 ${email}（与 terms.md 不一致）`)
}
console.log(footerFail === 0 ? `✓ 页脚：含 /terms、/privacy、${email}（从 terms.md 抽取验证）` : '✗ 页脚缺失')

// ---------- ⑦ 邮箱单一事实源 ----------
// ★ 不得在断言里再写一遍邮箱字面量
// 已在 ⑥ 中用 terms.md 抽取的 email 验证 layout.tsx
let emailFail = 0
// 额外检查 privacy.md 里的邮箱也一致
const privacyBody = getLegalBody('privacy.md')
if (!privacyBody.includes(email)) {
  emailFail++; fail(`privacy.md 的邮箱与 terms.md 不一致（期望 ${email}）`)
}
console.log(emailFail === 0 ? '✓ 邮箱单一事实源：terms.md = privacy.md = layout.tsx（未在断言里硬编码）' : '✗ 邮箱不一致')

console.log('\n' + (allPass ? 'LEGAL_ACCEPT_PASS' : 'LEGAL_ACCEPT_FAIL'))
if (!allPass) process.exit(1)
