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
  // 按钮之前必须出现「非真 AI 结果」的判定。
  // 判据可以是字面量，也可以是共享常量（GENUINE_AI_SOURCE）——
  // ★ 英文源文件不得出现中文字面量（en-tools 的零 CJK 断言），所以现在是常量，两种都接受。
  const literalAt = src.lastIndexOf("aiSource !== 'AI 深度解读'", btnAt)
  const constAt = src.lastIndexOf('aiSource !== GENUINE_AI_SOURCE', btnAt)
  const guardAt = Math.max(literalAt, constAt)
  assert(guardAt > 0,
    `${f}：按钮受「非 AI 结果」条件保护（规则版才给）`,
    `${f}：按钮无条件显示 —— AI 报告也能免费重生成（可被无限刷）`)
  // ★ 2026-11-08：免费试读的 aiSource 是「未解锁」，也满足「非 AI 结果」，
  //   所以还必须判「这份报告已付费」，两条同时成立才给按钮。
  const paidAt = src.lastIndexOf('isReportPaid(', btnAt)
  assert(paidAt > 0,
    `${f}：按钮同时受「报告已付费」保护`,
    `${f}：免费试读报告也会显示重新生成 —— 权益判定漏了付费条件`)
}

console.log('—— ② 简体/繁体的共用组件仍用 ruleVersion 门槛 ——')
const SHARED = [
  'src/components/reports/GeoResultView.tsx',
  'src/components/reports/HemunResultView.tsx',
  'src/components/reports/LiunianResultView.tsx',
  'src/components/reports/ZiweiResultView.tsx',
]
for (const f of SHARED) {
  const src = readFileSync(f, 'utf8')
  assert(/ruleVersion\s*&&\s*paid\s*&&\s*onRegen/.test(src),
    `${f.split('/').pop()}：免费重新生成受 ruleVersion + 已付费约束`,
    `${f.split('/').pop()}：缺 ruleVersion 或付费约束 —— 规矩被绕开`)
}

