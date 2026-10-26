/**
 * IndexNow 批量提交（Bing / Yandex / Seznam 即时收录通道）
 *
 * 用法（★ 2026-10-23 第 30 轮：默认集合改为从文章库派生，不再手工维护路径列表）：
 *   npm run seo:indexnow                     # 提交默认集合（核心页 + 全部文章/分类 + 生肖树，简繁双语）
 *   npm run seo:indexnow -- --all            # 拉取线上 sitemap 并全量提交（上限 10000 条）
 *   npm run seo:indexnow -- <url> [...]      # 只提交指定 URL
 *   npm run seo:indexnow -- --dry-run        # 只打印将提交条数与首尾 URL，不发任何请求
 *   npm run seo:indexnow -- --dry-run --all  # 同上；--all 会先拉 sitemap 计数（不碰 IndexNow 端点）
 *
 * 默认集合的唯一数据源：src/lib/indexnowPaths.ts（articles.ts + 硬编码路由树）。
 * 前提：public/<KEY>.txt 已部署且内容与 KEY 一致，否则搜索引擎会拒绝。
 */
import { indexnowDefaultPaths } from '../src/lib/indexnowPaths.ts'

const BASE = 'https://www.mingcharts.com'
const KEY = '4f2c8d9e1a7b6c3d5e0f9a2b7c4d8e61'
const KEY_LOCATION = `${BASE}/${KEY}.txt`
const ENDPOINT = 'https://api.indexnow.org/indexnow'

async function collectUrls(argv) {
  if (argv.includes('--all')) {
    const res = await fetch(`${BASE}/sitemap.xml`)
    const xml = await res.text()
    return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
  }
  const explicit = argv.filter((a) => a.startsWith('http'))
  if (explicit.length > 0) return explicit
  return indexnowDefaultPaths()
}

const argv = process.argv.slice(2)
const urls = await collectUrls(argv)
if (urls.length === 0) {
  console.error('没有可提交的 URL')
  process.exit(1)
}

// --dry-run：只展示，不发请求（排障与验收的唯一入口）
if (argv.includes('--dry-run')) {
  console.log(`[dry-run] 将提交 ${urls.length} 条（未发送任何请求）`)
  for (const u of urls.slice(0, 3)) console.log(`  ${u}`)
  if (urls.length > 6) console.log('  …')
  for (const u of urls.slice(-3)) console.log(`  ${u}`)
  process.exit(0)
}

const res = await fetch(ENDPOINT, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({
    host: new URL(BASE).host,
    key: KEY,
    keyLocation: KEY_LOCATION,
    urlList: urls
  })
})

// 200/202 = 已接收；其余状态码见 https://www.indexnow.org/documentation
console.log(`IndexNow ${res.status} ${res.statusText} · 提交 ${urls.length} 条`)
if (!res.ok) {
  console.error(await res.text())
  process.exit(1)
}
