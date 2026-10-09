# 追问邮件 · Waffo（第二封）—— DKIM/SPF 对齐 ＋ 上线自查确认

> **用途**：直接复制发送（英文）
> **发起**：2026-10-10
> **对应**：Waffo 2026-10-09 的回信（主体资格 / 提现 / 品类 / 审核顺序 / 注册建议）
> **★ 我方核实过的证据**：本信 §2 的表格来自 Google 发给我们域名的 **DMARC 聚合报告**
> （`google.com!mingcharts.com!1791331200!1791417599.zip`，2026-10-07 全天）
> 以及我方对 DNS 与实际发信路径的实测 ✓

---

## 中文摘要（发送前先看这个）

```
★ 核心只问一件事：Waffo 用 mingcharts.com 当发件人，但 DKIM 签名是 waffo.ai、
  SPF 是 waffo.com/waffo.ai → 对我们的域名【DMARC 不对齐】✗
  目前靠 ARC 放行 ✓ —— 这不是长期可依赖的结构 ✗
★★ 并顺带确认三件事：
   ① 上线自查清单，我们的理解对不对
   ② 个人主体的审核入口是不是"设置 → 企业详情"
   ③ 测试模式怎么开、有什么限制
★★★ 语气：我们【不打算】收紧 DMARC ✗ —— 是问最佳实践 ✓
   （避免他们误解为"你们要被拒了"✗）
```

---

## 邮件正文（可直接发送）

**To**: Waffo Pancake support
**Subject**: Follow-up — DKIM/SPF alignment for `mingcharts.com` transactional emails + go-live checklist confirmation

---

Hello Waffo Pancake team,

Thank you for the detailed clarifications — especially the corrections on entity eligibility, the withdrawal limits, and the accurate review sequence. Those were very helpful, and we have updated our internal plan accordingly.

We are proceeding as an **individual (natural person) entity**, and we understand that the website must be **live and publicly accessible** before review can be submitted. We will register the store with `hello@mingcharts.com` as you suggested.

I have five questions. **Question 1 is the important one**; the rest are quick confirmations.

---

## 1. Email authentication alignment for `mingcharts.com` (the important one)

**Situation.** Our checkout/receipt emails are sent with `mingcharts.com` as the visible From domain. However, the DMARC aggregate report Google sends us shows that these messages do **not align** with our domain:

| Sending source | From domain | SPF result for our domain | DKIM result for our domain | Delivered via |
|---|---|---|---|---|
| `mail-sor-f41/f69.google.com` | `mingcharts.com` | **fail** | **fail** | `arc=pass` (`local_policy`) |

The `auth_results` block in that same report shows **which credentials actually authenticated**:

```
dkim: domain=waffo.ai   selector=google   → pass
spf:  domain=waffo.com                    → pass   (also waffo.ai in other records)
```

So the messages authenticate against **`waffo.ai` / `waffo.com`**, not against `mingcharts.com`.

**Our current DNS:**
```
SPF:    v=spf1 include:zohomail.com ~all
DMARC:  v=DMARC1; p=none; rua=mailto:hello@mingcharts.com
DKIM:   zmail._domainkey.mingcharts.com   (Zoho /selector `zmail`)
```
`p=none`, so nothing is blocked today — Gmail's `arc=pass` handling lets these through. My concern is that this depends on **ARC support**, which is not universal across mailbox providers, and it would break outright if we ever tightened our DMARC policy.

**Questions:**

1.1 Can Waffo send transactional email (receipts, subscription notices, renewal reminders) **DKIM-signed with `mingcharts.com`** — i.e. is there a way for us to publish a DKIM key that your sending infrastructure signs with?

1.2 If not, is there a **custom sending domain** setting we should use (for example, adding `mingcharts.com` to the Google Workspace domain that your sending runs on)?

1.3 If neither is possible, would you recommend that we simply accept the `arc=pass` dependency — or would you suggest a different From configuration (for example, sending from a `waffo.ai` address and showing "MingCharts" only in the display name)?

