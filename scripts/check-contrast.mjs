// 对比度与可读性闸门（2026-11-05）
// 零依赖、离线、确定性：解析 src/app/globals.css 的 :root 令牌，按 WCAG 2.x 相对亮度算实际色对。
// 同时守护「令牌映射 / 低对比写法 / 英文正文行宽」三类回归，任一失败 exit 1，接进 npm run verify。
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const CSS_PATH = path.join(ROOT, 'src', 'app', 'globals.css')

const failures = []
const notes = []

function readTokens(css, startMarker) {
  const start = css.indexOf(startMarker)
  if (start < 0) throw new Error(`missing ${startMarker} in globals.css`)
  const end = css.indexOf('}', start)
  const block = css.slice(start, end)
  const tokens = {}
  for (const m of block.matchAll(/--([\w-]+):\s*([^;]+);/g)) tokens[m[1]] = m[2].trim()
  return tokens
}

function resolveColor(name, tokens, depth = 0) {
  if (depth > 8) return null
  const raw = tokens[name]
  if (!raw) return null
  const varMatch = raw.match(/^var\(--([\w-]+)\)$/)
  if (varMatch) return resolveColor(varMatch[1], tokens, depth + 1)
  if (/^#[0-9a-fA-F]{3,6}$/.test(raw)) return raw
  return null
}

function hexToRgb(hex) {
  let s = hex.replace('#', '')
  if (s.length === 3) s = s.split('').map((c) => c + c).join('')
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)]
}

