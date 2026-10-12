// ★ 命书「一份一付」验收（HANDOFF-命书一份一付 §二/§三/§四，2026-10-13）
//
// 三项链式任务，脚本分三段（随三项 commit 逐步补齐）：
//   ① 购买前要求有命盘（§二）—— 本 commit
//   ② 付款时把命盘关联上（§三）
//   ③ 按盘判定"这一份付过没"（§四）
//
// 断言形态说明：CheckoutButton 为交互组件，项目无 React 渲染测试设施；
// 组件层采用【正则锚定短路语义】的结构断言（先例：pricing CTA 守卫、site-audit 扫描），
// helper 层（latestChartIdOf）为真调行为断言（喂内存 mock、真跑生产逻辑）。
import { readFileSync } from 'node:fs'
import { latestChartIdOf } from '../src/lib/entitlement.ts'

let allPass = true
const ok = (m) => console.log('  ✓ ' + m)
const fail = (m) => { allPass = false; console.log('  ✗ ' + m) }
const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')
const assert = (cond, m) => (cond ? ok(m) : fail(m))

// 注释剥离（负向源码扫描专用，避免注释里的示例/禁令文本造成误报）
function stripComments(src) {
  let out = '', state = 'code'
  for (let i = 0; i < src.length; i++) {
    const c = src[i], n = src[i + 1]
    if (state === 'code') {
      if (c === '/' && n === '/') { state = 'line'; i++; continue }
      if (c === '/' && n === '*') { state = 'block'; i++; continue }
      if (c === "'" || c === '"' || c === '`') { state = c; out += c; continue }
      out += c
    } else if (state === 'line') {
      if (c === '\n') { state = 'code'; out += c }
    } else if (state === 'block') {
      if (c === '*' && n === '/') { state = 'code'; i++ }
    } else {
      out += c
      if (c === '\\') { out += n ?? ''; i++ }
      else if (c === state) state = 'code'
    }
  }
  return out
}

// 内存 admin mock：只支持 latestChartIdOf 用到的查询链（from('charts').select().eq().order().limit()）
function chartAdminMock(rows) {
  const calls = []
  return {
    _calls: calls,
    from(table) {
      calls.push(table)
      return {
        select: () => ({
          eq: () => ({
            order: () => ({
              limit: () => Promise.resolve({ data: rows }),
            }),
          }),
        }),
      }
    },
  }
}

// ═══════════════════════════════════════════════════════════
// ① 购买前要求有命盘（HANDOFF §二）
// ═══════════════════════════════════════════════════════════
console.log('—— ① 购买前要求有命盘 ——')

// A. latestChartIdOf 真调行为断言（喂内存 mock、真跑生产逻辑）
{
  const uid = '11111111-2222-3333-4444-555555555555'
  const a1 = chartAdminMock([{ id: 'CHART_NEW' }, { id: 'CHART_OLD' }])
  const gotNew = await latestChartIdOf(a1, uid)
  assert(gotNew === 'CHART_NEW',
    `有命盘 → 返回 created_at 最新一条（got=${gotNew}，期望 CHART_NEW）`)
  assert(a1._calls.length === 1 && a1._calls[0] === 'charts',
    `latestChartIdOf 只查 charts 表（calls=${JSON.stringify(a1._calls)}）`)

  const a2 = chartAdminMock([])
  assert((await latestChartIdOf(a2, uid)) === null, '无命盘（空表）→ 返回 null')

  const a3 = chartAdminMock(null)
  assert((await latestChartIdOf(a3, uid)) === null, '无命盘（data=null）→ 返回 null')
}

// B. ★ /api/checkout 在无命盘时仍可被直接调用（§2.4：① 只是前端引导，不是服务端强制）
//    服务端一旦查 charts，就变成服务端拦截 →「先买后填」不可行。源码去注释后必须 0 命中。
{
  const src = stripComments(read('../src/app/api/checkout/route.ts'))
  const n1 = src.split("from('charts'").length - 1
  const n2 = src.split('latestChartIdOf').length - 1
  assert(n1 === 0, `checkout route 不查 charts（from('charts') 命中 ${n1}，要求 0）`)
  assert(n2 === 0, `checkout route 不做权益预检（latestChartIdOf 命中 ${n2}，要求 0）`)
}

// C. CheckoutButton 前端预检：charts 预检先于发起支付，且无命盘分支短路（return）
{
  const src = stripComments(read('../src/components/CheckoutButton.tsx'))
  const nCharts = src.split('latestChartIdOf(').length - 1
  assert(nCharts >= 1, `CheckoutButton 接线 latestChartIdOf 单一事实源（命中 ${nCharts}）`)
  const posQuery = src.indexOf('latestChartIdOf(')
  const posFetch = src.indexOf("fetch('/api/checkout'")
  assert(posQuery >= 0 && posFetch >= 0 && posQuery < posFetch,
    `预检（charts 查询）在发起支付（/api/checkout）之前（${posQuery} < ${posFetch}）`)
  // 短路语义：无命盘（!chartId）分支内必须在发起支付前 return——
  // 牙口锚点：把分支里的 return 改成 ;（文本几乎不变、行为变坏：继续走 fetch）→ 此正则不命中 → 翻红
  const shortCircuit = /if\s*\(!chartId\)\s*\{[^{}]*\breturn\b/.test(src)
  assert(shortCircuit, '无命盘分支短路成立（if (!chartId) { … return }，不继续发起支付）')
  assert(src.includes('先免费排盘'), '无命盘引导文案「先免费排盘」存在')
  assert(src.includes('/?returnTo=/pricing'), '引导链接带 returnTo=/pricing')
  assert(!/\balert\(/.test(src), '无命盘分支不弹 alert（§2.3：页内可点下一步）')
}

console.log('\n' + (allPass ? 'FATEBOOK_ONEPAY_PASS' : 'FATEBOOK_ONEPAY_FAIL'))
if (!allPass) process.exit(1)
