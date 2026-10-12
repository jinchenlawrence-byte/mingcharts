# 回执：服务端代理写死 fallback 修复（HANDOFF-24 · 上线阻塞）

> **回传对象**：DeepSeek 侧
> **对应任务书**：`HANDOFF-服务端代理写死fallback修复.md`（203 行，含完整 diff/断言/验证步骤）
> **日期**：2026-10-13
> **Commit**：`ae56df7`（5 文件 +85/−7）

---

# 一、结论

```
✅ 两处写死 fallback 已删（supabase.ts + waffo.ts，各三处差异：去 fallback / && proxyUrl / 注释）
✅ .env.local 已含 HTTPS_PROXY=http://127.0.0.1:7897（核实原本就在，无需新增）
✅ .env.example 补代理说明注释段（本机开发才设；生产/Vercel 绝不设置；禁 NEXT_PUBLIC_ 前缀）
✅ test-proxy-guard.mjs 新建并纳入 verify（断言①② + 判据牙口自检）
✅ 牙口两条注入翻红、回退复绿（输出见 §三）
✅★ 反向验证三步实测：带代理 OK → 剔除代理 fetch failed → 恢复 OK（§四）
✅ npm run verify 全绿（链首 tsc --noEmit 0 错误）+ PROXY_GUARD_PASS 收尾
```

---

# 二、修复明细

**① 两处改后的实际代码片段**（任务书回执项 1）

`src/lib/supabase.ts`（createServerSupabase() 内）：

```ts
  // 服务端环境下按【显式设置】使用代理（Node.js 默认不走系统代理，直连被墙）
  // ★ 绝不写死本地地址 fallback（HANDOFF-24）：setGlobalDispatcher 指向不存在的代理时
  //   本身不抛错（try/catch 抓不到），但之后所有请求 ECONNREFUSED（2026-10-12 实测确认）。
  //   本机 7897 恰好在跑所以开发一直正常，Vercel 上没有该端口 → 上线即全挂。
  //   本机开发在 .env.local 设 HTTPS_PROXY；生产/Vercel 绝不设置。
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

`src/lib/waffo.ts`（getWaffo() 内，保留 [waffo] 日志前缀与 eslint 注释）：

```ts
  // 服务端出口按【显式设置】走代理（与 createServerSupabase 同理：Node 默认不吃系统代理，直连被墙）
  // ★ 绝不写死本地地址 fallback（HANDOFF-24）：setGlobalDispatcher 指向不存在的代理时
  //   本身不抛错，但之后所有请求 ECONNREFUSED（2026-10-12 实测确认）；
  //   Vercel 上没有 7897 端口 → 写死 fallback 上线即全挂。本机开发设 HTTPS_PROXY，生产绝不设。
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

按代码内容搜定位（未用行号）✓；「不做清单」六项全部遵守：未用 NODE_ENV/VERCEL 判别、未加 localhost 正则、两处都改、未重构 HTTP 层、未写 NEXT_PUBLIC_HTTPS_PROXY。

**② .env 配套**

- `.env.local`：核实**原本已含** `HTTPS_PROXY=http://127.0.0.1:7897`（20 行中的第 20 行），无需新增——本地不会因删掉 fallback 而断。
- `.env.example` 末尾追加注释段：

```
# ────────── 服务端出口代理（★ 仅本机开发需要）──────────
# Node.js 服务端默认不走系统代理；本机直连 Supabase/Waffo 被墙时需显式指定。
# ★ 生产 / Vercel【绝不设置这一项】——代码按显式设置走代理，未设置则直连；
#   切勿在 Vercel 后台配置 HTTPS_PROXY（服务端应直连，设了反而可能指向不存在端口全挂）。
# ★ 绝不可写成 NEXT_PUBLIC_ 前缀（仅服务端使用）。
# HTTPS_PROXY=http://127.0.0.1:7897
```

---

# 三、断言与牙口（任务书回执项 3）

`scripts/test-proxy-guard.mjs`（已纳入 `npm run verify` 链尾）：断言① 两文件「127.0.0.1:7897」字符串计数 0 命中；断言② 两文件必须存在 `typeof window === 'undefined' && proxyUrl` 守卫且 `setGlobalDispatcher(new ProxyAgent(proxyUrl))` 位于守卫之后；③ 判据牙口自检（旧形态必检出/去守卫必检出/现行形态不误报）。

**牙口①：把 fallback 加回 supabase.ts**

```
注入后：const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || 'http://127.0.0.1:7897' // ★牙口注入
—— ① 写死本地代理地址 0 命中 ——
  ✗ supabase.ts 残留写死代理地址 127.0.0.1:7897 × 1（唯一允许位置：.env.example 注释）
  （② 仍绿 ✓——精确翻红）
PROXY_GUARD_FAIL
EXIT=1
```

回退后复绿。

**牙口②：去掉 waffo.ts 的 `&& proxyUrl`**

