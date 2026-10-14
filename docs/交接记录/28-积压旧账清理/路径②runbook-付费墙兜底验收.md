# 路径② 验收 runbook：付费墙兜底（删 payments 行 → verify-payment 补回）

> **致**：项目方（本人操作 ✗ 15–25 分钟）
> **发自**：DeepSeek 侧（A 侧）
> **日期**：2026-10-14
> **依据**：26 号 `HANDOFF-付费墙启用前验收.md` §四（路径②）· 上线检查清单 D4 / H5
> **★★ 这是「能不能开始收真钱」的最后一道未验的关** —— 做完它，付费墙才允许开
>
> ## 为什么必须做（★ 一句话 ✓）
> ```
> ★★★★★ 【webhook 会丢】**（Waffo 侧 3 次重试失败后【无手动重发】✓
>   —— ★ 若丢了而【没有兜底】✗ 用户【付了钱却拿不到命书】✗ 这是最坏的故障 ✓
>   —— ★★ `verify-payment` 就是那条兜底：成功页轮询 30 秒无果后 ✗
>      【自动向 Waffo 反查这笔支付并补写 payments 行**✓
> ★★★★ 而这条路径【至今【从未端到端跑通过**✗：
>    · D4 那次删了行页面【仍显示解锁】⇒ 真相是【付费墙压根没开过】（ENFORCE=false 时 canView 恒 true ✓
>    · 26 号在【本地】验完了 ENFORCE=true 的拦截/放行 ✗ 【唯独】路径② 需要真实 Waffo 反查 ⇒ 只能在这做 ✓
> ```

---

# 〇、先读五条（★ 每条都能让本次实验作废 ✓）

```
① ★★★★★ 【绝不【在生产环境设 `ENTITLEMENT_ENFORCE`】**✗✗
   —— 一旦设了 ✗ 【所有现有内测用户【立刻被挡在付费墙外】✓
   —— ★★ 且 `membership/route.ts` 也读这个常量 ⇒ ENFORCE=true 会让会员通道返回
      501 `PAYMENT_NOT_READY` ✓
   ⇒ ★★★ 【只在 Preview 环境设**✗ 用完【立刻删掉**✓（§六 收尾必做 ✓）

② ★★★ 【`ENTITLEMENT_ENFORCE` 必须走【服务端】**✗
   —— 代码是 `process.env.ENTITLEMENT_ENFORCE === 'true'`（`entitlement.ts:22`）
   —— ❌ 【不得加 `NEXT_PUBLIC_` 前缀**（那会把开关塞进客户端 bundle ✗ 且守护断言①会翻红 ✓
   ⇒ 在 Vercel 里【不要勾 Preview→Production 的继承】✗ ISR/客户端变量别碰 ✓

③ ★★★★★ 【第 4 步的"权益真的消失了"是本次实验的【唯一有效性闸口】**✓
   —— 若删行后权益【仍然可见】⇒ ENFORCE 没生效 ⇒ 【后面全部是假验 ✗ 立刻停！**
   —— ★ 这正是 D4 那次踩的坑（删了行、页面还解锁 ✗ 却以为"兜底成功" ✓
   ⇒ 【不要因为"页面显示解锁"就判定通过**✗ 必须【先看到它上锁】**✓

④ ★★★★ 【ENFORCE 只关【命书按盘判定】那一条**✗
   —— `canViewFatebookForChart` 在 ENFORCE=false 时 `return true`（不查库 ✓
   —— ❌ 因此【不能】用"年运/合婚等其它功能"来判断 ENFORCE 是否生效 ✓
     （那些走 `canView` ✗ 语义不同 ✓ 认准 `/api/entitlements` 的 `canViewFatebook` ✓

⑤ ★★★ 【别删错库**✗ Supabase 项目是【PRODUCTION】**（`zvqjimyhusioyulhjjz` ✓
   —— 删的是【你自己这次测试刚产生的【那一行】✗ 用 `transaction_id = 'PAY_…'` 精确定位 ✓
   —— ❌ 【绝不要】`DELETE FROM payments WHERE ...` 不带 WHERE ✗ 也不要按用户批量删 ✓
```

---

# 一、前置检查（★ 5 分钟 ✗ 缺一项就别往下走 ✓）

