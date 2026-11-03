// 繁體頁面補完驗收（2026-11-03）
//
// 斷的是什麼：
//   ① 頁面覆蓋：公開頁（首頁/排盤/命盤/合婚/紫微/方位/命書/日運/價目/條款/隱私）在 /tw 下有路由
//   ② 每頁 metadata：canonical 指自身、hreflang 由 hantAlternates 單一來源生成
//   ③ 內鏈不回退：/tw 頁面不得再 href="/"（會把繁體用戶送回簡體首頁）
//   ④ 共用元件接受 locale：避免「頁面轉繁、結果區仍是简体」的半成品
//   ⑤ sitemap 收錄新增的繁體公開頁

import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

let allPass = true
const fail = (m) => { allPass = false; console.log('  ✗ ' + m) }
const ok = (m) => console.log('  · ' + m)

const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
const read = (p) => readFileSync(join(root, p), 'utf8')

// ---------- ① 路由覆盖 ----------
console.log('—— ① /tw 路由覆盖 ——')
{
  const routes = [
    'src/app/tw/page.tsx',
    'src/app/tw/chart/page.tsx',
    'src/app/tw/charts/page.tsx',
    'src/app/tw/hemun/page.tsx',
    'src/app/tw/ziwei/page.tsx',
    'src/app/tw/geo/page.tsx',
    'src/app/tw/mingshu/page.tsx',
    'src/app/tw/mingshu/demo/page.tsx',
    'src/app/tw/daily/page.tsx',
    'src/app/tw/pricing/page.tsx',
    'src/app/tw/terms/page.tsx',
    'src/app/tw/privacy/page.tsx',
    'src/app/tw/reports/page.tsx',
    'src/app/tw/reports/[id]/page.tsx',
    'src/app/tw/auth/page.tsx',
    'src/app/tw/jieqi/page.tsx',
    'src/app/tw/jieqi/[name]/page.tsx',
    'src/app/tw/jieri/page.tsx',
    'src/app/tw/jieri/[slug]/page.tsx',
  ]
  const missing = routes.filter((f) => !existsSync(join(root, f)))
  if (missing.length) fail(`缺繁體路由：${missing.join(', ')}`)
  else ok(`${routes.length} 个繁體路由齐备`)
}

// ---------- ② canonical + hreflang ----------
console.log('—— ② canonical 与 hreflang ——')
{
  const metaFiles = [
    ['src/app/tw/chart/page.tsx', '/tw/chart'],
    ['src/app/tw/charts/page.tsx', '/tw/charts'],
    ['src/app/tw/hemun/page.tsx', '/tw/hemun'],
    ['src/app/tw/ziwei/page.tsx', '/tw/ziwei'],
    ['src/app/tw/geo/page.tsx', '/tw/geo'],
    ['src/app/tw/mingshu/page.tsx', '/tw/mingshu'],
    ['src/app/tw/mingshu/demo/page.tsx', '/tw/mingshu/demo'],
    ['src/app/tw/daily/page.tsx', '/tw/daily'],
    ['src/app/tw/pricing/page.tsx', '/tw/pricing'],
    ['src/app/tw/terms/page.tsx', '/tw/terms'],
    ['src/app/tw/privacy/page.tsx', '/tw/privacy'],
    ['src/app/tw/reports/page.tsx', '/tw/reports'],
    ['src/app/tw/auth/page.tsx', '/tw/auth'],
  ]
  let mf = 0
  for (const [f, canonical] of metaFiles) {
    const src = read(f)
    if (!src.includes(`canonical: '${canonical}'`)) { mf++; fail(`${f} 缺 canonical ${canonical}`) }
    if (!src.includes('hantAlternates(') && !src.includes('triAlternates(')) { mf++; fail(`${f} 的 hreflang 未走 hantAlternates/triAlternates（会单向失效）`) }
  }
  // 详情的 canonical 指向列表页（不按 id 生成）
  const detail = read('src/app/tw/reports/[id]/page.tsx')
  if (!detail.includes("canonical: '/tw/reports'") || !detail.includes('hantAlternates(')) {
    mf++; fail('src/app/tw/reports/[id]/page.tsx 的 canonical/hreflang 未接上')
  }
  if (mf === 0) ok(`${metaFiles.length + 1} 个繁體页的 canonical 指自身、hreflang 同源生成`)
}

