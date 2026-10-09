# 任务交接书：变现管道重构 ＋ 日运/日签

> **交接对象**：TraeCode
> **纪律基准**：`docs/验收标准与红线.md`（**先读 §8.5 / §8.5.1 / §8.6**）
> **来源**：`docs/定价方案.md` §九 第 1–5 步；`docs/日运日签-设计.md`
> **本任务书自包含。** 价格与权益已全部拍板，**无需再问**。

---

# 〇、先读四条

1. **分两个 Part，建议分两次交付验收**（§四）。**Part A 是重构（行为保持），Part B 是新功能** ——
   混在一起交付，出问题时无法判断是重构坏了还是新功能带来的。

2. **★ Part A 有一条不能违反的不变量：不得降低现有可达性。**
   因为**支付还没接入**（那是第 6–7 步）。**本轮只建结构，不真开拦截。**
   详见 §1.1 —— 这一条若做错，紫微/合婚/地理会**直接不可用**。

3. **Part B 有一条硬约束：文案必须是静态资产，不实时调 AI。**
   理由见 §2.4 —— **二是更要紧的：静态文案可以逐条审核，实时生成的内容不能。**

4. **`/api/paipan` 现在做对了一半**（`isPaid: false`，**不下发付费内容**）——
   **别改坏它。**

---

# 一、Part A：变现管道重构（定价方案第 1–4 步）

## 1.1 ★ 不变量（先立规矩）

```
① 现有页面行为不得改变 —— 免费用户看到的还是那些，解锁流程不变
② npm run verify 七段必须仍全绿
③ /api/paipan 不得开始下发付费内容（这是当前唯一做对的地方）
④ ★ 紫微 / 合婚 / 地理【本轮不加拦截】
```

**④ 的理由（依 §8.4.4，刻意决定须显式说明）**：

> **支付接入是第 6–7 步，本轮没做。**
> **现在开拦截 = 用户永远拿不到这三块内容 = 功能不可用。**
>
> **所以本轮的产出是「结构就位 ＋ 默认全部放行」**，等支付接入后统一开启。

**实现方式**：一个显式的、默认关闭的开关：

```ts
// src/lib/entitlement.ts
/** 是否真正执行拦截。
 *  ★ 支付未接入前必须为 false —— 否则用户拿不到内容。
 *  第 7 步（接 MoR）完成后才改为 true。 */
export const ENTITLEMENT_ENFORCE = false

export function canView(ent: Entitlements, sku: SkuId): boolean {
  if (!ENTITLEMENT_ENFORCE) return true          // ← 默认全放行
  return ent.member || ent.ownedSkus.has(sku) || ent.ownedSkus.has('bundle3')
}
```

## 1.2 ① 价目收为「单一事实源」

**现状问题**：**两份 `PLANS` 定义**，改价必然漂移。

```
src/lib/membership.ts:13     export const PLANS: Record<PlanId, Plan> = { monthly: ¥29.9/30d, yearly: ¥199/365d }
src/app/pricing/page.tsx:34  const PLANS: Plan[] = [ ... ]        ← 另一份
src/components/MembershipButton.tsx:6  import { PLANS } from '@/lib/membership'
```

**改法**：新建 `src/lib/pricing.ts`（**单一事实源**），三处都从它取。

**★ 价格表（已拍板，照抄）**：

```ts
export type SkuId =
  | 'fatebook'        // 命书（核心深度报告）      $29.99
  | 'annual_report'   // 年运报告                  $19.99
  | 'hemun'           // 合婚（双人九维）          $29.99
  | 'ziwei_deep'      // 紫微深度                  $24.99
  | 'geo'             // 地理 · 财富之城           $19.99
  | 'bundle3'         // 命书 ＋ 紫微 ＋ 地理      $59.99
  | 'member_monthly'  // 月度会员                  $9.9/月
  | 'member_yearly'   // 年度会员（★主推）         $49/年
  | 'ask_pack'        // 追问 15 次（V2，先占位）  $4.99

export const SKUS: Record<SkuId, Sku> = { /* … */ }
```

**要求**：

- **以 USD 为基准定价**（`priceUSD`），**不维护第二套币种**（避免漂移）
- `membership.ts` 的 `PlanId` / `PLANS` **保留为兼容导出**，但改为从 `pricing.ts` 派生
  （**不要留下两份数据**）
