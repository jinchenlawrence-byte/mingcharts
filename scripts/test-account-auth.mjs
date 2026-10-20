// ★ 密码重置与账号设置验收（HANDOFF-密码重置与账号设置 §四/H4，2026-10-13）
//
// 断言形态说明（§四-2：文件存在与文案命中【不算数】）：
//   · 路由存在 = page.tsx 存在 + 'use client' + 真正调用 Supabase API（非空壳）
//   · 接线断言 = resetPasswordForEmail(/updateUser( 必须出现在【提交处理函数体内】
//     （提取 handler 块做大括号平衡扫描，锚定「调用在 handler 里」而非「文本在文件里」）
//   · 两态断言 = reset-password 页同时含「有会话→表单」与「无会话→提示+重新请求」两条分支
import { readFileSync, existsSync } from 'node:fs'
// ★ Google 登录（2026-10-20）：safeNext 真调纯函数做【行为断言】，不是文本扫描
import { safeNext } from '../src/lib/safeNext.ts'

let allPass = true
const ok = (m) => console.log('  ✓ ' + m)
const fail = (m) => { allPass = false; console.log('  ✗ ' + m) }
const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')
const assert = (cond, m) => (cond ? ok(m) : fail(m))

// 注释剥离（负向源码扫描专用，避免注释里的禁令/说明文本造成误报）
function stripComments(src) {
  let out = '', state = 'code'
  for (let i = 0; i < src.length; i++) {
    const c = src[i], n = src[i + 1]
    if (state === 'code') {
      if (c === '/' && n === '/') { state = 'line'; i++; continue }
      if (c === '/' && n === '*') { state = 'block'; i++; continue }
      if (c === "'" || c === '"' || c === '`') { state = c; out += c; continue }
      out += c
    } else if (state === 'line') {
      if (c === '\n') { state = 'code'; out += c }
    } else if (state === 'block') {
      if (c === '*' && n === '/') { state = 'code'; i++ }
    } else {
      out += c
      if (c === '\\') { out += n ?? ''; i++ }
      else if (c === state) state = 'code'
    }
  }
  return out
}

// 提取 const <name> = async ... => { ... } 的完整函数体（大括号平衡扫描）
// 返回 null 表示没找到该 handler
function extractHandler(code, name) {
  const sig = new RegExp('const\\s+' + name + '\\s*=')
  const m = sig.exec(code)
  if (!m) return null
  const open = code.indexOf('{', m.index)
  if (open < 0) return null
  let depth = 0
  for (let i = open; i < code.length; i++) {
    if (code[i] === '{') depth++
    else if (code[i] === '}') { depth--; if (depth === 0) return code.slice(m.index, i + 1) }
  }
  return null
}

// ═══════════════════════════════════════════════════════════
// ① 路由存在且真接线（§四-1：不只断言文件存在）
// ═══════════════════════════════════════════════════════════
console.log('—— ① 路由存在且真接线 ——')

const rpPath = new URL('../src/app/reset-password/page.tsx', import.meta.url)
const acPath = new URL('../src/app/account/page.tsx', import.meta.url)
assert(existsSync(rpPath) && existsSync(acPath),
  '路由存在：src/app/reset-password/page.tsx 与 src/app/account/page.tsx')