// ---------- ③ 內鏈不回退 ----------
console.log('—— ③ 繁體內鏈不回退 ——')
{
  const files = [
    'src/app/tw/page.tsx',
    'src/app/tw/chart/Client.tsx',
    'src/app/tw/charts/Client.tsx',
    'src/app/tw/hemun/Client.tsx',
    'src/app/tw/ziwei/Client.tsx',
    'src/app/tw/geo/Client.tsx',
    'src/app/tw/mingshu/MingShuContent.tsx',
    'src/app/tw/mingshu/demo/page.tsx',
    'src/app/tw/daily/page.tsx',
    'src/app/tw/pricing/page.tsx',
    'src/app/tw/reports/Client.tsx',
    'src/app/tw/reports/[id]/Client.tsx',
  ]
  let lf = 0
  for (const f of files) {
    const src = read(f)
    if (/href="\/"/.test(src)) { lf++; fail(`${f} 仍有 href="/"（會回到簡體首頁）`) }
    if (/\brouter\.push\('/.test(src)) {
      const pushes = src.match(/router\.push\('([^']*)'/g) || []
      for (const p of pushes) {
        const target = p.slice("router.push('".length, -1)
        if (!target.startsWith('/tw') && target !== '/tw') { lf++; fail(`${f} 的 router.push('${target}') 未走 /tw`) }
      }
    }
  }
  if (lf === 0) ok(`${files.length} 个繁體页/客户端组件无回退到簡體首頁的内链`)
}

// ---------- ④ 共用元件 locale ----------
console.log('—— ④ 共用元件 locale ——')
{
  const components = [
    ['src/components/BirthPlacePicker.tsx', 'locale?: SiteLang'],
    ['src/components/reports/HemunResultView.tsx', 'locale?: SiteLang'],
    ['src/components/reports/ZiweiResultView.tsx', 'locale?: SiteLang'],
    ['src/components/reports/GeoResultView.tsx', 'locale?: SiteLang'],
    ['src/components/reports/LiunianResultView.tsx', 'locale?: SiteLang'],
    ['src/components/reports/PreviewLock.tsx', 'locale?: SiteLang'],
    ['src/components/DailyShareCard.tsx', 'locale?: SiteLang'],
    ['src/components/PersonalDailySection.tsx', 'locale?: SiteLang'],
    ['src/components/AskPanel.tsx', 'locale?: SiteLang'],
    ['src/components/SaveChart.tsx', 'locale?: SiteLang'],
    ['src/components/ShareLink.tsx', 'locale?: SiteLang'],
    ['src/components/BirthForm.tsx', 'locale?: SiteLang'],
  ]
  let cf = 0
  for (const [f, needle] of components) {
    if (!read(f).includes(needle)) { cf++; fail(`${f} 未提供 ${needle}（繁體頁會露简体）`) }
  }
  // 繁體頁必須顯式傳 zh-Hant（不能依賴預設值）
  const twPages = [
    'src/app/tw/hemun/Client.tsx',
    'src/app/tw/ziwei/Client.tsx',
    'src/app/tw/geo/Client.tsx',
    'src/app/tw/chart/Client.tsx',
    'src/app/tw/daily/page.tsx',
    'src/app/tw/mingshu/MingShuContent.tsx',
    'src/app/tw/reports/[id]/Client.tsx',
  ]
  for (const f of twPages) {
    if (!read(f).includes('"zh-Hant"')) { cf++; fail(`${f} 未向共用元件下傳 zh-Hant`) }
  }
  if (cf === 0) ok(`${components.length} 个共用元件接受 locale；7 个繁體页显式下传 zh-Hant`)
}

// ---------- ⑤ sitemap ----------
console.log('—— ⑤ sitemap 收錄 ——')
{
  const { default: sitemap } = await import('../src/app/sitemap.ts')
  const urls = sitemap().map((e) => e.url)
  const need = ['/tw/hemun', '/tw/ziwei', '/tw/geo', '/tw/mingshu', '/tw/mingshu/demo',
    '/tw/daily', '/tw/pricing', '/tw/terms', '/tw/privacy', '/tw/jieqi', '/tw/jieri']
  const missing = need.filter((p) => !urls.some((u) => u.endsWith(p)))
  if (missing.length) fail(`sitemap 缺：${missing.join(', ')}`)
  else ok(`sitemap 已收錄新增的 ${need.length} 條繁體公開頁`)
  // 帳戶/交易頁不得進 sitemap（避免薄內容與隱私頁被索引）
  for (const p of ['/tw/auth', '/tw/charts', '/tw/reports', '/tw/chart']) {
    if (urls.some((u) => u.endsWith(p))) fail(`sitemap 不應收錄 ${p}（noindex 帳戶頁）`)
  }
}

// ---------- 牙口 ----------
console.log('—— 牙口自检 ——')
{
  let tf = 0
  if (/href="\/"/.test('href="/"')) tf++ // 判据本身可命中
  if (!read('src/components/BirthPlacePicker.tsx').includes('localize(')) { tf++; fail('牙口：BirthPlacePicker 没有 localize，④ 会假通过') }
  if (tf === 0) ok('牙口：内链/ locale 判据样本可触发')
}

console.log('\n' + (allPass ? 'HANT_PAGES_PASS' : 'HANT_PAGES_FAIL'))
process.exit(allPass ? 0 : 1)
