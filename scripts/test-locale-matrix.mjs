// 三语覆盖矩阵（2026-11-09 用户要求）
//
// 目的：把「三语齐备」从人工记忆变成可执行检查。每个功能点都必须能指到【真实路由/真实组件】，
// 缺任一语言就失败（不看配置文件里写了名字，直接读实现文件）。
//
// 用法：node scripts/test-locale-matrix.mjs
import { readFileSync, existsSync } from 'node:fs'

const read = (p) => {
  if (!existsSync(p)) throw new Error(`文件不存在：${p}`)
  return readFileSync(p, 'utf8')
}
const L = { zh: '简体', tw: '繁体', en: '英文' }
let failures = 0
const rows = []

function check(lang, file, re, note) {
  try {
    const src = read(file)
    const ok = re.test(src)
    if (!ok) {
      failures++
      rows.push([lang, false, note, file])
    }
    return ok
  } catch (e) {
    failures++
    rows.push([lang, false, `${note}（${e.message}）`, file])
    return false
  }
}

function checkAll(langs, file, re, note) {
  return langs.map((lang) => check(lang, file, re, note))
}

function checkFile(lang, file, note) {
  if (!existsSync(file)) {
    failures++
    rows.push([lang, false, note, file])
    return false
  }
  return true
}

const SHARED_VIEWS = {
  ziwei: 'src/components/reports/ZiweiResultView.tsx',
  hemun: 'src/components/reports/HemunResultView.tsx',
  geo: 'src/components/reports/GeoResultView.tsx',
  annual: 'src/components/reports/LiunianResultView.tsx',
}
const EN_TABLES = 'src/components/en/EnRuleTables.tsx'

// ── 1. 追问入口 ──
for (const [lang, view] of Object.entries(SHARED_VIEWS)) {
  checkAll(['zh', 'tw'], view, /AskPanel/, `${lang} 共享报告视图含追问入口`)
}
for (const [lang, view] of Object.entries(SHARED_VIEWS)) {
  checkAll(['en'], view, /AskPanel/, `${lang} 共享报告视图含追问入口`)
}
check('en', 'src/app/en/reports/[id]/page.tsx', /AskPanel/, '英文报告详情页含追问入口')
check('en', 'src/app/en/liunian/Client.tsx', /AskPanel/, '英文年运页含追问入口')
check('en', 'src/app/en/hemun/Client.tsx', /AskPanel/, '英文合婚页含追问入口')
check('en', 'src/app/en/geo/Client.tsx', /AskPanel/, '英文方位页含追问入口')

