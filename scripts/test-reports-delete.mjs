// 「我的报告」三树一致性（2026-11-05）
//
// 事故形态：英文 /en/reports 没有删除入口，简体与繁体都有 ——
// 用户看着一份造错的报告却删不掉（实测截图）。
// 这类「某棵树漏功能」的缺陷用肉眼很难发现，必须由断言守着。
import { readFileSync } from 'node:fs'

let allPass = true
const failures = []
const fail = (m) => { allPass = false; failures.push(m); console.log('  ✗ ' + m) }
const ok = (m) => console.log('  · ' + m)
const assert = (c, msg, fmsg) => (c ? ok(msg) : fail(fmsg ?? msg))

const PAGES = [
  ['zh', 'src/app/(zh)/reports/page.tsx'],
  ['tw', 'src/app/tw/reports/Client.tsx'],
  ['en', 'src/app/en/reports/page.tsx'],
]

console.log('—— ① 三树都能删除自己的报告 ——')
for (const [loc, f] of PAGES) {
  const src = readFileSync(f, 'utf8')
  assert(/from\('reports'\)\.delete\(\)/.test(src),
    `${loc}：报告页有删除实现`,
    `${loc}：报告页没有删除实现 —— 用户无法删除造错的报告`)
  assert(/confirm\(/.test(src),
    `${loc}：删除前有二次确认`,
    `${loc}：删除没有二次确认（误点即丢数据）`)
}

console.log('—— ② 删除不得由前端指定用户 ——')
// 删除请求只按 id 定位，用户归属由 Supabase RLS 保证；
// 前端若额外传 user_id，等于把归属判定交给客户端。
for (const [loc, f] of PAGES) {
  const src = readFileSync(f, 'utf8')
  const delCall = src.match(/from\('reports'\)\.delete\(\)[\s\S]{0,200}/)?.[0] ?? ''
  assert(!/user_id/.test(delCall),
    `${loc}：删除条件不含 user_id（归属交给 RLS）`,
    `${loc}：删除条件里出现 user_id —— 归属判定被搬到前端`)
}

console.log('—— ③ 不得有「免费重新生成」入口 ——')
// 决策（2026-11-05，用户拍板）：撤掉英文报告页的「Regenerate in English」。
// 原因不是文案问题 —— 命书是单次付费商品，重新生成要再跑一次 AI；
// 若入口对已购用户开放且不计次，就是「付一次、无限生成」的刷量漏洞。
// 遗留的中文报告保持可读，标注清楚即可。
{
  const pages = ['src/app/en/reports/page.tsx', 'src/app/en/reports/[id]/page.tsx']
  for (const f of pages) {
    const src = readFileSync(f, 'utf8')
    assert(!/REGENERATE_EN|Regenerate (in English|it)|regenerateFatebook/.test(src),
      `${f.split('/').slice(-2).join('/')}：无重新生成入口（防刷量）`,
      `${f.split('/').slice(-2).join('/')}：仍有重新生成入口 —— 付费报告可被无限免费生成`)
    assert(/has not been translated/.test(src),
      `${f.split('/').slice(-2).join('/')}：遗留报告仍标注「未翻译」`,
      `${f.split('/').slice(-2).join('/')}：遗留报告没有标注未翻译（用户会以为是新生成的）`)
  }
}

console.log('')
if (allPass) console.log('REPORTS_DELETE_PASS')
else {
  console.log(`REPORTS_DELETE_FAIL（${failures.length} 处）`)
  for (const x of failures) console.log('  - ' + x)
}
process.exitCode = allPass ? 0 : 1
