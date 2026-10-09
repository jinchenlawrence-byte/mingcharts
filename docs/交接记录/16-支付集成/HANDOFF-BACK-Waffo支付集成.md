# HANDOFF-BACK · Waffo 支付集成（代码完成，联调待密钥/隧道）

- 日期：2026-10-10
- 对应任务书：[HANDOFF-Waffo支付集成.md](./HANDOFF-Waffo支付集成.md)（§五～§九 全部落地）
- SDK：`@waffo/pancake-ts@0.25.0`（已入 package.json；安装须带 `--proxy http://127.0.0.1:7897 --https-proxy http://127.0.0.1:7897`）
- 验收：`npm run verify` **21 段脚本全绿 EXIT=0**（tsc + 21 个脚本，新增第 20 段 test-waffo-accept）；`npm run build` EXIT=0（/checkout/success 正常产出）

---

## 一、结论

1. **支付链路代码已全部写完并通过行为断言**：配置层（waffo.ts 单例/验签/参数构造）、SKU 映射、四项 DB 变更（schema.sql 单文件双份：建表段 + 旧库迁移段）、四个 API（checkout / webhooks/waffo / verify-payment / entitlements）、购买按钮、成功页、客户门户链接。
2. **当前上线形态是「安全关闭」的**：`WAFFO_PRODUCTS` 映射为空 → fatebook 购买按钮显示「即将推出」，checkout 对任何请求返 `SKU_UNAVAILABLE`(400)，不会有用户被导去坏页面；`ENTITLEMENT_ENFORCE` 仍为 `false`，内测行为零变化；私钥只在服务端模块出现（带 window 守卫）。
3. **联调本轮无法闭环**：WAFFO_MERCHANT_ID / WAFFO_PRIVATE_KEY / WAFFO_STORE_ID / 商品 productId / 外网 https 隧道均在用户侧；SQL 迁移也需在 Supabase SQL Editor 执行（文件已备好）。缺项见第四节。

---

## 二、逐条回应（对照任务书章节）

### §5.1 配置层 ✓

- `src/lib/waffo.ts`（仅服务端）：懒加载 `WaffoPancake` 单例；四项 env 缺失即抛「Waffo 支付未配置：缺少 XXX」明确错误；出口 undici ProxyAgent(7897) 与 Supabase 同模式；模块顶层 `typeof window !== 'undefined'` 守卫。
- 构造 client 时**不传 environment**：SDK 按 API Key 自决测试/生产身份（任务书「测试模式先接」）；webhook 验签省略 environment → SDK 先试 prod 再 test，按事件 mode 选内置公钥。
- `src/lib/waffo-products.ts`（同构）：`WAFFO_PRODUCTS: Partial<Record<SkuId,string>> = {}`，fatebook 留注释模板；**无硬编码 PROD_**（有断言）。客户门户 URL 也在本文件（公开链接，客户端要用）。
- `.env.example`：补 `WAFFO_MERCHANT_ID / WAFFO_PRIVATE_KEY / WAFFO_STORE_ID / NEXT_PUBLIC_APP_URL`，含隧道禁用 localtunnel 提示。

### §5.8 数据库四项变更 ✓（只写文件，执行在用户侧）

`supabase/schema.sql` 同时改了【建表单一事实源】与文件末【旧库迁移段】：
1. payment_method CHECK 纳入 `'card'`（DROP IF EXISTS + ADD）；
2. `order_merchant_external_id TEXT` + `idx_payments_omer`；
3. `CONSTRAINT payments_transaction_id_key UNIQUE (transaction_id)`——迁移注释附现网重复 transaction_id 查重 SQL（历史 MOCK_ 若撞号需人工清理后再加约束）；
4. `processed_webhooks` 表，PK(event_type,event_id)，ENABLE RLS 且不建任何策略（仅 service_role）。

### §5.2 POST /api/checkout ✓

登录校验 → SKU 未登记返 `{code:'SKU_UNAVAILABLE'}` 400（非 500）→ 单号 `MC-<userId>-<13位毫秒>`（实测 53 字符 ≤128）→ 纯函数 `buildCheckoutParams`：USD、buyerEmail trim+lowercase、`language:'zh-Hans'`、`includePaymentMethods:['card']']`、metadata{userId,sku}（全字符串）、orderMerchantExternalId、successUrl=`<origin>/checkout/success?ref=<单号>`（非环回强制 https，localhost http 放行）→ 返 `{checkoutUrl,sessionId,ref}`；捕获 `WaffoPancakeError`（4xx→400 不重试，5xx→502）；配置缺失/非 https → 503。

### §5.3 POST /api/webhooks/waffo ✓（核心）

