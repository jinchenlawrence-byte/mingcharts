// 游客认领链路（阶段 D）验收断言
//
// 覆盖四层（真发信留到有 Resend 凭据之后）：
//   A. 三语邮件正文：主题/正文/HTML 齐全，繁体逐字写死（不走机转）
//   B. magic link 拼装口径与令牌轮换时机（先查配置，再生成 raw token）
//   C. 缺凭据降级：mailConfigured/sendMail 返回可观测失败，不抛异常
//   D. 代码约束：callback 三态、claim 幂等与邮箱校验、认领页三棵树、verify 接线
import { readFileSync, existsSync } from 'node:fs'
import { buildClaimEmail, CLAIM_SUBJECTS } from '../src/lib/guestClaimCopy.ts'
import { CLAIM_PAGE_COPY } from '../src/lib/guestClaimPageCopy.ts'
import { mailConfigured, sendMail } from '../src/lib/resendMail.ts'
import { buildClaimMagicUrl, claimPathForLocale, resolveSiteOrigin } from '../src/lib/guestClaimMail.ts'
import { safeNext } from '../src/lib/safeNext.ts'

let allPass = true
const fail = (m) => { allPass = false; console.log('  ✗ ' + m) }
const ok = (m) => console.log('  ✓ ' + m)
const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')

const APP = 'https://www.mingcharts.com'
const RAW = 'A'.repeat(43) // 形状合法的令牌样例（非真实）
const REF = 'MCG-9f1d2c3b-4a5e-4f60-8b71-2c3d4e5f6a7b-1763300000000'

console.log('—— A. 三语邮件正文 ——')
{
  const cases = [
    { locale: 'zh-Hans', title: '命书', must: ['命书', '领取', '邮箱'], mustNot: ['命書', '領取'], pw: '免密登录' },
    { locale: 'zh-Hant', title: '命書', must: ['命書', '領取', '郵箱'], mustNot: ['命书', '领取', '邮箱'], pw: '免密登入' },
    { locale: 'en', title: 'Fate Book', must: ['Fate Book', 'claim'], mustNot: [], pw: 'passwordless' },
  ]
  const subjects = new Set()
  for (const c of cases) {
    const reports = c.locale === 'en' ? '/en/reports' : c.locale === 'zh-Hant' ? '/tw/reports' : '/reports'
    const claimUrl = `${APP}${claimPathForLocale(c.locale, RAW)}`
    const magicUrl = `${APP}/auth/callback?token_hash=HASHED&type=magiclink&next=${encodeURIComponent(claimPathForLocale(c.locale, RAW))}`
    const resetUrl = `${APP}/reset-password?next=${encodeURIComponent(reports)}`
    const mail = buildClaimEmail({ locale: c.locale, magicUrl, claimUrl, resetUrl, ref: REF, title: c.title })
    subjects.add(mail.subject)

    if (!mail.subject.includes(c.title)) fail(`${c.locale} 主题未包含报告标题`)
    if (!mail.text.includes(REF)) fail(`${c.locale} 纯文本缺业务单号`)
    if (!mail.text.includes(claimUrl)) fail(`${c.locale} 纯文本缺认领页备用地址`)
    if (!mail.text.includes('type=magiclink')) fail(`${c.locale} 纯文本缺 magiclink 链接`)
    if (!mail.html.includes('type=magiclink')) fail(`${c.locale} HTML 缺 magiclink 按钮链接`)
    if (!mail.html.includes(claimUrl)) fail(`${c.locale} HTML 缺备用认领地址`)
    if (!mail.text.includes(c.pw)) fail(`${c.locale} 正文缺「免密账号」说明`)
    if (!mail.text.includes(resetUrl)) fail(`${c.locale} 正文缺设置密码链接`)
    if (!mail.html.includes(resetUrl)) fail(`${c.locale} HTML 缺设置密码链接`)
    for (const s of c.must) {
      if (!mail.text.includes(s)) fail(`${c.locale} 正文缺关键词「${s}」`)
    }
    for (const s of c.mustNot) {
      if (mail.text.includes(s)) fail(`${c.locale} 正文出现另一字体写法「${s}」（疑似运行时转换）`)
    }
  }
  if (subjects.size !== 3) fail('三语主题没有区分开')
  if (CLAIM_SUBJECTS['zh-Hant']('命書').includes('命书')) fail('繁体主题被转成简体')
  ok('三语主题/正文/HTML 齐全；繁体逐字写死；magiclink 与备用地址都在')
}

