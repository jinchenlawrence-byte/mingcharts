# 任务交接书（短）：修服务端代理写死 fallback（★ 上线阻塞）

> **交接对象**：TraeCode · **纪律基准**：`docs/验收标准与红线.md`（§8.6.7）
> **日期**：2026-10-12 · **优先级**：★★★★★ **最高**（阻碍部署）
> **★ 本任务书自包含 ✓ 且【改动极小（三行 × 两处 ✗）】✓ 但【必须配套做第 ② 步**✗

---

# 〇、先读六条

1. **★★★★★ 问题**：两处代码【写死了本地代理 fallback**✗（一字不差 ✓）：
   ```ts
   const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || 'http://127.0.0.1:7897'
   ```
   **★★ 定位方式**：请【按上面这行代码内容搜**✗ 不要按行号 ✓ ——
   因为你有其它在制品（如 `setServerSupabaseInsertForTest` 注入点 ✓）会让行号漂移 ✓
   （我方核实时：`supabase.ts` 已从 31 行漂到 **40** 行 ✗ `waffo.ts` 仍在 **70** 行 ✓）
   两处所在函数：`createServerSupabase()` 与 `getWaffo()` ✓
2. **★★★★★ 我方实测确认的后果**：
   ```
   ① 不设代理 → HTTP 200 ✓
   ② setGlobalDispatcher(new ProxyAgent('http://127.0.0.1:59999'))（绝不存在的端口）
      → ★★ 【setGlobalDispatcher 本身【不抛错**✗（try/catch 抓不到 ✗）
      → ★★ 但【之后所有请求失败】：connect ECONNREFUSED ✗✗
   → 【即：设了不存在的代理 = 之后所有请求全败**✗
   ```
   **→ 上线当天：注册登录 ＋ 报告保存 ＋ 支付【全部不可用**✗✗
3. **★★ 为什么一直没被发现**：我方核实【本机 7897 确实在监听**✓ →
   开发环境一直是通的 ✓ **而 Vercel 上【不可能有那个端口**✗
4. **★ 它不是新引入的**：`supabase.ts` 早就这样 ✗ 本轮把同一模式【复制到了 `waffo.ts`**✓
   —— **但本轮把它从 1 个模块扩散到了 2 个 ✓ 且【正好卡在部署前**✗
5. **★★★★★ 修法必须【配套改 .env.local**✗** ——
   改成"只在显式设置时启用"后 ✗ **本机不设 = 直连 = 被墙**✗
   → **本机确实需要这个代理** ✓ **不配套的话【本地开发立刻断**✗
6. **★★ 只改这两处 ＋ 一个断言** ✗ —— **不要顺手重构 HTTP 层** ✓

---

# 一、改法（两处 ✓ 各三行 ✓）

## ①-a `src/lib/supabase.ts`（`createServerSupabase()` 内 ✗ 按内容搜 ✗ 行号会漂 ✓）

```ts
// ✅ 新
// 服务端出口代理：★ 仅在【显式配置】HTTPS_PROXY / HTTP_PROXY 时启用
//   （本机开发需穿墙 → 在 .env.local 里设；生产/Vercel 不设 → 直连）
// ★★★ 绝不写死本地地址 fallback：若目标环境没有该代理，
//   setGlobalDispatcher 【本身不报错】，但【之后所有请求都会 ECONNREFUSED】。
//   本仓库 2026-10-12 已实测确认此行为。
const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY
if (typeof window === 'undefined' && proxyUrl) {
  try {
    const { ProxyAgent, setGlobalDispatcher } = require('undici')
    setGlobalDispatcher(new ProxyAgent(proxyUrl))
  } catch (e) {
    console.warn('[supabase] undici 代理配置失败，将直连:', (e as Error).message)
  }
}
```

## ①-b `src/lib/waffo.ts`（`getWaffo()` 内 ✓）—— **同样三行改动** ✗

