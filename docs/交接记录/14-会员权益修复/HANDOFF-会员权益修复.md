# 任务交接书：会员权益修复 ＋ 归日健壮性补强

> **交接对象**：TraeCode
> **纪律基准**：`docs/验收标准与红线.md`（**先读 §8.5.1 / §8.6.6 / §8.6.7**）
> **来源**：
> · `docs/交接记录/13-日运日签/P0-会员权益与单次报告冲突.md`（用户发现）
> · `docs/订阅权益设计.md`（补权益方案，用户已认可）
> · `docs/交接记录/13-日运日签/REPLY-统一晚子时与紫微P0验收.md` §三（`'24'` 盲区）
> **本任务书自包含。**

---

# 〇、先读四条

1. **用户已拍板：订阅不含报告。** 订阅只给「日运＋流月」等**持续型**内容。
   本任务书同时把**订阅到底给什么**定死（§1.2 的 grant 表）——因为修权益必须先有这张表。

2. **★ 修法的主线是「权益数据化」** —— 现在权益只存在于中文 `desc` 里，
   所以它能跑偏而没人发现。**做成 `grants` 数据后，才能被断言守护。**

3. **★ 断言要同时盖「价格」与「权益」**（§8.6.6）——
   上一轮我断言的 9 个价格**全部正确**，而权益完全跑偏，`verify` 却是绿的。

4. **顺带修 `% 24`（1 字符）＋ 补一个整点用例** —— 见 §三。
   **这一处的要害不是代码，是测试替生产挡了缺陷（§8.6.7-二）。**

---

# 一、P0-1：会员权益与单次报告冲突

## 1.1 现状与后果（已核）

```
命书单次 $29.99      vs      月度会员 $9.90（深度报告不限次数）
→ 买 1 份都不如开会员 → 价格表上 6 个报告 SKU 全部作废
→ 客单价被压到 $49/年封顶，付费墙在结构上无法成立
```

**用户可见的表述**（都必须改）：

| 位置 | 现文案 |
|---|---|
| `pricing.ts:64` | `member_monthly.desc = '按月订阅，深度报告不限次数'` |
| `pricing/page.tsx:75` | 会员卡 `desc = '重度用户更划算，命书不限次数'` |
| `pricing/page.tsx:79` | `'本账号命书报告不限次数'` |
| `pricing/page.tsx:99-100` | FAQ「会员期内命书不限次数是什么意思？」→「…所有命盘都可以免费解锁完整命书，不用每次 $29.99 单独购买」 |
| `pricing/page.tsx:222` | 对比表 `['不限次数', false, false, true]` |
| `unlock/route.ts:22` | `// 会员期内免单次解锁费用（命书不限次数）` |

**而根因在判定逻辑**：`entitlement.ts:34`

```ts
return ent.member || ent.ownedSkus.has(sku) || ent.ownedSkus.has('bundle3')
//     ↑ 会员 = 万能通行证
```

**→ 文案与实现是一致的，一致地偏离了设计。** 光改文案不够。

## 1.2 ★ 数据模型：把「可购买的」与「可访问的」分开

**问题**：现在 `canView(ent, sku: SkuId)` 用「可购买的东西」当「可访问的权限」，
**而会员根本不是某个 SKU 的拥有者** —— 所以只能全放行。

**改法**：

