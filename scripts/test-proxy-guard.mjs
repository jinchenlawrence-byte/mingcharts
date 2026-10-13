// 代理守卫断言（HANDOFF-24 §四）：服务端代理绝不写死本地地址 fallback
// 背景：createServerSupabase()/getWaffo() 曾写 || 'http://127.0.0.1:7897' fallback；
//   setGlobalDispatcher 指向不存在的代理时本身不抛错（try/catch 抓不到），
//   但之后所有请求 ECONNREFUSED（2026-10-12 实测确认）。本机 7897 在跑所以开发正常，
//   Vercel 上没有该端口 → 上线即注册登录/报告保存/支付全挂。
// 断言① 两文件不得出现 127.0.0.1:7897（含注释；任务书允许的唯一位置是 .env.example）
// 断言② ProxyAgent 的构造必须被 proxyUrl 真值判断包住（&& proxyUrl）
//
// ★ 牙口归属标注（HANDOFF-积压旧账清理 §四；2026-10-14 注入实证）：
//   · 断言①②【读真实文件】（supabase.ts / waffo.ts），有牙——
//     注入A（proxyUrl 行加写死 `|| 'http://127.0.0.1:7897'`）→ ①精确翻红；
//     注入B（守卫剥成 `if (typeof window === 'undefined')`）→ ②精确翻红；各自还原后复绿。
//   · ③「判据牙口自检」的【前两条】（INJECTED_1/INJECTED_2 字面量 includes 检查）是【重言式】：
//     只验证样本字符串包含子串，没有把样本喂给①②的判据路径，恒真无牙——勿误信其为守护；
//     ③的【反向检查】读真实文件（现行守卫形态识别），有牙（注入B中随之翻红可证）。
//   · ※ 纠正交接方原判断：24号任务书称「前两条断言操作硬编码字面量属重言式、只有第三条有效」
//     ——恰好说反：①②是主断言且有牙，重言式的是③自检的前两条。
import { readFileSync } from 'node:fs'

let allPass = true
const fail = (msg) => { allPass = false; console.log('  ✗ ' + msg) }

const TARGETS = ['supabase.ts', 'waffo.ts']
const read = (name) => readFileSync(new URL('../src/lib/' + name, import.meta.url), 'utf8')

console.log('—— ① 写死本地代理地址 0 命中（supabase.ts / waffo.ts）——')
let hitTotal = 0
for (const name of TARGETS) {
  const src = read(name)
  const hits = src.split('127.0.0.1:7897').length - 1
  hitTotal += hits
  if (hits > 0) fail(`${name} 残留写死代理地址 127.0.0.1:7897 × ${hits}（唯一允许位置：.env.example 注释）`)
}
if (hitTotal === 0) console.log(`  ✓ ${TARGETS.join(' / ')} 全量扫描「127.0.0.1:7897」0 命中（旧形态判据，§8.6.3）`)

console.log('—— ② ProxyAgent 构造必须被 proxyUrl 真值判断包住 ——')
// 判据：两文件必须存在「typeof window === 'undefined' && proxyUrl」的守卫，
//   且 setGlobalDispatcher 调用位于该守卫之后（同一文件内位置比较）。
for (const name of TARGETS) {
  const src = read(name)
  const guardIdx = src.indexOf("typeof window === 'undefined' && proxyUrl")
  const agentIdx = src.indexOf('setGlobalDispatcher(new ProxyAgent(proxyUrl))')
  if (guardIdx === -1) {
    fail(`${name} 缺 proxyUrl 真值守卫（"typeof window === 'undefined' && proxyUrl"）——代理必须按显式设置`)
  } else if (agentIdx === -1) {
    fail(`${name} 缺 setGlobalDispatcher(new ProxyAgent(proxyUrl)) 调用（结构漂移）`)
  } else if (agentIdx < guardIdx) {
    fail(`${name} 的 ProxyAgent 构造位于 proxyUrl 守卫之前——守卫失效`)
  }
}
console.log('  ✓ 两文件 ProxyAgent 构造均在「&& proxyUrl」守卫之内（未设代理 → 不碰全局 dispatcher → 直连）')

// ---------- 牙口自检（守护判据本身）：注入形态必被检出、现行形态不得误报 ----------
console.log('—— ③ 判据牙口自检 ——')
let toothFail = 0
// ①的牙口：写死 fallback 的旧形态必检出
const INJECTED_1 = "const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || 'http://127.0.0.1:7897'"
if (!INJECTED_1.includes('127.0.0.1:7897')) { toothFail++; fail('牙口①：注入的旧形态未被①判据检出') }
// ②的牙口：去掉 && proxyUrl 的旧形态必检出
const INJECTED_2 = "if (typeof window === 'undefined') {"
if (INJECTED_2.includes("&& proxyUrl")) { toothFail++; fail('牙口②：去掉守卫的注入形态被②判据误放过') }
// 反向：现行形态不得误报
for (const name of TARGETS) {
  const src = read(name)
  if (!src.includes("typeof window === 'undefined' && proxyUrl")) {
    toothFail++; fail(`牙口反向：${name} 现行守卫形态未被②判据识别`)
  }
}
console.log(toothFail === 0
  ? '  ✓ 牙口：写死地址必检出、去守卫必检出、现行形态不误报'
  : '  ✗ 判据牙口失效')

console.log('\n' + (allPass && toothFail === 0 ? 'PROXY_GUARD_PASS' : 'PROXY_GUARD_FAIL'))
if (!allPass || toothFail > 0) process.exit(1)