```ts
// ✅ 新（日志前缀保留 [waffo] ✗ 并保留既有的 eslint-disable 注释 ✓）
// 服务端出口代理：★ 仅在【显式配置】时启用（同 createServerSupabase）
// ★★★ 绝不写死 fallback —— 目标环境无该代理时 setGlobalDispatcher 不报错，
//   但后续所有请求 ECONNREFUSED（2026-10-12 实测确认）
const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY
if (typeof window === 'undefined' && proxyUrl) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { ProxyAgent, setGlobalDispatcher } = require('undici')
    setGlobalDispatcher(new ProxyAgent(proxyUrl))
  } catch (e) {
    console.warn('[waffo] undici 代理配置失败，将直连:', (e as Error).message)
  }
}
```

**★ 差异只有三处** ✗：**去掉 `|| 'http://127.0.0.1:7897'`** · **`if` 加 `&& proxyUrl`** · **注释写明原因** ✓

---

# 二、★ 必须配套：`.env.local` 加一行

```
# 服务端出口代理：仅本机开发需要（本机直连 Supabase 被墙）
# ★★★ 生产 / Vercel 【绝不设置这一项】
HTTPS_PROXY=http://127.0.0.1:7897
```

**★★ 并在回执里确认【你已加**✗（否则你本地会立刻断 ✗ 而你会以为是自己改坏了 ✓）**

---

# 三、`.env.example` 加说明

```
# ────────── 服务端出口代理（★ 仅本机开发）──────────
# 本机直连 Supabase / Waffo 被墙时才需要；生产【绝不设置】。
# 代码只在【显式设置】时才启用代理（见 src/lib/supabase.ts 与 src/lib/waffo.ts）。
# HTTPS_PROXY=http://127.0.0.1:7897
```

---

# 四、断言（新文件 ✗ 纳入 `npm run verify`）

```js
// scripts/test-proxy-guard.mjs
import { readFileSync } from 'node:fs'
const FILES = ['src/lib/supabase.ts', 'src/lib/waffo.ts']
let fail = 0
const check = (ok, msg) => { console.log(`  ${ok ? '✓' : '✗'} ${msg}`); if (!ok) fail++ }

for (const f of FILES) {
  const src = readFileSync(f, 'utf8')
  // ① 不得写死本地代理地址
  check(!/127\.0\.0\.1:7897/.test(src), `${f} 不得写死本地代理 fallback`)
  // ② ProxyAgent 的构造必须被 proxyUrl 真值判断包住
  check(/if\s*\([^)]*&&\s*proxyUrl\s*\)/.test(src), `${f} 代理必须仅在 proxyUrl 有值时启用`)
}
console.log(fail === 0 ? '\nPROXY_GUARD_PASS' : `\n${fail} 项失败 ✗`)
process.exit(fail === 0 ? 0 : 1)
```

**★ 牙口（两条 ✗ 各自精确翻红 ✓ 请贴注入前后输出）**：
```
★ 把 `|| 'http://127.0.0.1:7897'` 加回去 → ① 翻红 ✓
★ 把 `&& proxyUrl` 去掉              → ② 翻红 ✓
```

---

# 五、验证步骤（★ 第 ④ 步是关键 ✗ 那步才证明规则在工作 ✓）

```
① .env.local 加 HTTPS_PROXY=http://127.0.0.1:7897
② ★ 重启 dev server（Next.js 只启动时读 env ✗ 不重启不生效 ✓）
③ 跑一个真实 Supabase 请求（登录 / 保存报告 / 任意 service_role 接口 ✗）→ 应【成功**✓
④ ★★★★ 【反向验证**✗：
   把 HTTPS_PROXY 注释掉 → 重启 → 再跑同一请求
   → 本机应【失败**✓（证明代理是按显式设置在工作 ✓）
   ★ 若【仍成功**✗ → 说明代理没生效 ✗ 或别处在设 ✗ 需查 ✓
⑤ 恢复 HTTPS_PROXY → 重启 → 确认恢复成功 ✓
⑥ ★ 并跑一次【真实 Waffo 请求路径**✗（若密钥已就绪 ✗）
   —— 若未就绪 ✗ 至少确认模块能加载不报错 ✓
```

