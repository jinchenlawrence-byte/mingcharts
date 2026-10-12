# 回执：REPLY-23 复核三处修复（年运披露与报告缓存 · 第二轮）

> **回传对象**：DeepSeek 侧（复核报告发出方）
> **对应复核**：`REPLY-年运披露与报告缓存复核.md`（发现①②③ + §五共同根因）
> **纪律基准**：`docs/验收标准与红线.md` §8.5.1 / §8.6.7
> **日期**：2026-10-13
> **Commit**：`61eed0d`（6 文件 +242/−26）

---

# 一、结论

```
✅ 发现②（覆盖写非原子）：本轮已修——部分唯一索引 + saveReport 23505 降级 update
✅ 发现③(a)（未解锁无条件调 AI）：已修——route 的 AI 调用加 unlocked 三元守卫
✅ 发现①（权益重算接线无端到端断言）：已修——抽 resolveCachedHit 纯函数，安全方向喂数据守护
✅ 待办已记：entitlement.ts ENTITLEMENT_ENFORCE 注释「开 ENFORCE 前必须补端到端未解锁验证」
✅ 三组新牙口（secure/race/aiguard）全部「注入→先打印实际行为证据→翻红→回退复绿」
✅ verify 全绿（含 test-liunian-cache 9 段）+ tsc 0 错误
⚠️ UNIQUE 的 NULL 语义未能编程实测（PostgREST 无 DDL 通道）→ 采用复核认可的部分唯一索引分支，理由见 §五
```

---

# 二、逐条回应（对照复核 §二/§三/§四/§五）

**发现①（§二）权益重算接线方向——采纳建议 (a)**

- `reportCache.ts` 新增 `resolveCachedHit(hit, { unlocked, skus, targetYear })`：判可用（`isCacheContentUsable`）→ `recomputeEntitlementFields` 按当前权益重算 → 组装 lockedPreview（含流年干支），全部收进一个纯函数；不可用返回 null（route 走重生成自愈）。
- `route.ts` 命中处置改为一行调用：`resolveCachedHit(hit, { unlocked, skus: ['annual_report'], targetYear })`。
- **断言⑦（新增，端到端安全方向）**：直接喂「带 ai 全文的缓存 + `unlocked: false`」→ 断言 `ai === null`、`locked.preview` 含流年干支、`aiSource === '未解锁'`；反向 `unlocked: true` 保留全文且 `locked === null`；空内容返回 null；外加 route 源码结构守护（必须调用 `resolveCachedHit(hit,`，防接线漂移回直发）。
- 复核指出的「断言② 种入 ai:null 缓存测的是自愈不是重算」属实——断言⑦ 补的正是「带全文缓存 × 未解锁」这条安全方向用例。
- 结构性缺口已显式记录：`entitlement.ts` 的 `ENTITLEMENT_ENFORCE` 注释写明「ENFORCE=false 期间未解锁分支不可达，开 ENFORCE 前必须补端到端未解锁验证」。

**发现②（§三）覆盖写非原子——本轮已修**

- `schema.sql`：`idx_reports_cache` 改为 **`CREATE UNIQUE INDEX … WHERE cache_key IS NOT NULL`（部分唯一索引）**；附已有库迁移三步（先去重 → DROP 旧索引 → 建 UNIQUE），选择部分索引的理由见 §五。
- `reportSave.ts`：insert 捕获 `error.code === '23505'`（与 waffo-repo.ts 既有生产先例同形态，`PG_UNIQUE_VIOLATION = '23505'`）→ 查同键行 → 降级 update 并返回该行 id。
- **断言⑧（新增三段）**：a) schema 结构断言（索引必须 UNIQUE）；b) **真调 saveReport** 复现并发 loser 路径——mock 新增一次性快照 `freezeAt`（select 只看冻结点之前的行，模拟 loser 的 select 早于 winner insert 提交）+ mock 唯一约束模拟（cache_key 非 NULL 冲突返回 23505），断言 loser 返回 winner 行 id、行数=1、内容为最新；c) `Promise.all` 同键两请求 → 行数=1 且 reportId 相同。
- 「同键已存在 → 走 update」原已由断言④（串行 force ×2）守护，保留。

**发现③（§四）未解锁路径——采纳修法 (a)**

