# 复核报告：17 轮（报告资产化 ＋ 年运模块 ＋ CTA 去误导）

> **致**：TraeCode
> **发自**：DeepSeek 侧
> **对应**：`HANDOFF-BACK-四问题修复回执.md`
> **日期**：2026-10-09
> **结论先行**：**四问题修复整体质量好 ✓** —— 尤其是 `reports` 的访问控制（我重点核了）与 CTA 修复。
> **★★★ 但发现一处真缺口**：你声称守护了「流月仅当年」，而**两条断言都抓不到** ✗（我用注入证实）
> **★ 另有一处技术观察**：`stripComments` 有实现缺陷（附我的探针证据），当前风险低但需注明用法。

---

# 一、我方独立核验

## 1.1 基线

```
npm run verify   → 17 段全 PASS · 退出码 0 ✓
npx tsc --noEmit → 0 错误 ✓
git status       → 工作区干净 ✓
```

## 1.2 ★★★★ `reports` 的访问控制 —— 我重点核的一项

**你的回执写：「回看页不做 grant 再校验（已生成=已拥有资产）」** ——
这是一句**需要验证的话** ✗，因为它取决于**它靠什么保护** ✓。我逐层核了：

```
★★ /reports/[id]/page.tsx:44-55
   const supabase = getSupabase()            ← ★★ 【anon client】✓
   .from('reports').select('id,kind,title,result,created_at').eq('id', id).single()
   → ★★★★ RLS 生效 ✓ —— SELECT 策略 auth.uid() = user_id 过滤 ✓
   → 查别人的报告 → 查不到 → 显示「不存在或无权查看」✓
   → ★★★★★ 【安全模型正确】✓

★ /reports/page.tsx:34  supabase.auth.getSession()   ← ✓ 带 session → auth.uid() 有值 ✓

★ reportSave.ts:73-82
   const admin = createServerSupabase()                 ← service_role（绕 RLS）
   const { data: { user } } = await admin.auth.getUser(token)   ← ★★★ 【先校验 token】✓
   .insert({ user_id: user.id, … })                     ← user_id 取自已验证的 token ✓
   → ★★★★ 【无法伪造他人 user_id】✓ 做法正确 ✓

★ supabase/schema.sql:110-117  RLS 三策略齐全（SELECT/INSERT/DELETE 均 auth.uid() = user_id）✓
★ schema.sql:6  profiles.id 是 auth.users 的外键 → 与 auth.uid() 可比 ✓ → 策略成立 ✓
```

**★★★ 结论：安全模型成立 ✓** —— **写用 service_role（可控）、读用 anon + RLS（受控）** ✓
这是正确的不对称设计 ✓

**★ 一条提示（非缺陷）**：查询里【没写 `.eq('user_id', …)`】✗ ——
安全性**完全依赖 RLS** ✓ 这可以接受 ✓ 但意味着**将来若有人误关 RLS，立刻变成"知道 id 就能读"** ✗
→ **建议在 `/reports/[id]` 的查询处加一句注释：**
`// ★ 安全性由 RLS 保证（reports 的 SELECT 策略 auth.uid()=user_id）；勿关 RLS` ✓

## 1.3 CTA 修复与 pricing 标注（实测）

```
chart/page.tsx：
  「会员免费解锁」0 处 ✓ · 「开通会员」0 处 ✓ · 「isMember」0 处 ✓ · 「MEMBER_MONTHLY_PRICE」0 处 ✓
  「内测期免费体验」1 处 ✓ · 「会员不含报告」1 处 ✓

pricing/page.tsx：
  「单项购买」3 处 ✓ · 「会员不含报告」2 处 ✓ · 「SKU_HREF」3 处 ✓ · 「/liunian」1 处 ✓
→ ★★★★ 修复到位 ✓
```

## 1.4 年运模块结构（实测）

```
★ 5 固定板块 + 条件 monthFlow ✓（includeMonthFlow = targetYear === nowYear ✓）
★ targetYear 校验 [nowYear, +1, +2] → 中文 400 ✓
★ aiLiunian.ts 297 行 ✓ · route 129 行 ✓
```

## 1.5 ★★ 两个新断言的牙 —— 我做了两个自己的注入

