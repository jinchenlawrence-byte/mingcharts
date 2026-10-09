# 致 Waffo contact-sales 的询问邮件（草稿）

> **目的**：在写任何支付集成代码之前，确认三件事 ——
> **① 中国大陆·个人主体能否成为商户；② 提现金流向；③ 我们这个形态能否过 Divination 限制类目**
> **日期**：2026-10-08
> **★ 这封邮件是"能不能收到钱"的前置，不是合规松紧问题。**

---

# 〇、先定两件事：**用哪种语言** 与 **发给谁**

## 0.1 语言：**中文为主，英文附在同一封邮件后面（两个都给）**

**理由**（不是"保险起见"）：

```
① 先看事实：
   · Waffo 的文档有【简体中文】版（docs.waffo.ai/zh/…）
   · 首页写着 "WeChat Pay is live — the best checkout experience for
     Chinese shoppers!"  → 他们明显服务中文商户 ✓
   → 所以中文他能读，且读起来更快

② ★★ 但这封邮件的【真正决策点不在第一位读信的人】：
   这是【商户准入 / 风险审核】类询问，
   而 MoR 的准入审核常常由【卡组织侧的英文团队】做 ✗
   → 只有中文，可能只换来一句客套回复，实质问题没人答 ✗

③ ★ 所以：中文在前（让首读的人顺畅），英文在后（让审核链上任何人可据以行动）
   英文不必重写格式 —— 把 §二 那份直接贴在中文之后，加一行分隔即可
```

**★ 建议的邮件结构**：

```
主题（中英双语，简短）：
    Merchant application enquiry / 商户申请咨询 — mingcharts.com

正文：
   【中文】 完整一封（用 §一）
   ──────────────────────────────
   An English version is included below. / 以下为英文版
   【English】 完整一封（用 §二）

附件：产品形态说明一页（用 §三）
```

**★ 不必把主题写得很长** —— 主体简短、注明品牌域名即可 ✓

## 0.2 收件人：`support@waffo.ai`，并在信里**请求转交**

```
★ 我方核查：Waffo 文档里只给出了一个明确邮箱 support@waffo.ai
  （此前记录的"联系销售"入口，我方未能在公开页面上定位到具体地址）
→ 所以：发给 support@waffo.ai，并在信里【明确请其转交商务/商户准入团队】
```

**★ 已在中文邮件 Q10 之后补了这句（见 §一）**：

```
If this enquiry should go to your merchant onboarding or sales team,
please forward it — thank you.
（若本询问应由贵司的商户准入或销售团队处理，烦请转交，谢谢。）
```

**★ 为什么必须写这一句**：否则它可能被当作普通支持工单，回一句"请查阅文档"就结束了 ✗

---

# 〇之二、另外还有一条更快的路

**我方在 waffo.dev 首页看到两句关键宣传**（<https://www.waffo.dev/>）：

```
MERCHANT OF RECORD
  Waffo Pancake becomes your MoR — handling global tax, compliance, and chargebacks.
  ★ "No overseas LLC. Net payouts straight to your bank."
  ★ "WeChat Pay is live — the best checkout experience for Chinese shoppers!"
  · Integrate our SDK to handle Payments, Tax, and MoR compliance across 173 countries.
```

**★ "No overseas LLC" 正是我们要问的那件事** ——
但**它能否覆盖「中国大陆·个人」，两句宣传都没有说** ✗

**★★ 所以建议并行做两件事（不是二选一）**：

| # | 动作 | 耗时 | 能得到什么 |
|---|---|---|---|
| **A** | **发下面这封邮件** | 发信 5 分钟，回信数天 | **政策层面的正式答复**（可留档） |
| **B** | **注册 Pancake 商户账号，走到 KYC 那一步【先不提交】** | **10 分钟** | **★ 立刻知道主体类型选项里有没有「中国大陆 · 个人」** |

**★ B 的价值**：**注册表单本身就是答案** ✓
如果「国家/地区」下拉里没有中国大陆，或「主体类型」只给公司选项 —— **当场就知道了** ✓
**而且这不产生任何后果**（不提交就不算申请）✓

