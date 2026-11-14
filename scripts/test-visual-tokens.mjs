// 视觉统一断言（2026-11-05 统一第三批）
//
// 断的是什么：
//   ① 令牌真的定义在唯一位置（src/app/globals.css 的 :root + html[lang] 覆盖），
//      字体栈按语言分开：英文/繁体的 UI 与标题栈里不得出现中文字体兜底（Noto Sans SC / PingFang SC / Microsoft YaHei）
//   ② 页面与组件层不再出现一次性硬编码色值（hex / rgb / rgba / hsl），
//     唯一目录级豁免：src/app/api/og/**（Satori 无 CSS 引擎，变量不生效）。
//      非 CSS 场景（canvas、SVG 属性）统一收口到 src/lib/visual-tokens.ts
//   ③ 三棵树同类页面的区块节奏与卡片规格来自同一套类（.hw-sec / .hw-c-tile / .hw-c-plan），
//      简体、繁体、英文定价页取值必须相等
//   ③b 三棵树首页标题层收口到 .hw-h1 / .hw-h2，Hero 走开放式 .hw-hero，
//      主区块统一由 .hw-section 承载；任一树退回卡片盒/紧凑标题类即 fail
//   ④ 重要提示（警示 / 免责 / 限流）走共享的 .hw-alert / .hw-alert--note，不许各页自写；
//      旧的 .hw-c-fine 已升格为「加大加粗 + 琥珀色条」
//   ⑤ 报告结果页 AI 正文行宽收口到 .hw-c-read（30rem）；按【路由维度】逐个解析实现：
//      12 条路径（简繁英 × 紫微/合婚/方位/年运）各自枚举共享 ResultView 导入与本地内联 AiSections，
//      任一实现漏挂即 fail；另动态枚举所有 *ResultView.tsx 与所有内联 AiSections 定义作漂移兜底；
//      该探针不得波及盘面/表格/卡片
//   ⑥ 牙口自检：--self-test 会注入带 #ff0000 的探针、把定价页 hw-sec 改回 mb-14、
//      把英文首页 h1 改回 hw-c-h1、新增一个漏挂的 ProbeResultView、去掉英文合婚的 hw-c-read、
//      新增一个漏挂的内联 AiSections，各类断言都必须翻红（然后清理探针）
//
// 运行：tsx scripts/test-visual-tokens.mjs [--self-test]

import { existsSync, readFileSync, readdirSync, statSync, writeFileSync, unlinkSync } from 'node:fs'
import { join, relative } from 'node:path'

const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
const read = (p) => readFileSync(join(root, p), 'utf8')

let allPass = true
const ok = (m) => console.log('  · ' + m)
const fail = (m) => { allPass = false; console.log('  ✗ ' + m) }
const assert = (cond, m) => (cond ? ok(m) : fail(m))

// ── ① 令牌定义 ──────────────────────────────────────────────
console.log('\n[1] 令牌定义位置与字体栈')
const css = read('src/app/globals.css')

const requiredTokens = [
  '--font-ui-sc', '--font-ui-hant', '--font-ui-latin',
  '--font-title-sc', '--font-title-hant', '--font-title-latin',
  '--font-ui', '--font-title',
  '--fs-base', '--fs-md', '--lh-base', '--lh-relaxed',
  '--fw-bold', '--fw-black',
  '--sp-section', '--sp-card', '--sp-card-lg',
  '--r-sm', '--r-md', '--r-lg', '--r-xl', '--r-2xl', '--r-pill',
  '--bd-line', '--sh-1', '--sh-2', '--sh-3',
  '--btn-h', '--btn-px', '--btn-fs', '--btn-fw',
  '--icon-sm', '--icon-md', '--icon-lg', '--icon-stroke',
  '--warn-ink', '--warn-bg', '--warn-line',
  '--danger-ink', '--danger-bg', '--danger-line',
  '--info-ink', '--info-bg', '--info-line',
  '--hw-ink', '--hw-mute', '--hw-line', '--hw-surface', '--hw-bg',
  '--hw-wood', '--hw-fire', '--hw-earth', '--hw-metal', '--hw-water',
  '--hw-woodInk', '--hw-earthInk', '--hw-fireInk',
]
const missingTokens = requiredTokens.filter((t) => !css.includes(t + ':'))
assert(missingTokens.length === 0, `:root 令牌齐备（${requiredTokens.length} 项）${missingTokens.length ? '；缺：' + missingTokens.join(', ') : ''}`)

assert(/html\[lang="en"\]\s*\{[^}]*--font-ui:\s*var\(--font-ui-latin\)/.test(css), '英文树 HTML lang=en 覆盖 UI 字体栈')
assert(/html\[lang="zh-Hant"\]\s*\{[^}]*--font-ui:\s*var\(--font-ui-hant\)/.test(css), '繁体树 HTML lang=zh-Hant 覆盖 UI 字体栈')

