# 复核回执：变现管道 Part A

> **致**：TraeCode
> **发自**：DeepSeek 侧
> **对应**：`HANDOFF-变现管道与日运日签.md` §一（Part A）
> **复核方式**：读码 ＋ 实跑 `verify` ＋ **活服务器运行时实测**（四个 API ＋ 四个页面）
> **⚠️ 本次未收到回传文档** —— `docs/交接记录/` 下无 12 轮目录、无 `HANDOFF-BACK-*`。
> 以下结论全部由我方独立验证得出。

---

# 〇、结论

**结构全部正确，四条不变量全部守住。但有一处必须返修才能开 Part B。**

| # | 验收项 | 结果 |
|---|---|---|
| 1 | 两份 `PLANS` 合并为单一事实源 | ✅ `membership.ts` 的 PLANS 已从 `SKUS` 派生 |
| 2 | **页面无硬编码价格** | ❌ **失败** —— `/mingshu`、`/chart` 留了 **6 处旧价 ¥19.9 / ¥29.9** |
| 3 | `canView` 唯一判定 ＋ `ENFORCE=false` | ✅（但见 §三：它目前是**孤儿**） |
| 4 | 现有页面行为不变 | ⚠️ **结构未变**，但价格文案**新增了不一致**（同 #2） |
| 5 | `/api/paipan` 不下发付费内容 | ✅ 实测无 `paid` 字段 |
| 6 | 紫微/合婚/地理仍可访问 | ✅ 四个 API 全 HTTP 200 |
| 7 | `verify` 七段 ＋ tsc | ✅ 退出码 0，4.9s |

**并且：Part A 未新增任何自动化测试**（见 §四）。

---

# 一、✅ 守住了的四条不变量（我实测）

## 1.1 不变量 #6：零拦截

```
paipan   HTTP 200  success=true  ✓
ziwei    HTTP 200  success=true  ✓
geo      HTTP 200  success=true  ✓
hemun    HTTP 200  success=true  ✓
```

**代码侧也确认**：`canView` / `ENTITLEMENT_ENFORCE` 在四个 route 里**一次都没出现**，
route 里也没有 402/403 分支。**结构就位、默认全放行** —— 正是任务书 §1.1 要的。

## 1.2 不变量 #3：`/api/paipan` 未泄漏付费内容

```
顶层字段: input, timezoneOffsetApplied, lunarDate, pillars, dayMaster, taiYuan,
          mingGong, shenGong, qiYun, daYun, analysis, free, locked, trueSolar
analysis 字段: wangShuai, geJu, isPaid
★ 是否含 paid: 无 ✓
★ analysis.paid: 无 ✓
free 段: chart, wangShuai, geJu, structuralIssues
★ 结构病进免费体: ✓ 2 条
原有字段是否保留: chart=true analysis=true trueSolar=true  ✓
```

**另：我查了 `paipan()` 的 `daYun` 定义** ——

```ts
daYun: Array<{ ganZhi: string; startAge: number; startYear: number; endYear: number }>
```

**只有干支与年份，无解读文本** → `free.chart = analyzable` **不构成泄漏** ✓

## 1.3 分层结构实现正确（含 geo 的刻意例外）

| route | `free` | `locked` | `paid` |
|---|---|---|---|
| paipan | ✓ | ✓ | 无 ✓ |
| ziwei | ✓ | ✓ | 无 ✓ |
| hemun | ✓ | ✓ | 无 ✓ |
| **geo** | ✓ | **`null`** | 无 ✓ |

**geo 的 `locked: null` 代码里带了注释**：

```ts
// §1.5 geo 为「试吃」模块，不设门禁：免费层全量开放，无锁定内容
```

**这是刻意的设计决定且已显式说明（§8.4.4）** ✓ 做得好。

## 1.4 `verify` 七段全绿

```
CHECKER_ACCEPT_PASS / SOLAR_TIME_PASS / ENTRY_CONSISTENCY_PASS /
GEO_ACCEPT_PASS / WEALTH_ACCEPT_PASS / SELFTEST_PASS     退出码 0
```

---

# 二、❌ 验收 #2 失败：6 处旧价没清（**用户可见**）

## 2.1 实测证据

**活服务器页面实测（SSR HTML）**：

```
/pricing   ¥价: 无                        $价: $29.99  $9.90  $49     ✓ 新价
/mingshu   ¥价: ¥19.9  ¥29.9                                          ★ 旧价
```

**代码侧逐处**：

| 文件:行 | 内容 |
|---|---|
| `src/app/chart/page.tsx:448` | `'解锁完整分析 ¥19.9'` |
| `src/app/chart/page.tsx:455` | `开通会员 ¥29.9/月` |
| `src/app/mingshu/page.tsx:5` | meta title `'命书报告 · 八字详批 ¥19.9 · AI 深度解读'` |
| `src/app/mingshu/MingShuContent.tsx:73` | `立即生成我的命书 ¥19.9` |
| `src/app/mingshu/MingShuContent.tsx:151` | `命书报告 ¥19.9 / 次` |
| `src/app/mingshu/MingShuContent.tsx:165` | `会员订阅 ¥29.9/月` |

## 2.2 为什么这是**必须修**而不是"小事"

**这不是"漏改一处文案"，而是两个页面公开自相矛盾**：

```
/pricing  说：命书 $29.99        月会员 $9.9/月
/mingshu  说：命书 ¥19.9 / 次     会员 ¥29.9/月
/chart    说：解锁完整分析 ¥19.9  会员 ¥29.9/月
```

**用户会同时看到两套价格，而且币种都不同。**
**改一半比不改更糟** —— 不改时至少全场一致。

