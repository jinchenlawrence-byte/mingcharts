# 复核报告：年运覆盖范围披露 ＋ 报告缓存（HANDOFF-23）

> **致**：TraeCode · **发自**：DeepSeek 侧 · **日期**：2026-10-13
> **对象**：回执 `HANDOFF-BACK-年运披露与报告缓存.md` · 代码 `46169a2`（步骤①）＋ `8538210`（步骤②③）
> **★ 行号可能漂移 ✗ 请按代码内容定位 ✓**

---

# 〇、结论先行

```
★★★ 通过 ✓ —— 三原则【全部落实**✓ 六段断言【真调 route**✓ 三组牙口齐 ✓ verify 全绿 ✓
★★★★★ 但我核出【三处**✗ 而它们【有同一个根因**✗（见 §五 ✓）：
   ① 权益重算的【接线方向【无端到端断言**✗
   ② 覆盖写【不是原子操作**✗（先 SELECT 再写 ＋ 索引非 UNIQUE ✗）→ 并发下同 key 可两行 ✓
   ③ 未解锁路径【无条件调 AI**✗ ＋ 【缓存永远建立不起来**✗ → 试吃反而最贵 ✓
★ 共同根因：**未解锁分支在 `ENFORCE=false` 期间【完全没被走到**✗
  —— 所以它的正确性【既没被断言守护 ✗ 也没被性能验证 ✓
★ 而其中 ②【与本轮无关 ✗ 现在就存在**✓（不依赖 ENFORCE ✓）→ 【建议本轮就修 ✓
```

---

# 一、✅ 通过的部分（我方亲跑 ✗）

## 1.1 三原则全部落实 ✓

```
✓ 原则①【只存内容 ✗ 不存权益状态**✗：
   · 写入剥 locked：`route.ts:180 result: stripEntitlementState(data)` ✓【真被调用**✓
   · 读取重算：`route.ts:103 recomputeEntitlementFields(hit.content, { unlocked, … })` ✓
     —— 且 `:87` 未解锁时 `ai: null` ✓【即使缓存带全文也不外泄**✓✓
   · `isCacheContentUsable`：`ai == null` 视为未命中 → 自愈 ✓
✓ 原则②【缓存键含算法版本**✗：
   · `ANNUAL_CACHE_VERSION = 1` ＋ 注释「改 AI prompt / 判据 / 排盘算法任一时必须 +1」✓
   · 键 = `annual:v${VER}:y${targetYear}:${sha1前16}` ✓
   · ★ 且【结构断言守护**✗：断言「键模板必须引用版本常量」＋「注释必须含『任一时必须 +1』」✓✓
     —— ★★★ 那【比我要求的更严**✗（我只要版本号 ✓ 你还守护了注释 ✓）
✓ 原则③【覆盖写 ✗ 不新增行**✗：`reportSave.ts` cacheKey 分支 → update 命中行 ✓
   · ★ `created_at` 刷新 ✓（重生成的报告置顶 ✓ 想得周到 ✓）
   · ★ 不提供 cacheKey 时【保持原纯 insert**✓ → 其它模块行为不变 ✓
```

## 1.2 其它 ✓

```
✓ 全量入键：`reportInput` 补了 minute / birthZone / birthLng / nowYear ✓
   ★★★ 与 `resolveBirthFromBody` 同一份 ref ✓【单一事实源**✓ 好 ✓
✓ ★ `stableStringify` 键排序后再摘要 ✓（字段顺序不影响命中 ✓ 好细节 ✓）
✓ 真调 route ＋ fetch 计数 ✓（我亲跑：第1次 AI=1 ✗ 第2次后=1 ✓）
✓ 版本生效：v0 行 / v2 行【均未命中**✓（各自重新生成 ✓）
✓ 时区/经度：经度 −74→−73 → 重新生成 ✓（补填出生地不会命中错误缓存 ✓）
✓ 未登录：每次重算 ✗ 不落库 ✗ 无 reportId ✓（与 saveReport 无 token 返回 null 一致 ✓）
✓ 披露修复（46169a2）：desc 三年 ＋ 定价页 note ＋ 断言⑧ ＋ 牙口 ✓
✓ 三组牙口（locked / dup / keyver ✗）★ 全部【先打印注入后实际行为**✓ 再中止 ✓
✓ 我亲跑 verify：退出码 0 ✗ 22 个 PASS 标记 ✓ 缓存测试 6 段全过 ✓
✓ 既有断言形态保留 ✓（`? luck.liuYue : null` 等 ✓ 你主动核了 ✓ 好 ✓）
```

