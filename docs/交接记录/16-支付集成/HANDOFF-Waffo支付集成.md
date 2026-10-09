# 任务交接书：Waffo 支付集成（测试模式）

> **交接对象**：TraeCode
> **纪律基准**：`docs/验收标准与红线.md`（**先读 §8.5.1 / §8.6 / §8.6.7**）
> **前置**：`HANDOFF-打通entitlement链路.md`（**已完成并复核** —— 本任务正好接上它预留的位置）
> **本任务书自包含。** 我方已取全 Waffo 官方文档并逐条核实，出处见 §三。

---

# 〇、先读八条

1. **★★★ 本任务是【路线 B 的第 ④ 步】**：支付集成先在**测试模式**跑通，
   不提交审核、不开 `ENTITLEMENT_ENFORCE`。生产环境要等 KYB 过审。

2. **★★★★ 本任务的真正价值，是把「账」接上**：
   我们上一轮已经把 `entitlement.ts` 打通 —— 当时的问题是
   **`payments` 表里只有 `MOCK_` 假流水，而 `getEntitlements` 会把它当真购买** ✗。
   本任务的 `order.completed` 处理器**就是那个"唯一被允许写 payments 的支付回调"** ✓
   —— 它写入**真实的 Waffo 流水号**，于是 `getEntitlements` 终于读到真实数据 ✓

3. **❌ 本轮不做**（写清边界，免得顺手做）：
   - 不打开 `ENTITLEMENT_ENFORCE`（仍是 `false`）
   - 不做订阅（订阅产品与订阅事件留到会员上线那一轮）
   - 不提交 KYB、不动 `Business Details`
   - 不改法律文本、不动 `/pricing` 的「即将推出」

4. **★★ 必须用 API Key 鉴权，不能用 Store Slug** ✗
   官方原文：Store Slug「does not support … `metadata`, `orderMerchantExternalId` …
   **These fields are silently ignored to prevent price tampering**」——
   而**这两个字段正是把订单绑定到我们用户的唯一桥梁** ✓

5. **★★★ 验签有三个坑，每一个都会让上线后静默失败**（详见 §3.3）：
   **必须用 raw body** · **时间容差是 45 分钟不是 5 分钟** · **必须按 `mode` 选对应公钥**。

6. **★★★ 幂等是硬要求**。官方原文：
   > "Events may be sent more than once — **make your processing idempotent**."
   **幂等键用 `eventType` + `eventId`**（官方说该组合在系统内有唯一约束）✓

7. **★★★ 不能假设 webhook 一定到达**。官方原文：
   > 最多 3 次重试（共 4 次尝试），失败标记 `failed`，**there is no manual resend**。
   → 所以**必须做兜底对账**（§5.4）—— 否则会出现**用户付了钱却拿不到报告** ✗

8. **★ 断言写法**：凡断言对象是"某个函数/路由的行为"，就必须**真的调用它**；
   牙口必须用**文本不变、行为变坏**的注入；注入前先确认注入有效（§8.6.7）。

---

# 一、目标与范围

## 1.1 交付什么

```
一条能跑通的测试模式购买链路：
  用户在 /pricing 点「购买命书」→ 跳转 Waffo 托管结账页
  → 用测试卡付款 → 回到我们的成功页 → 报告解锁

以及支撑它的四件东西：
  ① SDK 客户端封装
  ② 创建结账会话的 API
  ③ Webhook 处理器（验签 + 幂等 + 写 payments）
  ④ 兜底对账 API（webhook 丢失时补救）
```

## 1.2 不交付什么

```
✗ 订阅（订阅产品 / subscription.* 事件）
✗ 退款流程（refund.* 事件的撤销逻辑，本轮只在处理器里留分支与日志）
✗ 生产环境切换
✗ ENFORCE 打开
```

---

# 二、完整流程

```
【用户侧】
1. 用户在 /pricing 点「购买命书 $29.99」
2. 前端 POST /api/checkout  { sku: 'fatebook' }
3. 后端 client.checkout.createSession({
     storeId, productId, currency: 'USD',
     ★ metadata:               { userId, sku },
     ★ orderMerchantExternalId: 'MC-<userId前8位>-<时间戳>',   ← 我们自己的业务号
     ★ includePaymentMethods:  ['card'],       ← 限制类目只支持卡
     buyerEmail, language: 'zh-Hans',
     successUrl: 'https://mingcharts.com/checkout/success'
   })
4. 返回 { checkoutUrl } → 前端 window.location.href = checkoutUrl
5. 用户在 Waffo 托管页用测试卡付款
6. 付款后用户【需要手动点 Done】才回到 successUrl（★ 官方：没有自动跳转）
7. 成功页：轮询 + 兜底查询（§5.6）

【服务端侧】
8. Waffo → POST /api/webhooks/waffo
   · 验签（raw body + 45 分钟容差 + 按 mode 选公钥）
   · 幂等检查（eventType + eventId）
   · order.completed → ★ 写 payments（真实 transaction_id）→ 用户的报告解锁
```

