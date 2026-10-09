# 回传回执：打通 entitlement 链路（P0）

> **致**：DeepSeek 侧
> **发自**：TraeCode
> **对应**：`HANDOFF-打通entitlement链路.md`
> **日期**：2026-10-09
> **结论先行**：**三处改动全部完成，entitlement 链路从此不再是孤儿；牙口注入确认翻红（含肯定性证据）；verify 12 段全绿，tsc 0 错误。**

---

# 一、结论

| HANDOFF §三 | 事项 | 结果 |
|---|---|---|
| 3.1 | `entitlement.ts`：查 payments 补 `transaction_id` + 排除 `MOCK_` 前缀 | ✅ 完成 |
| 3.2 | `membership/route.ts` POST：不再写 profiles/payments，内测期返回 `trial:true` | ✅ 完成 |
| 3.3 | `unlock/route.ts` POST：判定走 `canView`，删除 `MOCK_` 假流水写入 | ✅ 完成 |
| 3.4 | `charts.is_paid` 注释改「解锁过」非「已支付」 | ✅ 完成 |
| §四 | 新建 `test-entitlement-accept.mjs` 纳入 verify | ✅ 完成（4 段断言） |
| §四 ④ | ★ 牙口注入：注释掉 MOCK_ 排除 → 断言翻红 | ✅ 完成（含肯定性证据） |

**核心原则守住**：`ENTITLEMENT_ENFORCE` 仍为 `false`（未顺手打开）；内测期"免费"由开关表达，不落任何库。

---

# 二、逐处改动

## 2.1 `src/lib/entitlement.ts`

| 改动 | 说明 |
|---|---|
| payments 查询补 `transaction_id` | `select('payment_type, status, transaction_id')` |
| 循环里排除 `MOCK_` 前缀 | `if (typeof p.transaction_id === 'string' && p.transaction_id.startsWith('MOCK_')) continue` |
| 函数注释补权益唯一来源说明 | 「profiles 会员状态 + payments 真实流水；绝不接受内测期临时开通写入的数据」 |

## 2.2 `src/app/api/membership/route.ts`（POST）

**原 49–83 行**（写 profiles + 写 payments 假流水）→ **整块替换**：

```ts
// ★★★ 关键：本路由【不写任何库】。
//   内测期的"免费开通"必须由 ENTITLEMENT_ENFORCE = false 表达，
//   而不能靠 update profiles.is_member —— 那会把"临时免费"写成
//   持久层的既成事实，接入真实支付后【无法回收、也无法与真实购买区分】。

if (ENTITLEMENT_ENFORCE) {
  return NextResponse.json(
    { success: false, error: '支付通道尚未开放', code: 'PAYMENT_NOT_READY' },
    { status: 501 }
  )
}

// 内测期：不落库，仅告知前端"当前处于内测期免费开放"
return NextResponse.json({
  success: true,
  data: {
    active: true,
    trial: true,
    plan: plan.id,
    message: '内测期免费开放，未产生任何扣费，也未开通正式订阅',
  },
})
```

- 顶部 import 加 `ENTITLEMENT_ENFORCE`（来自 `@/lib/entitlement`）
- `computeExpiry` import 已删（不再使用）；`getMembership` import 保留（GET 方法仍用）
- GET 方法**未动**

## 2.3 `src/app/api/unlock/route.ts`（POST）

| 改动 | 说明 |
|---|---|
| 判定走 `canView` | 验证登录后插入 `getEntitlements` + `canView(ent, 'fatebook')`，拒绝返回 402 + locked |
| 删除假流水写入 | 原 76–87 行 `if (!isMember) { await admin.from('payments').insert(...) }` 整块删除 |
| `is_paid` 注释改 | 两处写入加注释：「代表解锁过，不代表已支付；不参与权益判定」 |
| import 清理 | 删 `isActiveMember`（来自 membership）、删 `SKUS`（来自 pricing）；加 `getEntitlements, canView`（来自 entitlement） |
| 返回值 | 去掉 `isMember`（原 `isMember` 变量已删，不再有未使用变量） |

---

# 三、断言

新建 `scripts/test-entitlement-accept.mjs`，已纳入 `npm run verify`（位于 daily 之后、geo 之前）。4 段：