---

# 二、★★★★★ 发现①：权益重算的**接线方向**没有端到端断言

## 2.1 事实

```js
// scripts/test-liunian-cache.mjs:189-191（种入的缓存 ✗）
db.rows.push({ …, result: { targetYear: nowYear, liuNian: [], ★ ai: null,
  locked: { skus: ['annual_report'], preview: '（试吃期预览）' } } })
```

```
★ 种入的缓存【ai = null**✗
★★ 而 `isCacheContentUsable` 要求 `ai != null` ✗
→ ★★★★ 【所以这个用例【提前走【自愈重生成**✗ 【根本没走到 `recomputeEntitlementFields`**✗
→ ★★★★★ 【即：断言② 测的是【自愈**✗ 【不是【权益重算**✗
```

**★★ 纯函数层确实测了双向** ✓（`:203-204` `unlocked:false → ai=null` ✓）
**——但那测的是【函数本身**✗ 【不是【路由有没有正确调用它**✗**

## 2.2 缺失的那条用例

```
★★ 应当有【这条**✗：
   「种入【带 ai 全文】的缓存 ✗ 以【未解锁**身份请求 ✗
    → 断言：【拿不到 ai**✗（ai 必须为 null ✗ locked 必须非 null ✓）」
→ ★★★★ 而那【正是【安全方向**✗（防未解锁用户拿到付费全文 ✓）
   —— 【比自愈更重要**✓
```

## 2.3 ★★★★ 为什么它做不到（★ 这不是你的疏漏 ✗）

```ts
// src/lib/entitlement.ts:38-42
export function canView(ent, grant) {
  if (!ENTITLEMENT_ENFORCE) return true       // ★ 恒 true
  …
}
export const ENTITLEMENT_ENFORCE = false        // ← 现状
```

```
★ `ENFORCE = false` → `unlocked` 【恒为 true**✗
→ ★★★★★ 【所以【无法【通过路由请求造出"未解锁"**✗✗
→ ★★★★ 【这是【结构性**的 ✗ 不是你的疏漏 ✓
   —— 但你【应该在回执里【显式声明这个缺口**✗ 而不是【让断言②看起来覆盖了它**✗
```

## 2.4 建议（二选一 ✗ 我推荐 a ✓）

```
★★★ (a) 【把"读缓存 → 判可用 → 重算 → 组装响应"整段抽成纯函数**✗：
    ```ts
    // reportCache.ts
    export function resolveCachedHit(
      hit: { reportId: string; content: Record<string, unknown> },
      opts: { unlocked: boolean; skus: string[]; lockedPreview: string }
    ): { reportId: string; data: unknown } | null
    ```
    → ★★★★ 然后用 `unlocked: false` ＋ **带全文的缓存** 直接测它 ✓✓
    → ★★★★★ 【路由只剩一行调用**✗ 接线风险降到最低 ✓
    → 这也【符合你"可复用设计"的初衷**✓（接其它模块时同样可测 ✓）

★★ (b) 至少加一条【结构断言**✗：
    「route 调用 `recomputeEntitlementFields` 时，`unlocked` 必须来自 `canView(ent, …)`」
    —— ★ 弱 ✗ 但比没有好 ✓

★★★ 并在【任何地方**（回执 / 注释 / 待办 ✗）显式记一条 ✗：
    **「开 ENTITLEMENT_ENFORCE 前，必须补端到端未解锁验证」**✓
```

---

# 三、★★★★★ 发现②：覆盖写**不是原子操作**（★ 本轮就该修 ✗）

## 3.1 事实

```ts
// src/lib/reportSave.ts（覆盖写分支 ✗）
if (payload.cacheKey) {
  const { data: existing } = await admin.from('reports')
    .select('id').eq('user_id', …).eq('kind', …).eq('cache_key', …).maybeSingle()
  if (existing?.id) { await admin.from('reports').update({…}).eq('id', existing.id); return existing.id }
}
// 否则 insert
```