const latinBlock = css.match(/--font-(?:ui|title)-latin:[^;]+;/g) || []
assert(latinBlock.length === 2, '拉丁字体栈定义两套（UI + 标题）')
const cjkInLatin = latinBlock.some((b) => /Noto (?:Sans|Serif) (SC|TC)|PingFang|YaHei|JhengHei|SimSun|STSong|Songti/.test(b))
assert(!cjkInLatin, '拉丁字体栈不含中文字体兜底（英文不再用中文字体糊过去）')

// 标题栈同样按语言分离：繁体/拉丁标题不得引用简体思源宋体变量（否则字形来自中文字体）
const hantTitle = css.match(/--font-title-hant:[^;]+;/) || ['']
const latinTitle = css.match(/--font-title-latin:[^;]+;/) || ['']
assert(!hantTitle[0].includes('var(--font-serif-sc)'), '繁体标题栈不借用简体思源宋体（优先 Noto Serif TC / Songti TC）')
assert(!latinTitle[0].includes('var(--font-serif-sc)'), '拉丁标题栈不借用中文字体（英文标题走 ui-serif / Georgia）')

const requiredRules = [
  '.hw-sec', '.hw-alert', '.hw-alert--warn', '.hw-alert--danger', '.hw-alert--info', '.hw-alert--note',
  '.hw-btn', '.hw-btn--primary', '.hw-btn--secondary', '.hw-btn--danger',
  '.hw-icon', '.hw-icon-sm', '.hw-icon-lg',
]
const missingRules = requiredRules.filter((r) => !css.includes(r))
assert(missingRules.length === 0, `共享工具类齐备（${requiredRules.length} 项）${missingRules.length ? '；缺：' + missingRules.join(', ') : ''}`)

const fineBlock = css.match(/\n\.hw-c-fine\s*\{[^}]+\}/)
assert(!!fineBlock, '.hw-c-fine 仍有定义（报告页免责走共享样式）')
assert(!!fineBlock && fineBlock[0].includes('font-size: var(--fs-base)') && fineBlock[0].includes('font-weight: var(--fw-bold)'),
  '.hw-c-fine 已升格为 15px 加粗（不再 11px 灰字）')

const tokenLiteral = ['--sp-section', '--sp-card', '--r-lg'].every((v) => new RegExp(`${v}:\\s*\\d+px`).test(css))
assert(tokenLiteral, '间距/圆角令牌为具体数值（不是空引用）')

// ── ①b 四柱原有五行实色配置锁定（2026-11-09 回滚）──────────
// 用户更正：四柱（年/月/日/时柱）原样式没问题，上一轮改成浅 tint 属误判，已回滚。
// 这里正向锁定原样式（实色令牌值 + 实色底 + 深色字），并禁止再出现 .hw-g 覆盖或 --hw-*Soft 改造。
console.log('\n[1b] 四柱保持原有五行实色配置')