- `pricing/page.tsx` 与 `MembershipButton.tsx` 改为从 `pricing.ts` 取
- 页面文案里的价格**不得硬编码**，一律取自 `SKUS`

## 1.3 ② 门禁收为「单一判定函数」

新建 `src/lib/entitlement.ts`：

```ts
export interface Entitlements { member: boolean; ownedSkus: Set<SkuId> }

/** 从 profiles + payments 读取；服务端用 service_role */
export async function getEntitlements(admin: SupabaseClient, userId: string): Promise<Entitlements>

export function canView(ent: Entitlements, sku: SkuId): boolean   // 见 §1.1
```

**要求**：

- `isPaid` **保留为兼容字段**（现有页面还在用），**新逻辑一律走 `canView`**
- **不得在页面/route 里各自写判定**（依 §8.5.1）——
  这正是上一轮 `aiAnalysis` 漏接 `findForbidden` 的同型问题

## 1.4 ③ 五处 API 统一「免费层 / 付费层」返回结构

**落点**：`paipan` / `ziwei` / `hemun` / `geo`（四 route）＋ 新建的 `daily`。

**目标结构**：

```jsonc
{
  "success": true,
  "data": {
    "free":   { /* 排盘、旺衰、格局、结构病 … */ },
    "locked": { "skus": ["fatebook"], "preview": "……" },   // 未授权时的占位
    "paid":   { /* 仅授权时存在 */ }
  }
}
```

**⚠️ 兼容性要求（重要）**：

- **本轮不得破坏现有响应字段** —— 现有页面读的是 `data.chart` / `data.analysis.paid` 等
- **建议做法**：**新增** `free` / `locked` 两段，**同时保留**原有字段（过渡期双写），
  页面改造放到 Part A 之后或与 Part B 一起
- **`/api/paipan` 现在只返回 `analysis: { wangShuai, geJu, isPaid: false }`** ——
  **保持这个"不下发付费内容"的性质**，别因为重构把它改坏

## 1.5 ④ 免费层补齐

| 项 | 落点 | 要求 |
|---|---|---|
| **命例库检索无门禁** | `src/lib/caseSearch.ts` | 确认**无需登录、无任何拦截** |
| **结构病进免费返回体** | `analysis.ts` 的 `structuralIssues` | 放进 `data.free` |
| **1 个模块试读** | 建议 `geo` | `geo` route **不设门禁**，作为"试吃" |

## 1.6 Part A 验收

| # | 项 | 期望 |
|---|---|---|
| 1 | 两份 `PLANS` 已合并，全局只有一处价目定义 | ✓ 用 grep 证明：`PLANS` 定义只出现 1 处 |
| 2 | 页面价格文案全部取自 `SKUS`，无硬编码价格 | ✓（grep `29.99` / `19.99` 在 `src/app/**` 应为 0 命中） |
| 3 | `canView` 为唯一判定入口；`ENTITLEMENT_ENFORCE = false` | ✓ |
| 4 | **★ 现有页面行为不变**（免费/登录/解锁三条路径逐一实测） | ✓ **贴实测记录** |
| 5 | `/api/paipan` **仍不下发付费内容** | ✓ 贴响应 JSON |
| 6 | 紫微/合婚/地理 **仍可正常访问**（未被拦截） | ✓ 贴实测 |
| 7 | `npm run verify` 七段全绿 ＋ `tsc --noEmit` 0 错误 | ✓ |

---

# 二、Part B：日运 / 日签（定价方案第 5 步）

> **设计依据**：[`docs/日运日签-设计.md`](docs/日运日签-设计.md)。**先读它。**

## 2.1 定位（**不是可选项，是红线**）

```
做「今日一省」，不做「今日吉凶」
```

| | ❌ 不做 | ✅ 要做 |
|---|---|---|
| 形态 | "今日大凶，忌出行签约" | "今日**壬子**，与你的日柱同气，**宜静**；**留意**情绪起伏" |
| 依据 | 只给结论 | **点明干支与关系** |
| 语气 | 判决 | 提醒 |

**理由（技术事实）**：命理影响力 **大运 > 流年 > 流月 > 流日** ——
**流日是噪声最大的一层**。我们已立的规矩是**流月都不能说「大吉」**，日运更不能。

## 2.2 流日计算（★ 必须复用现有引擎，不得另造）

**关键差异**：