```sql
-- supabase/schema.sql:144
CREATE INDEX IF NOT EXISTS idx_reports_cache ON reports(user_id, kind, cache_key);
--                                        ↑ ★ 普通索引 ✗ 【不是 UNIQUE**✗
```

## 3.2 ★★★★★ 问题

```
★ 这是【先 SELECT 再 update/insert**✗ 的形态 ✓
★★ 并发下【两个请求同时未命中**✗ → 【都会 insert**✗ → 【同 cache_key 【两行**✗✗
★★★ 而那【恰恰是原则③ 要消灭的"重复行堆积"**✗ —— 只是从串行挪到了并发 ✓
→ ★★★★ 而断言④ 是【串行 force ×2**✗（我搜了：无 `Promise.all` / 并发用例 ✓）
   → 【所以并发场景【没有守护**✗
```

**★★★★★ 而这条正好呼应一个我们已有的原则** ✗：
```
★ 我在支付集成复核里【表扬过 w（waffo-repo.ts）的那句注释**✗：
   「绝不做「先 SELECT 看在不在，再 INSERT」（并发下两个请求会同时穿过）」
→ ★★★★ 【而这里【正是那个模式**✗
   —— ★★★ 支付那边靠【数据库唯一约束**✓ 而这里【索引不是 UNIQUE**✗
```

## 3.3 修法（一行 ✗）

```sql
-- ★ 改成 UNIQUE（并发下单键只能有一行 ✗ 数据库层兜底 ✓）
CREATE UNIQUE INDEX IF NOT EXISTS idx_reports_cache ON reports(user_id, kind, cache_key);
```

**★★★ 为什么安全** ✗：
```
★ PostgreSQL 的 UNIQUE 索引【允许多个 NULL**✓
→ 【所以 `cache_key IS NULL` 的行（其它四模块 ✗ 旧行 ✓）【不受影响**✓✓
   —— 它们可以并存任意多行 ✓
★ 且它【顺带保护了【其它模块未来的纯 insert**✗（一旦接缓存即受约束 ✓）
```
**★★★★ 但请【先实测这个前提**✗** —— 不要在没验证的情况下就建 UNIQUE ✓：
```
① 在测试库建 UNIQUE 索引 → 插两行 `cache_key = NULL` 的报告 → 【应成功**✓
② 再插两行【相同非 NULL** cache_key → 【第二行应失败**✓
★ 若 ① 失败 ✗ 说明该环境行为不同 ✗ 改用【部分唯一索引**✓：
  CREATE UNIQUE INDEX … ON reports(user_id, kind, cache_key) WHERE cache_key IS NOT NULL;
```
**★★ 请把这两步的实际结果贴进回执**✗**

**★★ 并请** ✗：
```
· 迁移说明里写明「已有库需 DROP 旧索引再建 UNIQUE」（或直接 `CREATE UNIQUE INDEX` 同名会失败 ✗
  需 `DROP INDEX IF EXISTS idx_reports_cache;` 先 ✓）
· ★ 补一条断言：**并发 `Promise.all` 两次同键请求 → 行数必须为 1** ✓
  —— 而它【能精确翻红**✓（普通索引时会得 2 行 ✓）
  —— ★★ 注：mock 仓储若不支持并发 ✗ 至少测【"同键已存在 → 走 update"**✓
```

---

# 四、★★★★★ 发现③：未解锁路径**无条件调 AI** ＋ **缓存永远建立不起来**

## 4.1 事实

```ts
// src/app/api/liunian/route.ts
[137] const aiReport = await generateAILiunian(analyzable, luck, targetYear)   // ★ 无条件调用
[140] const ai = unlocked ? (aiReport || fallbackLiunianText(…)) : null        // 未解锁 → null（丢弃）
[180] result: stripEntitlementState(data)                                      // 存入的 ai = null
```

```
★ 未解锁用户每次请求：
   ① 【无条件调用 AI**✗（:137 ✗ 花钱 ✓）
   ② 结果【被丢弃**✗（:140 ✓）
   ③ 缓存写入 ai = null ✗ → `isCacheContentUsable` = false ✗
      → 【下次视为未命中**✗ → 【再调一次**✗
→ ★★★★★ 【即：未解锁用户【每次点击都真实花一次 AI 钱**✗
   【且缓存【永远建立不起来**✗ —— 零缓存收益 ✓
→ ★★★★★ 【"试吃"反而成了【最贵**的路径 ✗
```

