// IndexNow 默认集合派生化 · 离线验收断言（第 30 轮）
//
// 断的是什么：
//   ① 每篇文章 / 每个分类 / 12 生肖 / 8 条核心页，简繁两侧都在默认集合里
//   ② 集合无重复、全部以 BASE 开头、无重复斜杠
//   ③ 条数 === 8 + 2×文章数 + 2×分类数 + 24（公式算，不写死数字）
//   ④ 繁体侧条数下限（防止有人把 /tw 又漏掉）
//   ⑤ 本测试自身不含真实请求（自检；防止为了"跑通"去碰 IndexNow 端点）
//   ⑥ 牙口自检：少一篇文章的假数据必须让 ① 变红
//
// ★ 本文件全程离线：不导入网络库、不访问任何端点。

import { readFileSync } from 'node:fs'
import {
  INDEXNOW_BASE, INDEXNOW_ANIMALS, INDEXNOW_LIUNIAN_YEAR,
  indexnowDefaultPaths, buildIndexnowPaths
} from '../src/lib/indexnowPaths.ts'
import { articles, ARTICLE_CATEGORIES } from '../src/lib/articles.ts'

let allPass = true
const fail = (m) => { allPass = false; console.log('  ✗ ' + m) }
const eq = (a, b, name) => { if (a !== b) fail(`${name}：实际 ${a}，期望 ${b}`) }

const URLS = indexnowDefaultPaths()
const SET = new Set(URLS)
const abs = (p) => `${INDEXNOW_BASE}${p}`

// 复用式检查器：返回「简繁任一缺失」的条目（牙口也用它，保证判据同源）
function missingPairs(list, items, prefix) {
  const s = new Set(list)
  return items.filter((it) => {
    const p = `${prefix}${it.slug}`
    return !s.has(abs(p)) || !s.has(abs(`/tw${p}`))
  })
}

// ---------- ① 简繁两侧齐全 ----------
console.log('—— ① 文章 / 分类 / 生肖 / 核心页 简繁齐全 ——')
{
  const missArt = missingPairs(URLS, articles, '/article/')
  if (missArt.length) fail(`文章简繁缺失 ${missArt.length} 篇：${missArt.map((a) => a.slug).join(', ')}`)
  else console.log(`  · 文章 ${articles.length} 篇 × 简繁 2 条 全部在集合内`)

  const missCat = missingPairs(URLS, ARTICLE_CATEGORIES, '/article/')
  if (missCat.length) fail(`分类简繁缺失 ${missCat.length} 个：${missCat.map((c) => c.slug).join(', ')}`)
  else console.log(`  · 分类 ${ARTICLE_CATEGORIES.length} 个 × 简繁 2 条 全部在集合内`)

  const missAnimal = INDEXNOW_ANIMALS.filter((a) => {
    const p = `/shengxiao/${a}/${INDEXNOW_LIUNIAN_YEAR}`
    return !SET.has(abs(p)) || !SET.has(abs(`/tw${p}`))
  })
  if (missAnimal.length) fail(`生肖简繁缺失 ${missAnimal.length} 个：${missAnimal.join(', ')}`)
  else console.log(`  · 生肖 ${INDEXNOW_ANIMALS.length} 个 × ${INDEXNOW_LIUNIAN_YEAR} × 简繁 2 条 全部在集合内`)

  const CORE = ['/', '/partners', '/shengxiao', '/liunian', '/tw', '/tw/partners', '/tw/shengxiao', '/tw/liunian']
  const missCore = CORE.filter((p) => !SET.has(abs(p)))
  if (missCore.length) fail(`核心页缺失 ${missCore.length} 条：${missCore.join(', ')}`)
  else console.log(`  · 核心页 ${CORE.length} 条全部在集合内`)
}

// ---------- ② 无重复 / 前缀 / 无重复斜杠 ----------
console.log('—— ② 无重复 / 全部以 BASE 开头 / 无重复斜杠 ——')
{
  if (URLS.length !== SET.size) fail(`集合有重复：length=${URLS.length}，unique=${SET.size}`)
  else console.log(`  · 无重复（${SET.size} 条）`)

  const notBase = URLS.filter((u) => !u.startsWith(INDEXNOW_BASE))
  if (notBase.length) fail(`未以 BASE 开头 ${notBase.length} 条：${notBase.slice(0, 3).join(', ')}`)

  const dbl = URLS.filter((u) => {
    const tail = u.slice(INDEXNOW_BASE.length)
    return !tail.startsWith('/') || tail.includes('//')
  })
  if (dbl.length) fail(`路径斜杠异常 ${dbl.length} 条：${dbl.slice(0, 3).join(', ')}`)
  if (!notBase.length && !dbl.length) console.log('  · 前缀与斜杠全部规范（BASE 之后单斜杠开头，无 //）')
}