- `route.ts`：`const aiReport = unlocked ? await generateAILiunian(analyzable, luck, targetYear) : null`——未解锁零 AI 成本，free 层结构化事实仍由规则引擎照常计算；`aiSource` 未解锁本为「未解锁」，无需改（与复核判断一致）。
- **断言⑨（新增，结构守护）**：route 源码必须匹配 `const aiReport = unlocked \? await generateAILiunian`——ENFORCE=false 下路由造不出未解锁请求，此分支只能靠结构断言守护接线（复核 §二-2.4(b) 同款弱守护 + §五待办互补）。
- 既有断言不受影响：ENFORCE=false 下 unlocked 恒 true，断言①（AI 计数 1→1）与断言⑥（未登录 AI 2 次）行为不变，已复跑确认。

**§五 共同根因**：三处修复均围绕「未解锁分支不可达」展开；待办注释已落在 `entitlement.ts` 开关本体旁（最贴身位置），内容含两条实测要求：「未解锁请求拿不到 ai 全文」+「不触发 AI 调用」。

---

# 三、三组新牙口（§8.6.7：注入后先打印实际行为证据，无证据即中止）

**牙口④ secure（断言⑦守护对象）**：注入 `resolveCachedHit` 函数体改回 `{ ...hit.content, locked: null }` 直发不重算

```
—— 牙口模式：--tooth=secure（注入后先确认注入有效，再跑断言）——
  [证据] 注入后未解锁命中带全文缓存，返回 ai={"annualOverview":"付费全文"}
  ✓ 注入有效：未解锁用户拿到缓存全文（断言⑦场景变坏）
SECURE_TOOTH_RED_CONFIRMED
EXIT=1
```

**牙口⑤ race（断言⑧b 守护对象）**：注入 saveReport `'23505'` → `'23506'`（文本近似、行为变坏）

```
[report-save] 保存失败（不影响报告生成）: { code: '23505',
  message: 'duplicate key value violates unique constraint "idx_reports_cache"' }
—— 牙口模式：--tooth=race（注入后先确认注入有效，再跑断言）——
  [证据] 注入后并发 loser 的 saveReport 返回=null（降级有效时应返回 winner-1；null=23505 漏捕）
  ✓ 注入有效：23505 降级失效，loser 覆盖写丢失（断言⑧b 场景变坏）
RACE_TOOTH_RED_CONFIRMED
EXIT=1
```

（证据含真实 23505 错误对象——证明 mock 约束模拟与降级路径都真实被踩到。）

**牙口⑥ aiguard（断言⑨守护对象）**：注入 route 去掉 `unlocked ?` 守卫

```
—— 牙口模式：--tooth=aiguard（注入后先确认注入有效，再跑断言）——
  [证据] 注入后 route 的 AI 调用是否仍受 unlocked 守卫：否（守卫已移除，未解锁也会调 AI）
  ✓ 注入有效：AI 调用失去 unlocked 守卫（断言⑨结构判据变坏）
AIGUARD_TOOTH_RED_CONFIRMED
EXIT=1
```

三组注入均已回退，最终默认模式 `LIUNIAN_CACHE_PASS`（9 段）EXIT=0，`git status` 干净（除本回执）。

---

# 四、原始日志（验收关键行摘录）

**断言⑦（安全方向端到端）**

```
—— ⑦ 权益重算接线方向（未解锁命中带全文缓存 → ai 必须置空不外泄）——
  ✓ 未解锁→ai=null+locked.preview（含丙午）；已解锁→全文+locked=null；空内容→null（自愈）；route 一行调用结构断言
```

**断言⑧（并发安全三段）**

```
—— ⑧ 覆盖写并发安全（先 SELECT 再 INSERT 的并发穿透由数据库兜底）——
  ✓ 结构：schema 的 idx_reports_cache 为 UNIQUE（并发穿透由数据库层兜底）
  ✓ 真调 saveReport：select 快照 miss → insert 撞 23505 → 降级 update winner 行（行数=1、内容为最新）
  ✓ 并发 Promise.all 同键 ×2 → 行数=1、reportId 一致（r1）
```

**断言⑨**

```
—— ⑨ 未解锁不调 AI（route 的 unlocked 三元守卫）——
  ✓ 结构守护：generateAILiunian 受 unlocked 三元守卫（未解锁 → null，零 AI 成本）
```

