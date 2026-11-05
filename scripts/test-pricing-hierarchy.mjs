// 定价页层级验收（2026-10-30，按 Refactoring UI 规则）
//
// 断的是什么：
//   ① 一个页面只许一个主行动 —— 定价页的实心 CTA 只能有一个（highlight 的那档）
//   ② 会员档的两个按钮（月度/年度）必须是描边次级样式，不能与命书抢主视觉
//      （Refactoring UI：层级靠尺寸/密度/留白，不靠颜色；三个实心按钮＝没有焦点）
//   ③ 三语（zh/tw/en）规则一致，不允许只改一版
//   ④ 组件本身的默认样式不得被改动（其它调用点如 /member 仍是原样式）
//
// ★ 全程离线：只读源码。
import { readFileSync } from 'node:fs'

let allPass = true
const failures = []
function fail(m) { allPass = false; failures.push(m); console.log('  ✗ ' + m) }
function ok(m) { console.log('  · ' + m) }
function assert(c, msg, failMsg) { if (c) ok(msg); else fail(failMsg ?? msg) }

const PAGES = [
  ['zh', 'src/app/(zh)/pricing/page.tsx'],
  ['tw', 'src/app/tw/pricing/page.tsx'],
  ['en', 'src/app/en/pricing/page.tsx'],
]

console.log('—— ① 每页只有一个实心 CTA ——')
for (const [loc, f] of PAGES) {
  const src = readFileSync(f, 'utf8')
  // ★ 不看数据字段（三语写法不同：zh/tw 用 CARDS.highlight，en 直接写 JSX），
  //   看【实际渲染出的实心主按钮数】= CheckoutButton 标签内出现 highlight 的次数
  const tags = src.match(/<CheckoutButton[\s\S]{0,500}?>/g) ?? []
  const solid = tags.filter((t) => /highlight(?!=\{false\})/.test(t)).length
  assert(solid === 1,
    `${loc}：实心主按钮恰好 1 个（命书）`,
    `${loc}：实心主按钮应为 1 个，实际 ${solid}`)
}

console.log('—— ② 会员按钮为描边次级 ——')
for (const [loc, f] of PAGES) {
  const src = readFileSync(f, 'utf8')
  const hasOutline = /<MembershipButton[\s\S]{0,400}?border border-ink\/25/.test(src)
  assert(hasOutline,
    `${loc}：会员按钮传了描边样式（不再与命书抢主视觉）`,
    `${loc}：会员按钮缺少描边 className（仍是橙色实心＝两个主行动）`)
}

console.log('—— ②B 间距与次级色 ——')
for (const [loc, f] of PAGES) {
  const src = readFileSync(f, 'utf8')
  // 卡片间距用系统档 gap-6（24px）；gap-4（16px）在三栏价格页偏紧
  assert(/grid md:grid-cols-3 gap-6/.test(src),
    `${loc}：三栏卡片间距 24px（系统档 gap-6）`,
    `${loc}：卡片间距不是 gap-6（三栏价格页 16px 偏紧）`)
  // 免费档是次级动作：不得用主色蓝（否则一页出现第二个强调色）
  assert(!/hw-c-blue block text-center text-sm/.test(src),
    `${loc}：免费档链接不用主色蓝（不抢唯一主行动）`,
    `${loc}：免费档链接仍是主色蓝（一页出现两个强调色）`)
}

console.log('—— ③ 组件默认样式未被改动 ——')
{
  const btn = readFileSync('src/components/MembershipButton.tsx', 'utf8')
  assert(btn.includes('bg-amber-600'),
    'MembershipButton 默认样式保持原样（其它调用点不受影响）',
    'MembershipButton 默认样式被改（会影响 /member 等其它调用点）')
  assert(/className\s*\|\|/.test(btn),
    'MembershipButton 仍允许 className 覆盖（定价页用法成立）',
    'MembershipButton 的 className 覆盖能力被移除')
}

console.log('')
if (allPass) console.log('PRICING_HIERARCHY_PASS')
else {
  console.log(`PRICING_HIERARCHY_FAIL（${failures.length} 处）`)
  for (const f of failures) console.log('  - ' + f)
}
process.exitCode = allPass ? 0 : 1
