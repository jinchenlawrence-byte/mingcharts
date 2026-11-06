// Vercel「Ignored Build Step」判定（被 vercel.json 的 ignoreCommand 调用）
//
// ★ 语义（Vercel 的约定，与直觉相反，务必记住）：
//     退出码 0  → 【跳过构建】
//     退出码 1  → 【执行构建】
//   这也是官方推荐命令 `git diff --quiet HEAD^ HEAD` 的用法：
//   有差异时 git diff 返回 1 → 构建；无差异返回 0 → 跳过。
//
// 为什么需要它（2026-11-05 实测）：
//   一次部署约 130–205 MB，而 Vercel Hobby 的部署存储只有 10 GB、
//   Fluid Active CPU 只有 4h（滚动 30 天，超了会暂停项目）。
//   改文档 / 改测试 / 改断言这类提交完全不需要重新构建，却各占一份存储和一次构建。
//
// 判定：只要碰了构建输入，就构建；只碰文档、脚本、测试说明，就跳过。
import { execSync } from 'node:child_process'

/** 触发构建的路径（其余一律跳过） */
const BUILD_INPUTS = [
  /^src\//,
  /^public\//,
  /^next\.config\.(ts|js|mjs|cjs)$/,
  /^package\.json$/,
  /^package-lock\.json$/,
  /^vercel\.json$/,
  /^\.vercelignore$/, // 影响哪些文件被上传 —— 改它必须重建
  /^scripts\/(should-build|strip-deploy-maps)\.mjs$/, // 部署期脚本
  /^postcss\.config\./, // 样式管线
  /^tsconfig\.json$/,
]

/** 枚举本次提交改动的文件；测试时可用 SHOULD_BUILD_FILES 注入 */
function changedFiles() {
  const injected = process.env.SHOULD_BUILD_FILES
  if (injected !== undefined) {
    return injected.split(',').map((s) => s.trim()).filter(Boolean)
  }
  // Vercel 克隆带历史；本地同样适用。取不到就保守构建。
  try {
    const out = execSync('git diff --name-only HEAD^ HEAD', { encoding: 'utf8' })
    return out.split('\n').map((s) => s.trim()).filter(Boolean)
  } catch {
    return null // 没有 HEAD^（首次提交）等 → 必须构建
  }
}

const files = changedFiles()
if (!files) {
  console.log('[should-build] 无法取到 diff（首次提交/无历史）→ 构建')
  process.exit(1)
}

const hits = files.filter((f) => BUILD_INPUTS.some((re) => re.test(f)))
if (hits.length) {
  console.log(`[should-build] 构建：${hits.length} 个构建输入变动，例如 ${hits.slice(0, 3).join(', ')}`)
  process.exit(1)
}

console.log(`[should-build] 跳过：${files.length} 个文件均非构建输入（${files.slice(0, 3).join(', ')}${files.length > 3 ? ' …' : ''}）`)
process.exit(0)
