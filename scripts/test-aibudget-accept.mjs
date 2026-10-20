// AI 全局日预算熔断验收（token 防盗用第三档，2026-10-20）
// 覆盖：① 纯函数（dailyBudgetFor / resolveDailyBudget / dayWindowStart）
//       ② 开关关闭（删 env）→ 直接放行、不查库（子进程验证）
//       ③ 开关开启（env=true）→ 原子计数、超额翻转、次日窗口重置、显式覆盖、fail-open（子进程验证）
//       ④ DAU 投影（昨日 reports 去重 user_id）＋ 30 秒 TTL 缓存（clearDauCache 可断言）
//       ⑤ 六个 AI 路由接线：checkRateLimit 先于 checkAiBudget 先于 AI 调用
import { readFileSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

let allPass = true
const fail = (m) => { allPass = false; console.log('  ✗ ' + m) }
const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')
const strip = (s) => s.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// ---------- ① 纯函数 ----------
{
  let f = 0
  const { dailyBudgetFor, resolveDailyBudget, dayWindowStart, AI_DAU_FLOOR, AI_PER_USER_DAILY_BUDGET } =
    await import('../src/lib/aiBudget.ts')
  const eq = (got, want, label) => { if (got !== want) { f++; fail(`${label}：期望 ${want}，实得 ${got}`) } }

  // 常量基线（下限 20 × 每人 10）
  eq(AI_DAU_FLOOR, 20, 'AI_DAU_FLOOR')
  eq(AI_PER_USER_DAILY_BUDGET, 10, 'AI_PER_USER_DAILY_BUDGET')

  // 按 DAU 投影：max(dau, 下限) × 每人配额
  eq(dailyBudgetFor(0), 200, 'dailyBudgetFor(0)=下限×配额')
  eq(dailyBudgetFor(5), 200, 'dailyBudgetFor(5)=下限兜底')
  eq(dailyBudgetFor(20), 200, 'dailyBudgetFor(20)=下限')
  eq(dailyBudgetFor(25), 250, 'dailyBudgetFor(25)')
  eq(dailyBudgetFor(100.7), 1000, 'dailyBudgetFor(100.7)=向下取整×配额')
  eq(dailyBudgetFor(-3), 200, 'dailyBudgetFor(负数)=下限兜底')
  eq(dailyBudgetFor(NaN), 200, 'dailyBudgetFor(NaN)=下限兜底')

  // 显式覆盖优先；非法/非正值忽略 → 回退 DAU 投影
  eq(resolveDailyBudget(25, {}), 250, 'resolveDailyBudget(默认)=DAU 投影')
  eq(resolveDailyBudget(25, { AI_DAILY_BUDGET: '1000' }), 1000, 'resolveDailyBudget(显式覆盖)')
  eq(resolveDailyBudget(25, { AI_DAILY_BUDGET: '0' }), 250, 'resolveDailyBudget(0=忽略)')
  eq(resolveDailyBudget(25, { AI_DAILY_BUDGET: 'abc' }), 250, 'resolveDailyBudget(非数=忽略)')
  eq(resolveDailyBudget(25, { AI_DAILY_BUDGET: '-5' }), 250, 'resolveDailyBudget(负数=忽略)')

  // UTC 日窗口起点
  eq(dayWindowStart(0), 0, 'dayWindowStart(0)')
  eq(dayWindowStart(1_000_000), 0, 'dayWindowStart(小值)')
  eq(dayWindowStart(86_400_000), 86_400_000, 'dayWindowStart(整日)')
  eq(dayWindowStart(86_400_000 + 5000), 86_400_000, 'dayWindowStart(跨日边界)')

  console.log(f === 0
    ? '✓ 纯函数：dailyBudgetFor / resolveDailyBudget（显式优先） / dayWindowStart 全过'
    : '✗ 纯函数断言失败')
}

// ---------- ⑤ 六个 AI 路由接线：checkRateLimit → checkAiBudget → AI 调用 ----------
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
    if (!code.includes('checkAiBudget(')) { f++; fail(`${p} 未接线 checkAiBudget`) }
    if (!code.includes("from '@/lib/aiBudget'")) { f++; fail(`${p} 未 import aiBudget`) }
    const iRl = code.indexOf('checkRateLimit(')
    const iBud = code.indexOf('checkAiBudget(')
    const iAi = code.indexOf(`await ${aiFn}(`)
    if (iRl < 0 || iBud < 0 || iAi < 0 || !(iRl < iBud && iBud < iAi)) {
      f++; fail(`${p} 顺序错误：应为 限流 → 预算 → AI（iRl=${iRl}, iBud=${iBud}, iAi=${iAi}）`)
    }
  }
  // 超额标注文案（降级为规则版，非 429）
  for (const p of ['../src/app/api/geo/route.ts', '../src/app/api/ziwei/route.ts', '../src/app/api/hemun/route.ts', '../src/app/api/liunian/route.ts']) {
    if (!read(p).includes('当日 AI 额度已用尽，次日恢复')) { f++; fail(`${p} 未标注预算超额降级文案`) }
  }
  console.log(f === 0
    ? '✓ 接线：六个 AI 路由均 限流 → 预算 → AI；四个报告路由带超额降级标注'
    : '✗ 接线断言失败')
}

