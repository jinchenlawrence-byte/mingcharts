# 任务交接书：geo 改为真付费（方案 A）＋ 报告模块门禁接线补完

> **交接对象**：TraeCode
> **纪律基准**：`docs/验收标准与红线.md`（**先读 §8.5.1 / §8.6 / §8.6.7**）
> **前置**：`HANDOFF-打通entitlement链路.md`（已完成并复核）· `REPLY-geoAI回退复核.md`（本任务的问题来源）
> **本任务书自包含。**

---

# 〇、先读七条

1. **★★★ 最重要的一条：`ENTITLEMENT_ENFORCE` 仍是 `false`，所以【内测期行为不变】** ✓
   本次做的是**把门禁结构接上**，**不是**"现在就收费"。
   `canView()` 在 `ENFORCE=false` 时恒返回 `true` → 所有用户照旧拿到内容 ✓
   **❌ 绝不要打开 `ENTITLEMENT_ENFORCE`**（支付未接入，打开会让功能不可用）

2. **★★★ 本任务不是"只给 geo 加个字段"。**
   我方全库核查发现：**门禁体系只接了一半** ——
   `canView` 全库只有 **2 处调用**，而 `REPORT_GRANTS` 有 **5 个**（**4 个没接**）✗
   详见 §二。**范围已在 §三 拍板为【范围 2】（五个报告模块一起补完）** ✓

3. **❌ 不要照抄 `ziwei` / `hemun` 现有的 `locked` 写法** ✗
   它们写了 `locked: { skus, preview }` ✓ —— 但**前端零消费** ✗、**后端零判定** ✗
   **那是一个死字段**。照抄只会让 geo 也变成死字段 ✗

4. **★ 判定一律走 `canView(ent, grant)`** —— 不得在路由里另写权益判断（§8.5.1）✓
   取权益一律走 `getEntitlements(admin, userId)` ✓

5. **★ 前端必须真的消费 `locked`** —— 显示 `preview` ＋ 解锁引导（指向 `/pricing`）✓
   **不消费就等于没做** ✗

6. **★★ 要新增一条断言：「定价与门禁一致性」** —— 这是防止本类矛盾复发的唯一手段 ✓
   详见 §五-④。

7. **★ 断言写法**：凡断言对象是"某个函数/路由的行为"，就必须**真的调用它**；
   牙口必须用**文本不变、行为变坏**的注入；注入前先确认注入有效（§8.6.7）✓

---

# 一、背景：为什么做这个

## 1.1 问题来源

用户报告「方位之城模块，付费之后可能拿不到 AI 报告」。
我方复核后，**把问题重新定性为两层**（详见 `REPLY-geoAI回退复核.md`）：

## 1.2 第一层（本任务要解决的）：**定价与门禁矛盾**

```
★ pricing.ts:80-84
  geo: { id:'geo', name:'地理 · 财富之城', priceUSD: 19.99,
         kind:'one_time', grants:['geo'] }              ← ★ 定价 $19.99 ✓
★ pricing.ts:86-90
  bundle3: { priceUSD: 59.99, grants:['fatebook','ziwei_deep','geo'] }  ← 含 geo ✓
★ pricing.ts:116-118
  ONE_TIME_SKUS = [fatebook, annual_report, hemun, ziwei_deep, ★geo, bundle3]

★★ /pricing 页面【真的在渲染它】
  pricing/page.tsx:253  「单项报告价目：5 个非命书的单项 SKU」
  pricing/page.tsx:260  ONE_TIME_SKUS.filter(s => s.id !== 'fatebook').map(...)
  → 会渲染出「地理 · 财富之城 $19.99」✗

★★★ 但 /api/geo/route.ts:100
  // §1.5 geo 为「试吃」模块，不设门禁：免费层全量开放，无锁定内容
  free: { chart, geo: analysis },
  locked: null                          ← 【没有 locked】✗
  → 免费用户拿全量 ✗ · /geo 页面【一字未提付费】✗

→ ★★★★ 结果：花 $19.99 买的，与免费得到的是【同一份东西】✗
```

**★ 用户已拍板：采用方案 A —— geo 改为【真付费】** ✓

## 1.3 第二层（本任务顺带修，但更严重）：**门禁体系只接了一半**