- `await request.text()` 取原文（断言禁止 request.json()）→ `x-waffo-signature` → `verifyWaffoEvent`（失败 401）。
- **选择直接 await 落库、不用 after()**：落库只有两条快速 INSERT（远小于官方 10s 窗口），且 DB 故障时必须返 5xx 触发 Waffo 重试；先回 200 再后台失败会永久丢事件。
- 幂等：**(a) 辅 + (b) 主，全程无先查后写**——先插 processed_webhooks（PG 23505 即 duplicate），再插 payments（transaction_id UNIQUE，23505 即 payment_conflict）。
- order.completed 写入口径与任务书逐字一致：`amount=Number(chargedAmount)`、single、**card**、paid、`transaction_id=paymentId`（要求 PAY_ 前缀，MOCK_ 拒）、order_merchant_external_id、paid_at=paymentDate||now、**chart_id 固定 NULL**。
- metadata 缺 userId 时从 MC- 单号兜底；两边都拿不到 → console.error「★需人工补单」并返 200（不抛错触发无意义重试）；金额/单号异常同策略。
- subscription.* / refund.* / 未知事件全部分支只记日志返 200；§3.4 两个陷阱（activated+payment_succeeded 双发；canceling 不撤销/canceled 才撤销；refund.failed 不撤销）写在 waffo-events.ts 注释里供下轮订阅实现者读。
  - 范围说明：processed_webhooks 目前只为 order.completed 留痕；非购买事件不入表（日志足够，且避免污染去重表）。

### §5.4 POST /api/verify-payment ✓

解析 MC 单号中的 userId 比对登录态（解析不出/不属于本人 → **403**，且不发起任何查询）→ 先按 `order_merchant_external_id` 本地快路径（断言证明命中时一次远端都不调；不用 transaction_id 查）→ 无则 SDK `graphql.query` 反查 payments(filter orderMerchantExternalId eq) → succeeded 补写（**带 order_merchant_external_id**，user_id 以登录态为准不信远端 metadata）→ 返最新权益（ownedSkus/memberSkus）。

### §5.5 / §5.6 / §5.7 前端 ✓

- `src/components/CheckoutButton.tsx`（新 client 组件，pricing 是服务端组件）：未登录跳 /auth；未配置 productId 渲染灰色「即将推出」；成功后 sessionStorage 存 ref + `window.location.href=checkoutUrl`。
- pricing 命书卡 CTA 改购买按钮（保留「查看命书详情」小链接，/mingshu 在命盘页也有入口未孤立）；**会员卡三元分支一字未动**。
- `src/app/checkout/success/`：URL `?ref=` 为主、sessionStorage 仅补充；每 2 秒 ×15 次轮询 /api/entitlements（**按 ownedSkus 判，不看 ENFORCE=false 时恒真的 canView**）→ 再调 verify-payment → 终态文案含业务单号 + hello@mingcharts.com + 10 分钟 + 返回首页/价格页链接；另有 no_ref / no_login 两态。useSearchParams 包 Suspense。
- 门户链接放在 `/reports`（我的报告，登录后账户区）：「管理订阅（订阅功能开放后可用）」→ `https://pancake.waffo.ai/consumer/portal/login`，新标签页。

### §九 验收脚本与牙口 ✓

`scripts/test-waffo-accept.mjs`（verify 第 20 段），六组 60+ 断言，全部真调生产纯函数/真 SDK：
1. 配置与源码结构（env/schema/raw body/无 NEXT_PUBLIC 私钥/无硬编码 PROD_/禁先查后写/成功页参数/门户）；
2. **真密码学验签**：node:crypto 生成 RSA-2048，用真 SDK `verifyWebhook`：合法通过、篡改 body 拒、伪造签名拒、±40min 通过、±50min 拒（容差取生产导出常量）。平台内置公钥对应的私钥不在我方手里，「密钥身份」只能联调用 Waffo 真实投递证明（见缺项）；
3. handleWaffoEvent 幂等真调（内存仓储镜像两个唯一约束）：同事件两次一条、不同事件同 PAY_ 冲突、metadata 兜底、无用户/坏金额/MOCK_ 不落账、订阅事件不写；
4. 真 `entitlementsFromRows`：PAY_ 授予 fatebook、MOCK_ 不授予、按业务单号查回；
5. reconcilePayment：快路径不调远端、越权/坏单 403、远端 succeeded 补写含单号且 user_id 以登录态为准、二次走快路径、null→pending；GraphQL normalize 容错；
6. buildCheckoutParams 全字段 + https 强制 + localhost 例外；SKU 映射当前为空。

**牙口实测（文本不变、行为变坏，注入后均已复原）：**
- A：`markEventProcessed(eventType, eventId)` → `eventId + '-x'`：断言「去重键必须是真实 (eventType,eventId) 原值」**精确翻红**（官方重投的真 eventId 永远撞不上污染键，去重表形同虚设）；
- B：`buildPaidPaymentRow` 删掉 `order_merchant_external_id`：断言「order_merchant_external_id 已写入」**翻红**（verify-payment 补写在另一代码路径，由⑤的补写断言独立守护）。

### 与既有守卫的兼容

- `test-entitlement-accept.mjs` ③「payments 零写入」架构断言：从「全 src 0 处」升级为**白名单**制，唯一合规写入者 `src/lib/waffo-repo.ts`（该断言本来就是为「将来支付回调」预留的）。
- `test-site-audit.mjs`：client 成功页补了**同级** `success/layout.tsx`（项目既有约定：client 页 metadata 由同级 layout 提供）。