const hexToRgb = (h) => {
  const n = parseInt(h.replace('#', ''), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
const relLum = (hex) => {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const pickHex = (name) => {
  const m = css.match(new RegExp(`${name}:\\s*#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\\b`))
  if (!m) return ''
  const h = m[1].toLowerCase()
  return h.length === 3 ? '#' + h.split('').map((c) => c + c).join('') : '#' + h
}

const PINNED = {
  wood: { token: '#3cc796', color: '#07281c' },
  fire: { token: '#ff6b5b', color: '#3a0a05' },
  earth: { token: '#f6c24f', color: '#3a2800' },
  metal: { token: '#d6dbe6', color: '#1b1838' },
  water: { token: '#3a66ff', color: '#ffffff' },
}
const ELEMENTS = Object.keys(PINNED)

const tokenDrift = ELEMENTS.filter((e) => pickHex(`--hw-${e}`) !== PINNED[e].token)
assert(
  tokenDrift.length === 0,
  `五行实色令牌保持原值（${ELEMENTS.length} 项）${tokenDrift.length ? '；漂移：' + tokenDrift.map((e) => `${e}=${pickHex('--hw-' + e)}`).join(', ') : ''}`
)

const rulesBad = ELEMENTS.filter((e) => {
  // 行首锚定，避免误匹配 .hw-g.hw-wood 这类组合选择器
  const m = css.match(new RegExp(`(?:^|\\n)\\.hw-${e}\\s*\\{[^}]+\\}`))
  if (!m) return true
  const block = m[0]
  const wantColor = PINNED[e].color === '#ffffff' ? '#fff' : PINNED[e].color
  return (
    !new RegExp(`background:\\s*var\\(--hw-${e}\\)`).test(block) ||
    !new RegExp(`color:\\s*${wantColor}\\b`, 'i').test(block)
  )
})
assert(
  rulesBad.length === 0,
  `.hw-wood/.hw-fire… 仍为实色底 + 深色字${rulesBad.length ? '；不合规：' + rulesBad.join(', ') : ''}`
)

assert(!/\.hw-g\.hw-(wood|fire|earth|metal|water)/.test(css), '四柱格子（.hw-g）未被额外覆盖')
assert(!/--hw-\w+Soft:/.test(css), '不存在 --hw-*Soft 类改造令牌')

const lowContrast = ELEMENTS.map((e) => {
  const bg = PINNED[e].token
  const fg = PINNED[e].color
  const ratio = (Math.max(relLum(fg), relLum(bg)) + 0.05) / (Math.min(relLum(fg), relLum(bg)) + 0.05)
  return { e, r: +ratio.toFixed(2) }
}).filter((x) => x.r < 4.5)
assert(
  lowContrast.length === 0,
  `四柱文字对比度 ≥ 4.5${lowContrast.length ? '；不足：' + lowContrast.map((x) => `${x.e}=${x.r}`).join(', ') : ''}`
)

// ── ①c 全站页面底色唯一（2026-11-09 方案 B）──────────────────
// 报告页原先用 .hw-report-theme 把 --hw-bg 覆盖成米黄 #faf6ee，与首页排盘页
// 的灰底 --hw-bg #f1f0fa 形成两套底色。此处守护：报告页不得自带页面底色，
// body / .hw-page / 三棵树 layout 的页面底色必须指向同一个令牌 --hw-bg。
console.log('\n[1c] 页面底色全站统一到 --hw-bg')

const reportTheme = (css.match(/(?:^|\n)\.hw-report-theme\s*\{[^}]*\}/) || [''])[0]
assert(reportTheme.length > 0, '.hw-report-theme 作用域仍存在')

const themeBgTokens = [
  '--hw-bg', '--hw-surface', '--hw-soft', '--hw-tile', '--hw-line',
  '--hw-ink', '--hw-mute', '--color-paper', '--color-paper-dark',
  '--color-ink', '--color-ink-light',
]
const themeLeaks = themeBgTokens.filter((t) => reportTheme.includes(t + ':'))
assert(
  themeLeaks.length === 0,
  `报告页不再覆盖底色/纸面令牌${themeLeaks.length ? '；仍覆盖：' + themeLeaks.join(', ') : ''}`
)
assert(!/background\s*:/.test(reportTheme), '报告页作用域不声明 background')

const bodyRule = (css.match(/(?:^|\n)body\s*\{[^}]*\}/) || [''])[0]
assert(/background:\s*var\(--hw-bg\)/.test(bodyRule), 'body 页面底色 = var(--hw-bg)')

const pageRule = (css.match(/(?:^|\n)\.hw-page\s*\{[^}]*\}/) || [''])[0]
assert(/background:\s*var\(--hw-bg\)/.test(pageRule), '.hw-page 页面底色 = var(--hw-bg)')

assert(!/background:\s*var\(--color-paper\)/.test(css), '不再有页面用 --color-paper 另起一套底色')
assert(/--background:\s*var\(--hw-bg\)/.test(css), '--background（bg-background 入口）指向同一页面底色令牌')

const LAYOUTS = ['src/app/(zh)/layout.tsx', 'src/app/tw/layout.tsx', 'src/app/en/layout.tsx']
const layoutBad = LAYOUTS.filter((p) => {
  const src = read(p)
  return !/<body[^>]*bg-hw-bg/.test(src) || /<body[^>]*bg-paper\b/.test(src)
})
assert(
  layoutBad.length === 0,
  `三棵树 body 底色令牌一致（${LAYOUTS.length} 个 layout）${layoutBad.length ? '；不合规：' + layoutBad.join(', ') : ''}`
)