```ts
/** 可购买的东西 */
export type SkuId =
  | 'fatebook' | 'annual_report' | 'hemun' | 'ziwei_deep' | 'geo' | 'bundle3'
  | 'member_monthly' | 'member_yearly' | 'ask_pack'

/** 可访问的能力 —— ★ 与 SkuId 分离 */
export type GrantId =
  // 报告类（单次购买解锁）
  | 'fatebook' | 'annual_report' | 'hemun' | 'ziwei_deep' | 'geo'
  // ★ 订阅类（持续型，会员解锁）
  | 'daily'          // 个性化日运（每日）
  | 'liuyue'         // 流月提示（每月）
  | 'jiaoyun'        // 交运提醒（大运切换节点）
  | 'multi_chart'    // 多命盘（3–5 个）
  | 'similar_cases'  // 相似古籍命例对照
  | 'history'        // 历史日运回看
  // 追问类（V2）
  | 'ask'

/** ★ 两组常量，供断言引用 */
export const REPORT_GRANTS: GrantId[] =
  ['fatebook', 'annual_report', 'hemun', 'ziwei_deep', 'geo']

export const SUBSCRIPTION_GRANTS: GrantId[] =
  ['daily', 'liuyue', 'jiaoyun', 'multi_chart', 'similar_cases', 'history']
```

**SKU 的 grants 表（照抄）**：

```ts
fatebook:       grants: ['fatebook']
annual_report:  grants: ['annual_report']
hemun:          grants: ['hemun']
ziwei_deep:     grants: ['ziwei_deep']
geo:            grants: ['geo']
bundle3:        grants: ['fatebook', 'ziwei_deep', 'geo']
member_monthly: grants: SUBSCRIPTION_GRANTS     // ★ 不含任何报告
member_yearly:  grants: SUBSCRIPTION_GRANTS     // ★ 同上
ask_pack:       grants: ['ask']                // V2
```

**⚠️ 注意**：`grants` 里的订阅类能力**功能尚未实现** —— 这是**刻意的**：
**数据模型先立对，功能随后补**。届时不必再动权益结构 ✓

## 1.3 `canView` 改为查 grants

```ts
/**
 * 唯一门禁判定。
 * ★ ENFORCE 关闭时无条件放行（支付未接入，见 HANDOFF-变现管道 §1.1）。
 * 开启后：
 *   · 会员：其 SKU 的 grants 必须覆盖该 grant 才放行 —— ★ 不再是万能通行证
 *   · 单项：任一所购 SKU 的 grants 覆盖该 grant 即放行
 */
export function canView(ent: Entitlements, grant: GrantId): boolean {
  if (!ENTITLEMENT_ENFORCE) return true
  const sources = [...(ent.memberSkus ?? []), ...ent.ownedSkus]
  return sources.some((id) => SKUS[id].grants.includes(grant))
}
```

**`Entitlements` 相应调整**：把 `member: boolean` 换成/补上
**`memberSkus: SkuId[]`**（如 `['member_yearly']`）——
因为**权益由"持有哪个会员 SKU"决定**，而不是一个布尔 ✓

> **⚠️ 同时把 `bundle3` 的隐式放行写进 grants** ——
> 现在的 `ent.ownedSkus.has('bundle3')` 特判可以删掉，因为它已在 `bundle3.grants` 里 ✓

**并加注释**（§8.4.4）：说明"订阅不含报告"是刻意设计，理由指向 `定价方案.md` §4.2。

## 1.4 清理全部用户可见文案

| 文件:行 | 改成 |
|---|---|
| `pricing.ts:64` | `desc: '个性化日运（每日）＋ 流月提示，持续更新'` |
| `pricing.ts:69` | 年会员 desc 同口径 |
| `pricing/page.tsx:75` | 会员卡 desc 同上 |
| `pricing/page.tsx:79` | 权益列表改为**订阅类能力**（日运/流月/交运提醒/多命盘/相似命例） |
| `pricing/page.tsx:99-100` | FAQ 改为：「会员含什么？——日运与流月等持续内容；**报告需单独购买**」 |
| `pricing/page.tsx:222` | 对比表「不限次数」一行**删除**，改为逐项列出订阅类能力 |
| `unlock/route.ts:22` | `// 会员不解除命书锁定（订阅不含报告，见 定价方案 §4.2）` |

**⚠️ 文案纪律**：**不得出现"不限次数"、"无限"** ——
**这正是本次缺陷的成因**（边际成本不可控 + 必然侵蚀单次商品）。

## 1.5 修支付流水金额

