# PATCH：会员权益修复剩余 6 项（精确补丁）

> **用途**：TraeCode 的工具调用格式出现损坏，**逐项读取/推断会增加调用次数**。
> **本文件给出精确的「原文 → 替换为」块，可直接套用，不需要先读文件。**
> **已完成且正确的 2 项**（`pricing.ts` / `entitlement.ts`）**不要动**。

---

# 0. 起点确认（已完成，勿改）

| 文件 | 状态 |
|---|---|
| `src/lib/pricing.ts` | ✅ 已完成：`SkuId`/`GrantId` 分离、`grants` 表、`REPORT_GRANTS`、`SUBSCRIPTION_GRANTS`、会员 desc 已改 |
| `src/lib/entitlement.ts` | ✅ 已完成：`canView(ent, grant)` 查 grants、`memberSkus`、`getEntitlements` 读 `member_plan` |

**我方已实测**：`tsc` 0 错误、`verify` 十段全绿。**这两份不要重做。**

---

# 1. `src/app/pricing/page.tsx`（5 处）

## 1.1 会员卡片 —— 替换整块（约 71–86 行）

**原文**：

```tsx
  {
    name: '会员订阅',
    price: formatPriceUSD(SKUS.member_monthly.priceUSD),
    unit: '/ 月起',
    desc: '重度用户更划算，命书不限次数',
    highlight: false,
    membership: true,
    features: [
      '本账号命书报告不限次数',
      '年运报告（流年详批）',
      `年度会员 ${formatPriceUSD(SKUS.member_yearly.priceUSD)}/年（主推，更划算）`,
      '每日运势提醒（开发中）',
      '优先使用最新模型',
    ],
    cta: { text: '开通会员', href: '/pricing' },
  },
```

**替换为**：

```tsx
  {
    name: '会员订阅',
    price: formatPriceUSD(SKUS.member_monthly.priceUSD),
    unit: '/ 月起',
    // ★ 订阅不含报告（docs/定价方案 §4.2）；权益与 SKUS[].grants 一致
    desc: '日运 · 流月 · 交运提醒，持续更新（报告需单独购买）',
    highlight: false,
    membership: true,
    features: [
      '个性化日运（每日）',
      '流月提示（每月）',
      '交运提醒（大运切换节点）',
      '多命盘管理（自己 ＋ 家人）',
      '相似古籍命例对照',
      `年度会员 ${formatPriceUSD(SKUS.member_yearly.priceUSD)}/年（主推，更划算）`,
      '★ 报告类（命书/年运/合婚/紫微/地理）需单独购买',
      '即将推出 —— 日运功能上线后开放',
    ],
    cta: { text: '即将推出', href: '/pricing' },
  },
```

> **可选（更佳）**：给 `CARDS` 元素加一个 `soon?: boolean`，在渲染时把 CTA 变成禁用态而非链接。
> **不做也可** —— 上面已把文案改成「即将推出」，且 `href` 指向本页，无副作用。

## 1.2 会员 FAQ —— 替换（约 99–101 行）

**原文**：

```tsx
  {
    q: '会员期内命书不限次数是什么意思？',
    a: `开通会员后，会员期内你账号下的所有命盘都可以免费解锁完整命书，不用每次 ${formatPriceUSD(SKUS.fatebook.priceUSD)} 单独购买。续费时有效期会从原到期日向后叠加。`,
  },
```

**替换为**：

```tsx
  {
    q: '会员包含什么？和命书报告是什么关系？',
    a: `会员包含的是【持续型】内容：个性化日运（每日）、流月提示（每月）、交运提醒、多命盘管理、相似古籍命例对照。报告类（命书 ${formatPriceUSD(SKUS.fatebook.priceUSD)}、年运、合婚、紫微、地理）需要单独购买 —— 会员不解除报告锁定。`,
  },
  {
    q: '为什么会员不含命书报告？',
    a: '报告是「重、深、一次性」的内容（万字详批，可长期留存），会员卖的是「轻、短、频繁」的持续更新。两者是两种产品，我们不做「一份订阅解锁全部」——那会让单次报告失去意义，也不利于长期把内容做深。',
  },
```

## 1.3 对比表 —— 替换整块（约 215–224 行）

**原文**：