// 报告页容器不得自带页面级底色（内联 hex / style background 都算）
const reportFiles = walk(join(root, 'src')).filter((abs) => readFileSync(abs, 'utf8').includes('hw-report-theme'))
const reportBgBad = reportFiles.filter((abs) => {
  const src = readFileSync(abs, 'utf8')
  return /bg-\[#|style=\{\{[^}]*background/.test(src)
})
assert(
  reportBgBad.length === 0,
  `报告页容器未自带页面底色（扫描 ${reportFiles.length} 个文件）${reportBgBad.length ? '；命中：' + reportBgBad.map((p) => relative(root, p)).join('、') : ''}`
)

// 撤掉米黄底后，正文/次要文字在灰底与白卡上的对比度仍须 ≥ 4.5
const pageBg = pickHex('--hw-bg')
const surface = pickHex('--hw-surface')
const contrastPairs = [
  ['--hw-ink', '--hw-bg'],
  ['--hw-mute', '--hw-bg'],
  ['--hw-ink', '--hw-surface'],
  ['--hw-mute', '--hw-surface'],
]
const contrastFail = contrastPairs.filter(([fg, bg]) => {
  const a = pickHex(fg)
  const b = pickHex(bg)
  if (!a || !b) return true
  const ratio = (Math.max(relLum(a), relLum(b)) + 0.05) / (Math.min(relLum(a), relLum(b)) + 0.05)
  return ratio < 4.5
})
assert(pageBg && surface, '页面底色与卡片面令牌为具体色值')
assert(
  contrastFail.length === 0,
  `灰底撤米黄后正文对比度 ≥ 4.5${contrastFail.length ? '；不足：' + contrastFail.map(([f, b]) => `${f}/${b}`).join(', ') : ''}`
)


// ── ② 页面/组件层无硬编码色值 ───────────────────────────────
console.log('\n[2] 页面与组件层的硬编码色值')
const ALLOW_COLOR_LITERALS = new Set([
  'src/lib/visual-tokens.ts', // canvas / SVG 非 CSS 场景的唯一收口处
  'src/app/manifest.ts',      // PWA theme_color（构建期写死，无法读 CSS 变量）
  'src/lib/site-meta.ts',     // <meta name="theme-color">
])

// ★ 2026-11-14：OG 分享卡的【目录级】窄豁免，且只允许这一个目录。
//   原因：OG 图由 Satori 渲染，没有 CSS 引擎，自定义属性（CSS 变量）不生效，
//   字面色值是必要实现，不属于「页面/组件层绕过令牌」。
//   纪律：新增豁免必须同时改这一行与下面的自检，否则断言会翻红——防止顺手扩豁免。
const ALLOW_COLOR_LITERAL_DIRS = ['src/app/api/og/']

const COLOR_RE = /#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(/g

function walk(dir) {
  const out = []
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    const st = statSync(p)
    if (st.isDirectory()) {
      if (name === 'node_modules' || name === '.next') continue
      out.push(...walk(p))
    } else if (/\.(ts|tsx)$/.test(name)) {
      out.push(p)
    }
  }
  return out
}

/** 返回 [{ file, line, text }]，供断言与牙口自检共用 */
export function scanColorLiterals(files) {
  const hits = []
  for (const abs of files) {
    const rel = relative(join(root, 'src'), abs).replace(/\\/g, '/')
    const key = `src/${rel}`
    if (ALLOW_COLOR_LITERALS.has(key)) continue
    if (ALLOW_COLOR_LITERAL_DIRS.some((dir) => key.startsWith(dir))) continue
    const lines = readFileSync(abs, 'utf8').split(/\r?\n/)
    lines.forEach((line, i) => {
      const m = line.match(COLOR_RE)
      if (m) hits.push({ file: key, line: i + 1, text: line.trim().slice(0, 140) })
    })
  }
  return hits
}

const srcFiles = walk(join(root, 'src'))
const colorHits = scanColorLiterals(srcFiles)
assert(colorHits.length === 0,
  `除 src/app/api/og/** 外，src 下 .ts/.tsx 硬编码色值 0 处（扫描 ${srcFiles.length} 个文件）`)

// 牙口：豁免目录有且只有一个，且该目录真实存在 —— 防止以后顺手把别的路径塞进豁免列表
// （多一个 / 少一个 / 指向不存在的路径，都会在这里翻红）
assert(ALLOW_COLOR_LITERAL_DIRS.length === 1 && ALLOW_COLOR_LITERAL_DIRS[0] === 'src/app/api/og/',
  '色值豁免目录有且只有一个：src/app/api/og/')
assert(existsSync(join(root, 'src/app/api/og')),
  '色值豁免目录真实存在（防豁免指向已删除/拼错路径而静默扩大范围）')
if (colorHits.length) {
  for (const h of colorHits.slice(0, 12)) console.log(`      ${h.file}:${h.line}  ${h.text}`)
}

const paletteSource = read('src/lib/visual-tokens.ts')
assert(/export const BRAND_DOTS/.test(paletteSource) && /export const SHARE_PALETTE/.test(paletteSource),
  'visual-tokens.ts 收口品牌点 / canvas 调色板')

// ── ③ 三棵树同类页面对齐 ────────────────────────────────────
console.log('\n[3] 三棵树定价页区块节奏与卡片规格')
const PRICING = {
  'zh-Hans': 'src/app/(zh)/pricing/page.tsx',
  'zh-Hant': 'src/app/tw/pricing/page.tsx',
  en: 'src/app/en/pricing/page.tsx',
}

/** 纯函数：返回该页面的结构问题（牙口自检直接喂变异文本） */
export function pricingIssues(text) {
  const issues = []
  const secCount = (text.match(/hw-sec/g) || []).length
  if (secCount < 5) issues.push(`hw-sec 少于 5 处（实际 ${secCount}）`)
  if ((text.match(/hw-c-tile/g) || []).length !== 1) issues.push('hw-c-tile 应为 1 处（权益宫格）')
  if (!/hw-alert hw-alert--note/.test(text)) issues.push('底部免责未走 hw-alert--note')
  if (/mb-14/.test(text)) issues.push('仍存在一次性间距 mb-14')
  return issues
}

