# HANDOFF-BACK-伙伴自助 V2 回传

> **执行方**：TraeCode（B 侧）
> **任务书**：`HANDOFF-伙伴自助V2.md`（第 34 轮）
> **日期**：2026-10-26
> **结论**：按任务书实现完毕，`tsc` / `verify`（42 个 `*_PASS`）/ `build` 全绿；两组牙口均红→还原→绿。
> **另**：已按复核要求完成 R1–R4（见 §九）。

---

## 一、git diff --stat（本轮 3 个提交）

```
 package.json                        |   2 +-
 scripts/test-liunian-cache.mjs      |   7 +-
 scripts/test-partner-v2-accept.mjs  | 469 ++++++++++++++++++++++++++++++
 src/app/api/partner/report/route.ts | 140 +++++++++
 src/app/api/partner/share/route.ts  | 103 +++++++
 src/app/partner/layout.tsx          |  13 +
 src/app/partner/page.tsx            | 454 +++++++++++++++++++++++++++++
 src/app/r/[token]/page.tsx          |  18 +-
 src/app/reports/[id]/page.tsx       |   2 +
 src/app/reports/page.tsx            |   7 +
 src/lib/partnerCredits.ts           |  17 +-
 src/lib/partnerReport.ts            | 566 ++++++++++++++++++++++++++++++++++++
 src/lib/reportCache.ts              |   2 +
 supabase/partner-v2.sql             |  33 +++
 14 files changed, 1825 insertions(+), 8 deletions(-)
```

白名单外只多一个 **`src/app/partner/layout.tsx`**：`page.tsx` 是 `'use client'` 不能导出 metadata，站点体检 `test-site-audit` 要求同级 layout 提供 metadata，否则 `metadata 缺失 1 处` 直接红（已实测）。该 layout 只提供 title/description + `robots: noindex`。

**未改动**：`/api/unlock`、`/api/webhooks/waffo`、`/api/checkout`、`partnerCredits.spendPartnerUnits` 语义、`ReportOriginNote` 组件本体。工作区里 `src/lib/demoFatebook.ts` 的既有未提交改动不是本轮产物，未纳入任何提交。

---

## 二、supabase/partner-v2.sql 全文（★ 已在线上执行，2026-10-26）

```sql
-- 伙伴自助 V2（第 34 轮）：报告状态机 + 幂等请求号 + 品牌位
-- 全部 IF NOT EXISTS，可重复执行。
-- status 默认 'ready' → 老数据语义不变；request_id 与 user_id 组成部分唯一索引，
-- 是「同一请求只扣一次额度」的唯一硬约束。

ALTER TABLE reports ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'ready';
ALTER TABLE reports ADD COLUMN IF NOT EXISTS request_id TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS brand_name TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS brand_contact TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_reports_request_id
  ON reports (user_id, request_id)
  WHERE request_id IS NOT NULL;
```

**执行记录（线上 Supabase，项目 zvqjjmyhisuotylhjjjz）**

```
第一次执行：Success. No rows returned
重复执行：  Success. No rows returned（IF NOT EXISTS 幂等成立）

列校验 select column_name ... （4 行）
  brand_contact / brand_name / request_id / status

索引校验 select indexname from pg_indexes ...
  idx_reports_request_id（1 行）
```

**改动说明**：初版 SQL 还带 4 条 `COMMENT ON COLUMN`（长中文注释）。在 SQL Editor 录入时最后一条字符串被截断，报 `42601 unterminated quoted string`，DDL 未生效。为避免长文本录入风险，已把这 4 条 COMMENT 从迁移文件与回执中移除（列语义改由文件头注释说明），DDL 本体一字未改，随后执行成功。**部署顺序**：SQL 已先于线上使用完成，列表/详情/分享页的 `status='ready'` 过滤现在可以安全生效。

---

## 三、幂等实证：同一 requestId 连调两次

测试用的固定时钟 `2026-10-26T00:00:00Z`、初始余额 3、同一 `requestId='req-7f3a'`：