```ts
// unlock/route.ts:74（注释已改对，但代码仍是旧价）
74: // 记录支付流水（会员免单，非会员按 pricing.ts 的 fatebook 价。MVP模拟…）
79:     amount: 19.9,        // ★ 应为 SKUS.fatebook.priceUSD
```

**改为** `amount: SKUS.fatebook.priceUSD` ✓
（注释说"按 pricing.ts 的 fatebook 价"而代码硬编码 `19.9` —— 注释与代码互相矛盾。）

## 1.6 ★ 断言扩展（三条 ＋ 牙口）

**扩 `scripts/test-pricing-accept.mjs`**：

```
① 价格表（已有 9 项）—— 保留不动

② ★ 权益表断言（新增）
   · 逐 SKU 比对 grants 与上方表格
   · ★★ 核心守护：member_monthly / member_yearly 的 grants
        与 REPORT_GRANTS 的【交集必须为空】
        —— 这条直接把「订阅不含报告」变成可验证的
   · bundle3.grants 恰为 ['fatebook','ziwei_deep','geo']
   · 每个 SKU 的 grants 成员都必须 ∈ GrantId 全集（防笔误）

③ ★ 裸数字金额扫描（新增，补我上轮漏掉的形态）
   · 扫描 src 下 `amount:\s*\d` / `price:\s*\d` 的字面量 → 应为 0 命中
   · 理由：我上轮的判据是 /¥\s*\d/（带人民币符号的文案），
     而实际残留的是【裸数字】amount: 19.9 —— 判据只盖了一种形态（§8.6.3）

④ 牙口（§8.6 / §8.6.7）
   · 把 member_monthly.grants 加回任一报告 grant → ② 的核心守护必须翻红
   · 在 src 里塞一个 `amount: 1` → ③ 必须翻红
   · ★ 注入后【先确认输出真的变了】，再判定断言是否红（§8.6.7-一）
```

---

# 二、P0-2：会员暂时标记**「即将推出」**

**理由**：订阅的真实价值（日运）**功能尚未实现**（Part B 主线在做）。
**现在把会员摆上价格页出售 = 卖空货。**

**改法**：

```
· /pricing 会员卡显示【即将推出】徽标，CTA 禁用
· 或整个会员区折叠，附一句「日运功能上线后开放」
· ★ 报告类 SKU 【照常可售】—— 它们的功能是齐的
```

**解锁时机**：日运功能上线后，**去掉徽标即可**（权益结构不必再动）✓

---

# 三、P1：归日健壮性补强（两处，各 1 行）

## 3.1 `dailyDateInZone` 加 `% 24`

```ts
// daily.ts 现状
const hour = get('hour')   // 注释已写「个别环境为 '24'」，但代码未防护
if (hour >= 23) { …日历日 +1… }
```

**若环境返回 `'24'` → `24 >= 23` 成立 → 午夜被推进一天** ✗

```ts
// 改为
const hour = get('hour') % 24      // '24' → 0，环境无关
```

**我方实测本环境返回 `'00'`（安全，9 个边界用例全对）**，
但 `hour12: false` 在不同 ICU/V8 版本下历史行为不一致 —— **这是环境相关的**。

## 3.2 ★ 补一个含 `00:00` 整点的子时对

**要害不在代码，在这里**：

```js
// test-dayboundary-accept.mjs:28 —— 辅助函数 atLocal 里
let hh = g('hour'); if (hh === 24) hh = 0     // ← 辅助函数归一化了 '24'
// 而生产 dailyDateInZone 没有 → 【测试替生产挡掉了这个缺陷】

// 而且用例是 [[…,23,30],[…,0,30]] —— 两头都避开整点
// 而 '24' 只在【恰好午夜 00:00】出现 → 双重盲区
```

**改法**：

```
① NOW_PAIRS 增加一对：[[…, 23, 0], […, 0, 0]]   ← 含 23:00 与 00:00 整点
② 断言里【显式比对 dailyDateInZone 在 00:00 整点的返回】，
   使"生产缺容错"能被抓到（辅助函数的归一化只用于"定位时刻"，不得代替断言）
```