const secCounts = []
for (const [locale, file] of Object.entries(PRICING)) {
  const text = read(file)
  const issues = pricingIssues(text)
  assert(issues.length === 0, `${locale} 定价页：${issues.length ? issues.join('；') : '区块/卡片/免责取值合规'}`)
  secCounts.push((text.match(/hw-sec/g) || []).length)
}
assert(new Set(secCounts).size === 1, `三棵树定价页 hw-sec 计数一致（${secCounts.join(' / ')}）`)

// 同一区块的取值来自同一套 CSS 令牌：不允许在页面里写内联字号/圆角
const inlineStyleInPricing = Object.entries(PRICING).filter(([, f]) => /style=\{\{/.test(read(f))).map(([k]) => k)
assert(inlineStyleInPricing.length === 0, `定价页无内联样式覆盖令牌${inlineStyleInPricing.length ? '；有：' + inlineStyleInPricing.join(', ') : ''}`)

// ── ③b 三棵树首页标题层与区块节奏 ───────────────────────────
console.log('\n[3b] 三棵树首页标题层与区块节奏')
const HOME = {
  'zh-Hans': 'src/app/(zh)/HomeClient.tsx',
  'zh-Hant': 'src/app/tw/page.tsx',
  en: 'src/app/en/page.tsx',
}

/** 纯函数：返回首页结构问题（牙口自检直接喂变异文本） */
export function homeIssues(text, minOwnSections = 2) {
  const issues = []
  const h1 = text.match(/<h1\s+className="[^"]*"/g) || []
  if (h1.length !== 1) issues.push(`h1 应恰好 1 处（实际 ${h1.length}）`)
  if (!/<h1\s+className="hw-h1"/.test(text)) issues.push('h1 未走共享 .hw-h1（与简体基准档位不一致）')
  const h2 = text.match(/<h2\s+className="[^"]*"/g) || []
  if (h2.length === 0) issues.push('首页缺少 h2 区块标题')
  if (h2.some((m) => !m.includes('hw-h2'))) issues.push('存在未走 .hw-h2 的 h2（区块标题档位不一致）')
  if (/hw-c-h1|hw-c-secTitle/.test(text)) issues.push('仍在使用紧凑页标题类 hw-c-h1 / hw-c-secTitle')
  if (/mb-14/.test(text)) issues.push('仍存在一次性间距 mb-14')
  // 开放式版式：Hero 必须敞开（表单一进首屏就是真入口），主区块必须由 .hw-section 承载
  if (!/<div\s+className="hw-hero"/.test(text)) issues.push('缺少开放式 Hero 容器 .hw-hero')
  if (/<section\s+className="hw-c-box/.test(text)) issues.push('首页主区块仍由整块 hw-c-box 承载（应改 .hw-section）')
  const ownSections = (text.match(/<section\s+className="hw-section"/g) || []).length
  if (ownSections < minOwnSections) issues.push(`hw-section 承载的主区块少于 ${minOwnSections} 处（实际 ${ownSections}）`)
  return issues
}

// 共享首页组件自带的 .hw-section（命书样例 + 更多查询 + 功能 Bento）
const SHARED_HOME_SECTIONS = (read('src/components/home/HomeSections.tsx').match(/<section\s+className="hw-section"/g) || []).length
assert(SHARED_HOME_SECTIONS === 3, `HomeSections 提供 3 个共享 .hw-section（实际 ${SHARED_HOME_SECTIONS}）`)

// 各树自有主区块下限：功能 Bento 收进共享组件后，自有部分各减 1
const HOME_SECTION_MIN = { 'zh-Hans': 1, 'zh-Hant': 4, en: 4 }

for (const [locale, file] of Object.entries(HOME)) {
  const text = read(file)
  const issues = homeIssues(text, HOME_SECTION_MIN[locale])
  assert(issues.length === 0, `${locale} 首页：${issues.length ? issues.join('；') : '开放式 Hero + .hw-section 主区块合规'}`)
  assert(/from '@\/components\/home\/HomeSections'/.test(text), `${locale} 首页复用 HomeSections（.hw-section 节奏同源）`)
  const own = (text.match(/<section\s+className="hw-section"/g) || []).length
  console.log(`      ${locale} 首页 .hw-section：自有 ${own} + 共享 ${SHARED_HOME_SECTIONS} = 运行时 ${own + SHARED_HOME_SECTIONS}`)
}

// 首页主 CTA 规格：胶囊 + 18px + py-4（三树同一条类串，英文表单在 EnHomeForm）
const HOME_CTA = {
  'zh-Hans': HOME['zh-Hans'],
  'zh-Hant': HOME['zh-Hant'],
  en: 'src/app/en/EnHomeForm.tsx',
}
for (const [locale, file] of Object.entries(HOME_CTA)) {
  const text = read(file)
  assert(/rounded-full bg-hw-water py-4 text-lg font-bold/.test(text), `${locale} 首页主 CTA 规格统一（胶囊 + 18px + py-4）`)
}

// 档位由 CSS 令牌决定：三树共用同一个 .hw-h1 / .hw-h2 / .hw-section 定义，
// 同一视口下计算值必然相等（2026-11-05 实测 960px 宽：h1 64px / h2 40px / 区块 24-48px）
const h1Rule = css.match(/\n\.hw-h1\s*\{[^}]+\}/) || ['']
const h2Rule = css.match(/\n\.hw-h2\s*\{[^}]+\}/) || ['']
const sectionRule = css.match(/\n\.hw-section\s*\{[^}]+\}/) || ['']
assert(/clamp\(38px, 7vw, 64px\)/.test(h1Rule[0]), '首页 h1 档位唯一：.hw-h1 clamp(38px, 7vw, 64px)')
assert(/clamp\(28px, 4\.5vw, 40px\)/.test(h2Rule[0]), '首页 h2 档位唯一：.hw-h2 clamp(28px, 4.5vw, 40px)')
assert(/padding:\s*24px 0 48px/.test(sectionRule[0]), '首页区块留白唯一：.hw-section padding 24px 0 48px')

