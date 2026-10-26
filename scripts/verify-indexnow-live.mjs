// IndexNow 默认集合 · 在线校验（第 31 轮）
//
// 为什么要有它：离线测试只能验路径形态，验不了「线上是否真的存在」。
//   第 30 轮写进集合的 /tw/liunian 在线上是 404，38 条离线断言全绿也没发现——
//   因为繁体侧根本没有流年索引页。本脚本把「默认集合 ⊆ 线上 sitemap」变成可执行断言。
//
// 用法：npm run verify:indexnow-live
//   ① 只 GET sitemap.xml（只读），不向 IndexNow 端点发任何请求
//   ② 逐条比对 indexnowDefaultPaths() 与 sitemap 的 <loc>
//   ③ 差集最多打印 10 条
//   退出码：0 = INDEXNOW_LIVE_PASS；1 = INDEXNOW_LIVE_FAIL（发现死链）；2 = INDEXNOW_LIVE_SKIP（网络不可用）
//
// ★ 不挂进 npm run verify：verify 必须保持全离线，CI 不该依赖线上可用性。
// ★ 退出码一律用 process.exitCode，不调 process.exit：Windows 下 fetch 连接句柄未关时
//   强退会触发 libuv 断言（0xC0000409），把 PASS 变成崩溃退出码，误导复核。
import { indexnowDefaultPaths } from '../src/lib/indexnowPaths.ts'

const SITEMAP_URL = 'https://www.mingcharts.com/sitemap.xml'
const TIMEOUT_MS = 20_000
const MAX_REPORT = 10

async function main() {
  const urls = indexnowDefaultPaths()
  console.log(`默认集合 ${urls.length} 条 → 拉取 sitemap 核对……`)

  let xml
  try {
    const res = await fetch(SITEMAP_URL, { signal: AbortSignal.timeout(TIMEOUT_MS) })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    xml = await res.text()
  } catch (e) {
    // ★ 网络错误与「真的发现死链」必须分开：前者不代表集合有问题
    console.log(`INDEXNOW_LIVE_SKIP（sitemap 拉取失败：${e.message}）`)
    console.log(`  这不代表集合有死链；请稍后重跑 ${SITEMAP_URL}`)
    return 2
  }

  const locs = new Set([...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim()))
  if (locs.size === 0) {
    console.log('INDEXNOW_LIVE_SKIP（sitemap 未解析出任何 <loc>，可能返回了错误页）')
    return 2
  }

  const missing = urls.filter((u) => !locs.has(u))
  if (missing.length === 0) {
    console.log(`INDEXNOW_LIVE_PASS · ${urls.length} 条全部在 sitemap 内（sitemap 共 ${locs.size} 条）`)
    return 0
  }

  console.log(`INDEXNOW_LIVE_FAIL · ${missing.length} 条不在 sitemap 内（最多列 ${MAX_REPORT} 条）：`)
  for (const u of missing.slice(0, MAX_REPORT)) console.log(`  ${u}`)
  if (missing.length > MAX_REPORT) console.log(`  …另有 ${missing.length - MAX_REPORT} 条`)
  console.log('这些 URL 可能 404，先 curl 确认；确认为 404 则从 src/lib/indexnowPaths.ts 剔除。')
  return 1
}

process.exitCode = await main()
