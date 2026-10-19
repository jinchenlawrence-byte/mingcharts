// ★ PWA + Web Push · 行为验收（2026-10-19）
//
// 结构（四类断言混合）：
//   ① 源码/配置：sw.js 三类监听、manifest 可安装判据、layout viewport/manifest、
//      .env.example 私钥项禁令注释、vercel.json crons
//   ② 安全：VAPID 私钥/CRON_SECRET 绝不进客户端可达文件；无 NEXT_PUBLIC_ 前缀变体
//   ③ 纯函数：urlBase64ToUint8Array 解码 65 字节（0x04 前缀）、isEndpointGone、
//      dailyPushPayload 过合规检查、dailyDedupeKey 定长
//   ④ 注入真调 route：无 token → 401 且零写入；token=A 而 body user_id=B → 落库 user_id=A；
//      无 CRON_SECRET → 401 且不发送；带密钥同日二次 → 只发一次
//
// 牙口（文本不变、行为变坏；开发期手工注入，实测翻红后已复原）：
//   A subscribe/route.ts 把 user_id 取自 body → ④「token=A body=B ⇒ 落库 A」精确翻红（越权登记）
//   B cron/daily-push 去掉 claimDailyLog 先占位 → ④「同日二次只发一次」精确翻红（重复推送）
//   C push-sender 的 isEndpointGone 改判 200 → ③ 翻红（失效 endpoint 永不清除）
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (p) => readFileSync(path.join(root, p), 'utf8')

let allPass = true
const ok = (m) => console.log('  ✓ ' + m)
const fail = (m) => { allPass = false; console.log('  ✗ ' + m) }
const assert = (cond, m) => (cond ? ok(m) : fail(m))

// 注释剥离（同 test-enforce-guard 先例）
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

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p, out)
    else if (/\.(ts|tsx)$/.test(e.name)) out.push(p)
  }
  return out
}

