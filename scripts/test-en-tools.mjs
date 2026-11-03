// 英文工具页（合婚 / 紫微 / 方位）验收（2026-11-03）
//
// 断的是什么：
//   ① 三个英文页面源码零 CJK（UI 文案不能漏中文）
//   ② 结果区只渲染 AI 英文段落或英文 locked preview，绝不渲染中文规则表
//   ③ API locale=en 时 locked preview 用英文常量
//   ④ 牙口：往源码注入一句中文，零 CJK 断言必须翻红

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

let allPass = true
const fail = (m) => { allPass = false; console.log('  ✗ ' + m) }
const ok = (m) => console.log('  · ' + m)
const assert = (cond, m) => (cond ? ok(m) : fail(m))

const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
const read = (p) => readFileSync(join(root, p), 'utf8')
const { findCJK } = await import('../src/lib/ai-check.ts')

const clients = [
  'src/app/en/hemun/Client.tsx',
  'src/app/en/ziwei/Client.tsx',
  'src/app/en/geo/Client.tsx',
]

// ---------- ① 源码零 CJK ----------
console.log('—— ① 英文工具页源码零 CJK ——')
for (const file of clients) {
  const src = read(file)
  const cjk = findCJK(src)
  assert(cjk.length === 0, `${file} 零 CJK（命中：${cjk.slice(0, 10).join('、')}）`)
  assert(src.includes("locale: 'en'"), `${file} 请求携带 locale=en`)
}

// ---------- ② 结果区不渲染中文规则表 ----------
console.log('—— ② 结果区只渲染英文 AI / 英文 preview ——')
for (const file of clients) {
  const src = read(file)
  for (const forbidden of ['data.result', 'data.geo', 'data.chart', 'data.analysis', '<HemunResultView', '<ZiweiResultView', '<GeoResultView']) {
    assert(!src.includes(forbidden), `${file} 不引用中文结果数据/组件（${forbidden}）`)
  }
  assert(src.includes('data.ai'), `${file} 渲染 AI 英文段落`)
  assert(src.includes('data.locked?.preview'), `${file} 渲染英文 locked preview`)
}

// ---------- ③ API 英文 locked preview ----------
console.log('—— ③ API locale=en 的 locked preview ——')
for (const [file, marker] of [
  ['src/app/api/hemun/route.ts', 'HEMUN_LOCKED_PREVIEW_EN'],
  ['src/app/api/ziwei/route.ts', 'ZIWEI_LOCKED_PREVIEW_EN'],
  ['src/app/api/geo/route.ts', 'GEO_LOCKED_PREVIEW_EN'],
]) {
  const src = read(file)
  assert(src.includes(marker), `${file} 定义英文 preview`)
  assert(src.includes("locale === 'en'"), `${file} 按 locale 选择英文 preview`)
  assert(/lockedPreview/.test(src), `${file} locked 响应使用 locale 化 preview`)
}

// ---------- ④ 牙口：注入中文必须翻红 ----------
console.log('—— ④ 零 CJK 断言牙口 ——')
{
  const injected = read(clients[0]) + '\nconst leak = "这句话是中文";\n'
  assert(findCJK(injected).length > 0, '往英文工具页注入中文后能被检出')
  assert(findCJK('\n').length === 0, '空行/英文不误报')
}

console.log('\n' + (allPass ? 'EN_TOOLS_PASS' : 'EN_TOOLS_FAIL'))
process.exit(allPass ? 0 : 1)