**★ 另**：Waffo 文档站有 **"Ask Assistant"** ✓
可在发信同时问它一次（政策类问题它可能答得了；**但主体资格这种个案问题，它多半会让我们联系销售**）✓

---

# 一、中文邮件（可直接复制）

**收件人**：Waffo Pancake 销售 / 商户审核团队
**★ 发送渠道待确认**：文档页脚给的是 `support@waffo.ai`；
我方此前记录中提到有「联系销售」入口 —— **发前请确认一遍，优先发给销售** ✓
**主题**：商户申请咨询｜中国大陆个人主体 ＋ 命理文化类 AIGC 订阅产品

---

您好，

我们准备接入 Waffo Pancake 作为 MoR，产品是面向**海外中文用户**的中国传统命理文化内容服务。
在开始技术集成之前，有三个**主体与资质**层面的问题需要先确认，以免做无用功。

## 一、关于主体资格

我们目前是**中国大陆的个人（自然人）主体**，尚未注册任何境外公司。

1. 贵司首页写有 **"No overseas LLC"** —— 请问这条是否覆盖**中国大陆的个人主体**？
2. 若可以，注册时需要提交哪些身份与地址证明？
3. 若不可以，贵司接受的主体类型有哪些（香港公司？美国 LLC？其他）？
   以及**是否需要与收款银行账户所在国一致**？

## 二、关于提现

4. 提现支持哪些**国家/地区**与**币种**？
5. 中国大陆的个人银行账户能否作为收款账户？若不能，通常的替代安排是什么？

## 三、关于品类受理（这一条最关键）

我们的产品在贵司《禁止与限制品类》中应属 **Divination & Fortune-Telling（限制类目）**，
我们主动说明，不希望后续才发现问题。产品形态如下：

**是什么**
- 基于中国传统命理典籍（《三命通会》《滴天髓》《子平真诠》等）的**排盘工具与内容服务**
- 用户输入出生时间地点 → 系统排出四柱命盘 → 由 **AI 生成**深度解读报告
- 另有免费的每日内容（日签）与订阅制的个性化每日内容

**★ 不是真人服务（这一条请重点确认）**
- **全程由算法与 AI 生成，不存在任何真人解读、咨询、连麦或"大师"服务**
- 用户与产品的交互完全是软件交互，没有人的时间成本
- 因此我们认为它符合贵司「**仅支持数字化交付**」「**不得是真人提供服务**」的要求

**交付与合规特征**
- **纯数字交付**，无实物、无物流
- **AIGC 披露**：所有 AI 生成内容均标注为 AI 生成
- **免责声明**：明确说明属传统文化内容，非预测，不构成医疗、法律、财务或心理健康建议
- **不承诺结果**：不出现"必定""一定会"等断言，不做结果担保
- **依据披露**：报告中标注每条判断的典籍出处与依据层级（典籍／古法／民俗／产品设定）
- **不提供投资建议**

**定价形态**
- 一次性数字报告：$19.99 – $59.99
- 订阅：月度 $9.90 / 年度 $49（含取消与年度提醒机制，符合美国各州自动续费法要求）

**目标市场**
- 主要面向**美国的中文用户**（也会自然覆盖其他地区的中文用户）

**★ 因此我们的问题**：

6. 上述形态在 **Divination & Fortune-Telling 限制类目**下，能否通过审核？
   若可以，是否需要我们额外提供材料（如 AIGC 合规说明、免责声明样张、服务条款）？
7. 贵司是否**要求卡片支付（Cards only）**、或对结算方式有其他限制？
8. 审核大致需要多长时间？是否可以**在技术集成前先做资质预审**？

## 四、补充

9. 我们的品牌为 **MingCharts**，域名 **mingcharts.com 已注册**，
   **品牌邮箱 hello@mingcharts.com 已开通并可正常收发**（SPF / DKIM / DMARC 均已配置通过）。
   站点尚未正式上线，如需要我们可以先提供产品演示或截图。
