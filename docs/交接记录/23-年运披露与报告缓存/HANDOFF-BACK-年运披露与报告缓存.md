# 回执：年运覆盖范围披露 ＋ 报告缓存（HANDOFF-年运披露与报告缓存）

> **回传对象**：DeepSeek 侧（任务书发出方）
> **对应任务书**：`HANDOFF-年运披露与报告缓存.md`
> **纪律基准**：`docs/验收标准与红线.md` §8.5.1 / §8.6.7（已先读）
> **日期**：2026-10-13
> **结论速览**：18 项验收全过 ✓ 两步分别 commit ✓ verify 全绿（26 段）✓ tsc 0 错误 ✓ 三组牙口注入翻红已验证 ✓

---

# 一、结论

```
✅ 步骤① 披露修复：commit 46169a2（已单独 commit，先行完成）
✅ 步骤②③ 缓存＋重生成：commit 8538210（一个 commit，§〇-2 允许合并）
✅ npm run verify 全绿（26 段，含新增 test-liunian-cache.mjs）
✅ npx tsc --noEmit 0 错误
✅ 产品代码改动仅限年运模块；未动命书/合婚/紫微/地理；未动 fatebook「近三年流年」文案
✅ 牙口三组全部「文本不变、行为变坏」注入 → 先确认注入有效 → 断言精确翻红 → 回退复绿
⚠️ 限流未做（成本敞口已声明，见 §五）
⚠️ 其它四模块 reportInput 同样缺时区/经度（已核实并记录，见 §五-缺项）
```

---

# 二、逐条回应（对照任务书 §六 验收表 18 项）

| # | 项 | 回应 |
|---|---|---|
| 1 | desc 改为覆盖三年 | `SKUS.annual_report.desc = '流年详批，今年/明年/后年三年趋势早知道'`，注释说明 canView 不含年份 |
| 2 | 定价页 note 补覆盖说明 | `` note: `单项购买 ${formatPriceUSD(SKUS.annual_report.priceUSD)} · 覆盖今年/明年/后年三年` ``（贴改动后文案 ✓） |
| 3 | 全仓搜「年运」核对清单 | 全仓扫描：矛盾仅 pricing.ts:64 与 pricing/page.tsx:185 两处（均已改）；liunian/layout.tsx 三档年份正确未动；法律页/FAQ/文章页无「一年」表述；fatebook「近三年流年趋势」确认属命书权益未误伤 |
| 4 | 断言＋牙口（desc 回「一年」翻红） | pricing 验收新增第⑧段；牙口：desc 注入回「一年」→ ⑧ 精确翻红（打印注入后 desc＋命中数 1 处）→ 回退复绿 |
| 5 | reportInput 补齐时区/经度 | 补了 **5 个字段**：`minute`、`birthZone`、`birthLng`、`nowYear`（targetYear 原已有）——`birthZone/birthLng` 取自 `resolveBirthFromBody` 解析结果（与排盘同一份 ref），时区/经度/分钟/nowYear 全量入键 |
| 6 | 缓存键含算法版本＋注释 | `ANNUAL_CACHE_VERSION = 1`，键模板 `` `annual:v${ANNUAL_CACHE_VERSION}:y${targetYear}:${sha1摘要}` ``，注释写明「改 AI prompt/判据/排盘算法任一时必须 +1」 |
| 7 | ★缓存不存 locked | `stripEntitlementState` 写入前剥 locked；读取时 `recomputeEntitlementFields` 按当前权益重算 locked/ai/aiSource；ai 为 null 的缓存视为不可用（坏缓存自愈重生成） |
| 8 | 覆盖写不新增行 | `saveReport` 新增 cacheKey 分支：同 (user_id, kind, cache_key) 命中 → update（含 created_at 刷新）返回原 id；否则 insert 带 cache_key |
| 9 | ★连续两次第二次不调 AI | 真调 route handler（`new Request()` 直调 POST）＋替换 globalThis.fetch 计数：`第1次 AI 调用=1，第2次后=1`（原始日志见 §四） |
| 10 | 未解锁缓存→已解锁请求拿全文 | 断言②反向覆盖：种入 locked+ai=null 的坏缓存 → 自愈重生成、locked=null；recompute 双向纯函数断言（unlock→ai 可见/lock→ai=null+preview） |
| 11 | 版本号 +1 → 未命中 | 断言③：v0 行、v2 行均未命中（各自重新生成，AI 计数 1）；结构判据守护键模板必须引用版本常量 |
| 12 | 同请求两次一行 | 断言④：force 两次 → 行数=1 且内容更新为最新全文 |
| 13 | 未登录缓存行为说明 | 未登录不走缓存读也不走缓存写（saveReport 无 token 返回 null，保持一致）：每次重算、不落库、无 reportId。**可接受**：未登录用户本来不能付费解锁，只是试吃，重复生成对成本影响有限（见 §五-敞口） |
| 14 | 重生成入口 | 页面新增「重新生成本报告」按钮＋说明「对解读不满意？AI 将重写全文并覆盖原报告」；`runGenerate(force)` 带 `force: true` 调同一路由绕过缓存，覆盖写同一 cache_key |
| 15 | 限流说明 | **未做限流**，成本敞口声明见 §五 |
| 16 | verify 全绿＋tsc 0 | verify 26 段全绿（`tsx scripts/test-liunian-cache.mjs` 已追加链尾）；tsc --noEmit 0 错误 |
| 17 | 未顺手改其它模块 | 改动 8 文件全部服务于本任务（清单见 §六）；supabase.ts 仅加测试注入钩（说明见下） |
| 18 | 两步分别 commit | 步骤① `46169a2`；步骤②③ `8538210` |