// ── 2. 重新生成规则（付费规则版不限次数；免费不出现） ──
const REGEN_CLIENTS = {
  ziwei: ['src/app/(zh)/ziwei/page.tsx', 'src/app/tw/ziwei/Client.tsx', 'src/app/en/ziwei/Client.tsx'],
  hemun: ['src/app/(zh)/hemun/page.tsx', 'src/app/tw/hemun/Client.tsx', 'src/app/en/hemun/Client.tsx'],
  geo: ['src/app/(zh)/geo/page.tsx', 'src/app/tw/geo/Client.tsx', 'src/app/en/geo/Client.tsx'],
  annual: ['src/app/(zh)/liunian/page.tsx', 'src/app/tw/liunian/Client.tsx', 'src/app/en/liunian/Client.tsx'],
}
for (const [mod, files] of Object.entries(REGEN_CLIENTS)) {
  const langs = ['zh', 'tw', 'en']
  files.forEach((f, i) => {
    if (mod === 'annual') {
      check(langs[i], f, /runGenerate\(true\)/, `${mod} 重新生成入口（force 接口）`)
    } else {
      check(langs[i], f, /regen=1/, `${mod} 重新生成请求声明 regen`)
      check(langs[i], f, /runGenerate\(\{ regen: true \}\)/, `${mod} 重新生成走 regen 分支`)
    }
    check(langs[i], f, /isReportPaid\(/, `${mod} 前端只在付费后显示重新生成`)
  })
}
check('zh', 'src/app/api/ziwei/route.ts', /regenGate\(/, '接口层校验 regen（紫微）')
check('tw', 'src/app/api/hemun/route.ts', /regenGate\(/, '接口层校验 regen（合婚）')
check('en', 'src/app/api/geo/route.ts', /regenGate\(/, '接口层校验 regen（方位）')
check('zh', 'src/app/api/liunian/route.ts', /code: 'REGEN_REQUIRES_PAID'[\s\S]{0,80}status:\s*402/, '接口层校验 regen（年运）')

// ── 3. 紫微免费分层：in-depth reading 前两个模块 ──
for (const [lang, f] of Object.entries({
  zh: 'src/app/(zh)/ziwei/page.tsx',
  tw: 'src/app/tw/ziwei/Client.tsx',
  en: 'src/app/en/ziwei/Client.tsx',
})) {
  check(lang, f, /ZiweiResultView/, '紫微页渲染共享结果视图')
}
check('zh', 'src/lib/reportPreview.ts', /ziwei_deep:\s*\['overview',\s*'personality'\]/, '紫微免费白名单=前两个模块')
check('zh', 'src/components/reports/ZiweiResultView.tsx', /\['overview',\s*'命格总论'\]/, '深度解读第 1 个模块=命格总论')
check('zh', 'src/components/reports/ZiweiResultView.tsx', /\['personality',\s*'性格底色'\]/, '深度解读第 2 个模块=性格底色')
check('zh', 'src/components/reports/ZiweiResultView.tsx', /data-ziwei-paywall/, '紫微付费墙从第三个模块起可见')
check('tw', 'src/app/api/ziwei/route.ts', /pickPreviewSections/, '紫微未购只下发前两个模块（接口层）')

// ── 4. 年运免费分层：当年/当月锁定，过去开放 ──
for (const [lang, f] of Object.entries({
  zh: 'src/app/(zh)/liunian/page.tsx',
  tw: 'src/app/tw/liunian/Client.tsx',
  en: 'src/app/en/liunian/Client.tsx',
})) {
  check(lang, f, /LiunianResultView|EnLiunianRules/, '年运页渲染结果视图')
}
check('zh', SHARED_VIEWS.annual, /data-liunian-locked/, '年运共享视图锁定当年/未来年份')
check('zh', SHARED_VIEWS.annual, /data-liunian-month-locked/, '年运共享视图锁定当月/未来月份')
check('tw', SHARED_VIEWS.annual, /zonedNow/, '年运共享视图按用户时区判断过去/当年')
check('en', EN_TABLES, /data-liunian-locked/, '英文年运表锁定当年/未来年份')
check('en', EN_TABLES, /data-liunian-month-locked/, '英文年运表锁定当月/未来月份')
check('zh', 'src/lib/liunianFree.ts', /annualFreeVisible/, '过去/当年/未来判定收口为纯函数')
check('zh', 'src/app/api/liunian/route.ts', /zonedNow\(null\)\.year/, '接口层年份按用户时区取')

// ── 5. 方位免费分层：1 类开放 + 4 类锁定 ──
for (const [lang, f] of Object.entries({
  zh: 'src/app/(zh)/geo/page.tsx',
  tw: 'src/app/tw/geo/Client.tsx',
  en: 'src/app/en/geo/Client.tsx',
})) {
  check(lang, f, /GeoResultView|EnGeoRules/, '方位页渲染结果视图')
}
check('zh', SHARED_VIEWS.geo, /previewMode[\s\S]{0,160}data\.preview\?\.only/, '方位共享视图从未购态推导免费分层')
check('en', 'src/app/en/geo/Client.tsx', /previewOnly/, '英文方位把未购态传给结果视图')
check('zh', 'src/lib/reportPreview.ts', /geo:\s*\['career'\]/, '方位免费白名单=事业之城 1 类')
check('zh', 'src/lib/geo.ts', /'wealth' \| 'career' \| 'patron' \| 'home' \| 'talent'/, '方位共 5 类（1 开放 + 4 锁定）')
check('en', EN_TABLES, /PREVIEW_FREE\.geo/, '英文方位规则表按同一白名单分层')

// ── 6. 合婚免费分层 ──
for (const [lang, f] of Object.entries({
  zh: 'src/app/(zh)/hemun/page.tsx',
  tw: 'src/app/tw/hemun/Client.tsx',
  en: 'src/app/en/hemun/Client.tsx',
})) {
  check(lang, f, /HemunResultView|EnHemunRules/, '合婚页渲染结果视图')
}
check('en', 'src/app/en/hemun/Client.tsx', /previewOnly/, '英文合婚把未购态传给规则表')
check('en', EN_TABLES, /PREVIEW_FREE\.hemun/, '英文合婚规则表按同一白名单分层')
check('zh', 'src/lib/reportPreview.ts', /hemun:\s*\['yearZodiac',\s*'day',\s*'wuxing'\]/, '合婚免费白名单=3 个维度')

// ── 7. 首页区块对等（共享标签 + 三语入口） ──
for (const [lang, f] of Object.entries({
  zh: 'src/app/(zh)/HomeClient.tsx',
  tw: 'src/app/tw/page.tsx',
  en: 'src/app/en/page.tsx',
})) {
  check(lang, f, /FeatureBento|HomeSections/, '首页渲染共享区块组件')
}
check('zh', 'src/components/home/HomeSections.tsx', /data-section="features"/, '首页核心区块有稳定标记')

// ── 8. 生肖页收敛（索引 + 详情，三语六页） ──
for (const [lang, f] of Object.entries({
  zh: 'src/app/(zh)/shengxiao/page.tsx',
  tw: 'src/app/tw/shengxiao/page.tsx',
  en: 'src/app/en/shengxiao/page.tsx',
})) {
  check(lang, f, /ShengXiaoIndex/, '生肖索引页使用共享组件')
}
for (const [lang, f] of Object.entries({
  zh: 'src/app/(zh)/shengxiao/[animal]/page.tsx',
  tw: 'src/app/tw/shengxiao/[animal]/page.tsx',
  en: 'src/app/en/shengxiao/[animal]/page.tsx',
})) {
  check(lang, f, /ShengXiaoDetail/, '生肖详情页使用共享组件')
}

// ── 8b. 生肖流年页（年份页，三语同构） ──
for (const [lang, f] of Object.entries({
  zh: 'src/app/(zh)/shengxiao/[animal]/[year]/page.tsx',
  tw: 'src/app/tw/shengxiao/[animal]/[year]/page.tsx',
  en: 'src/app/en/shengxiao/[animal]/[year]/page.tsx',
})) {
  check(lang, f, /ShengXiaoYearView/, '生肖流年页使用共享组件')
}
check('zh', 'src/components/shengxiao/ShengXiaoYearView.tsx', /getLiunianEn/, '英文流年文案接入共享视图')
check('en', 'src/lib/shengxiaoYearEn.ts', /RELATION_COPY_EN/, '英文流年文案按六类太岁关系组织')

// ── 9. 每日日签与五行配色 ──
for (const [lang, f] of Object.entries({
  zh: 'src/app/(zh)/daily/page.tsx',
  tw: 'src/app/tw/daily/page.tsx',
  en: 'src/app/en/daily/page.tsx',
})) {
  check(lang, f, /DailyView/, '日签页使用共享视图')
}
check('zh', 'src/components/daily/DailyView.tsx', /data-daily-element/, '日签卡片带五行标记')
check('zh', 'src/lib/dailyElement.ts', /GAN_WUXING/, '五行取当日日柱天干（复用排盘规则）')

// ── 10. 报告宽度与配色（全站同一套令牌） ──
check('zh', 'src/app/globals.css', /--hw-bg:\s*#f1f0fa/, '全站页面底色令牌唯一')
check('tw', 'src/app/globals.css', /\.hw-c-read\s*\{[^}]*max-width/, '报告正文行宽收口')
for (const [lang, f] of Object.entries({
  zh: 'src/app/(zh)/layout.tsx',
  tw: 'src/app/tw/layout.tsx',
  en: 'src/app/en/layout.tsx',
})) {
  check(lang, f, /bg-hw-bg/, '三语 layout 共用同一底色令牌')
}

// ── 11. 报告操作按钮组 ──
for (const [lang, f] of Object.entries({
  zh: 'src/app/(zh)/reports/[id]/page.tsx',
  tw: 'src/app/tw/reports/[id]/Client.tsx',
  en: 'src/app/en/reports/[id]/page.tsx',
})) {
  check(lang, f, /ReportActions/, '报告详情页含操作按钮组')
}

// ── 12. 生成等待时长文案（按实测分档，三语全覆盖） ──
// 紫微约 1–2 分钟；合婚、方位、年运通常 30 秒内。不许四类统一写同一句。
const WAIT_FILES = {
  ziwei: {
    zh: ['src/app/(zh)/ziwei/page.tsx', /loading \?[^:]{0,80}约 1–2 分钟/],
    tw: ['src/app/tw/ziwei/Client.tsx', /loading \?[^:]{0,100}約 1–2 分鐘/],
    en: ['src/app/en/ziwei/Client.tsx', /loading \?[^:]{0,100}about 1–2 minutes/i],
  },
  hemun: {
    zh: ['src/app/(zh)/hemun/page.tsx', /loading \?[^:]{0,80}通常 30 秒内/],
    tw: ['src/app/tw/hemun/Client.tsx', /loading \?[^:]{0,100}通常 30 秒內/],
    en: ['src/app/en/hemun/Client.tsx', /loading \?[^:]{0,100}usually under 30 seconds/i],
  },
  geo: {
    zh: ['src/app/(zh)/geo/page.tsx', /loading \?[^:]{0,80}通常 30 秒内/],
    tw: ['src/app/tw/geo/Client.tsx', /loading \?[^:]{0,100}通常 30 秒內/],
    en: ['src/app/en/geo/Client.tsx', /loading \?[^:]{0,100}usually under 30 seconds/i],
  },
  annual: {
    zh: ['src/app/(zh)/liunian/page.tsx', /loading \?[^:]{0,80}通常 30 秒内/],
    tw: ['src/app/tw/liunian/Client.tsx', /loading \?[^:]{0,100}通常 30 秒內/],
    en: ['src/app/en/liunian/Client.tsx', /loading \?[^:]{0,100}usually under 30 seconds/i],
  },
}
for (const [mod, byLang] of Object.entries(WAIT_FILES)) {
  for (const [lang, [file, re]] of Object.entries(byLang)) {
    check(lang, file, re, `${mod} 等待时长分档文案`)
    // 分档校验：紫微不许退化成「30 秒」，其余三项不许写「1–2 分钟」
    const wrong = mod === 'ziwei' ? /通常 30 秒|under 30 seconds/ : /1–2 分钟|1–2 minutes/
    if (wrong.test(read(file))) {
      failures++
      rows.push([lang, false, `${mod} 等待时长未按实测分档`, file])
    }
  }
}

// ── 输出矩阵 ──
const groups = [
  ['追问入口', /追问入口/],
  ['重新生成规则', /重新生成|regen|接口层校验 regen/],
  ['紫微免费分层', /紫微|深度解读/],
  ['年运免费分层', /年运|过去\/当年/],
  ['方位免费分层', /方位/],
  ['合婚免费分层', /合婚/],
  ['首页区块对等', /首页/],
  ['生肖页收敛', /生肖/],
  ['生肖流年页', /流年页/],
  ['每日日签与五行配色', /日签|五行/],
  ['报告宽度与配色', /底色|行宽|layout/],
  ['报告操作按钮组', /操作按钮组/],
  ['生成等待时长文案', /等待时长/],
]
console.log('\n三语覆盖矩阵（✓=三语齐备，✗=缺实现）：\n')
for (const [name, re] of groups) {
  const failed = rows.filter(([, ok, note]) => !ok && re.test(note))
  const cells = failed.length === 0
    ? '✓ 简 / ✓ 繁 / ✓ 英'
    : ['zh', 'tw', 'en'].map((lang) => {
        const miss = failed.some(([l]) => l === lang)
        return miss ? `${L[lang]} ✗` : `${L[lang]} ✓`
      }).join(' / ')
  console.log(`  ${name.padEnd(16)} ${cells}`)
  for (const [, , note, file] of failed) {
    console.log(`      ✗ ${note} — ${file}`)
  }
}

console.log('')
if (failures > 0) {
  console.error(`LOCALE_MATRIX_FAIL (${failures})`)
  process.exit(1)
}
console.log('LOCALE_MATRIX_PASS')