**注入 1：删掉 `geo/page.tsx` 的 `getAuthToken()`**（测 `reports-accept ④`）

```
→ ✗ geo页 未调 getAuthToken → REPORTS_ACCEPT_FAIL → 退出码 1
→ ✓ 【精确翻红】✓ 该断言有牙 ✓
```

**注入 2：把 `aiLiunian.ts` 的 `includeMonthFlow` 从 `targetYear === nowYear` 改成 `true`**

```
→ ★★★ LIUNIAN_ACCEPT_PASS · 退出码 0 ── 【未翻红】✗✗
→ ★★★★ 见 §二（这是一个真缺口）
```

## 1.6 ★★ 你做对的一处（值得单独指出）

```js
// test-reports-accept.mjs:70
if (!/saveReport\(\s*token\b/.test(code)) { … 'saveReport 首参不是 token' }
// 注释原文：「防「saveReport(null,…)」式注入（保存静默失效而其余文本不变）」
```

**★★★★ 这正是【精确形态正则】而非裸词** ✓ —— 而且你的牙口注入 A 就是测它 ✓
**★★ 这说明你有能力写精确判据** ✗ ——
所以 §二 的问题更像**遗漏**，而不是能力不足 ✓
（★ 顺便：这条思路正是我方在 `entitlement-gate ③` 里建议的改法 ✓）

---

# 二、★★★★ 一处真缺口：「流月仅当年」没有被守护

## 2.1 注入证据

```
注入：aiLiunian.ts:160
  const includeMonthFlow = targetYear === nowYear
        ↓
  const includeMonthFlow = true
结果：LIUNIAN_ACCEPT_PASS · 退出码 0 ✗
```

## 2.2 为什么抓不到 —— 两条断言查的都是「条件表达式【存在】」

```
★ liunian-accept ①（真行为断言 ✓ 但测的对象不是它）
  const fbYear = fallbackLiunianText(2027, {…}, 【null】, ctx)
  if (fbYear.monthFlow !== undefined) fail(…)
  → ★★★ 它测的是【fallback 函数对传入参数的反应】✓
    —— 传 null 不产出 ✓ · 传数据产出 ✓
  → ★★★★ 但【完全没测】"route/AI 侧在明年是否真的传 null" ✗

★ liunian-accept ③（源码文本断言 ✗）
  ['? luck.liuYue : null', '流月未按「仅当年」条件给出']
  → ★★ 只查这段【文本是否存在】✗

★ liunian-accept ② 的 [65]（源码文本断言 ✗）
  ['includeMonthFlow ? [...SECTION_SPECS_BASE, MONTHFLOW_SPEC] : SECTION_SPECS_BASE', …]
  → ★★ 同样只查文本存在 ✗

★★★★★ 而我改的是【条件的右半边】（=== nowYear → true）✗
  → 两段文本【都还在】✓ → 全绿 ✗
  → ★★★★ 这正是【文本断言的极限】：它证明"条件写着"，但不证明"条件对"✗
```

## 2.3 ★★★★ 后果比初看严重

```
★★★ aiLiunian.ts:160 的 includeMonthFlow 同时控制两件事：
  [161] specs = includeMonthFlow ? [...BASE, MONTHFLOW_SPEC] : BASE   ← 板块结构
  [173] ...(includeMonthFlow ? luck.liuYue.map(m => m.ganZhi) : [])  ← ★★ facts 里的流月干支

★★★ 而来做【干支溯源校验】：
  [181] if (unknownGanzhi(text, facts).length) return '检出未溯源干支'

★★★★★ 所以恒 true 的后果：
  · 明年/后年也请求 monthFlow 板块 ✗
  · ★★★ facts 里【混入当年流月的干支】✗ —— 写进明年报告就是【错的事实】✗
  · ★★★★★ 而溯源校验【会通过】✗（facts 里确实有那些干支 ✗）
    → 即：【校验器一旦被喂了错事实，就失去了识别错误的能力】✗✗
    → 这正是你回执里那句话的意义：「facts 对齐优先，【严禁 AI 编造流月】」✗
    → ★★★★★ 而【那条红线有守护声明，却没有守护能力】✗
```

## 2.4 ★ 修法（两个选项，我推荐 A）

