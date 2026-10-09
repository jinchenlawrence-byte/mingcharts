# 交接：会员权益修复 —— 剩余 4 项（含完整代码）

> **致**：TraeCode
> **发自**：DeepSeek 侧
> **日期**：2026-10-08
> **前置**：`REPLY-会员权益修复验收.md`（第 1、2 项已验收通过）
> **本文件自包含**，逐块给出「原文 → 替换为」或「插入位置 ＋ 完整代码」，**尽量免读取、免推断**（减少工具调用次数）。

---

# 0. 起点（已完成且正确，**不要动**）

| 文件 | 状态 |
|---|---|
| `src/lib/pricing.ts` | ✅ `SkuId`/`GrantId` 分离、`grants` 表、`REPORT_GRANTS`、`SUBSCRIPTION_GRANTS` |
| `src/lib/entitlement.ts` | ✅ `canView(ent, grant)` 查 grants、`memberSkus`、`getEntitlements` 读 `member_plan` |
| `src/app/pricing/page.tsx` | ✅ 文案已改为从事实源派生、对比表已按 grants 判定、SEO description 已清 |
| `src/app/api/unlock/route.ts` | ✅ 注释已改、`amount: SKUS.fatebook.priceUSD` |

**我方已实测**：`tsc` 0 错误、`verify` 11 段全绿、`/pricing` 旧文案 0 命中、对比表逐行正确。

---

# 1. 【P0】`scripts/test-pricing-accept.mjs` —— 补权益守护断言

> **为什么是 P0**：这条断言守的正是**本次 P0 本身**。
> 现状是「**9 个价格全部有断言，一个权益都没断言**」——
> 所以价格一分不差、权益完全跑偏时，`verify` 依然全绿（总纲 §8.6.6）。

## 1.1 改 import 行

**原文**：

```js
import { SKUS, formatPriceUSD } from '../src/lib/pricing.ts'
```

**替换为**：

```js
import { SKUS, formatPriceUSD, REPORT_GRANTS, SUBSCRIPTION_GRANTS } from '../src/lib/pricing.ts'
```

## 1.2 在文件末尾 `console.log('\n' + (allPass ? …` **之前**，插入以下两块

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
// ★★ 核心守护：会员 grants 与报告类 grant 交集必须为空（订阅不含报告）
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

> `walk` / `root` / `fail` / `readFileSync` 该文件已有（①在用）✓
> `priceUSD:` 不会误报（`\b` 后要求紧跟 `:`，而 `priceUSD` 后面是 `U`）✓
> 若仍有误报，按实际情况收窄正则在注释里说明。

## 1.3 牙口注入（**每次注入前先确认"输出真的变了"**，总纲 §8.6.7-一）

| # | 注入 | 期望 |
|---|---|---|
| ① | 把 `'fatebook'` 加进 `pricing.ts` 的 `member_monthly.grants` | **⑤ 的核心守护翻红** |
| ② | 在 `src/lib/daily.ts` 里塞一行 `const probe = { amount: 1 }` | **⑥ 翻红** |

**还原后必须恢复 `PRICING_ACCEPT_PASS`。**

---

# 2. 【P1】会员卡 CTA → 「即将推出」

> **★ 注意**：会员卡的按钮**不是** `card.cta`，而是 `MembershipButton` ——
> 所以只改 `CARDS` 里的 `cta.text` **对会员卡无效**（我方已核实渲染路径）。

## 2.1 替换（`src/app/pricing/page.tsx` 约第 233 行）

**原文**：

```tsx
                {card.membership ? (
                  <MembershipButton plan="monthly" />
                ) : (
```

**替换为**：

```tsx
                {card.membership ? (
                  // ★ 订阅权益（日运等）尚未上线，暂不开放购买（会员权益修复 §二）
                  <div className="block text-center py-2.5 rounded-md font-semibold bg-gray-100 text-gray-400 cursor-not-allowed">
                    即将推出
                  </div>
                ) : (
```

## 2.2 清理 import

`MembershipButton` 在全库**只被这一处使用** —— 改完后它变成未使用 import，**请一并删除**：

**原文**（`src/app/pricing/page.tsx` 第 3 行左右）：

```tsx
import MembershipButton from '@/components/MembershipButton'
```

**替换为**：**整行删除**

> **不要删 `src/components/MembershipButton.tsx` 文件本身** —— 支付接入后还要用。

---

# 3. 【P1】归日健壮性补强（两处，各 1 行）

## 3.1 `src/lib/daily.ts` —— 加 `% 24`

**原文**（约第 52 行）：

```ts
    const hour = get('hour')   // 多数环境午夜为 '00'；个别环境为 '24'
```

**替换为**：

```ts
    const hour = get('hour') % 24   // '24' → 0：部分 ICU 实现把午夜给成 '24'，取模后环境无关
```

## 3.2 `scripts/test-dayboundary-accept.mjs` —— 补含整点的子时对

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

> **为什么这两条要一起做**：测试辅助函数 `atLocal` 里已经写过 `if (hh === 24) hh = 0`
> （**替生产做了容错**），而生产 `dailyDateInZone` 没有 ——
> **只加 `% 24` 而不补整点用例，这个盲区依然存在**（§8.6.7-二）。

