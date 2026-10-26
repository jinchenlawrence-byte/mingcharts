// 繁体漏斗守护（2026-10-23 第 33 轮）
//
// 断的是什么：
//   ① 繁体树里不许再有指向 /bazi 的 CTA —— 那不是死链，但它【没有排盘表单】，
//      繁体访客点进去等于走进死胡同（第 33 轮修的就是这个：6 处 CTA 全指 /bazi）
//   ② 每个繁体 CTA 页面必须带「排盤頁目前為簡體版」这句语言提示
//      —— 因为排盘确实会落到简体页面，不说明比说明更糟
//   ③ 繁体流年页的 $19.99 年运报告必须是真链接（指向 /tw/liunian），不能是纯文本
//   ④ /tw/liunian 必须存在，且价格从 SKUS 取（禁止写死数字）
//   ⑤ /tw/liunian 必须在 sitemap 与 IndexNow 默认集合里
//   ⑥ 语言切换器必须按路径推导（twinPath），不许写死目标
//
// ★ 本测试全程离线：只读源码与内存里的 sitemap/集合，不起 HTTP。

import { readFileSync } from 'node:fs'
import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { SKUS, formatPriceUSD } from '../src/lib/pricing.ts'
import { indexnowDefaultPaths } from '../src/lib/indexnowPaths.ts'
// sitemap 是 default export（与 test-partner-accept.mjs 同一写法）
const { default: sitemap } = await import('../src/app/sitemap.ts')

let allPass = true
const fail = (m) => { allPass = false; console.log('  ✗ ' + m) }
const ok = (m) => console.log('  · ' + m)

const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
const read = (p) => readFileSync(join(root, p), 'utf8')

/** 递归收集 src/app/tw 下的 tsx 文件（相对路径） */
function walk(dir, acc = []) {
  for (const name of readdirSync(join(root, dir))) {
    const rel = `${dir}/${name}`
    const st = statSync(join(root, rel))
    if (st.isDirectory()) walk(rel, acc)
    else if (name.endsWith('.tsx')) acc.push(rel)
  }
  return acc
}
const twFiles = walk('src/app/tw')
const twSrc = twFiles.map((f) => ({ f, src: read(f) }))

// ---------- ① 繁体树不得有指向 /bazi 的 CTA ----------
console.log('—— ① 繁体树无 /bazi 链接 ——')
{
  const bad = twSrc.filter(({ src }) => /href="\/bazi/.test(src))
  if (bad.length) fail(`仍有指向 /bazi 的链接：${bad.map(b => b.f).join(', ')}`)
  else ok(`${twFiles.length} 个繁体 tsx 文件中无 href="/bazi"`)
}

// ---------- ② 每个 CTA 页面都有语言提示 ----------
console.log('—— ② 语言提示齐全 ——')
{
  // 这 5 个文件各有一处正文 CTA（layout 的是导航，不要求小字）
  const mustHint = [
    'src/app/tw/page.tsx',
    'src/app/tw/article/page.tsx',
    'src/app/tw/shengxiao/page.tsx',
    'src/app/tw/shengxiao/[animal]/page.tsx',
    'src/app/tw/shengxiao/[animal]/[year]/page.tsx',
    'src/app/tw/liunian/page.tsx',
  ]
  const missing = mustHint.filter((f) => !read(f).includes('目前為簡體版'))
  if (missing.length) fail(`缺「排盤頁目前為簡體版」提示：${missing.join(', ')}`)
  else ok(`${mustHint.length} 个 CTA 页面都带语言提示`)
}

// ---------- ③ 繁体流年页的年运报告是真链接 ----------
console.log('—— ③ $19.99 年运报告是链接 ——')
{
  const src = read('src/app/tw/shengxiao/[animal]/[year]/page.tsx')
  if (!/href="\/tw\/liunian"/.test(src)) fail('繁体流年页的「年運報告」没有链接到 /tw/liunian')
  else ok('繁体流年页已链接到 /tw/liunian')
  // 防退化：不允许出现「或直接生成 … 年運報告」的纯文本段（没有 <Link 在同一行附近）
  const plain = /<p[^>]*>\s*或直接生成[^<]*年運報告/.test(src)
  if (plain) fail('「或直接生成…年運報告」仍是纯文本（点不动）')
  else ok('未发现纯文本版年运报告 CTA')
}

// ---------- ④ /tw/liunian 存在，价格来自 SKUS ----------
console.log('—— ④ /tw/liunian 与价格单一来源 ——')
{
  const src = read('src/app/tw/liunian/page.tsx')
  const price = formatPriceUSD(SKUS.annual_report.priceUSD)
  if (!src.includes('formatPriceUSD(SKUS.annual_report.priceUSD)')) {
    fail('/tw/liunian 未从 SKUS 取价（可能写死数字）')
  } else ok(`/tw/liunian 用 SKUS 取价（当前 ${price}）`)
  const hardcoded = /\$\d+(\.\d+)?/.test(src)
  if (hardcoded) fail('/tw/liunian 出现了写死的价格字面量')
  else ok('/tw/liunian 无写死价格数字')
  if (!/languages:\s*hantAlternates\('\/liunian'\)/.test(src)) {
    fail('/tw/liunian 未接 hantAlternates(/liunian)，与简体页无法互指')
  } else ok('/tw/liunian 已接 hreflang 互指')
}

// ---------- ⑤ sitemap 与 IndexNow 集合都含 /tw/liunian ----------
console.log('—— ⑤ 收录与通知 ——')
{
  const paths = sitemap().map((e) => e.url)
  if (!paths.some((u) => u.endsWith('/tw/liunian'))) fail('sitemap 未收录 /tw/liunian')
  else ok('sitemap 已收录 /tw/liunian')

  const set = indexnowDefaultPaths()
  if (!set.includes('https://www.mingcharts.com/tw/liunian')) {
    fail('IndexNow 默认集合缺 /tw/liunian（第 31 轮剔除的路径应在本轮加回）')
  } else ok('IndexNow 默认集合含 /tw/liunian')
}

// ---------- ⑥ 语言切换器按路径推导 ----------
console.log('—— ⑥ 语言切换器 ——')
{
  const layout = read('src/app/tw/layout.tsx')
  if (layout.includes('href="/shengxiao"') && /简体/.test(layout)) {
    fail('layout 里仍有写死的「简体」链接（应改用 HantLangSwitch + twinPath）')
  } else if (!layout.includes('HantLangSwitch')) {
    fail('layout 未使用 HantLangSwitch')
  } else ok('layout 使用 HantLangSwitch（按 twinPath 推导目标）')

  const sw = read('src/components/HantLangSwitch.tsx')
  if (!sw.includes('twinPath') || !sw.includes('usePathname')) {
    fail('HantLangSwitch 未同时使用 usePathname 与 twinPath')
  } else ok('HantLangSwitch 使用 usePathname + twinPath')
}

console.log(allPass ? '\nTW_FUNNEL_PASS' : '\nTW_FUNNEL_FAIL')
if (!allPass) process.exitCode = 1
