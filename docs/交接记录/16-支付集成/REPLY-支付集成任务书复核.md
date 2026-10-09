# 复核报告：Waffo 支付集成任务书（**发出前复核**）

> **致**：我方（用户）
> **发自**：DeepSeek 侧
> **对象**：`docs/交接记录/16-支付集成/HANDOFF-Waffo支付集成.md`（812 行 / 36.5 KB，写于 2026-10-07）
> **日期**：2026-10-10
> **★ 性质**：这是**任务书本身**的复核 ✗ —— 不是对实现的复核 ✓
> **目的**：在【发给 TraeCode 之前】把缺陷修掉 ✓
>
> ## 结论先行
> **整体质量很高** ✓：三个坑（raw body / 45 分钟 / 幂等靠唯一约束）抓得准 ✓，
> §六 的 entitlement 衔接讲清了"本任务为什么存在"✓，
> §5.8.0 的 `payment_method` 缺 `'card'` 是真坑且核实无误 ✓，
> §七 断言要求【行为断言】而非文本检查 ✓，还主动要求交付【联调实测记录】✓。
>
> **但有 1 处【自相矛盾的硬缺陷**✗ + 1 处【注入措辞与自身规则冲突】**✗ + 1 处【可定论却推给实现者】**✗
> —— 详见 §二 / §三 / §四。**建议修完再发** ✓

---

# 一、我方已核实【正确】的部分

```
✓ schema.sql 行号「第 49 行起」—— 实测 payments 表就在第 49 行 ✓
✓ payment_method CHECK 确实【缺 'card'】（schema.sql:55）：
    CHECK (payment_method IN ('wechat', 'alipay', 'stripe'))   ← ★ 任务书 §5.8.0 抓得对 ✓
✓ payment_type CHECK = ('single','monthly','yearly','lifetime') ✓ 与任务书一致 ✓
✓ status CHECK = ('pending','paid','failed','refunded') ✓ 与任务书一致 ✓
✓ transaction_id TEXT【无唯一约束】✓ 任务书说对了 ✓
✓ entitlement.ts 的 MOCK_ 排除逻辑确实存在（:93-96）✓ 任务书 §六 说对了 ✓
✓ /api/checkout · /api/verify-payment · /api/webhooks/waffo 【均不存在】✓ 确为新建 ✓
✓ SDK（@waffo/pancake-ts）尚未安装 ✓
✓ §4.2 引用的《商品文案-Waffo结账页.md》存在 ✓（5.8 KB）
✓ unlock/route.ts:86 已注明「不再写 MOCK_ 支付流水」✓ 与 §八 一致 ✓
✓ orderMerchantExternalId 长度：`MC-${uuid}-${ts}` = 53 字符 ✓ < 128 ✓
```

---

# 二、★★★★★ 必须修：`payments` 表【没有能装业务单号的列】

## 2.1 缺陷

```
★ schema.sql:49-63 实测，payments 的全部列：
   id · user_id · chart_id · amount · payment_type · payment_method
   · status · transaction_id · paid_at · created_at
→ ★★★★★ 【没有任何列能装 orderMerchantExternalId】✗
```

**★★★ 而任务书【自己提了两条依赖它的要求】** ✗：

```
★ §八「必须避免」最后一条：
   ✅ orderMerchantExternalId 必须能从我们的库里反查回用户（兜底对账依赖它）
   → ★★★ 但没有那一列，「从库里反查」【无法实现】✗

★★ §5.4 兜底对账 ② ：
   「先查我们的 payments 表：已有该单号 → 直接返回"已解锁"（快路径）」
   → ★★★ 没有那一列，「按该单号查」【无法实现】✗
   → ★★★★ 而 transaction_id 存的是 PAY_xxx ✗ 不是 MC-xxx ✗ 两者不同 ✗
```

**→ ★★★★★ 即：任务书的【要求】与【SQL 变更清单】不一致** ✗ —— 这是硬缺陷 ✓

## 2.2 修法（写进 §5.8）