**★★★ 两条时间线不同步，这是设计的关键**：
官方原文：
> "Treat the event — not the checkout redirect — as the point where money is confirmed.
> A buyer can close the browser before the redirect; the event still arrives."

→ 所以**成功页不能假设付款已确认**，必须**等 webhook 落地**或**主动查询** ✓

---

# 三、依据：Waffo 官方文档（我方已核实，出处在此，你不必再查）

## 3.1 端点与鉴权

| 项 | 值 |
|---|---|
| 创建会话 | `POST /v1/actions/checkout/create-session` |
| SDK | `npm install @waffo/pancake-ts` |
| 鉴权 | **API Key**（`X-Merchant-Id` + `X-Timestamp` + `X-Signature`；SDK 自动签名）<br>✗ 不用 Store Slug（见 §〇-4） |
| 环境头 | `X-Context-Environment: test` / `prod` |
| 出处 | `docs.waffo.ai/api-reference/endpoints/orders/create-checkout-session.md` · `docs.waffo.ai/integrate/nextjs.md` |

## 3.2 创建会话的关键参数

```
productId   必填  'PROD_xxx'（Short ID）
currency    必填  'USD'
  ★ 一次性支付支持的币种：USD · EUR · GBP · HKD · JPY · CNY
  ★ 订阅支持的币种：USD · EUR · GBP · HKD · JPY（无 CNY）
storeId     必填  'STO_xxx'
★ metadata              自定义键值对，附加到会话 → webhook 里读 data.orderMetadata
★ orderMerchantExternalId 你的业务侧订单号（≤128 字符）
   ★★★ 它在 webhook payload 与 GraphQL 里【用同一个字段名】，
        所以"结账时写入的值可以在 Order / Payment / Refund / webhook 里按同名读回"
★ includePaymentMethods  ['card'] ← 限制类目只支持卡
   （可选值 card / applepay / googlepay / wechat；与 excludePaymentMethods 互斥）
buyerEmail  预填客户邮箱
language    ★ 支持 zh-Hans（简体中文）
successUrl  ★★ 必须是【绝对 https:// URL】✗ 相对路径会被支付通道拒绝
expiresInSeconds  默认 2700 秒（45 分钟）
darkMode    可选
```

**★★★ 两个必须知道的行为**：

```
① successUrl 不是自动跳转
   官方原文：「After paying, the buyer lands on the cashier's success page
   and is sent to this URL when they click Done — ★ there is no automatic redirect today」
   → 用户【要手动点 Done】

② ★ 没有 cancelUrl
   官方原文：「There is no cancelUrl. If the buyer closes the cashier or abandons
   payment, nothing redirects them back to your site. The session simply expires
   (45 minutes by default), the order ends canceled without a charge, and no webhook fires」
   → 所以【打开结账页的那个页面必须自带"返回"链接】
```

**★ 会话锁定**：`productVersionId / productName / priceInfo / storeName / billingPeriod /
withTrial / theme / buyerEmail / billingDetail` 在创建时锁定，后续改价不影响已有会话 ✓

**★ 邮箱归一化**：官方对所有邮箱字段做 `trim().toLowerCase()` ✓
→ **我们比对用户邮箱时要同样归一化**（否则 `Foo@Bar.COM` 与 `foo@bar.com` 会当成两个人）

**★ 错误处理**：
```
· 400 → 【绝不重试】，修请求后重提
· 5xx → 指数退避重试（官方建议 start 5s，最多 3 次）
· 403 "Store is not approved for production payments"
  → "Use the test environment, or complete KYB review"  ← 未过审时的正确处置 ✓
· 404 "Product not found or not active for this environment"
  → 产品要为该环境激活版本（test 建的产品要 Publish 到 prod）
```

## 3.3 ★★★ Webhook 验签的三个坑

**官方原文（`docs.waffo.ai/api-reference/webhooks.md`）**：

```
签名头：X-Waffo-Signature: t=<timestamp_ms>,v1=<base64 签名>
算法：  RSA-SHA256，签名输入 = `${t}.${rawBody}`

★★★ 坑一：必须用 raw body
  「You must use the raw request body for signature verification.
    If your framework parses JSON automatically, the signature check will fail.
    Ensure you capture the unmodified raw string before verification.」
  → Next.js：const body = await request.text()   ★ 不要先 request.json()

★★★★ 坑二：时间容差是【45 分钟，不是 5 分钟】
  「(Recommended) Check that t is within 45 minutes of current time. NOT 5:
    retries replay the ORIGINAL signature header — t is never re-stamped,
    and the final retry lands 31+ minutes after first delivery,
    so a 5-minute window rejects legitimate retries with 401.
    Replay protection comes from deduplicating on the payload id,
    not from tightening this window」
  → ★ 大多数实现会照搬别的支付平台的 5 分钟 ✗ —— 那会让【我们自己的重试全部 401】✗
  → ★★ 真正的重放保护靠 §5.3 的幂等 ✓

★ 坑三：必须按 payload 的 mode 选对应公钥
  「Always use the public key matching the event's mode.
    A Test key cannot verify Production events, and vice versa.」
  · Test 与 Production 是【两套固定密钥对】，平台级、所有店铺共享
  · 读法：Dashboard → Settings → Webhooks → Webhook Public Key（Test / Production 各一个）
  · ★★ 增删改 webhook URL 【不会】改变它
```