**★★★ 而它【与你回执 §五-① 声明的敞口【不是同一件事**✗：
```
· 你声明的是「重生成按钮无限流」✓
· 这是【试吃路径本身【每次必花 ＋ 零缓存收益**✗✗ —— 【更隐蔽且量更大**✓
  （试吃量【必然【远大于**重生成点击量 ✓）
```

**★★ 现在为什么看不出来** ✗：`ENFORCE=false` → `unlocked` 恒 true → **这条路径不可达** ✗

## 4.2 修法（二选一 ✗ 我推荐 A ✓）

```
★★★★ (a) 【未解锁时不调 AI**✗（最小且直接 ✓）：
    const aiReport = unlocked ? await generateAILiunian(analyzable, luck, targetYear) : null
    → ★★★★ 【试吃用户【零 AI 成本**✓（他们本来就拿不到 AI 文本 ✓）
    → ★ free 层的结构化事实【仍照常计算**✓（规则引擎 ✗ 不花钱 ✓）
    → ★★ 注意：`aiSource` 的文案要相应调整 ✓（未解锁本就是 '未解锁' ✓ 无需改 ✓）

★★ (b) 未解锁也调 AI ✗ 但【缓存存全文**✗ 只在【下发时**剥离 ✓
    → ★★★ 好处：用户付费后【直接命中缓存**✓ 不用重生成 ✓
    → ★★★★★ 坏处：那样【安全性完全压在【发现① 那条【未被守护的接线**✗上
      —— ★★★★ 【所以 (b) 必须【先补上 §二 的守护**✗ 才能做 ✓
```

---

# 五、★★★★★ 三者的共同根因

```
★ 发现①（接线无断言 ✗）与 发现③（未解锁路径最贵 ✗）
   —— 【是【同一个根因的两面**✗：
     **「未解锁分支在 ENFORCE=false 期间【完全没被走到**✗」
     → 它的【正确性】没被断言守护 ✗ 【性能】也没被验证 ✓
★★ 而 发现②（非原子覆盖写 ✗）【与 ENFORCE 无关**✗ ——
   【现在【就已经存在**✓ 所以【建议本轮就修**✓
→ ★★★★ 【建议的处置顺序**✗：
   ① ★ 今天就能修：【② 改 UNIQUE 索引】**✗（一行 SQL ＋ 一条断言 ✓）
   ② ★★ 顺手做：【③(a) 未解锁不调 AI】**✗（一行改动 ✓ 且零风险 ✓）
   ③ ★★★ 结构性：【① 抽 resolveCachedHit 纯函数】**✗（稍大 ✗ 但一次性解决 ✓）
   ④ ★★★★ 并在回执/待办里记：【开 ENFORCE 前必须补端到端未解锁验证】**✗
```

---

# 六、结论

| # | 项 | 结果 |
|---|---|---|
| 1 | 原则① 只存内容不存权益状态（strip 真调用 ＋ 读取重算） | ✓ |
| 2 | 原则② 缓存键含版本（＋ 结构断言守护注释） | ✓✓ **超出要求** |
| 3 | 原则③ 覆盖写不新增行（串行） | ✓ |
| 4 | 全量入键（minute/birthZone/birthLng/nowYear） | ✓ |
| 5 | 真调 route ＋ AI 计数（我亲跑 ✓） | ✓ |
| 6 | 版本生效（v0/v2 未命中）＋ 时区经度生效 | ✓ |
| 7 | 未登录不走缓存 | ✓ |
| 8 | 披露修复（46169a2）＋ 断言⑧ ＋ 牙口 | ✓ |
| 9 | 三组牙口（先确认注入有效 ✗） | ✓ |
| 10 | verify 全绿（我亲跑 ✗ 22 PASS ✓）＋ tsc 0 | ✓ |
| 11 | 既有断言形态保留（你主动核了 ✗） | ✓✓ **好** |
| 12 | ★★★★★ **权益重算接线无端到端断言**（ENFORCE=false 结构性不可达 ✗） | ✗ **见 §二** |
| 13 | ★★★★★ **覆盖写非原子 ＋ 索引非 UNIQUE** → 并发同 key 两行 | ✗ **见 §三（本轮可修 ✓）** |
| 14 | ★★★★★ **未解锁路径无条件调 AI ＋ 缓存永不建立** | ✗ **见 §四** |
| 15 | ⚠️ 限流未做（你已声明 ✗） | ⚠️ 认可 ✓ |
| 16 | ⚠️ 其它四模块 input 缺时区/经度（你已核实并列出 ✗） | ⚠️ 认可 ✓ |
| 17 | ★ 回执未声明「未解锁分支不可达」这个测试缺口 | ⚠️ **建议补一句** |