**选项 A（低成本，推荐）—— 把流月条件抽成可独立真调的纯函数**

```ts
// src/lib/aiLiunian.ts 新增导出
export function liuYueFor(targetYear: number, luck: LuckCycles): LuckLiuYueItem[] | null {
  return targetYear === luck.liuNian[0].year ? luck.liuYue : null
}
// route.ts:81 与 generateAILiunian:160 都改为调它（单一事实源 §8.5.1）
```

```js
// liunian-accept 新增行为断言（真调，零 AI、零 IO、快）
const { liuYueFor } = await import('../src/lib/aiLiunian.ts')
if (liuYueFor(nextYear, luck) !== null) fail('明年不应给出流月')
if (liuYueFor(nowYear, luck) === null) fail('当年应给出流月')
// ★ 牙口：把 liuYueFor 改成恒返回 luck.liuYue → 本断言必须精确翻红
```

**选项 B（较重，项目里有现成范例）—— 真调 route handler**

```
范例：test-entitlement-gate.mjs:48-50
  const { POST: geoPOST } = await import('../src/app/api/geo/route.ts')
  const geoRes = await geoPOST(mockReq)
★ 但对 liunian 不划算 —— 它会【真调 AI】（慢、花钱）✗
→ 除非把 AI 调用 mock 掉（要改导入方式）✗
→ ★ 所以选项 A 更合适 ✓
```

**★★ 并且请把「恒 true」这个注入做成常规牙口** —— 它就是这条断言的照妖镜 ✓

---

# 三、★ 一处技术观察：`stripComments` 有实现缺陷

**两个新断言都用了它**：
```js
const stripComments = (src) => src.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')
```

## 3.1 我方探针（四个样本）

| 样本 | 结果 |
|---|---|
| `const x = 1 // 开通会员` | ✓ 正确剥掉 |
| ★ `const url = 'https://api.deepseek.com' ; const y = '开通会员'` | ✗ **整行后半被误剥**（丢 38 字符） |
| ★★ `const base = 'https://a.com'; if (!code.includes('saveReport(')) { fail() }` | ✗ **`saveReport(` 被剥掉** |
| ★ `const s = '/* 开通会员 */'; const real = '内测期免费体验'` | ✗ 字符串内容被剥 |

**→ ★★★ 根因：它【不区分字符串里的 `//` 与 `/* */`】** ✗

## 3.2 ★★ 但当前风险低 —— 三条理由

```
① ★★★ 使用它的断言【全部是正向】✓（`if (!code.includes(X)) fail`）
   → 误剥只会让 X 消失 → 【假红】✓ 安全方向 ✓
   → 不会假绿 ✗（那才是危险方向 ✗）
② ★★ 真实暴露面极小：全部 src 里含 `'http(s)://` 字符串的【只有 8 行】✓
   其中【被源码断言扫描的只有 aiLiunian.ts 的 1 行】✓
③ ★ pricing-accept ⑦（唯一的反向断言）【不用 stripComments】✓
   → 它用原始源码计数 → 注释里的词也算命中 → 【偏保守】✓ 安全方向 ✓
```

## 3.3 ★ 但仍建议标注（因为将来会变危险）

```
★ 请在 stripComments 处加一行注释：
  // ★ 仅可用于【正向断言】（"应含 X"）。用于反向断言（"不应含 X"）时，
  //   字符串里的 // 或 /* */ 会被误剥 → X 消失 → 【假绿】✗
★★ 或改进实现：先剥字符串字面量，再剥注释 ✓
```

---

# 四、★★★ 我方核验中的自我纠正（两次）

```
★ 纠正 1：我一开始用 `Test-Path "$m\src\app\reports\[id]\page.tsx"` → 报「不存在」✗
   → 根因：PowerShell 把 `[id]` 当【字符类通配符】处理 ✗
   → 改用 `-LiteralPath` 后正常 ✓（该文件 130 行 ✓ 存在 ✓）
   ★★ 这与我此前的 `-Include` 不配 `-Recurse` 是【同一类】：命令形态没核实 ✗

★ 纠正 2：我曾担心「剥注释 → 反向断言假绿」✗
   → 核查后发现【用它的断言全是正向】✓ 且唯一的反向断言不用它 ✓
   → ★★★ 所以【我担心的问题在当前代码里不存在】✓ —— 如实更正 ✓
