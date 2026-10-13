# 回执③：按盘判定「这一份付过没」（HANDOFF-命书一份一付 §四）

- commit：`a4cd163` 命书一份一付③：按盘判定（canViewFatebookForChart 双层判定 + 4 判定点接线）
- commit：`7016a72` 修复③回归：paipan 匿名排盘不得强依赖 Supabase 配置（verify 实测暴露后修复）
- commit：`cadf204` verify 断言跟随事实更新（unlock 门禁接线判定 + 死链扫描剥查询串）

## 一、结论

✅ 完成。新增 `canViewFatebookForChart` 双层判定（第一层 ENFORCE=false 恒放行且不查库；第二层查 `payments(user_id, chart_id, status='paid')`），4 个判定点按 §4.2 逐点接线；§4.3 边界评估结论为**查重键纳入 birth_hour/minute**；断言①~④ + 三条牙口全部精确翻红回退复绿。ENFORCE 仍为 false；未用 charts.is_paid 当凭据；未改单号格式。终态 `npm run verify` 26 段全 PASS + tsc 0 错误。

## 二、逐条回应（对照 §4.1 / §4.2 / §4.3 / §4.4 / §五 / §六）

### §4.1 双层判定（单一事实源）

`src/lib/entitlement.ts` 新增 `canViewFatebookForChart(admin, userId, chartId, opts?)`：

```ts
const enforce = opts?.enforce ?? ENTITLEMENT_ENFORCE
if (!enforce) return true   // 第一层：内测期恒放行，不查库（行为与成本与现状一致）
if (!admin) return false    // 无客户端＝无凭据可查（paipan 匿名请求零 Supabase 依赖）
if (!chartId) return false  // 无命盘归属 → 不放行（先于任何查询；防旧 NULL 盘 paid 行被 eq-null 误判）
const { data } = await admin.from('payments').select('id')
  .eq('user_id', userId).eq('chart_id', chartId).eq('status', 'paid').limit(1)
return !!data?.length
```

- `opts.enforce` 仅供断言注入 ENFORCE=true 分支，生产调用一律不传；ENTITLEMENT_ENFORCE 值未动（仍 false）。
- 权益凭据是 `payments.chart_id`（经②归属校验写入），✗ 绝不用 `charts.is_paid`（断言守护：helper 函数体内无 is_paid 字样）。
- admin 参数类型为 `SupabaseClient | null`：paipan 匿名请求不建 Supabase 客户端（回归 7016a72 的教训），null 在 `!chartId` 守卫前被拦截，绝不被解引用。

### §4.2 四个判定点逐个说明（含 paipan 的选择与理由）

| 位置 | 改法与理由 |
|---|---|
| **api/unlock**（★★★★ 顺序调整） | 旧序「判权益 → 查/建 chart」改为「**查/建 chart → 判权益 → 402**」：chart_id 是权益凭据，402 时行也必须在（用户接下来去购买，webhook 靠 chartId 关联付款，凭据链才闭合）；昂贵的 AI 生成挡在判定之后（402 零 AI 调用）。402 路径命盘不存在时补建行（`is_paid: false`、不含付费分析），响应附 chartId；`is_paid: true` 只在真实解锁分支。查重键见 §4.3。判定改调 `canViewFatebookForChart(admin, user.id, chartId ?? null)`，getEntitlements/canView 粗判移除 |
| **api/paipan:89**（★★ 任务书要求自定并说明） | **选择：查 charts 表同八字行拿 chartId 传 helper（查重键与 unlock 一致，含 birth_hour/minute）。理由：** ① 重排请求只带出生参数不带 chartId，只能按同八字行反查；② 已购买的盘重排时应直接看全文（locked=null）——传 null 会在 ENFORCE=true 时把已购用户误锁；③ 未登录/无 token 时 admin=null、chartId=null：ENFORCE=false 恒放行、ENFORCE=true 不放行，与旧 `canView(EMPTY_ENTITLEMENTS)` 语义完全一致，单一代码路径覆盖两种登录态。getEntitlements/canView/EMPTY_ENTITLEMENTS 全部移除，无路由内自判（§8.5.1） |
| **api/entitlements**（★★） | 加可选 `body.chartId`：带 → `canViewFatebookForChart` 按盘判定；不带 → 保留 `canView(ent, 'fatebook')` 粗判（=「是否有任意一份已付」）。**成功页用法说明**：成功页轮询只关心「解锁了没」，付款刚完成、关联的 chart 就是刚买的那份，粗粒度足够（§4.2 明文） |
| **checkout/success page**（★★） | **保持 ownedSkus 粗粒度不动**（§4.2 明文允许：付款刚完成场景）；test-waffo-accept 既有断言「成功页按 ownedSkus 判定（不看恒真的 canView）」继续守护 |

