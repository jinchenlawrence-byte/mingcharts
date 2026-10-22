/**
 * IndexNow 批量提交（Bing / Yandex / Seznam 即时收录通道）
 *
 * 用法：
 *   node scripts/indexnow.mjs              # 提交默认集合（2027 流量窗口相关 URL）
 *   node scripts/indexnow.mjs --all        # 拉取线上 sitemap 并全量提交（上限 10000 条）
 *   node scripts/indexnow.mjs <url> [...]  # 只提交指定 URL
 *
 * 前提：public/<KEY>.txt 已部署且内容与 KEY 一致，否则搜索引擎会拒绝。
 */
const BASE = 'https://www.mingcharts.com'
const KEY = '4f2c8d9e1a7b6c3d5e0f9a2b7c4d8e61'
const KEY_LOCATION = `${BASE}/${KEY}.txt`
const ENDPOINT = 'https://api.indexnow.org/indexnow'

const ANIMALS = ['shu', 'niu', 'hu', 'tu', 'long', 'she', 'ma', 'yang', 'hou', 'ji', 'gou', 'zhu']

// 默认集合＝本轮新增/变更的页面（IndexNow 语义是「通知变更」，不是全站灌送）
const DEFAULT_PATHS = [
  '/article/2027-dingwei-nian-yunshi',
  '/article/2027-fantaishui',
  '/article/liunian-zenme-kan',
  '/article/liunian',
  '/shengxiao',
  '/liunian',
  ...ANIMALS.map((a) => `/shengxiao/${a}/2027`)
]

async function collectUrls(argv) {
  if (argv.includes('--all')) {
    const res = await fetch(`${BASE}/sitemap.xml`)
    const xml = await res.text()
    return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
  }
  const explicit = argv.filter((a) => a.startsWith('http'))
  if (explicit.length > 0) return explicit
  return DEFAULT_PATHS.map((p) => `${BASE}${p}`)
}

const urls = await collectUrls(process.argv.slice(2))
if (urls.length === 0) {
  console.error('没有可提交的 URL')
  process.exit(1)
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