console.log('—— A2. 认领页三语文案 ——')
{
  const codes = ['invalid', 'not_found', 'revoked', 'expired', 'email_mismatch', 'already_claimed', 'not_ready', 'network', 'server']
  for (const locale of ['zh-Hans', 'zh-Hant', 'en']) {
    const c = CLAIM_PAGE_COPY[locale]
    if (!c || !c.loginCta || !c.successTitle || !c.loginBody) fail(`${locale} 认领页文案缺字段`)
    if (!c.passwordHint || !c.passwordCta) fail(`${locale} 认领页缺「设置密码」提示`)
    for (const code of codes) if (!c.errors[code]) fail(`${locale} 缺少错误码「${code}」文案`)
  }
  if (!CLAIM_PAGE_COPY['zh-Hant'].title.includes('命書')) fail('繁体认领页标题不是繁体')
  if (!CLAIM_PAGE_COPY['zh-Hant'].passwordHint.includes('免密登入')) fail('繁体设密提示不是繁体用词')
  if (CLAIM_PAGE_COPY['zh-Hant'].passwordHint.includes('登录')) fail('繁体设密提示混入简体用词')
  ok('认领页三语 × 9 个错误码齐全；三语设密提示齐全且繁体逐字写死')
}

console.log('—— B. 令牌轮换与 magic link 拼装 ——')
{
  if (claimPathForLocale('zh-Hans', RAW) !== `/claim/${RAW}`) fail('简体认领路径错误')
  if (claimPathForLocale('zh-Hant', RAW) !== `/tw/claim/${RAW}`) fail('繁体认领路径错误')
  if (claimPathForLocale('en', RAW) !== `/en/claim/${RAW}`) fail('英文认领路径错误')

  // ★ magic link 构造：token_hash 与 next 都必须完整编码；next 解码后等于原路径。
  //   背景：QQ 邮箱安全跳转对未编码的嵌套路径/本机地址会判 Invalid url。
  {
    const path = claimPathForLocale('zh-Hant', RAW)
    const HASHED = 'a+b/c='
    const link = buildClaimMagicUrl(APP, HASHED, path)
    if (!link.includes('next=%2Ftw%2Fclaim%2F')) fail('next 未做百分号编码（/ 未变成 %2F）')
    if (link.split('?').length !== 2) fail('链接出现双层 query')
    const u = new URL(link)
    if (u.origin !== APP) fail('magic link 的 origin 不是站点根地址')
    if (u.searchParams.get('token_hash') !== HASHED) fail('token_hash 解码后不等于原值')
    if (u.searchParams.get('next') !== path) fail('next 解码后不等于认领路径')
    if (u.searchParams.get('type') !== 'magiclink') fail('magic link 缺 type=magiclink')
    if (u.searchParams.getAll('next').length !== 1) fail('next 参数重复')

    // 解析侧（callback 的 safeNext）同时兼容已编码 / 未编码两种形式
    if (safeNext(path) !== path) fail('safeNext 不兼容未编码的 next')
    if (safeNext(encodeURIComponent(path)) !== path) fail('safeNext 不兼容已编码的 next')
    if (safeNext(u.searchParams.get('next')) !== path) fail('safeNext 对 URL 解码后的 next 不生效')
  }

  // ★ 站点地址优先级：生产绝不允许回落 localhost（QQ/163 会判 Invalid url）
  {
    const prodExplicit = resolveSiteOrigin({ NODE_ENV: 'production', NEXT_PUBLIC_APP_URL: 'https://www.mingcharts.com' })
    if (!prodExplicit.ok || prodExplicit.origin !== APP || prodExplicit.source !== 'NEXT_PUBLIC_APP_URL') {
      fail('显式 https APP_URL 未被优先采用')
    }

    const prodLocalhost = resolveSiteOrigin({ NODE_ENV: 'production', NEXT_PUBLIC_APP_URL: 'http://localhost:3000' })
    if (prodLocalhost.ok) fail('生产环境仍接受了 localhost（会发出死链）')
    else if (prodLocalhost.reason !== 'app_url_invalid') fail('生产 localhost 的失败原因不是 app_url_invalid')

    const prodFallback = resolveSiteOrigin({
      NODE_ENV: 'production',
      NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
      VERCEL_PROJECT_PRODUCTION_URL: 'www.mingcharts.com',
    })
    if (!prodFallback.ok || prodFallback.origin !== APP || prodFallback.source !== 'VERCEL_PROJECT_PRODUCTION_URL') {
      fail('显式地址无效时未回落到 Vercel 生产域名')
    }

    const prodDeploy = resolveSiteOrigin({ NODE_ENV: 'production', VERCEL_URL: 'mingcharts-abc.vercel.app' })
    if (!prodDeploy.ok || prodDeploy.origin !== 'https://mingcharts-abc.vercel.app') fail('VERCEL_URL 未被补成 https')

    const prodMissing = resolveSiteOrigin({ NODE_ENV: 'production' })
    if (prodMissing.ok || prodMissing.reason !== 'app_url_missing') fail('生产无任何地址时未 fail-closed')

    const devLocal = resolveSiteOrigin({ NODE_ENV: 'development', NEXT_PUBLIC_APP_URL: 'http://localhost:3000' })
    if (!devLocal.ok || devLocal.origin !== 'http://localhost:3000') fail('非生产环境应允许 localhost 联调')

    const prodGarbage = resolveSiteOrigin({ NODE_ENV: 'production', NEXT_PUBLIC_APP_URL: 'not a url' })
    if (prodGarbage.ok || prodGarbage.reason !== 'app_url_invalid') fail('非法 APP_URL 未返回 app_url_invalid')
  }

  const src = read('../src/lib/guestClaimMail.ts')
  const cfgIdx = src.indexOf('const cfg = mailConfigured()')
  const rotateIdx = src.indexOf('const rawToken = generateClaimToken()')
  if (cfgIdx < 0 || rotateIdx < 0) fail('未找到配置检查或令牌生成')
  else if (!(cfgIdx < rotateIdx)) fail('缺少 Resend 凭据时仍轮换了令牌（应先查配置再生成 raw token）')

  for (const piece of [
    'claim_token_hash',
    'claim_expires_at',
    'claim_revoked_at: null',
    'hashClaimToken(rawToken)',
    '/auth/callback?token_hash=',
    'type=magiclink',
    'encodeURIComponent(claimPath)',
    'buildClaimMagicUrl(appUrl, link.hashedToken, claimPath)',
    'app_url_invalid',
    'VERCEL_PROJECT_PRODUCTION_URL',
    'app_url_source',
    "host === 'localhost'",
    "type: 'magiclink'",
    'createUser({ email, email_confirm: true })',
    "claim_email_sent",
    "claim_email_failed",
  ]) {
    if (!src.includes(piece)) fail(`guestClaimMail 缺少关键实现：${piece}`)
  }
  // 审计不得记录 raw token / magic link
  if (/detail:\s*\{[^}]*rawToken/.test(src)) fail('审计事件里出现 raw token')
  ok('发信时才轮换令牌；magiclink 经自有 callback + next；审计不含令牌')
}