// ── ④ 重要提示统一 ──────────────────────────────────────────
console.log('\n[4] 重要提示（警示 / 免责 / 限流）走共享样式')
const ALERT_SURFACES = {
  '简·排盘页': 'src/app/(zh)/chart/page.tsx',
  '繁·排盘页': 'src/app/tw/chart/Client.tsx',
  '英·排盘页': 'src/app/en/chart/Client.tsx',
  '简·会员中心': 'src/components/member/MemberCenter.tsx',
  '简繁·支付成功': 'src/components/checkout/CheckoutSuccess.tsx',
  '简·出生表单': 'src/components/BirthForm.tsx',
  '三树·定价页': 'src/app/(zh)/pricing/page.tsx',
}
for (const [label, file] of Object.entries(ALERT_SURFACES)) {
  assert(read(file).includes('hw-alert'), `${label} 使用 .hw-alert 共享提示`)
}

// ── ⑤ 报告结果页 AI 正文行宽（按路由维度） ───────────────────
console.log('\n[5] 报告结果页 AI 正文行宽（逐路由解析实现）')
const RESULT_DIR = 'src/components/reports'

// 12 条路径 = 简繁英 × 紫微/合婚/方位/年运。
// ★ 2026-11-06 修正：旧断言只扫 src/components/reports/*ResultView.tsx，
//   看不到英文三页各自内联的 AiSections，于是「/en/hemun、/en/geo、/en/liunian
//   的 AI 区实测 1240px、无 .hw-c-read」没被任何断言拦住。
//   现在改为路由维度：先定位该路由的文件，再枚举它实际用到的 AI 容器实现。
const AI_ROUTES = {
  '/ziwei': 'src/app/(zh)/ziwei/Client.tsx',
  '/tw/ziwei': 'src/app/tw/ziwei/Client.tsx',
  '/en/ziwei': 'src/app/en/ziwei/Client.tsx',
  '/hemun': 'src/app/(zh)/hemun/page.tsx',
  '/tw/hemun': 'src/app/tw/hemun/Client.tsx',
  '/en/hemun': 'src/app/en/hemun/Client.tsx',
  '/geo': 'src/app/(zh)/geo/Client.tsx',
  '/tw/geo': 'src/app/tw/geo/Client.tsx',
  '/en/geo': 'src/app/en/geo/Client.tsx',
  '/liunian': 'src/app/(zh)/liunian/Client.tsx',
  '/tw/liunian': 'src/app/tw/liunian/page.tsx',
  '/en/liunian': 'src/app/en/liunian/Client.tsx',
}
// 入口页白名单：该路由当前只做转化入口、不渲染任何 AI 容器（不是漏挂）。
// 一旦它接上结果视图，下面的枚举会要求挂 .hw-c-read。
const ENTRY_ONLY = new Set(['/tw/liunian'])

/** 纯函数：一段源码在「AI 行宽」上的问题，供断言与牙口自检共用 */
export function aiReadIssues(text) {
  const issues = []
  if (!text.includes('hw-c-read')) issues.push('未挂 hw-c-read')
  const bad = text.split(/\r?\n/).filter((l) => l.includes('hw-c-read') && /grid|hw-c-bar|hw-c-box|overflow|<table/.test(l))
  if (bad.length) issues.push('hw-c-read 波及表格/盘面/卡片：' + bad[0].trim())
  return issues
}

