// 年运报告缓存验收（HANDOFF-年运披露与报告缓存 §3.5；牙口纪律 §8.6.7）
//
// 断言必须【真调 /api/liunian route handler】（§3.5-① 明文），不得只查源码——
// 密封手段：① supabase.setServerSupabaseForTest 注入内存 admin（reports 表即内存数组）
//           ② 替换 globalThis.fetch 拦截 AI 端点并计数（AI_API_KEY 在 import 前置入）
// 牙口模式（人工运行，verify 只跑默认模式）：
//   node scripts/test-liunian-cache.mjs --tooth=locked   → 缓存把 locked 存进去并原样下发 → 断言②翻红
//   node scripts/test-liunian-cache.mjs --tooth=dup      → 覆盖写被破坏（总是 insert）→ 断言④翻红
//   node scripts/test-liunian-cache.mjs --tooth=keyver   → 键模板去掉版本常量 → 断言③结构断言翻红
// 每个牙口运行前，脚本先打出【注入后的实际行为】作肯定性证据；无证据即中止（§8.6.7）。
process.env.AI_API_KEY = 'test-key-cache-accept'   // ★ 必须在任何 import 之前（aiLiunian 模块级常量）

const toothArg = process.argv.find(a => a.startsWith('--tooth='))
const tooth = toothArg ? toothArg.split('=')[1] : null

const { setServerSupabaseForTest } = await import('../src/lib/supabase.ts')

// ---------- 内存 admin（reports/profiles/payments 的最小可用替身） ----------
function makeMockAdmin(userId) {
  const db = { rows: [], seq: 0 }
  const matches = (row, table, filters) =>
    row.__table === table && filters.every(([c, v]) => row[c] === v)
  const builder = (table) => {
    const filters = []
    let mode = 'select'
    let payload = null
    const b = {}
    b.select = () => b
    b.eq = (c, v) => { filters.push([c, v]); return b }
    const doInsert = () => {
      const row = { ...payload, id: 'r' + (++db.seq), __table: table, created_at: new Date().toISOString() }
      db.rows.push(row)
      return row
    }
    const doUpdate = () => {
      let n = 0
      for (const r of db.rows) if (matches(r, table, filters)) { Object.assign(r, payload); n++ }
      return n
    }
    const finish = () => {
      if (mode === 'insert') { doInsert(); return { data: null, error: null } }
      if (mode === 'update') { doUpdate(); return { data: null, error: null } }
      return { data: db.rows.filter(r => matches(r, table, filters)), error: null }
    }
    b.maybeSingle = async () => {
      if (mode === 'insert') return { data: doInsert(), error: null }
      if (mode === 'update') return { data: doUpdate() ? db.rows[0] : null, error: null }
      return { data: db.rows.find(r => matches(r, table, filters)) ?? null, error: null }
    }
    b.single = async () => {
      if (mode === 'insert') return { data: doInsert(), error: null }
      const row = db.rows.find(r => matches(r, table, filters))
      return row ? { data: row, error: null } : { data: null, error: { message: 'no rows' } }
    }
    b.insert = (p) => { mode = 'insert'; payload = p; return b }
    b.update = (p) => { mode = 'update'; payload = p; return b }
    b.then = (res, rej) => Promise.resolve(finish()).then(res, rej)
    return b
  }
  const admin = {
    auth: { getUser: async (t) => ({ data: { user: t ? { id: userId } : null }, error: null }) },
    from: (table) => builder(table)
  }
  return { admin, db }
}

// ---------- AI fetch 拦截（计数 + 按次序返回可区分内容） ----------
const aiCalls = []
const realFetch = globalThis.fetch
globalThis.fetch = async (url, opts) => {
  if (String(url).includes('/v1/chat/completions')) {
    aiCalls.push(String(url))
    const n = aiCalls.length
    const sec = (tag) => `第${n}次生成·${tag}·验收占位：这一阶段整体节奏以稳为主，宜按既定计划推进，遇到变化先观察再行动；具体安排仍以现实条件为准。本段重复叙述仅用于满足板块长度要求，与命理结论无关，请以正式生成为准。`
    const content = JSON.stringify({
      annualOverview: sec('总纲'), careerFlow: sec('事业'), wealthFlow: sec('财运'),
      loveFlow: sec('感情'), healthFlow: sec('健康'), monthFlow: sec('流月')
    })
    return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content } }], usage: { total_tokens: 10 } }) }
  }
  return realFetch(url, opts)
}