**★★ 优先用 SDK 的 `verifyWebhook()`**：

```
官方：「The SDK embeds public keys, auto-detects the environment,
      and handles format normalization」
      「no WAFFO_WEBHOOK_SECRET environment variable needed」
      「includes replay protection by default」
→ 即【SDK 会自己选对环境公钥】✓
★★ 但文档另一处又说要从 Dashboard 复制公钥 —— 两处略有出入。
   → 实现时【优先用 SDK】✓；若 SDK 报错，再退回手动验签并读取 Dashboard 的公钥 ✓
   → ★★ 无论走哪条，都要在回执里写明【实际用的是哪条路】并附实测证据 ✓
```

## 3.4 ★★★ 事件语义（含两个极易错的点）

**本轮只处理 `order.completed`**，但处理器要为订阅事件留分支与日志（§1.2）✓

### ★★★ 易错点一：订阅首次付款会同时发【两个】事件

```
官方原文：「The first payment emits two events: subscription.activated (keyed to the order)
and subscription.payment_succeeded (keyed to the charge). They are delivered independently,
so neither order nor spacing is guaranteed.
★ Provision access on activated and record the receipt on payment_succeeded —
handling both as 'a new subscriber' runs your onboarding twice.」
→ ★★★ 这是"重复授予"的经典陷阱 ✓（本轮虽不做订阅，但要在注释里留警告 ✓）
```

### ★★★ 易错点二：`subscription.canceling` ≠ `subscription.canceled`

```
官方原文：
· canceling：「Cancellation requested — active until period ends」
             「Do not revoke access.」
· canceled ：「Subscription is terminated. This is irreversible — revoke access
              or downgrade permissions.」
· ★ canceled 大约在 currentPeriodEnd 到达，不是请求取消的那一刻
→ ★★ 所以【canceling 只记录，不撤销】✓
```

### 其余事件（本轮留分支 + 日志，不实现业务）

```
order.completed              ← ★ 本轮实现
refund.succeeded             → 撤销访问（后续）
refund.failed                → 记日志，★ 不要撤销（退款未完成）
subscription.past_due        → 记录 / 通知客户
subscription.uncanceled      → 恢复访问
```

**★★ `refund.failed` 的一个细节**：
官方：「`refundedAmount`（以及废弃的 `amount`）是**尝试**退款的金额 —— do not record it as a refund」
→ **区分两个事件只能靠 `refundStatus`**（`"succeeded"` / `"failed"`）✓ 不要靠某字段是否存在 ✓

### ★ payload 里我们要用的字段

```jsonc
{
  "id": "...",                    // ★★ 幂等键的一半
  "eventType": "order.completed", // ★★ 幂等键的另一半
  "eventId": "PAY_xxx",           // order.completed 时 = Payment ID
  "storeId": "STO_xxx",
  "mode": "test",                 // ★ 决定用哪套公钥
  "data": {
    "orderId": "ORD_xxx",
    "orderStatus": "completed",
    "buyerEmail": "...",
    "currency": "USD",
    "chargedAmount": "29.00",     // ★ 实际收款额（不要用废弃的 amount）
    "listPrice": { "total": "29.00", ... },
    "productName": "...",
    "orderMetadata": { "userId": "...", "sku": "fatebook" },  // ★★★ 我们传的
    "orderMerchantExternalId": "MC-...",                      // ★★★ 我们的业务号
    "paymentId": "PAY_xxx",       // ★★★ 写进 payments.transaction_id
    "paymentStatus": "succeeded",
    "paymentMethod": "card",
    "paymentLast4": "4242",
    "paymentDate": "2026-03-10"
  }
}
```

**★★ 金额字段有废弃问题**：官方说 `amount` / `total` / `subtotal` / `taxAmount` 已废弃，
且 **`amount` 在 2026-09-21 会改语义** ✗
→ **新集成应读 `chargedAmount`（实收）与 `listPrice.total`（标价）** ✓ **不要读 `amount`** ✓

## 3.5 幂等与重试

```
【幂等】官方原文：
「The same business event (identical eventType + eventId) only creates one delivery record
 — it won't be duplicated. However, a single delivery may reach your endpoint multiple times
 due to retries.」
「Use the eventType + eventId combination (which has a unique constraint in the system)
 for deduplication」
→ ★★★ 所以幂等键 = (eventType, eventId) ✓

【重试】最多 3 次（共 4 次尝试）· 指数退避（间隔由队列决定，Waffo 不配置）
· ★ 无手动重发 ✗ · 最终 failed ✓
【响应】2xx（推荐 200）· ★ 10 秒内 · 建议先回 200 再异步处理 ✓
【★ 通用建议】官方 Best Practices：
「Handle all subscribed events — Add a branch for every event you subscribe to,
 even if you don't need it yet. ★ Return 200 for unhandled events —
 returning an error triggers unnecessary retries.」
```