### §4.3 ★★★★ 同名命盘覆盖边界——评估结论

**结论：纳入。unlock 查重键由 `(user_id, birth_year/month/day)` 扩为 `(user_id, birth_year/month/day, birth_hour, birth_minute)`。**

- **理由**：一次付款的凭据是 `payments.chart_id`。旧键只到「日」→ 同日改时辰重解锁会命中同一行并整体覆盖 chart_data →「买 A 时辰，B 时辰也算买过」（一天最多 12 份命书共用 1 次付款，且两时辰八字时柱不同、是不同商品）。③ 之后 chart_id 是真金白银的凭据，此泄漏从「标记无所谓」升级为「绕过付费」，必须在本轮收口。
- **对已有命盘的影响**：
  - 完整键（y/m/d/h/min）相同的存量行照常命中，**无需数据迁移**；
  - 同日不同时刻的请求不再互相命中 → 每份时辰独立购买——这正是要修复的泄漏，非误伤；
  - 旧 `is_paid=true` 行不受任何影响（is_paid 从来不是凭据）；
  - SaveChart 与 unlock 写库的 minute 形态已核对一致（`input.minute ?? 0` vs 列默认 0），不会出现同数据查不中的错位。
- **已知副作用（如实说明）**：同一时辰内改分钟（14:30→14:05，时柱相同）会视为新命盘、需重新购买。当前以「完整出生时间=命书身份」为口径；按「真太阳时时柱」归一的时辰粒度方案需重算排盘，复杂度高，本轮不做（见待拍板）。
- **gender / birth_place 未纳入键**（超出 §4.3 询问范围；同 y/m/d/h/min 不同性别大运顺逆不同，理论上也是不同命书）——列入待拍板。

### §五 数据与兼容

- 现有 payments.chart_id 全 NULL 不回填；NULL 行天然不匹配 `eq('chart_id', chartId)`（chartId 非 null），且 helper 的 `!chartId` 守卫兜底——不带 chartId 的调用绝不放行（断言④用旧 NULL 盘 paid 行证明：去掉守卫即被 supabase-js 的 eq-null（`chart_id=is.null`）命中，见牙口④日志）。
- 索引：`CREATE INDEX IF NOT EXISTS idx_payments_chart ON payments(user_id, chart_id)` 已写入 schema.sql **内联索引段 + 迁移段 2b**（注明已有库需补跑）。**已有库需在 SQL Editor 补跑迁移段 2b 这一句。**

## 三、原始日志（断言①~④ + 三条牙口）

```
—— ③ 按盘判定「这一份付过没」 ——
  ✓ 断言① ENFORCE=false → 恒 true（null→true，CHART_A→true）
  ✓ 断言①b ENFORCE=false 不查库（payments 查询 0 次）
  ✓ 断言② ENFORCE=true＋该盘有 paid 行 → true（got=true）
  ✓ 断言③ ENFORCE=true＋该盘无 paid 行（用户另有 paid 盘）→ false（got=false）
  ✓ 断言③b 流水未到账（pending）→ false（got=false）
  ✓ 断言④ ENFORCE=true＋chartId=null → false（got=false）
  ✓ ENTITLEMENT_ENFORCE 仍为 false / 双层两守卫在 / chart_id 条件在 / helper 无 is_paid
  ✓ unlock 接线 + 顺序（先查 chart 1021 → 判权益 1358 → 402 2099）+ 查重键含时辰 + is_paid 语义不混
  ✓ paipan 接线 + 查重键一致 + admin 延迟创建（匿名排盘零 Supabase 依赖）
  ✓ entitlements 可选 chartId + 粗判保留
  ✓ schema idx_payments_chart 内联+迁移段双份事实
FATEBOOK_ONEPAY_PASS
```

三条牙口（§8.6.7：先确认注入有效、再验精确翻红、后回退复绿）：

