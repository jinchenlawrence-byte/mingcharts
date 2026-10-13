# 回执：付费墙启用前验收（26号任务书）

> 对应任务书：`docs/交接记录/26-付费墙启用前验收/HANDOFF-付费墙启用前验收.md`
> 日期：2026-10-13 ｜ 执行：TraeCode
> **本回执与代码改动均未 commit，等用户确认后一次提交。**

---

## 一、结论

| 步骤 | 内容 | 结果 |
|---|---|---|
| 步骤1 | `ENTITLEMENT_ENFORCE` 改方案 B（`process.env.ENTITLEMENT_ENFORCE === 'true'`，生产不设 ⇒ false）＋ 三条守护断言 ＋ 牙口三连 | ✅ 完成 |
| 步骤2 | 本地 ENFORCE=true 实测：四判定点全拦截 ＋ AI 未调用三重可观测证明 ＋ §3.3 反向验证全放行 ＋ §3.4 membership 双态 | ✅ 完成（本地 dev 环境） |
| 步骤3 | 路径②「verify-payment 兜底补回」（需真实支付） | ⛔ 无法本地执行——只能在 Preview/生产做，已备 runbook（见 §四/§五） |

- `npm run verify` **27 段全 PASS**（新增第 27 段 `test-enforce-guard`），`tsc --noEmit` **0 错误**（链首已含）。
- **`ENTITLEMENT_ENFORCE` 最终状态：env 可控常量，生产不设该 env ⇒ false**；`.env.local` 中验证用的 `ENTITLEMENT_ENFORCE=true` 已移除。
- **`.env.local` 未被 git 跟踪**（守护断言⑤持续把关）；源码无硬编码 true。

---

## 二、逐条回应（对照任务书 §六 验收标准 16 条）