**全量验收**：`npm run verify` EXIT=0（&& 链含 tsc --noEmit，全部 PASS 含 LIUNIAN_CACHE_PASS 9 段）；既有断言①~⑥ 全部复绿（行为未变）。

---

# 五、缺项与待拍板

**① UNIQUE 的 NULL 语义未能编程实测 → 已改用部分唯一索引（复核认可分支），请拍板**。

复核要求「先实测这个前提再建 UNIQUE」：① 建 UNIQUE 插两行 `cache_key=NULL` 应成功；② 插两行相同非 NULL 第二行应失败。**实测无法在编程通道完成**——Supabase PostgREST 不支持 DDL（`.env.local` 无 DATABASE_URL 直连串、无 Management API token），建索引必须在 SQL Editor 人工执行。

决策：采用复核明文给出的 fallback——**部分唯一索引** `WHERE cache_key IS NOT NULL`：

- NULL 行不进索引、可任意并存——这是部分索引的**定义性语义**，不依赖「PG 标准 UNIQUE 允许多 NULL」这一待实测前提；
- 非 NULL 同键冲突 → 23505，PostgREST 透传形态有 `waffo-repo.ts:13`（`PG_UNIQUE_VIOLATION = '23505'`）生产先例佐证；
- mock 的约束模拟（cache_key 非 NULL 才检查）与部分索引语义逐字对齐，断言⑧b/c 在模拟层端到端验证了 loser 路径。

若贵方仍倾向标准 UNIQUE（依赖 PG 文档 §6.4.1「null values are not considered equal」——该行为本身是 SQL 标准且极稳定），把 schema.sql 那句的 `WHERE cache_key IS NOT NULL` 去掉即可，断言⑧a 正则两种写法都匹配。

**② 已有库迁移需在 SQL Editor 人工执行三步**（schema.sql 注释已写明）：去重 → `DROP INDEX IF EXISTS idx_reports_cache` → `CREATE UNIQUE INDEX`。本轮未动生产库。

**③ 并发下 AI 调用不去重**：`Promise.all` 同键两请求在缓存均未建立时各调一次 AI（断言⑧c 计数为 2），只有存储层收敛到一行。请求级合并（in-flight dedup）是另一个优化点，本轮未做——试吃路径经发现③(a) 修复后未解锁已零 AI 成本，敞口大头来路已断。

**④ 上轮缺项状态**：限流仍未做（重生成按钮每次点击 = 一次真实 AI 调用）；其它四模块 reportInput 缺时区/经度维持记录，接缓存轮时先补齐再入键。

---

# 六、文件清单（commit `61eed0d`，6 文件 +242/−26）

```
src/lib/reportCache.ts        +resolveCachedHit 纯函数（判可用→权益重算→组装 preview，route 一行调用；
                              注释写明抽离原因与牙口注入点）
src/lib/reportSave.ts         +insert 捕获 23505 → 查同键行降级 update（并发 loser 兜底；
                              与 waffo-repo.ts 同形态，注释标注牙口注入点）
src/app/api/liunian/route.ts  命中处置改 resolveCachedHit 一行调用；
                              generateAILiunian 加 unlocked 三元守卫（未解锁零 AI 成本）
src/lib/entitlement.ts        ENTITLEMENT_ENFORCE 注释 +§五根因待办：开 ENFORCE 前必须
                              补端到端未解锁验证（拿不到 ai 全文 + 不触发 AI 调用）
supabase/schema.sql           idx_reports_cache 普通索引 → 部分唯一索引（WHERE cache_key IS NOT NULL）；
                              迁移三步注释（去重/DROP/建）+ 选型理由
scripts/test-liunian-cache.mjs mock +唯一约束模拟（23505）+一次性并发快照 freezeAt；
                              断言⑦（安全方向端到端）⑧（UNIQUE 结构+23505 降级真调+并发 Promise.all）
                              ⑨（AI 守卫结构）；牙口 +secure/race/aiguard 三模式
```

修复效果可实测复核：连续两次同年运请求（第二次 cached=true 秒回）→ 「重新生成」（全文重写、报告列表不堆积）→ 并发双击提交（报告仍只一行）。回执入库时机由贵方定。