// ---------- ③ 条数公式 ----------
console.log('—— ③ 条数公式 ——')
{
  const expect = 8 + 2 * articles.length + 2 * ARTICLE_CATEGORIES.length + 2 * INDEXNOW_ANIMALS.length
  eq(URLS.length, expect, '默认集合条数')
  console.log(`  · 8 + 2×${articles.length} + 2×${ARTICLE_CATEGORIES.length} + 2×${INDEXNOW_ANIMALS.length} = ${expect}`)
}

// ---------- ④ 繁体侧下限 ----------
console.log('—— ④ 繁体侧条数下限 ——')
{
  const twCount = URLS.filter((u) => u.startsWith(`${INDEXNOW_BASE}/tw/`) || u === `${INDEXNOW_BASE}/tw`).length
  const floor = articles.length + ARTICLE_CATEGORIES.length + INDEXNOW_ANIMALS.length + 4
  if (twCount < floor) fail(`繁体条数 ${twCount} < 下限 ${floor}（/tw 被漏掉？）`)
  else console.log(`  · 繁体侧 ${twCount} 条（下限 ${floor}）`)
}

// ---------- ⑤ 本测试自身不含真实请求 ----------
console.log('—— ⑤ 测试自检：无真实请求 ——')
{
  // ★ 用拼接构造 needle，避免本文件自身出现该字面量而被自己的扫描命中
  const src = readFileSync(new URL(import.meta.url), 'utf8')
  const NEEDLE_FETCH = 'fet' + 'ch('
  const NEEDLE_HOST = 'api.' + 'indexnow.org'
  if (src.includes(NEEDLE_FETCH)) fail(`本测试文件出现「${NEEDLE_FETCH}」—— 验收必须离线`)
  if (src.includes(NEEDLE_HOST)) fail(`本测试文件出现 IndexNow 端点「${NEEDLE_HOST}」—— 验收必须离线`)
  const prodSrc = readFileSync(new URL('../src/lib/indexnowPaths.ts', import.meta.url), 'utf8')
  for (const bad of ['readFile', 'readdir', 'fet' + 'ch(', 'exec']) {
    if (prodSrc.includes(bad)) fail(`indexnowPaths.ts 不是纯函数：出现 ${bad}`)
  }
  console.log('  · 测试与生产模块均无网络/文件系统调用')
}

// ---------- ⑥ 牙口自检：少一篇文章必须变红 ----------
console.log('—— ⑥ 牙口自检（假数据）——')
{
  const trimmed = articles.slice(0, -1)
  const fake = buildIndexnowPaths(trimmed, ARTICLE_CATEGORIES)
  const red = missingPairs(fake, articles, '/article/')
  const dropped = articles[articles.length - 1]
  if (red.length !== 1 || red[0].slug !== dropped.slug) {
    fail(`牙口失效：少一篇文章时 ① 未精确变红（得到 ${red.length} 篇：${red.map((a) => a.slug).join(', ') || '无'}）`)
  } else {
    console.log(`  · 删掉「${dropped.slug}」的映射 → ① 变红 1 篇（${dropped.slug}），判据有效`)
  }
  // 分类牙口：少一个分类也必须被 ① 抓到
  const fakeCat = buildIndexnowPaths(articles, ARTICLE_CATEGORIES.slice(0, -1))
  const redCat = missingPairs(fakeCat, ARTICLE_CATEGORIES, '/article/')
  if (redCat.length !== 1 || redCat[0].slug !== ARTICLE_CATEGORIES[ARTICLE_CATEGORIES.length - 1].slug) {
    fail(`分类牙口失效（得到 ${redCat.length} 个）`)
  } else {
    console.log(`  · 删掉分类「${redCat[0].slug}」的映射 → ① 变红 1 个，判据有效`)
  }
}

console.log(allPass ? '\nINDEXNOW_PATHS_PASS' : '\nINDEXNOW_PATHS_FAIL')
if (!allPass) process.exit(1)