---

# 六、必须避免

- ❌ **不要用 `NODE_ENV === 'development'` 代替**（★ 隧道联调时可能不是 development ✗ 会误伤）
- ❌ **不要用 `process.env.VERCEL`**（★ 只护 Vercel ✗ 护不住自建服务器 / Docker / 其它 PaaS）
- ❌ **不要加"只允许 localhost 代理"的正则**（★ 根因是写死 fallback ✗ 不是"代理太自由"✗
  且将来真需要远端代理时会被拦住）
- ❌ **不要只改一处**（★ 只改支付 ✗ Supabase 仍挂 ✓）
- ❌ **不要顺手重构 HTTP 层 / 换代理库**（本任务只改这两处 ✗）
- ❌ **不要把 `HTTPS_PROXY` 写进任何 `NEXT_PUBLIC_` 前缀**（★ 它不是公开配置 ✗）
- ❌ **不要在 Vercel 后台设 `HTTPS_PROXY`**（★ 生产【绝不设置**✗）
- ✅ **改完发回执 ＋ 分别贴断言注入前后输出 ＋ 反向验证结果**

---

# 七、验收标准

| # | 项 | 期望 |
|---|---|---|
| 1 | `supabase.ts` 去掉 fallback ＋ `if` 加 `&& proxyUrl` | ✓ |
| 2 | `waffo.ts` 同样三处改动（保留 `[waffo]` 前缀与 eslint 注释 ✗） | ✓ |
| 3 | ★ 全仓搜 `127.0.0.1:7897` → **仅剩 `.env.example` 注释里一处** | ✓ **贴搜索结果** |
| 4 | `.env.local` 已加 `HTTPS_PROXY`（★ 回执确认 ✗） | ✓ |
| 5 | `.env.example` 加了注释段 | ✓ |
| 6 | 新断言脚本纳入 verify | ✓ |
| 7 | ★ 牙口两条（加回 fallback ／ 去掉 `&& proxyUrl` ✗）各自精确翻红 | ✓ **贴注入前后** |
| 8 | ★★ 本地真实请求成功（重启后 ✗） | ✓ |
| 9 | ★★★★ **反向验证：注释掉 `HTTPS_PROXY` → 本地应失败** | ✓ **贴结果** |
| 10 | `npm run verify` 全绿 ＋ `tsc --noEmit` 0 错误 | ✓ |
| 11 | ★ 未顺手改其它模块 | ✓ |

---

# 八、一句话

> **三行 × 两处的改动** ✗ —— 但它是**部署前的最后一道阻塞** ✓
>
> **① 去掉 `|| 'http://127.0.0.1:7897'`** ✗（`supabase.ts` ＋ `waffo.ts` 各一处 ✓）
> **② `if` 加 `&& proxyUrl`** ✗ —— 只在【显式配置**✗时才启用代理 ✓
> **③ ★ 配套：`.env.local` 加 `HTTPS_PROXY=http://127.0.0.1:7897`** ✗
>   **—— 不加的话【本地立刻断**✗（而你会以为是自己改坏了 ✓）
> **④ `.env.example` 写明「生产绝不设置」** ✓
> **⑤ 断言守护 ＋ 牙口**（加回 fallback → 翻红 ✓）
>
> **★★★★★ 而最要紧的是第 ⑥ 步【反向验证**✗**：
> **注释掉 `HTTPS_PROXY` → 重启 → 本地应当【失败**✓
> **—— 那一步才证明"按显式设置"这个规则真的在工作**✓
> **而不是"恰好本机有个代理在跑所以看起来没事"**✗
>
> **★★ 我方实测依据（为什么确定这是真问题 ✗）**：
> **`setGlobalDispatcher` 指向不存在的代理时【本身不抛错**✗（所以 try/catch 抓不到 ✓），
> **但【之后所有请求 ECONNREFUSED**✗ ——
> **而 Vercel 上【不可能有 127.0.0.1:7897**✗ 且 `.env.example` 也没提要设 ✓
