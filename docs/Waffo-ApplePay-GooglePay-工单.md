# Waffo 工单定稿（中文）：Apple Pay / Google Pay 是否在限制类目的「卡片支付」范围内

> 发送方式：**直接在同一封 Waffo 中文客服线程里回复**（上一轮对方用中文回复，继续走同一线程，
> 避免换线程后上下文丢失）。正文可直接粘贴。

## 发送前必须替换 / 核对

占位符统一样式为 `{{...}}`，共 **3 处**必须替换：

| 占位符 | 替换为 | 说明 |
| --- | --- | --- |
| `{{MERCHANT_ID}}` | 真实 Merchant ID | 形如 `MER_` + 22 位（总长 26）。仓库不落明文，从 Waffo Dashboard → Settings → Developers 复制 |
| `{{STORE_ID}}` | 真实 Store ID | 形如 `STO_` + 22 位（总长 26）。同上 |
| `{{SIGNATURE}}` | 真实署名（姓名 + 邮箱） | 与上一条客服线程的落款保持一致，便于对方认人 |

已核对、**不要再改**的值：

| 项 | 值 | 核对来源 |
| --- | --- | --- |
| Store slug | `mingcharts-2bnljr5w` | 证据包里真实收银台 URL |
| 未付款会话 ID | `cs_a12e541b-6e89-7833-be8f-43455996416c` | 2026-11-14 用生产密钥创建，未付款、未扣费 |
| SDK 版本 | `@waffo/pancake-ts@0.25.0` | `package.json` |
| 商品结构 | 18 个上架商品（简 9 + 英 9）+ 3 个简体伙伴额度包 | `src/lib/waffo-products.ts` |
| 支付方式字段 | 不再传 `includePaymentMethods` / `excludePaymentMethods` | 2026-11-14 已去掉 `["card"]` 白名单 |

---

**主题：** 关于限制类目「仅支持卡片支付」的范围——Apple Pay / Google Pay 是否包含在内，及开通状态与 webhook 取值

Waffo 客服团队，你好：

我们是 Waffo Pancake 的现有商户（MoR 模式），线上已有真实收款，结算币种为 USD。希望就「限制类目仅支持卡片支付（Cards only，如 Visa/Mastercard 等）」这句话的边界做一次书面确认，并顺带确认两个钱包的开通状态与 webhook 取值。

## 一、账号信息

- Merchant ID：`{{MERCHANT_ID}}`
- Store ID：`{{STORE_ID}}`
- Store 标识（slug）：`mingcharts-2bnljr5w`（收银台地址形如 `pancake.waffo.ai/store/mingcharts-2bnljr5w/checkout/{sessionId}`）
- 环境：生产（已在正常收款）
- SDK：`@waffo/pancake-ts@0.25.0`，服务端 API Key 鉴权，调用 `checkout.createSession()`

## 二、接入方式

- 只用托管收银台：买家的顶层浏览器直接跳转到 `checkoutUrl`；**不嵌 iframe**，我们侧不处理任何钱包 token、证书或域名验证文件。
- 全部商品以 **USD** 定价（无 CNY/EUR/GBP）。
- 商品结构：18 个上架商品（简体 9 + 英文 9）。每种语言下为：6 个一次性报告、2 个订阅方案（月付／年付）、1 个一次性追问包——也就是说钱包既涉及一次性扣款，也涉及订阅扣款。另有 3 个简体伙伴额度包（一次性）。
- 我们**不再传** `includePaymentMethods` / `excludePaymentMethods`（2026-11-14 已去掉早先的 `["card"]` 白名单），支付方式完全按 Waffo 对 USD 的默认规则展示；当前托管收银台实际展示的是 **卡、Apple Pay、Google Pay** 三项。
- 可核验的未付款会话：`cs_a12e541b-6e89-7833-be8f-43455996416c`（店铺 `mingcharts-2bnljr5w`，USD 4.99 一次性商品），截图可随时提供。

## 三、最需要书面确认的一点：品类与支付方式范围

我们在 2026 年 10 月收到的邮件回复中看到这句话：

> 支付通道限制：限制类目仅支持卡片支付（Cards only，如 Visa/Mastercard 等）。

想请你们明确：**Apple Pay 和 Google Pay 是否属于这句话所允许的「卡片支付」范围？**

之所以必须确认：我们理解 Apple Pay / Google Pay 底层仍走卡组织清算（Visa/Mastercard 的 token），但 Waffo 系统内部对 `applepay` / `googlepay` 的归类、品类白名单是按「支付方式」还是按「清算网络」判断，从文档上无法确认。这两个钱包是 Waffo 自己的托管收银台默认展示给买家的（我们并未单独申请），如果它们被判定在限制类目允许范围之外，我们需要知道后续应如何处理。

## 四、另外三个问题