```
== 幂等：同一 requestId 连调两次 ==
第1次：ok=true reportId=r1 balance=2 duplicate=false
第2次：ok=true reportId=r1 balance=2 duplicate=true
库内行数=1 扣费次数=1 退额次数=0
```

验收测试里的对应断言（同一结论，含并发）：

```
—— ⑦ 幂等（顺序重复提交）——
  ✓ 两次提交都返回成功
  ✓ 两次返回同一 reportId
  ✓ 第二次标记 duplicate
  ✓ 第二次复用同一分享令牌
  ✓ 余额只减 1 次
  ✓ 余额 5 → 4
  ✓ 库内只有一行（唯一索引兜底）
—— ⑩ 并发幂等 ——
  ✓ 两个并发请求指向同一份报告
  ✓ 并发只落 1 行（数据库唯一索引硬约束）
  ✓ 并发只扣 1 次
  ✓ 余额 5 → 4
```

并发 loser 走 `INSERT` 的 `23505` → 回查该行 → 返回 `409 REQUEST_IN_PROGRESS` + 同一 `reportId`（或 winner 已完成则返回 `duplicate=true` 的成功体），**不会二次扣费**。

---

## 四、失败退额实证 + console.error 原文

注入 `generate` 抛 `模拟 AI 超时`、初始余额 3：

```
== 失败退额：生成抛错 ==
返回：ok=false status=500 code=GENERATION_FAILED balance=3
库内行：id=r1 status=failed result={}
console.error 原文：★伙伴报告生成失败已退额，需核查：r1
```

- 扣 1 → 退 1，余额回到 3（`扣费次数=1、退额次数=1`）。
- 退额调用的是 `adjustPartnerUnits({ userId, units: 1, ref: 'refund:<reportId>', reason: 'refund' })`（见 §九 R2），不是直写账本。
- 额外兜底：**退额本身失败时不会谎称已退**，改打 `★伙伴报告生成失败且退额失败，需人工补账：<reportId>（<原因>）`，供运营补账。
- 扣费失败（并发扣光）则 `status=failed` 且**不退额**（根本没扣），返回 `409 SPEND_FAILED`。

同一轮的其他闸门实证：

```
非伙伴：status=403 code=NOT_PARTNER 落行=0 扣费=0
余额0：status=409 needPurchase=true balance=0 落行=0
预算超额：status=429 code=AI_BUDGET_EXHAUSTED balance=3 落行=0
```

---

## 五、牙口两次

### 牙口 A：删掉退额分支

改 `src/lib/partnerReport.ts` 的 `failAndRefund`，把 `await deps.refund(...)` 注释掉后：

```
  ✗ 余额回到 5（扣 1 再退 1）
  ✗ 扣 1 次、退 1 次
PARTNER_V2_FAIL（2 处）
EXIT=1
```

还原后：

```
PARTNER_V2_PASS
EXIT=0
```

### 牙口 B：删掉 requestId 唯一索引

把 `partner-v2.sql` 的 `CREATE UNIQUE INDEX ... idx_reports_request_id` 整段注释掉后（测试已先剥离 SQL 行注释再断言，注释掉的索引不算声明）：

```
  ✗ 存在 idx_reports_request_id
  ✗ 唯一索引是 (user_id, request_id) 的部分唯一索引
  ✗ 两个并发请求指向同一份报告
  ✗ 并发只落 1 行（数据库唯一索引硬约束）
  ✗ 并发只扣 1 次
  ✗ 余额 5 → 4
PARTNER_V2_FAIL（6 处）
EXIT=1
```

还原后：

```
PARTNER_V2_PASS
EXIT=0
```

（牙口 B 第一次跑时曾因为测试用未剥注释的正则、把注释行当成声明而误绿；已在测试里加 `stripSqlComments` 修正并复测，上面的红是修正后的真实结果。）

---

## 六、tsc / verify / build