---

## 三、原始日志（关键节点摘录）

牙口 A 注入时：
```
  ✗ 去重键必须是真实 (eventType,eventId) 原值
EXIT=1
```
牙口 B 注入时：
```
  ✗ order_merchant_external_id 已写入
EXIT=1
```
复原后 test-waffo-accept：60+ 断言全 ✓，`✅ test-waffo-accept 全部通过`。

最终：
```
npm run verify  → 21 段脚本全部 PASS，EXIT=0
npm run build   → /checkout/success 等路由正常产出，EXIT=0
```

---

## 四、缺项（本轮做不了，均在用户侧）

1. **env 密钥**：`.env.local` 与 Vercel 后台填 WAFFO_MERCHANT_ID / WAFFO_PRIVATE_KEY / WAFFO_STORE_ID / NEXT_PUBLIC_APP_URL（隧道或正式 https 域名）。
2. **Supabase 跑迁移**：执行 `supabase/schema.sql` 文件末「Waffo 支付集成迁移」段；跑第 3 条 UNIQUE 前先按注释里的查重 SQL 确认无重复 transaction_id（历史 MOCK_ 撞号需人工清理）。
3. **建商品拿 productId**：Dashboard 建 29.99 USD 一次性商品（PROD_xxx）→ 在 `src/lib/waffo-products.ts` 的 WAFFO_PRODUCTS 登记 fatebook（不是填 env，见待拍板 1）。
4. **外网隧道**：cloudflared 或 ngrok 的 https 地址（**禁 localtunnel**，剥签名头），并把 `/api/webhooks/waffo` 登记到 Dashboard。
5. **真实联调四连**（建议全部留痕后再开 ENFORCE）：
   - 测试卡 `4576 7500 0000 0110` 成功付款 → webhook 到达、payments 落账、成功页解锁；
   - 测试卡 `4576 7500 0000 0220` 拒付 → 不产生 paid 行；
   - 保存一份真实 webhook payload + 头（证明内置公钥验签身份，补离线断言覆盖不到的一环）；
   - 删掉该 payments 行后访问/触发 verify-payment → GraphQL 反查补回（**GraphQL 字段名以此处真实响应为准校正**，`normalizeGraphqlPayment` 已做候选名容错：paymentId/id、chargedAmount/amount、paymentDate/createdAt）。

---

## 五、待拍板

1. **productId 登记位置**：当前设计是登记在 `WAFFO_PRODUCTS` 映射（代码内、公开无密钥），任务书曾提 env 方案——映射可静态分析（购买按钮 SSR 即知是否开放）、且不泄露任何密钥，建议维持；请确认。
2. **storeId 透传**：SDK 0.25.0 的 `.d.ts` 中 `CreateCheckoutSessionParams` **无 storeId 字段**，但运行时 create-session 原样透传且同包资源校验 STO_ 前缀（productId 已可推导店铺，storeId 技术上可选）。我按任务书用扩展类型显式传了 storeId；若联调被 API 拒绝，删掉该字段即可（一行）。
3. **未来时钟窗**：SDK 默认 futureToleranceMs 仅 60 秒，任务书要求 ±45min，已把生产验签改为**对称 ±45 分钟**（tolerance 与 futureTolerance 同值，仍有界）。
4. **无主事件告警**：缺用户归属/异常载荷目前只 console.error + 返 200，靠平台日志人工补单；是否要接邮件/IM 告警，下轮定。
5. **流月任务遗留三项**（B8 年度运维清单、公历 1 月年界语义、支付待密钥）仍挂在 `docs/交接记录/20-判词封顶分级/HANDOFF-BACK-流月索引修复.md`，与本任务无冲突。

---

## 六、文件清单

新增：
- `src/lib/waffo.ts`（SDK 单例/env 校验/验签/buildCheckoutParams，仅服务端）
- `src/lib/waffo-products.ts`（SKU→productId 映射、门户 URL，同构）
- `src/lib/waffo-events.ts`（单号、事件处理、对账、GraphQL 归一化：纯逻辑）
- `src/lib/waffo-repo.ts`（Supabase 仓储，23505 幂等）
- `src/app/api/checkout/route.ts`
- `src/app/api/webhooks/waffo/route.ts`
- `src/app/api/verify-payment/route.ts`
- `src/app/api/entitlements/route.ts`
- `src/components/CheckoutButton.tsx`
- `src/app/checkout/success/page.tsx`、`src/app/checkout/success/layout.tsx`
- `scripts/test-waffo-accept.mjs`
- 本回执

修改：
- `supabase/schema.sql`（建表段 + 旧库迁移段：card/单号列/UNIQUE/processed_webhooks）
- `.env.example`（4 个 Waffo 变量）
- `src/app/pricing/page.tsx`（命书卡接 CheckoutButton；会员卡不动）
- `src/app/reports/page.tsx`（门户链接卡片）
- `scripts/test-entitlement-accept.mjs`（payments 写入断言改白名单制）
- `package.json`（verify 增第 20 段）/ `package-lock.json`（SDK 0.25.0）