// ════════════════ ① 源码 / 配置 ════════════════
console.log('—— ① 源码/配置：SW 监听 / manifest / viewport / env 禁令 / cron ——')
{
  const sw = stripComments(read('public/sw.js'))
  assert(sw.includes("addEventListener('fetch'") || sw.includes('addEventListener("fetch"'),
    "sw.js 注册 fetch 监听（Chrome 可安装判据）")
  assert(sw.includes("addEventListener('push'") || sw.includes('addEventListener("push"'), 'sw.js 监听 push 事件')
  assert(sw.includes('showNotification'), 'sw.js 展示通知（showNotification）')
  assert(sw.includes("addEventListener('notificationclick'") || sw.includes('addEventListener("notificationclick"'),
    'sw.js 处理 notificationclick（点击跳转）')

  const manifest = stripComments(read('src/app/manifest.ts'))
  assert(manifest.includes("display: 'standalone'") || manifest.includes('display: "standalone"'),
    "manifest 声明 display:'standalone'（可安装判据）")
  assert(manifest.includes('maskable'), 'manifest 含 maskable 图标（安卓遮罩不被裁）')

  const layout = stripComments(read('src/app/layout.tsx'))
  assert(layout.includes('export const viewport'), 'layout.tsx 导出 viewport（themeColor 属 viewport）')
  assert(/manifest:\s*['"]\/manifest\.webmanifest['"]/.test(layout), 'layout.tsx metadata 挂钩 /manifest.webmanifest')
  assert(layout.includes('<PwaRegister'), 'layout.tsx 挂载 <PwaRegister />（注册 SW）')

  const memberPage = read('src/app/member/page.tsx')
  assert(memberPage.includes('PushOptIn') && memberPage.includes('<PushOptIn />'),
    'member 页插入 <PushOptIn />（会员中心为提醒开关归属地）')

  const env = read('.env.example')
  assert(/VAPID_PRIVATE_KEY[\s\S]{0,80}绝不加 NEXT_PUBLIC_/.test(env) || /绝不加 NEXT_PUBLIC_[\s\S]{0,80}VAPID_PRIVATE_KEY/.test(env),
    '.env.example 注明 VAPID_PRIVATE_KEY 绝不加 NEXT_PUBLIC_ 前缀')
  assert(/CRON_SECRET[\s\S]{0,80}绝不加 NEXT_PUBLIC_/.test(env) || /绝不加 NEXT_PUBLIC_[\s\S]{0,80}CRON_SECRET/.test(env),
    '.env.example 注明 CRON_SECRET 绝不加 NEXT_PUBLIC_ 前缀')
  assert(/^NEXT_PUBLIC_VAPID_PUBLIC_KEY=/m.test(env), '.env.example 含 NEXT_PUBLIC_VAPID_PUBLIC_KEY（公钥项）')
  assert(!/^NEXT_PUBLIC_VAPID_PRIVATE_KEY=/m.test(env), '.env.example 无 NEXT_PUBLIC_ 私钥项')
  assert(!/^NEXT_PUBLIC_CRON_SECRET=/m.test(env), '.env.example 无 NEXT_PUBLIC_ CRON_SECRET 项')

  const vercel = read('vercel.json')
  assert(vercel.includes('/api/cron/daily-push') && vercel.includes('"0 0 * * *"'),
    "vercel.json crons 指向 /api/cron/daily-push，schedule '0 0 * * *'")

  // 迁移文件（人工 SQL Editor 步骤）：两表 + 零策略 + 唯一约束
  const sql = read('supabase/push.sql')
  for (const t of ['push_subscriptions', 'push_logs']) {
    assert(new RegExp(`CREATE TABLE IF NOT EXISTS ${t}`).test(sql), `push.sql 建表 ${t}（幂等）`)
  }
  assert(/idx_push_subs_endpoint ON push_subscriptions\(endpoint\)/.test(sql), 'endpoint UNIQUE 索引（同设备换账号）')
  assert(/idx_push_logs_dedupe ON push_logs\(user_id, kind, dedupe_key\)/.test(sql), 'push_logs 去重唯一索引')
  assert((sql.match(/ENABLE ROW LEVEL SECURITY/g) || []).length === 2, '两表均启用 RLS（零策略，仅 service_role）')
  const schema = read('supabase/schema.sql')
  assert(schema.includes('CREATE TABLE IF NOT EXISTS push_subscriptions'), 'schema.sql 末尾同步追加 push 表段')
}

// ════════════════ ② 安全（私钥/密钥不进客户端）═══════════════
console.log('—— ② 安全：VAPID 私钥 / CRON_SECRET 绝不可达客户端 ——')
{
  const files = walk(path.join(root, 'src')).map((f) => ({ f, rel: path.relative(root, f).replace(/\\/g, '/') }))
  const swRaw = read('public/sw.js')

  let pubPrivLeak = 0
  const clientLeaks = []
  for (const { f, rel } of files) {
    const code = stripComments(readFileSync(f, 'utf8'))
    if (code.includes('NEXT_PUBLIC_VAPID_PRIVATE_KEY')) pubPrivLeak++
    const isClient = /['"]use client['"]/.test(code)
    const isClientDir = /^src\/components\//.test(rel)
    if ((isClient || isClientDir) && /VAPID_PRIVATE_KEY|CRON_SECRET/.test(code)) clientLeaks.push(rel)
  }
  assert(pubPrivLeak === 0, `无 NEXT_PUBLIC_VAPID_PRIVATE_KEY 变体（命中 ${pubPrivLeak}，要求 0）`)
  assert(clientLeaks.length === 0, `客户端可达文件不含 VAPID_PRIVATE_KEY/CRON_SECRET（命中 ${clientLeaks.join(', ') || '无'}）`)
  assert(!/VAPID_PRIVATE_KEY|CRON_SECRET/.test(stripComments(swRaw)), 'sw.js 不含 VAPID_PRIVATE_KEY/CRON_SECRET')

  const client = stripComments(read('src/lib/push-client.ts'))
  assert(client.includes('NEXT_PUBLIC_VAPID_PUBLIC_KEY'), '客户端只引用 NEXT_PUBLIC_VAPID_PUBLIC_KEY（公钥）')
  assert(!/process\.env\.VAPID_PRIVATE_KEY/.test(client), '客户端不读私钥')

  const sender = stripComments(read('src/lib/push-sender.ts'))
  assert(sender.includes('process.env.VAPID_PRIVATE_KEY'), '服务端 sender 读私钥（唯一读取点）')
  assert(sender.includes('setPushSenderForTest'), 'sender 提供测试注入点')
}

// ════════════════ ③ 纯函数 ════════════════
console.log('—— ③ 纯函数：VAPID 解码 / endpoint 失效判定 / 文案合规 / 去重键 ——')
const { urlBase64ToUint8Array } = await import('../src/lib/push-client.ts')
const { isEndpointGone } = await import('../src/lib/push-sender.ts')
const { dailyPushPayload, dailyDedupeKey, DAILY_PUSH_KIND } = await import('../src/lib/push-copy.ts')
const { findForbidden } = await import('../src/lib/ai-check.ts')
{
  // VAPID 公钥（base64url）→ 65 字节，首字节 0x04
  const raw = new Uint8Array(65)
  raw[0] = 4
  for (let i = 1; i < 65; i++) raw[i] = i
  const b64 = Buffer.from(raw).toString('base64url')
  const out = urlBase64ToUint8Array(b64)
  assert(out.length === 65, `urlBase64ToUint8Array 解码 65 字节（got ${out.length}）`)
  assert(out[0] === 0x04, `首字节 0x04（uncompressed 公钥前缀，got ${out[0]}）`)
  assert(Array.from(out).join(',') === Array.from(raw).join(','), '解码内容与原始字节一致（无移位错）')

  assert(isEndpointGone(404) === true && isEndpointGone(410) === true, 'isEndpointGone(404/410)=true（失效需停用）')
  assert(isEndpointGone(500) === false && isEndpointGone(200) === false, 'isEndpointGone(500/200)=false（保留待次日）')

  const p = dailyPushPayload('甲子')
  assert(p.url === '/daily' && typeof p.title === 'string' && typeof p.body === 'string', 'dailyPushPayload 返回 {title,body,url=/daily}')
  assert(findForbidden(p.body).hits.length === 0, `文案 body 过合规检查（命中 ${findForbidden(p.body).hits.length}，要求 0）`)
  assert(findForbidden(p.title).hits.length === 0, '文案 title 过合规检查')

  const k = dailyDedupeKey('2026-10-19')
  assert(k === '2026-10-19' && k.length === 10, 'dailyDedupeKey 定长 10（YYYY-MM-DD）')
  assert(DAILY_PUSH_KIND === 'daily', "推送种类 kind='daily'")
  let threw = false
  try { dailyDedupeKey('2026/10/19') } catch { threw = true }
  assert(threw, '非法归日 fail-fast（不静默兜底）')
}

// ════════════════ ④ 注入真调 route ════════════════
console.log('—— ④ 真调 route：鉴权 / 只认 token 归属 / cron 幂等 ——')

// 内存 admin（镜像 push 两表的唯一约束与「零策略」写入口）
function makeMockAdmin({ tokens = {}, profiles = [], subs = [] } = {}) {
  const state = { subs: [...subs], logs: [], seq: 0 }
  const TABLE = (t) => (t === 'push_subscriptions' ? state.subs : t === 'push_logs' ? state.logs : profiles)
  const hit = (row, [c, op, v]) => {
    if (op === 'eq') return row[c] === v
    if (op === 'gt') return row[c] != null && String(row[c]) > String(v)
    if (op === 'is') return (row[c] ?? null) === v
    if (op === 'in') return v.includes(row[c])
    return true
  }
  const builder = (table) => {
    const filters = []
    let mode = 'select', payload = null, conflictKey = null
    const b = {}
    b.select = () => b
    b.eq = (c, v) => { filters.push([c, 'eq', v]); return b }
    b.gt = (c, v) => { filters.push([c, 'gt', v]); return b }
    b.is = (c, v) => { filters.push([c, 'is', v]); return b }
    b.in = (c, v) => { filters.push([c, 'in', v]); return b }
    b.insert = (p) => { mode = 'insert'; payload = p; return b }
    b.update = (p) => { mode = 'update'; payload = p; return b }
    b.upsert = (p, o) => { mode = 'upsert'; payload = p; conflictKey = o?.onConflict || 'id'; return b }
    const exec = () => {
      const rows = TABLE(table)
      if (mode === 'insert') {
        if (table === 'push_logs') {
          const dup = rows.find((r) => r.user_id === payload.user_id && r.kind === payload.kind && r.dedupe_key === payload.dedupe_key)
          if (dup) return { data: null, error: { code: '23505', message: 'duplicate key (idx_push_logs_dedupe)' } }
        }
        const row = { ...payload, id: ++state.seq }
        rows.push(row)
        return { data: [row], error: null }
      }
      if (mode === 'upsert') {
        const ex = rows.find((r) => r[conflictKey] === payload[conflictKey])
        if (ex) Object.assign(ex, payload)
        else rows.push({ ...payload, id: ++state.seq })
        return { data: null, error: null }
      }
      if (mode === 'update') {
        for (const r of rows) if (filters.every((f) => hit(r, f))) Object.assign(r, payload)
        return { data: null, error: null }
      }
      return { data: rows.filter((r) => filters.every((f) => hit(r, f))), error: null }
    }
    b.single = async () => { const r = exec(); return r.error ? { data: null, error: r.error } : { data: r.data?.[0] ?? null, error: null } }
    b.maybeSingle = b.single
    b.then = (res, rej) => Promise.resolve(exec()).then(res, rej)
    return b
  }
  const admin = {
    auth: {
      getUser: async (t) => (tokens[t]
        ? { data: { user: { id: tokens[t] } }, error: null }
        : { data: { user: null }, error: { message: 'invalid token' } }),
    },
    from: (t) => builder(t),
  }
  return { admin, state }
}

const UID_A = 'aaaaaaaa-1111-4111-8111-111111111111'
const UID_B = 'bbbbbbbb-2222-4222-8222-222222222222'

const { setServerSupabaseForTest } = await import('../src/lib/supabase.ts')
const { POST: subscribePOST } = await import('../src/app/api/push/subscribe/route.ts')
const { GET: cronGET } = await import('../src/app/api/cron/daily-push/route.ts')
const { setPushSenderForTest } = await import('../src/lib/push-sender.ts')

const subBody = (endpoint, extra = {}) => ({
  subscription: { endpoint, keys: { p256dh: 'P256_' + endpoint, auth: 'AUTH_' + endpoint } },
  ...extra,
})
const jsonReq = (url, method, body, headers = {}) =>
  new Request(url, { method, headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) })

{
  // (1) 无 token → 401 且零写入
  {
    const { admin, state } = makeMockAdmin({ tokens: { 'tok-A': UID_A } })
    setServerSupabaseForTest(admin)
    const res = await subscribePOST(jsonReq('http://localhost/api/push/subscribe', 'POST', subBody('https://ep/x')))
    assert(res.status === 401, `无 token → 401（got ${res.status}）`)
    assert(state.subs.length === 0, '无 token 不写 push_subscriptions（零写入）')
  }

  // (2) token=A 而 body 的 user_id=B → 落库 user_id 必须是 A
  {
    const { admin, state } = makeMockAdmin({ tokens: { 'tok-A': UID_A } })
    setServerSupabaseForTest(admin)
    const res = await subscribePOST(jsonReq('http://localhost/api/push/subscribe', 'POST',
      subBody('https://ep/a', { user_id: UID_B }),
      { Authorization: 'Bearer tok-A' }))
    const j = await res.json()
    assert(res.status === 200 && j.success === true, `token=A 登记成功（got ${res.status}）`)
    assert(state.subs.length === 1 && state.subs[0].user_id === UID_A,
      `★ 落库 user_id=A（body 里的 user_id=B 被忽略；got ${state.subs[0]?.user_id}）`)
    assert(state.subs[0].endpoint === 'https://ep/a', 'endpoint 与请求一致')
  }

  // (3) 无 CRON_SECRET → 401 且不发送
  {
    const { admin } = makeMockAdmin({
      profiles: [{ id: UID_A, is_member: true, member_expire_at: '2099-01-01T00:00:00.000Z' }],
      subs: [{ id: 1, user_id: UID_A, endpoint: 'https://ep/a', p256dh: 'k', auth: 'a', disabled_at: null }],
    })
    setServerSupabaseForTest(admin)
    const sent = []
    setPushSenderForTest(async () => { sent.push(1); return { statusCode: 201, ok: true } })
    delete process.env.CRON_SECRET
    const res = await cronGET(new Request('http://localhost/api/cron/daily-push?date=2026-10-19'))
    assert(res.status === 401, `无 CRON_SECRET → 401（got ${res.status}）`)
    assert(sent.length === 0, '无密钥不发送任何推送')
  }

  // (4) 带密钥同日二次 → 只发一次
  {
    const { admin, state } = makeMockAdmin({
      profiles: [{ id: UID_A, is_member: true, member_expire_at: '2099-01-01T00:00:00.000Z' }],
      subs: [{ id: 1, user_id: UID_A, endpoint: 'https://ep/a', p256dh: 'k', auth: 'a', disabled_at: null }],
    })
    setServerSupabaseForTest(admin)
    let sendCount = 0
    setPushSenderForTest(async () => { sendCount++; return { statusCode: 201, ok: true } })
    process.env.CRON_SECRET = 'test-cron-secret'

    const res1 = await cronGET(new Request('http://localhost/api/cron/daily-push?date=2026-10-19',
      { headers: { Authorization: 'Bearer test-cron-secret' } }))
    const j1 = await res1.json()
    assert(res1.status === 200 && j1.sent === 1, `首次：发送 1（got sent=${j1?.sent}）`)
    assert(sendCount === 1, '首次真实调用发送器 1 次')

    const res2 = await cronGET(new Request('http://localhost/api/cron/daily-push?date=2026-10-19',
      { headers: { Authorization: 'Bearer test-cron-secret' } }))
    const j2 = await res2.json()
    assert(res2.status === 200 && j2.skipped === 1, `同日二次：跳过 1（got skipped=${j2?.skipped}）`)
    assert(sendCount === 1, '★ 同日二次不再发送（claimDailyLog 幂等生效）')
    assert(state.logs.length === 1, `push_logs 仅一行（got ${state.logs.length}）`)
    assert(state.logs[0].status === 'sent', "push_logs.status='sent'")

    // 换日再发 → 新一行，发送恢复
    const res3 = await cronGET(new Request('http://localhost/api/cron/daily-push?date=2026-10-20',
      { headers: { Authorization: 'Bearer test-cron-secret' } }))
    const j3 = await res3.json()
    assert(j3.sent === 1 && sendCount === 2, '换日可再次发送（去重键按归日）')
    assert(state.logs.length === 2, 'push_logs 两行（两个归日各一）')

    // 有效期外的用户不发（会员判定只读）
    const { admin: admin2, state: state2 } = makeMockAdmin({
      profiles: [{ id: UID_B, is_member: true, member_expire_at: '2000-01-01T00:00:00.000Z' }],
      subs: [{ id: 9, user_id: UID_B, endpoint: 'https://ep/b', p256dh: 'k', auth: 'a', disabled_at: null }],
    })
    setServerSupabaseForTest(admin2)
    setPushSenderForTest(async () => { sendCount++; return { statusCode: 201, ok: true } })
    const before = sendCount
    const res4 = await cronGET(new Request('http://localhost/api/cron/daily-push?date=2026-10-21',
      { headers: { Authorization: 'Bearer test-cron-secret' } }))
    const j4 = await res4.json()
    assert(j4.members === 0 && j4.devices === 0 && sendCount === before, '过期会员不推送（member_expire_at 只读判定）')
    assert(state2.logs.length === 0, '过期会员不占 push_logs 名额')
  }

  // (5) 失效 endpoint（410）→ 停用
  {
    const { admin, state } = makeMockAdmin({
      profiles: [{ id: UID_A, is_member: true, member_expire_at: '2099-01-01T00:00:00.000Z' }],
      subs: [{ id: 1, user_id: UID_A, endpoint: 'https://ep/gone', p256dh: 'k', auth: 'a', disabled_at: null }],
    })
    setServerSupabaseForTest(admin)
    setPushSenderForTest(async () => ({ statusCode: 410, ok: false, gone: true, error: 'gone' }))
    process.env.CRON_SECRET = 'test-cron-secret'
    await cronGET(new Request('http://localhost/api/cron/daily-push?date=2026-10-22',
      { headers: { Authorization: 'Bearer test-cron-secret' } }))
    assert(state.subs[0].disabled_at != null, '410 → 写 disabled_at（失效设备停用）')
    assert(state.logs[0].status === 'failed', "全失败 → push_logs.status='failed'")
  }

  // 复原注入点，避免污染后续
  setServerSupabaseForTest(null)
  setPushSenderForTest(null)
  delete process.env.CRON_SECRET
}

console.log('\n' + (allPass ? '✅ test-push-accept 全部通过' : '❌ test-push-accept 存在失败断言'))
process.exit(allPass ? 0 : 1)
