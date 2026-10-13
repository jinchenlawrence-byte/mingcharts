// ★ ENFORCE 开关守护断言（HANDOFF-付费墙启用前验收 §2.1，2026-10-13）
//
// 方案 B：ENTITLEMENT_ENFORCE 由写死 false 改为 process.env.ENTITLEMENT_ENFORCE === 'true'。
// 开关本身因此成为风险面 —— 本脚本按任务书 §2.1 落【三条守护断言，缺一不可】：
//   ① 源码（去注释）不得出现 NEXT_PUBLIC_ENTITLEMENT_ENFORCE（防"顺手"加前缀进客户端 bundle）
//   ② 不设任何 env 时评估 ⇒ 必须为 false（结构断言 + 子进程运行时断言并行；
//      并做正向对照：显式设 true ⇒ 评估为 true，证明开关真的可开）
//   ③ .env.example 里该项【注释掉】且无未注释的赋值行
// 另按验收标准 §六-14 补两条：
//   ④ 源码不得硬编码 ENTITLEMENT_ENFORCE = true
//   ⑤ .env.local 未被 git 跟踪（本地验证开关不入库）
//
// 牙口锚点（任务书 §2.1 指定）：
//   ① 把常量行临时改成 NEXT_PUBLIC_ 前缀 ⇒ 断言①精确翻红
//   ② 把判定改成 !== 'false'（默认变 true，危险）⇒ 断言②精确翻红
//   ③ 把 .env.example 该行去掉注释 ⇒ 断言③精确翻红
import { readFileSync, readdirSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

let allPass = true
const ok = (m) => console.log('  ✓ ' + m)
const fail = (m) => { allPass = false; console.log('  ✗ ' + m) }
const assert = (cond, m) => (cond ? ok(m) : fail(m))

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (p) => readFileSync(path.join(root, p), 'utf8')

// 注释剥离（同 test-fatebook-onepay 先例：防注释里的示例/禁令文本误报）
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

// 收集 src 下全部 ts/tsx 源文件（去注释后拼接，供全文扫描）
function collectSrc() {
  const out = []
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name)
      if (e.isDirectory()) walk(p)
      else if (/\.(ts|tsx)$/.test(e.name)) out.push(stripComments(readFileSync(p, 'utf8')))
    }
  }
  walk(path.join(root, 'src'))
  return out.join('\n')
}

const srcAll = collectSrc()

// ─────────────────────────────────────────────────────────────
console.log('—— 守护① 源码不得出现 NEXT_PUBLIC_ENTITLEMENT_ENFORCE ——')
{
  const pat = /NEXT_PUBLIC_ENTITLEMENT_ENFORCE/g
  const n = (srcAll.match(pat) || []).length
  assert(n === 0, `src/**/*.ts,tsx 去注释后 NEXT_PUBLIC_ENTITLEMENT_ENFORCE 命中 ${n}（要求 0，防进客户端 bundle）`)
}

// ─────────────────────────────────────────────────────────────
console.log('—— 守护② 不设 env 时必须为 false（结构＋运行时＋正向对照）——')
{
  // 结构断言：常量行必须是 env 判等式（去注释后精确匹配）
  const entSrc = stripComments(read('src/lib/entitlement.ts'))
  const structPat = /export const ENTITLEMENT_ENFORCE = process\.env\.ENTITLEMENT_ENFORCE === 'true'/
  const nStruct = (entSrc.match(structPat) || []).length
  assert(nStruct === 1, `结构：entitlement.ts 常量为 env 判等式（命中 ${nStruct}，要求 1）`)

  // 运行时断言：子进程内真 import 生产模块评估常量
  // （子进程隔离：不受本进程 env 污染；temp/ 已 gitignore；.mts=ESM，支持顶层 await）
  const tmpDir = path.join(root, 'temp')
  const tmpFile = path.join(tmpDir, '__enforce_eval.mts')
  mkdirSync(tmpDir, { recursive: true })
  writeFileSync(tmpFile, [
    "const m = await import('../src/lib/entitlement.ts')",
    "console.log('ENFORCE_EVAL:' + m.ENTITLEMENT_ENFORCE)",
  ].join('\n'))
  const runEval = (envOverride) => {
    const env = { ...process.env }
    delete env.ENTITLEMENT_ENFORCE // ★ 基线：显式删掉，模拟"生产不设"
    Object.assign(env, envOverride)
    const r = spawnSync('npx', ['tsx', 'temp/__enforce_eval.mts'], {
      cwd: root, env, encoding: 'utf8', shell: process.platform === 'win32',
    })
    const out = (r.stdout || '').trim()
    const line = out.split('\n').find((l) => l.startsWith('ENFORCE_EVAL:')) || ''
    return line.slice('ENFORCE_EVAL:'.length) || `（无输出：${out || r.stderr}）`
  }
  try {
    const vOff = runEval({})
    assert(vOff === 'false', `运行时：不设 env ⇒ false（got=${vOff}，即生产恒定关闭）`)
    const vOn = runEval({ ENTITLEMENT_ENFORCE: 'true' })
    assert(vOn === 'true', `运行时：显式设 true ⇒ true（got=${vOn}，正向对照：开关真的可开）`)
  } finally {
    rmSync(tmpFile, { force: true })
  }
}

// ─────────────────────────────────────────────────────────────
console.log('—— 守护③ .env.example 该项注释掉且注明生产不设 ——')
{
  const envSrc = read('.env.example')
  const nCommented = (envSrc.match(/^#\s*ENTITLEMENT_ENFORCE=true\s*$/gm) || []).length
  const nActive = (envSrc.match(/^ENTITLEMENT_ENFORCE=/gm) || []).length
  const nPublic = (envSrc.match(/NEXT_PUBLIC_ENTITLEMENT_ENFORCE/g) || []).length
  assert(nCommented >= 1, `.env.example 含注释行「# ENTITLEMENT_ENFORCE=true」（命中 ${nCommented}）`)
  assert(/生产【不设】|生产【绝不设置】/.test(envSrc), '.env.example 注明「生产不设/绝不设置」')
  assert(nActive === 0, `.env.example 无未注释的 ENTITLEMENT_ENFORCE= 行（命中 ${nActive}，要求 0）`)
  assert(nPublic === 0, `.env.example 无 NEXT_PUBLIC_ 前缀变体（命中 ${nPublic}，要求 0）`)
}

// ─────────────────────────────────────────────────────────────
console.log('—— 附加④ 源码不得硬编码 ENTITLEMENT_ENFORCE = true ——')
{
  const pats = [/ENTITLEMENT_ENFORCE\s*=\s*true\b/g, /ENTITLEMENT_ENFORCE\s*=\s*'true'/g]
  const counts = pats.map((p) => (srcAll.match(p) || []).length)
  const total = counts.reduce((a, b) => a + b, 0)
  assert(total === 0, `src 硬编码 true 两模式命中 [${counts.join(', ')}]（要求 [0, 0]，§六-14）`)
}

// ─────────────────────────────────────────────────────────────
console.log('—— 附加⑤ .env.local 未被 git 跟踪 ——')
{
  const r = spawnSync('git', ['ls-files', '--', '.env.local'], {
    cwd: root, encoding: 'utf8', shell: process.platform === 'win32',
  })
  const tracked = (r.stdout || '').trim()
  assert(tracked === '', `.env.local 未入库（git ls-files 输出 "${tracked || '空'}"，要求空；§六-14）`)
}

console.log('\n' + (allPass ? 'ENFORCE_GUARD_PASS' : 'ENFORCE_GUARD_FAIL'))
if (!allPass) process.exit(1)