// ---------- ② 开关关闭（删 env）→ 直接放行、不查库 ----------
{
  const tmpDir = path.join(root, 'temp')
  mkdirSync(tmpDir, { recursive: true })
  const tmpOff = path.join(tmpDir, '__ab_off.mts')
  writeFileSync(tmpOff, [
    "const { checkAiBudget } = await import('../src/lib/aiBudget.ts')",
    "let called = 0",
    "const admin = { rpc: async () => { called++; return { data: 999, error: null } }, from: () => { called++; return {} } }",
    "const r = await checkAiBudget(admin, 1000000)",
    "console.log('AB_OFF:' + JSON.stringify({ enforce: r.enforce, exhausted: r.exhausted, called }))",
  ].join('\n'))
  const env = { ...process.env }
  delete env.AI_BUDGET_ENFORCE
  const rr = spawnSync('npx', ['tsx', 'temp/__ab_off.mts'], { cwd: root, env, encoding: 'utf8', shell: process.platform === 'win32' })
  const line = (rr.stdout || '').split('\n').find(l => l.startsWith('AB_OFF:')) || ''
  rmSync(tmpOff, { force: true })
  let parsed = {}
  try { parsed = JSON.parse(line.slice('AB_OFF:'.length)) } catch {}
  if (parsed.enforce !== false || parsed.exhausted !== false || parsed.called !== 0) {
    fail(`开关关闭：应放行且零查库（got=${JSON.stringify(parsed)}；预期 {enforce:false,exhausted:false,called:0}）`)
  } else {
    console.log('✓ 开关关闭（生产默认）：放行且【零查库】（内测/本地零影响）')
  }
}