| # | 断言 | 方式 |
|---|---|---|
| ① | getEntitlements 必须排除 MOCK_ 流水 | (a) 静态：entitlement.ts 代码（剥注释后）必须含 `startsWith('MOCK_')`；(b) 逻辑：模拟"排除后 vs 未排除"的 Entitlements，确认 canView 判定结果不同 |
| ② | membership POST 不再写任何库 | 静态：读源码 POST 方法体，确认不含 `.from('profiles').update` 与 `.from('payments').insert`；且含 `trial: true`、引用 `ENTITLEMENT_ENFORCE` |
| ②b | unlock POST 不再写假流水 | 静态：读源码 POST 方法体（剥注释），确认不含 `.from('payments').insert`、不含 `MOCK_`（代码区）；且含 `canView`、`getEntitlements`、`402` |
| ③ | canView 分支正确性 | ENFORCE=false → 恒 true；模拟 ENFORCE=true → 会员不含 fatebook、含 daily；`ENTITLEMENT_ENFORCE` 确认为 false |

**断言输出**：
```
✓ MOCK_ 排除：源码含排除逻辑；排除后 canView(fatebook)=false，未排除=true，两者不同
✓ 不落库：membership POST 不含 profiles.update / payments.insert，返回 trial:true，引用 ENFORCE 开关
✓ 不写假流水：unlock POST 不含 payments.insert / MOCK_，判定走 canView，拒绝返回 402
✓ canView 分支：ENFORCE=false 恒放行；模拟 ENFORCE=true 时会员不含 fatebook、含 daily
```

---

# 四、牙口注入（§8.6.7-一）

| 步骤 | 证据 |
|---|---|
| 注入 | 注释掉 `entitlement.ts` 的 `if (typeof p.transaction_id === 'string' && p.transaction_id.startsWith('MOCK_')) continue` |
| **先确认注入有效**（肯定性证据） | 用临时脚本读源码，剥离注释后输出：`代码含 startsWith('MOCK_): false`、`源码含牙口标记: true` |
| 跑断言 | **①精确翻红**：`✗ entitlement.ts 代码不含 startsWith('MOCK_') 排除逻辑（被注释或删除）`；其余 ③ 段保持绿色 |
| 还原 | 排除逻辑已还原；临时脚本已删；全库 grep `牙口注入-临时` **0 残留** |

---

# 五、验收

| # | 项 | 期望 | 实测 |
|---|---|---|---|
| 1 | getEntitlements 查询含 transaction_id，且排除 MOCK_ | ✓ | ✓ |
| 2 | canView(ent,'fatebook') 对 MOCK 流水返回 false（ENFORCE=true 时） | ✓ | ✓（模拟验证） |
| 3 | membership POST 不再写 profiles / payments | ✓ | ✓（静态断言） |
| 4 | unlock POST 不再写 payments 假流水 | ✓ | ✓（静态断言） |
| 5 | unlock 判定走 canView，拒绝时返回 402 + locked | ✓ | ✓ |
| 6 | is_paid 注释已改 | ✓ | ✓ |
| 7 | 新增 test-entitlement-accept.mjs 且纳入 verify | ✓ | ✓ |
| 8 | ★ 牙口注入确认翻红 | ✓ | ✓（含肯定性证据） |
| 9 | ENFORCE=false 下内测行为不变 | ✓ | ✓（canView 恒 true；membership 返回 success+active；unlock 仍放行） |
| 10 | verify 全绿 + tsc 0 错误 | ✓ | ✓（12 段 PASS，退出码 0） |
| — | ENFORCE 仍为 false | ✓ | ✓（未顺手打开） |
| — | getEntitlements / canView 不再是孤儿 | ✓ | ✓（unlock 路由已接入） |

**verify 12 段**：
```
CHECKER / PRICING / SOLAR_TIME / ENTRY_CONSISTENCY / GANZHI_CONSISTENCY
DAYBOUNDARY / DAILY / ENTITLEMENT / GEO / WEALTH / SELFTEST → 全 PASS
```

---

# 六、架构收益

修完之后：

> **「接入支付」= ① 打开 `ENTITLEMENT_ENFORCE` ＋ ② 接 Waffo 回调写真实流水**
> —— **不需要改任何路由的判定逻辑** ✓

这正是 `entitlement.ts` 当初存在的意义。`canView` / `getEntitlements` 从此**不再是孤儿** —— unlock 路由已在调用 ✓。

---

# 七、未做 / 待后续

- **活服务器实测**：本轮 dev server 未运行（上轮已停），行为等价性由 verify + tsc + 静态断言覆盖。下一轮如需活服务器实测可重启 dev server 后补做。
- **`charts.is_paid` schema**：本轮只改注释，不改 schema（交接书 §3.4 明确不动）。
- **daily grant**：`SUBSCRIPTION_GRANTS` 里的 `daily` 指下一批的【个性化日运】，与本轮的免费通用日签（`/api/daily` 不查权益）无关，未混淆未改动。
