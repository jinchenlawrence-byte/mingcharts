# Waffo 工单草稿：开通 Apple Pay / Google Pay

> 发送方式：Waffo Dashboard 右下角支持入口 / 客服邮箱。发送前把文首两个占位符换成真实值
> （Dashboard → Settings → Developers 可查 Merchant ID 与 Store ID）。正文英文，可直接粘贴。

---

**Subject:** Enable Apple Pay and Google Pay for an existing USD store (one-time + subscription) — activation and webhook questions

Hello Waffo Support,

We are an existing live merchant on Waffo Pancake (merchant of record model) and we would like to offer Apple Pay and Google Pay on our hosted checkout alongside cards.

**Account details**

- Merchant ID: `MER_xxxxxxxxxxxxxxxx`
- Store ID: `STO_xxxxxxxxxxxxxxxx`
- Store slug: `mingcharts` (checkout is reached at `pancake.waffo.ai/store/{slug}/checkout/{sessionId}`)
- Environment: production (live payments already processing)

**How we integrate today**

- SDK: `@waffo/pancake-ts@0.25.0`, API-key authenticated server-side, `checkout.createSession()`.
- Hosted checkout only. We redirect the buyer's top-level browser to `checkoutUrl`; we do not embed an iframe and we do not handle any wallet tokens, certificates or domain verification files on our side.
- Currency: every product is priced in **USD** only.
- Product mix: 18 products (9 Chinese + 9 English) covering **both one-time and subscription**: 6 one-time reports, 2 subscription plans (monthly / yearly), 1 one-time question pack, plus partner credit packs. No CNY/EUR/GBP products.
- We currently send `includePaymentMethods: ["card"]` on every checkout session. We plan to stop sending that field (or send `["card","applepay","googlepay"]`) once we know the channel status.

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