---

# 四、回归要求

| # | 要求 |
|---|---|
| 1 | `ENTITLEMENT_ENFORCE` **仍为 false** —— 本轮**不得真开拦截**（支付未接入） |
| 2 | **紫微/合婚/地理/批命仍可正常访问**（四 API HTTP 200）—— 贴实测 |
| 3 | `/api/paipan` **仍不下发付费内容** —— 贴响应 JSON |
| 4 | 归日/五鼠遁/价格等既有断言**不回归** |
| 5 | `npm run verify` 全绿 ＋ tsc 0 错误 |

---

# 五、必须避免

- ❌ **不得只改文案而不改判定逻辑** —— 根因在 `canView`
- ❌ **不得让会员通过任何形式解锁报告类 grant** —— 那是本次 P0 本身
- ❌ **文案里不得出现「不限次数」「无限」**
- ❌ **不得在本轮真开 `ENTITLEMENT_ENFORCE`**（会让四块内容不可用）
- ❌ **不得在日运上线前把会员作为可售商品**（卖空货）
- ❌ **不得只加 `% 24` 而不补整点用例** —— 那样"测试替生产挡缺陷"依然存在
- ❌ **注入验证要先确认注入真的改变了行为**（§8.6.7-一）；
     退出码非 0 ≠ 断言红（可能是语法错误）
- ✅ **权益表必须逐项可断言** —— 写进中文 `desc` 的权益是抓不到的

---

# 六、验收标准

| # | 项 | 期望 |
|---|---|---|
| 1 | `SkuId` / `GrantId` 分离，`grants` 表落地 | ✓ |
| 2 | `canView` 改为查 grants；会员不再是万能通行证 | ✓ |
| 3 | **★ 会员的 grants 与 REPORT_GRANTS 交集为空** | ✓ **贴断言输出** |
| 4 | 全部用户可见文案已清（含 FAQ 与对比表） | ✓ **贴 /pricing 页面实测** |
| 5 | `unlock/route.ts` 的 `amount` 取自 `SKUS.fatebook.priceUSD` | ✓ |
| 6 | 扩展断言（权益表 ＋ 裸数字扫描 ＋ 牙口）纳入 verify | ✓ **含两条注入都确认翻红** |
| 7 | 会员标记「即将推出」，报告类照常可售 | ✓ 贴截图/HTML |
| 8 | `dailyDateInZone` 加 `% 24`；补整点用例 | ✓ |
| 9 | 四条不变量仍守住（§四） | ✓ |
| 10 | `verify` 全绿 ＋ tsc 0 错误 | ✓ |

---

# 七、一句话

> **这次修的不只是文案，是【权益从未被数据化】这件事。**
>
> **现在的权益只存在于中文 `desc` 里，而 `canView` 用 `ent.member` 一把全放行** ——
> **文案与实现是一致的，一致地偏离了设计。**
>
> **所以主线是**：把「可购买的 SKU」与「可访问的 grant」分开，
> 让每个 SKU 声明 `grants`，`canView` 查 grants 而不是查布尔 ——
> **这样"订阅不含报告"才能变成一条可断言的事**（`member.grants ∩ REPORT_GRANTS = ∅`）✓
>
> **同时把订阅到底给什么定死**（日运/流月/交运提醒/多命盘/相似命例）——
> 这些功能还没做，**但数据模型先立对，功能随后补，届时不必再动权益结构** ✓
>
> **而会员在日运上线前标「即将推出」** —— 否则是卖空货。
>
> **另外顺带修 `% 24` 与补整点用例**：这两处合起来是同一个问题 ——
> **你的测试辅助函数 `atLocal` 自己归一化了 `'24'`，而生产没有**，
> **用例又两头避开整点 → 测试替生产挡掉了缺陷**（§8.6.7-二）。