| # | 项 | 回应 |
|---|---|---|
| 1 | 常量改 `process.env.ENTITLEMENT_ENFORCE === 'true'`（含注释） | ✅ [entitlement.ts](file:///e:/ai-agent/stock1000/bazi-mvp/src/lib/entitlement.ts#L22)，注释含方案 B 说明、NEXT_PUBLIC_ 禁令、客户端评估为 false 无害说明；另同步了该文件内两处过时注释（「ENFORCE 仍须为 false」→「生产不设 ⇒ false」） |
| 2 | 三条守护断言 ＋ 贴注入前后 | ✅ 新增 [test-enforce-guard.mjs](file:///e:/ai-agent/stock1000/bazi-mvp/scripts/test-enforce-guard.mjs) 并登记 verify 第 27 段。注入前后原文见 §三-1 |
| 3 | 判定点1：entitlements 带 chartId ⇒ false | ✅ 实测 `200 {"ownedSkus":[],"memberSkus":[],"canViewFatebook":false}` |
| 4 | 判定点2：entitlements 不带 chartId ⇒ false | ✅ 实测 `200 {"ownedSkus":[],"memberSkus":[],"canViewFatebook":false}`（ownedSkus 空 ⇒ 成功页轮询必然走 pending 分支） |
| 5 | 判定点3：paipan ⇒ locked 非 null、不含 ai 全文/paid 板块 | ✅ 实测 `locked={"skus":["fatebook","annual_report"],"preview":"命书深度报告含十大板块万字详批（…），解锁后可见。"}`，`analysis.isPaid=false`、`analysis.paid=undefined`（免费层仅结构化排盘+岁运，全文不存在于响应） |
| 6 | 判定点4：unlock ⇒ 402 ＋ locked:true | ✅ 实测 `402 {"success":false,"error":"尚未购买命书报告","locked":true,"sku":"fatebook","chartId":"283e5269-…"}` |
| 7 | 「不触发 AI 调用」可观测证明（至少两条） | ✅ **做了三条**（§三-2）：②结构断言 ＋ ③AI 必败对照 ＋ ④日志计数，证据见 §三-3 |
| 8 | 反向验证：插 paid 行 ⇒ 四点全放行 | ✅ 实测四点依次：`canViewFatebook:true`（带/不带 chartId，ownedSkus 变 `["fatebook"]`）、`locked=null`、`unlock 200 success:true`；删行后立即回到 false（行级粒度）。前后对比见 §三-4 |
| 9 | membership 路由 ENFORCE=true 行为 ＋ 判断 | ✅ 实测 `501 {"success":false,"error":"支付通道尚未开放","code":"PAYMENT_NOT_READY"}`；ENFORCE=false 会话实测 `200 {success:true,data:{active:true,trial:true,plan:"monthly",message:"内测期免费开放，…"}}`。**判断：行为合理，无须调整**——POST 不写任何库、明确告知未开放，与源码注释设计一致（`membership/route.ts:50-66`）；这也是「生产绝不设 env」的又一层理由（开了它会员内测免费通道即关闭） |
| 10 | 路径②：真实支付 → 删行 → 权益消失 | ⛔ 本地无 Waffo 支付通道，只能在 Preview/生产执行（任务书 §四-1 自身前提）。**已在本会话用假单号预检通道**：`POST /api/verify-payment {orderMerchantExternalId:"MC-<uid>-1791861600000"}` ⇒ `200 {"status":"pending"}`——路由、对账流程、拒绝形态均正常。runbook 见 §五 |
| 11 | 成功页 35-40 秒补回 | ⛔ 同上（依赖真实支付素材），且成功页轮询的输入条件（不带 chartId 的 ownedSkus 空数组）已在判定点2实测。建议随路径②在 Preview 顺带观察页面四态 polling→verifying→unlocked |
| 12 | 失败时贴 `[verify-payment]` 日志 | —（未到真实支付步骤；预检无 GraphQL 报错） |
| 13 | 生产 ENFORCE 仍 false | ✅ 方案 B 构造性成立：守护②子进程不设 env 实测 `false`；本次 `.env.local` 的 `ENTITLEMENT_ENFORCE=true` 已移除；生产/Vercel 从未设置该变量 |
| 14 | `.env.local` 未提交、源码无硬编码 true | ✅ 守护⑤（`git ls-files .env.local` 空）＋ 附加④（src 两模式命中 `[0,0]`）。`.gitignore` 的 `.env*` 规则覆盖 |
| 15 | verify 全绿 ＋ tsc 0 错误 | ✅ 27 段全 PASS（输出尾部 25 个 `_PASS` 标记，`FATEBOOK_ONEPAY_PASS`/`ENFORCE_GUARD_PASS` 收尾），链首 `tsc --noEmit` 0 错误 |
| 16 | 明确说明是否真在 ENFORCE=true 下跑过、哪个环境 | ✅ **真跑过：本地 dev**（Windows `next dev`，`.env.local` 设 `ENTITLEMENT_ENFORCE=true`，Supabase 为云端项目；AI 密钥真实（B1 轮）与注释（B2 轮）各跑一轮）。Preview/生产的 ENFORCE=true 验证尚未发生，随路径②一并做 |

另有 §〇-2 处核实项：`membership/route.ts:60` 读该常量——已验（上表 #9）；`CheckoutButton.tsx` 为唯一客户端引用——方案 B 下客户端 bundle 中评估为 `undefined === 'true' ⇒ false`，与任务书 §〇-6 论断一致，未发现反例。

---

## 三、原始日志（关键摘录）

### 1. 三条守护断言：牙口注入前后（§六-2）

**注入①（常量临时改 `NEXT_PUBLIC_` 前缀）→ 精确翻红：**
```
—— 守护① 源码不得出现 NEXT_PUBLIC_ENTITLEMENT_ENFORCE ——
  ✗ src/**/*.ts,tsx 去注释后 NEXT_PUBLIC_ENTITLEMENT_ENFORCE 命中 1（要求 0，防进客户端 bundle）
  ✗ 结构：entitlement.ts 常量为 env 判等式（命中 0，要求 1）
  ✗ 运行时：显式设 true ⇒ true（got=false，正向对照：开关真的可开）
ENFORCE_GUARD_FAIL
```

**注入②（`=== 'true'` 改 `!== 'false'`，默认变 true 的危险写法）→ 精确翻红：**
```
  ✗ 结构：entitlement.ts 常量为 env 判等式（命中 0，要求 1）
  ✗ 运行时：不设 env ⇒ false（got=true，即生产恒定关闭）    ← 危险默认被当场抓住
ENFORCE_GUARD_FAIL
```

**注入③（.env.example 该行去掉注释）→ 精确翻红：**
```
  ✗ .env.example 含注释行「# ENTITLEMENT_ENFORCE=true」（命中 0）
  ✗ .env.example 无未注释的 ENTITLEMENT_ENFORCE= 行（命中 1，要求 0）
ENFORCE_GUARD_FAIL
```

**三次复绿后基线（全文）：**
```
—— 守护① 源码不得出现 NEXT_PUBLIC_ENTITLEMENT_ENFORCE ——
  ✓ src/**/*.ts,tsx 去注释后 NEXT_PUBLIC_ENTITLEMENT_ENFORCE 命中 0（要求 0，防进客户端 bundle）
—— 守护② 不设 env 时必须为 false（结构＋运行时＋正向对照）——
  ✓ 结构：entitlement.ts 常量为 env 判等式（命中 1，要求 1）
  ✓ 运行时：不设 env ⇒ false（got=false，即生产恒定关闭）
  ✓ 运行时：显式设 true ⇒ true（got=true，正向对照：开关真的可开）
—— 守护③ .env.example 该项注释掉且注明生产不设 ——
  ✓ .env.example 含注释行「# ENTITLEMENT_ENFORCE=true」（命中 1）
  ✓ .env.example 注明「生产不设/绝不设置」
  ✓ .env.example 无未注释的 ENTITLEMENT_ENFORCE= 行（命中 0，要求 0）
  ✓ .env.example 无 NEXT_PUBLIC_ 前缀变体（命中 0，要求 0）
—— 附加④ 源码不得硬编码 ENTITLEMENT_ENFORCE = true ——
  ✓ src 硬编码 true 两模式命中 [0, 0]（要求 [0, 0]，§六-14）
—— 附加⑤ .env.local 未被 git 跟踪 ——
  ✓ .env.local 未入库（git ls-files 输出 "空"，要求空；§六-14）
ENFORCE_GUARD_PASS
```
> 附加④⑤超出任务书最低要求，对应 §六-14 的两个断言点。运行时断言用子进程 `npx tsx` 真 import 生产模块评估常量（先删 env 模拟「生产不设」，再显式设 true 做正向对照证明开关可开）。

### 2. ENFORCE=false 会话 canary（§3.4 false 侧 + §〇-1 假象旁证）

```
✓ 3 [§3.4·ENFORCE=false] POST /api/membership ⇒ 200
  body={"success":true,"data":{"active":true,"trial":true,"plan":"monthly","message":"内测期免费开放，未产生任何扣费，也未开通正式订阅"}}
ℹ 4 [旁证] ENFORCE=false 下不带 chartId 粗判 ⇒ 200
  body={"ownedSkus":[],"memberSkus":[],"canViewFatebook":true}（零购买仍恒真＝假象，正是本次验收要揭穿的）
```

### 3. ENFORCE=true 会话 B1：四判定点 ＋ AI 未调用证据（验收 #3-#7）

```
✓ 1 [§3.4·ENFORCE=true] POST /api/membership ⇒ 501 body={"success":false,"error":"支付通道尚未开放","code":"PAYMENT_NOT_READY"}（ai 日志 0 条）
✓ 3 [判定点4] POST /api/unlock ⇒ 402
  body={"success":false,"error":"尚未购买命书报告","locked":true,"sku":"fatebook","chartId":"283e5269-352e-4a52-8b53-8c7e16d26cba"}（ai 日志 0 条——要求 0）
✓ 3b ④ 402 路径 dev server 日志 [ai] 出现 0 次（AI 配置健康仍为零＝AI 未被调用的可观测证据）
✓ 4 [判定点1] POST /api/entitlements {chartId} ⇒ 200 body={"ownedSkus":[],"memberSkus":[],"canViewFatebook":false}
✓ 5 [判定点2] POST /api/entitlements（无 chartId）⇒ 200 body={"ownedSkus":[],"memberSkus":[],"canViewFatebook":false}
✓ 6 [判定点3] POST /api/paipan {token} ⇒ 200
  locked={"skus":["fatebook","annual_report"],"preview":"命书深度报告含十大板块万字详批（八字总览、性格天赋、用神喜忌、格局成败、调候、大运流年、事业财运、婚姻感情、子女六亲、健康提示），解锁后可见。"}
  analysis.isPaid=false  analysis.paid=undefined(无付费板块)（ai 日志 0 条）
```

**「AI 没被调用」三条证明（§三-2 选了 ②＋③＋④，说明理由见下）：**
```
② 结构断言（入 verify 常驻）：
  ✓ unlock 结构：AI 调用在 402 之后（402@2099 < AI@2324，26号 §三-2②）   [test-fatebook-onepay.mjs]
③ AI 必败对照（B2 轮，AI_API_KEY 已注释）：
  ✓ 1 [③] AI 必败下 POST /api/unlock ⇒ 402（ai 日志 0 条）
  ✓ 1b [③] 402 响应与 AI 健康会话（B1）逐字段一致=true
  ✓ 1c ③ 402 路径 [ai] 日志 0 条（AI 必败配置下仍零调用）
④ 日志计数（dev server stdout 窗口内 [ai] 出现次数）：
  402 路径（AI 健康 / AI 必败两轮）均 0 次；
  反向验证放行路径 1 次（对照证据）：
  [ai] 未配置 AI_API_KEY，本次回退规则版文案        ← B2 日志第 26 行，证明放行时 AI 模块确实被进入
```
> **为何三条都做**：②能防回归但属静态；③在运行时证明「AI 不参与 402」且响应逐字段不变；④给出正向对照（同配置下放行路径有 [ai] 日志、拦截路径 0 条），把「AI 跑了但结果被丢掉」的可能也排除。三者合在一起才是完整证据链，缺任何一条都留有漏洞，故超出任务书最低两条做了三条。

### 4. §3.3 反向验证（验收 #8）＋ 路径②预检 ＋ 清理

```
✓ 2 [§3.3] 手动插 paid 行 ⇒ 201 tx=TEST-V26-1791861633481 chart_id=283e5269-352e-4a52-8b53-8c7e16d26cba
✓ 2a [反向·判定点1] entitlements {chartId} ⇒ 200 body={"ownedSkus":["fatebook"],"memberSkus":[],"canViewFatebook":true}
✓ 2b [反向·判定点2] entitlements（无 chartId）⇒ 200 body={"ownedSkus":["fatebook"],"memberSkus":[],"canViewFatebook":true}
✓ 2c [反向·判定点3] paipan {token} ⇒ 200 locked=null（null＝已解锁）
✓ 2d [反向·判定点4] unlock ⇒ 200 success=true（AI 必败 ⇒ 规则版回退，仍全文放行）
ℹ 3 [路径②预检] verify-payment 假单号 ⇒ 200 body={"status":"pending"}
✓ 4 [清理] 删测试 paid 行 ⇒ 204
✓ 4b [清理复核] entitlements {chartId} ⇒ 200 canViewFatebook=false（删行即回收，判定粒度＝行级）
✓ 5b/5c [清理复核] 两个测试用户的 charts/payments 残留 0 行（级联删除验证干净）
```
> 放行前后对比：判定点1/2 `false→true`、判定点3 `locked 非 null→null`、判定点4 `402→200`，四点全翻。测试数据（payments 行、charts 行、两个测试用户）已全部清理，数据库回到验证前状态。

---

## 四、承认缺项

1. **路径②（真实支付 → 删 payments 行 → verify-payment GraphQL 反查补回）未执行**——任务书 §四-1 自身规定只能在 Preview/生产做，本地无支付通道。这是本次唯一未完成的验收大项。
2. **成功页浏览器四态未实测**（polling→verifying→unlocked/pending）——页面是纯客户端轮询逻辑，其输入条件（ownedSkus）已 API 实测；建议随路径②在 Preview 顺带观察。
3. **`.env.local` 曾经历一次编码波折**（详见 §五-1）——现已从 Trae 编辑器本地历史快照（2026-10-12 23:57:23）完整恢复，11 个键逐键值一致性复核通过；但注释文字可能与用户手头版本有微小出入，**建议用户过目一眼 .env.local**。
4. **25 号遗留**：`schema.sql` 迁移段 2b 的 `idx_payments_chart` 索引仍需在 Supabase（现有库）人工补跑——本次反向验证单行插入/删除未受无索引影响，但路径②真实流量前建议补上。
5. 上个会话遗留的 `next dev`（PID 22516/22512，同项目后台任务产物）已停掉，端口 3000 释放；验证结束后**未重启** dev server，需要时 `npm run dev` 即可。

## 五、待拍板

1. **是否 commit 本次改动**（4 改 1 增，见 §六；建议一条 commit）。回执文档本身也等你确认后再入库。
2. **Preview 环境开启路径**：Vercel → Settings → Environment Variables → Preview 环境设 `ENTITLEMENT_ENFORCE=true`（服务端变量，无 NEXT_PUBLIC_ 前缀），然后由你用测试卡 `4576 7500 0000 0110` 重买一次产生新素材，按任务书 §4.2 四步走（删行 → 验 canViewFatebook=false → 成功页等 35-40 秒 → 查 payments 补回）。若 GraphQL 反查失败，取 Vercel Runtime Logs 中 `[verify-payment] GraphQL errors:` / `GraphQL 反查失败:` 原文回来，按 §4.3 用真实响应校正字段名（`normalizeGraphqlPayment` 已有候选名容错，改动点集中在 `waffo-events.ts`）。
3. **membership 501 行为维持现状**——我的判断是合理（见 §二 #9），如你希望 ENFORCE=true 时会员路由走别的文案/状态码，请另行拍板，本任务未动它。
4. **`.env.local` 请过目**（§四-3）。

## 六、文件清单

**拟 commit（等你确认）：**
| 文件 | 变更 |
|---|---|
| `src/lib/entitlement.ts` | 常量改 env 可控（方案 B）＋ 注释更新（含 REPLY-23 待办标记为 26号已执行） |
| `.env.example` | 新增「付费墙总开关」注释段（`# ENTITLEMENT_ENFORCE=true` ＋ 生产不设说明） |
| `scripts/test-enforce-guard.mjs` | **新增**：三守护断言＋运行时子进程评估＋正向对照＋附加④⑤，登记 verify 第 27 段 |
| `scripts/test-fatebook-onepay.mjs` | 字面量断言随方案 B 更新；新增 §三-2② unlock 结构断言（AI 在 402 之后） |
| `package.json` | verify 链追加 `&& tsx scripts/test-enforce-guard.mjs`（27 段） |

**不入库（.gitignore 已覆盖）：**
- `temp/verify26-partA.mjs` / `partB1.mjs` / `partB2.mjs`：本轮运行时验证的三段脚本（可复跑；partA 会新建测试用户，partB2 会做反向验证＋全量清理）。含 token/password 的中间状态文件已删除。
- `.env.local`：验证后已还原（无 `ENTITLEMENT_ENFORCE`，AI_API_KEY 已恢复）。

> **一句话**：付费墙的「锁」这次是真的验过了——未解锁拿不到全文、AI 一分钱没烧、插行即放行、删行即回收；剩下的就是 Preview 里用真钱走一遍兜底补回，那扇门才能正式上锁。