## 3.6 ★★★ 客户门户 —— 加州 ARL 的自助取消是现成的

**这是我方本轮最重要的发现，直接影响你后面那一轮的工作量。**

```
官方原文（docs.waffo.ai/features/customer-portal.md）：
「Self-service portal for consumers to manage orders and subscriptions」
「Consumers log in via Magic Link — they enter their email, receive a login link,
  and click to access the portal. ★ No password required.」

门户 URL：https://pancake.waffo.ai/consumer/portal/login

★ 消费者能做：
  · Subscription Management —— 「View active subscriptions, next billing date,
    ★ change plan, CANCEL or reactivate」
  · Orders & Payments · Invoice Download（PDF，16 种语言）· Billing Details

★★★ 取消对话框：会问原因，但
  「Optional — ★ Never blocks the cancellation」
  → 这正是加州 ARL 要求的「不得阻碍」✓

★ 从自己站点链接过去：
  「You can place a Manage subscription link on your website that points to the URL above.
   The customer still signs in with their purchase email —
   ★ there is currently no API that mints a pre-authenticated portal link,
   so the link cannot skip the Magic Link step.
   A server-side endpoint for generating a signed portal link is planned.」
```

**★★★★★ 结论**：

```
加州 ARL 的「线上注册 ⇒ 线上自助取消，不得阻碍」——
【Waffo 已经做好了】✓
我们要做的只有：在账户/会员区域放一个 "Manage subscription" 链接 ✓
★ 几乎零工作量 ✓
（Next.js 官方指南给的形式：
  https://checkout.waffo.ai/your-store/portal?email=...
  ★★ 但功能文档给的是统一 URL https://pancake.waffo.ai/consumer/portal/login
  → ★ 两处不一致 ✗ —— 实现时【以功能文档的统一 URL 为准】，
    并在回执里写明你实际用的是哪个、以及实测结果 ✓）
```

---

# 四、环境变量与站外前置（**站外部分由用户做**）

## 4.1 新增环境变量

```bash
# .env.local 与 Vercel 环境变量都要加
WAFFO_MERCHANT_ID=MER_xxx
WAFFO_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE..."
WAFFO_STORE_ID=STO_xxx
NEXT_PUBLIC_APP_URL=https://mingcharts.com
```

**★ 同时更新 `.env.example`**（只写键名与占位，不写真实值 ✓）
**★★ 并确认 `.vercelignore` 与 `.gitignore` 仍排除 `.env*`** ✓（已有 ✓）

**★ SDK 支持的私钥格式**：PEM / base64 / raw 都可，**字面 `\n` 也行**（SDK 自动归一化 ✓）

## 4.2 商品要在 Waffo 后台先建（**用户做，你等他给 ID**）

```
Dashboard → Products → Create Product → 选【One-Time】
  填：Name / Price / Description / Image
  ★ 保存后产品处于 test mode（只对测试结账可见）
  ★★ 上生产前要点【Publish to Production】
产出：productId（PROD_xxx）与 storeId（STO_xxx）
★ 商品文案已备好：docs/交接记录/14-会员权益修复/商品文案-Waffo结账页.md
```

**★★★ 在拿到真实 `productId` 之前**：
**把 `productId` 做成配置映射，不要硬编码 ✗** —— 建议：

```ts
// src/lib/waffo-products.ts
// ★ SKU → Waffo productId 的映射。productId 由后台创建后填入。
// ★★ 未配置的 SKU 必须【明确报错】，不要静默失败：
//    返回「该商品尚未开放购买」而不是抛 500 或跳到错误页面。
export const WAFFO_PRODUCTS: Partial<Record<SkuId, string>> = {
  // fatebook: 'PROD_xxx',   ← 待用户提供后填入
}
```

## 4.3 Webhook 要在 Dashboard 注册（**用户做**）

```
Dashboard → Settings → Webhooks
  · Format 选【Raw】（★ 唯一带签名的格式）
  · Test Webhook URL: https://<你的测试地址>/api/webhooks/waffo
  · 事件：本轮只勾 order.completed 即可（★ 但处理器要为其他事件留分支 ✓）
  ★★ Production Webhook URL 本轮【不要填】
     官方：「Live Mode webhooks only deliver after your store passes review」
```

## 4.4 本地联调需要隧道

```
Pancake 的服务器【无法访问 http://localhost:3000】✗
→ 需要公网 HTTPS 隧道：ngrok 或 cloudflared
  ngrok http 3000     →  https://xxxx.ngrok-free.app
  ★★ 官方警告：localtunnel 会【剥掉自定义头】→ 验签永远 401 ✗ 不要用 ✓
  ★ 隧道地址每次重启都会变 → 要回 Dashboard 更新 Test Webhook URL ✓
```

---

# 五、逐文件实现

## 5.1 `src/lib/waffo.ts` —— SDK 客户端（单例）

