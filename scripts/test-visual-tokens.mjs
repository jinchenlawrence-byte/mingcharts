// 视觉统一断言（2026-11-05 统一第三批）
//
// 断的是什么：
//   ① 令牌真的定义在唯一位置（src/app/globals.css 的 :root + html[lang] 覆盖），
//      字体栈按语言分开：英文/繁体的 UI 与标题栈里不得出现中文字体兜底（Noto Sans SC / PingFang SC / Microsoft YaHei）
//   ② 页面与组件层不再出现一次性硬编码色值（hex / rgb / rgba / hsl），
//      非 CSS 场景（canvas、SVG 属性）统一收口到 src/lib/visual-tokens.ts
//   ③ 三棵树同类页面的区块节奏与卡片规格来自同一套类（.hw-sec / .hw-c-tile / .hw-c-plan），
//      简体、繁体、英文定价页取值必须相等
//   ③b 三棵树首页标题层收口到 .hw-h1 / .hw-h2，区块留白收口到 .hw-section，
//      任一树改用紧凑页标题类（hw-c-h1 / hw-c-secTitle）即 fail
//   ④ 重要提示（警示 / 免责 / 限流）走共享的 .hw-alert / .hw-alert--note，不许各页自写；
//      旧的 .hw-c-fine 已升格为「加大加粗 + 琥珀色条」
//   ⑤ 牙口自检：--self-test 会注入一个带 #ff0000 的探针文件 + 把定价页的一个 hw-sec 改回 mb-14，
//      两处断言都必须翻红（然后清理探针）
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

// ── ② 页面/组件层无硬编码色值 ───────────────────────────────
console.log('\n[2] 页面与组件层的硬编码色值')
const ALLOW_COLOR_LITERALS = new Set([
  'src/lib/visual-tokens.ts', // canvas / SVG 非 CSS 场景的唯一收口处
  'src/app/manifest.ts',      // PWA theme_color（构建期写死，无法读 CSS 变量）
  'src/lib/site-meta.ts',     // <meta name="theme-color">
])

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
assert(colorHits.length === 0, `src 下 .ts/.tsx 硬编码色值 0 处（扫描 ${srcFiles.length} 个文件）`)
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
export function homeIssues(text) {
  const issues = []
  const h1 = text.match(/<h1\s+className="[^"]*"/g) || []
  if (h1.length !== 1) issues.push(`h1 应恰好 1 处（实际 ${h1.length}）`)
  if (!/<h1\s+className="hw-h1"/.test(text)) issues.push('h1 未走共享 .hw-h1（与简体基准档位不一致）')
  const h2 = text.match(/<h2\s+className="[^"]*"/g) || []
  if (h2.length === 0) issues.push('首页缺少 h2 区块标题')
  if (h2.some((m) => !m.includes('hw-h2'))) issues.push('存在未走 .hw-h2 的 h2（区块标题档位不一致）')
  if (/hw-c-h1|hw-c-secTitle/.test(text)) issues.push('仍在使用紧凑页标题类 hw-c-h1 / hw-c-secTitle')
  if (/mb-14/.test(text)) issues.push('仍存在一次性间距 mb-14')
  return issues
}

for (const [locale, file] of Object.entries(HOME)) {
  const text = read(file)
  const issues = homeIssues(text)
  assert(issues.length === 0, `${locale} 首页：${issues.length ? issues.join('；') : 'h1/h2 与区块节奏合规'}`)
  assert(/from '@\/components\/home\/HomeSections'/.test(text), `${locale} 首页复用 HomeSections（.hw-section 节奏同源）`)
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

// ── ⑤ 牙口自检 ─────────────────────────────────────────────
if (process.argv.includes('--self-test')) {
  console.log('\n[5] 牙口自检（故意制造违规，断言必须翻红）')
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
  assert(!existsSync(probe), '探针文件已清理')
}

console.log(allPass ? '\n✅ 视觉令牌断言全部通过\n' : '\n❌ 视觉令牌断言失败\n')
process.exit(allPass ? 0 : 1)