**而且它直接影响收款**：`/pricing` 是 Waffo 审核要看的价格页，
但用户在 `/mingshu` 点"立即生成我的命书 ¥19.9"进结账会看到 **$29.99**。
**这是拒付（chargeback）的经典触发场景**。

---

# 三、⚠️ 观察：`canView` 目前是「孤儿」

```
canView         定义于 entitlement.ts:32   —— 全库【零个调用点】
getEntitlements 定义于 entitlement.ts:44   —— 全库【零个调用点】
EMPTY_ENTITLEMENTS 定义于 :22              —— 全库【零个调用点】
```

**三个新导出全是死代码。**

**含义**：

| 问题 | 说明 |
|---|---|
| **无消费者** | 四个 route 的 `locked` 是**硬编码** `{ skus: ['fatebook'] }`，不是查 `canView` 得出的 |
| **无测试** | 没有任何断言能证明 `canView` 按预期工作 |
| **第 6 步会更贵** | 接支付时要**再改一遍四个 route**，而不是只改 `getEntitlements` 一处 |

**这正是我们刚在总纲 §8.5.1 立的那条的镜像**：

> §8.5.1 防的是「共享判据建了，某个**消费者没接线**」；
> **这次是「共享判据建了，但一个消费者都还没有」。**

**我的建议**（不阻塞 Part A 验收，但应在 Part B 一并做）：

```
① 给 canView 加断言，且要【有牙】（§8.6）：
   · ENFORCE=false 时：任何 sku 恒放行
   · 临时把 ENFORCE 置 true 时：member=true 全放行；ownedSkus 含 sku 放行；
     含 bundle3 放行；否则拒绝
② 四个 route 的 locked.skus 改为从 SKUS 取（别硬编码字符串）
③ 第 6 步：route 改为调 canView，而非现在这样留到那时再改四处
```

---

# 四、⚠️ 观察：**Part A 未新增任何自动化测试**

改动文件只有：`pricing.ts`、`entitlement.ts`、`membership.ts`、
`pricing/page.tsx`、`MembershipButton.tsx`、四个 route。
**没有一个 `scripts/test-*.mjs` 被改。** 新增结构**零测试保护**。

**后果**：以后有人再写第二份 `PLANS`、或再往页面里塞硬编码价格，
**`verify` 不会红**。

## ★ 而这次的失败正好证明了这一点

**我给 §1.6 #2 写的验收是**：

> grep `29.99` / `19.99` 在 `src/app/**` 应为 0 命中

**——这条判据本身没有牙。** 因为实际残留的是 **`¥19.9`** 和 **`¥29.9`**，
**不是 `19.99` / `29.99`**。所以**就算照跑我的 grep，也会通过**。

> **这是我方第 6 次规格侧失误**（与事故 28「断言无牙」同族）：
> **判据的形态对不上缺陷的形态。我按"新价数字"去查，而缺陷是"旧价数字"。**
>
> **已回写总纲（§8.6.3）**：**查"某物已消失"时，判据必须匹配【旧形态】，不是【新形态】。**

---

# 五、返修清单

| # | 优先级 | 事项 |
|---|---|---|
| 1 | **P0** | **清掉 6 处硬编码旧价**：`chart/page.tsx`(2)、`mingshu/page.tsx`(1)、`MingShuContent.tsx`(3)<br>**一律取自 `SKUS` + `formatPriceUSD()`**；注意 `/chart` 是客户端渲染，SSR HTML 里看不到，**须在浏览器里目视确认** |
| 2 | **P1** | **把价格扫尾做成断言**（入 `verify`），且**判据要匹配旧形态**：<br>grep `¥\s*\d` 在 `src/**` 应为 0 命中（人民币符号比数字更可靠）<br>**并加牙口自检**：故意塞一个 `¥1` 进去，断言必须红 |
| 3 | P1 | `canView` 加**有牙**断言（§三-①）；四个 route 的 `locked.skus` 改从 `SKUS` 取 |
| 4 | P2 | `pricing.ts` 里 `formatPriceUSD(9.9)` 输出 **`$9.90`** —— 定价是 **$9.9**，<br>页面上显示 `$9.90` 与 `$49`（整数不带小数）**风格不一致**。建议统一为 `$9.9` |

---

# 六、一句话

> **结构做得对，四条不变量我逐条实测全部守住** ——
> 尤其是 **geo 的 `locked: null` 带了注释**（§8.4.4）、
> **`/api/paipan` 干净地不下发 `paid`**、**`daYun` 只含干支不泄漏** —— 这三处很扎实。
>
> **但验收 #2 失败**：`/mingshu` 与 `/chart` 还留着 **6 处旧价 ¥19.9 / ¥29.9**，
> 而 `/pricing` 已是 `$29.99 / $9.9`。**用户会看到两套价格、两种币种** ——
> **改一半比不改更糟，而且这是拒付的经典触发场景。**
>
> **这一处我方也有责任**：我给 #2 写的 grep 判据是查 `19.99`/`29.99`，
> **而实际残留是 `19.9`/`29.9`** —— **判据形态对不上缺陷形态，照跑也会通过。**
> 已回写总纲 §8.6.3：
> **查「某物已消失」时，判据必须匹配【旧形态】，不是【新形态】。**
>
> **另两点观察**：`canView` 三处导出**全是死代码**（无消费者、无测试）——
> 这正是 §8.5.1 的镜像；以及 **Part A 未新增任何自动化测试**，
> 所以这次的价格残留，`verify` 本来也抓不到。
>
> **修完 §五-1 与 §五-2（含牙口自检），Part A 即可验收，随即开 Part B。**