## 1.1 Preview 环境必须有 Waffo 四件套（★ 否则 verify-payment 直接 500 ✓）

`verify-payment` 要反查 Waffo ⇒ 会实例化 Waffo 客户端 ✗ 而它**缺任一项即抛错**（`waffo.ts:37-51`）：

- [ ] 1.1-1 Vercel → Settings → Environment Variables：确认这几项在 **Preview** 环境存在
      `WAFFO_MERCHANT_ID` · `WAFFO_PRIVATE_KEY` · `WAFFO_STORE_ID` · `NEXT_PUBLIC_APP_URL`
      `NEXT_PUBLIC_SUPABASE_URL` · `NEXT_PUBLIC_SUPABASE_ANON_KEY` · `SUPABASE_SERVICE_ROLE_KEY`
      ★ 以及 `AI_API_KEY` / `AI_BASE_URL` / `AI_MODEL`（命书生成要用 ✓
- [ ] 1.1-2 ★★★ 确认 Preview 里【没有】`HTTPS_PROXY` / `HTTP_PROXY`
      （★ 设了 ⇒ Preview 全线 ECONNREFUSED ✗ 与生产那次故障同源 ✓

## 1.2 创建 Preview 部署（★ 不开 Production 的开关 ✓）

- [ ] 1.2-1 在 Vercel 给 **Preview** 环境加一条：`ENTITLEMENT_ENFORCE = true`
      （★ 只勾 Preview ✗ **不要**勾 Production ✗ 不要 Encrypt 之外的额外处理 ✓）
- [ ] 1.2-2 触发一次 Preview 部署（推一个 commit 到分支 / 或在 Deployments 里 Redeploy ✓）
- [ ] 1.2-3 ★ 记下 Preview URL：`https://________________.vercel.app`
      （★ 注意：**本机直连 `*.vercel.app` 不通** ✗ 需代理 `http://127.0.0.1:7897` ✓
       或直接用你能打开它的那条路径 ✗ 但【不要】用 www.mingcharts.com 测这一步 ✓）

## 1.3 ★★ 加 Preview URL 到 Supabase Redirect 白名单（★ 否则登录/回跳会失败 ✓）

- [ ] 1.3-1 Supabase → Auth → **URL Configuration** → Redirect URLs 里加
      `https://<上面那个>.vercel.app/reset-password`（可选 ✓
      ★ 更重要：确认 **Site URL / allowlist 覆盖到你实际访问的域** ✗
        否则登录跳转或成功页 `?ref=` 回跳可能落到别处 ✓

## 1.4 基线与素材

- [ ] 1.4-1 准备一个【测试账号】✗ 并在 Preview 站点上**登录**它
- [ ] 1.4-2 该账号下【先做一份命盘】（命书按盘判定需要 `chart_id` ✓
      —— ★ 否则 `canViewFatebookForChart` 因 `!chartId` 恒 false ✗ 会让第 4 步的"上锁"失去信息量 ✓
- [ ] 1.4-3 测试卡号：`4576 7500 0000 0110`（★ 成功卡 ✗ 记录在 26 号文档 ✓

---

# 二、第 1 步：★★★ 先证明 ENFORCE 真的生效（正面控制 ✗ 不可跳 ✓）

```
★★★★★ 这一步【不是形式**✗ 它是【整个实验的"牙口"**（§8.6.7 ✓
   —— 若不做它 ✗ 你无法区分【"兜底补回成功"】与【"付费墙根本没开、本来就能看"】✓
```

- [ ] 2-1 在 Preview 站点上，用【未购买命书】的测试账号访问命书页
      ⇒ 期望：**被拦住**（要求购买 / 看不到 AI 全文 ✓
- [ ] 2-2 用 API 直接看判定值（最硬的证据）：

```
POST https://<preview>.vercel.app/api/entitlements
Headers: Authorization: Bearer <该用户的 access_token>
Body:    { "chartId": "<该命盘 id>" }

★ 期望：canViewFatebook = false（且 ownedSkus 不含 fatebook ✓
```

**记录**：`canViewFatebook（购买前）= ________`

> ★★★ 若这里已经是 `true` ⇒ ENFORCE **没生效** ⇒ **停下**，回到 1.2 检查
> （★ 常见原因：只改了 Production / 没重新部署 / 环境变量填成了 `"true"` 带引号之类 ✓