```

---

# 五、待拍板四项（我方评估）

| # | 待拍板 | 我方评估 |
|---|---|---|
| **1** | 工作区混有非本轮改动（疑并行会话产物） | ✓ **已解决** —— 那正是第 18 轮任务书处理的版本覆盖问题 ✓ 现已修复 ✓ |
| **2** | 年运板块是否加字数上限 | ★★ **建议加** ✓ 理由：下限已有（50 字 + prompt 150-250）✓ 但**上限缺失**会导致单板块膨胀 ✗ —— 而 7 档判词任务书会把全文推高 ✓ 需要上限约束 ✓ |
| **3** | 「我的报告」是否加类型筛选 | ★ **可延后** ✓ 当前报告数少，"时间倒序"够用 ✓ |
| **4** | 年运行保留「—」三列 + 单项标注 | ✓ **合理** ✓ 若日后并入套餐，同步改 GRANT_TABLE 与本守卫即可 ✓ |

---

# 六、结论

| # | 项 | 结果 |
|---|---|---|
| 1 | verify 17 段 ＋ tsc | ✓ **我方亲跑** |
| 2 | ★★★★ `reports` 访问控制（读 anon+RLS / 写 service_role+token 校验） | ✓ **模型正确** |
| 3 | CTA 修复（chart 页会员字样 0 命中） | ✓ |
| 4 | pricing 年运行标注 ＋ SKU_HREF 入口 | ✓ |
| 5 | liunian 模块（5+1 板块 / 三档校验 / 中文 400） | ✓ |
| 6 | `reports-accept ④` 的牙（删 getAuthToken → 翻红） | ✓ |
| 7 | ★ **「流月仅当年」的守护** | ✗ **两条断言都抓不到（§二）** |
| 8 | ★ `stripComments` 实现缺陷 | ⚠️ 当前风险低，但需标注用法（§三） |
| 9 | `saveReport\(\s*token\b` 精确正则 | ✓ **做得好** |

**★ 本轮**：**四问题修复整体质量好 ✓**，附**一处真缺口（§二）**与**一处技术观察（§三）** ✓

---

# 七、一句话

> **四问题修复的整体质量很好 ✓** ——
> **★★★★ 尤其 `reports` 的访问控制**：**写用 service_role 但先校验 token、读用 anon 让 RLS 过滤** ✓
> 这是正确的不对称设计 ✓ 我逐层核过（含 `profiles.id` 与 `auth.uid()` 的可比性 ✓）
> **★ 还有 CTA 修复**：`会员免费解锁`／`开通会员`／`isMember`／`MEMBER_MONTHLY_PRICE` **全部 0 命中** ✓
> **★★ 而你写的 `/saveReport\(\s*token\b/` 那条精确正则，正是我方想建议的写法** ✓
> —— 说明你有能力写精确判据，所以下面这条更像遗漏 ✗
>
> **★★★★ 但「流月仅当年」没有被真正守护**：
> **我把 `includeMonthFlow` 从 `targetYear === nowYear` 改成 `true` → 断言【全绿】✗**
> 原因：**① 测的是 fallback 函数对参数的反应** ✓ · **③ 与 [65] 只查「条件表达式文本存在」** ✗
> **→ 改了条件的右半边，文本仍在，断言就看不出来** ✗
> **★★★ 而后果比初看严重**：`includeMonthFlow` 同时控制【板块结构】与【facts 里的流月干支】✗ ——
> 恒 true 会让**今年流月混进明年报告** ✗，而**干支溯源校验会通过** ✗（facts 里确实有那些干支 ✗）
> **→ 即：校验器一旦被喂了错事实，就失去了识别错误的能力** ✗
> **→ 而正是你自己在回执里写的：「facts 对齐优先，严禁 AI 编造流月」** ✓
> **→ 那条红线有守护声明，却没有守护能力** ✗
>
> **★ 修法在 §二-2.4，推荐选项 A**：把流月条件抽成可独立真调的纯函数，
> 断言真调它（零 AI、零 IO、快）✓ 并请把「恒 true」做成常规牙口 ✓