function luminance(rgb) {
  const lin = (c) => {
    const v = c / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  }
  const [r, g, b] = rgb.map(lin)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(fg, bg) {
  const a = luminance(hexToRgb(fg))
  const b = luminance(hexToRgb(bg))
  const hi = Math.max(a, b)
  const lo = Math.min(a, b)
  return (hi + 0.05) / (lo + 0.05)
}

function blend(fg, bg, alpha) {
  const f = hexToRgb(fg)
  const b = hexToRgb(bg)
  const mix = f.map((c, i) => Math.round(alpha * c + (1 - alpha) * b[i]))
  return '#' + mix.map((c) => c.toString(16).padStart(2, '0')).join('')
}

const css = fs.readFileSync(CSS_PATH, 'utf8')
const light = readTokens(css, ':root')
const themeInlineStart = css.indexOf('@theme inline')
if (themeInlineStart < 0) throw new Error('missing @theme inline in globals.css')
const themeInline = css.slice(themeInlineStart, css.indexOf('}', themeInlineStart))

// ── 1. 令牌映射：四个语义深色文字必须能从 Tailwind 取到 ──
const REQUIRED_THEME = [
  ['--color-danger-ink', '--danger-ink'],
  ['--color-warn-ink', '--warn-ink'],
  ['--color-info-ink', '--info-ink'],
  ['--color-ok-ink', '--ok-ink'],
]
for (const [alias, source] of REQUIRED_THEME) {
  const re = new RegExp(`${alias}:\\s*var\\(${source}\\)`)
  if (!re.test(themeInline)) failures.push(`@theme inline 缺少映射：${alias}: var(${source})`)
  if (!light[source.replace('--', '')]) failures.push(`:root 缺少令牌：${source}`)
}

// ── 2. 实际落地色对的 WCAG 校验（正常字号阈值 4.5:1）──
const PAIRS = [
  ['正文 ink / 宣纸 paper', '--color-ink', '--color-paper', 4.5],
  ['正文 ink / 卡片白 surface', '--color-ink', '--hw-surface', 4.5],
  ['辅助 ink-light / 宣纸 paper', '--color-ink-light', '--color-paper', 4.5],
  ['辅助 ink-light / 卡片白 surface', '--color-ink-light', '--hw-surface', 4.5],
  ['辅助 ink-light / 深纸 paper-dark', '--color-ink-light', '--color-paper-dark', 4.5],
  ['弱化 hw-mute / 卡片白 surface', '--hw-mute', '--hw-surface', 4.5],
  ['弱化 hw-mute / 宣纸 paper', '--hw-mute', '--color-paper', 4.5],
  ['错误 danger-ink / 宣纸 paper', '--danger-ink', '--color-paper', 4.5],
  ['错误 danger-ink / 卡片白 surface', '--danger-ink', '--hw-surface', 4.5],
  ['错误 danger-ink / 告警底 danger-bg', '--danger-ink', '--danger-bg', 4.5],
  ['警示 warn-ink / 警示底 warn-bg', '--warn-ink', '--warn-bg', 4.5],
  ['信息 info-ink / 信息底 info-bg', '--info-ink', '--info-bg', 4.5],
  ['完成 ok-ink / 完成底 okBg', '--ok-ink', '--hw-okBg', 4.5],
]

const width = Math.max(...PAIRS.map(([name]) => name.length), ...REQUIRED_THEME.map(([a]) => a.length))
let checked = 0
for (const [name, fgName, bgName, min] of PAIRS) {
  const fg = resolveColor(fgName.replace('--', ''), light)
  const bg = resolveColor(bgName.replace('--', ''), light)
  if (!fg || !bg) {
    failures.push(`${name}: 令牌无法解析为色值（${fgName} / ${bgName}）`)
    continue
  }
  const ratio = contrast(fg, bg)
  const ok = ratio >= min
  checked++
  console.log(`${name.padEnd(width)}  ${fg} on ${bg}  ${ratio.toFixed(2)}:1  ${ok ? 'PASS' : 'FAIL'} (need ${min}:1)`)
  if (!ok) failures.push(`${name}: ${ratio.toFixed(2)}:1 < ${min}:1`)
}

// ── 2b. 报告页主题（.hw-report-theme 只做语义色校准，底色继承 :root）──
function readRuleBlock(source, selector, from = 0) {
  const start = source.indexOf(selector, from)
  if (start < 0) return null
  const open = source.indexOf('{', start)
  const close = source.indexOf('}', open)
  const block = source.slice(open, close)
  const tokens = {}
  for (const m of block.matchAll(/--([\w-]+):\s*([^;]+);/g)) tokens[m[1]] = m[2].trim()
  return { tokens, index: start }
}

const reportLightRule = readRuleBlock(css, '.hw-report-theme {')
if (!reportLightRule) failures.push('globals.css 缺少 .hw-report-theme（报告页主题）')
// 2026-11-09 方案 B：报告页不再自带宣纸底色与暗色覆盖，底色/卡片面回落到 :root
// 同一套令牌（--hw-bg / --hw-surface），这里只需按「:root + 报告页语义色」合并计算。
const reportDarkRule = null

const REPORT_PAIRS = [
  ['报告正文 ink / 页面底', '--color-ink', '--hw-bg'],
  ['报告正文 ink / 卡片面', '--color-ink', '--hw-surface'],
  ['报告次要 ink-light / 页面底', '--color-ink-light', '--hw-bg'],
  ['报告次要 ink-light / 卡片面', '--color-ink-light', '--hw-surface'],
  ['朱砂强调 / 卡片面', '--color-cinnabar', '--hw-surface'],
  ['五行木 / 卡片面', '--hw-woodInk', '--hw-surface'],
  ['五行火 / 卡片面', '--hw-fireInk', '--hw-surface'],
  ['五行土 / 卡片面', '--hw-earthInk', '--hw-surface'],
  ['五行金 / 卡片面', '--hw-metalInk', '--hw-surface'],
  ['五行水 / 卡片面', '--hw-water', '--hw-surface'],
  ['吉徽章 / 吉底', '--hw-woodInk', '--hw-okBg'],
  ['平徽章 / 中性底', '--hw-mute', '--hw-tile'],
  ['忌徽章 / 忌底', '--danger-ink', '--danger-bg'],
  ['分类财富 / 卡片面', '--hw-cat-wealth', '--hw-surface'],
  ['分类事业 / 卡片面', '--hw-cat-career', '--hw-surface'],
  ['分类贵人 / 卡片面', '--hw-cat-patron', '--hw-surface'],
  ['分类安居 / 卡片面', '--hw-cat-home', '--hw-surface'],
  ['分类才华 / 卡片面', '--hw-cat-talent', '--hw-surface'],
]

for (const [mode, rule] of [['亮色', reportLightRule], ['暗色', reportDarkRule]]) {
  if (!rule) continue
  const merged = { ...light, ...rule.tokens }
  for (const [name, fgName, bgName] of REPORT_PAIRS) {
    const fg = resolveColor(fgName.replace('--', ''), merged)
    const bg = resolveColor(bgName.replace('--', ''), merged)
    if (!fg || !bg) {
      failures.push(`[${mode}] ${name}: 令牌无法解析为色值（${fgName} / ${bgName}）`)
      continue
    }
    const ratio = contrast(fg, bg)
    checked++
    const ok = ratio >= 4.5
    console.log(`[${mode}] ${name.padEnd(width)}  ${fg} on ${bg}  ${ratio.toFixed(2)}:1  ${ok ? 'PASS' : 'FAIL'} (need 4.5:1)`)
    if (!ok) failures.push(`[${mode}] ${name}: ${ratio.toFixed(2)}:1 < 4.5:1`)
  }
}


// ── 2b. 暗色主题（prefers-color-scheme: dark）：text-ink 系列色对必须同样 ≥4.5 ──
// ★ 2026-11-09：此前暗色令牌完全没进色对校验，暗色下墨色/卡片面可能同亮 → 白字压白卡也测不出来。
function readDarkTokens(source) {
  const mediaStart = source.indexOf('@media (prefers-color-scheme: dark)')
  if (mediaStart < 0) return null
  const rootStart = source.indexOf(':root', mediaStart)
  if (rootStart < 0) return null
  const open = source.indexOf('{', rootStart)
  let depth = 0
  let end = -1
  for (let i = open; i < source.length; i++) {
    if (source[i] === '{') depth++
    else if (source[i] === '}') {
      depth--
      if (depth === 0) { end = i; break }
    }
  }
  if (end < 0) return null
  const tokens = {}
  for (const m of source.slice(open, end).matchAll(/--([\w-]+):\s*([^;]+);/g)) tokens[m[1]] = m[2].trim()
  return tokens
}

const darkTokens = readDarkTokens(css)
if (!darkTokens) {
  failures.push('globals.css 缺少 @media (prefers-color-scheme: dark) 的 :root 暗色令牌')
} else {
  // 暗色必须真的覆盖页面底/卡片面/墨色，否则令牌回落到亮色值（等于没做暗色）
  for (const required of ['hw-bg', 'hw-surface', 'hw-ink', 'hw-mute', 'color-ink', 'color-ink-light']) {
    if (!darkTokens[required]) failures.push(`暗色主题缺少 --${required} 覆盖（暗色下会落回亮色令牌）`)
  }
  const mergedDark = { ...light, ...darkTokens }
  const DARK_PAIRS = [
    ['暗色 正文 ink / 页面底', '--color-ink', '--hw-bg'],
    ['暗色 正文 ink / 卡片面', '--color-ink', '--hw-surface'],
    ['暗色 辅助 ink-light / 页面底', '--color-ink-light', '--hw-bg'],
    ['暗色 辅助 ink-light / 卡片面', '--color-ink-light', '--hw-surface'],
    ['暗色 弱化 hw-mute / 卡片面', '--hw-mute', '--hw-surface'],
    ['暗色 正文 hw-ink / 卡片面', '--hw-ink', '--hw-surface'],
  ]
  for (const [name, fgName, bgName] of DARK_PAIRS) {
    const fg = resolveColor(fgName.replace('--', ''), mergedDark)
    const bg = resolveColor(bgName.replace('--', ''), mergedDark)
    if (!fg || !bg) {
      failures.push(`${name}: 令牌无法解析为色值（${fgName} / ${bgName}）`)
      continue
    }
    const ratio = contrast(fg, bg)
    checked++
    const ok = ratio >= 4.5
    console.log(`${name.padEnd(width)}  ${fg} on ${bg}  ${ratio.toFixed(2)}:1  ${ok ? 'PASS' : 'FAIL'} (need 4.5:1)`)
    if (!ok) failures.push(`${name}: ${ratio.toFixed(2)}:1 < 4.5:1`)
  }
}


const baselines = [
  ['改前 ink-light@60% / 宣纸 paper', '--color-ink-light', '--color-paper'],
  ['改前 ink-light@60% / 卡片白 surface', '--color-ink-light', '--hw-surface'],
]
for (const [name, fgName, bgName] of baselines) {
  const fg = resolveColor(fgName.replace('--', ''), light)
  const bg = resolveColor(bgName.replace('--', ''), light)
  const mixed = blend(fg, bg, 0.6)
  const ratio = contrast(mixed, bg)
  notes.push(`${name}: ${mixed} on ${bg} = ${ratio.toFixed(2)}:1`)
}

// ── 2c. 每日日签五行配色：5 个五行 × 明暗两套主题，全部 ≥4.5 ──
// 色板唯一来源是 src/lib/dailyElement.ts；tint 必须落在 8–10%（浅）/14%（深）附近，
// 字色由 inkOn() 按背景实际亮度选择——这里用同一条判据复算，避免「跳过暗色主题」。
const DAILY_ELEMENT_PATH = path.join(ROOT, 'src', 'lib', 'visual-tokens.ts')
const dailyElementSrc = fs.readFileSync(DAILY_ELEMENT_PATH, 'utf8')
const PALETTE_RE =
  /(wood|fire|earth|metal|water):\s*\{\s*bar:\s*'(#[0-9a-fA-F]{6})',\s*tint:\s*'(#[0-9a-fA-F]{6})',\s*tintDark:\s*'(#[0-9a-fA-F]{6})'\s*\}/g
const ELEMENTS = ['wood', 'fire', 'earth', 'metal', 'water']
const palette = {}
for (const m of dailyElementSrc.matchAll(PALETTE_RE)) {
  palette[m[1]] = { bar: m[2], tint: m[3], tintDark: m[4] }
}
const missing = ELEMENTS.filter((e) => !palette[e])
if (missing.length) failures.push(`日签五行色板缺项：${missing.join(', ')}`)

const inkOnFor = (bg) => (luminance(hexToRgb(bg)) > 0.5 ? '#1b1838' : '#ffffff')
const DARK_SURFACE = '#1a1a2e'
for (const el of ELEMENTS) {
  const p = palette[el]
  if (!p) continue
  const maxDelta = (a, b) => Math.max(...hexToRgb(a).map((c, i) => Math.abs(c - hexToRgb(b)[i])))
  // 浅底 = 元素色 9% 叠白
  const lightMix = blend(p.bar, '#ffffff', 0.09)
  if (maxDelta(lightMix, p.tint) > 3) {
    failures.push(`日签${el} 浅底 ${p.tint} 与「${p.bar} 9% 叠白」${lightMix} 偏差过大（应在 8–10%）`)
  }
  // 深底 = 元素色 14% 叠暗面
  const darkMix = blend(p.bar, DARK_SURFACE, 0.14)
  if (maxDelta(darkMix, p.tintDark) > 3) {
    failures.push(`日签${el} 深底 ${p.tintDark} 与「${p.bar} 14% 叠 ${DARK_SURFACE}」${darkMix} 偏差过大`)
  }
  // 色带必须复用 :root 的 --hw-<el>，不得另造色
  const token = resolveColor(`hw-${el}`, light)
  if (!token || token.toLowerCase() !== p.bar.toLowerCase()) {
    failures.push(`日签${el} 色带 ${p.bar} 与 --hw-${el}（${token || '缺失'}）不一致`)
  }
  for (const [mode, bg] of [['亮色', p.tint], ['暗色', p.tintDark]]) {
    const fg = inkOnFor(bg)
    const ratio = contrast(fg, bg)
    checked++
    const ok = ratio >= 4.5
    console.log(`[日签·${mode}] ${el.padEnd(6)} ${fg} on ${bg}  ${ratio.toFixed(2)}:1  ${ok ? 'PASS' : 'FAIL'} (need 4.5:1)`)
    if (!ok) failures.push(`日签·${mode} ${el}: ${ratio.toFixed(2)}:1 < 4.5:1`)
  }
}

// ── 3. 源码扫描：低对比写法与错误正文色不得回潮 ──
function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, out)
    else if (/\.(tsx|ts)$/.test(entry.name)) out.push(full)
  }
  return out
}