| | 边界 |
|---|---|
| 流年 / 流月 | **节气**（已有 `JIE_BY_MONTH`，`analysis.ts:657）` |
| **流日** | **不需要节气** —— 日柱是**连续的 60 甲子循环** |

**★ 复用要求**：`paipan.ts` 现在是这样算日柱的（`paipan.ts:91-97`）：

```ts
const solar = Solar.fromDate(base)
const lunar = solar.getLunar()
const eightChar = lunar.getEightChar()
const dayPillar = eightChar.getDay()
```

**流日必须走同一条路径** —— 不得用另一套算法（依 §8.5.1，判据收为单一事实源）。

**建议**：新建 `src/lib/daily.ts`：

```ts
export interface LiuRi { gan: string; zhi: string; ganZhi: string }
export function liuRiOf(y: number, m: number, d: number): LiuRi
```

**★ 并加一条入口一致性断言**（依 §8.5）：

```
流日 liuRiOf(Y,M,D) 的日柱  ≡  paipan({Y,M,D, hour:12, minute:0}) 的日柱
对 60 个连续日期逐一验证，纳入 verify
```

**十神与关系也要复用现成表**：`SHI_SHEN`（`analysis.ts:210`）、`LUCK_CHONG`（`:616`）。

**★ 运势词表复用 `LuckTag`**（`analysis.ts`）：`'较宜' | '平顺' | '一般' | '宜慎' | '大防'`

> **注意**：`LuckTag` 本身已是克制词汇（**没有大吉/大凶**）✓
> 但**日运只允许使用前四个，排除 `'大防'`** —— 因为日运比流月更无凭。
> **这是一个刻意的限制，须写进注释。**

## 2.3 ★「今天」的定义（本轮第一个真问题）

**三个候选**：

| 方案 | 结论 |
|---|---|
| 服务器日期 | ❌ 用户在美国、服务器 UTC → 会错一天 |
| **用户当前时区** | ✅ **采用** —— 复用已有的 `currentCity` 概念（`geo.ts:61`） |
| 出生地时区 | ❌ 生在纽约、现住上海的人应按上海 |

**实现建议**：

```ts
// 取某时区的"今天"（民用日）
new Intl.DateTimeFormat('en-CA', {
  timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit'
}).format(new Date())   // → "2026-10-07"
```

**★ 日与日的分界：采用民用日 00:00**（**不是**命理子时 23:00）。

```
理由：用户 23:30 打开会看到"明天"的运势 → 困惑。
这是【刻意的产品选择】，须写进注释（依 §8.4.4），
并在 UI 注明"命理排盘用子时换日，此处按自然日"。
—— 否则下一轮会被当成 bug 提回。
```

**时区合法性**：用已存在的 `isValidZone`（`solarTime.ts:15`）；
非法则降级 `DEFAULT_ZONE`（**不要抛异常** —— 纵深兜底已在 `getUtcOffsetHours` 里做了）。

## 2.4 ★★ 文案必须是【静态资产】，不实时调 AI

**两条理由，第二条更要紧**：

**① 成本随用户数线性放大，且延迟不可接受**

```
10 万订阅用户 × 每天一次：
  实时 AI  ≈ $1500/月，且用户打开要等
  静态文案 = $0，零延迟
```

**② 静态文案可以逐条审核**

> **我们要保证"不给绝对断言、不恐吓"。
> 实时 AI 生成的内容无法逐条审核；180–300 条静态文案可以逐条过目。**

**这对把"不给错误信息"当红线的产品是决定性的。**

### 文案规模（可控）

| 资产 | 维度 | 条数 |
|---|---|---|
| **通用日签** | 60 甲子 × 3 变体 | **180 条** |
| **个性化日运** | 十神(10) × 日支关系(归并 ~6 类) × 3 变体 | **~180 条** |

**落点**：`src/data/daily-signs.ts`（**构建期内联，运行时零 IO**）

**生成方式建议**：AI 批量生成 ＋ **人工逐条过目**。

## 2.5 `/api/daily`

**输入**：`{ token?, chartId? | chart?, zone }`
**输出**（分层，**服务端判定**）：

```jsonc
{
  "success": true,
  "data": {
    "date": "2026-10-07",
    "zone": "America/New_York",
    "free": { "liuRi": "壬子", "sign": "…" },          // ← 无需登录
    "paid": { "shiShen": "比肩", "relation": "半合日支", "advice": "…" }  // ← 订阅权益
  }
}
```