console.log('—— C. 缺凭据降级（不抛、可观测）——')
{
  const savedKey = process.env.RESEND_API_KEY
  const savedFrom = process.env.RESEND_FROM
  delete process.env.RESEND_API_KEY
  delete process.env.RESEND_FROM

  const c1 = mailConfigured()
  if (c1.ok !== false || c1.reason !== 'missing_api_key') fail('缺 RESEND_API_KEY 未返回 missing_api_key')

  process.env.RESEND_API_KEY = 'test-key-not-real'
  const c2 = mailConfigured()
  if (c2.ok !== false || c2.reason !== 'missing_from') fail('缺 RESEND_FROM 未返回 missing_from')

  const sent = await sendMail({ to: 'buyer@example.com', subject: 'x', html: '<p>x</p>', text: 'x' })
  if (sent.ok !== false || !['missing_api_key', 'missing_from'].includes(sent.reason)) {
    fail('缺凭据时 sendMail 没有返回可观测失败（或抛了异常）')
  }

  if (savedKey === undefined) delete process.env.RESEND_API_KEY
  else process.env.RESEND_API_KEY = savedKey
  if (savedFrom === undefined) delete process.env.RESEND_FROM
  else process.env.RESEND_FROM = savedFrom

  const mail = read('../src/lib/resendMail.ts')
  if (!mail.includes('process.env.RESEND_API_KEY') || !mail.includes('process.env.RESEND_FROM')) {
    fail('resendMail 未从环境变量读取凭据')
  }
  if (/from:\s*['"][^'"]*@/.test(mail)) fail('resendMail 写死了发件地址')
  if (/re_[A-Za-z0-9]{10,}/.test(mail + read('../src/lib/guestClaimMail.ts'))) fail('代码里出现疑似 Resend 密钥')
  ok('缺凭据返回 missing_api_key / missing_from，不抛异常；代码无硬编码地址与密钥')
}

console.log('—— D. 代码约束 ——')
{
  // D1 callback：magiclink 分支 + signup/recovery 原行为
  const cb = read('../src/app/(zh)/auth/callback/page.tsx')
  if (!cb.includes("type !== 'signup' && type !== 'recovery' && type !== 'magiclink'")) {
    fail('callback 未接受 magiclink')
  }
  if (!cb.includes("if (type === 'magiclink')")) fail('callback 缺 magiclink 早返回')
  if (!cb.includes("safeNext(params.get('next'), '/')")) fail('magiclink 未经 safeNext 回 next')
  if (!cb.includes("type === 'recovery' ? '/reset-password' : '/'")) fail('recovery 原分派被改动')

  // D2 claim API：幂等、邮箱校验、RPC、不直接写 reports
  const claim = read('../src/app/api/guest/claim/route.ts')
  if (!claim.includes("rpc('claim_guest_order'")) fail('claim 未调 claim_guest_order RPC')
  if (!claim.includes('p_chart_id')) fail('claim 未回填 chart_id')
  if (!claim.includes('order.claimed_user_id === user.id')) fail('claim 缺同账号幂等判断')
  if (!claim.includes('userEmail !== buyerEmail')) fail('claim 缺邮箱一致性校验')
  if (!claim.includes('GUEST_CHECKOUT_ENABLED')) fail('claim 未受总开关保护')
  if (/\.from\('reports'\)/.test(claim)) fail('claim 不应直接写 reports（由 RPC 负责）')

  // D3 认领页三棵树 + 共用客户端
  for (const p of [
    '../src/app/(zh)/claim/[token]/page.tsx',
    '../src/app/tw/claim/[token]/page.tsx',
    '../src/app/en/claim/[token]/page.tsx',
  ]) {
    if (!existsSync(new URL(p, import.meta.url))) { fail(`缺认领页 ${p}`); continue }
    const page = read(p)
    if (!page.includes('ClaimClient')) fail(`${p} 未渲染 ClaimClient`)
    if (!page.includes('robots: { index: false')) fail(`${p} 未设置 noindex`)
  }
  const client = read('../src/components/claim/ClaimClient.tsx')
  if (!client.includes("fetch('/api/guest/claim'")) fail('ClaimClient 未调用认领接口')
  if (!client.includes('accessToken: session.access_token')) fail('ClaimClient 未带会话令牌')
  if (!client.includes('signOut()')) fail('ClaimClient 缺“切换账号”路径')
  if (!client.includes('copy.passwordHint')) fail('ClaimClient 未展示「免密账号」提示')
  if (!client.includes('/reset-password?next=')) fail('ClaimClient 缺设置密码入口')

  // D4 触发与补发接线
  const report = read('../src/lib/guestReport.ts')
  if (!report.includes('sendClaimEmail(admin, guestOrderId)')) fail('报告 ready 后未触发认领邮件')
  const cron = read('../src/app/api/cron/guest-orders/route.ts')
  if (!cron.includes('retryClaimEmails')) fail('cron 未补发认领邮件')
  const mail = read('../src/lib/guestClaimMail.ts')
  if (!mail.includes('CLAIM_EMAIL_MAX_ATTEMPTS = 5')) fail('邮件补发上限不是 5')
  if (!mail.includes('notConfigured: true')) fail('缺凭据时 cron 未整体跳过（会刷审计噪音）')
  if (!mail.includes('/reset-password?next=')) fail('认领邮件未拼设置密码链接')

  // D5 verify 接线
  const pkg = read('../package.json')
  if (!pkg.includes('test-guest-claim-accept.mjs')) fail('verify 链未包含 test-guest-claim-accept.mjs')
  const tpl = read('../scripts/test-email-templates.mjs')
  if (!tpl.includes("type !== 'magiclink'")) fail('test-email-templates ② 未同步 magiclink')

  ok('callback / claim API / 三语认领页 / 触发与补发 / verify 接线全部就位')
}

console.log(allPass ? '\nGUEST_CLAIM_PASS' : '\nGUEST_CLAIM_FAIL')
if (!allPass) process.exit(1)