```tsx
                {[
                  ['四柱八字排盘', true, true, true],
                  ['旺衰 · 格局判定', true, true, true],
                  ['万字命书详批（十大板块）', false, true, true],
                  ['AI 命理师深度解读', false, true, true],
                  ['近三年流年趋势', false, true, true],
                  ['永久保存查看', false, true, true],
                  ['不限次数', false, false, true],
                  ['年运报告', false, false, true],
                ].map((row) => (
```

**替换为**（列序：免费 / 命书报告 / 会员 —— **报告类只给命书列，订阅类只给会员列**）：

```tsx
                {[
                  ['四柱八字排盘', true, true, true],
                  ['旺衰 · 格局判定', true, true, true],
                  ['万字命书详批（十大板块）', false, true, false],
                  ['AI 命理师深度解读', false, true, false],
                  ['近三年流年趋势', false, true, false],
                  ['永久保存查看', false, true, true],
                  ['个性化日运（每日）', false, false, true],
                  ['流月提示（每月）', false, false, true],
                  ['交运提醒（大运切换）', false, false, true],
                  ['多命盘管理（自己 ＋ 家人）', false, false, true],
                  ['相似古籍命例对照', false, false, true],
                ].map((row) => (
```

> **注意**：原表的「不限次数」与「年运报告」两行**删除** ——
> 「不限次数」是本缺陷本身；「年运报告」是 $19.99 的**独立商品**，不属于命书也不属于会员。

## 1.4 页面标题里的价格串（约第 7 行，检查是否需改）

原为 `` `价格方案：免费排盘 · 命书报告 ${formatPriceUSD(SKUS.fatebook.priceUSD)} · 会员订阅` `` ✓
**若已是派生写法则无需改**（我方核查：已派生 ✓）。

---

# 2. `src/app/api/unlock/route.ts`（2 处）

## 2.1 注释（第 22 行）

**原文**：`    // 会员期内免单次解锁费用（命书不限次数）`

**替换为**：`    // 会员不解除命书锁定（订阅不含报告，见 docs/定价方案 §4.2）`

## 2.2 流水金额（第 79 行）

**原文**：`        amount: 19.9,`

**替换为**：`        amount: SKUS.fatebook.priceUSD,`

**★ 并确认该文件顶部已 import `SKUS`**；若没有，加：

```ts
import { SKUS } from '@/lib/pricing'
```

---

# 3. `src/lib/daily.ts`（1 行）

**原文**：

```ts
    const hour = get('hour')   // 多数环境午夜为 '00'；个别环境为 '24'
```

**替换为**：

```ts
    const hour = get('hour') % 24   // '24' → 0：部分 ICU 实现把午夜给成 '24'，取模后环境无关
```

---

# 4. `scripts/test-dayboundary-accept.mjs`（1 处）

**原文**：

```js
  [[2026, 7, 15, 23, 30], [2026, 7, 16, 0, 30], 'America/New_York']  // 夏令时
]
```

**替换为**：

```js
  [[2026, 7, 15, 23, 30], [2026, 7, 16, 0, 30], 'America/New_York'],  // 夏令时
  // ★ 含【整点】的子时对：'24' 只在恰好午夜出现，而此前用例两头都避开整点（§8.6.7-二）
  [[2026, 1, 6, 23, 0], [2026, 1, 7, 0, 0], 'Asia/Shanghai'],
  [[2026, 7, 15, 23, 0], [2026, 7, 16, 0, 0], 'America/New_York']
]
```

---

# 5. `scripts/test-pricing-accept.mjs`（2 处）

## 5.1 顶部 import —— 增加两个常量

**原文**：`import { SKUS, formatPriceUSD } from '../src/lib/pricing.ts'`

**替换为**：`import { SKUS, formatPriceUSD, REPORT_GRANTS, SUBSCRIPTION_GRANTS } from '../src/lib/pricing.ts'`

## 5.2 在文件末尾 `console.log('\n' + (allPass ? …` **之前**插入以下两块

