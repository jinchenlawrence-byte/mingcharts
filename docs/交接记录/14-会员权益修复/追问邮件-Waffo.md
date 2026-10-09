# 追问邮件（Waffo）— 回复其 2026-10-08 答复

> **背景**：Waffo 已正式答复我们的三个核心问题（主体 / 提现 / 类目），
> 结论**全部有利**（详见 `docs/美国合规要点.md` §九）✓
> **★ 而这封邮件是抓住他们主动给出的邀请**：
> 答复末尾原文：
> 「对于命理文化类 AIGC 产品的合规要求或提现配置，您是否还有其他想进一步了解的细节？」
> **→ 这是白送的追问机会，值得用足。**

---

# 〇、先挑问题：**只问四件真正影响决策的事**

**★ 原则**：一次问太多会失焦 ✗ —— 挑"答案会改变我们做法"的问题 ✓

| 优先级 | 问题 | 为什么问（会改变什么） |
|---|---|---|
| **① ★★★** | **实名验证接受哪些证件？中国大陆居民身份证可以吗？** | **决定"要不要现在办护照"** —— 这是最急的一条 |
| **② ★★★** | **订阅的自动续费与取消，Waffo 是否已内置？** | 决定**我们要写多少代码**；且加州 ARL 是硬要求 |
| **③ ★★** | **商品页/结账页的措辞有无要求或禁区？AIGC 是否有额外合规要求？** | 直接决定我们的商品与页面文案 |
| **④ ★★** | **提现能否提供对账单/收入证明用于个税申报？** | 中国侧申报要用（运营事项） |

**暂不问**（可后续）：拒付费率与责任划分 · 支付宝能否作为收款通道（已知 Cards only ✗）· 具体审核时长

---

# 一、中文邮件（可直接复制）

**收件人**：support@waffo.ai（与原信同一线程回复）
**主题**：Re: 商户申请咨询｜中国大陆个人主体 ＋ 命理文化类 AIGC 订阅产品

---

您好，

感谢详细答复，三条都已明确，我们据此推进。另有四个细节想确认，
都是为了把技术方案一次做对，避免后期返工。

## 一、实名验证的证件类型

1. 后台实名验证**接受哪些证件**？**中国大陆居民身份证**是否可以直接使用？
2. 若必须使用护照，请明确告知 —— 这会影响我们的准备时间。
3. 实名验证与 Business Details（KYB）审核是**两步**，还是同一步？
   分别在什么时机提交？

## 二、订阅的自动续费与取消机制（这一条最关键）

我们的会员是**月付 $9.90 / 年付 $49** 的订阅，目标用户主要在美国，
因此需要满足**加州自动续费法（2025-07 强化版）**等州法要求，包括：
**续费前通知（年订阅 15–45 天）、年度提醒、以及"线上注册可线上随时自助取消且不得阻碍"**。

4. Waffo Pancake 的订阅功能**是否已内置**上述机制？
   （例如：自动发送年度提醒邮件、客户自助取消门户 / 消费者门户）
5. 若是内置的，是否需要我们在配置时开启？
6. 若不是内置的，**哪些必须由我们在自己站点实现**？
   （我们希望在集成前就知道边界，而不是上线后才发现缺一环）

## 三、商品与结账页的措辞要求

7. 限制类目下，**商品名称/描述是否有措辞要求或禁用词**？
8. 是否需要在结账页显著标注"**娱乐用途 / 非预测**"之类的声明？
9. 贵司文档有 **AIGC 合规**页 —— 对我们这类「算法排盘 ＋ AI 生成解读」
   的产品，**是否有额外的披露要求**（如标注 AI 生成、保留生成记录等）？
10. 若我们提供商品页与报告的**文案样张**，能否**先做一次合规预检**？

## 四、提现与税务凭证

11. 结算为 CNY 提现至个人账户后，**能否提供对账单或收入证明**（供我们做个人所得税申报）？
12. Waffo 是否代扣代缴相关税费？还是由我们自行申报？

## 五、补充

