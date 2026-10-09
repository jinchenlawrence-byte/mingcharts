# Privacy Policy — MingCharts

> **状态**：v0.2 定稿（2026-10-09），**待发布**
> **基座**：Waffo Pancake 官方 [Privacy Policy 模板](https://docs.waffo.ai/mor/account-reviews/privacy-policy)（GDPR/CCPA 感知）
> **本次修订依据**：Waffo 三份官方清单（我方已取全文并逐条对照）
> · [Account Reviews 总清单](https://docs.waffo.ai/mor/account-reviews)
> · [Privacy Policy Template](https://docs.waffo.ai/mor/account-reviews/privacy-policy)
> · [AIGC Compliance](https://docs.waffo.ai/mor/account-reviews/aigc-compliance)
> **⚠️ 不是法律意见。** 主体不常见（中国个人自然人 + 命理类目 + 美/欧客户），上线前建议找律师过一遍。

---

## ⚠️ v0.1 → v0.2 改了什么（内部说明，发布时可删）

| # | 改动 | 依据 |
|---|---|---|
| 1 | 全部占位符填实（域名、邮箱、日期、保留期、云服务商） | Privacy 清单「Final pass: every `[placeholder]` replaced」 |
| 2 | 主体措辞 → **`an individual (natural person)`**；地址栏写 **`Not applicable`** | Waffo 答复「个人（自然人）主体」；ToS 模板注「individual / sole trader: **legal name only — no business address needed**」 |
| 3 | **★★ §4 补 `localStorage` 与认证 Cookie 的实际用途** | 我方查实：`@supabase/ssr` 用 cookie 存认证 session；5 处 `localStorage` 用于记住命盘。**原稿只讲 Cookie，遗漏了 localStorage** |
| 4 | **★ §4 明确"我们不使用任何分析或广告追踪工具"** | Privacy 清单 🟡「Analytics tools named」——我方查实：**源码与依赖零命中**，如实写"无"比留 `[LIST TOOLS]` 占位更准 |
| 5 | **★★ §10 写实跨境传输地区**：Supabase → **美国 us-east-1** · 托管 Vercel → **美国 iad1** · DeepSeek → **中国** | 用户已确认 Supabase 区域；Vercel 区域将在部署时按此设置为 iad1（**若变更须同步改本节**） |
| 6 | **★ §7 保留期全部填成实数** | Privacy 清单 🔴「Retention periods filled in with real numbers」 |
| 7 | **★ §9 如实写"目前不发送营销邮件"**，并说明将来若发送时的 opt-out | Privacy 清单 🟡「A real opt-out path for marketing」；不夸大 |
| 8 | **★ §5 补 Waffo Pancake 作为 MoR 的角色**；AI 段落具体到模型名 | ToS/Privacy 清单 🔴「Payment processor named: **Waffo Pancake**」；AIGC 页 🔴「real and specific」 |
| 9 | **★ §14 联系方式收敛为单一邮箱**；删电话/地址/营业时间 | 模板注：「Better to list fewer real ones than six unmonitored」 |
| 10 | §13 政策变更通知 15 天 → **30 天**（与 ToS 一致） | 两份文件应相互一致 |
| 11 | 新增 **§15 版本记录** | Waffo Tip：「keep a version log with effective dates」 |
| 12 | **★ §1 数据控制者写明"自然人、无营业地址"** | 同上 |

**★ 已查实的事实（写入本文）**：

```
数据控制者    Jin Chen（金晨），中华人民共和国【自然人】，无营业地址
域名          https://mingcharts.com
隐私/支持邮箱  hello@mingcharts.com（唯一对外渠道）
★ 数据存放     · Supabase（账号与数据库）→ 美国 us-east-1
              · Vercel（网站托管）        → 美国 iad1
              · DeepSeek（AI 文本生成）    → 中国
              · Waffo Pancake（支付）      → Merchant of Record，PCI-DSS
★ 实际 AI 模型  DeepSeek（deepseek-chat）—— 唯一使用
★ 分析/追踪工具  无
★ Cookie      @supabase/ssr 认证 session（严格必要）
★ localStorage localStorage['currentChart']（功能性：记住你上次查看的命盘）
```

---

# PRIVACY POLICY

**MingCharts**

Last Updated: 2026-10-09

**Jin Chen (金晨)**, an **individual (natural person)** operating under the laws of the People's Republic of China ("we", "us", or "our"), operates MingCharts and is committed to protecting your privacy. This Privacy Policy ("Policy") explains how we collect, use, store, and share your personal information when you use MingCharts (the "Service"), and the rights available to you.

Please read this Policy carefully before using the Service. By using the Service, you agree to this Policy. We may update this Policy periodically and will notify you of material changes by email or in-product notice.

## 1. Data Controller

The data controller for this Service is:

- **Name**: Jin Chen (金晨), **individual (natural person)**
- **Country**: People's Republic of China
- **Privacy Email**: **hello@mingcharts.com**
- **Data Protection Officer (DPO)**: Not applicable
- **Mailing Address**: **Not applicable** — the operator is a natural person and no business address applies

## 2. Personal Information We Collect

### 2.1 Information You Provide Directly

- **Account Information**: email address, password (stored hashed), display name (optional).
- **★ Birth Information**: birth date, birth time, birth place (city and, optionally, longitude/time zone), and gender. **We need this information to calculate your chart — the Service cannot function without it.**
- **Chart & Reading Data**: your calculated charts, generated reports, and daily readings. Reports and readings may include fortune-tier tendency labels (seven tiers, rendered in Chinese as 大吉 through 大凶); these are **tendency descriptions** derived from your chart data, not action recommendations, and they do not predict specific events.
- **Communications**: emails, support requests, and feedback you send us.
- **Payment Information**: transaction amount, order number, and payment status. **Full card numbers are not stored by us** — card data is processed by our Merchant of Record (see Section 5).

### 2.2 Information We Collect Automatically

- **Device & Network**: IP address, device model, operating system, browser type, time zone, language.
- **Usage Data**: pages visited, features used, activity logs, session duration.
- **Log Data**: request timestamps, error logs, performance metrics.

### 2.3 What We Do NOT Collect

- We do **not** collect precise geolocation from your device.
- We do **not** collect special-category data (such as health, biometric, political, or religious data) as defined under GDPR Article 9.
- We do **not** use advertising identifiers, advertising pixels, or cross-site tracking.
- ★ **We do not run any third-party analytics or tracking tools** (see Section 4).

## 3. How We Use Your Information

| Purpose | Legal Basis |
|---|---|
| Chart calculation and report generation | Contract performance |
| Subscription delivery (daily readings, monthly updates) | Contract performance |
| Billing and payment processing | Contract performance |
| Customer support | Contract performance / Legitimate interests |
| Service notifications (billing, security, policy changes) | Legitimate interests |
| Security and fraud prevention | Legitimate interests |
| Product improvement (using aggregate, non-identifying figures only) | Legitimate interests |
| Legal and tax compliance | Legal obligation |
| Marketing emails (**currently none** — see Section 9) | Your consent |

We may aggregate or anonymize data for statistical purposes. Such data cannot be linked to any individual.

## 4. Cookies, Local Storage & Tracking Technologies

### 4.1 What We Actually Use

**★ We use no analytics, advertising, or cross-site tracking tools. The only client-side storage we use is the following:**

| Type | What it is | Purpose | Disableable |
|---|---|---|---|
| **Strictly necessary (cookie)** | Authentication session cookie set by our authentication provider (`@supabase/ssr`) | Keeps you logged in; secures your session | No — the Service cannot work without it |
| **Functional (local storage)** | `localStorage['currentChart']` | Remembers the chart you last viewed, so you can return to it | Yes — clearing your browser storage removes it; the Service still works |

**There is no "Analytics" or "Marketing" row, because we do not use any such tools.** If we ever add one, this table and Section 10 will be updated and you will be notified as described in Section 13.

### 4.2 Managing Storage

You can clear cookies and local storage at any time through your browser settings. Doing so will log you out and remove the remembered chart; nothing else is affected.

## 5. Sharing & Disclosure

**We do not sell your personal information**, including as defined under applicable laws such as the CCPA. We share your information only in the following circumstances:

- **Merchant of Record / Payment Processing**: Payment card data is processed exclusively by our PCI-DSS certified payment processor, **Waffo Pancake**, acting as **Merchant of Record**. Waffo Pancake is the seller of record for your purchase and handles payment processing and applicable tax collection on the transaction. Card data is **never stored on our servers**.
- **AI Model Provider**: To generate interpretive content, your **input** — which may include your birth information, your chart data, and any question you type — is transmitted to **DeepSeek** (model `deepseek-chat`) for processing. We do **not** transmit your name, email address, account password, or payment information to AI providers.
- **Infrastructure Providers**: cloud hosting and database services — **Supabase** (database and authentication) and **Vercel** (website hosting) — bound by confidentiality obligations.
- **Legal Requirements**: where required by law, court order, or a lawful regulatory request.
- **Business Transactions**: in a merger, acquisition, or similar event, with advance notice and continued protections.
- **With Your Consent**: for any other purpose, with your explicit prior consent.

## 6. Data Security

- **Encryption in transit**: TLS / HTTPS.
- **Secure storage**: passwords are hashed; database access is restricted.
- **Access controls**: least-privilege principle; **row-level security (RLS) is enabled on user data** in our database.
- **No card data**: payment card data never reaches our servers.

In the event of a security incident affecting your rights, we will notify you and the relevant authorities within **72 hours** of discovery, as required by applicable law. Please keep your credentials secure and do not share them.

## 7. Data Retention

| Data Type | Retention Period | Upon Expiry |
|---|---|---|
| Account information | While your account is active; **90 days** after deletion | Delete or anonymize |
| Birth information and chart data | While your account is active; **90 days** after deletion | Delete or anonymize |
| Transaction records | **10 years** (Chinese accounting and tax requirements) | Archive, then delete |
| Support records | **2 years** | Secure deletion |
| Security and access logs | **6 months** | Secure deletion |

**★ Why 10 years for transactions**: Chinese accounting and tax rules require business records to be retained for this period. Because the operator is a natural person subject to those rules, we keep transaction records for that term and no longer.

## 8. Your Data Rights

To exercise any right below, contact us at **hello@mingcharts.com**. We respond within **30 calendar days**.

| Right | Description |
|---|---|
| Right to be informed | Know what data we collect and how we use it |
| Right of access | Obtain a copy of your personal information |
| Right to rectification | Correct inaccurate or incomplete data |
| Right to erasure | Request deletion under certain conditions |
| Right to restrict processing | Temporarily suspend processing in certain cases |
| Right to data portability | Receive your data in a machine-readable format |
| Right to object | Object to processing based on legitimate interests or marketing |
| Right to withdraw consent | Withdraw consent for consent-based processing |

You may also lodge a complaint with your local data protection authority.

**Account deletion**: you can delete your account directly via your account settings, or by contacting **hello@mingcharts.com**.

## 9. Marketing & Opt-Out

**★ We currently do not send marketing or promotional emails at all.** The emails we send are limited to essential service messages: account verification, receipts and billing notices, security alerts, and notices about changes to our terms or this Policy.

If we introduce marketing communications in the future, we will do so only **with your consent**, and you will be able to opt out at any time — by clicking "Unsubscribe" in any such email, or by disabling marketing in your account settings, or by contacting us. **Opting out will never affect essential service notifications.**

## 10. International Data Transfers

**★ Where your data is stored and processed:**

| Provider | Role | Location |
|---|---|---|
| **Supabase** | Database and authentication | **United States** (AWS `us-east-1`) |
| **Vercel** | Website hosting and server functions | **United States** (`iad1`) |
| **DeepSeek** | AI text generation | **China** |
| **Waffo Pancake** | Payment processing / Merchant of Record | as required to process payments |

Our service providers may be located outside your country of residence, so your personal data may be transferred internationally. Where personal data is transferred internationally, we safeguard it through:

- Data processing agreements incorporating **EU Standard Contractual Clauses (SCCs)** where applicable;
- Transfers only to recipients providing an equivalent level of protection.

If you are located in the EEA or the UK, your data may be transferred to a third country that has not been deemed by the European Commission to provide an adequate level of data protection. We rely on the safeguards described above.

**★ If we change where data is stored, this section is updated and you are notified as described in Section 13.**

## 11. Children's Privacy

**The Service is intended for users aged 18 and above.** We do not knowingly collect information from anyone under 18. If you believe a minor has provided information to us, contact us immediately and we will promptly delete it.

## 12. Third-Party Links & Services

The Service may include links to third-party services (for example, our payment processor's customer portal). This Policy applies only to data we directly collect. We are not responsible for third-party privacy practices and encourage you to review their policies before use.

## 13. Policy Changes

For material changes, we will provide at least **30 days'** advance notice via in-product notice or your registered email, and update the "Last Updated" date at the top of this page. Continued use after the effective date constitutes acceptance.

*(30 days matches the notice period in our Terms of Service, so the two documents stay consistent.)*

## 14. Contact Us

**All privacy, support, and billing enquiries go to one monitored address:**

- **Privacy & Support Email**: **hello@mingcharts.com**
- **Operator**: Jin Chen (金晨), individual (natural person), People's Republic of China
- **Mailing Address**: Not applicable (the operator is a natural person)
- **Website**: **https://mingcharts.com**
- **Response time**: within 30 calendar days for privacy requests

*(We deliberately list one real, monitored channel rather than several unmonitored ones.)*

MingCharts · https://mingcharts.com

---

## 15. ★ Version Record

We keep a version log so that it is possible to establish which version of this Policy was in effect at any past point in time.

| Version | Effective date | Summary of changes |
|---|---|---|
| v0.2 | **2026-10-09** | First published version. Aligned to Waffo Pancake merchant requirements: named the Merchant of Record; specific AI model disclosure (`deepseek-chat`); storage locations stated (US `us-east-1` / US `iad1` / China); client-side storage documented accurately including `localStorage`; explicit statement that no analytics or advertising trackers are used; retention periods set to real terms; single monitored contact address. |
| v0.1 | — (unpublished draft) | Initial draft based on the Waffo Pancake privacy policy template. |

---

## 📌 附：本政策里四处**特别为这个产品**写的内容（内部说明，发布时可删）

1. **§2.1 生辰信息单独列出，并说明"没有它服务无法运行"**
   —— 生辰是个人数据，且是本产品的**核心输入**，必须明说收集目的与必要性。

2. **§5 把「传给 DeepSeek 的是什么、不是什么」写清楚**
   —— Waffo 模板要求披露 AI 服务商；我们逐条列明传什么、**明确"不传姓名/邮箱/密码/支付信息"**。

3. **★ §4 把「不用任何分析工具」当成一条正面陈述**
   —— 与其留一个 `[LIST TOOLS]` 占位，不如如实写"无"。这既符合清单要求，也是我们真实的做法。

4. **★ §10 用表格写实三处存放地**
   —— 审核方与用户都能一眼看清数据去了哪里；且本节自带"变更即更新"的承诺。

**★ 关于语言**：本政策目前只有英文版（与 Waffo 模板一致）。目标用户虽为美国中文用户，
但**法律文本的多语版本会带来"以哪一版为准"的问题**，建议在有律师参与时再出中文版。