```sql
-- 2) ★★★ 新增：我们的业务单号（兜底对账与反查用户都依赖它）
ALTER TABLE payments ADD COLUMN IF NOT EXISTS order_merchant_external_id TEXT;
CREATE INDEX IF NOT EXISTS idx_payments_omer ON payments(order_merchant_external_id);
-- ★★ 同样必须【同步 schema.sql】（单一事实源，§8.5.1）—— 不要只改数据库 ✗
```

**★ 并请同步修改这些位置**：
```
· §5.3 写 payments 时【增加这一列】（= event.data.orderMerchantExternalId）✓
· §5.4 快路径改为「按 order_merchant_external_id 查 payments」✓
· §5.4 ④ 补写 payments 时【也要写这一列】✓
· §七 ③ 权益衔接断言的示例行【加上这一列】✓
· §九 验收标准【加一条】：「payments 已含 order_merchant_external_id，且能从它反查回用户」✓
```

---

# 三、★★★★ 必须修：牙口注入的措辞与它自己的规则冲突

## 3.1 缺陷

```
★ §七 ⑥ 原文：
   「注入：把幂等的去重判断改成【永不去重】
     （如注释掉那行判断的【条件部分】，保留文本）」

★★ 而 §八/§七 的硬要求是（§8.6.7）：
   「牙口要用【文本不变、行为变坏】的改法，不要用"整段注释掉"」
→ ★★★★★ 【自相矛盾】✗ —— "注释掉条件部分"【必然改动文本】✗（加了 `//` ✗）
```

**★★ 而且"保留文本"这个说法本身有歧义** ✗：
```
★ 它可能指"保留那行代码的其余文本"✗ 也可能指"不要注释"✗
→ ★★★ 而 §8.6.7 的"文本不变"有【明确含义】✗：
   指【断言用来判定的那段文本仍然存在】✗ —— 从而验证断言【不是靠 grep 文本过关】✓
```

## 3.2 修法（给出具体注入点）

```
★★★ 正确做法：改【逻辑】而【保持断言会 grep 的那段文本】✗

若幂等实现是 Supabase 的 upsert：
   注入前： .upsert(row, { onConflict: 'event_type,event_id', ignoreDuplicates: true })
   注入后： .upsert(row, { onConflict: 'id',                  ignoreDuplicates: true })
   → ★★ 文本里 `event_type` 与 `event_id`【仍然存在】✓ 但行为已变 ✗ → 断言必须翻红 ✓

若幂等实现是「插入 processed_webhooks」：
   注入前： await db.from('processed_webhooks').insert({ event_type, event_id })
   注入后： await db.from('processed_webhooks').insert({ event_type, event_id: event_id + '-x' })
   → ★★ 同上：字段名仍在 ✓ 但永不冲突 ✗ → 断言必须翻红 ✓

★★ 无论选哪个，都请在回执里贴【注入前后的实际行内容】✗ 并确认注入有效（§8.6.7）✓
```

---

# 四、★★★ 建议：`chart_id` 不要"让实现者判断"，我方【有定论】

```
★ §5.3 原文：「若 payments 表需要 chart_id 而 webhook 里没有：
   可以留空（并说明），或按 userId + 最近一次命盘关联（你判断并说明）」
→ ★★★ 让实现者自己判断 ✗ 与 §8.5.1（判定应集中、单一事实源）的精神相悖 ✗
```

**★★★★★ 而我方可以直接定论 —— 有代码证据**：

```
★ entitlement.ts:119 的查询是：
    .select('payment_type, status, transaction_id')
→ ★★★★ 【它根本不读 chart_id】✗
★★ 且 schema 里 chart_id 是 `REFERENCES charts(id) ON DELETE SET NULL` ✓
    → 允许 NULL ✓