1. **开通状态**：该店铺／商户的 `applepay` 与 `googlepay` 在 USD 下是否已开通？一次性和订阅是否都覆盖？SDK 的 `PaymentMethod` 类型列出了四种方式，文档也说 USD 矩阵支持，但我们没找到「钱包收单是否需要按商户单独开启」的说明。
2. **费用与前置条件**：如果默认未开通，需要我们提供什么——业务复核／KYB 补充、额外材料、单独协议，还是按方式逐个申请？钱包支付在费率、结算币种与周期、拒付处理上与卡支付是否有差异？另外请书面确认：托管收银台跳转模式（无 iframe、不在我们页面加载 Apple Pay JS）无需我们提供 Apple Developer 账号、Merchant ID 或域名验证文件——我们的理解是不需要，但希望有书面答复。
3. **webhook 取值**：`order.completed` 与 `subscription.payment_succeeded` 事件里，`paymentMethod` 的完整可能取值是什么？文档只给了 `"card"` 一个例子。我们需要完整枚举（例如 `applepay` / `googlepay` / `wechat`）以及大小写／格式是否稳定，以便正确落库，而不是一律硬编码成 `card`。

## 五、顺带两点

- 若创建会话时**不传** `includePaymentMethods`，而该商户某个钱包未开通：API 会静默不展示该方式，还是直接返回 400 拒绝创建？我们要避免配置把现有卡支付弄挂。
- 测试模式下 Apple Pay / Google Pay 是否可用，方便上线前先验证按钮是否出现？

以上四个编号问题，一封邮件回复即可，不需要电话。谢谢。

{{SIGNATURE}}
MingCharts

---

## 附录：英文原稿（仅备查，不再发送）

**Subject:** Enable Apple Pay and Google Pay for an existing USD store (one-time + subscription) — activation and webhook questions

Hello Waffo Support,

We are an existing live merchant on Waffo Pancake (merchant of record model) and we would like to offer Apple Pay and Google Pay on our hosted checkout alongside cards.

**Account details**

- Merchant ID: `MER_xxxxxxxxxxxxxxxxxxxxxx`
- Store ID: `STO_xxxxxxxxxxxxxxxxxxxxxx`
- Store slug: `mingcharts-2bnljr5w` (checkout is reached at `pancake.waffo.ai/store/mingcharts-2bnljr5w/checkout/{sessionId}`)
- Environment: production (live payments already processing)

**How we integrate today**

- SDK: `@waffo/pancake-ts@0.25.0`, API-key authenticated server-side, `checkout.createSession()`.
- Hosted checkout only. We redirect the buyer's top-level browser to `checkoutUrl`; we do not embed an iframe and we do not handle any wallet tokens, certificates or domain verification files on our side.
- Currency: every product is priced in **USD** only.
- Product mix: 18 live products (9 Chinese + 9 English). Per language: 6 one-time reports, 2 subscription plans (monthly / yearly) and 1 one-time question pack — i.e. wallet support matters for both one-time and recurring charges. We also have 3 Chinese partner credit packs (one-time). No CNY/EUR/GBP products.
- We do **not** send `includePaymentMethods` or `excludePaymentMethods` on checkout sessions (we removed our earlier `["card"]` allowlist on 2026-11-14), so the method list is whatever Waffo decides for USD. The hosted checkout currently renders **Card, Apple Pay and Google Pay**.
- For reference, here is a live **unpaid** session created today: `cs_a12e541b-6e89-7833-be8f-43455996416c` (store `mingcharts-2bnljr5w`, USD 4.99 one-time item). A screenshot showing all three options is available on request.

**Questions**

1. **Channel enablement.** Is `applepay` and `googlepay` already enabled on this store/merchant for USD, for **both** one-time and subscription products? The SDK type `PaymentMethod` lists all four methods and the docs say the USD matrix supports them, but I could not find whether wallet acquiring has to be switched on per merchant on Waffo's side.

2. **Onboarding requirements and pricing.** If not enabled by default, what exactly do you need from us — a business review/KYB extension, additional documents, a separate agreement, or a per-method application? Are fees, settlement currency/timing, or chargeback handling different for wallet payments compared with card payments? Please also confirm whether the hosted-checkout path (redirect, no iframe, no Apple Pay JS on our page) requires anything from us such as an Apple Developer account, Merchant ID, or domain verification — our understanding is that it does not, but we want this in writing.

3. **Webhook field values.** For `order.completed` and `subscription.payment_succeeded`, what are the exact possible values of `paymentMethod` in the webhook payload? The docs only show `"card"` as an example. We need the full enumeration (e.g. `applepay` / `googlepay` / `wechat`) and whether the casing/format is stable, so we can store it correctly in our payments table instead of hard-coding `card`.

**One extra check, if you can confirm quickly**

- If a session is created **without** `includePaymentMethods` while a wallet is not enabled on the merchant, does the API silently omit that method, or reject the session with a 400? We want to avoid a configuration that breaks existing card checkout.
- Do Apple Pay / Google Pay work in **test mode**, so we can verify the buttons appear before going live?

A single reply covering the three numbered items is enough — we do not need a call.

Thanks,
<your name>
MingCharts
