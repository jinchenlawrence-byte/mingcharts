# 回执②：付款时把命盘关联上（HANDOFF-命书一份一付 §三）

- commit：`597d219` 命书一份一付②：付款时把命盘关联上（checkout 收 chartId 走 metadata，webhook 落账前归属校验）

## 一、结论

✅ 完成。checkout 接收 `chartId` 走 `orderMetadata`（✗ 不改单号格式）；webhook 落账与对账补写两条路径都把 `payments.chart_id` 写上，且落账前经**归属校验**（chart 必须真的属于该买家，否则写 NULL 不报错——防恶意 metadata 关联他人命盘）。断言 17 条 + 牙口②注入翻红回退复绿，tsc 0 错误。

## 二、逐条回应（对照 §3.1 / §3.2 / §3.3）

| 任务书条目 | 实现 |
|---|---|
| §3.1 checkout 传 chartId | `src/app/api/checkout/route.ts`：`const chartId = typeof body?.chartId === 'string' ? body.chartId.trim() : ''`，传 `buildCheckoutParams` 时 `chartId: chartId \|\| undefined`。`src/lib/waffo.ts`：`CheckoutParamsInput` 加 `chartId?`，metadata 落 `chartId: input.chartId ?? ''`（空串=未关联）。✗ 单号格式零改动 |
| §3.2 webhook 落账写 chart_id | `PaidPaymentRow.chart_id: string \| null`；**形态校验**单一事实源 `normalizeChartIdMeta(raw)`（string·非空·≤64，否则 null）；**归属校验**单一事实源 `resolveChartIdForUser(repo, raw, userId)`：normalize → `repo.findChartUserId(chartId)` 查 charts 表 → `owner === userId ? chartId : null`。`handleWaffoEvent` insert 前调用；`reconcilePayment` 补写前同样调用（远端 metadata 同样不可信）；`normalizeGraphqlPayment` 映射远端 chartId |
| §3.2 仓储 | `waffo-repo.ts` 新增 `findChartUserId`（charts 表 `maybeSingle`）；★ `findPaidByExternalId` 改为返回库中真实 `chart_id`（原写死 null 会让快路径查回的行丢关联，按盘判定无从谈起） |
| §3.3 断言①②③ | 见下方日志：合法落账=它 / 属他人→NULL 不报错 / 不存在→NULL / 无 chartId→NULL，另加形态校验 6 组、归属校验 3 组、对账补写双向、checkout 透传链路 |
| 归属校验安全点 | 牙口②锚点即 `resolveChartIdForUser`，注入「信任归属」→ 归属类 5 断言精确翻红 |

## 三、原始日志（断言 + 牙口）

```
—— ② 付款时把命盘关联上 ——
  ✓ 断言① 合法 chartId → 落账等于它（kind=inserted，chart_id=chart-aaaa-1111）
  ✓ 断言② chartId 属他人 → 落 NULL 不报错（kind=inserted，chart_id=null）
  ✓ 断言②b chartId 不存在 → 落 NULL
  ✓ 断言③ metadata 无 chartId → 落 NULL（kind=inserted，chart_id=null）
  ✓ 形态校验：合法 UUID 形态原样通过 / undefined → null / 非 string → null /
              空串纯空白 → null / >64 字符 → null
  ✓ 行构造：坏形态 chartId → 行内即 NULL
  ✓ 归属校验：本人命盘 → 通过 / 他人命盘 → null / 命盘不存在 → null
  ✓ 对账补写：远端 chartId 属他人 → 补写行 chart_id NULL（got=null）
  ✓ 对账补写：远端 chartId 属本人 → 补写行带关联
  ✓ buildCheckoutParams：metadata.chartId 透传（got=chart-aaaa-1111）
  ✓ buildCheckoutParams：未带 chartId → metadata 落空串（webhook 写 NULL）
  ✓ checkout route 读 body.chartId / 把 chartId 传进 buildCheckoutParams
  ✓ waffo.ts metadata 含 chartId（§3.1：走 metadata 不改单号）
```

牙口②（§8.6.7：先确认注入有效，再验精确翻红）：

```
注入后实际行（Edit 输出确认，waffo-events.ts resolveChartIdForUser）：
  return chartId // ★牙口注入②：去掉归属校验（原：return owner === userId ? chartId : null）
→ 归属类恰好 5 条精确翻红（其余全绿，EXIT=1）：
  ✗ 断言② chartId 属他人 → 落 NULL 不报错（chart_id=chart-bbbb-2222）
  ✗ 断言②b chartId 不存在 → 落 NULL
  ✗ 归属校验：他人命盘 → null
  ✗ 归属校验：命盘不存在 → null
  ✗ 对账补写：远端 chartId 属他人 → 补写行 chart_id NULL（got=chart-bbbb-2222）
回退后全绿（EXIT=0）
```

开发期自捕的测试数据 bug（断言有牙的旁证）：对账补写「属本人」用例首版单号 `MC-…-176000000000a` 以字母结尾，`parseMerchantOrderId` 判非数字 ts → rejected 不进补写 → 断言红。改纯数字 `1760000000010` 后绿。实现无错，恰证明非法单号被拒。

## 四、缺项

- 无（②范围内）。历史已落账的 payments.chart_id 全 NULL 不回填（§五：仅 1 行真实数据）。

## 五、待拍板

- 无新增。与①回执共用的 returnTo 待拍板项不重复列。

## 六、文件清单

| 文件 | 改动 |
|---|---|
| `src/lib/waffo.ts` | `CheckoutParamsInput.chartId?`；metadata 落 chartId（空串=未关联） |
| `src/app/api/checkout/route.ts` | 读 body.chartId（trim）并透传 |
| `src/lib/waffo-events.ts` | normalizeChartIdMeta / resolveChartIdForUser（归属校验单一事实源）；handleWaffoEvent / reconcilePayment / normalizeGraphqlPayment 接线 |
| `src/lib/waffo-repo.ts` | findChartUserId；findPaidByExternalId 返回真实 chart_id |
| `scripts/test-waffo-accept.mjs` | memRepo 加 charts+findChartUserId；chart_id 断言；两条过时断言更新（见下） |
| `scripts/test-fatebook-onepay.mjs` | ②段 17 条断言 |

### 附：test-waffo-accept 两条断言更新与 d8d436c 的关系（如实说明）

- 「productId 映射中无硬编码 PROD_ 单号」与「fatebook 未登记 productId → null」两条断言翻红，**根因不是②的改动**：是用户会话间隙 commit `d8d436c` 在 `waffo-products.ts` 登记了真实商品号 `PROD_1H2rQWsIKwlqkHG3xMR01v`，旧断言前提（未登记时期）失效。
- 按 §8.6.2 期望值跟随事实更新、防散落意图保留：
  1. 前者 → 全 src 扫描：`PROD_` 字面量只允许出现在 `waffo-products.ts` 一处（去注释扫描 111 个 .ts/.tsx，`scanned > 0` 自检防扫描自身哑掉）；
  2. 后者 → `waffoProductId('fatebook')` 以 PROD_ 开头（购买入口可用）＋ `annual_report` 仍 null（购买入口显示「即将推出」）。

验收：`npm run verify` 全绿 ＋ `tsc --noEmit` 0 错误。