```ts
// ★ 只在服务端使用。privateKey 绝不可进客户端 bundle。
import { WaffoPancake } from '@waffo/pancake-ts'

export const waffo = new WaffoPancake({
  merchantId: process.env.WAFFO_MERCHANT_ID!,
  privateKey: process.env.WAFFO_PRIVATE_KEY!,
})
export const WAFFO_STORE_ID = process.env.WAFFO_STORE_ID!
```

**★ 要求**：
- 若环境变量缺失，**启动时明确报错**（不要等到用户点购买才 500）✓
- **★★ 不得在文件顶部 import 任何会把 privateKey 打进客户端的模块** ✓

## 5.2 `src/app/api/checkout/route.ts`

```ts
POST { sku: SkuId }
① 验证登录（沿用现有做法：从 Authorization 头或 token 取，用 service_role 校验 ✓）
② 取该 sku 对应的 productId（来自 §4.2 的映射）
   ★ 未配置 → 返回明确错误（"该商品尚未开放购买"），不要 500
③ 生成 orderMerchantExternalId —— ★★★ 这个值必须【能从我们的库里反查回用户】
   建议：`MC-${userId}-${Date.now()}`（≤128 字符 ✓ 且含 userId ✓）
④ client.checkout.createSession({
     storeId: WAFFO_STORE_ID,
     productId,
     currency: 'USD',
     buyerEmail: <用户邮箱>,
     language: 'zh-Hans',
     ★ metadata: { userId, sku },
     ★ orderMerchantExternalId,
     ★ includePaymentMethods: ['card'],
     successUrl: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/success`,
   })
⑤ 返回 { checkoutUrl, sessionId }
```

**★★ 要求**：
- **不要在响应里返回任何密钥或内部 ID 之外的东西** ✓
- **★ 捕获 `WaffoPancakeError`**，把 `errors[0].message` 透出为可读错误 ✓
- **★★ 400 不要重试，5xx 才退避重试**（若加重试的话）✓
- **★ `successUrl` 必须是绝对 https URL** ✓（相对路径会被支付通道拒绝 ✗）

## 5.3 `src/app/api/webhooks/waffo/route.ts` —— ★★★ 本任务的核心

```ts
export async function POST(request: Request) {
  // ★★★ 第一步：拿 raw body（不要 request.json()）
  const body = await request.text()
  const signature = request.headers.get('x-waffo-signature')

  // ★★ 第二步：验签（用 SDK；它会自动选对环境的公钥）
  let event
  try {
    event = verifyWebhook(body, signature)
  } catch {
    return new Response('Invalid signature', { status: 401 })
  }

  // ★ 第三步：先回 200，再处理（官方：10 秒内响应，建议异步）
  //   ★★ Next.js 里可用 after() 或直接 await（若处理很快）—— 你判断哪种更稳并说明
  await handleEvent(event)

  return NextResponse.json({ received: true })
}
```

**`handleEvent` 的要求**：

```
① ★★★ 幂等（最要紧）
   · 用 (eventType, eventId) 去重
   · 实现方式二选一并说明理由：
     (a) 新建 processed_webhooks 表，(event_type, event_id) 唯一约束，插入冲突即忽略
     (b) 在 payments 上做唯一约束（transaction_id UNIQUE），写入冲突即忽略
   ★★ 我方倾向 (b) 为主 + (a) 为辅：
       payments.transaction_id 唯一保证【不会重复授予】
       processed_webhooks 保证【未产生权益的事件也不会重复处理】
   ★★★ 但【并发下"先查后写"是不安全的】✗ —— 必须靠【数据库唯一约束】✓

② order.completed 的处理
   · 从 event.data.orderMetadata 取 { userId, sku }
     ★ 取不到 → 【记录错误日志并返回 200】，不要抛错（抛错会触发无意义重试 ✗）
       同时在回执里说明这种情况如何处理（例如告警 / 人工补单）
   · ★★ 从 event.data.orderMerchantExternalId 也可以反查 userId（作为兜底）
   · 写 payments：
       user_id: userId,
       amount: Number(event.data.chargedAmount),   ★ 用 chargedAmount，不要用废弃的 amount
       payment_type: 'single',
       payment_method: 'card',
       status: 'paid',
       ★★★ transaction_id: event.data.paymentId,   ← 真实单号（PAY_xxx），不是 MOCK_
       paid_at: event.data.paymentDate 或 new Date()
   · ★★ 若 payments 表需要 chart_id 而 webhook 里没有：
       可以留空（并说明），或按 userId + 最近一次命盘关联（你判断并说明）
   · ★ 这条记录写进去之后，getEntitlements 就会授予 fatebook ✓

③ ★ 其余事件
   · 每个订阅事件与退款事件都留一个分支：只写日志（含 eventType / eventId / orderId）
   · ★★ 全部返回 200（官方：「Return 200 for unhandled events —
     returning an error triggers unnecessary retries」）
   · ★★★ 在注释里写明 §3.4 的两个陷阱（activated+payment_succeeded 双发、
     canceling 不撤销）—— 供下一轮实现订阅时读