1.4 To be clear about our intent: **we are not planning to tighten our DMARC policy** (it will stay `p=none`). We are asking so that we can document the correct long-term setup and avoid a deliverability problem later — particularly since subscription renewal notices are the kind of mail that must not be lost.

---

## 2. Go-live checklist — is our understanding correct?

From your reply, the common rejection reasons are:

| # | Requirement | Our status |
|---|---|---|
| a | Pricing page visible | ✅ `/pricing` is published |
| b | Terms of Service and Privacy Policy published and clickable site-wide | ✅ `/terms` and `/privacy` published; linked in the site footer on every page |
| c | Valid customer support contact in the footer | ✅ `hello@mingcharts.com` shown in the footer |
| d | AIGC disclosure | ✅ Disclosed in our Terms (§ AI-generated content) and on the product pages |
| e | No promise of results / no investment advice | ✅ We explicitly avoid deterministic claims and do not give investment advice |

**Question 2:** Is there anything on this list we have **misunderstood**, or any additional item you commonly see rejected that is not listed here?

---

## 3. Review submission entry point for an individual entity

You wrote: submit under **Settings → Business Details** (设置 → 企业详情).

**Question 3:** For an **individual (natural person)** account — which, as you explained, has no company option in the identity form — is **Settings → Business Details** still the correct entry point? Or is there a different menu path for individual accounts?

---

## 4. Test mode

You mentioned we can complete integration and end-to-end testing in **test mode** without review.

**Question 4:** How do we enable test mode for a newly created store, and are there any limitations we should know about (for example: do test-mode checkout sessions produce webhooks with `mode: test` so we can distinguish them; are test payments ever visible to real customers)?

---

## 5. The built-in website AI self-check

You mentioned a website AI self-check available at the submission page.

**Question 5:** Can that self-check be run **before** the store is otherwise ready — i.e. can we run it as soon as the site is live, to catch issues early, or does it only become available at the moment of submission?

---

Thank you again — the previous reply saved us a lot of guesswork, and we would rather ask these now than discover them during review.

Best regards,
**Chen Jin (金晨)**
MingCharts — https://mingcharts.com
hello@mingcharts.com

---

## 附：本信依据的证据（我方实测，供内部追溯）

```
★ DMARC 报告（Google 于 2026-10-07 全天）：
   <policy_published> domain=mingcharts.com · p=none · pct=100
   record: source_ip=209.85.220.41  count=1    → dkim=fail spf=fail reason=local_policy arc=pass
   record: source_ip=209.85.220.69  count=11   → 同上
   auth_results: dkim(waffo.ai, selector=google)=pass · spf(waffo.com / waffo.ai)=pass

★ 源 IP 反查：
   165.173.182.55  → sender5-of-o55.zoho.com      ← Zoho（我们的邮箱）
   209.85.220.41   → mail-sor-f41.google.com      ← Waffo 的发信（Google Workspace）
   209.85.220.69   → mail-sor-f69.google.com      ← 同上

★ 我方 DNS 实测：
   mingcharts.com      TXT  v=spf1 include:zohomail.com ~all
   _dmarc.mingcharts.com TXT  v=DMARC1; p=none; rua=mailto:hello@mingcharts.com
   zmail._domainkey.mingcharts.com  TXT  v=DKIM1; k=rsa; p=MIGfMA0GCSq…（Zoho）

★ Zoho 侧（对照，基本正常）：
   spf=pass ✓ · 其中一条 dkim=pass（selector=zmail）✓ · 另一条 dkim=fail ✗
   → ★ 值得留意：同一 IP 有两条不同结果（可能是有签名/无签名两种流程并存）
```

---

## ★ 发送前自查（避免我方自己出错）

```
✓ 未声称"我们必须收紧 DMARC"（信里明确说保持 p=none）
✓ 未要求 Waffo 做任何超出其能力的事（给了三个选项 + 一个"接受现状"选项）
✓ 五个问题各自独立编号，便于逐条回复
✓ 未泄露任何密钥（DKIM 公钥本身是公开记录，无需隐藏；私钥从未出现）
✓ 邮件地址用 hello@mingcharts.com（与 Waffo 建议一致）
```