---

# 三、第 2 步：买一次（★ 用测试卡 ✗ 记录素材 ✓）

- [ ] 3-1 在 Preview 站点用测试卡买【命书 $29.99】✗ 走完收银台
- [ ] 3-2 成功页显示解锁 ✓（这一步走的是 webhook 快路径 ✗ 预期正常 ✓
- [ ] 3-3 ★★★★★ **立刻记录两样素材（★ 必须在删行【之前】记 ✗ 否则再也拿不到 ✓）**：

| 素材 | 从哪拿 | 值 |
|---|---|---|
| `order_merchant_external_id`（业务单号） | 成功页 URL 的 `?ref=` ✗ 形如 `MC-…-…` | ________________ |
| `transaction_id`（渠道单号） | Supabase `payments` 行 ✗ 形如 `PAY_…` | ________________ |

```
★★ 拿单号的 SQL（Supabase → SQL Editor）：
   SELECT id, transaction_id, order_merchant_external_id, status, amount, chart_id, user_id, paid_at
   FROM payments
   WHERE user_id = '<测试账号 uuid>'
   ORDER BY created_at DESC LIMIT 5;

★★★ 单号结构（`waffo-events.ts:11-25` ✗ 供你识别与兜底）：
   MC-<userId(uuid)>-<13位毫秒时间戳>      共 54 字符
   ★★ 若你漏记了 ?ref= ✗ 仍可从 payments 行的 order_merchant_external_id 反查 ✓
      —— 但【行一旦被删就没了】⇒ 【先记下来**✓
```

- [ ] 3-4 顺手确认：这一行的 `chart_id` 是【你这个账号的真实命盘 id】（不是 NULL ✓
      ★ 若为 NULL ✗ 说明归属校验没绑上 ✗ 记下来（不影响本实验 ✗ 但影响按盘判定 ✓

---

# 四、第 3 步：删行 → ★★★★★ 先确认「真的锁上了」

- [ ] 4-1 精确删除【这一行】（★ 用渠道单号定位 ✗ 最安全 ✓）：

```sql
-- ★ 先 SELECT 确认命中 1 行，再 DELETE（两步走，别一键执行）
SELECT count(*) FROM payments WHERE transaction_id = 'PAY_你记下的';

DELETE FROM payments WHERE transaction_id = 'PAY_你记下的';
```

- [ ] 4-2 确认删除生效（★ 不要跳过 ✗ 幂等 DDL/SQL 的"成功"不等于生效 ✓）：

```sql
SELECT count(*) FROM payments WHERE transaction_id = 'PAY_你记下的';   -- 期望 0
```

- [ ] 4-3 ★★★★★ **再查权益 —— 这是本次实验的有效性闸口**：

```
POST /api/entitlements  { token, chartId }
⇒ ★ 期望：canViewFatebook = **false**（与 §二 的 false 一致 ✓
⇒ ★★ 顺手刷新命书页：也应【被拦住】**✓
```

**记录**：`canViewFatebook（删行后）= ________`

> ★★★★★ **若这里仍然是 `true` ⇒ 【立刻停止】**✗ 不要继续第 5 步 ✓
> · 含义：ENFORCE 在**这个环境/这次请求**上没生效 ⇒ 后面的"解锁"毫无意义 ✓
> · 排查：① Preview 的 env 是否真的加了 ② 是否重新部署过 ③ 你访问的是不是 Preview 域名
>   （★ 很可能你打开的是 `www.mingcharts.com` ✗ 那是生产 ✗ 生产本来就不该开 ✓
> · ★ 这一步通过后 ✗ 【才】允许继续 ✓

---

# 五、第 4 步：打开成功页，等它自己去兜底（★ 核心观测 ✓）

## 5.1 操作

- [ ] 5-1 在**同一个浏览器、同一登录态**下打开：

```
https://<preview>.vercel.app/checkout/success?ref=MC-你记下的业务单号
★ ★★ 注意：必须带 ?ref= ✗ 且必须是【刚删过行的那个业务单号】✓
```