**见 §二。**

---

# 二、★★★ 全库核查：门禁接线的真实状态

**我方核了三点，都是全库级的：**

```
① canView 的全部调用点（全库）—— 只有 2 处 ✗
   app/api/daily/route.ts:55   locked = !canView(ent, 'daily')
   app/api/unlock/route.ts:25  const allowed = canView(ent, 'fatebook')
   （第三处 lib/entitlement.ts:38 是函数定义本身）

② getEntitlements 同样只有 2 处（同上两个文件）

③ REPORT_GRANTS 有 5 个，【4 个完全没接】✗
   ['fatebook' ✓接了, 'annual_report' ✗, 'hemun' ✗, 'ziwei_deep' ✗, 'geo' ✗]

④ locked 在【前端零消费】✗
   · 写了 locked.preview 的有三处：paipan:95 · ziwei:67 · hemun:101
   · 但前端 grep 整个 src/app/**/*.tsx → 【零命中】✗
   · 那三个 preview 是【写给没人看的】✗
```

**★★★ 即：门禁体系的状态是**

| 层 | 状态 |
|---|---|
| 判据（`entitlement.ts`：`canView` / `getEntitlements` / `grants`） | ✓ 完成 |
| 数据（`pricing.ts`：5 个报告 grant + 6 个订阅 grant） | ✓ 完成 |
| **接线（路由调用 `canView`）** | **✗ 5 个报告里只接了 1 个** |
| **前端消费 `locked`** | **✗ 0 个** |

**★ `ENTITLEMENT_ENFORCE = false` 让它【暂时无害】✓ ——
但接入支付那天，四个报告模块【全部无门禁】✗ ——
而这与第 14 轮记的「接入支付那天会集体出错」是同一类问题。**

---

# 三、★★ 范围选择（**已拍板：范围 2**）

**★ 若只做 geo，会产生新的不一致** ✗：

```
改完之后的局面：
  geo          ✓ 有门禁（$19.99）
  ziwei_deep   ✗ 无门禁（而它是 $24.99 的付费 SKU）
  hemun        ✗ 无门禁（$29.99）
  annual_report ✗ 无门禁（$19.99）
  fatebook     ✓ 有门禁（$29.99）
→ ★★★★ 矛盾没消失，只是【换了个模块】✗
```

| 范围 | 内容 | 代价 |
|---|---|---|
| 范围 1 | 只做 geo | 小；但**与另三个不一致** ✗ |
| **★ 范围 2** | **五个报告模块一起补完**（geo ＋ ziwei_deep ＋ hemun ＋ annual_report，fatebook 已接需复核） | 改法同型，每个约 10–20 行；**一次做完，结构一致** ✓ |

## ★★★ 用户已拍板：**采用范围 2** ✓（2026-10-09）

**即：五个报告模块一起补完**，**不是**只做 geo ✓

**理由（我方原陈，用户采纳）**：
```
· 改法同型（后端接 canView、前端消费 locked）✓
· ★★ ENFORCE=false → 内测期行为完全不变 ✓ → 风险低 ✓
· ★★★ 不做的代价：接入支付时【四个模块同时爆】✗ 而那时改动更大 ✓
· ★★★★ 新增的「定价与门禁一致性」断言，只有范围 2 才能全绿 ✓
  （范围 1 下它会对另三个模块翻红 ✗）
```

**★ 因此 §三 的"范围选择"已关闭，以下 §四 即为最终范围 ✓**
**★★ 另：`fatebook` 已在 `unlock` 路由接了 `canView` ✓ —— 但那不是"locked 分层"式的门禁，
本任务【要复核它并统一到同一形态】✓（见 §4.2 末）**

---

# 四、逐文件改动（范围 2 · 已拍板）

## 4.1 `api/geo/route.ts` —— 加 free/locked ＋ 接入 canView

**现在**（第 95-105 行附近）：

```ts
const aiReport = await generateAIGeo(analysis)
const ai = aiReport || fallbackGeoText(analysis)
const aiSource = aiReport ? 'AI 深度解读' : '规则版（AI暂不可用）'
...
  free: { chart: {...}, geo: analysis },
  locked: null,
```

**改为**（照 ziwei 的**分层思路**，但**要真的判**）：

