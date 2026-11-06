// 构建触发的守门（2026-11-05）
//
// 目的：让「改文档 / 改测试 / 改断言」这类提交不再各占一次部署。
// 背景：一次部署 130–205 MB，而 Hobby 部署存储只有 10 GB、
// Fluid Active CPU 只有 4h（滚动 30 天，超了会暂停项目）。
//
// ★ 语义陷阱（Vercel 的约定，与直觉相反）：
//   退出码 0 → 跳过构建；退出码 1 → 执行构建。
//   本测试按这个语义断言，避免有人「顺手修正」成反的。
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

let allPass = true
const failures = []
const fail = (m) => { allPass = false; failures.push(m); console.log('  ✗ ' + m) }
const ok = (m) => console.log('  · ' + m)
const assert = (c, msg, fmsg) => (c ? ok(msg) : fail(fmsg ?? msg))

/** 跑脚本并返回退出码（注入改动文件清单） */
function run(files) {
  try {
    execFileSync(process.execPath, ['scripts/should-build.mjs'], {
      env: { ...process.env, SHOULD_BUILD_FILES: files },
      stdio: 'pipe',
    })
    return 0
  } catch (e) {
    return typeof e.status === 'number' ? e.status : 1
  }
}

console.log('—— ① vercel.json 已挂上 ignoreCommand ——')
{
  const cfg = JSON.parse(readFileSync('vercel.json', 'utf8'))
  assert(cfg.ignoreCommand === 'node scripts/should-build.mjs',
    'vercel.json 的 ignoreCommand 指向 scripts/should-build.mjs',
    `ignoreCommand 未正确配置（实际 ${JSON.stringify(cfg.ignoreCommand)}）`)
  // 原有配置不得被覆盖
  assert(Array.isArray(cfg.rewrites) && cfg.rewrites.length > 0, 'rewrites 仍在（supabase 代理没丢）')
  assert(Array.isArray(cfg.crons) && cfg.crons.length > 0, 'crons 仍在（每日推送没丢）')
}

console.log('—— ② 只有构建输入才触发构建（退出码 1）——')
for (const f of [
  'src/app/page.tsx',
  'public/og.png',
  'next.config.ts',
  'package.json',
  'package-lock.json',
  'vercel.json',
]) {
  assert(run(f) === 1, `改 ${f} → 构建（1）`, `改 ${f} 未触发构建 —— 会漏发上线`)
}

console.log('—— ③ 非构建输入一律跳过（退出码 0）——')
for (const f of [
  'docs/plan.md',
  'scripts/test-nav-parity.mjs',
  'README.md',
  'HANDOFF-2026-11.md',
]) {
  assert(run(f) === 0, `改 ${f} → 跳过（0）`, `改 ${f} 仍触发构建 —— 白白增加部署体积`)
}

console.log('—— ④ 混合提交：只要有一个构建输入就构建 ——')
{
  assert(run('docs/a.md,scripts/b.mjs,src/lib/x.ts') === 1,
    '文档+脚本+源码混合 → 构建',
    '混合提交漏判 —— 改了源码却不构建')
}

console.log('')
if (allPass) console.log('BUILD_TRIGGER_PASS')
else {
  console.log(`BUILD_TRIGGER_FAIL（${failures.length} 处）`)
  for (const x of failures) console.log('  - ' + x)
}
process.exitCode = allPass ? 0 : 1