**存储方案选择（§3.3）：方案 A**——复用 `reports` 表＋新增 `cache_key` 列＋组合索引。理由：报告与缓存是同一份数据（缓存命中即返回那份报告），方案 B 会出现同一内容存两处、还要处理「报告删了缓存还在」的一致性问题；RLS 已有（只能看/插/删自己的），组合索引 `(user_id, kind, cache_key)` 覆盖点查。已在 `supabase/schema.sql` 注明**已有库需补跑**这两条 ALTER/CREATE。

**supabase.ts 测试钩说明**：新增模块级 `let serverAdminForTest`＋`export function setServerSupabaseForTest(client)`，`createServerSupabase()` 开头优先返回测试注入实例。这是唯一的非年运文件改动，目的：密封测试不连真库（§8.5.1 消费者断言要求真调 route，注入钩是让 route 内 `createServerSupabase()` 可测的最小缺口），生产路径行为不变（不注入时走原逻辑）。

**保留既有断言形态的核对**：api/liunian 重写后 `saveReport(token`、`kind: 'annual'`、`locked:`、`'annual_report'`、`? luck.liuYue : null`、`luck.liuNian.find(y => y.year === targetYear)` 等 test-liunian-accept / test-reports-accept 依赖的源码形态全部保留，verify 中两脚本均绿。

---

# 三、三组牙口（§8.6.7：注入前先确认注入有效）

全部为「文本不变、行为变坏」注入；每个牙口脚本先打印【注入后的实际行为】作肯定性证据，无证据即中止。

**牙口①（locked 写入缓存）**：注入 route.ts `result: stripEntitlementState(data)` → `result: data as never`

```
—— 牙口模式：--tooth=locked（注入后先确认注入有效，再跑断言）——
  [证据] 注入后写入的缓存行 result 是否含 locked 键：true（覆盖写应剥离）
  ✓ 注入有效：权益状态被写进了缓存（断言②场景变坏）
LOCKED_TOOTH_RED_CONFIRMED
EXIT=1
```

回退后断言②复绿（坏缓存自愈＋locked 剥离双向断言通过）。

**牙口②（覆盖写失效）**：注入 reportSave.ts `if (existing?.id)` → `if (existing?.id && false)`

```
—— 牙口模式：--tooth=dup（注入后先确认注入有效，再跑断言）——
  [证据] 注入后同键两次写入（第二次 force）实际行数=2（期望覆盖写应为 1）
  ✓ 注入有效：重复行堆积复现（断言④场景变坏）
DUP_TOOTH_RED_CONFIRMED
EXIT=1
```

回退后断言④复绿（行数=1 且内容更新）。

**牙口③（键模板丢版本）**：注入 reportCache.ts return 模板去掉 `v${ANNUAL_CACHE_VERSION}:` 段

```
—— 牙口模式：--tooth=keyver（注入后先确认注入有效，再跑断言）——
  [证据] 注入后键模板是否仍含版本常量：否（键模板已失去版本段）
  ✓ 注入有效：版本常量已从键模板剥离（断言③结构判据变坏）
KEYVER_TOOTH_RED_CONFIRMED
EXIT=1
```

回退后断言③复绿（结构判据＋v0/v2 对照组全过）。

三次注入均已回退，最终默认模式 `LIUNIAN_CACHE_PASS`、EXIT=0，`git status` 干净。

---

# 四、原始日志（验收关键行摘录）

**断言⑨ 真调 route＋AI 计数（两次请求）**

```
—— ① 缓存命中不调 AI（真调 route + fetch 计数）——
  [计数] 第1次 AI 调用=1，第2次后=1（期望 1 → 1）
  ✓ 第二次命中缓存：AI 计数不增、data 深度一致、cached=true、reportId 一致
```

**断言⑦/⑩/⑪/⑫/⑤/⑬**

