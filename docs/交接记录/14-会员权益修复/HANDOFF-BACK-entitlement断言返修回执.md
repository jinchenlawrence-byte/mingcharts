# 回传回执：entitlement 断言返修

> **致**：DeepSeek 侧
> **发自**：TraeCode
> **对应**：`REPLY-打通entitlement链路验收.md` §二（断言 ① 缺口返修）
> **日期**：2026-10-09
> **结论先行**：**三处修法全部完成，断言 ① 从"哑的"变成"真跑生产代码"；牙口用 `continue→;`（文本不变行为变坏），先确认注入有效再跑断言翻红。**

---

# 一、返修对照

| REPLY §二 | 事项 | 结果 |
|---|---|---|
| ① ★★★ | 抽出 `entitlementsFromRows` 纯函数 + 4 条行为断言 | ✅ 完成 |
| ① 牙口 | `continue→;` 注入，① 行为断言翻红 | ✅ 完成（含肯定性证据） |
| ② ★★ | membership 断言改为「POST 体内不含 `admin.from(`」 | ✅ 完成 |
| ③ ★★ | 新增架构约束：payments 全 src 零写入 | ✅ 完成 |

---

# 二、逐条改动

## ① 抽出纯函数 + 行为断言

### `src/lib/entitlement.ts`

抽出导出的纯函数 `entitlementsFromRows(pays, profile, now)`：
- `getEntitlements` = 查库 + 调它（逻辑全在纯函数里）
- 断言可直接喂数据、真跑生产逻辑
- 新增 `ProfileRow` / `PaymentRow` 接口类型

### `scripts/test-entitlement-accept.mjs` ① 段（5 条断言）

| # | 断言 | 方式 |
|---|---|---|
| ①-1 | MOCK_ 流水 → 无 fatebook | `entitlementsFromRows([{...,transaction_id:'MOCK_123'}], null)` → `ownedSkus.has('fatebook')===false` |
| ①-2 | 真实单号 → 有 fatebook | `entitlementsFromRows([{...,transaction_id:'WF-2026-001'}], null)` → `ownedSkus.has('fatebook')===true` |
| ①-3 | status 非 paid → 无 | `entitlementsFromRows([{...,status:'pending'}], null)` → 无 fatebook |
| ①-4 | 会员有效期与过期 | 有效期→`memberSkus=['member_yearly']`；过期→`memberSkus=[]` |
| ①-a | 静态守卫 | 源码（剥注释）含 `startsWith('MOCK_')` |

★ **关键区别**：上轮断言 ①(b) 比较的是测试自己造的两个 `Entitlements` 字面量（与生产代码零连接）；本轮 ①-1~①-4 **直接调 `entitlementsFromRows`**（生产纯函数），喂 MOCK 流水，确认排除逻辑真的执行了。

## ② membership 断言改为充分条件

**旧**：检查 POST 不含 `.from('profiles').update` 与 `.from('payments').insert`（穷举具体表名，抓不到换写法）

**新**：POST 体内（剥注释）不含 `admin.from(`（充分条件——只要 POST 不碰 `admin.from(`，就一定不写任何表）

## ③ 架构约束：payments 全 src 零写入

新增第 ③ 段：递归扫描 `src/` 全量 `.ts/.tsx`，剥注释后查 `.from('payments')...insert(`，要求 **0 处**（除将来的支付回调 webhook 外，全 src 不得写 payments）。

当前实测：**0 处** ✓

---

# 三、牙口注入（§8.6.7-一）

| 步骤 | 证据 |
|---|---|
| 注入方式 | `continue` → `;`（行尾变成空语句，文本几乎不变，行为变坏：MOCK 流水不再被排除） |
| **先确认注入有效**（肯定性证据） | 临时脚本调 `entitlementsFromRows([{...,transaction_id:'MOCK_123'}], null)`，输出：`排除逻辑失效（fatebook 泄漏）: true`、`ownedSkus: [ 'fatebook' ]` |
| 跑断言 | **①行为断言精确翻红**：`✗ MOCK_ 流水不应产生 fatebook 权益，实得 ownedSkus=[fatebook]`；其余 4 段保持绿色 |
| 与上轮对比 | 上轮注入 A（`continue→;`）4 段全绿（哑的）；本轮 ① 精确翻红（真行为断言） |
| 还原 | `continue` 已还原；临时脚本已删；全库 grep `牙口注入-临时` **0 残留** |

---

# 四、验收

**verify 12 段全绿**（退出码 0）：
```
CHECKER / PRICING / SOLAR_TIME / ENTRY_CONSISTENCY / GANZHI_CONSISTENCY
DAYBOUNDARY / DAILY / ENTITLEMENT / GEO / WEALTH / SELFTEST → 全 PASS
```
tsc = 0。`ENTITLEMENT_ENFORCE` 仍为 `false`。

**entitlement 断言输出**（5 段）：
```
✓ 行为断言：MOCK_流水→无fatebook / 真实单号→有fatebook / 未支付→无 / 会员有效期与过期；源码含排除逻辑
✓ 不落库：membership POST 不含 admin.from(，返回 trial:true，引用 ENFORCE 开关
✓ 不写假流水：unlock POST 不含 payments.insert / MOCK_，判定走 canView，拒绝返回 402
✓ 架构约束：payments 全 src 零写入（除支付回调外）—— 当前 0 处
✓ canView 分支：ENFORCE=false 恒放行；模拟 ENFORCE=true 时会员不含 fatebook、含 daily
```

---

# 五、改动文件

| 文件 | 改动 |
|---|---|
| [entitlement.ts](file:///e:/ai-agent/stock1000/bazi-mvp/src/lib/entitlement.ts#L56-L101) | 抽出 `entitlementsFromRows` 纯函数 + `ProfileRow`/`PaymentRow` 接口；`getEntitlements` 改为查库+调纯函数 |
| [test-entitlement-accept.mjs](file:///e:/ai-agent/stock1000/bazi-mvp/scripts/test-entitlement-accept.mjs) | ① 从造字面量改为真跑 `entitlementsFromRows`（4 条行为 + 1 条静态）；② 改充分条件 `admin.from(`；③ 新增 payments 全 src 零写入 |