13. 我们计划先在**测试模式**下完成集成与站点搭建，
    上线前提交**业务预审**。这个顺序是否符合贵司建议？
14. 若可以，我们希望**在预审阶段就提交站点与商品信息**做一次前置检查 ——
    请问走哪个入口？

感谢您的帮助。

顺祝商祺
Chen Jin
hello@mingcharts.com
MingCharts · mingcharts.com

---

# 二、English version（附在同一封邮件后面）

**Subject**: Re: Merchant application enquiry — Mainland China individual + metaphysics/culture AIGC subscription

Hello,

Thank you for the detailed reply — all three points are now clear and we are proceeding
accordingly. Four follow-up details, so we can build the integration right the first time:

## 1. Identity verification documents

1. Which documents are accepted for identity verification? Can a **mainland China
   resident ID card** be used directly?
2. If a passport is mandatory, please say so — it affects our preparation time.
3. Are identity verification and Business Details (KYB) review **two separate steps**?
   At what point is each submitted?

## 2. Subscription auto-renewal and cancellation (most important)

Our membership is a subscription ($9.90/month, $49/year) targeting mainly US users,
so it must satisfy the **California Automatic Renewal Law** (strengthened 2025-07) and
comparable state laws — including **pre-renewal notice (15–45 days for annual),
an annual reminder, and "online sign-up must allow online cancellation at will,
with no steps that obstruct or delay"**.

4. Does Waffo Pancake's subscription feature **already provide** these mechanics?
   (e.g. automatic annual reminder emails, a customer self-service cancellation portal
   / consumer portal)
5. If built in, do we need to enable them during configuration?
6. If not built in, **which parts must we implement on our own site**?
   We would rather know the boundary before integrating than discover a gap after launch.

## 3. Product and checkout page wording

7. Under the restricted category, are there **wording requirements or prohibited terms**
   for product names/descriptions?
8. Must the checkout page display a notice such as "**for entertainment purposes /
   not prediction**"?
9. Your docs include an **AIGC compliance** page — for a product that is
   "algorithmic charting + AI-generated interpretation", are there **additional disclosure
   requirements** (labelling AI-generated content, retaining generation records, etc.)?
10. If we provide **sample copy** for the product page and report, could you run a
    **pre-check** on it?

## 4. Payouts and tax records

11. After settling in CNY to a personal account, can you provide a **statement or
    income record** for our personal income tax filing?
12. Does Waffo withhold and remit the relevant taxes, or do we declare them ourselves?

## 5. Other

13. We plan to complete integration and site build in **test mode**, then submit for
    **business pre-review** before going live. Does that order match your recommendation?
14. If possible, we would like to submit our **site and product information for a
    pre-check at the pre-review stage** — which entry point should we use?

Thank you for your help.

Best regards,
Chen Jin · hello@mingcharts.com · MingCharts (mingcharts.com)

---

# 三、发送前检查

```
□ 1. 在原邮件线程里回复（Re:），不要新起一封 —— 保留上下文 ✓
□ 2. 发件人 hello@mingcharts.com（与首封一致）✓
□ 3. ★ 中文为主，英文附在下面（同首封的做法）✓
□ 4. 若首封答复里已经回答了某条，删掉该条再发（避免问重复）✓
□ 5. 保留归档
```

---

# 四、一句话

> **他们主动问"是否还有其他想了解的细节" —— 这是白送的追问机会，要用足。**
>
> **但只问四件会改变我们做法的事**：
> **① 身份证能不能用（决定办不办护照）** ·
> **② 订阅的自动续费/取消是否内置（决定我们要写多少代码，且加州 ARL 是硬要求）** ·
> **③ 商品页措辞与 AIGC 披露要求（直接可执行）** ·
> **④ 能否出对账单用于个税申报（中国侧）**
>
> **第 ② 条最值钱** —— 它把「加州自动续费法」这件美国最严的合规要求，
> **从"我们猜要不要自己实现"，变成"由平台明确告诉我们边界"** ✓