/** 纯函数：从路由文件枚举 AI 容器实现（共享 ResultView 导入 + 本地内联 AiSections） */
export function aiSourcesOf(text) {
  const out = []
  for (const m of text.matchAll(/@\/components\/reports\/(\w+ResultView)/g)) {
    out.push(`${RESULT_DIR}/${m[1]}.tsx`)
  }
  if (/function AiSections\s*\(/.test(text)) out.push('__SELF__')
  return [...new Set(out)]
}

for (const [route, file] of Object.entries(AI_ROUTES)) {
  if (!existsSync(join(root, file))) { fail(`${route} 路由文件不存在：${file}`); continue }
  const text = read(file)
  const sources = aiSourcesOf(text).map((s) => (s === '__SELF__' ? file : s))
  if (sources.length === 0) {
    assert(ENTRY_ONLY.has(route), `${route} 未枚举到任何 AI 容器实现（仅入口页允许无结果视图）`)
    continue
  }
  const issues = sources.flatMap((s) => aiReadIssues(read(s)).map((i) => `${s}：${i}`))
  assert(issues.length === 0, `${route} AI 区挂 .hw-c-read（实现：${sources.join(' / ')}）${issues.length ? '；' + issues.join('；') : ''}`)
}

// 漂移兜底 A：共享 ResultView 动态枚举（新增第五个实现而漏挂即 fail）
const resultViews = readdirSync(join(root, RESULT_DIR)).filter((f) => f.endsWith('ResultView.tsx'))
const missingRead = resultViews.filter((f) => !read(`${RESULT_DIR}/${f}`).includes('hw-c-read'))
assert(resultViews.length >= 4, `发现 ${resultViews.length} 个 ResultView 实现（≥4）`)
assert(missingRead.length === 0, `所有 ResultView 的 AI 区块都挂了 hw-c-read${missingRead.length ? '；漏挂：' + missingRead.join('、') : ''}`)

// 漂移兜底 B：全 src 扫「自定义 AiSections」——新增一套内联实现而漏挂，自动入网
const inlineAiFiles = walk(join(root, 'src')).filter((abs) => /function AiSections\s*\(/.test(readFileSync(abs, 'utf8')))
const inlineAiMissing = inlineAiFiles.filter((abs) => !readFileSync(abs, 'utf8').includes('hw-c-read'))
assert(inlineAiFiles.length >= 3, `发现 ${inlineAiFiles.length} 处内联 AiSections 实现（英文三页）`)
assert(inlineAiMissing.length === 0,
  `所有内联 AiSections 都挂了 hw-c-read${inlineAiMissing.length ? '；漏挂：' + inlineAiMissing.map((p) => relative(root, p)).join('、') : ''}`)

assert(/\.hw-c-read\s*\{[^}]*max-width:\s*30rem/.test(css), '.hw-c-read 定义 30rem（480px）可读行宽')
assert(/\.hw-c-read\s*\{[^}]*margin-inline:\s*auto/.test(css), '.hw-c-read 居中')
// hw-c-read 只能挂在 AI 区块容器上：不得同时出现在 grid / 表格 / 盘面 / 卡片类上
for (const f of resultViews) {
  const bad = read(`${RESULT_DIR}/${f}`)
    .split(/\r?\n/)
    .filter((line) => line.includes('hw-c-read'))
    .filter((line) => /grid|hw-c-bar|hw-c-box|overflow|<table/.test(line))
  assert(bad.length === 0, `${f} 的 hw-c-read 只挂 AI 容器，未波及表格/盘面/卡片${bad.length ? '；越界：' + bad[0].trim() : ''}`)
}

// ⑤b 报告页宽度分层：外层内容区放宽到 800–900px，只有 AI 长文收窄
const reportRule = css.match(/\.hw-c-report\s*\{[^}]*max-width:\s*(\d+)px/)
assert(
  reportRule && Number(reportRule[1]) >= 800 && Number(reportRule[1]) <= 900,
  `报告正文外层 .hw-c-report 取 800–900px（当前 ${reportRule ? reportRule[1] + 'px' : '未定义'}）`
)
const REPORT_DETAIL_PAGES = {
  '/reports/[id]': 'src/app/(zh)/reports/[id]/page.tsx',
  '/tw/reports/[id]': 'src/app/tw/reports/[id]/Client.tsx',
  '/en/reports/[id]': 'src/app/en/reports/[id]/page.tsx',
}
for (const [label, file] of Object.entries(REPORT_DETAIL_PAGES)) {
  const text = read(file)
  assert(text.includes('hw-c-report'), `${label} 报告正文外层使用 .hw-c-report（整页不再被 640px 卡窄）`)
  const bad = text
    .split(/\r?\n/)
    .filter((line) => line.includes('hw-c-report') && line.includes('hw-c-read'))
  assert(bad.length === 0, `${label} 不得把 hw-c-read 套到整页容器上${bad.length ? '；越界：' + bad[0].trim() : ''}`)
}

// ── ⑥ 牙口自检 ─────────────────────────────────────────────
if (process.argv.includes('--self-test')) {
  console.log('\n[6] 牙口自检（故意制造违规，断言必须翻红）')
  const probe = join(root, 'src/components/__visual_probe.tsx')
  writeFileSync(probe, 'export default function Probe() { return <div className="text-[#ff0000]">x</div> }\n', 'utf8')
  try {
    const hits = scanColorLiterals([probe])
    assert(hits.length > 0, '探针 #ff0000 被色值扫描抓出')
    if (hits.length) console.log(`      命中：${hits[0].file}:${hits[0].line}`)
  } finally {
    unlinkSync(probe)
  }
  const mutated = read(PRICING['zh-Hans']).replace('className="hw-sec"', 'className="mb-14"')
  const issues = pricingIssues(mutated)
  assert(issues.length > 0, '把一页 hw-sec 改回 mb-14 → 结构断言翻红')
  if (issues.length) console.log(`      命中：${issues.join('；')}`)

  // 首页牙口：把英文首页 h1 改回紧凑页标题类，档位断言必须翻红
  const homeMutated = read(HOME.en).replace('<h1 className="hw-h1"', '<h1 className="hw-c-h1"')
  const homeProbe = homeIssues(homeMutated)
  assert(homeProbe.length > 0, '把英文首页 h1 改回 hw-c-h1 → 首页档位断言翻红')
  if (homeProbe.length) console.log(`      命中：${homeProbe.join('；')}`)

  // 首页牙口：把繁体一个主区块改回卡片盒，开放式版式断言必须翻红
  const cardMutated = read(HOME['zh-Hant']).replace(
    '<section className="hw-section"',
    '<section className="hw-c-box mb-6"'
  )
  const cardProbe = homeIssues(cardMutated, HOME_SECTION_MIN['zh-Hant'])
  assert(cardProbe.length > 0, '把繁体一个 hw-section 改回卡片盒 → 开放式版式断言翻红')
  if (cardProbe.length) console.log(`      命中：${cardProbe.join('；')}`)

  // 行宽牙口 A：英文内联实现去掉 hw-c-read，路由级断言必须翻红
  const enHemunMutated = read(AI_ROUTES['/en/hemun']).replace('mt-6 hw-c-read', 'mt-6')
  const routeProbe = aiReadIssues(enHemunMutated)
  assert(routeProbe.length > 0, '英文合婚去掉 hw-c-read → 路由级行宽断言翻红')
  if (routeProbe.length) console.log(`      命中：${routeProbe.join('；')}`)

  // 行宽牙口 B：新增一套内联 AiSections 且漏挂，枚举与判据都必须翻红
  const inlineProbe = join(root, 'src/components/__visual_inline_probe.tsx')
  writeFileSync(inlineProbe, 'function AiSections() { return <div className="space-y-4"><p>x</p></div> }\nexport default AiSections\n', 'utf8')
  try {
    const txt = readFileSync(inlineProbe, 'utf8')
    assert(aiSourcesOf(txt).includes('__SELF__'), '新增内联 AiSections 被路由枚举识别')
    assert(aiReadIssues(txt).length > 0, '新增内联 AiSections 漏挂 hw-c-read → 行宽断言翻红')
    assert(!txt.includes('hw-c-read'), '内联探针确为漏挂形态')
  } finally {
    unlinkSync(inlineProbe)
  }
  assert(!existsSync(inlineProbe), '内联行宽探针已清理')

  // 行宽牙口：新增第五个 ResultView 且漏挂 hw-c-read，断言必须翻红
  const viewProbe = join(root, RESULT_DIR, 'ProbeResultView.tsx')
  writeFileSync(viewProbe, 'export default function ProbeResultView() { return <div /> }\n', 'utf8')
  try {
    const probed = readdirSync(join(root, RESULT_DIR))
      .filter((f) => f.endsWith('ResultView.tsx'))
      .filter((f) => !read(`${RESULT_DIR}/${f}`).includes('hw-c-read'))
    assert(probed.includes('ProbeResultView.tsx'), '新增第五个 ResultView 漏挂 hw-c-read → 行宽断言翻红')
    console.log(`      命中：${probed.join('、')} 未挂 hw-c-read`)
  } finally {
    unlinkSync(viewProbe)
  }
  assert(!existsSync(viewProbe), '行宽探针文件已清理')
  assert(!existsSync(probe), '探针文件已清理')
}

console.log(allPass ? '\n✅ 视觉令牌断言全部通过\n' : '\n❌ 视觉令牌断言失败\n')
process.exit(allPass ? 0 : 1)