{
  const code = stripComments(read('../src/app/reset-password/page.tsx'))
  assert(code.includes("'use client'"), 'reset-password 为客户端组件（非空壳）')
  assert(/updateUser\(\s*\{\s*password/.test(code),
    'reset-password 页调 updateUser({ password })（设新密码真接线）')
  assert(code.includes('getSession'), 'reset-password 页读会话（getSession）——两态分派的前提')

  // ★★★ 两态断言（§〇-7 / §四-1 ★★★★★：不能只写成功分支）
  assert(code.includes("no-session'") && code.includes('链接无效或已过期'),
    'reset-password 页含无会话分支（链接无效或已过期提示）')
  assert(/href="\/auth"/.test(code),
    'reset-password 页无会话分支含重新请求入口（回 /auth）')
  assert(code.includes("'form'"), 'reset-password 页含有会话分支（设新密码表单）')
}

{
  const code = stripComments(read('../src/app/account/page.tsx'))
  assert(code.includes("'use client'"), 'account 为客户端组件（非空壳）')
  assert(/updateUser\(\s*\{\s*password/.test(code),
    'account 页调 updateUser({ password })（改密真接线）')
  const acHandler = extractHandler(code, 'handleChange')
  assert(acHandler !== null && /updateUser\(\s*\{\s*password/.test(acHandler),
    'account 页 updateUser 调用在提交处理函数（handleChange）体内')

  // ★ 退出登录（2026-10-18 用户实测「找不到退出按钮」）：
  //   移动端 Nav 的退出钮排在横向滚动区最右端（屏幕外，需滑动才见）——
  //   账号设置页必须有显式登出按钮，且真接线 signOut（不是只有文案）。
  const loHandler = extractHandler(code, 'handleLogout')
  assert(loHandler !== null && /\.auth\.signOut\(/.test(loHandler.replace(/\s+/g, '')),
    'account 页含退出登录处理函数（handleLogout 内真调 auth.signOut）')
  assert(/onClick=\{handleLogout\}/.test(code),
    'account 页登出按钮真绑 onClick={handleLogout}（非纯文案）')
  assert(code.includes('退出登录'),
    'account 页登出按钮文案为「退出登录」（用户可找到）')
}

// layout 提供 metadata（use client 页不能导出 metadata；site-audit ① 同判据，此处保完整性）
{
  assert(existsSync(new URL('../src/app/reset-password/layout.tsx', import.meta.url))
    && /export const metadata/.test(read('../src/app/reset-password/layout.tsx')),
    'reset-password/layout.tsx 提供 metadata')
  assert(existsSync(new URL('../src/app/account/layout.tsx', import.meta.url))
    && /export const metadata/.test(read('../src/app/account/layout.tsx')),
    'account/layout.tsx 提供 metadata')
}

// ★★ 大陆可达性 P0（2026-10-16）：token_hash 回调页 + 自有域名代理 + 服务端直连分轨
// ═══════════════════════════════════════════════════════════
console.log('—— ①b 大陆可达性 P0：auth/callback 代理链路 ——')

{
  const cbPath = '../src/app/auth/callback/page.tsx'
  assert(existsSync(new URL(cbPath, import.meta.url)), '路由存在：src/app/auth/callback/page.tsx')
  const code = stripComments(read(cbPath))
  assert(code.includes("'use client'"), 'auth/callback 为客户端组件（非空壳）')
  assert(/verifyOtp\(\s*\{\s*token_hash/.test(code),
    'auth/callback 调 verifyOtp({ token_hash })（token_hash 显式验证真接线）')
  assert(code.includes("'recovery'") && code.includes("'/reset-password'"),
    'auth/callback recovery 分支跳转 /reset-password（衔接设新密码）')
  assert(code.includes("Suspense"), 'auth/callback 含 Suspense 边界（useSearchParams 静态渲染要求）')
}

{
  const vercelJson = JSON.parse(read('../vercel.json'))
  const rw = (vercelJson.rewrites || []).find(r => String(r.source).includes('/supabase-api/'))
  assert(!!rw, 'vercel.json 含 /supabase-api/* 反向代理 rewrite')
  assert(/supabase\.co/.test(rw.destination || ''), 'rewrite destination 指向 supabase.co')
}

{
  const code = stripComments(read('../src/lib/supabase.ts'))
  assert(code.includes('SUPABASE_URL_INTERNAL'),
    'supabase.ts 服务端工厂优先取 SUPABASE_URL_INTERNAL（服务端不走公网回环）')
}

// ═══════════════════════════════════════════════════════════
// ② /auth 忘记密码入口接线（§四-1 ★★：resetPasswordForEmail 必须在提交处理内）
// ═══════════════════════════════════════════════════════════
console.log('—— ② /auth 忘记密码接线 ——')

const authSrc = read('../src/app/auth/page.tsx')
const authCode = stripComments(authSrc)
{
  assert(authCode.includes('忘记密码'), '/auth 页含「忘记密码」入口文案')

  const handler = extractHandler(authCode, 'handleForgot')
  assert(handler !== null, '/auth 页存在提交处理函数 handleForgot')
  if (handler) {
    // ★ 接线：resetPasswordForEmail( 真的在提交处理函数体内被调用（§四-2）
    assert(/resetPasswordForEmail\(/.test(handler),
      'resetPasswordForEmail( 在 handleForgot 提交处理函数体内（接线非文案）')
    // ★ 统一提示防账号枚举（§一-1.1 ②）：handler 内不得 throw / 不得把 error 展示给用户
    assert(!/\bthrow\b/.test(handler) && !/catch/.test(handler) && !/error\.(message|status)/.test(handler),
      'handleForgot 内不 throw / 不读 error（成功失败同一句提示，防账号枚举）')
    assert(handler.includes('重置邮件已发送，请查收（含垃圾邮件）'),
      '统一提示文案存在：「重置邮件已发送，请查收（含垃圾邮件）」')
  }

  // ★★ 重定向地址与 Supabase Redirect URLs allowlist 一致（§一-1.2）
  assert(authCode.includes('NEXT_PUBLIC_APP_URL') && authCode.includes('/reset-password'),
    'redirectTo 用 ${NEXT_PUBLIC_APP_URL}/reset-password（与 Supabase 登记地址一致）')
}

// ═══════════════════════════════════════════════════════════
// ③ Nav 账号设置入口（§四-1 ★★★★）
// ═══════════════════════════════════════════════════════════
console.log('—— ③ Nav 账号设置入口 ——')

{
  const navCode = stripComments(read('../src/components/Nav.tsx'))
  const n = navCode.split('href="/account"').length - 1
  assert(n >= 1, `Nav.tsx 含指向 /account 的链接（href="/account" 命中 ${n}，要求 ≥1）`)
  // 移动端可点：/account 链接不得带 hidden 类（已登录区其余链接均平铺可见，同款样式）
  const linkLine = navCode.split('\n').find((l) => l.includes('href="/account"')) ?? ''
  assert(!/hidden/.test(linkLine), 'Nav 的 /account 链接不带 hidden 类（移动端可点）')
}

// ═══════════════════════════════════════════════════════════
// ④ 未越界（§五：不碰支付/权益，不越界改邮箱/删账号/订阅管理）
// ═══════════════════════════════════════════════════════════
console.log('—— ④ 未越界 ——')

{
  const rp = stripComments(read('../src/app/reset-password/page.tsx'))
  const ac = stripComments(read('../src/app/account/page.tsx'))
  const au = authCode
  const touched = rp + '\n' + ac + '\n' + au
  const n1 = touched.split("updateUserById").length - 1
  const n2 = (touched.match(/updateUser\(\s*\{\s*(email|data)/g) ?? []).length
  assert(n1 === 0, `不使用 Admin API（updateUserById 命中 ${n1}，要求 0——客户端不得碰管理接口）`)
  assert(n2 === 0, `不做改邮箱（updateUser 非 password 字段命中 ${n2}，要求 0）`)
  // 客户端页不得引 service role（§五：不得把服务端密钥用到客户端组件）
  assert(!rp.includes('SERVICE_ROLE') && !ac.includes('SERVICE_ROLE') && !au.includes('SERVICE_ROLE'),
    '三个文件均不引用 SERVICE_ROLE（客户端只用 anon key）')
}

// ═══════════════════════════════════════════════════════════
// ⑤ Turnstile 人机验证接线（B 层防恶意注册）
//    Supabase 后台开启 Captcha protection 后，所有 auth 调用必须带 captchaToken；
//    未配置 NEXT_PUBLIC_TURNSTILE_SITE_KEY 时整体关闭、行为与从前一致。
// ═══════════════════════════════════════════════════════════
console.log('—— ⑤ Turnstile 人机验证接线 ——')

{
  const tsPath = new URL('../src/components/Turnstile.tsx', import.meta.url)
  assert(existsSync(tsPath), 'Turnstile 组件存在：src/components/Turnstile.tsx')
  const ts = stripComments(read('../src/components/Turnstile.tsx'))
  assert(ts.includes('challenges.cloudflare.com/turnstile/v0/api.js') && ts.includes('render=explicit'),
    'Turnstile 脚本来源为 Cloudflare 官方（render=explicit 显式渲染）')
  assert(ts.includes('NEXT_PUBLIC_TURNSTILE_SITE_KEY') && /if\s*\(!SITE_KEY\)\s*return\s*null/.test(ts),
    'site key 未配置 → 组件渲染 null（验证码整体关闭，未配置环境行为不变）')
  assert(ts.includes("'expired-callback'") && ts.includes("'error-callback'"),
    'Turnstile 过期/出错回调清 token（不残留一次性 token）')

  const authTouched = stripComments(read('../src/app/auth/page.tsx'))
  assert(authTouched.includes('<Turnstile'), '/auth 页渲染 Turnstile 组件')
  assert(/TURNSTILE_ENABLED\s*=\s*!!process\.env\.NEXT_PUBLIC_TURNSTILE_SITE_KEY/.test(authTouched),
    'auth 页 TURNSTILE_ENABLED 守卫（未配 key 时按钮不禁用、调用不传 token）')

  const authHandler = extractHandler(authTouched, 'handleAuth')
  assert(authHandler !== null, '/auth 页存在 handleAuth')
  // Supabase JS v2：登录/注册的 captcha token 必须走 options.captchaToken——客户端只从这里读并自行组装
  // gotrue_meta_security 请求体；顶层直接传 gotrue_meta_security 会被静默丢弃（★ 条件展开还会绕过 TS
  // 多余属性检查，tsc 抓不到——2026-10-14 实网注册 400 no captcha_token found 的根因）
  const authN = authHandler ? authHandler.split('options: { captchaToken').length - 1 : 0
  assert(authN >= 2, `handleAuth 内 signInWithPassword/signUp 均走 options.captchaToken（命中 ${authN}，要求 ≥2）`)
  const forgotHandler = extractHandler(authTouched, 'handleForgot')
  const forgotN = forgotHandler ? forgotHandler.split('captchaToken').length - 1 : 0
  assert(forgotN >= 1, `handleForgot 内 resetPasswordForEmail 传 captchaToken（命中 ${forgotN}，要求 ≥1——该端点参数名就是 captchaToken）`)
  const guardN = (authTouched.match(/disabled=\{loading \|\| \(TURNSTILE_ENABLED && !captchaToken\)/g) ?? []).length
  assert(guardN === 2,
    `启用时提交按钮须过验证才可点（disabled 守卫精确命中 ${guardN}，要求 2——登录与找回两处）`)

  // 加载失败可感知（2026-10-16 手机端静默锁死修复）：脚本被浏览器拦截时给中文指引＋重试，不再无声禁用
  assert(ts.includes('scriptLoading = null') && ts.includes('onError'),
    'Turnstile 脚本加载失败回调 onError 并清除失败缓存（重试可重新加载）')
  assert(ts.includes('[resetKey]'),
    'Turnstile 以 resetKey 重建 widget（重试不只是 reset 旧实例，含脚本重载）')
  assert(authTouched.includes('人机验证加载失败') && authTouched.includes('重试验证'),
    'Turnstile 加载失败显示中文指引与重试入口（防静默禁用按钮锁死）')
  assert(authTouched.includes('正在加载人机验证'),
    'Turnstile 加载中显示占位提示（禁用按钮必有解释）')

  // 邮箱确认引导（2026-10-14：注册完直接登录会被 Supabase 拒，需两层中文提醒）
  assert(authTouched.includes('注册成功！验证邮件已发送'),
    '注册成功提示讲清「查邮件→点链接验证→再登录」流程（注册成功≠可直接登录）')
  assert(/not confirmed/i.test(authTouched) && authTouched.includes('邮箱尚未验证'),
    '未验证邮箱登录时把英文 Email not confirmed 映射为中文引导（兜底）')

  // secret 绝不进前端代码（只填 Supabase 后台 Captcha protection 设置）
  const tsRaw = read('../src/components/Turnstile.tsx')
  assert(!authTouched.includes('TURNSTILE_SECRET_KEY') && !tsRaw.includes('TURNSTILE_SECRET_KEY'),
    'TURNSTILE_SECRET_KEY 不得出现在前端代码（只填 Supabase 后台）')
}

// ═══════════════════════════════════════════════════════════
// ⑥ Google 第三方登录（2026-10-20）：接线级断言 + safeNext 行为断言
//    §四-2 纪律同款：不只看文案/文件存在，要锚定「调用在手写处理函数体内」。
// ═══════════════════════════════════════════════════════════
console.log('—— ⑥ Google 第三方登录 ——')

{
  // ★ 流型守护：整体保持 implicit（不切 PKCE）——切 PKCE 会让「邮件重置链接在
  //   另一台设备/另一个浏览器打开」失效（code_verifier 只存在发起登录的浏览器里）。
  //   牙口：若给 createClient 加 flowType:'pkce' 或 detectSessionInUrl:false → 本断言翻红。
  const sb = stripComments(read('../src/lib/supabase.ts'))
  assert(!/flowType\s*:\s*['"]pkce['"]/.test(sb) && !/detectSessionInUrl\s*:\s*false/.test(sb),
    'supabase.ts 保持 implicit 流（未切 PKCE，邮件重置的跨设备可用性不被破坏）')
}

{
  // /auth 页：Google 按钮与处理函数
  assert(/NEXT_PUBLIC_GOOGLE_AUTH_ENABLED/.test(authCode),
    '/auth 页由 NEXT_PUBLIC_GOOGLE_AUTH_ENABLED 开关控制（凭据未就绪时按钮不渲染）')
  assert(/GOOGLE_ENABLED\s*&&/.test(authCode),
    'Google 块以 GOOGLE_ENABLED && 守卫渲染（关闭时页面上不存在该按钮）')

  const gHandler = extractHandler(authCode, 'handleGoogle')
  assert(gHandler !== null, '/auth 页存在处理函数 handleGoogle')
  if (gHandler) {
    assert(/signInWithOAuth\(/.test(gHandler),
      'signInWithOAuth( 在 handleGoogle 处理函数体内（接线非文案）')
    assert(/provider:\s*'google'/.test(gHandler), "provider 为 'google'")
    assert(/\/auth\/callback/.test(gHandler),
      'redirectTo 指向 /auth/callback（与邮件确认复用同一路由）')
    assert(/safeNext\(/.test(gHandler), 'next 经 safeNext 白名单校验（防开放重定向）')
    assert(!/captchaToken/.test(gHandler),
      'handleGoogle 不传 captchaToken（OAuth 端点不接受该参数）')
  }
  // 既有流程未被扰动：忘记密码防账号枚举结构仍是原样（②已断言，此处只钉子表入口）
  const aH = extractHandler(authCode, 'handleAuth')
  assert(aH !== null && (aH.split('options: { captchaToken').length - 1) >= 2,
    'handleAuth 的 Turnstile 接线未被 Google 改动（仍 ≥2 处 options.captchaToken）')
}

{
  // auth/callback 页：三态分派
  const cb = stripComments(read('../src/app/auth/callback/page.tsx'))
  assert(/getSession\(/.test(cb), 'auth/callback 读会话（getSession）——OAuth 回流取会话的前提')
  assert(cb.includes('access_denied'), 'auth/callback 处理用户取消授权（access_denied）')
  assert(cb.includes('error_description'), 'auth/callback 展示渠道失败原因（error_description）')
  assert(/safeNext\(/.test(cb), 'auth/callback 用 safeNext 白名单校验 next')
  assert(/verifyOtp\(\s*\{\s*token_hash/.test(cb) && cb.includes("'/reset-password'"),
    '邮件确认/重置链路未被 OAuth 分支挤掉（verifyOtp 与 recovery 跳转均在）')
}

{
  // ★ safeNext 行为断言（真调纯函数）：开放重定向的每一种绕过写法都必须落回首页
  assert(safeNext('//evil.com') === '/', 'safeNext 挡协议相对地址 //evil.com')
  assert(safeNext('https://evil.com') === '/', 'safeNext 挡绝对地址 https://evil.com')
  assert(safeNext('/\\evil.com') === '/', 'safeNext 挡反斜杠变体 /\\evil.com')
  assert(safeNext('/%2F%2Fevil.com') === '/', 'safeNext 先解码再校验（挡 %2F%2F 编码绕过）')
  assert(safeNext('/javascript:alert(1)') === '/', 'safeNext 挡伪协议 /javascript:')
  assert(safeNext('/member') === '/member', 'safeNext 放行站内路径 /member')
  assert(safeNext('/daily?x=1') === '/daily?x=1', 'safeNext 放行带查询串的站内路径')
  assert(safeNext(null) === '/' && safeNext(undefined) === '/', 'safeNext 空值回退首页')
  assert(safeNext('//evil.com', '/daily') === '/daily', 'safeNext 按调用方指定的 fallback 回退')
}

{
  // 隐私政策：新第三方接收方必须如实披露（合规，不能漏列）
  const priv = read('../src/content/legal/privacy.md')
  assert(/Sign in with Google/.test(priv), 'privacy.md 披露「Sign in with Google」这一登录方式')
  assert(/Third-Party Sign-In/i.test(priv), 'privacy.md 列 Google 为第三方登录身份提供方（§2.1/§5）')
  assert(priv.includes('v0.3'), 'privacy.md 版本记录已加 v0.3（改动可追溯）')
}

console.log('\n' + (allPass ? 'ACCOUNT_AUTH_PASS' : 'ACCOUNT_AUTH_FAIL'))
if (!allPass) process.exit(1)