```
npx tsc --noEmit
TSC_EXIT=0

npm run verify
EXIT=0
*_PASS 计数 = 42（既有 41 + PARTNER_V2_PASS）
```

`verify` 末尾 10 行：

```
  ✓ report 路由 no-store
  ✓ 余额由服务端读取（客户端不碰账本）
  ✓ GET 返回余额 + 伙伴身份
  ✓ 列表只取最近 20 份
  ✓ 分享路由复用 90 天令牌工具
  ✓ 分享路由校验报告归属
  ✓ 非 ready 报告不允许分享
  ✓ verify 末尾已挂本测试

PARTNER_V2_PASS
```

```
npm run build
EXIT=0
✓ Compiled successfully in 1299ms
├ ƒ /api/partner/report
├ ƒ /api/partner/share
├ ○ /partner
```

---

## 七、已知缺口

1. **品牌位不支持 logo/图片**（任务书禁止对象存储，本轮只收两个文本字段）。
2. **不能自助换绑/解绑伙伴身份**：资格由 `partner_credits` 有行决定，仍要靠运营 `--grant` / 购买；无行的账号永远看不到工作台（含余额 0 的老伙伴——有行但余额 0 可以进，看到充值提示）。
3. **pending 行没有超时回收**：若生成进程被平台杀掉，该行会长期停在 `pending`，伙伴列表显示「生成中」；用同一 requestId 重试会拿到 409（不扣费），换新 requestId 会再扣一份。建议运营侧定期清 `status='pending' AND created_at < now()-interval '30 min'`。
4. **命书 AI 失败会回退规则版而不判失败**（与 `/api/unlock` 同口径）：伙伴拿到的仍是规则引擎全文，不触发退额；只有硬异常（抛错/落库失败）才退。
5. **伙伴代客户生成的报告不出现在「我的报告」**（`request_id IS NULL` 过滤），只在 `/partner` 列表；直接访问 `/reports/<id>` 命书行仍会提示「缺少命盘关联」（既有页面限制）。
6. **未做线上端到端**：所有扣费/退额/幂等实证均为离线注入（无真实 Supabase / 无真实 AI 调用）。按 §八 的 `--grant 2 → 生成一份 → 2→1` 仍需 A 侧实跑。
7. **未验证真实并发**：并发只扣一次靠数据库唯一索引，模拟已覆盖；真实 Postgres 的 `23505` 分支建议在线上用两个并发请求再确认一次。
8. **分享页对 `status` 的过滤依赖 SQL 先执行**（见 §二 部署顺序警告）。

---

## 八、分步提交说明

| # | commit | 内容 |
|---|---|---|
| 1 | `2901f05` `feat(partner): 伙伴自助 V2 数据库与服务端生成 —— 状态机 + 幂等扣费 + 失败退额` | `supabase/partner-v2.sql`、`src/lib/partnerReport.ts`、`src/lib/partnerCredits.ts`（R2 扩展）、`src/lib/reportCache.ts`、`src/app/reports/page.tsx`、`src/app/reports/[id]/page.tsx`、`scripts/test-liunian-cache.mjs`（mock 补 status 默认值） |
| 2 | `3d1e1b1` `feat(partner): 伙伴工作台与出报告端点 —— 余额闸门 + 品牌位 + 分享链接` | `api/partner/report/route.ts`、`api/partner/share/route.ts`、`app/partner/page.tsx`、`app/partner/layout.tsx`、`app/r/[token]/page.tsx` 品牌位 + 命书回退读取 |
| 3 | `b897697` `test(partner): 伙伴自助 V2 离线验收 —— 幂等/退额/预算/品类 + 披露守护` | `scripts/test-partner-v2-accept.mjs`、`package.json`（verify 末尾挂载） |

---

## 九、对 R1–R4 的逐条落实

### R1（回归风险）：status 读取点

新增 `status` 后，所有「按 user_id 读 reports 并展示」的地方统一加 `status='ready'`。**改了三处读取 + 一处缓存**：