// ---------- 通用工具 ----------
const { POST } = await import('../src/app/api/liunian/route.ts')
const {
  annualCacheKey, recomputeEntitlementFields, stripEntitlementState
} = await import('../src/lib/reportCache.ts')

const call = async (payload) => {
  const req = new Request('http://localhost/api/liunian', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  const res = await POST(req)
  return { status: res.status, json: await res.json() }
}
const deepEqual = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const rowsOf = (db) => db.rows.filter(r => r.__table === 'reports')

let allPass = true
const fail = (msg) => { allPass = false; console.log('  ✗ ' + msg) }
const nowYear = new Date().getFullYear()

// 基础请求体（无出生地 → birthZone/birthLng 为 null，仍须全量入键）
const BASE = { year: 1991, month: 4, day: 12, hour: 3, minute: 10, gender: 1, targetYear: nowYear, token: 'tok-cache-1' }
const USER_ID = 'user-cache-test-1'
// ★ 种行/对照用键输入：与 route 的 reportInput 同源——不含 token（token 是身份不是命盘参数）。
//   教训记录：把 BASE（含 token）直接摊进 annualCacheKey 会让种入键与路由键错配，三处断言全哑。
const keyInputOf = (p) => ({
  year: p.year, month: p.month, day: p.day, hour: p.hour, minute: p.minute,
  gender: p.gender, targetYear: p.targetYear,
  birthZone: p.birthZone ?? null, birthLng: p.birthLng ?? null, nowYear
})

// 若处于牙口模式：先跑对应场景并打印肯定性证据，然后按预期翻红退出（不得继续正常断言）
if (tooth) {
  console.log(`—— 牙口模式：--tooth=${tooth}（注入后先确认注入有效，再跑断言）——`)
  if (tooth === 'locked') {
    // 注入点：route 写缓存 result: stripEntitlementState(data) → result: data（把 locked 也存进去）
    const { admin, db } = makeMockAdmin(USER_ID)
    setServerSupabaseForTest(admin)
    await call(BASE)
    const row = rowsOf(db)[0]
    const leaked = 'locked' in (row?.result ?? {})
    console.log(`  [证据] 注入后写入的缓存行 result 是否含 locked 键：${leaked}（覆盖写应剥离）`)
    console.log(leaked ? '  ✓ 注入有效：权益状态被写进了缓存（断言②场景变坏）' : '  ✗ 注入无效 → 中止')
    console.log(leaked ? 'LOCKED_TOOTH_RED_CONFIRMED' : 'LOCKED_TOOTH_INVALID')
    process.exit(leaked ? 1 : 2)
  }
  if (tooth === 'dup') {
    // 注入点：reportSave 覆盖写分支 if (existing?.id) → if (existing?.id && false)（总是 insert）
    const { admin, db } = makeMockAdmin(USER_ID)
    setServerSupabaseForTest(admin)
    await call(BASE)
    await call({ ...BASE, force: true })
    const n = rowsOf(db).length
    console.log(`  [证据] 注入后同键两次写入（第二次 force）实际行数=${n}（期望覆盖写应为 1）`)
    const red = n > 1
    console.log(red ? '  ✓ 注入有效：重复行堆积复现（断言④场景变坏）' : '  ✗ 注入无效 → 中止')
    console.log(red ? 'DUP_TOOTH_RED_CONFIRMED' : 'DUP_TOOTH_INVALID')
    process.exit(red ? 1 : 2)
  }
  if (tooth === 'keyver') {
    // 注入点：reportCache.annualCacheKey 键模板去掉 v${ANNUAL_CACHE_VERSION}（键不再随版本变化）
    const { readFileSync } = await import('node:fs')
    const src = readFileSync(new URL('../src/lib/reportCache.ts', import.meta.url), 'utf8')
    const hasVer = src.includes('v${ANNUAL_CACHE_VERSION}')
    console.log(`  [证据] 注入后键模板是否仍含版本常量：${hasVer ? '是（注入无效）' : '否（键模板已失去版本段）'}`)
    const red = !hasVer
    console.log(red ? '  ✓ 注入有效：版本常量已从键模板剥离（断言③结构判据变坏）' : '  ✗ 注入无效 → 中止')
    console.log(red ? 'KEYVER_TOOTH_RED_CONFIRMED' : 'KEYVER_TOOTH_INVALID')
    process.exit(red ? 1 : 2)
  }
  console.log('未知牙口模式：' + tooth)
  process.exit(2)
}

// ---------- 断言 ① 同一请求两次 → 第二次不调 AI 且内容一致（真调路由，fetch 计数） ----------
console.log('—— ① 缓存命中不调 AI（真调 route + fetch 计数）——')
{
  const { admin, db } = makeMockAdmin(USER_ID)
  setServerSupabaseForTest(admin)
  aiCalls.length = 0
  const r1 = await call(BASE)
  const c1 = aiCalls.length
  const r2 = await call(BASE)
  const c2 = aiCalls.length
  if (!r1.json?.success || !r2.json?.success) fail(`route 调用失败：${r1.json?.error || r2.json?.error}`)
  else {
    console.log(`  [计数] 第1次 AI 调用=${c1}，第2次后=${c2}（期望 1 → 1）`)
    if (c1 !== 1) fail(`第1次请求 AI 调用数 ${c1} ≠ 1`)
    if (c2 !== 1) fail(`第2次请求 AI 调用数 ${c2} ≠ 1（缓存未生效，重复调 AI）`)
    if (r1.json.cached !== false) fail(`第1次响应 cached=${r1.json.cached}，应为 false`)
    if (r2.json.cached !== true) fail(`第2次响应 cached=${r2.json.cached}，应为 true（命中标记缺失）`)
    if (!deepEqual(r1.json.data, r2.json.data)) fail('两次返回 data 不一致')
    if (r2.json.reportId !== r1.json.reportId) fail(`命中返回 reportId ${r2.json.reportId} ≠ 首次 ${r1.json.reportId}`)
    console.log('  ✓ 第二次命中缓存：AI 计数不增、data 深度一致、cached=true、reportId 一致')
  }
}

// ---------- 断言 ② 缓存不存/不下发 locked（试吃期坏缓存自愈 + 权益重算纯函数双向） ----------
console.log('—— ② 缓存不存 locked，读取按当前权益重算 ——')
{
  const { admin, db } = makeMockAdmin(USER_ID)
  setServerSupabaseForTest(admin)
  aiCalls.length = 0
  const key = annualCacheKey(keyInputOf(BASE))
  db.rows.push({ id: 'seed-naive', __table: 'reports', user_id: USER_ID, kind: 'annual', cache_key: key,
    title: 'seed', input: {}, result: { targetYear: nowYear, liuNian: [], ai: null,
      locked: { skus: ['annual_report'], preview: '（试吃期预览）' } } })
  const r = await call(BASE)
  const d = r.json?.data ?? {}
  console.log(`  [行为] 种入坏缓存（locked+ai=null）后请求：AI 计数 ${aiCalls.length}，locked=${JSON.stringify(d.locked)}`)
  if (d.locked !== null) fail(`已解锁用户拿到 locked=${JSON.stringify(d.locked)}——缓存权益状态外泄`)
  if (d.ai == null) fail('已解锁请求 ai 不可见——坏缓存未被自愈重生成')
  if (aiCalls.length !== 1) fail(`坏缓存应视为未命中并重新生成，实际 AI 计数 ${aiCalls.length}`)
  const row = rowsOf(db).find(x => x.cache_key === key)
  if (row?.result?.ai == null) fail('自愈后缓存行 ai 应已被覆盖为全文')
  if ('locked' in (row?.result ?? {})) fail('★ 缓存行 result 含 locked——权益状态写入了缓存（原则①）')
  // 纯函数双向：真调 recomputeEntitlementFields / stripEntitlementState
  const sample = { ai: '全文', aiSource: 'AI 深度解读', locked: { skus: ['x'], preview: 'p' } }
  const lockedView = recomputeEntitlementFields({ ...sample }, { unlocked: false, skus: ['annual_report'], lockedPreview: '预览' })
  const openView = recomputeEntitlementFields({ ...sample }, { unlocked: true, skus: ['annual_report'], lockedPreview: '预览' })
  if (lockedView.ai !== null || lockedView.locked?.preview !== '预览') fail('recompute(未解锁) 应置空 ai 并给 preview')
  if (openView.locked !== null || openView.ai !== '全文') fail('recompute(已解锁) 应 locked=null 且保留全文')
  if ('locked' in stripEntitlementState(sample)) fail('stripEntitlementState 未剥掉 locked')
  console.log('  ✓ 坏缓存自愈（重生成并覆盖）；recompute 双向正确；写入前 locked 被剥离')
}

// ---------- 断言 ③ 版本号参与键匹配（旧版本行永不命中 + 结构判据） ----------
console.log('—— ③ 缓存键含算法版本（ANNUAL_CACHE_VERSION）——')
{
  const { readFileSync } = await import('node:fs')
  const { ANNUAL_CACHE_VERSION } = await import('../src/lib/reportCache.ts')
  const src = readFileSync(new URL('../src/lib/reportCache.ts', import.meta.url), 'utf8')
  let v3Fail = 0
  if (!src.includes('v${ANNUAL_CACHE_VERSION}')) { v3Fail++; fail('键模板未引用 ANNUAL_CACHE_VERSION（版本常量形同虚设）') }
  if (!src.includes('任一时必须 +1')) { v3Fail++; fail('版本常量缺「何时必须 +1」注释（改 prompt/判据/算法时无人记得升版）') }
  if (v3Fail === 0) console.log('  ✓ 结构判据：键模板引用版本常量，且注释写明「改 AI prompt/判据/排盘算法任一时必须 +1」')
  const input = keyInputOf(BASE)
  const keyNow = annualCacheKey(input)
  // 命中对照组：同键行 → 命中（证明种行/读取本身有效）
  {
    const { admin, db } = makeMockAdmin(USER_ID)
    setServerSupabaseForTest(admin)
    aiCalls.length = 0
    db.rows.push({ id: 'seed-now', __table: 'reports', user_id: USER_ID, kind: 'annual', cache_key: keyNow,
      title: 'seed', input: {}, result: { targetYear: nowYear, liuNian: [], ai: { annualOverview: 'x'.repeat(60) }, aiSource: 'AI 深度解读' } })
    const r = await call(BASE)
    if (r.json.cached !== true || aiCalls.length !== 0) fail('同键对照行未命中——缓存读取路径失效')
    else console.log('  ✓ 对照组：同键行命中（AI 计数 0，cached=true）')
  }
  // 版本行：把当前键的版本段换成旧版本/新版本 → 必须未命中（版本+1 即弃用旧缓存的行为化）
  for (const ver of [ANNUAL_CACHE_VERSION - 1, ANNUAL_CACHE_VERSION + 1]) {
    const keyOther = keyNow.replace(`:v${ANNUAL_CACHE_VERSION}:`, `:v${ver}:`)
    if (keyOther === keyNow) { fail(`键未包含版本段（v${ANNUAL_CACHE_VERSION} 替换无效果）`); continue }
    const { admin, db } = makeMockAdmin(USER_ID)
    setServerSupabaseForTest(admin)
    aiCalls.length = 0
    db.rows.push({ id: 'seed-v' + ver, __table: 'reports', user_id: USER_ID, kind: 'annual', cache_key: keyOther,
      title: 'seed', input: {}, result: { targetYear: nowYear, liuNian: [], ai: { annualOverview: 'x'.repeat(60) }, aiSource: 'AI 深度解读' } })
    const r = await call(BASE)
    if (r.json.cached !== false || aiCalls.length !== 1) fail(`v${ver} 版本行被命中——版本号未参与键匹配`)
    console.log(`  ✓ v${ver} 行未命中（重新生成，AI 计数 1）——版本号生效`)
  }
}

// ---------- 断言 ④ 覆盖写：重复生成（含 force 重生成）reports 只有一行 ----------
console.log('—— ④ 覆盖写不新增行 ——')
{
  const { admin, db } = makeMockAdmin(USER_ID)
  setServerSupabaseForTest(admin)
  aiCalls.length = 0
  await call(BASE)
  await call({ ...BASE, force: true })   // 重新生成：绕过缓存重调 AI，覆盖同一行
  const rows = rowsOf(db)
  if (rows.length !== 1) fail(`同键两次写入后行数 ${rows.length} ≠ 1（覆盖写失效，堆积重复行）`)
  if (aiCalls.length !== 2) fail(`force 重生成应重调 AI，实际计数 ${aiCalls.length}`)
  if (aiCalls.length === 2 && !String(rows[0]?.result?.ai?.annualOverview ?? '').includes('第2次生成')) {
    fail('覆盖写未更新行内容（仍是第一次的旧全文）')
  }
  console.log(`  [计数] force 重生成 AI 调用=${aiCalls.length}；reports 行数=${rows.length}（期望 2 → 1）`)
  console.log('  ✓ 同键重复生成只保留一行，且行内容已更新为最新全文')
}

// ---------- 断言 ⑤ input 全量入键：时区/经度/分钟/nowYear（行为 + 结构双证） ----------
console.log('—— ⑤ 时区/经度入键（补填出生地后必须重新生成）——')
{
  const { admin, db } = makeMockAdmin(USER_ID)
  setServerSupabaseForTest(admin)
  aiCalls.length = 0
  const ny = { ...BASE, birthLng: -74, birthZone: 'America/New_York' }
  await call(ny)
  await call(ny)
  if (aiCalls.length !== 1) fail(`纽约请求两次 AI 计数 ${aiCalls.length} ≠ 1（带时区请求未走缓存）`)
  await call({ ...ny, birthLng: -73 })   // 经度变化 → 真太阳时变化 → 必须未命中
  if (aiCalls.length !== 2) fail(`经度变化后 AI 计数 ${aiCalls.length} ≠ 2——经度未入键，会命中错误缓存`)
  const rows = rowsOf(db)
  if (rows.length !== 2) fail(`两个不同键应两行，实际 ${rows.length}`)
  const storedInput = rows[0]?.input ?? {}
  for (const k of ['birthZone', 'birthLng', 'minute', 'nowYear']) {
    if (!(k in storedInput)) fail(`缓存行 input 缺字段「${k}」——参数未全量入键`)
  }
  console.log(`  [行为] 同键两次=1次AI；经度 −74→−73 后重新生成（2次AI）；行数=${rows.length}`)
  console.log('  ✓ 时区/经度/分钟/nowYear 全量入键：补填出生地不会命中错误缓存')
}

// ---------- 未登录用户：无缓存（saveReport 无 token 返回 null，保持一致） ----------
console.log('—— ⑥ 未登录用户不走缓存（每次重算）——')
{
  const { admin, db } = makeMockAdmin(USER_ID)
  setServerSupabaseForTest(admin)
  aiCalls.length = 0
  const noTok = { ...BASE }; delete noTok.token
  const r1 = await call(noTok)
  const r2 = await call(noTok)
  if (aiCalls.length !== 2) fail(`未登录两次请求 AI 计数 ${aiCalls.length} ≠ 2（未登录不应有缓存）`)
  if (r1.json.reportId !== null || r2.json.reportId !== null) fail('未登录不应返回 reportId')
  if (rowsOf(db).length !== 0) fail('未登录不应写入 reports')
  console.log('  ✓ 未登录：每次重算（AI 2 次）、不落库、无 reportId——与 saveReport 无 token 返回 null 一致')
}

console.log('\n' + (allPass ? 'LIUNIAN_CACHE_PASS' : 'LIUNIAN_CACHE_FAIL'))
if (!allPass) process.exit(1)