```js
// ---------- ⑤ ★ 权益表（HANDOFF-会员权益修复 §1.6-②）----------
const GRANT_TABLE = {
  fatebook:       ['fatebook'],
  annual_report:  ['annual_report'],
  hemun:          ['hemun'],
  ziwei_deep:     ['ziwei_deep'],
  geo:            ['geo'],
  bundle3:        ['fatebook', 'ziwei_deep', 'geo'],
  member_monthly: SUBSCRIPTION_GRANTS,
  member_yearly:  SUBSCRIPTION_GRANTS,
  ask_pack:       ['ask'],
}
const ALL_GRANTS = [...REPORT_GRANTS, ...SUBSCRIPTION_GRANTS, 'ask']
let grantFail = 0
for (const [id, want] of Object.entries(GRANT_TABLE)) {
  const got = SKUS[id].grants ?? []
  if (got.length !== want.length || !want.every((g) => got.includes(g))) {
    grantFail++; fail(`SKUS.${id}.grants=[${got}] ≠ 拍板 [${want}]`)
  }
  for (const g of SKUS[id].grants ?? []) {
    if (!ALL_GRANTS.includes(g)) { grantFail++; fail(`SKUS.${id}.grants 含非法 grant「${g}」`) }
  }
}
// ★★ 核心守护：会员的 grants 与报告类 grant 交集必须为空（订阅不含报告）
for (const id of ['member_monthly', 'member_yearly']) {
  const inter = (SKUS[id].grants ?? []).filter((g) => REPORT_GRANTS.includes(g))
  if (inter.length) { grantFail++; fail(`★ ${id} 含报告类 grant [${inter}] —— 订阅不得含报告`) }
}
console.log(grantFail === 0
  ? `✓ 权益表：${Object.keys(GRANT_TABLE).length} 个 SKU 与拍板一致；★ 会员与报告类交集为空（订阅不含报告）`
  : '✗ 权益表断言失败')

// ---------- ⑥ ★ 裸数字金额扫描（补上"带 ¥ 的文案"之外的形态，§8.6.3）----------
const BARE_AMOUNT = /\b(amount|price)\s*:\s*\d/g
let bareFail = 0
for (const file of walk(root)) {
  const hits = readFileSync(file, 'utf8').match(BARE_AMOUNT)
  if (hits) { bareFail++; fail(`${file.replace(root, 'src/')} 残留裸数字金额 ${hits.join('、')}`) }
}
console.log(bareFail === 0
  ? '✓ 裸数字金额：src 全量扫描 amount:/price: 字面量 0 命中（价格须取自 SKUS）'
  : `✗ 裸数字金额 ${bareFail} 处残留`)
```

> **注**：`walk` / `root` / `fail` 该文件已有（①在用）✓
> `priceUSD:` 不会误报（`\b` 之后要求紧跟 `:`，而 `priceUSD` 后面是 `U`）✓
> 若确有误报，按实际情况收窄正则并在注释里说明。

---

# 6. 验收（3 条注入 ＋ 回归）

## 6.1 牙口注入（**每次注入前先确认"输出真的变了"** —— 总纲 §8.6.7-一）

| # | 注入 | 期望 |
|---|---|---|
| ① | 把 `'fatebook'` 加进 `pricing.ts` 的 `member_monthly.grants` | **⑤ 的核心守护翻红** |
| ② | 在 `src/lib/daily.ts` 里塞一行 `const probe = { amount: 1 }` | **⑥ 翻红** |
| ③ | 把 `dailyDateInZone` 的 `% 24` 去掉 | 若无 00:00 用例则**不红** → 说明用例没盖到（应先做第 4 项） |

## 6.2 回归

```
· ENTITLEMENT_ENFORCE 仍为 false
· 四个 API（paipan/ziwei/hemun/geo）仍 HTTP 200
· /api/paipan 仍不下发 paid 字段
· npm run verify 全绿（11 段）＋ tsc 0 错误
```

## 6.3 页面实测（**必须**，因为 `pricing/page.tsx` 是唯一能证明文案改对了的地方）

```
GET /pricing → HTML 中：
  · 不含「不限次数」
  · 不含「免费解锁完整命书」
  · 含「个性化日运（每日）」
  · 含「报告类（命书/年运/合婚/紫微/地理）需单独购买」
```

---

# 7. 一句话

> **你的工具调用格式坏了（`<seed:…>`），所以那几条没有真正执行。**
> **本文件把所有替换写成"原文 → 替换为"的精确块，尽量免去读取与推断，减少调用次数。**
> **已完成的两个文件不要动。**
> **按 §1–§5 逐块替换，再按 §6 做三条注入 ＋ 回归 ＋ 页面实测即可。**
