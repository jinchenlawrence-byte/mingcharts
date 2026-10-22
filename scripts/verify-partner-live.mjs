// 伙伴申请【线上】验证（opt-in，会真写库再删掉）
//
// 用法：npm run verify:partner-live
//
// 退出码：0 = 全部通过（含跳过）· 1 = 有真实失败 · 2 = 限流中没跑成（什么都没验到）
//
// 验什么：线上 POST /api/partner/apply → 查库字段 → 蜜罐不写库 → 选填落 null → 清理
// ★ 会消耗限流桶（APPLY_RULES 5 次/时/IP），本脚本最多用 3 次。
//   同一小时连跑两次会看到「限流中，什么都没验到」——那是诚实的结果，不是 bug。
import { existsSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

if (existsSync('.env.local')) process.loadEnvFile('.env.local')
const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY
if (proxyUrl) {
  const { ProxyAgent, setGlobalDispatcher } = await import('undici')
  setGlobalDispatcher(new ProxyAgent(proxyUrl))
}
const admin = createClient(
  process.env.SUPABASE_URL_INTERNAL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
)

const API = 'https://www.mingcharts.com/api/partner/apply'
const MARK = `[自测请删]${Date.now()}`
let failed = false
let skipped = 0
const check = (pass, label, detail = '') => {
  if (!pass) failed = true
  console.log(`  ${pass ? '✓' : '✗'} ${label}${detail ? ` · ${detail}` : ''}`)
}
const skip = (label, detail = '') => { skipped++; console.log(`  ⊘ ${label}（跳過）${detail ? ` · ${detail}` : ''}`) }

async function post(body) {
  const res = await fetch(API, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({}))
  return { status: res.status, json }
}

// ① 表已建（迁移是否跑过）
const { error: tblErr } = await admin.from('partner_applications').select('id').limit(1)
check(!tblErr, '迁移生效：partner_applications 可查询', tblErr?.message ?? '')
if (tblErr) process.exit(1)

// ② 合法提交
const payload = {
  name: MARK, contactKind: 'line', contact: 'test_line_id',
  channel: 'IG @test', volume: '10-30', region: '台湾', note: '自测申请',
}
const res = await post(payload)
if (res.status === 429) {
  // 限流中：不是失败，是"没跑成"。别假装通过，也别报失败。
  console.log('\n  限流中：本小时该 IP 的申请配额已用完（5 次/时）。')
  console.log(`  服务端建议 ${res.json?.retryAfter ?? '?'} 秒后重试。什么都没验到，不算通过。`)
  console.log('\nPARTNER_LIVE_SKIPPED')
  process.exit(2)
}
check(res.status === 200 && res.json.ok === true, '合法提交返回 200 {ok:true}', `HTTP ${res.status}`)

// ③ 落库字段
const { data: rows } = await admin
  .from('partner_applications')
  .select('id,name,contact_kind,contact,channel,volume,region,note,status')
  .eq('name', MARK)
const row = rows?.[0]
check(!!row, '申请已落库')
if (row) {
  check(row.contact_kind === 'line' && row.volume === '10-30', '枚举字段按原值落库', `${row.contact_kind}/${row.volume}`)
  check(row.region === '台湾' && row.channel === 'IG @test', '选填文本按原值落库')
  check(row.status === 'new', '初始状态为 new', row.status)
}

// ④ 蜜罐：200 但零写入
const before = (await admin.from('partner_applications').select('id', { count: 'exact', head: true })).count
const botRes = await post({ ...payload, name: `${MARK}-bot`, company: 'ACME Inc' })
if (botRes.status === 429) {
  skip('蜜罐用例', 'HTTP 429')
} else {
  const after = (await admin.from('partner_applications').select('id', { count: 'exact', head: true })).count
  check(botRes.status === 200, '蜜罐命中仍返回 200（不告诉机器人被识别）', `HTTP ${botRes.status}`)
  check(after - before === 0, '蜜罐命中零写入', `新增 ${after - before} 行`)
}

// ⑤ 选填留空落 null（不是空串）
const nullName = `${MARK}-null`
const res2 = await post({ name: nullName, contactKind: 'email', contact: 'a@b.co', volume: '<10' })
if (res2.status === 429) {
  skip('选填留空用例', 'HTTP 429')
} else {
  const { data: nullRow } = await admin
    .from('partner_applications')
    .select('channel,region,note')
    .eq('name', nullName)
    .maybeSingle()
  check(res2.status === 200 && nullRow?.channel === null && nullRow?.region === null && nullRow?.note === null,
    '选填留空落 null（不是空串）',
    `channel=${JSON.stringify(nullRow?.channel)} region=${JSON.stringify(nullRow?.region)} note=${JSON.stringify(nullRow?.note)}`)
}

// ⑥ 清理
const { error: delErr } = await admin.from('partner_applications').delete().like('name', `${MARK}%`)
check(!delErr, '自测数据已清理', delErr?.message ?? '')
const left = (await admin.from('partner_applications').select('id', { count: 'exact', head: true })).count
check(!left, `库里无自测残留（申请总数 ${left ?? 0}）`)

console.log('\n' + (failed ? 'PARTNER_LIVE_FAIL' : `PARTNER_LIVE_PASS${skipped ? `（${skipped} 项因限流跳过）` : ''}`))
process.exitCode = failed ? 1 : 0