- [ ] 5-2 **盯着页面 40–60 秒**✗ 不要关 ✗ 不要刷新（★ 刷新会重跑一遍 ✗ 掩盖首次行为 ✓
      页面会依次经历：`polling`（约 30 秒 ⇒ `verifying`（调 verify-payment）⇒ `unlocked` / `pending`

```
★ 时限依据（代码实测）：
   · 前端 每 2 秒轮询一次 ✗ 最多 15 次 ⇒ 约 30 秒（success/page.tsx:17-18 ✓
   · 30 秒内查不到 ⇒ 调 /api/verify-payment ⇒ 再等一次网络往返（几秒 ✓
   ⇒ 【35–40 秒是合理的观察窗**✗ 网络慢时给到 60 秒 ✓
```

## 5.2 ★★★★★ 双证据判定（★ 页面 ＋ 库 ✗ 缺一不可 ✓）

| # | 证据 | 期望 | 实际 |
|---|---|---|---|
| A | 页面最终状态 | 出现「**支付成功，命书已解锁**」（`unlocked` ✓ | ______ |
| B | `payments` 行是否回来 | 重新出现【1 行】✗ 同 `transaction_id` ✓ | ______ |
| C | 该行关键字段 | `status='paid'` ✗ `order_merchant_external_id` = 同一个业务单号 ✓ | ______ |
| D | 权益是否恢复 | `POST /api/entitlements` ⇒ `canViewFatebook` **= true** ✓ | ______ |

```sql
-- B/C 的取证 SQL（★ 注意 id 会变 ✗ transaction_id 不变 ✓）
SELECT id, transaction_id, order_merchant_external_id, status, amount, chart_id, paid_at
FROM payments
WHERE order_merchant_external_id = 'MC-你记下的业务单号';
```

```
★★★★★ 为什么【B 和 D 都要看】：
   · 只看 A（页面解锁）⇒ 分不清"补写成功"与"前端文案骗人"✓
   · 只看 B（行回来）⇒ 分不清"补写成功"与"快路径读到旧行"✓
   · ★ 只有【行是新插入的（id 变了 ✗ paid_at 为本次）＋ 权益由 false 翻回 true】
     ⇒ 才构成【"兜底补回"的完整证据链**✓✓
★★ 补充一条更硬的差异（可选 ✗ 若你愿意多做一步 ✓）：
   · 删行【之前】先记下原行的 id ✗ 补回后 id 应【不同】（因为是 INSERT 新行 ✓
   · ★ 相同 ⇒ 说明你其实没删掉 / 或看的是缓存 ✗ 值得复查 ✓
```

---

# 六、第 5 步：收尾（★ 不做这一步 = 埋雷 ✓）

```
★★★★★ 【必须立刻做**✗ 顺序别颠倒 ✓
```

- [ ] 6-1 Vercel → Settings → Environment Variables → **删除** Preview 的 `ENTITLEMENT_ENFORCE`
- [ ] 6-2 ★★★ 确认 **Production 环境【从未】有过** `ENTITLEMENT_ENFORCE`
      （★ 顺手再看一眼：生产是否仍无 `HTTPS_PROXY` / `HTTP_PROXY` ✓
- [ ] 6-3 重新部署一次 Preview（或等下次预览）✗ 使删除生效
- [ ] 6-4 ★ 复验生产：`https://www.mingcharts.com` 打开正常 ✗ 命书页【不再被挡】（内测态 ✓
      —— ★ 若生产把用户挡在付费墙外 ✗ 【立刻回滚**✗ 这是最严重的上线事故 ✓
- [ ] 6-5 ★★★ Supabase 里核一遍：本次测试【只】留下 1 行服务端补写的 payments
      （★ 若你手动插过测试行 ✗ 记得清理 ✗ 别留脏数据 ✓
- [ ] 6-6 ★ 把本次结果回写 H5（清单）与 26 号目录的回执 ✓

---

# 七、失败时的排查（★ 本环节【就是】设计来收集真实字段名的 ✓）

## 7.1 先看日志（★ Vercel → Logs → Runtime Logs ✓）

```
★ 按这两条前缀搜**✗ 代码已埋好（`verify-payment/route.ts:57/63/93` ✓：
   `[verify-payment] GraphQL errors:`        ← ★ 查询本身被 Waffo 拒绝（字段名/权限 ✓
   `[verify-payment] GraphQL 反查失败:`       ← 网络/鉴权层失败 ✓
   `[verify-payment] 对账失败:`               ← 落库或解析异常 ✓
★★ 把【原文贴进回执**✗ 不要只写"失败了" ✓
```