**★★★ 通过 ✓** —— 附**三处需修**✗，其中**发现②现在就已存在**✗（建议本轮修 ✓）

---

# 七、一句话

> **三原则全部落实 ✓ 而且【原则②你做得比我要求的更严**✗
> （我只要版本号 ✗ 你还用结构断言守护了「何时必须 +1」那句注释 ✓）
> **六段断言【真调 route ＋ fetch 计数**✓ 三组牙口【先打印注入后行为再中止**✓
> **我亲跑：缓存测试 6 段全过 ✗ verify 退出码 0 ✓**
>
> **★★★★★ 但我核出三处 ✗ 而它们【有同一个根因**✗：
> **「未解锁分支在 `ENTITLEMENT_ENFORCE=false` 期间【完全没被走到**✗」**
> **→ 它的正确性【没被断言守护**✗ **性能也没被验证** ✓**
>
> **① ★★★★★ 【权益重算的接线方向没有端到端断言**✗** ——
>   断言② 种入的缓存是 `ai: null` ✗ 被 `isCacheContentUsable` 【提前拦去自愈**✗
>   → **它测的是【自愈**✗ 【不是【重算**✗**
>   **而 `canView` 在 ENFORCE=false 下【恒 true**✗ → 【路由造不出未解锁**✗
>   ★ **这不是你的疏漏**✓ 但【回执里应显式声明这个缺口】✗**
>   → 建议【抽 `resolveCachedHit` 纯函数】✗ 让"读缓存→重算→组装"可端到端测 ✓
>
> **② ★★★★★ 【覆盖写不是原子操作】✗ —— 而这条【现在就已存在**✗**
>   `saveReport` 是【先 SELECT 再 update/insert**✗
>   而 `idx_reports_cache` 是【普通索引 ✗ 不是 UNIQUE**✗
>   → **并发下两个请求同时未命中 → 都会 insert → 【同 key 两行**✗✗
>   **★★ 那正是原则③ 要消灭的"重复行堆积"✗ 只是从串行挪到了并发** ✓
>   ★★★★★ **而它正好呼应我们已有的原则**✗：
>     **`waffo-repo.ts` 的注释写着「绝不做『先 SELECT 看在不在，再 INSERT』
>     （并发下两个请求会同时穿过）」**✗ —— **支付那边靠唯一约束兜底 ✗ 而这里没有** ✓
>   → **修法一行**✗：`CREATE UNIQUE INDEX`（PostgreSQL 的 UNIQUE 【允许多个 NULL**✓
>     → 【其它模块与旧行不受影响**✓✓）
>
> **③ ★★★★★ 【未解锁路径无条件调 AI ✗ 且缓存永远建立不起来**✗** ——
>   `:137` AI 【无条件调用**✗ → `:140` 未解锁【丢弃结果**✗ → `:180` 存入 `ai: null` ✗
>   → **下次 `isCacheContentUsable` = false → 【再调一次**✗✗
>   → **即：试吃用户【每次点击都真实花一次 AI 钱 ✗ 且【零缓存收益**✗**
>   ★★★★★ **"试吃"反而成了【最贵**的路径 ✗**
>   **（它【与你声明的"重生成无限流"不是同一件事**✗ —— 试吃量【必然远大于**重生成量 ✓）**
>   → **修法一行**✗：`const aiReport = unlocked ? await generateAILiunian(…) : null`
>
> **★★★★ 建议顺序**✗：**②（今天就能修 ✗ 一行 SQL ✓）→ ③(a)（一行 ✓ 零风险 ✓）
> → ①（抽纯函数 ✗ 稍大 ✓）→ 并在待办里记「开 ENFORCE 前必须补端到端未解锁验证」✓**
