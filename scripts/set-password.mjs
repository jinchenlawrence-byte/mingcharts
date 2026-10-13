// scripts/set-password.mjs
// ─────────────────────────────────────────────────────────────
// 一次性工具：本地直接改某个 Supabase 账号的密码。
//
// 用途：网页版目前【没有修改密码入口】（见 docs/上线检查清单.md H 段），
//       而 Admin API 用 service_role key 可以直接改 ✗ 不需要部署任何东西。
//
// 用法（在仓库根目录）：
//     node scripts/set-password.mjs
//
// ★★★ 安全约定：
//   · 密码【不会】写进任何文件、日志或命令行历史（交互式输入 ＋ 隐藏回显）
//   · service_role key 只从 .env.local 读 ✗ 不打印、不外传
//   · 全程只调 Supabase Admin API ✗ 不碰我们的业务表
//   · ★ 跑完就把新密码记进你的密码管理器 ✗ 这个脚本【不留任何痕迹】
// ─────────────────────────────────────────────────────────────

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { stdin, stdout } from 'node:process'
import { createInterface } from 'node:readline'

const HERE = dirname(fileURLToPath(import.meta.url))
const ENV_PATH = join(HERE, '..', '.env.local')

// ── ① 读 .env.local（只取需要的两个键 ✗ 其余不碰）────────────────
function loadEnv() {
  let txt
  try {
    txt = readFileSync(ENV_PATH, 'utf8')
  } catch {
    console.error(`\n★ 读不到 ${ENV_PATH}`)
    console.error('  请在【仓库根目录】跑这个脚本（它按相对路径找 .env.local）。\n')
    process.exit(1)
  }
  const out = {}
  for (const line of txt.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)$/)
    if (!m) continue
    let v = m[2].trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1)
    }
    out[m[1]] = v
  }
  return out
}

// ── ② 普通提问（回显 ✗ 用于邮箱）──────────────────────────────
function ask(question) {
  const rl = createInterface({ input: stdin, output: stdout })
  return new Promise((resolve) => rl.question(question, (a) => { rl.close(); resolve(a.trim()) }))
}

// ── ③ 隐藏回显提问（★ 用于密码 ✗ 输入的字符不出现在屏幕上）──────
function askHidden(question) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: stdin, output: stdout, terminal: true })
    // ★ 拦掉 readline 自己的回显 ✗ 只保留我们写出去的提示语
    rl._writeToOutput = () => {}
    stdout.write(question)
    rl.question('', (answer) => {
      rl.close()
      stdout.write('\n')
      resolve(answer)
    })
  })
}

// ── ④ 主流程 ────────────────────────────────────────────────
const env = loadEnv()
const url = env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY

console.log('\n──── 改密码（本地一次性工具）────\n')

if (!url) { console.error('★ .env.local 缺 NEXT_PUBLIC_SUPABASE_URL'); process.exit(1) }
if (!serviceKey) { console.error('★ .env.local 缺 SUPABASE_SERVICE_ROLE_KEY'); process.exit(1) }
console.log(`  项目：${url}`)
console.log('  ✓ 已读到 service_role key（不打印）\n')

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// 找用户：★ listUsers 不支持按邮箱过滤 ✗ 所以分页拉全量再找（账号少 ✗ 够用）
const email = await ask('要改的账号邮箱：')
if (!email) { console.error('★ 邮箱不能为空'); process.exit(1) }

console.log('\n  正在查找该账号…')
let target = null
let page = 1
for (;;) {
  const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
  if (error) { console.error(`\n★ 查用户失败：${error.message}`); process.exit(1) }
  const users = data?.users ?? []
  target = users.find((u) => (u.email ?? '').toLowerCase() === email.toLowerCase()) ?? null
  if (target) break
  if (users.length < 200) break
  page += 1
}

if (!target) { console.error(`\n★ 没找到账号：${email}`); process.exit(1) }
console.log(`  ✓ 找到：${target.email}  （id ${target.id.slice(0, 8)}… ✗ 创建于 ${target.created_at?.slice(0, 10) ?? '?'}）`)

// 输入新密码（★ 隐藏回显 ✗ 两次确认）
console.log('')
const pw1 = await askHidden('新密码（输入时不显示）：')
if (pw1.length < 12) {
  console.error(`\n★ 新密码只有 ${pw1.length} 位 —— 请至少 12 位（字母＋数字＋符号）。`)
  console.error('  ★★ 这个账号会绑定真实付款与权益，弱密码风险很高。\n')
  process.exit(1)
}
const pw2 = await askHidden('再输一次确认：')
if (pw1 !== pw2) { console.error('\n★ 两次输入不一致 ✗ 已中止。\n'); process.exit(1) }

console.log('\n  正在提交…')
const { data: updated, error: updErr } = await admin.auth.admin.updateUserById(target.id, { password: pw1 })
if (updErr) {
  console.error(`\n★ 改密码失败：${updErr.message}\n`)
  process.exit(1)
}

// ★ 只报告事实 ✗ 不打印密码
console.log('\n──── 完成 ────')
console.log(`  ✓ 账号 ${updated?.user?.email ?? target.email} 的密码已更新`)
console.log(`  ✓ 更新时间 ${new Date().toISOString()}`)
console.log('\n  ★ 请把新密码记进密码管理器 ✗ 本脚本不留任何痕迹。')
console.log('  ★★ 别忘了旧的 123456789 已作废 ✗ 若你注册过别的账号请一并处理。\n')