console.log('—— ②b 简体/繁体模块页不得再有无条件的重新生成块 ——')
const MODULE_PAGES = [
  'src/app/(zh)/ziwei/Client.tsx',
  'src/app/(zh)/hemun/page.tsx',
  'src/app/(zh)/geo/Client.tsx',
  'src/app/(zh)/liunian/Client.tsx',
  'src/app/tw/ziwei/Client.tsx',
  'src/app/tw/hemun/Client.tsx',
  'src/app/tw/geo/Client.tsx',
  'src/app/en/ziwei/Client.tsx',
  'src/app/en/hemun/Client.tsx',
  'src/app/en/geo/Client.tsx',
  'src/app/en/liunian/Client.tsx',
]
for (const f of MODULE_PAGES) {
  const src = readFileSync(f, 'utf8')
  // 简体/繁体：页头无条件块已删除，唯一入口在 ResultView（带 ruleVersion + paid）
  if (f.includes('/tw/') || f.includes('(zh)')) {
    assert(!/重新生成本報告|重新生成本报告|免费重新生成|免費重新生成/.test(src),
      `${f}：不再有无条件的页头重新生成块`)
  }
  // 所有模块页都必须把付费判定接到 onRegen 上（英文页除外——英文页用页头块，已在上方断言）
  if (!f.startsWith('src/app/en/')) {
    assert(/onRegen=\{isReportPaid\('/.test(src),
      `${f}：onRegen 只在报告已付费时下传`)
  }
}

console.log('—— ②c 报告操作按钮不得写死跨语言树路径 ——')
{
  const files = [
    ...SHARED,
    'src/components/AskPanel.tsx',
    'src/components/CheckoutButton.tsx',
    'src/components/ReportActions.tsx',
    'src/components/reports/PreviewLock.tsx',
  ]
  const bad = [
    /href="\/en\//, /href="\/tw\//,
    /href="\/(reports|chart|pricing|auth|member|liunian|ziwei|hemun|geo)(["'/#])/,
    /router\.push\('\/en\//, /router\.push\('\/tw\//,
    /router\.push\('\/(reports|chart|pricing|auth|member|liunian|ziwei|hemun|geo)(["'])/,
  ]
  for (const f of files) {
    const src = readFileSync(f, 'utf8')
    for (const re of bad) {
      assert(!re.test(src), `${f.split('/').pop()}：无写死跨树/简体路径（${re}）`,
        `${f.split('/').pop()}：发现写死路径 ${re} —— 必须在当前语言树内生成`)
    }
  }
  const twHub = readFileSync('src/app/tw/liunian/page.tsx', 'utf8')
  assert(/href="#liunian-generator"/.test(twHub),
    '繁体年运入口在页内锚点生成报告（不再跳到 /tw 首页排盘）',
    '繁体年运入口仍指向首页排盘 —— 用户会被兜底到 /tw')
}

console.log('—— ③ 「AI 深度解读」这个判据是全站唯一来源 ——')
{
  const gate = readFileSync('src/lib/reportGate.ts', 'utf8')
  assert(/export const GENUINE_AI_SOURCE = 'AI 深度解读'/.test(gate),
    '真 AI 判据集中在 reportGate.GENUINE_AI_SOURCE（客户端安全）',
    '真 AI 判据不再集中定义 —— 各处会各写一份，迟早漂移')
  const cache = readFileSync('src/lib/reportCache.ts', 'utf8')
  assert(/from '\.\/reportGate'/.test(cache),
    'reportCache 引用同一常量（不再重复定义字面量）',
    'reportCache 仍在本地重复定义判据字面量')
}

console.log('—— ④ 接口层同样校验：未付费声明 regen → 402 ——')
{
  const policy = readFileSync('src/lib/regenPolicy.ts', 'utf8')
  assert(/export const REGEN_REQUIRES_PAID = 'REGEN_REQUIRES_PAID'/.test(policy),
    'regenPolicy：错误码集中定义',
    'regenPolicy：缺少统一的 REGEN_REQUIRES_PAID 错误码')
  assert(/status:\s*402/.test(policy),
    'regenPolicy：未付费重新生成返回 402',
    'regenPolicy：未付费重新生成没有拒绝（前端藏按钮不等于授权）')
  assert(/if \(!regen \|\| unlocked\) return null/.test(policy),
    'regenPolicy：已付费放行且不计数（不设次数上限）',
    'regenPolicy：付费用户仍被额外限制 —— 与「无限次重新生成」不符')

  const APIS = [
    'src/app/api/ziwei/route.ts',
    'src/app/api/hemun/route.ts',
    'src/app/api/geo/route.ts',
  ]
  for (const f of APIS) {
    const src = readFileSync(f, 'utf8')
    assert(/import \{ isRegenRequest, regenGate \} from '@\/lib\/regenPolicy'/.test(src),
      `${f.split('/').pop()}：接口层接入统一重新生成判据`,
      `${f.split('/').pop()}：接口层未接入 regenPolicy —— 只靠前端隐藏`
    )
    assert(/if \(regenBlocked\) return regenBlocked/.test(src),
      `${f.split('/').pop()}：regen 声明早退返回 402`,
      `${f.split('/').pop()}：regen 门槛未生效`
    )
    assert(!/regenCount|regen_count|REGEN_LIMIT|REGEN_MAX/.test(src),
      `${f.split('/').pop()}：重新生成不设次数上限`,
      `${f.split('/').pop()}：出现重新生成计数上限 —— 与用户口径冲突`
    )
  }

  const ln = readFileSync('src/app/api/liunian/route.ts', 'utf8')
  assert(/code: 'REGEN_REQUIRES_PAID'[\s\S]{0,80}status:\s*402/.test(ln),
    'liunian：接口层未付费重新生成返回 402',
    'liunian：接口层未付费重新生成未拒绝')
  assert(!/\.\.\.FORCE_RULES|force \? \[/.test(ln),
    'liunian：重新生成不叠加额外次数规则（不限次数）',
    'liunian：重新生成仍受 FORCE_RULES 次数上限约束')
  assert(/searchParams\??\.get\('regen'\) === '1'/.test(ln),
    'liunian：与其它接口统一接受 ?regen=1',
    'liunian：只认 body.force，接口参数不统一')
}

console.log('—— ④b 三语客户端重新生成都带 regen=1 ——')
{
  const CLIENTS = [
    'src/app/(zh)/ziwei/Client.tsx',
    'src/app/tw/ziwei/Client.tsx',
    'src/app/en/ziwei/Client.tsx',
    'src/app/(zh)/hemun/page.tsx',
    'src/app/tw/hemun/Client.tsx',
    'src/app/en/hemun/Client.tsx',
    'src/app/(zh)/geo/Client.tsx',
    'src/app/tw/geo/Client.tsx',
    'src/app/en/geo/Client.tsx',
  ]
  for (const f of CLIENTS) {
    const src = readFileSync(f, 'utf8')
    const api = f.includes('ziwei') ? '/api/ziwei' : f.includes('hemun') ? '/api/hemun' : '/api/geo'
    assert(new RegExp(`fetch\\(opts\\?\\.regen \\? '${api}\\?regen=1' : '${api}'`).test(src),
      `${f.split('/').slice(-2).join('/')}：重新生成请求带 ?regen=1`,
      `${f.split('/').slice(-2).join('/')}：重新生成请求未声明 regen —— 接口层无法校验`
    )
    assert(/runGenerate\(\{ regen: true \}\)/.test(src),
      `${f.split('/').slice(-2).join('/')}：重新生成按钮走 regen 分支`,
      `${f.split('/').slice(-2).join('/')}：重新生成按钮仍是普通生成（会命中缓存，拿不到新 AI）`
    )
  }
}

console.log('')
if (allPass) console.log('REGEN_GUARD_PASS')
else {
  console.log(`REGEN_GUARD_FAIL（${failures.length} 处）`)
  for (const x of failures) console.log('  - ' + x)
}
process.exitCode = allPass ? 0 : 1