→ ★★★★★ 所以定论：【留 NULL】✓ 不需要任何关联 ✓
★★ 请在 §5.3 把这句话改成【明确要求】✗ 并附理由（entitlement 不读该列 ✓）
```

---

# 五、★★★ 建议：`successUrl` 直接带上业务单号（跨设备兜底）

```
★ §5.6 ① 原文：「从 URL 取 orderMerchantExternalId（★ checkout 时前端要保存它，例如 sessionStorage）」
→ ★★★ 用 sessionStorage 有个真问题 ✗：
   用户可能在【别的设备/别的浏览器】完成支付 ✗（如手机上付、回到电脑看）
   → sessionStorage 为空 ✗ → 成功页【兜底对账失效】✗
```

**★★★★★ 而更稳的做法几乎零成本** ✗：
```
★ 我们在【创建会话时】就已经生成了那个单号 ✓
★★ 而 successUrl 也是【创建会话时固定】的 ✓
→ ★★★ 所以直接把单号拼进去 ✗：
    successUrl: `${APP_URL}/checkout/success?ref=${orderMerchantExternalId}`
→ ★★★★ 收益：跨设备也能兜底 ✓ 不依赖 sessionStorage ✓ 且 URL 可分享/可回访 ✓
★★ 请把 §5.6 ① 改为「从 URL query 取 ref；sessionStorage 仅作可选补充」✓
```

---

# 六、★★ 需补：一条来自 Waffo 2026-10-09 回信的新前置

**任务书写于 10-07 ✗，而 Waffo 在 10-09 的回信里更正/补充了三件事** ✗：

```
① ★★★ 审核对象是【已上线、可公开访问的网站】✗
   —— 不是方案说明或演示截图 ✗
   → ★★★★ 而任务书 §〇-1 只说"先在测试模式跑通，不提交审核"✓
     【没写"生产审核需要网站先上线"这个前置】✗
   → ★★★★★ 建议在 §四（站外前置）补一条明确顺序 ✗：
     ① 注册建店 ✓【已完成】→ ② 测试模式集成（不需审核 ✓）→
     ③ ★网站上线（定价页/条款/隐私/页脚客服 ✓）→ ④ 提交审核（1–3 工作日）→ ⑤ 开通生产
   ★ 并注明：「Production Webhook URL 本轮不要填」✓ 的理由（过审才投递 ✓）已在 §4.3 ✓

② ★★ 企业主体【走不通】✗ —— 后台只有个人主体表单 ✗ 生产环境无任何公司完成认证 ✗
   → ★★★ 对【本任务】无影响 ✓（§〇-3 已说"不提交 KYB、不动 Business Details"✓）
   → ★★★★ 但建议在 §四 记一笔 ✗ 免得后来者以为可以走公司 ✓

③ ★★ 提现额度：单笔必须 > 10 USD 且 ≤ 7000 USD ✗（与渠道无关 ✓ 银行卡也适用 ✓）
   → ★★★ 不影响集成 ✓ 但影响【运营与定价规划】✓
   → ★★★★ 建议【不在本任务书里写】✗ 而是记进 `docs/收款接入方案.md` ✓（那才是运营文档 ✓）
```

---

# 七、三处外部事实：我方无法离线核实，请要求附出处

```
★ 这三条都是【外部事实】✗，我方无法用代码验证 ✗：
   ① 测试卡号 `4576 7500 0000 0110` / 拒付卡 `4576 7500 0000 0220` ✗
   ② 「时间容差 45 分钟」的官方原文 ✗
   ③ 客户门户两处 URL 不一致（`checkout.waffo.ai/.../portal` vs
      `pancake.waffo.ai/consumer/portal/login`）✗

★★ 任务书已经做对了一件事 ✓：§3.3 与 §3.6 都要求
   「在回执里写明实际用的是哪条路并附实测证据」✓ —— 这很好 ✓

★★★ 但我方建议再补一条通用要求 ✗（§8.6.2 依据分级）：
   「凡引用 Waffo 官方文档的事实，请在回执里附【出处 URL + 抓取日期】✓；
     凡无法在离线断言里验证的，标注为【需联调实测】✗ 不得写成已核实 ✗」