```

## 5.4 `src/app/api/verify-payment/route.ts` —— ★★★ 兜底对账

**为什么必须做**：webhook 会丢（3 次重试后 failed，无手动重发 ✗）→
**用户付了钱却拿不到报告** ✗ —— 这是最糟的故障形态。

```ts
POST { orderMerchantExternalId }   // 前端从 success 页带过来
① 验证登录，且该 orderMerchantExternalId 属于当前用户（★ 防止越权查询）
② ★ 先查我们的 payments 表：已有该单号 → 直接返回"已解锁"（快路径 ✓）
③ 没有 → 用 GraphQL 反查 Waffo：
     payments(filter: { orderMerchantExternalId: { eq: ref } }) {
       id orderId status refundStatus orderMerchantExternalId createdAt
     }
   ★ 或查 onetimeOrders(..., filter: { orderMerchantExternalId: { eq: ref } })
     { id buyerEmail status orderMerchantExternalId createdAt }
④ 若查到 status = "succeeded" → ★【补写 payments】（与 §5.3 相同的幂等写入）
⑤ 返回最新权益状态
```

**★ SDK 用法**（官方例）：

```ts
const result = await waffo.graphql.query<{...}>({ query, variables: { ref } })
```

**★★ 出处**：`docs.waffo.ai/api-reference/endpoints/graphql/orders-and-payments.md`
—— 官方明确：「Pass the same `orderMerchantExternalId` you attached at checkout creation.」

## 5.5 `/pricing` 接线

```
把「购买命书」等按钮从【当前的行为】改为：
  POST /api/checkout { sku } → 拿 checkoutUrl → window.location.href = checkoutUrl
★ 未登录 → 先引导登录（沿用现有做法）
★ SKU 未配置 productId → 按钮显示「即将推出」或禁用（★ 不要跳到坏页面）
★★ 本轮【不动】会员卡的「即将推出」（见 §〇-3）
```

## 5.6 成功页 `/checkout/success`

```
★★★ 关键：不能假设付款已确认（见 §二的时间线）

行为：
  ① 从 URL 取 orderMerchantExternalId（★ checkout 时前端要保存它，例如 sessionStorage）
  ② 轮询 /api/entitlements（或现有等价接口），每 2 秒一次，最多 15 次
     → 解锁即停 ✓（覆盖 webhook 正常到达的情况，通常几秒内）
  ③ 轮询仍无 → 调 POST /api/verify-payment { orderMerchantExternalId }
     → 覆盖 webhook 丢失的情况 ✓
  ④ 仍无 → 显示明确文案：
     「付款已完成，但解锁正在处理中。若 10 分钟后仍未解锁，
       请用你的注册邮箱联系 hello@mingcharts.com」+ 附上业务单号
     ★★★ 这条文案很重要 —— 它是【不让用户以为被骗】的兜底 ✓
  ⑤ ★ 页面上要有「返回首页 / 返回价格页」链接
     （官方：没有 cancelUrl，所以返回链接要我们给 ✓）
```

## 5.7 ★ 客户门户链接（为下一轮的会员取消铺路）

```
在账户/会员相关区域放一个链接：
  https://pancake.waffo.ai/consumer/portal/login
  文案：「管理订阅」（Manage subscription）

★ 本轮只需【把这个链接放上去】✓ —— 因为订阅还没上线，
  可以先放在账户页并加一句"订阅功能开放后可用"
★★ 并在回执里写明你实际用的 URL 与出处（§3.6 提到两处不一致）
```

## 5.8 数据库变更

### ★★★ 5.8.0 先说一个【会让首次付款写入直接失败】的坑

**我方核对了现有 `supabase/schema.sql`（第 49 行起）**：

```sql
CREATE TABLE IF NOT EXISTS payments (
  ...
  -- ★★★ 这一行的 CHECK 约束里【没有 'card'】
  payment_method TEXT CHECK (payment_method IN ('wechat', 'alipay', 'stripe')),
  ...
);
```

**而 Waffo webhook 的 `data.paymentMethod` 实际值是 `"card"`**（官方 payload 示例即 `"card"`）✓
→ **若不先改约束，`order.completed` 写 payments 会直接失败** ✗
→ **而这个坑会等到"第一次真实测试付款"才暴露**（联调时白费时间）

**先修它**：

```sql
-- 1) 放宽 payment_method 枚举，纳入 'card'
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_payment_method_check;
ALTER TABLE payments ADD CONSTRAINT payments_payment_method_check
  CHECK (payment_method IN ('card', 'wechat', 'alipay', 'stripe'));

-- ★★ 同时【同步修改 supabase/schema.sql 里那一行】—— 那是单一事实源（§8.5.1）
--    ★ 不要只改数据库、不改 schema 文件 ✗
```

**★★ 其余字段我方核对过，与任务书一致，无需改动**：

```
payment_type CHECK IN ('single','monthly','yearly','lifetime')  ← 我们用 'single' ✓
status       CHECK IN ('pending','paid','failed','refunded')    ← 我们用 'paid' ✓
transaction_id TEXT（无唯一约束 → 见 5.8.1）✓
```

### 5.8.1 幂等所需（按 §5.3 的方案选）

```sql
-- 方案 b（推荐为主）：payments.transaction_id 唯一
ALTER TABLE payments ADD CONSTRAINT payments_transaction_id_key UNIQUE (transaction_id);
-- ★★ 注意：现有数据里有 MOCK_ 前缀的流水；若 transaction_id 有重复需先处理
--    （你说明实际数据情况与处理方式）

