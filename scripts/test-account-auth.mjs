// ★ 密码重置与账号设置验收（HANDOFF-密码重置与账号设置 §四/H4，2026-10-13）
//
// 断言形态说明（§四-2：文件存在与文案命中【不算数】）：
//   · 路由存在 = page.tsx 存在 + 'use client' + 真正调用 Supabase API（非空壳）
//   · 接线断言 = resetPasswordForEmail(/updateUser( 必须出现在【提交处理函数体内】
//     （提取 handler 块做大括号平衡扫描，锚定「调用在 handler 里」而非「文本在文件里」）
//   · 两态断言 = reset-password 页同时含「有会话→表单」与「无会话→提示+重新请求」两条分支
import { readFileSync, existsSync } from 'node:fs'

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

console.log('\n' + (allPass ? 'ACCOUNT_AUTH_PASS' : 'ACCOUNT_AUTH_FAIL'))
if (!allPass) process.exit(1)