```ts
// ★ 门禁判定统一走 entitlement（§8.5.1），不得在本路由另写判断
const ent = await getEntitlements(admin, user.id)        // 未登录时用 EMPTY_ENTITLEMENTS
const unlocked = canView(ent, 'geo')
// ★★ ENFORCE=false → unlocked 恒 true → 内测期行为与现在完全一致 ✓
const ai = unlocked ? (aiReport || fallbackGeoText(analysis)) : null
const aiSource = !unlocked ? '未解锁'
  : aiReport ? 'AI 深度解读'
  : '规则版（AI结果未过合规校验）'      // ★ 见 4.4：与"AI 不可用"分开
...
  // ★★ free 层保留【结构化的城市推荐与指数】—— 这是"试吃"：让用户看到有什么
  free: { chart: {...}, geo: analysis },
  // ★★★ locked 在已解锁时为 null（与现在一致 ✓）；未解锁时给 preview 与 skus
  locked: unlocked ? null : {
    skus: ['geo'],
    preview: '方位总论 · 现居城市影响 · 财富/事业/贵/安居/才华五城解读 · 迁居开运建议（AI 深度解读，共 8 节）解锁后可见。'
  },
```

**★ 关键**：
- **`free` 内容不变** ✓（结构化数据仍免费 —— 这是"试吃"的本意 ✓）
- **`locked` 在 `ENFORCE=false` 时恒为 `null`** ✓ → 前端行为不变 ✓
- **`ai` 在未解锁时为 `null`** ✓ —— 而 `geo`（结构化）仍在 `free` 里 ✓

**⚠️ 未登录时的处理**：`getEntitlements` 需要 `userId` ✗
→ 用 `EMPTY_ENTITLEMENTS`（`entitlement.ts` 已导出 ✓）替代 ✓
→ 而 `canView(EMPTY_ENTITLEMENTS, 'geo')` 在 `ENFORCE=false` 时仍为 `true` ✓

## 4.2 `api/ziwei/route.ts` · `api/hemun/route.ts` · `api/paipan/route.ts`（年运）—— 同型改动

```
· 接入 getEntitlements + canView(ent, 'ziwei_deep' | 'hemun' | 'annual_report')
· ★★ 已有的 locked 从"死字段"改为【按 unlocked 判定】：
    locked: unlocked ? null : { skus: [...], preview: '（沿用现有 preview 文案）' }
· ★ ai 在未解锁时为 null；结构化部分留在 free
★ 注意 paipan 的 grant 是 fatebook ✓ 而已在 unlock 路由接了 ✓
  → 本任务【复核】它，不重复接 ✓
```

## 4.3 ★★ 前端消费 `locked`（**这是现在完全缺失的一环**）

```
涉及页面：geo · ziwei · hemun · chart（命书）
★ 要求：
  · 读 data.locked
  · 若 locked 非空 → 显示 preview 文案 ＋ 解锁引导按钮（→ /pricing）
  · 若 locked 为 null → 照旧显示内容（内测期就是这一支 ✓）
★ 参照现成写法：pricing/page.tsx 的会员卡灰块（「即将推出」）是同型 UI ✓
  —— 但文案要改为"解锁后可见"＋ 价格来自 SKUS（★ 不得硬编码 ✓）
```

## 4.4 ★ 顺带：`aiSource` 三态（你标的「待拍板 1」，我方同意做）

```
现在（两态）：aiReport ? 'AI 深度解读' : '规则版（AI暂不可用）'
  ★ 问题：把「合规拒绝」与「AI 真不可用（未配 KEY/网络失败）」混为一谈 ✗

建议（三态）：
  · 未解锁        → '未解锁'
  · 已解锁 · AI 成功 → 'AI 深度解读'
  · 已解锁 · AI 回退 → '规则版（AI结果未过合规校验）'
★ 这需要 generateAIGeo 返回【原因】而非 null —— 你提的「null → { report, reason }」是对的 ✓
★★ 若改动过大，可先只做标签文案的三态（不改签名），把原因留到 §4.5 ✓
```

## 4.5 ★★ 你标的「待拍板 2」：prompt 从判据派生（**建议一并做**）