## 7.2 按现象定位

| 现象 | 最可能原因 | 处理 |
|---|---|---|
| 页面停在 `pending`（付款已完成，正在处理中） | 反查没拿到 `succeeded` 节点，或 `transaction_id` 不以 `PAY_` 开头 | ★ 看 7.1 日志 ⇒ 多半是 GraphQL 字段名 ✗ 见 7.3 |
| 页面直接 403「订单号无效」 | 业务单号里的 userId ≠ 当前登录用户 | ★ 核对 `?ref=` 是否属于【当前登录的这个账号】✗ 换对账号或换对单号 ✓ |
| 401「登录无效」 | Preview 域下没有登录态（★ 换域后 session 不通 ✓ | ★ 在 Preview 域上重新登录一次 ✓ |
| 500「对账失败」 | Waffo 配置缺项 / `NEXT_PUBLIC_APP_URL` 缺失 | ★ 回 §1.1 逐项核 ✓ |
| 页面解锁了，但库里【没有】新行 | ★ 说明是【快路径命中】（行没真删掉 ✓ | ★ 重查 `SELECT count(*)` ✗ 回到 §四-4-2 ✓ |
| 页面没解锁，但库里【有】新行 | 补写成功、前端未刷新到 | ★ 硬刷新页面 ⇒ 应变 `unlocked` ✓ |

## 7.3 ★★ 若确认是 GraphQL 字段名不匹配（★ 最可能的一种 ✓）

```
★ 查询语句在 `src/app/api/verify-payment/route.ts:12-23`：
   payments(filter: { orderMerchantExternalId: { eq: $ref } }) {
     id status paymentId chargedAmount paymentDate orderMerchantExternalId
   }
★★ `normalizeGraphqlPayment`（`waffo-events.ts:248+`）已做候选名容错：
   status / paymentId|id / chargedAmount|amount / paymentDate|createdAt / orderMetadata|metadata
★★★ 修法（★ 交 TraeCode ✗ 不要现场手改生产代码 ✓：
   · 按 Waffo 真实响应的字段名 ✗ 校正【这一处】查询或容错映射 ✓
   · ★ 单一事实源：字段名只在 `verify-payment/route.ts` 与 `waffo-events.ts` 各一处 ✓
   · ★ 改完【跑 `npm run verify`】＋ 在 Preview 重跑本 runbook 第 4–5 步 ✓
```

---

# 八、记录区（★ 回写 H5 / 26 号回执用 ✓）

```
Preview URL：______________________________________
ENFORCE 生效证据（canViewFatebook）：
   购买前 ______ ｜ 删行后 ______ ｜ 补回后 ______
素材：业务单号 MC-____________________ ｜ 渠道单号 PAY_____________________
原行 id：________________  补回行 id：________________（★ 应不同 ✓
页面最终状态：☐ unlocked  ☐ pending  ☐ 其它 ______
库证据：补回行 status ______ ｜ order_merchant_external_id 是否一致 ☐是 ☐否
失败时的日志原文：
    ________________________________________________
收尾：☐ Preview env 已删  ☐ Production 从未设  ☐ 生产复验正常  ☐ 脏数据已清
遗留问题：______________________________________________________
```

---

# 九、一句话

> **★★★★★ 这条路径的价值在于：它是【唯一】【用真实 Waffo 反查】**验证"钱付了、行丢了、还能补回来"的场合 ✓
>
> **★★★ 但它的结论【只有在"先看到锁上"时才有意义**✗：
> **删行后 `canViewFatebook` 必须变 `false`**✗ 否则你验的是"本来就能看" ✗ —— **D4 那次就是这么被误导的**✓
>
> **★★ 通过的标准是【双证据】**：**页面显示已解锁** ＋ **库里真的多了一行（id 变了）**✓
>
> **★★★★ 而做完【必须立刻删掉 Preview 的 `ENTITLEMENT_ENFORCE`】**✗
> **—— 它是唯一一个「配错就锁死所有付费用户」的开关 ✓（生产【永远不设】✓**