const sourceFiles = walk(path.join(ROOT, 'src'))
for (const file of sourceFiles) {
  const rel = path.relative(ROOT, file).replaceAll('\\', '/')
  const text = fs.readFileSync(file, 'utf8')
  if (/text-ink-light\/\d+/.test(text)) {
    failures.push(`${rel}: 仍存在低对比写法 text-ink-light/<opacity>（实测 1.9–3.4:1，需 ≥4.5:1，改用 text-ink-light）`)
  }
  if (/text-hw-fire(?!-)/.test(text)) {
    failures.push(`${rel}: 仍用 text-hw-fire 作 2.80:1 的正文/错误文字色，应改用 text-danger-ink`)
  }
}

// ── 4. 英文树正文行宽：max-w-3xl 只允许出现在多列网格行 ──
const enFiles = sourceFiles.filter((f) => f.replaceAll('\\', '/').includes('/src/app/en/'))
for (const file of enFiles) {
  const rel = path.relative(ROOT, file).replaceAll('\\', '/')
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/)
  lines.forEach((line, i) => {
    if (line.includes('max-w-3xl') && !line.includes('grid')) {
      failures.push(`${rel}:${i + 1}: 英文正文容器仍用 768px（约 100 字符/行），应改 max-w-[45ch]`)
    }
  })
}

const PROSE_FILES = [
  'src/app/en/terms/page.tsx',
  'src/app/en/privacy/page.tsx',
  'src/app/en/pricing/page.tsx',
  'src/app/en/mingshu/page.tsx',
]
for (const rel of PROSE_FILES) {
  const text = fs.readFileSync(path.join(ROOT, rel), 'utf8')
  if (!text.includes('max-w-[45ch]')) failures.push(`${rel}: 未收窄到 45–75 字符/行（缺 max-w-[45ch]）`)
}

console.log('')
for (const n of notes) console.log(`[baseline] ${n}`)
console.log(`\ncontrast pairs checked: ${checked}/${PAIRS.length}`)
if (failures.length) {
  console.error(`\nFAIL (${failures.length})`)
  for (const f of failures) console.error(`  - ${f}`)
  process.exit(1)
}
console.log('PASS  contrast & readability gate')