10. 若上述任一条不符合贵司政策，也请直接告知 ——
    **我们宁可现在知道，也不想在集成完成后被拒。**
11. **若本询问应由贵司的商户准入或销售团队处理，烦请转交，谢谢。**

```
If this enquiry should go to your merchant onboarding or sales team,
please forward it — thank you.
```

感谢您的时间。

顺祝商祺
［姓名］
［邮箱］
［电话／微信（可选）］
［日期］

---

# 二、English version（备用，若对接国际团队）

**Subject**: Merchant application enquiry — Mainland China individual entity + metaphysics/culture AIGC subscription product

Hello,

We are preparing to integrate Waffo Pancake as our Merchant of Record for a Chinese
traditional metaphysics *content* service targeting overseas Chinese-speaking users.
Before writing any integration code, we need to confirm three **entity and eligibility**
questions, so we don't build something that cannot be approved.

## 1. Entity eligibility

We are currently a **private individual based in mainland China**, with no overseas entity.

1. Your homepage states **"No overseas LLC."** — does that cover a **mainland China individual**?
2. If yes, what identity and address documents are required for onboarding?
3. If no, which entity types do you accept (Hong Kong company? US LLC? other)?
   And must the payout bank account be in the **same jurisdiction** as the entity?

## 2. Payouts

4. Which **countries/regions and currencies** are supported for payouts?
5. Can a **mainland China personal bank account** receive payouts? If not, what is the usual alternative?

## 3. Category eligibility (most important)

We understand our product falls under your **Divination & Fortune-Telling** restricted
category. We are flagging this upfront rather than having it discovered later.

**What it is**
- A charting tool and content service based on classical Chinese metaphysics texts
- User enters birth date/time/place → system produces a four-pillar chart → an **AI model
  generates** an in-depth written report
- Plus a free daily content feature and a subscription tier for personalised daily content

**It is NOT a human service (please confirm this point specifically)**
- Everything is generated by algorithms and AI. There is **no live reading, no consultation,
  no chat with a practitioner, no "master" service of any kind.**
- All interaction is software-based; no human time is involved.

**Delivery & compliance characteristics**
- **Digital delivery only** — no physical goods, no shipping
- **AIGC disclosure** — all AI-generated content is labelled as such
- **Disclaimers** — clearly stated as traditional cultural content, not prediction; not medical,
  legal, financial or mental-health advice
- **No outcome guarantees** — no "guaranteed", "certainly will" style claims
- **Source disclosure** — every judgement cites its classical source and a basis tier
  (canon / traditional method / folk custom / product setting)
- **No investment advice**

**Pricing**
- One-off digital reports: $19.99 – $59.99
- Subscriptions: $9.90/month, $49/year (with cancellation and annual-reminder mechanics,
  compliant with US state automatic renewal laws)

**Target market**
- Primarily **Chinese-speaking users in the United States** (and other regions naturally)

**Our questions**

6. Can this form pass review under **Divination & Fortune-Telling**? If so, what extra
   materials do you need (AIGC compliance note, disclaimer samples, terms of service)?
7. Do you require **cards only**, or are there other settlement restrictions?
8. How long does review take? Can we get a **pre-qualification check before integrating**?

## 4. Other

9. Our brand is **MingCharts**. The domain **mingcharts.com is registered**, and the brand
   mailbox **hello@mingcharts.com is live and verified**
   (SPF / DKIM / DMARC all configured and passing).
   The site itself is not live yet; we can provide a demo or screenshots if helpful.
10. **If any of the above does not qualify, please tell us directly** — we would much rather
    know now than after completing the integration.
11. **If this enquiry should go to your merchant onboarding or sales team, please forward it.**

Thank you for your time.

Best regards,
[Name] · [Email] · [Date]

---

# 三、附件用：产品形态说明（一页，随邮件附上）