-- 方案 a（推荐为辅）：处理记录表
CREATE TABLE IF NOT EXISTS processed_webhooks (
  event_type TEXT NOT NULL,
  event_id   TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (event_type, event_id)
);
```

**★ 两者都要写进 `supabase/schema.sql`**（单一事实源 ✓），并在回执里给出 SQL ✓
**★★ 并说明：为什么用 (b) 为主 —— 它保证"不会重复授予权益"，那是最要紧的一条 ✓**

---

# 六、★★★ 与 entitlement 的对接（本轮的核心价值）

**这条链是本任务存在的理由**：

```
order.completed
  → 写 payments.transaction_id = 'PAY_xxx'        ← 【真实单号，不是 MOCK_ 】
  → getEntitlements 查 payments
      ★ 它有 MOCK_ 排除逻辑 ✓（上一轮做的）
      → 真实单号【不被排除】✓
  → ownedSkus.add('fatebook') ✓
  → canView(ent, 'fatebook') 在 ENFORCE=true 时返回 true ✓
  → 用户看到报告 ✓

★ 而 ENFORCE 现在是 false → canView 恒 true
  → 所以【本轮无法用"能不能看"来验证门禁】
  → ★★★ 验证方式：断言 payments 里确实写入了真实单号，
     且 getEntitlements 对它返回含 fatebook 的 ownedSkus ✓（这可以在断言里直接调 ✓）
```

**★★ 明确不做的**：
```
✗ 不改 entitlement.ts（它是上一轮的定稿，已被四条断言守护）
✗ 不打开 ENTITLEMENT_ENFORCE
✗ 不改 membership 路由（它继续不写库 ✓）
```

---

# 七、断言（纳入 `verify`）

**新建 `scripts/test-waffo-accept.mjs`**。

```
① ★★★ 验签的【行为】断言（不是静态检查）
   · 用 SDK 的 verifyWebhook 对一份【构造的合法签名】验签 → 必须成功
   · ★★ 对一份【篡改过的 body】验签 → 必须失败
   · ★★ 对一份【时间戳偏 40 分钟】的签名 → 必须【成功】
     （这才是"45 分钟容差"的行为验证 ✓ —— 5 分钟窗口会在这里翻红 ✓）
   · ★★ 对一份【时间戳偏 50 分钟】的签名 → 必须失败
   ★ 若无法在离线断言里构造合法签名（需要私钥），
     则改为【断言源码满足三个坑的要求】+【由用户在联调时实测并附证据】✓
     —— 你判断可行方案并在回执里说明

② ★★★ 幂等断言
   · 用同一个 (eventType, eventId) 调用 handleEvent 两次
   · 断言 payments 里【只有一条】记录（或第二次被跳过）✓
   ★ 这必须真的调用处理函数，不得只检查源码文本

③ ★★★ 权益衔接断言（本轮最有价值的一条）
   · 造一条 payments 行（transaction_id: 'PAY_xxx', payment_type: 'single', status: 'paid'）
   · 断言 entitlementsFromRows 返回的 ownedSkus 含 'fatebook' ✓
   · ★ 对照：transaction_id: 'MOCK_xxx' → 不含 'fatebook' ✓（上一轮已有，此处复核）

④ ★★ 会话创建参数断言
   · 对 /api/checkout 的构造参数（可用 mock SDK）断言：
     ★ 必含 metadata.userId、orderMerchantExternalId、includePaymentMethods: ['card']
     ★ successUrl 是【绝对 https URL】✓
   · ★ 未配置 productId 的 SKU → 返回明确错误，不是 500 ✓

⑤ ★ 兜底对账断言
   · payments 已有该单号 → /api/verify-payment 走快路径，不调 Waffo ✓
   · ★ 未越权：别人的 orderMerchantExternalId → 拒绝 ✓

⑥ ★★ 牙口（必须做，用【文本不变、行为变坏】的注入）
   · 注入：把幂等的去重判断改成【永不去重】（如注释掉那行判断的【条件部分】，
     保留文本），或把 45 分钟改成 5 分钟（★ 后者会改文本，所以更推荐前者）
   · 预期：② 精确翻红
   · ★ 注入前【先确认注入有效】（打出改动后的实际行内容与行为），确认失败即中止
   · ★ 恢复后必须复绿
```

**⚠️ 三条硬要求（§8.6.7）**：

```
★ 一、①③ 必须是【行为断言】—— 真的调 verifyWebhook / entitlementsFromRows，
     不得只检查源码里有没有某行字
