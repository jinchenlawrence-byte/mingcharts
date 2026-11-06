// 部署期构建产物瘦身：删除 .next 下的 sourcemap（*.map）
//
// 背景（2026-11-06）：单次部署可部署体积约 153 MB，其中 .next 下 *.map 约 35.7 MB（约 23%）。
// 这些 sourcemap 只在本地断点调试时需要，运行时不加载，也不参与依赖追踪。
//
// ★ 只删 .map，不删 *.nft.json：.nft.json 是 Next 的 output file tracing 清单，
//   Vercel 用它判断要打包哪些 node_modules 文件；删掉可能导致运行期缺依赖。
//
// 执行时机（不破坏本地调试能力）：
//   · 本地 `npm run build`        → 默认跳过，sourcemap 保留（可继续断点）
//   · Vercel 构建（VERCEL=1）     → 自动剥离
//   · 本地复现部署产物体积        → STRIP_SOURCE_MAPS=1 npm run build
import { readdirSync, statSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'

const enabled = process.env.VERCEL === '1' || process.env.STRIP_SOURCE_MAPS === '1'
if (!enabled) {
  console.log('[strip-deploy-maps] 本地构建：保留 sourcemap（复现部署体积请设 STRIP_SOURCE_MAPS=1）')
  process.exit(0)
}

const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
const target = join(root, '.next')

let files = 0
let bytes = 0

function walk(dir) {
  let entries
  try {
    entries = readdirSync(dir)
  } catch {
    return
  }
  for (const name of entries) {
    const p = join(dir, name)
    const st = statSync(p)
    if (st.isDirectory()) {
      walk(p)
    } else if (name.endsWith('.map')) {
      files += 1
      bytes += st.size
      unlinkSync(p)
    }
  }
}

walk(target)
console.log(`[strip-deploy-maps] 已删除 ${files} 个 .map，释放 ${(bytes / 1024 / 1024).toFixed(2)} MB`)