// ---------- ③+④ 开关开启（env=true）→ 计数/超额/窗口重置/DAU 投影/TTL/fail-open ----------
{
  const tmpDir = path.join(root, 'temp')
  mkdirSync(tmpDir, { recursive: true })
  const tmpOn = path.join(tmpDir, '__ab_on.mts')
  writeFileSync(tmpOn, [
    "const { checkAiBudget, clearDauCache, AI_DAU_FLOOR, AI_PER_USER_DAILY_BUDGET } = await import('../src/lib/aiBudget.ts')",
    "const mkAdmin = (state) => ({",
    "  rpc: async (_n, a) => {",
    "    if (state.rpcError) return { data: null, error: { code: '42883', message: 'no function' } }",
    "    const k = a.p_bucket + '|' + a.p_key + '|' + a.p_window_start",
    "    state.bump = (state.bump || 0) + 1",
    "    state.counts[k] = (state.counts[k] || 0) + 1",
    "    return { data: state.counts[k], error: null }",
    "  },",
    "  from: () => ({",
    "    select: () => ({",
    "      gte: () => ({",
    "        lt: async () => {",
    "          state.dauQ = (state.dauQ || 0) + 1",
    "          if (state.dauError) return { data: null, error: { code: 'X', message: 'boom' } }",
    "          return { data: state.dauRows || [], error: null }",
    "        }",
    "      })",
    "    })",
    "  })",
    "})",
    "const out = {}",
    "const now = 86_400_000  // 第 2 个 UTC 日窗口起点（非 0，便于看窗口重置）",
    "",
    "// ④ DAU 去重投影：3 行 2 个不同 user_id → DAU=2 → 预算=max(2,20)*10=200",
    "const st1 = { counts: {}, dauRows: [{ user_id: 'u1' }, { user_id: 'u1' }, { user_id: 'u2' }] }",
    "const a1 = mkAdmin(st1)",
    "clearDauCache()",
    "const b1 = await checkAiBudget(a1, now)",
    "out.budgetFloor = b1.budget",
    "out.dauQueries1 = st1.dauQ",
    "",
    "// ④ TTL 缓存：同一 now 再调 → 复用缓存（不再查 DAU）；超 30s → 重新查",
    "await checkAiBudget(a1, now)",
    "out.dauQueries2 = st1.dauQ",
    "await checkAiBudget(a1, now + 31_000)",
    "out.dauQueries3 = st1.dauQ",
    "",
    "// ③ 超额翻转：显式覆盖预算为 3（AI_DAILY_BUDGET 在进程 env 里设），第 4 次应报 exhausted",
    "const st2 = { counts: {} }",
    "const a2 = mkAdmin(st2)",
    "clearDauCache()",
    "const seen = []",
    "for (let i = 1; i <= 4; i++) { const r = await checkAiBudget(a2, now + 1_000_000); seen.push(r.exhausted) }",
    "out.flip = seen  // [false,false,false,true]（budget=3）",
    "",
    "// ③ 次日窗口重置：新窗口起点 → 计数归零 → 不再超额（spent=1）",
    "const rNext = await checkAiBudget(a2, now + 86_400_000 + 1_000_000)",
    "out.nextDayExhausted = rNext.exhausted",
    "out.nextDaySpent = rNext.spent",
    "",
    "// ④ 去掉显式覆盖 → 回到按 DAU 投影：DAU=50 → 预算=max(50,20)*10=500",
    "delete process.env.AI_DAILY_BUDGET",
    "const st5 = { counts: {}, dauRows: Array.from({ length: 50 }, (_, i) => ({ user_id: 'u' + i })) }",
    "const a5 = mkAdmin(st5)",
    "clearDauCache()",
    "const rProj = await checkAiBudget(a5, now)",
    "out.projBudget = rProj.budget",
    "",
    "// ③ fail-open：计数基础设施故障 → 放行（不阻断业务）",
    "const st3 = { counts: {}, rpcError: true }",
    "const a3 = mkAdmin(st3)",
    "clearDauCache()",
    "const rFo = await checkAiBudget(a3, now)",
    "out.failopenBump = rFo.exhausted",
    "",
    "// ③ DAU 查询失败 → DAU=0 → 下限兜底 → 预算 200，不阻断",
    "const st4 = { counts: {}, dauError: true }",
    "const a4 = mkAdmin(st4)",
    "clearDauCache()",
    "const rDauErr = await checkAiBudget(a4, now)",
    "out.dauErrorBudget = rDauErr.budget",
    "out.dauErrorExhausted = rDauErr.exhausted",
    "",
    "out.floor = AI_DAU_FLOOR; out.per = AI_PER_USER_DAILY_BUDGET",
    "console.log('AB_ON:' + JSON.stringify(out))",
  ].join('\n'))
  const env = { ...process.env, AI_BUDGET_ENFORCE: 'true', AI_DAILY_BUDGET: '3' }
  const rr = spawnSync('npx', ['tsx', 'temp/__ab_on.mts'], { cwd: root, env, encoding: 'utf8', shell: process.platform === 'win32' })
  const line = (rr.stdout || '').split('\n').find(l => l.startsWith('AB_ON:')) || ''
  rmSync(tmpOn, { force: true })
  let o = {}
  try { o = JSON.parse(line.slice('AB_ON:'.length)) } catch {}
  let f = 0
  const eq = (got, want, label) => { if (got !== want) { f++; fail(`${label}：期望 ${want}，实得 ${got}`) } }
  const eqArr = (got, want, label) => { if (JSON.stringify(got) !== JSON.stringify(want)) { f++; fail(`${label}：期望 ${JSON.stringify(want)}，实得 ${JSON.stringify(got)}`) } }

  // ★ 注：AI_DAILY_BUDGET=3 显式覆盖，故 budgetFloor 也应为 3（显式优先）
  eq(o.budgetFloor, 3, '显式覆盖优先于 DAU 投影（预算=3）')
  eq(o.dauQueries1, 1, '首次调用查 1 次 DAU')
  eq(o.dauQueries2, 1, 'TTL 内复用缓存（不再查 DAU）')
  eq(o.dauQueries3, 2, '超 30 秒 TTL → 重新查 DAU')
  eqArr(o.flip, [false, false, false, true], '预算=3：第 4 次超预算翻转 exhausted')
  eq(o.nextDayExhausted, false, '次日窗口重置：不再超额')
  eq(o.nextDaySpent, 1, '次日窗口重置：计数归零后首条 spent=1')
  eq(o.projBudget, 500, '无显式覆盖 → DAU=50 投影 → 预算 500')
  eq(o.failopenBump, false, '计数基础设施故障 → fail-open 放行')
  eq(o.dauErrorBudget, 200, 'DAU 查询失败 → 0 → 下限兜底 → 预算 200')
  eq(o.dauErrorExhausted, false, 'DAU 查询失败不阻断（未超额）')
  eq(o.floor, 20, '常量 AI_DAU_FLOOR 导出')
  eq(o.per, 10, '常量 AI_PER_USER_DAILY_BUDGET 导出')
  console.log(f === 0
    ? '✓ 开启：DAU 去重投影 / TTL 30s / 超额翻转 / 次日重置 / 显式覆盖 / 双 fail-open 全过'
    : '✗ 开启行为断言失败')
}

console.log('\n' + (allPass ? 'AIBUDGET_ACCEPT_PASS' : 'AIBUDGET_ACCEPT_FAIL'))
if (!allPass) process.exit(1)
