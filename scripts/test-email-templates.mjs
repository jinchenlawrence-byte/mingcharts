// Supabase 邮件模板「仓库副本」守护（2026-10-18 新增）
//
// 背景（真实事故）：注册确认邮件模板一度被写成【纯文本裸链接】——163 网页邮箱不自动
//   识别超长裸 URL，用户只能复制粘贴到地址栏才能完成确认（而 Supabase 默认模板是
//   <a href>，任何客户端都能点）。模板只活在 Supabase 后台、代码仓库无副本时，
//   这种不一致既没人发现、也没法回归。故：模板正文入库 + 本测试逐条守护。
//
// 另守护一个高危陷阱：Reset password 的 type 必须是 recovery。写成 signup 会让
//   auth/callback 跳【首页】而不是 /reset-password，用户误以为「重置失败」。
//
// 纪律同 test-site-audit：逐条断言带模式说明；正文断言在【剥掉 HTML 注释】之后进行
//   （注释是元数据，允许出现 .ConfirmationURL 等被禁止出现在正文里的字样）。
import { readFileSync, existsSync } from 'node:fs'

let allPass = true
const fail = (msg) => { allPass = false; console.log('  ✗ ' + msg) }
const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')
const stripHtmlComments = (s) => s.replace(/<!--[\s\S]*?-->/g, '')
const countOf = (s, sub) => s.split(sub).length - 1

// 模板清单：type 必须与 Supabase 模板名一一对应（这是本测试的核心判据）
const TEMPLATES = [
  {
    kind: 'signup',
    dashboardName: 'Confirm signup',
    file: '../supabase/email-templates/confirm-signup.html',
    subject: '确认注册 - 明理',
    mustTexts: ['感谢注册明理', '点此完成邮箱确认'],
  },
  {
    kind: 'recovery',
    dashboardName: 'Reset password',
    file: '../supabase/email-templates/reset-password.html',
    subject: '重置密码',
    mustTexts: ['重置密码', '点此设置新密码'],
  },
]

console.log('—— ① 两份模板副本齐备并含可点击锚点 ——')
let tplFail = 0
for (const t of TEMPLATES) {
  if (!existsSync(new URL(t.file, import.meta.url))) { tplFail++; fail(`${t.file} 不存在`); continue }
  const raw = read(t.file)
  const body = stripHtmlComments(raw) // 正文断言一律在剥注释后进行

  // ★ 核心判据：真正的 HTML 锚点，且 type 与模板严格对应
  const anchor = `<a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=${t.kind}"`
  if (!body.includes(anchor)) {
    tplFail++; fail(`${t.dashboardName} 缺可点击锚点（模式：includes ${anchor}）`)
  }
  // ★ type 串台（写错会让回调页跳首页）
  const other = t.kind === 'signup' ? 'recovery' : 'signup'
  if (body.includes(`&type=${other}`)) {
    tplFail++; fail(`${t.dashboardName} 出现 &type=${other}（type 与模板串台，回调页会跳错目的地）`)
  }
  // ★ 兜底裸链必须保留（锚点 + 正文裸链 = 至少 2 处）
  const pathCount = countOf(body, '{{ .SiteURL }}/auth/callback')
  if (pathCount < 2) {
    tplFail++; fail(`${t.dashboardName} 回调路径只出现 ${pathCount} 次（需 ≥2：锚点 + 兜底裸链），用户失去复制粘贴自救路径`)
  }
  if (!body.includes('若按钮无法点击')) {
    tplFail++; fail(`${t.dashboardName} 缺兜底提示文案「若按钮无法点击」（复制粘贴入口）`)
  }
  // ★ 不得依赖图片渲染
  if (body.includes('<img')) {
    tplFail++; fail(`${t.dashboardName} 含 <img>（邮件客户端拦图后按钮即失效）`)
  }
  // ★ 不得回退成默认 {{ .ConfirmationURL }}：它指向 supabase.co 的 verify 端点（大陆不可达）
  if (body.includes('.ConfirmationURL')) {
    tplFail++; fail(`${t.dashboardName} 正文含 .ConfirmationURL（指向 supabase.co，大陆用户点不动）`)
  }
  // ★ 文案保留（设计师不得省略必要文字）
  for (const m of t.mustTexts) {
    if (!body.includes(m)) { tplFail++; fail(`${t.dashboardName} 正文缺文案「${m}」`) }
  }
  // ★ 元数据（注释）必须写明回贴位置与 Subject，否则副本无法使用
  if (!raw.includes('Authentication → Emails → Templates')) {
    tplFail++; fail(`${t.dashboardName} 注释未写明回贴位置（Authentication → Emails → Templates）`)
  }
  if (!raw.includes(t.dashboardName)) {
    tplFail++; fail(`${t.dashboardName} 注释未写明对应模板名「${t.dashboardName}」`)
  }
  if (!raw.includes(t.subject)) {
    tplFail++; fail(`${t.dashboardName} 注释未写明 Subject「${t.subject}」`)
  }
}
console.log(tplFail === 0
  ? `✓ 模板副本：${TEMPLATES.length} 份均含 HTML 锚点 + 兜底裸链（各 ≥2 处回调路径）、无 <img>、无 .ConfirmationURL、文案完整，注释含回贴位置与 Subject`
  : '✗ 模板副本断言失败')

console.log('—— ② 与 auth/callback 页口径一致（type 枚举 + recovery 目的地）——')
let syncFail = 0
const cb = read('../src/app/auth/callback/page.tsx')
if (!cb.includes("type !== 'signup' && type !== 'recovery'")) {
  syncFail++; fail('auth/callback 未把 type 限定为 signup/recovery（模板可用的 type 与页面接受的集合必须相同）')
}
if (!cb.includes("verifyOtp({ token_hash: tokenHash, type })")) {
  syncFail++; fail('auth/callback 未走 verifyOtp({ token_hash, type })（自有域名验证链路）')
}
if (!cb.includes("type === 'recovery' ? '/reset-password' : '/'")) {
  syncFail++; fail('auth/callback 未把 recovery 分派到 /reset-password（重置邮件将落到首页）')
}
if (!existsSync(new URL('../src/app/reset-password/page.tsx', import.meta.url))) {
  syncFail++; fail('缺 /reset-password 页面（recovery 分派的目的地不存在）')
}
console.log(syncFail === 0
  ? '✓ 口径一致：callback 接受的 type 恰为 signup/recovery；recovery → /reset-password 且该页存在；走 verifyOtp 自有域名链路'
  : '✗ callback 口径断言失败')

console.log('—— ③ 本测试已接入 npm run verify（防「写了没接」）——')
let wireFail = 0
const pkg = read('../package.json')
if (!pkg.includes('scripts/test-email-templates.mjs')) {
  wireFail++; fail('package.json 的 verify 链未包含 test-email-templates.mjs')
}
console.log(wireFail === 0
  ? '✓ 接线：test-email-templates.mjs 已在 npm run verify 链中'
  : '✗ verify 接线断言失败')

console.log(allPass ? 'EMAIL_TEMPLATES_PASS' : 'EMAIL_TEMPLATES_FAIL')
process.exit(allPass ? 0 : 1)