**要求**：

- `free` 段**无需登录**即可取（日签是获客工具）
- `paid` 段经 `canView(ent, 'member_monthly'|'member_yearly')` 判定 ——
  **未授权时不下发**（不是前端隐藏）
- ⚠️ **但注意 §1.1 的 `ENTITLEMENT_ENFORCE`** ——
  本轮默认全放行，**所以真实拦截同样等支付接入后开启**

## 2.6 分享卡片

- **免费**，可导出图片（前端 canvas 绘制），**带产品标识**
- 内容：日期 ＋ 干支 ＋ 日签一句
- **这是获客设计，不是付费功能** —— 不要放进订阅

## 2.7 Part B 验收

| # | 项 | 期望 |
|---|---|---|
| 1 | `liuRiOf` 与 `paipan` 日柱**一致性断言**（60 日） | ✓ **并附牙口自检**（故意改错必须红） |
| 2 | 民用日 00:00 ＋ 用户时区；跨时区实测 | ✓ 贴 UTC/纽约/悉尼三地同日结果 |
| 3 | 非法时区降级不抛异常 | ✓ |
| 4 | 文案 180＋180 条**全部过禁用词扫描** | ✓ 纳入 `test-checker-accept.mjs` 同族脚本 |
| 5 | **日运只使用 `较宜/平顺/一般/宜慎`，无 `大防`** | ✓ 断言 |
| 6 | `/api/daily` 的 `free` 段无需登录可取 | ✓ 贴未登录实测 |
| 7 | 分享卡片可导出图片 | ✓ 贴截图 |
| 8 | `npm run verify` 全绿（含新增断言） | ✓ |

---

# 三、必须避免

- ❌ **不得在本轮真开拦截**（§1.1）—— 支付没接，开了就是功能不可用
- ❌ **不得留下两份价目定义**（§1.2）
- ❌ **不得在页面里各自写门禁判定**（§1.3）—— 这是 §8.5.1 的同型错误
- ❌ **不得让 `/api/paipan` 开始下发付费内容**（§1.4）
- ❌ **不得给流日另造一套干支算法**（§2.2）—— 必须与 `paipan` 同源
- ❌ **不得按用户实时调 AI 生成日运**（§2.4）
- ❌ **不得用「大吉／大凶／必定／务必」及 `大防`**（§2.1、§2.2）
- ❌ **不得把"日界用民用日"这个刻意选择只写成注释而不写进文档**（§8.4.4）
- ✅ 改完 Part A 后，**现有三条路径（免费/登录/解锁）必须逐一实测行为不变**

---

# 四、交付方式（**建议分两次**）

```
第一次交付：Part A（纯重构）
  · 不变量清晰、可精确验收（"行为不变"是可证伪的）
  · 出问题时范围明确
    ↓
第二次交付：Part B（新功能＋内容资产）
  · 依赖 Part A 的 entitlement 层
  · 含文案生成，验收维度不同
```

**建议：Part A 先交付验收，再开 Part B。**

理由：**Part A 是行为保持的重构，Part B 是新功能**。
混在一起交付，一旦 `verify` 变红，**无法判断是重构坏了还是新功能带来的**。

```bash
npm run verify      # 七段：tsc + checker + solar-time + entry-consistency + geo + wealth + regression
npm run verify:ai   # 12/12
```

---

# 五、一句话

> **Part A 是一条不变量：不得降低现有可达性。**
> 因为**支付是第 6–7 步，本轮没做** —— 现在开拦截，
> 紫微/合婚/地理会**直接不可用**。
> **本轮产出是「结构就位 ＋ 默认全放行」（`ENTITLEMENT_ENFORCE = false`）。**
>
> **Part B 是一条硬约束：文案必须是静态资产。**
> 一是成本与延迟；**二是更要紧的 —— 静态文案可以逐条审核，实时生成的内容不能。**
> 对一个把"不给错误信息"当红线的产品，这一条是决定性的。
>
> **另外两处容易做错的**：
> **流日必须与 `paipan` 同源**（别另造一套算法），并加**入口一致性断言**；
> **日界用民用日 00:00 是刻意的产品选择**，要让用户看得见，别只写在注释里。
>
> **最后**：日运做「今日一省」，不做「今日吉凶」——
> **因为它在命理层级里最弱（大运>流年>流月>流日），却在用户日常决策里最贴身。**