> **★★★★ 交叉说明（2026-10-09 后补）**：
> **本节已被 [`HANDOFF-7档吉凶判词与禁用词拆表.md`](HANDOFF-7档吉凶判词与禁用词拆表.md) §4.2 取代。**
> 原因：用户随后拍板**启用 7 档吉凶判词**（A 类移出禁用），
> `FORBIDDEN_WORDS` 的**内容变了**（拆为确定性表 B + 行动指令表 C），
> 因此"从判据派生"这件事应由那份任务书统一实现 ✓
> **★ 本节的机制描述仍然正确（派生而非手抄），但请以那份的常量定义为准。**
> **★ 若两份同时执行：本节视为【被取代】，不要重复实现。**

**这是 `REPLY-geoAI回退复核.md` §五 的修法，与本任务同属"防复发"：**

```ts
// src/lib/ai-check.ts —— 新增导出
export const FORBIDDEN_WORDS_PROMPT =
  `以下词语一律禁用：${FORBIDDEN_WORDS.join('、')}（"必"含务必/必然/必定）。\n` +
  `逐字替换范例：务必→宜；必然/注定→往往；必定→多半；一定→往往；` +
  `大吉→较为有利；积极进取→稳中求进；突破性进展→阶段性的进展。`

// 四个 AI 模块（aiGeo / aiZiwei / aiHemun / aiAnalysis）的 SYSTEM_PROMPT
// 【用模板串拼入】，不再各手抄一份
```

**⚠️ 上例中的「大吉→较为有利」这一行【已作废】** ✗ ——
7 档启用后，「大吉」是**合法判词**，不再需要替换 ✓

**★ 现值（供对照，说明为什么要派生）**：
```
ai-check.ts:4  FORBIDDEN_WORDS = ['大吉','大凶','积极进取','突破性进展','必','一定','注定']  ← 7 个
aiZiwei:35     大吉、大凶、积极进取、突破性进展、必、一定、注定   ← ✓ 全 7 个
aiGeo:39       大吉、大凶、必、一定、注定                        ← ✗ 缺 2 个（实测因此回退）
aiHemun:42     只说"必"与"一定""注定"                             ← ✗ 缺 4 个（比 aiGeo 更差）
```

---

# 五、断言（纳入 `verify`）

```
① ★★ geo 的 free/locked 结构
   · ENFORCE=false 时：调 /api/geo → 断言 locked 为 null ✓（内测期不变 ✓）
   · ★ 且断言 free.geo 仍含结构化数据（城市推荐）✓

② ★★★ canView 接线（全库级）
   · 断言 REPORT_GRANTS 的【每一个】都能在路由里找到对应的 canView 调用 ✓
   · 实现：遍历 src/app/api/**/route.ts，检查每个 grant 都有 canView(ent, '<grant>')
   ★ 这条断言【现在会对 4 个模块翻红】✗ —— 那正是范围 2 要修掉的 ✓

③ ★★ 前端消费 locked
   · 断言 4 个页面（geo/ziwei/hemun/chart）源码里出现对 locked 的读取 ✓
   · ★ 并补行为断言：真的渲染一次，断言 locked 非空时 preview 文案出现在输出里 ✓

④ ★★★★ 「定价与门禁一致性」（**新增，本任务的核心防复发手段**）
   · 断言：pricing.ts 里每一个 kind==='one_time' 且有 grants 的 SKU，
     其 grants 中的每个报告类 grant，都必须：
       (a) 在某个路由里有 canView(ent, grant) 调用 ✓
       (b) 在该路由的响应里有 locked 结构 ✓
   ★ 这条断言的存在意义：它让"定价了但没门禁"在结构上不可能再发生 ✓
   ★★ 牙口：把 geo 的 canView 调用删掉 → 该断言必须精确翻红 ✓

⑤ ★ prompt 与判据同源（§4.5 的守护）
   · 断言四个 AI 模块的 SYSTEM_PROMPT 【包含 FORBIDDEN_WORDS 全集】✓
   ★ 牙口：从任一模块 prompt 删掉一个词 → 精确翻红 ✓

⑥ 回归
   · ENFORCE=false 下，/api/geo 的返回体【与现在等价】（除多一个 locked: null）✓
   · /geo 页面渲染不变 ✓
```