```

---

# 八、结论

| # | 项 | 结果 |
|---|---|---|
| 1 | §5.8.0 的 `payment_method` 缺 `'card'` | ✓ **实测确认，抓得对** |
| 2 | §三 三个坑（raw body / 45 分钟 / 幂等唯一约束） | ✓ 准 |
| 3 | §六 entitlement 衔接（本任务存在的理由） | ✓ 讲清了 |
| 4 | §七 要求【行为断言】而非文本检查 | ✓ 符合 §8.6.7 |
| 5 | §九 要求交付【联调实测记录】（含"删掉 payments 再补回"） | ✓ 很有价值 |
| 6 | §4.2 要求 `productId` 做映射不硬编码 | ✓ 好设计 |
| 7 | schema.sql 行号 / 各 CHECK 值 / MOCK_ 排除逻辑 | ✓ **逐条核实一致** |
| 8 | ★★★★★ **`payments` 缺 `order_merchant_external_id` 列** | ✗ **硬缺陷，§二** |
| 9 | ★★★★ **牙口注入措辞与"文本不变"冲突** | ✗ **需修，§三** |
| 10 | ★★★ **`chart_id` 推给实现者判断**（我方有定论：留 NULL） | ✗ 建议改为明确要求，§四 |
| 11 | ★★★ **`successUrl` 未带业务单号**（跨设备兜底失效） | ⚠️ 建议，§五 |
| 12 | ★★ **未记「网站上线是审核前置」** | ⚠️ 建议补，§六 |
| 13 | ★ 三处外部事实需附出处 | ⚠️ 建议补通用要求，§七 |

**★ 总体：修完 §二 / §三，（可选）采纳 §四 / §五，即可发出** ✓

---

# 九、一句话

> **这份任务书写得很好** ✓ —— 三个坑抓得准 ✓ `payment_method` 缺 `'card'` 是真坑且核实无误 ✓
> §六 讲清了"本任务为什么存在"（把账接上 ✓），§七 要求行为断言而非文本检查 ✓，
> 还主动要求交付【联调实测记录】✓ 包括"删掉 payments 再让兜底补回"这种很有价值的验证 ✓
>
> **★★★★★ 但有一处【自相矛盾的硬缺陷】** ✗：
> **`payments` 表里【没有能装 `orderMerchantExternalId` 的列】** ✗ ——
> 而任务书【自己】在 §八 要求「必须能从我们的库里反查回用户」✗、
> 在 §5.4 要求「先查 payments 表：已有该单号 → 快速返回」✗
> → **没有那一列，这两条都【无法实现】** ✗
> **→ 请按 §二 补 `order_merchant_external_id` 列 ＋ 索引 ＋ 同步 schema.sql** ✓
>
> **★★★★ 另有一处【注入措辞与自身规则冲突】** ✗：
> §七 ⑥ 写「注释掉条件部分，保留文本」✗ —— 但"注释"**必然改文本**✗，
> 与 §8.6.7 的「文本不变、行为变坏」**直接矛盾** ✗
> **→ 请按 §三 改成【改逻辑而保留断言会 grep 的字段名】** ✓ 并贴注入前后实际行内容 ✓
>
> **★★★ 以及一处【可定论却推给实现者】** ✗：
> §5.3 让实现者自己判断 `chart_id` 怎么填 ✗ ——
> **而我方有代码证据可以定论**：`entitlement.ts:119` 的查询是
> `.select('payment_type, status, transaction_id')` ✗ —— **它根本不读 `chart_id`** ✓
> **→ 定论：留 NULL** ✓ 请改成明确要求 ✗
>
> **★★★★ 最后一条建议几乎零成本但收益明显** ✗：
> **把业务单号直接拼进 `successUrl`** ✓（`?ref=MC-...`）——
> 因为**用户在手机上付、回到电脑看**是完全可能的情形 ✗，
> 而 `sessionStorage` 那时是空的 ✗ → **兜底对账会失效** ✗
> **→ 创建会话时我们手上就有那个单号，拼进 URL 即可** ✓