---

# 4. 【P1】价格页新增「单项报告」区（5 个 SKU）

> **问题**：全库扫描显示 `annual_report` / `hemun` / `ziwei_deep` / `geo` / `bundle3`
> **只出现在 `pricing.ts` 的 `ONE_TIME_SKUS` 里，没有任何页面引用** ——
> **价格不可见、无法购买**。而第 6–7 步一旦打开 `ENFORCE`，**合婚/紫微/地理会立即对用户关闭而没有购买入口**。
> 另外 Waffo 审核项要求 `Pricing is visible`。

## 4.1 import 增加 `ONE_TIME_SKUS`

在 `src/app/pricing/page.tsx` 顶部既有的 `@/lib/pricing` import 中**加入 `ONE_TIME_SKUS`**
（该 import 已是多行形式，在 `formatPriceUSD,` 后另起一行加即可）。

## 4.2 插入新区块

**插入位置**：`{/* 价格卡片 */}` 区块**结束之后**、`{/* 命书报告包含的十大板块 */}`（约第 250 行）**之前**。

**插入内容**：

```tsx
        {/* ★ 单项报告价目：5 个非命书的单项 SKU（命书已有卡片，此处排除）*/}
        <section className="mb-14">
          <h2 className="text-2xl font-bold text-amber-900 mb-2 text-center">单项报告</h2>
          <p className="text-sm text-gray-600 text-center mb-6">
            除命书外的深度报告，均可单独购买；也可选三合一套餐更划算。
          </p>
          <div className="grid sm:grid-cols-2 gap-4 max-w-3xl mx-auto">
            {ONE_TIME_SKUS.filter((s) => s.id !== 'fatebook').map((s) => (
              <div key={s.id} className="bg-white rounded-xl p-5 shadow-md flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-bold text-amber-900">{s.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{s.desc}</p>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-2xl font-bold text-amber-800">{formatPriceUSD(s.priceUSD)}</div>
                  <div className="text-xs text-gray-500 mt-1">内测期免费体验</div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 text-center mt-4">
            内测期间以上模块免费开放体验；正式开放购买后，将按上述价格单独购买（会员不含报告）。
          </p>
        </section>
```

**★ 三点要求**：
1. 价格与名称**一律取自 `ONE_TIME_SKUS`**（`SKUS` 单一事实源），**不得写任何本地字面量价格** ✓
2. **必须保留**「内测期免费体验」与末尾那句说明 ——
   否则等于**卖用户当前已免费的东西**（现在 `ENTITLEMENT_ENFORCE = false`，这些模块是免费的）
3. `filter((s) => s.id !== 'fatebook')` 不能省 —— 命书已有独立卡片，重复展示会误导

---

# 5. 验收

## 5.1 自动

```
· npx tsc --noEmit              → 0 错误
· npm run verify                → 11 段全绿，退出码 0
· 新增的 ⑤⑥ 两段出现 PASS
```

## 5.2 牙口（§6 已于 §1.3 说明）

```
① member_monthly.grants 加 'fatebook'  → ⑤ 核心守护翻红
② daily.ts 塞 amount: 1               → ⑥ 翻红
还原后均恢复 PASS
```

## 5.3 页面实测（**必须**，活服务器 `http://localhost:3000`）

```
GET /pricing  → HTML 中：
  · 不含「不限次数」（复核应仍为 0）
  · 会员卡 CTA 文案 = 「即将推出」，且【不再是 <button> 或链接】
  · 出现 5 个单项报告：年运报告 $19.99 · 合婚详批 $29.99 · 紫微深度 $24.99
                      · 地理 · 财富之城 $19.99 · 三合一套餐 $59.99
  · 出现「内测期免费体验」
  · 不含任何 ¥ 价
```

## 5.4 回归

```
· ENTITLEMENT_ENFORCE 仍为 false
· 四个 API（paipan/ziwei/hemun/geo）仍 HTTP 200
· /api/paipan 仍不下发 paid 字段
```

---

# 6. 一句话

> **四项**：① **【P0】补权益守护断言**（本次 P0 的守护 —— 现在"9 个价格有断言、0 个权益有断言"，
> 所以这次才能价格全对、权益全错而 `verify` 全绿）；
> ② 会员卡 CTA 改「即将推出」（**注意它不是 `card.cta`，是 `MembershipButton`**）；
> ③ `% 24` ＋ **整点子时对**（两条必须一起做，否则测试继续替生产挡缺陷）；
> ④ 价格页补「单项报告」区（**5 个 SKU 现在站内完全没有展示**，
> **一旦打开 ENFORCE，合婚/紫微/地理会对用户关闭而没有购买入口**）。
>
> **性能提示**：AI 接口要 7–16 秒，若 HTTP 超时短于 15 秒会误判失败，请调到 ≥30 秒。
> **注入验证前先确认"注入真的改变了行为"**（总纲 §8.6.7-一）。
> **已完成且正确的 4 个文件不要动**（§0）。
