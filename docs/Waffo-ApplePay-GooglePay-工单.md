# Waffo 工单草稿：开通 Apple Pay / Google Pay

> 正文英文，可直接粘贴。发送前请先过一遍下面这张清单——凡是 ⚠️ 的都要在粘贴时替换，
> ✅ 是已经和代码 / 证据包核对过的实际值，不要改。

## 发送前必须替换 / 核对

| 项 | 状态 | 说明 |
| --- | --- | --- |
| Merchant ID | ⚠️ 占位符 | 正文里是 `MER_` + 22 个 x（实际长度 26）。仓库不落明文，发送前从 Waffo Dashboard → Settings → Developers 复制真实值替换 |
| Store ID | ⚠️ 占位符 | 正文里是 `STO_` + 22 个 x（实际长度 26）。同上 |
| Store slug | ✅ 已核 | `mingcharts-2bnljr5w`（按证据包里真实收银台 URL 核对，2026-11-14） |
| 收银台会话（可附） | ✅ 已核 | `cs_a12e541b-6e89-7833-be8f-43455996416c`，未付款、未产生费用；截图见 `docs/证据-钱包收银台/` |
| SDK 版本 | ✅ 已核 | `@waffo/pancake-ts@0.25.0`（`package.json`） |
| 商品结构 | ✅ 已核 | 18 个上架商品（简体 9 + 英文 9）+ 3 个伙伴额度包；见 `src/lib/waffo-products.ts` |
| 支付方式字段 | ✅ 已核 | 2026-11-14 起**不再传** `includePaymentMethods`（旧草稿里「仍传 `["card"]`」已过期，正文已改） |
| 发件人署名 | ⚠️ 占位符 | 正文末尾 `<your name>` 换成真实姓名/邮箱 |

---

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
