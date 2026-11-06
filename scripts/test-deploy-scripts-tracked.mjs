// 部署期脚本的可达性守门（2026-11-05）
//
// 一天之内两次「本地能构建、Vercel 必然失败」，根因都不是代码逻辑，而是
// 「本地有、仓库没有」这类问题 —— 本地测试永远测不出来，只有真部署才暴露：
//
//   ① TurnstileNotice.tsx 提交了，但它依赖的 Turnstile.tsx 导出没提交
//   ② package.json 的 build 引用 scripts/strip-deploy-maps.mjs，
//      而该文件从未进入 git → Vercel 上 MODULE_NOT_FOUND
//   ③ .vercelignore 整目录排除 scripts/ → 部署期脚本传不上去
//
// 本测试把 ②③ 变成可断言的：凡 build / ignoreCommand 里 `node scripts/xxx` 引到的脚本，
// 必须在 git 索引里、且在 .vercelignore 里被点名放行。
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'

let allPass = true
const failures = []
const fail = (m) => { allPass = false; failures.push(m); console.log('  ✗ ' + m) }
const ok = (m) => console.log('  · ' + m)
const assert = (c, msg, fmsg) => (c ? ok(msg) : fail(fmsg ?? msg))

/** 收集所有「部署期会执行」的脚本引用 */
function deployScriptRefs() {
  const refs = new Map() // path -> 来源说明
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
  for (const [name, cmd] of Object.entries(pkg.scripts ?? {})) {
    // 只关心构建链路：build / postinstall / 以及被 build 链式调用的
    if (!/^(build|vercel-build|postinstall)$/.test(name)) continue
    for (const m of String(cmd).matchAll(/node\s+(scripts\/[\w.-]+\.mjs)/g)) {
      refs.set(m[1], `package.json → scripts.${name}`)
    }
  }
  const cfg = JSON.parse(readFileSync('vercel.json', 'utf8'))
  if (typeof cfg.ignoreCommand === 'string') {
    for (const m of cfg.ignoreCommand.matchAll(/node\s+(scripts\/[\w.-]+\.mjs)/g)) {
      refs.set(m[1], 'vercel.json → ignoreCommand')
    }
  }
  return refs
}

/** git 索引里是否有这个文件 */
function tracked(path) {
  try {
    const out = execFileSync('git', ['ls-files', '--', path], { encoding: 'utf8' }).trim()
    return out.length > 0
  } catch {
    return false
  }
}

console.log('—— ① 部署期引用的脚本都必须在 git 里 ——')
const refs = deployScriptRefs()
assert(refs.size > 0, `找到 ${refs.size} 个部署期脚本引用`, '没有找到任何部署期脚本引用（断言本身失效）')
for (const [path, from] of refs) {
  assert(existsSync(path), `${path} 在磁盘上存在`)
  assert(tracked(path),
    `${path} 已在 git 索引中（来源：${from}）`,
    `${path} 未被 git 跟踪 —— Vercel 上会 MODULE_NOT_FOUND（本地却一切正常）`)
}

console.log('—— ② .vercelignore 不得把部署期脚本挡在外面 ——')
{
  const ignore = readFileSync('.vercelignore', 'utf8')
  const lines = ignore.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'))
  // 排除 scripts 目录的规则（scripts/ 或 scripts/*）
  const excludesScriptsDir = lines.some((l) => /^scripts\/$/.test(l) || /^scripts\/\*$/.test(l))
  for (const [path] of refs) {
    if (excludesScriptsDir) {
      const allow = `!${path}`
      assert(lines.includes(allow),
        `${path} 在 .vercelignore 中被点名放行`,
        `${path} 被 scripts/ 规则排除，且没有 "!${path}" 放行 —— 部署时文件不存在`)
    }
    // 直接点名排除也不行
    assert(!lines.includes(path),
      `${path} 未被直接排除`,
      `${path} 被 .vercelignore 直接排除 —— 部署时文件不存在`)
  }
}

console.log('—— ③ build 命令引用的脚本，本地必须真能跑起来 ——')
{
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
  const build = String(pkg.scripts?.build ?? '')
  // 只做静态可达性：脚本文件存在且非空（不真跑 next build）
  for (const m of build.matchAll(/node\s+(scripts\/[\w.-]+\.mjs)/g)) {
    const size = existsSync(m[1]) ? readFileSync(m[1]).length : 0
    assert(size > 100, `${m[1]} 内容非空（${size} 字节）`, `${m[1]} 是空文件或不存在`)
  }
}

console.log('')
if (allPass) console.log('DEPLOY_SCRIPTS_PASS')
else {
  console.log(`DEPLOY_SCRIPTS_FAIL（${failures.length} 处）`)
  for (const x of failures) console.log('  - ' + x)
}
process.exitCode = allPass ? 0 : 1