**⚠️ 断言写法三条硬要求（§8.6.7）**：
```
★ 一、②③④ 涉及"路由行为"的，必须【真的调用】—— 不得只 grep 源码文本
     （③ 已给出行为断言的做法；②④ 可用 mock admin + 直接调 route handler）
★ 二、牙口用【文本不变、行为变坏】的改法；若断言本身是文本断言（如⑤），
     "删掉一个词"是合适的注入 ✓
★ 三、注入前先确认注入有效（肯定性证据），确认失败即中止 ✓
```

---

# 六、必须避免

- ❌ **不得打开 `ENTITLEMENT_ENFORCE`**（仍是 `false`）
- ❌ **不得照抄 ziwei/hemun 的"死 locked"写法**（写了不判、前端不读）
- ❌ **不得把 `free` 层的结构化城市推荐也锁起来** —— 那是"试吃"的本意 ✓
- ❌ **不得在路由里另写权益判断**（一律走 `canView`）
- ❌ **不得改 `pricing.ts` 的价格或 grants 表**（那是拍板过的 ✓ 除非用户另拍）
- ❌ **不得改 `entitlement.ts`**（它已被断言守护 ✓）
- ❌ **不得硬编码价格到前端文案**（取自 `SKUS` ✓）
- ❌ **不得顺手改 `/pricing` 的会员卡「即将推出」**（路线 B，另议）
- ✅ **未登录时必须能正常返回**（用 `EMPTY_ENTITLEMENTS` ✓）

---

# 七、验收标准

| # | 项 | 期望 |
|---|---|---|
| 1 | `geo` 有 free/locked 结构，且 `locked` 由 `canView(ent,'geo')` 决定 | ✓ |
| 2 | ★★ **`ENFORCE=false` 时 `locked` 恒为 `null`** → 内测期行为不变 | ✓ 贴实测 |
| 3 | ★★★ **5 个报告 grant 全部有 `canView` 调用** | ✓ 贴全库核查输出 |
| 4 | ★★ **4 个页面真的消费 `locked`**（显示 preview ＋ 解锁引导） | ✓ 贴截图或断言输出 |
| 5 | ★★★★ **新增「定价与门禁一致性」断言** | ✓ |
| 6 | ★ prompt 从 `FORBIDDEN_WORDS` 派生；四模块 prompt 含全集 | ✓ |
| 7 | 各断言含**行为断言**，非纯 grep | ✓ |
| 8 | ★ 牙口：删 geo 的 canView → ④ 精确翻红；删 prompt 一个词 → ⑤ 翻红 | ✓ **贴注入前后实际值** |
| 9 | `npm run verify` 全绿 ＋ `tsc --noEmit` 0 错误 | ✓ |
| 10 | 未动价格表 / `entitlement.ts` / `ENFORCE` / `/pricing` 会员卡 | ✓ |

---

# 八、一句话

> **用户选的是方案 A：geo 改为真付费。**
> **★★★ 但我方全库核查发现：这不只是 geo 的事** ——
> **`canView` 全库只有 2 处调用，而 `REPORT_GRANTS` 有 5 个（4 个没接）** ✗
> **且 `locked` 在【前端零消费】✗ —— paipan/ziwei/hemun 写的那三个 `preview` 是写给没人看的** ✗
> **→ 所以【照 ziwei/hemun 的样做，只会让 geo 也变成死字段】** ✗
>
> **★★★ 两条路**：
> **范围 1**：只改 geo → 矛盾没消失，只是换了个模块 ✗
> **范围 2（我方推荐）**：**五个报告模块一起补完** ✓ 改法同型、`ENFORCE=false` 下行为不变、风险低 ✓
>
> **★★★★ 而本任务真正的产出，是那条新断言**：
> **「定价与门禁一致性」—— 每一个定价出售的报告 grant，都必须在某路由里有 `canView` 调用**
> **并带 `locked` 结构。** 有了它，「定价了却没门禁」在结构上不可能再发生 ✓
>
> **★ 而最关键的前提**：`ENTITLEMENT_ENFORCE` 仍是 `false` → **内测期行为与今天完全一样** ✓
> 本次只是**把门禁接上**，**不是**"现在开始收费" ✓