```
牙口①（去 ENFORCE 层）注入后实际行：
  if (!enforce && false) return true // ★牙口注入③-1：去掉 ENFORCE 层（原：if (!enforce) return true）
→ 注入前返回值（对照）：r1a=true、r1b=true、0 次查询
→ 注入后：✗ 断言①（null→false，CHART_A→false） ✗ 断言①b（发生 payments 查询） ✗ 第一层守卫锚点
   断言②③④绿（显式 enforce:true 不受影响）——精确翻红，EXIT=1

牙口④（去 chartId 守卫）注入后实际行：
  if (!chartId && false) return false // ★牙口注入③-2：去掉 chartId 守卫（原：if (!chartId) return false）
→ 注入后：✗ 断言④（got=true——旧 chart_id=NULL 的 paid 行被 eq-null 命中，
   正是生产事故形态，证明断言④守卫必要） ✗ 第二层守卫锚点
   断言①②③绿——精确翻红，EXIT=1

牙口③（删 chart_id 条件）注入后实际行（函数体）：
  .eq('user_id', userId)
  // ★牙口注入③-3：删掉 .eq('chart_id', chartId)（只按 user_id 查——任何人买过一份即全放行）
  .eq('status', 'paid')
→ 注入后：✗ 断言③（got=true——用户买的别的盘 paid 行泄漏进来） ✗ chart_id 条件锚点
   断言①②④绿——精确翻红，EXIT=1

回退后全绿（EXIT=0）
```

### 回归修复与断言跟随事实（如实说明）

1. **7016a72**：verify 的 entry-consistency 实测暴露③首版把 `createServerSupabase()` 提到无条件位置 → 无 Supabase env 的**匿名排盘 500**。修复：admin 延迟创建（仅 if (token) 内），helper 签名放宽 `SupabaseClient | null` + `if (!admin) return false`；新增接线断言「createServerSupabase 仅 1 处且在 if (token) 内」。三条牙口锚点不受影响。
2. **cadf204**：test-entitlement-accept「unlock POST 未调用 getEntitlements」翻红——其意图是 §8.5.1「unlock 门禁走 entitlement 单一判定」，③后由 canViewFatebookForChart 延续同一意图，按 §8.6.2 更新为「两者任一在即视为接线」。test-site-audit 把步骤①的 `/?returnTo=/pricing` 误判死链——href 归一化剥查询串后修复（路径才是路由归属）。

## 四、缺项

- 无（③范围内条目全部落地）。

## 五、待拍板

1. **查重键是否再扩 gender / birth_place**：同 y/m/d/h/min 不同性别（大运顺逆不同）理论上也是不同命书；不同出生地真太阳时不同、时柱可能不同。当前按 §4.3 字面范围只纳入时辰，扩键属产品口径决策。
2. **分钟粒度 vs 时辰粒度**：同时辰改分钟（时柱相同）当前视为新命盘；若按真太阳时时柱归一可消除误伤，但需重算排盘（复杂度高）。
3. **returnTo 闭环**（承回执①）：无命盘引导链接的 returnTo 参数首页未消费。
4. **生产库迁移**：schema.sql 迁移段 2b 的 `idx_payments_chart` 需在已有库 SQL Editor 补跑（与既往迁移同流程，未自动执行）。

## 六、文件清单

| 文件 | 改动 |
|---|---|
| `src/lib/entitlement.ts` | 新增 `canViewFatebookForChart`（双层判定单一事实源） |
| `src/app/api/unlock/route.ts` | 顺序调整（先查/建 chart → 判权益 → 402）；查重键含时辰；402 补建行 is_paid=false |
| `src/app/api/paipan/route.ts` | locked 改按盘判定（同八字行反查 chartId）；admin 延迟创建 |
| `src/app/api/entitlements/route.ts` | 可选 body.chartId；无则粗判保留 |
| `supabase/schema.sql` | idx_payments_chart 内联 + 迁移段 2b（注明已有库需补跑） |
| `scripts/test-fatebook-onepay.mjs` | ③段：断言①~④ + 4 判定点接线断言 + 匿名零 Supabase 依赖断言 |
| `scripts/test-entitlement-accept.mjs` | unlock 门禁接线断言跟随事实更新（cadf204） |
| `scripts/test-site-audit.mjs` | href 归一化剥查询串（cadf204） |

**总验收**：`npm run verify` 26 段全 PASS（CHECKER/PRICING/SOLAR_TIME/ENTRY_CONSISTENCY/GANZHI/DAYBOUNDARY/DAILY/ENTITLEMENT/LEGAL/GEO/WEALTH/LIUNIAN/LIUNIAN_COVERAGE/LIUYUE/FORTUNE_TIER/REPORTS/SITE_AUDIT/ENTITLEMENT_GATE/FATEBOOK_ACCEPT/SELFTEST/SHENSHA/LIUNIAN_CACHE/PROXY_GUARD/FATEBOOK_ONEPAY 等）＋ `tsc --noEmit` 0 错误。三项 commit hash：①`b1b4b0c` ②`597d219` ③`a4cd163`（+`7016a72`、`cadf204`）。