| 位置 | 改动 |
|---|---|
| [reports/page.tsx](file:///e:/ai-agent/stock1000/bazi-mvp/src/app/reports/page.tsx) 「我的报告」列表 | `.eq('status','ready')`，另加 `.is('request_id', null)` 让伙伴代客户生成的报告不混进客户视图 |
| [reports/[id]/page.tsx](file:///e:/ai-agent/stock1000/bazi-mvp/src/app/reports/[id]/page.tsx) 详情 | `.eq('status','ready')` |
| [r/[token]/page.tsx](file:///e:/ai-agent/stock1000/bazi-mvp/src/app/r/[token]/page.tsx) 分享页 | `.eq('status','ready')`（即使令牌列被误写也不展示 pending/failed） |
| [reportCache.ts](file:///e:/ai-agent/stock1000/bazi-mvp/src/lib/reportCache.ts) 缓存命中 | `.eq('status','ready')`，pending/failed 的 `result={}` 不会被当缓存复用 |

**未改**（并说明理由）：
- `aiBudget.yesterdayReportDau` 只统计昨日去重 `user_id` 做 DAU 投影，不展示内容；多算一个伙伴账号不影响任何展示。
- `reportSave` 的 `cache_key` 查询/覆盖写：伙伴行不带 `cache_key`，不会命中；加 status 会改变既有覆盖写语义，故不动。
- 老数据全部 `status` 默认 `'ready'`、`request_id` 为 NULL → 列表/详情/分享行为不变（`test-liunian-cache` 的内存 mock 也按数据库默认值补了 `status`，否则老行会被过滤掉）。

### R2：退额不直写账本

`src/lib/partnerCredits.ts` 的 `adjustPartnerUnits` 增加**可选**参数：

```ts
export type PartnerAdjustReason = 'adjust' | 'refund'
export async function adjustPartnerUnits(
  admin: SupabaseClient,
  input: { userId: string; units: number; note?: string; ref?: string; reason?: PartnerAdjustReason }
)
```

- 不传 `reason` → 仍是 `'adjust'`、`ref=note`，**旧调用行为完全不变**（测试断言「不传 reason 时保持 adjust」）。
- V2 退额：`adjustPartnerUnits({ userId, units: 1, ref: 'refund:'+reportId, reason: 'refund' })`。
- `partnerReport.ts` 源码断言不含 `from('partner_credits').insert`（账本单一写入口）。

### R3：GET 必须 dynamic + no-store

`src/app/api/partner/report/route.ts`：

- `export const dynamic = 'force-dynamic'`、`export const revalidate = 0`
- 所有响应（含 401/403/409/429/500）统一带 `Cache-Control: no-store`
- 余额只用 `getPartnerBalance(admin, user.id)`（`service_role`）读；客户端只拿数字，不接触 `partner_credits`（该表开着 RLS 且无策略）
- build 结果 `├ ƒ /api/partner/report`（动态渲染）

### R4：`charts.is_paid` 的副作用

**结论：本轮完全不写 `charts` 行。** 因此：

- 不产生「已付费命盘」，不占用/触发免费提问额度（`getAskRemaining` 只按 payments/invite/member 计，`charts` 不参与）。
- 不会在伙伴账号的「我的命盘」里堆客户命盘，也没有由此产生的重复报告条目。
- 分享页命书正文改为：`input.chart_id` 存在 → 仍读 `charts.chart_data.analysis.paid`（兼容旧数据）；不存在 → 读 `reports.result.paid`（伙伴新链路）。`test-partner-v2-accept` 同时断言「lib 不含 `from('charts')`」与「分享页有 `result?.paid` 回退」。

**唯一需要记录的行为变化**：伙伴的每次生成仍是 1 条 `reports` 行，它按 RLS 属于该伙伴账号；为避免伙伴在自己的「我的报告」里看到一堆客户报告（且命书行点进去会因无 `chart_id` 走死胡同），列表加了 `.is('request_id', null)`，伙伴代客户报告只在 `/partner` 展示。老数据（`request_id IS NULL`）展示不变。