★ 二、牙口要用【文本不变、行为变坏】的改法，不要用"整段注释掉"
★ 三、注入前先确认注入有效（肯定性证据），确认失败即中止
```

---

# 八、必须避免

- ❌ **不得用 Store Slug 鉴权**（metadata 与 orderMerchantExternalId 会被静默忽略）
- ❌ **不得用 `request.json()` 代替 `request.text()`** 做验签
- ❌ **不得把时间容差写成 5 分钟**（会是 45 分钟）
- ❌ **不得用废弃的 `amount` 字段**（用 `chargedAmount` 与 `listPrice.total`）
- ❌ **不得写 `MOCK_` 前缀的流水**（本轮开始写真实单号）
- ❌ **不得"先查后写"做幂等**（必须靠数据库唯一约束，否则并发下不安全）
- ❌ **不得为未处理的事件返回非 200**（会触发无意义重试）
- ❌ **不得把 `WAFFO_PRIVATE_KEY` 用到客户端**
- ❌ **不得打开 `ENTITLEMENT_ENFORCE`**
- ❌ **不得动 subscription.* / refund.* 的业务实现**（本轮只留分支与日志）
- ❌ **不得硬编码 productId**（做成映射，未配置要明确报错）
- ✅ **`orderMerchantExternalId` 必须能从我们的库里反查回用户**（兜底对账依赖它）

---

# 九、验收标准

| # | 项 | 期望 |
|---|---|---|
| 1 | `.env.example` 补 `WAFFO_MERCHANT_ID` / `WAFFO_PRIVATE_KEY` / `WAFFO_STORE_ID` / `NEXT_PUBLIC_APP_URL` | ✓ |
| 2 | `src/lib/waffo.ts` 单例；环境变量缺失时启动明确报错 | ✓ |
| 3 | `/api/checkout` 传齐 `metadata` / `orderMerchantExternalId` / `includePaymentMethods:['card']`；`successUrl` 是绝对 https | ✓ |
| 4 | ★★★ `/api/webhooks/waffo` 用 raw body 验签；三个坑全部避开 | ✓ |
| 5 | ★★★ 幂等靠数据库唯一约束（不是先查后写） | ✓ |
| 6 | `order.completed` 写 payments，`transaction_id` = 真实 `paymentId` | ✓ **贴实测记录** |
| 7 | ★★ `/api/verify-payment` 兜底可用（快路径 + GraphQL 反查 + 补写） | ✓ |
| 8 | 成功页：轮询 → 兜底 → 明确文案（含业务单号与联系邮箱） | ✓ 贴截图 |
| 9 | ★ 客户门户链接已放（附你实际用的 URL 与出处） | ✓ |
| 10 | SQL 变更写进 `supabase/schema.sql` | ✓ |
| 11 | `test-waffo-accept.mjs` 纳入 `verify`，含**行为断言** | ✓ |
| 12 | ★ 牙口注入 → ② 翻红；恢复后复绿 | ✓ **贴注入前后实际值** |
| 13 | `npm run verify` 全绿 ＋ `tsc --noEmit` 0 错误 | ✓ |
| 14 | **未打开 ENFORCE · 未做订阅 · 未动法律文本 · 未动 `/pricing` 会员卡** | ✓ |

**★★★ 另外必须交付一份【联调实测记录】**（因为有些事离线断言验不了）：

```
· 用测试卡 4576 7500 0000 0110 完成一次真实测试付款的【完整日志】
· webhook 收到的 payload（脱敏后可贴）
· payments 表里写入的那一行（证明 transaction_id 是 PAY_ 开头）
· 断言 /api/verify-payment 在【删掉那条 payments 之后】能把它补回来
  ★★★ 这一条是"webhook 丢失也不丢单"的行为证明 ✓ 很有价值 ✓
· 拒付测试：用 4576 7500 0000 0220 → 确认【没有 payments 写入】✓
```

---

# 十、一句话

> **本任务是路线 B 的第 ④ 步**：支付集成先在**测试模式**跑通，不提交审核、不开 ENFORCE。
>
> **★★★★ 而它真正的价值是把「账」接上**：
> 上一轮我们把 entitlement 打通时，`payments` 里只有 `MOCK_` 假流水 ✗ ——
> **本任务的 `order.completed` 处理器就是那个"唯一被允许写 payments 的支付回调"** ✓
> 它写入**真实的 Waffo 流水号**，于是 `getEntitlements` 终于读到真实数据 ✓
> **这就是为什么上一轮要把 `MOCK_` 排除掉 —— 现在真单号能进来、假单号进不来** ✓
>
> **★★★ 三个必须避开的坑**（官方文档原文，每个都会导致上线后静默失败）：
> ① **验签必须用 raw body**（`request.text()`，不是 `request.json()`）
> ② **时间容差是 45 分钟，不是 5 分钟**（否则我们自己的重试全部 401 ✗）
> ③ **幂等必须靠数据库唯一约束**（"先查后写"在并发下不安全 ✗）
>
> **★★★ 而最重要的一条设计**：官方说
> 「Treat the event — not the checkout redirect — as the point where money is confirmed」
> 且 webhook **最多重试 3 次后放弃、无手动重发** ✗
> → **所以必须有兜底对账**（§5.4）——
> **否则会出现"用户付了钱却拿不到报告"，那是最糟的故障形态** ✓
