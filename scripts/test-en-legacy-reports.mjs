// 英文报告展示层验收（不写库）：
// 1) 类型名统一为 Location & Direction，历史 Geomancy 字面量走展示映射
// 2) 中文旧报告：CJK 比例判定 + 列表徽标/详情提示 + 牙口自检（换成英文正文必须消失）
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import {
  kindLabelEn, isLegacyChineseReport, LEGACY_BADGE_EN, REGENERATE_EN,
} from '../src/lib/enReportLabels'

let pass = 0
const fails = []
function assert(cond, label) {
  if (cond) pass++
  else fails.push(label)
}

const ZH_BODY = '日元甲木生于酉月，官星当令，身弱喜印比。命局财官两旺而日主偏弱，行运喜水木之地，忌金土过重。'
const EN_BODY = 'The Day Master Jia Wood is born in the You month, when the Officer star commands the season. The chart is weak and favours Resource and Companion support; Water and Wood cycles help, while heavy Metal and Earth hold it back.'
const zhResult = { ai: { overview: ZH_BODY, career: ZH_BODY + ZH_BODY } }
const enResult = { ai: { overview: EN_BODY, career: EN_BODY } }
// Fate Book rows keep the body on the chart row: the list wraps it as { ai: paid }.
const zhFatebookPaid = { overview: ZH_BODY, career: ZH_BODY }
const enFatebookPaid = { overview: EN_BODY, career: EN_BODY }

// ① 中文旧报告判定
assert(isLegacyChineseReport(zhResult) === true, '中文正文 → 判为中文旧报告')
assert(isLegacyChineseReport(enResult) === false, '英文正文 → 不是中文旧报告（牙口）')
assert(isLegacyChineseReport({}) === false, '空正文 → 不误判')
// 夹杂少量中文的英文正文不应被判旧报告
assert(isLegacyChineseReport({ ai: { overview: EN_BODY + '（张伟）' } }) === false, '英文正文夹人名 → 不误判')
// 命书正文来自 charts.chart_data.analysis.paid，按同一内容规则判定
assert(isLegacyChineseReport({ ai: zhFatebookPaid }) === true, '命书中文正文 → 判为中文旧报告')
assert(isLegacyChineseReport({ ai: enFatebookPaid }) === false, '命书英文正文 → 不是中文旧报告（牙口）')

// ② 徽标逻辑：徽标存在性完全由判定结果驱动
const badgeOf = (r) => (isLegacyChineseReport(r) ? LEGACY_BADGE_EN : null)
assert(badgeOf(zhResult) === 'Chinese legacy report', '中文旧报告 → 列表出现徽标')
assert(badgeOf(enResult) === null, '英文正文 → 徽标消失（牙口）')

// ③ 类型名映射
assert(kindLabelEn('geo') === 'Location & Direction', 'geo 类型展示名')
assert(kindLabelEn('Geomancy') === 'Location & Direction', '历史 Geomancy 字面量 → 展示映射')
assert(kindLabelEn('Geomancy report') === 'Location & Direction report', '历史 Geomancy report → 展示映射')
assert(kindLabelEn('hemun') === 'Bazi synastry' && kindLabelEn('ziwei') === 'Zi Wei Dou Shu', '其它类型名不变')

// ④ 列表页与详情页接入断言
const list = readFileSync('src/app/en/reports/page.tsx', 'utf8')
const detail = readFileSync('src/app/en/reports/[id]/page.tsx', 'utf8')
for (const src of [list, detail]) {
  assert(src.includes('isLegacyChineseReport') || src.includes('LEGACY_BADGE_EN'), '英文报告页接入中文旧报告逻辑')
  assert(src.includes('LEGACY_BADGE_EN'), '英文报告页使用统一徽标文案')
  assert(src.includes('kindLabelEn'), '英文报告页使用统一类型名映射')
}
assert(list.includes('REGENERATE_EN'), '列表提供 Regenerate in English 入口')
assert(detail.includes('REGENERATE_EN'), '详情提供 Regenerate in English 入口')
assert(list.includes('chart_data?.analysis?.paid'), '列表补查命书正文（charts.chart_data.analysis.paid）')
assert(detail.includes('isLegacyChineseReport({ ai: text })'), '详情与列表共用同一 CJK 比例判定')
assert(list.includes('currentChart') && detail.includes('currentChart'), '命书重新生成前注入 currentChart，避免 /en/chart 死链')
assert(!readFileSync('src/app/(zh)/reports/page.tsx', 'utf8').includes('LEGACY_BADGE_EN'), '简体列表不加英文旧报告徽标')
assert(!readFileSync('src/app/tw/reports/page.tsx', 'utf8').includes('LEGACY_BADGE_EN'), '繁体列表不加英文旧报告徽标')

// ⑤ 英文可见文案 Geomancy 归零（注释与历史映射模块除外）
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
}
function walk(dir) {
  const out = []
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) out.push(...walk(p))
    else if (p.endsWith('.tsx') || p.endsWith('.ts')) out.push(p)
  }
  return out
}
let geomancy = 0
for (const file of [...walk('src/app/en'), 'src/lib/i18n.ts']) {
  const visible = stripComments(readFileSync(file, 'utf8'))
  if (/geomancy/i.test(visible)) {
    geomancy++
    fails.push(`可见文案仍含 Geomancy: ${file}`)
  }
}
assert(geomancy === 0, '英文可见文案 Geomancy 计数为 0')
// 历史映射表本身允许保留旧词（内部常量，非展示）
assert(readFileSync('src/lib/enReportLabels.ts', 'utf8').includes('Geomancy'), '历史映射表保留旧词（内部常量，已说明）')

console.log(`—— 英文报告展示层 ——`)
console.log(`结果：pass=${pass} fail=${fails.length}`)
for (const f of fails) console.error(`✗ ${f}`)
process.exit(fails.length ? 1 : 0)
