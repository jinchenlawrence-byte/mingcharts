# 回执①：购买前要求有命盘（HANDOFF-命书一份一付 §二）

- commit：`b1b4b0c` 命书一份一付①：购买前要求有命盘（pricing 命书卡前置校验）

## 一、结论

✅ 完成。`/pricing` 命书卡点击购买时，先经 `latestChartIdOf` 查 **charts 表**（不查 localStorage）确认用户有命盘；无命盘 → 不发起支付、页内引导去排盘（无 alert）。有命盘 → 行为不变。断言 12 条 + 牙口①注入翻红回退复绿，tsc 0 错误。

## 二、逐条回应（对照 §2.1 / §2.2 / §2.3 / §2.4）

| 任务书条目 | 实现 |
|---|---|
| §2.1 helper「取最近命盘 id」 | `src/lib/entitlement.ts` 新增 `latestChartIdOf(admin, userId)`：`from('charts').select('id').eq('user_id').order('created_at', DESC).limit(1)`，返回 `data?.[0]?.id ?? null`。★ 查 charts 表，✗ 不查 localStorage（§〇-6）。只查 id 列，供①购买预检与后续按盘判定复用（单一事实源）。charts 表只有 created_at（无 updated_at），schema 已有 `idx_charts_created_at DESC` 支撑此排序 |
| §2.1 /pricing 命书卡 | `src/components/CheckoutButton.tsx`（唯一消费点即命书卡）：`'use client'` 下复用同一 helper；handleClick 中 **session 确认后、fetch('/api/checkout') 之前** 调 `latestChartIdOf(supabase, session.user.id)` |
| §2.1 服务端不拦 | `/api/checkout` 保持不拦（前端引导而非服务端强制）。断言守护：checkout route 源码 `from('charts')` 命中 0、`latestChartIdOf` 命中 0 |
| §2.3 无命盘交互 | `if (!chartId) { setNoChart(true); setLoading(false); return }` 短路；渲染页内引导块：「命书会围绕你排好的命盘撰写——先免费排盘，再回来看命书详批。」＋ 链接 `/?returnTo=/pricing`「去免费排盘」。✗ 无 alert（§〇-7 同款要求） |
| §2.3 有命盘行为不变 | chartId 存在 → 照常 POST /api/checkout，流程零改动 |

## 三、原始日志（断言 + 牙口）

```
—— ① 购买前要求有命盘 ——
  ✓ 有命盘 → 返回 created_at 最新一条（got=CHART_NEW，期望 CHART_NEW）
  ✓ latestChartIdOf 只查 charts 表（calls=["charts"]）
  ✓ 无命盘（空表）→ 返回 null
  ✓ 无命盘（data=null）→ 返回 null
  ✓ checkout route 不查 charts（from('charts') 命中 0，要求 0）
  ✓ checkout route 不做权益预检（latestChartIdOf 命中 0，要求 0）
  ✓ CheckoutButton 接线 latestChartIdOf 单一事实源（命中 1）
  ✓ 预检（charts 查询）在发起支付（/api/checkout）之前（1182 < 1346）
  ✓ 无命盘分支短路成立（if (!chartId) { … return }，不继续发起支付）
  ✓ 无命盘引导文案「先免费排盘」存在
  ✓ 引导链接带 returnTo=/pricing
  ✓ 无命盘分支不弹 alert（§2.3：页内可点下一步）
FATEBOOK_ONEPAY_PASS
```

牙口①（文本不变、行为变坏：短路 `return` → `;`，§8.6.7 先确认注入有效再跑）：

```
注入后实际行（Edit 输出确认）：  ; // ★牙口注入①：无命盘分支不再短路（原：return）
→ 仅「无命盘分支短路成立」精确翻红（EXIT=1），其余 11 条绿
回退后 12 条全绿（EXIT=0）
```

## 四、缺项

- 无。① 范围内条目全部落地。

## 五、待拍板

1. **`returnTo=/pricing` 目前是提示性参数**：首页排盘成功后固定 `router.push('/chart')`，未消费 returnTo（用户排完落在结果页，需自行回 /pricing）。要实现「排完自动回购买页」需改首页跳转逻辑（且直跳 pricing 会跳过结果页展示，产品上未必更好），超出本任务链，未动。建议后续在 /chart 结果页加「去购买命书」CTA 或首页按 returnTo 智能跳转。
2. 无命盘引导链接指向首页排盘表单；若希望直达 `/?returnTo=` 之外的其他入口（如 /chart 页），待拍板。

## 六、文件清单

| 文件 | 改动 |
|---|---|
| `src/lib/entitlement.ts` | 新增 `latestChartIdOf`（charts 表单一事实源） |
| `src/components/CheckoutButton.tsx` | 购买前预检 + 无命盘页内引导（无 alert） |
| `scripts/test-fatebook-onepay.mjs` | 新建，①段 12 条断言（纳入 verify 链尾） |
| `package.json` | verify 链尾追加 `&& tsx scripts/test-fatebook-onepay.mjs` |

验收：`npm run verify` 全绿（本轮终态 26 段全 PASS）＋ `tsc --noEmit` 0 错误。