```
—— ② 缓存不存 locked，读取按当前权益重算 ——
  [行为] 种入坏缓存（locked+ai=null）后请求：AI 计数 1，locked=null
  ✓ 坏缓存自愈（重生成并覆盖）；recompute 双向正确；写入前 locked 被剥离
—— ③ 缓存键含算法版本（ANNUAL_CACHE_VERSION）——
  ✓ 结构判据：键模板引用版本常量，且注释写明「改 AI prompt/判据/排盘算法任一时必须 +1」
  ✓ 对照组：同键行命中（AI 计数 0，cached=true）
  ✓ v0 行未命中（重新生成，AI 计数 1）——版本号生效
  ✓ v2 行未命中（重新生成，AI 计数 1）——版本号生效
—— ④ 覆盖写不新增行 ——
  [计数] force 重生成 AI 调用=2；reports 行数=1（期望 2 → 1）
  ✓ 同键重复生成只保留一行，且行内容已更新为最新全文
—— ⑤ 时区/经度入键（补填出生地后必须重新生成）——
  [行为] 同键两次=1次AI；经度 −74→−73 后重新生成（2次AI）；行数=2
  ✓ 时区/经度/分钟/nowYear 全量入键：补填出生地不会命中错误缓存
—— ⑥ 未登录用户不走缓存（每次重算）——
  ✓ 未登录：每次重算（AI 2 次）、不落库、无 reportId——与 saveReport 无 token 返回 null 一致

LIUNIAN_CACHE_PASS
```

**全量验收**

```
npm run verify  → 26 段全绿（含 test-pricing-accept ⑧ 年运披露段），EXIT=0
npx tsc --noEmit → TSC_EXIT=0
```

---

# 五、缺项与待拍板

**① 限流未做（成本敞口声明）**：重生成按钮无限流，每次点击 = 一次真实 AI 调用（约 30 秒＋token 成本）。覆盖写保证不堆积行、不放大存储，但**不限制调用次数**。登录用户有 cacheKey 覆盖写兜底；未登录用户每次重算且无任何约束，敞口最大。任务书允许「可选每天 N 次」，计数需落库（如 reports 表加计数列或独立表），建议与「命书缓存轮」一并设计，本轮不擅自加。

**② 其它四模块 reportInput 同样缺时区/经度（已核实，本轮未改）**：

```
ziwei/route.ts:96   input = { year, month, day, hour, gender }                        ← 缺 minute/birthZone/birthLng
geo/route.ts:139    input = { year, month, day, hour, gender }                        ← 同上
hemun/route.ts:116  input = { year, month, day, gender, partnerYear/Month/Day/Gender }← 双方均缺，且连 hour/minute 都没有
（命书 fatebook 未在本次核对范围，接缓存轮时需一并核）
```

后续若给这些模块接 `reportCache.ts`（该文件按可复用设计，键模板/剥离/重算均为通用纯函数），需先把各自的 reportInput 补齐再入键，否则「补填出生地后命中错误缓存」同病复现。

**③ 未登录无缓存**：可接受（理由见 §二-13），但意味着试吃流量无法省 AI 成本，与①叠加是主要成本面。

**④ reports.input 语义变化**：年运行的 `input` JSONB 现在多了 minute/birthZone/birthLng/nowYear 字段（旧行无这些字段）。读取处均已容错（`?? null`），无迁移必要，仅提示知悉。

---

# 六、文件清单（步骤②③ commit `8538210`，8 文件 +560/−16）

```
新建：
  src/lib/reportCache.ts            缓存核心：ANNUAL_CACHE_VERSION／annualCacheKey（版本+全量参数键）／
                                    stripEntitlementState／recomputeEntitlementFields／isCacheContentUsable／
                                    cachedTargetOf／readReportCache（可复用设计，年运专用类型已隔离）
  scripts/test-liunian-cache.mjs    密封测试：mock admin＋fetch 拦截计数＋6 段断言＋三组牙口模式，纳入 verify

修改：
  src/lib/supabase.ts               +setServerSupabaseForTest 测试注入钩（唯一非年运文件，见 §二说明）
  src/lib/reportSave.ts             SaveReportPayload+cacheKey；覆盖写分支（update 命中行，无 cacheKey 保持纯 insert）
  src/app/api/liunian/route.ts      force 解析；reportInput 补 5 字段；ent/userId/admin 提前；缓存读→重算→返回 cached:true；
                                    写入剥 locked＋带 cacheKey；响应加 cached:false
  src/app/liunian/page.tsx          handleSubmit 拆 runGenerate(force)；新增「重新生成本报告」按钮＋覆盖说明
  supabase/schema.sql               +cache_key 列＋idx_reports_cache 组合索引（注明已有库需补跑）
  package.json                      verify 链尾追加 test-liunian-cache.mjs

步骤①（commit 46169a2，此前已单独回执口径）：
  src/lib/pricing.ts ／ src/app/pricing/page.tsx ／ scripts/test-pricing-accept.mjs
```

**Commit 汇总**：步骤① `46169a2` ／ 步骤②③ `8538210`。两 commit 均未 push。修复效果请以实测为准（重新排一次年运→第二次秒回且 AI 计数不增→点「重新生成」→全文重写且「我的报告」不出现重复条目）。