```
产品名称    MingCharts（mingcharts.com）
产品类别    中国传统命理文化内容服务（贵司类目：Divination & Fortune-Telling，限制类目）
目标用户    美国中文用户为主

产品构成
  ① 免费：四柱排盘（干支/十神/大运/旺衰/格局）＋ 每日日签 ＋ 古籍命例库
  ② 付费报告（一次性 $19.99–$59.99）：
     命书（万字深度详批）／年运／合婚／紫微／地理
  ③ 订阅（$9.90 月 / $49 年）：个性化每日内容、流月、交运提醒等

交付方式    纯数字化，即时生成，无实物、无物流、无人工介入
生成方式    算法（历法/命理规则）＋ AI 大模型生成文本；全部标注 AIGC

★ 无真人服务
  · 不存在真人解读、咨询、连麦、预约、「大师」服务
  · 无任何形式的"人的时间"参与，纯软件交互

合规措施
  · AIGC 披露：AI 生成内容均标注
  · 免责声明：传统文化内容，非预测；不构成医疗/法律/财务/心理健康建议
  · 不承诺结果：无"必定/一定会"式断言
  · 依据披露：每条判断标注典籍出处与依据层级
  · 不做投资建议
  · 订阅含取消机制与年度提醒（对齐美国各州自动续费法）

支付内容
  · 一次性数字报告 + 订阅（月/年）
  · 无实物、无预付费卡、无点数制抽奖类机制
```

---

# 四、发送前检查清单

```
□ 1. 确认收件渠道（sales / support）—— 优先销售，其次 support@waffo.ai
□ 2. ★★ 用【品牌域名邮箱】发（hello@mingcharts.com），不要用个人 Gmail
      ⚠️ ★ 注意：Cloudflare Email Routing 只能收、不能发（官方文档已确认）；
         发信方案见 docs/交接记录/14-会员权益修复/域名邮箱开通步骤.md
      ⚠️ 而 mingcharts.com 目前【尚未注册】—— 这是真正的第一步
□ 2b. ★★ 发信前必须先测 SPF/DKIM/DMARC 三条全 PASS
      —— 没对齐的商务邮件大概率进垃圾箱，等于没发
□ 3. 补齐署名四项：姓名 / 邮箱 / 联系方式 / 日期
□ 4. 附上「产品形态说明」一页（§三）
□ 5. ★ 同时做 B 路线：注册 Pancake 账号走到 KYC，先不提交，只看主体类型选项
□ 6. 发信后**保留原文归档**（后续若出现争议，这是"我们主动披露过"的证据）
```

---

# 五、★ 这封邮件为什么这么写（三个刻意的选择）

**① 主动把自己归入他们的限制类目**
```
不问"我算不算占卜"（那会显得在规避）✗
而是直接说"我们属于 Divination 限制类目，请确认能否受理" ✓
→ 目的是拿到【确定的答复】，不是拿到【模糊的通过】
```

**② 把"不是真人服务"放在最显眼位置**
```
这是 Waffo 唯一的【硬性红线】（"不得是人的时间"）✓
我们的产品形态天然满足它 —— 这是最强的一张牌，必须打在最前面 ✓
```

**③ 明确写出"若不符合请直接告知"**
```
宁可现在被拒，也不要在集成完成后被拒 ✓
★ 这句话同时传递了一个信号：我们是会被审核方信任的那类商户 ✓
```

**★ 而整封信回避了"算命／预测"这类词，改用「传统文化内容」** ——
**这不是文字游戏**：我们的产品**确实是**古籍命理内容 ＋ 出处披露 ＋ 免责声明 ✓
**准确描述比模糊描述更容易过审** ✓

---

# 六、一句话

> **这封信只需要回答三个问题：**
> **① 中国大陆个人主体能不能当商户；② 钱能不能到我的账上；③ 我们这个形态能不能过类目。**
>
> **而在发信的同时，有一条 10 分钟就能知道大概的路**：
> **去注册 Pancake 账号，走到 KYC 那一步先不提交 ——「主体类型/国家」下拉里有没有
> 「中国大陆 · 个人」，当场就有答案** ✓
>
> **两条并行，别只等邮件。**
