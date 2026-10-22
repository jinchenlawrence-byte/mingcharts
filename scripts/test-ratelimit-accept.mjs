// 速率限制验收（token 防盗用第二档，2026-10-20）
// 覆盖：① 纯函数（fixedWindowStart / clientKey / rateLimitedBody）
//       ② 开关关闭时【不查库】直接放行（子进程删 env 验证）
//       ③ 开关开启时固定窗口计数（子进程 env=true 验证）：第 N+1 次拦截、窗口重置、多规则、fail-open
//       ④ 六个 AI 路由的接线（checkRateLimit 先于 AI 调用；liunian 含 FORCE_RULES；ask 含 ASK_RULES）
import { readFileSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import path from 'node:path'

let allPass = true
const fail = (m) => { allPass = false; console.log('  ✗ ' + m) }
const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')
const strip = (s) => s.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// ---------- ① 纯函数 ----------
{
  let f = 0
  const { fixedWindowStart, clientKey, rateLimitedBody, ASK_RULES } = await import('../src/lib/rateLimit.ts')

  const eq = (got, want, label) => { if (got !== want) { f++; fail(`${label}：期望 ${want}，实得 ${got}`) } }
  eq(fixedWindowStart(0, 60_000), 0, 'fixedWindowStart(0)')
  eq(fixedWindowStart(61_000, 60_000), 60_000, 'fixedWindowStart(61s/1min)')
  eq(fixedWindowStart(119_000, 60_000), 60_000, 'fixedWindowStart(119s/1min)')
  eq(fixedWindowStart(120_000, 60_000), 120_000, 'fixedWindowStart(120s/1min)')
  eq(fixedWindowStart(3_600_000, 3_600_000), 3_600_000, 'fixedWindowStart(1h/1h)')

  // clientKey：登录 → u:<id>；匿名 → ip:<sha256 前 16 位>（不落原始 IP）
  eq(clientKey('abc123', new Request('http://x')), 'u:abc123', 'clientKey(登录)')
  const ipHash = (ip) => createHash('sha256').update(ip).digest('hex').slice(0, 16)
  const reqA = new Request('http://x', { headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' } })
  const reqA2 = new Request('http://x', { headers: { 'x-forwarded-for': '1.2.3.4, 9.9.9.9' } })
  const reqB = new Request('http://x', { headers: { 'x-forwarded-for': '5.5.5.5' } })
  eq(clientKey(null, reqA), `ip:${ipHash('1.2.3.4')}`, 'clientKey(匿名, XFF 首段)')
  eq(clientKey(null, reqA2), clientKey(null, reqA), 'clientKey(同 IP 不同后缀 → 同键)')
  if (clientKey(null, reqA) === clientKey(null, reqB)) { f++; fail('clientKey(不同 IP 应得不同键)') }
  if (/1\.2\.3\.4/.test(clientKey(null, reqA))) { f++; fail('clientKey 不应包含原始 IP') }

  const body = rateLimitedBody({ allowed: false, retryAfterSec: 7 })
  eq(body.code, 'RATE_LIMITED', 'rateLimitedBody.code')
  eq(body.retryAfter, 7, 'rateLimitedBody.retryAfter')
  if (!body.error.includes('7')) { f++; fail('rateLimitedBody.error 应含等待秒数') }

  // ★ 追问单独桶（2026-10-22）：bucket/max/window 三者缺一不可（改口径必须同步本断言）
  eq(ASK_RULES.length, 1, 'ASK_RULES 应恰好 1 条')
  eq(ASK_RULES[0].bucket, 'ai_ask_day', 'ASK_RULES.bucket')
  eq(ASK_RULES[0].max, 30, 'ASK_RULES.max（追问 30 次/日）')
  eq(ASK_RULES[0].windowMs, 86_400_000, 'ASK_RULES.windowMs（按日）')

  console.log(f === 0
    ? '✓ 纯函数：fixedWindowStart / clientKey(含 IP 哈希不落原值) / rateLimitedBody 全过'
    : '✗ 纯函数断言失败')
}

// ---------- ④ 六个 AI 路由接线：checkRateLimit 先于 AI 调用 ----------
{
  let f = 0
  const ROUTES = [
    ['../src/app/api/unlock/route.ts', 'generateAIAnalysis'],
    ['../src/app/api/liunian/route.ts', 'generateAILiunian'],
    ['../src/app/api/ziwei/route.ts', 'generateAIZiwei'],
    ['../src/app/api/hemun/route.ts', 'generateAIHemun'],
    ['../src/app/api/geo/route.ts', 'generateAIGeo'],
    ['../src/app/api/ask/route.ts', 'generateAskAnswer'],
  ]
  for (const [p, aiFn] of ROUTES) {
    const code = strip(read(p))
    if (!code.includes('checkRateLimit(')) { f++; fail(`${p} 未接线 checkRateLimit`) }
    if (!code.includes('rateLimitedBody(')) { f++; fail(`${p} 未使用 rateLimitedBody 构造 429`) }
    if (!code.includes('clientKey(')) { f++; fail(`${p} 未使用 clientKey`) }
    const iRl = code.indexOf('checkRateLimit(')
    const iAi = code.indexOf(`await ${aiFn}(`)
    if (iRl < 0 || iAi < 0 || iRl > iAi) { f++; fail(`${p} 限流未先于 AI 调用（顺序错误）`) }
  }
  // liunian 必须对 force 叠加收紧规则
  if (!strip(read('../src/app/api/liunian/route.ts')).includes('FORCE_RULES')) {
    f++; fail('liunian 未对 force=true 叠加 FORCE_RULES')
  }
  // ask 必须叠加追问单独日桶（否则囤额度用户可吃满 50/日 总桶）
  if (!strip(read('../src/app/api/ask/route.ts')).includes('ASK_RULES')) {
    f++; fail('ask 未叠加 ASK_RULES（追问缺少单独日桶）')
  }
  console.log(f === 0
    ? '✓ 接线：六个 AI 路由均限流先于 AI 调用；liunian force 叠加收紧规则；ask 叠加 ASK_RULES'
    : '✗ 接线断言失败')
}

// ---------- ② 开关关闭（删 env）→ 直接放行、不查库 ----------
{
  const tmpDir = path.join(root, 'temp')
  mkdirSync(tmpDir, { recursive: true })
  const tmpOff = path.join(tmpDir, '__rl_off.mts')
  writeFileSync(tmpOff, [
    "const { checkRateLimit } = await import('../src/lib/rateLimit.ts')",
    "let called = 0",
    "const admin = { rpc: async () => { called++; return { data: 999, error: null } } }",
    "const r = await checkRateLimit(admin, 'u:x', [{ bucket: 'b', max: 5, windowMs: 60000 }], 1000000)",
    "console.log('RL_OFF:' + JSON.stringify({ allowed: r.allowed, called }))",
  ].join('\n'))
  const env = { ...process.env }
  delete env.RATE_LIMIT_ENFORCE
  const rr = spawnSync('npx', ['tsx', 'temp/__rl_off.mts'], { cwd: root, env, encoding: 'utf8', shell: process.platform === 'win32' })
  const line = (rr.stdout || '').split('\n').find(l => l.startsWith('RL_OFF:')) || ''
  rmSync(tmpOff, { force: true })
  let parsed = {}
  try { parsed = JSON.parse(line.slice('RL_OFF:'.length)) } catch {}
  if (parsed.allowed !== true || parsed.called !== 0) {
    fail(`开关关闭：应放行且零查库（got=${JSON.stringify(parsed)}；预期 {allowed:true,called:0}）`)
  } else {
    console.log('✓ 开关关闭（生产默认）：直接放行且【零查库】（内测/本地零影响）')
  }
}

// ---------- ③ 开关开启（env=true）→ 固定窗口计数 ----------
{
  const tmpDir = path.join(root, 'temp')
  mkdirSync(tmpDir, { recursive: true })
  const tmpOn = path.join(tmpDir, '__rl_on.mts')
  writeFileSync(tmpOn, [
    "const { checkRateLimit } = await import('../src/lib/rateLimit.ts')",
    "const mk = (state) => ({ rpc: async (_n, a) => {",
    "  const k = a.p_bucket + '|' + a.p_key + '|' + a.p_window_start",
    "  state[k] = (state[k] || 0) + 1",
    "  return { data: state[k], error: null }",
    "} })",
    "const out = {}",
    "const st = {}; const admin = mk(st); const rules = [{ bucket: 'min', max: 5, windowMs: 60000 }]",
    "const now = 1000000",
    "for (let i = 1; i <= 5; i++) { const r = await checkRateLimit(admin, 'u:x', rules, now); out['c'+i] = r.allowed }",
    "const r6 = await checkRateLimit(admin, 'u:x', rules, now); out.c6 = r6.allowed; out.ra6 = r6.retryAfterSec; out.b6 = r6.bucket",
    "// 窗口重置（下一分钟）：第一条应放行",
    "const r7 = await checkRateLimit(admin, 'u:x', rules, now + 60000); out.reset = r7.allowed",
    "// 多规则：分钟 max2 + 日 max3 —— 第 3 次应被【分钟】桶拦下",
    "const st2 = {}; const admin2 = mk(st2)",
    "const rules2 = [{ bucket: 'm2', max: 2, windowMs: 60000 }, { bucket: 'd2', max: 3, windowMs: 86400000 }]",
    "await checkRateLimit(admin2, 'u:y', rules2, now); await checkRateLimit(admin2, 'u:y', rules2, now)",
    "const m3 = await checkRateLimit(admin2, 'u:y', rules2, now); out.m3 = m3.allowed; out.m3b = m3.bucket",
    "// fail-open：计数基础设施故障 → 放行（限流是防护不是功能）",
    "const bad = { rpc: async () => ({ data: null, error: { code: '42883', message: 'function bump_rate_limit does not exist' } }) }",
    "const fa = await checkRateLimit(bad, 'u:z', rules, now); out.failopen = fa.allowed",
    "console.log('RL_ON:' + JSON.stringify(out))",
  ].join('\n'))
  const env = { ...process.env, RATE_LIMIT_ENFORCE: 'true' }
  const rr = spawnSync('npx', ['tsx', 'temp/__rl_on.mts'], { cwd: root, env, encoding: 'utf8', shell: process.platform === 'win32' })
  const line = (rr.stdout || '').split('\n').find(l => l.startsWith('RL_ON:')) || ''
  rmSync(tmpOn, { force: true })
  let o = {}
  try { o = JSON.parse(line.slice('RL_ON:'.length)) } catch {}
  let f = 0
  const eq = (got, want, label) => { if (got !== want) { f++; fail(`${label}：期望 ${want}，实得 ${got}`) } }
  for (let i = 1; i <= 5; i++) eq(o['c' + i], true, `窗口内第 ${i} 次应放行`)
  eq(o.c6, false, '第 6 次应被拦截')
  eq(o.ra6, 20, '拦截应给出到窗口结束的 retryAfter（20 秒）')
  eq(o.b6, 'min', '拦截应报命中桶名')
  eq(o.reset, true, '下一窗口首条应放行（窗口重置）')
  eq(o.m3, false, '多规则：超过【分钟】上限应拦截')
  eq(o.m3b, 'm2', '多规则：应报分钟桶')
  eq(o.failopen, true, '计数失败应 fail-open 放行')
  console.log(f === 0
    ? '✓ 开启：5 次放行/第 6 次拦(带 retryAfter+桶名)/窗口重置/多规则/计数故障 fail-open 全过'
    : '✗ 开启行为断言失败')
}

console.log('\n' + (allPass ? 'RATELIMIT_ACCEPT_PASS' : 'RATELIMIT_ACCEPT_FAIL'))
if (!allPass) process.exit(1)
