// 免费重新生成的边界（2026-11-05）
//
// 既定规矩（用户拍板）：**只有规则版报告**才给免费重新生成。
// 理由：命书与单次报告都是一次性付费商品，AI 出文成功后再允许免费重生成，
// 等于「付一次、无限刷 AI」；而如果 AI 抽风只出了规则版，用户应能免费补救。
//
// 事故形态：英文四个模块页（geo/hemun/liunian/ziwei）的「Regenerate this report」
// 无条件显示 —— 绕开了这条规矩。简体/繁体用的共用组件是带 ruleVersion 门槛的。
import { readFileSync } from 'node:fs'

let allPass = true
const failures = []
const fail = (m) => { allPass = false; failures.push(m); console.log('  ✗ ' + m) }
const ok = (m) => console.log('  · ' + m)
const assert = (c, msg, fmsg) => (c ? ok(msg) : fail(fmsg ?? msg))

console.log('—— ① 英文四页的重新生成必须有规则版门槛 ——')
const EN_PAGES = [
  'src/app/en/geo/Client.tsx',
  'src/app/en/hemun/Client.tsx',
  'src/app/en/liunian/Client.tsx',
  'src/app/en/ziwei/Client.tsx',
]
for (const f of EN_PAGES) {
  const src = readFileSync(f, 'utf8')
  const btnAt = src.indexOf('Regenerate this report')
  assert(btnAt > 0, `${f}：有重新生成按钮`)
  // 按钮之前必须出现 aiSource 判定（即「只有非 AI 结果才显示」）
  const guardAt = src.lastIndexOf("aiSource !== 'AI 深度解读'", btnAt)
  assert(guardAt > 0,
    `${f}：按钮受「非 AI 结果」条件保护（规则版才给）`,
    `${f}：按钮无条件显示 —— AI 报告也能免费重生成（可被无限刷）`)
}

console.log('—— ② 简体/繁体的共用组件仍用 ruleVersion 门槛 ——')
const SHARED = [
  'src/components/reports/GeoResultView.tsx',
  'src/components/reports/HemunResultView.tsx',
  'src/components/reports/LiunianResultView.tsx',
]
for (const f of SHARED) {
  const src = readFileSync(f, 'utf8')
  assert(/ruleVersion\s*&&\s*onRegen/.test(src),
    `${f.split('/').pop()}：免费重新生成受 ruleVersion 约束`,
    `${f.split('/').pop()}：缺 ruleVersion 约束 —— 规矩被绕开`)
}

console.log('—— ③ 「AI 深度解读」这个判据是全站唯一来源 ——')
{
  const cache = readFileSync('src/lib/reportCache.ts', 'utf8')
  assert(/GENUINE_AI_SOURCE = 'AI 深度解读'/.test(cache),
    '真 AI 判据集中在 reportCache.GENUINE_AI_SOURCE',
    '真 AI 判据不再集中定义 —— 各处会各写一份，迟早漂移')
}

console.log('')
if (allPass) console.log('REGEN_GUARD_PASS')
else {
  console.log(`REGEN_GUARD_FAIL（${failures.length} 处）`)
  for (const x of failures) console.log('  - ' + x)
}
process.exitCode = allPass ? 0 : 1