```
注入后：if (typeof window === 'undefined') { // ★牙口注入
—— ② ProxyAgent 构造必须被 proxyUrl 真值判断包住 ——
  ✗ waffo.ts 缺 proxyUrl 真值守卫（"typeof window === 'undefined' && proxyUrl"）——代理必须按显式设置
  （① 仍绿 ✓——精确翻红；③ 的反向判据联动翻红，符合预期——它守护的正是现行守卫形态存在）
PROXY_GUARD_FAIL
EXIT=1
```

回退后复绿：`PROXY_GUARD_PASS`（EXIT=0）。

---

# 四、★ 反向验证实测（任务书回执项 4，最要紧的一步）

前置环境核实：shell / 用户级 / 机器级环境变量**均无** HTTPS_PROXY/HTTP_PROXY（输出为空）——代理来源只有 .env.local，验证不被「别处在设」污染；`Test-NetConnection 127.0.0.1 -Port 7897` → **True**（本机代理在跑）。

方法：临时脚本 `tmp-proxy-verify.cts`（验证后已删）——解析 .env.local 注入 env，`--no-proxy` 模式剔除代理变量（等效于「注释掉」的语义：生效 env 中无该项），真调 `createServerSupabase()` 发真实 `reports` 表查询。用 .cts（CJS）是因 supabase.ts 内 `require('undici')` 只在 CJS 编译链可用。.env.local 全程未改动。

**① 带 HTTPS_PROXY（常态）→ 应成功**

```
[verify] 生效 HTTPS_PROXY=http://127.0.0.1:7897
[verify] RESULT=OK rows=1
EXIT=0
```

**② 剔除 HTTPS_PROXY（模拟注释掉）→ 本机应失败**

```
[verify] 已剔除 HTTPS_PROXY（模拟 .env.local 中注释掉）
[verify] 生效 HTTPS_PROXY=(未设置)
[verify] RESULT=FAIL TypeError: fetch failed
EXIT=1
```

→ 失败 ✓（直连被墙）。**这证明「按显式设置」真的在工作**：不再是「反正有个写死 fallback 兜底、设不设都一样」——设了走代理成功，不设直连失败。若此步仍成功才说明代理没生效或别处在设，实测确认无此情况。

**③ 恢复（再跑常态）→ 确认恢复**

```
[verify] 生效 HTTPS_PROXY=http://127.0.0.1:7897
[verify] RESULT=OK rows=1
EXIT=0
```

---

# 五、全仓搜索结果（任务书回执项 2）+ 全量验收（回执项 5）

**全仓搜 `127.0.0.1:7897`**：

- `src/`（全部源码）→ **0 命中** ✓
- `.env.example:46` → 注释一处 ✓（任务书预期的唯一允许位置）
- `.env.local` → 一行（本机配套，任务书 §三-③ 要求；该文件 gitignore 排除不入库）
- `scripts/test-proxy-guard.mjs` → 7 处，全部是断言脚本自身的**判据字符串与注释**（扫描判据必须包含目标形态，属必需；任务书 §四 断言①的扫描对象明确为「两文件」）
- `docs/交接记录/**` → 若干，均为任务书/历史回执原文引用（档案，不改）

**全量验收**：

```
npm run verify → VERIFY_EXIT=0
  链首：tsc --noEmit（0 错误）
  … SITE_AUDIT_PASS / ENTITLEMENT_GATE_PASS / FATEBOOK_ACCEPT_PASS / SELFTEST_PASS /
    SHENSHA_ARTICLES_PASS / LIUNIAN_CACHE_PASS / PROXY_GUARD_PASS（收尾）
```

---

# 六、缺项与待拍板、文件清单

**缺项与待拍板**

1. **Vercel 后台确认**：部署前请确认 Vercel 项目环境变量里**没有** HTTPS_PROXY/HTTP_PROXY（按任务书「不做」清单，也不应设）——本回执无法代查后台。
2. **dev server 重启提醒**：正在跑的本地 dev server 是在旧代码下启动的，本次改动需重启 dev 后生效（.env.local 未动，重启即可）。
3. 23 号任务（缓存）与本件无冲突：23 号缓存测试的 mock 设计（`setServerSupabaseForTest` 注入、fetch 拦截）本来就不触网络/代理，本轮改动不影响其任何断言——已随全量 verify 复跑确认 `LIUNIAN_CACHE_PASS` 仍绿。
4. 反向验证为脚本级实测（等效语义：生效 env 无代理项）；若贵方坚持「改 .env.local + 重启 dev server」的字面路径，可在任意时刻按 §四 方法复现，结论不变。

**文件清单（commit `ae56df7`，5 文件 +85/−7）**

```
src/lib/supabase.ts          createServerSupabase() 去写死 fallback + && proxyUrl 守卫 + 实测注释
src/lib/waffo.ts             getWaffo() 同改（保留 [waffo] 前缀与 eslint 注释）
.env.example                 追加「服务端出口代理（仅本机开发需要）」注释段
scripts/test-proxy-guard.mjs 新建：断言①② + 判据牙口自检（纳入 verify）
package.json                 verify 链尾追加 node scripts/test-proxy-guard.mjs
```

未 commit：本回执（待贵方过目后定入库时机）。
