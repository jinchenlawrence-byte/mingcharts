# 任务交接书：命书「一份一付」——购买前置校验 ＋ 命盘关联 ＋ 按盘判定

> **交接对象**：TraeCode
> **纪律基准**：`docs/验收标准与红线.md`（**先读 §8.5.1 单一事实源 / §8.6.2 依据分级 / §8.6.7 牙口**）
> **日期**：2026-10-13
> **★ 本任务书自包含 ✓ 且【我方已把影响面实测清楚**✓ —— 事实写在 §一／§〇-3 ✓
> **★★ 三项【相互依赖 ✗ 必须【按序做**✗：① 可独立 ✓ ② 是 ③ 的前提 ✓

---

# 〇、先读九条

1. **★★★★★ 起因**：用户提出一个真实的旅程问题 ——
   「**注册后【不排盘】直接去定价页买命书并付款 ✗ 会怎样**✗？」
   我方追代码后的答案：**付款能成功** ✗ **然后到 `/mingshu` 被要求现场填生辰** ✓
   —— **流程能走通 ✗ 但有三个真问题**（§一 ✓）

2. **★★★ 本任务三项，而它们的依赖是【链式**的**✗：
   ```
   ① 【购买前要求有命盘】        ← ★ 可独立做 ✓ 解决「顺序别扭」✓
   ② 【付款时把命盘关联上】      ← ★★ 是 ③ 的【前提**✗（不关联就无从按盘判定 ✓）
   ③ 【按盘判定"这一份付过没"】  ← ★★★ 依赖 ② ✗ 且【影响面最大**✗（见 §〇-3 ✓）
   → ★★ 请【按序做 ✗ 分别 commit**✓
   ```

3. **★★★★★ ③ 的影响面（我方实测 ✗ 不是推测 ✓）**：
   ```
   ★ 命书的权益判定【共 4 个判定点**✗
     （★ 其中【3 处调 canView**✗【1 处看 ownedSkus**✓ —— 别按"canView 出现次数"去数 ✓）：
     src/app/api/entitlements/route.ts:28   → canViewFatebook（成功页用）
     src/app/api/paipan/route.ts:89         → unlocked（★ 排盘结果页的付费内容 ✓）
     src/app/api/unlock/route.ts:25         → allowed（★ 命书生成本身 ✓）
     src/app/checkout/success/page.tsx:75   → ★【它不看 canView**✗
                                              看 ownedSkus.includes('fatebook')
   → ★★★★ 【所以 ③ 【不是加一行 if**✗ —— 要改【这条链路的判定方式**✓
   ```

4. **★★★★★ ③ 必须与 `ENTITLEMENT_ENFORCE` 【保持一致**✗ —— 这是本任务最易踩的坑 ✓：
   ```
   ★ 现在：ENFORCE=false → canView 恒 true → 【内测期免费用**✓
   ★★ 若 ③ 改成【纯查 payments.chart_id】✗ →
      【ENFORCE 就管不住命书了**✗ 【内测期【命书【变成真收费**✗✗
   → ★★★★ 【所以 ③ 【必须是【双层判定**✗：
      · 粗粒度：ENTITLEMENT_ENFORCE（★ 内测开关 ✓）
      · 细粒度：该 chart 是否已付款（★ 业务规则 ✓）
      → 见 §四 的 helper ✗ 【这是本任务的核心设计**✓
   ```

5. **★★ 「一份」的语义（§四 要按此实现 ✗）**：
   ```
   · 一次付费【解锁【一个命盘**✗
   · 用户可以【买多次**✗（★ 每份各自 $29.99 ✓）
   · 每个命盘【需要【它自己那次付款**✓
   · ★★ 【不是】"付一次解锁全部命盘"✗（★ 那是当前行为 ✗ 要改掉 ✓）
   ```

6. **★★★ 命盘存两处 ✗ 判定要认【服务端那份**✗**：
   ```
   · localStorage 'currentChart' —— ★ 前端即时用 ✓ 换设备/清缓存就没了 ✓
   · charts 表（chart_data / is_paid / created_at ✓）—— ★ 持久 ✓
   → ★★★★ 【判断"用户有没有命盘"【必须查 charts 表**✗
     —— 【查 localStorage 会【换设备就判断错**✗✗
   ```

7. **★ 请【不要】用 `charts.is_paid` 当权益凭据**：
   ```
   ★ 它现有注释写明：「is_paid 的语义是「该命盘已被用户解锁过」✗ 【不代表已支付**✗
     它【不参与任何权益判定**（全库无人读它）✓」
   ★★ → 【权益的单一事实源【仍是 payments**✓（§8.5.1 ✓）
     —— 【③ 要查 payments ✗ 【不要去读/写 is_paid 当凭据 ✓
     —— ★★ 若你顺手改了 is_paid 的写入 ✗ 请【同步更新那句注释**✓（否则注释会骗人 ✓）
   ```

8. **★★ 旧数据兼容**：现有 payments 行的 `chart_id` **全是 NULL** ✗
   —— 事实上**只有 1 行真实数据**（测试）✗ 其余是 `MOCK_` 前缀的内测假流水 ✓
   → 所以**不需要数据回填**✗ 但**要确保 NULL 不会被误判为"已付某盘"** ✓

9. **★ 牙口**：文本不变、行为变坏；注入前先确认注入有效（§8.6.7）✓

---

# 一、背景：三个问题的实测证据

## 1.1 问题 ①「先付款、后填生辰」✗

```
★ src/app/api/checkout/route.ts 【只收两个参数**✗：
     const token = typeof body?.token === 'string' ? body.token.trim() : ''
     const sku   = typeof body?.sku   === 'string' ? (body.sku as SkuId) : ''
   → 【完全不涉及八字 ✗ 【不校验有没有命盘**✓
★★ 全仓搜「请先排盘 / 未排盘 / 缺少出生」→ ★【零实际拦截**✗
   只搜到两句营销文案（pricing:215「先排盘，再深入」✗ MingShuContent:70 ✓）
★★★ /mingshu 页【自带 BirthForm**✗（`import BirthForm from '@/components/BirthForm'` ✓）
   → 【用户【得【在命书页【现场填**✗ 【而他【刚付过钱**✓
```

## 1.2 问题 ②「一个 grant 不绑定命盘」✗

```
★ src/lib/waffo-events.ts:31
     chart_id: null // ★ 固定 NULL：本轮不做「按 userId 关联最近命盘」的推断（任务书 §5.3）
★★ src/lib/waffo-events.ts:99 / :179 也是 chart_id: null ✓
   → 【付款记录【不关联【任何命盘**✗
```

## 1.3 问题 ③「付款无法对账」✗

```
★ 后果：用户投诉「我付了钱但命书不对」→ 【我们【查不出【他买的是哪份**✗
   —— 【客服 ✗ 退款 ✗ 对账【全部卡住**✓
★★ 而 /api/unlock 【按 (user_id, birth_year/month/day) 【查已有命盘**✓
   —— 【不同八字【会新建行 ✗ → 【一个用户【可以有多份命盘**✓
   —— ★★★ 【而 fatebook 【是【一个布尔**✗ → 【付一次【解锁全部**✗✗
```

## 1.4 参考：现有数据的形态（★ 供你判断影响 ✓）

```
★ payments 现有 5 行：
   · 1 行真实：29.99 / card / PAY_2BTF… / chart_id = NULL
   · 4 行内测：19.90 / alipay / MOCK_… / chart_id = NULL
★★ charts 表：结构含 id / user_id / birth_* / chart_data / is_paid / created_at ✓
```

---

# 二、步骤 ①：购买前要求有命盘（★ 可独立 ✗ 先做先 commit ✓）

## 2.1 要改的地方

```
★ src/app/pricing/page.tsx —— 命书卡（buySku: 'fatebook' ✓）
   → 【点击购买前【先判断【当前用户【有没有命盘**✗
★★ src/app/mingshu/MingShuContent.tsx —— 那个 hero 的
   「立即生成我的命书 $29.99」按钮（★ 现在【是 scrollToForm**✗ 跳到表单 ✓）
   → ★★ 【保持它【不动**✓（★ 在命书页内【先填表单【再付款【是合理的 ✓）
   —— ★★★ 【也就是说：① 主要改【/pricing 的入口**✗✓
```

## 2.2 判定"有没有命盘"怎么查（★ 见 §〇-6 ✗）

```
★★★★ 【必须查 charts 表**✗ 【不查 localStorage**✓
   ```ts
   // 建议放在 entitlement.ts 或新的 lib 里（可复用 ✗ 单一事实源 ✓）
   export async function latestChartIdOf(admin, userId): Promise<string | null> {
     const { data } = await admin.from('charts')
       .select('id').eq('user_id', userId)
       .order('created_at', { ascending: false }).limit(1)
     return data?.[0]?.id ?? null
   }
   ```
   ★★ 「最近一份」= `created_at DESC` 的第一条 ✓
   ★★★ 若【你有更好的选法（如按 updated_at ✓）请说明理由 ✓
```

## 2.3 交互（★ 请实现成这样 ✗）

```
★ 有命盘 → 正常走 /api/checkout ✓（★ 行为不变 ✓）
★★ 没有命盘 → 【不发起支付**✗ 【而是【引导去排盘**✗：
   · 文案建议：「先免费排盘，再回来看命书详批」✓
   · 链接带 returnTo ✗ 例如 `/?returnTo=/pricing` ✓
   · ★★ 或【就近【在命书卡【下方【展开一个简版出生表单**✗（★ 你判断哪个体验更好 ✓）
→ ★★★ ★【不要弹 alert**✗ 【要在页面内【给出【可点的下一步**✓
```

## 2.4 断言

```
★ 断言：/api/checkout 【在【该用户无命盘时【仍然【可被直接调用**✗
   —— ★★ 【因为① 只是【前端引导**✗ 【不是【服务端强制**✓
   —— ★★★ 【若你想【服务端也拦**✗ 请【明确说明**✗ 并【加一条【显式错误码**✓
     （★ 我方倾向【只在前端引导**✓ 【因为【服务端拦会让"先买后填"彻底不可行 ✓
       而【那是【我们【产品上【允许的备选路径 ✓ —— 但①②③ 落地后【它会【很少发生 ✓）
★★ 牙口：把"无命盘"分支改成直接购买 → 断言必须精确翻红 ✓
```

---

# 三、步骤 ②：付款时把命盘关联上

## 3.1 checkout 传 chartId（★ 走 metadata ✗ 不改单号格式 ✓）

```ts
// src/app/api/checkout/route.ts
// ★ 现状：仅 token + sku；单号 MC-<userId>-<13位时间戳>
// ★★ 要加：把 chartId 一并带上
const chartId = typeof body?.chartId === 'string' ? body.chartId.trim() : ''

// ★★★ 在 createSession 的 params 里加进 metadata（★ 已有通路 ✔）：
//     metadata: { userId, sku, chartId }
//     —— 因为 webhook 侧【已经在读 orderMetadata 了**：
//        src/lib/waffo-events.ts:92
//        const userId = data.orderMetadata?.userId?.trim() || fromRef?.userId || ''
//     → ★★★★ 【所以 metadata 这条路【是现成的**✗ 【不需要改单号 ✓✓
```

**★★ 为什么【不改单号**✗：
```
★ 现单号 MC-<userId>-<13位> 已实测 53 字符 ✓ 上限 128 ✓ 【够用 ✓
★★ 若【把 chartId（UUID ✗ 36 字符）塞进去 ✗ → 单号【变丑且【接近上限 ✓
★★★ 而 metadata 【本来就在传 userId**✗ 【再挂一个 chartId 【零成本 ✓
→ ★★★★ 【所以走 metadata**✓✓
```

## 3.2 webhook 落账时写进 `payments.chart_id`

```ts
// src/lib/waffo-events.ts
// ★ 现状：buildPaidPaymentRow 里【固定 chart_id: null**✗（:99 / :179 同 ✓）
// ★★ 要改成：从 event.data.orderMetadata?.chartId 取 ✗ 校验形态后写入

const rawChartId = (data.orderMetadata as Record<string, unknown> | undefined)?.chartId
const chartId = typeof rawChartId === 'string' && rawChartId.length > 0 ? rawChartId : null
// → row.chart_id = chartId
```

**★★★★ 校验要求（★ 别直接信任 metadata ✗）**：
```
★ 【必须校验【形态**✗（§8.6.2 依据分级 ✓）：
   · 是 string ✓ · 非空 ✓ · 长度合理（如 ≤64 ✓）
   · ★★ 且【必须【属于【该 userId**✗ ——
     即【查 charts 表【确认【这一行【user_id === 上面解析出的 userId**✓✓
   —— ★★★ 【否则【恶意构造的 metadata 【可以把【付款【关联到【别人的命盘**✗✗
   —— ★★★★ 【这是【一个真实的安全点**✗ 请务必做 ✓
★★ 若 chartId 非法/不属于该用户 → 【写 NULL**✗ 【不报错**✓（★ 只是失去关联 ✓）
```

## 3.3 断言

```
★ 断言 ①：metadata 带合法 chartId → payments.chart_id 【等于它**✓
★ 断言 ②：★【metadata 带的 chartId 【不属于【该 userId**✗ → 【写 NULL**✗
   —— ★★ 牙口：去掉归属校验 → 断言②必须精确翻红 ✓✓【这条很关键**✓
★★ 断言 ③：metadata 没有 chartId → 【写 NULL**✗ 【不报错**✓
★ 请贴【注入前后的实际值】✓
```

---

# 四、步骤 ③：按盘判定（★ 核心 ✗ 依赖 ② ✓）

## 4.1 设计：双层判定（★ 见 §〇-4 ✗ 这是关键 ✓）

```ts
// src/lib/entitlement.ts —— 新增（★ 单一事实源 ✗ 4 个调用点共用 ✓）
/**
 * ★★★ 命书「按盘」判定（HANDOFF-命书一份一付 §四）
 *   第一层：ENTITLEMENT_ENFORCE —— 内测开关，false 时【一律放行】（与现状一致）
 *   第二层：该 chart 是否【已付款】—— 查 payments(user_id, chart_id, status='paid')
 *   ★ 两层都要过；ENFORCE=false 时【不查库】（保持内测期行为与成本不变）
 */
export async function canViewFatebookForChart(
  admin: SupabaseClient,
  userId: string,
  chartId: string | null | undefined
): Promise<boolean> {
  if (!ENTITLEMENT_ENFORCE) return true     // ★ 内测期：与现状完全一致
  if (!chartId) return false                // ★ 无命盘 → 不放行
  const { data } = await admin
    .from('payments')
    .select('id')
    .eq('user_id', userId).eq('chart_id', chartId).eq('status', 'paid')
    .limit(1)
  return !!data?.length
}
```

## 4.2 四个调用点的改法（★ 逐个说明 ✗ 不要照抄 ✓）

| 位置 | 现状 | 改成 |
|---|---|---|
| `api/paipan/route.ts:89` | `canView(ent,'fatebook')` | ★★ 它会【拿到刚排的 chart ✗ 但【此刻【还没存库**✗<br>→ 【所以【这里【应该【传【body 里的 chartId**✗（若客户端带）【否则【传 null**✓<br>→ ★★★ 【请【先说明【你的选择与理由**✓ |
| `api/unlock/route.ts:25` | `canView(ent,'fatebook')` | ★★★★ **这里【最直接**✗：`chart` 就在手上 ✓<br>→ 【按 (user_id, birth_*) 【查出/新建【chartId】→ 用它判定 ✓<br>→ ★★ **顺序要调整**✗：现在是【先判权益【再查/建 chart】✗<br>　 【要改成【先查/建 chart ✗ 再判权益**✓ |
| `api/entitlements/route.ts:28` | `canViewFatebook` 单一布尔 | ★★ 它【不知道是哪个 chart**✗<br>→ 【加可选参数 `chartId` ✗ 无则【按"是否有任意一份已付"】返回 ✓<br>→ ★★★ 【请说明【成功页会怎么用它**✓ |
| `checkout/success/page.tsx:75` | `ownedSkus.includes('fatebook')` | ★★ 成功页【只关心"解锁了没"✗<br>→ 【可保持【粗粒度**✓（★ 付款刚完成 ✗ 关联的 chart 就是刚买的那份 ✓） |

**★★★★ 我方【不替你定【paipan 那处怎么改**✗ ——
**因为【它涉及【"排盘结果页显示什么"**的产品判断 ✓ **那【应该由你【根据现有交互【决定并说明**✓**

## 4.3 ★★★★ 一个【必须处理的边界**✗

```
★ `/api/unlock` 现在【按 (user_id, birth_year/month/day) 【查已有命盘**✓
   —— 【同年月日 ✗ 【不同时辰**✗ → 它【会【命中【同一行**✗✗ 并 update 它 ✓
   —— ★★ 【即：【排盘时【改了时辰 ✗ 【会覆盖【原来那份**✗
   —— ★★★ 【那不是【本任务引入的**✗ 但【③ 之后【它的后果变严重了**✗：
     · 原来：is_paid 只是标记 ✗ 无所谓 ✓
     · 现在：chart_id 【是权益凭据**✗ → 【覆盖会让【"买了 A ✗ 变成【B 也算买过"**✗✗
   → ★★★★ 【请【评估并说明**✗：是否要【把【birth_hour/minute【也纳入【查重键**✓
     —— 【若改 ✗ 【要说明【对【已有命盘【的影响**✓
```

## 4.4 断言

```
★ 断言 ①：ENFORCE=false → canViewFatebookForChart 【恒 true**✗ 【且【不查库**✓
★ 断言 ②：ENFORCE=true ＋ 该 chart 有 paid 行 → true ✓
★★ 断言 ③：ENFORCE=true ＋ 该 chart 【无】paid 行 → ★【false**✗✓
★★★ 断言 ④：ENFORCE=true ＋ chartId 为 null → 【false**✗✓
★ 牙口（★ 三条 ✗ 各自精确翻红 ✓）：
   · 去掉 `if (!chartId) return false` → 断言④翻红 ✓
   · 去掉 ENFORCE 那层 → 断言①翻红 ✓
   · 把 chart_id 条件删掉（只按 user_id 查）→ ★ 断言③翻红 ✓
   ★★ 请贴【注入前后的实际返回值】✓
```

---

# 五、数据与兼容

```
★ 现有 payments.chart_id 【全 NULL**✗
   —— 【不回填**✓（★ 只有 1 行真实测试数据 ✗ 其余是 MOCK_ ✓）
★★ 但【要确保【NULL 【不会【被【判成【"已付某盘"**✗：
   —— §四 的查询【是【eq('chart_id', chartId)】✗ 而 chartId 非 null ✓
   —— 【所以【NULL 行【天然不匹配**✓
★★★ 若你要【加索引**✗ 建议：`CREATE INDEX idx_payments_chart ON payments(user_id, chart_id);`
   —— ★★ 已有 `idx_payments_user_id` ✗ 但【组合查【更优**✓
   —— ★★★ 若加 ✗ 【记得【写进 schema.sql 的【迁移段】＋【注明已有库需补跑 ✓
```

---

# 六、必须避免

- ❌ **不得用 `charts.is_paid` 当权益凭据**（★ 它注释明说"不代表已支付、不参与权益判定" ✗ 见 §〇-7 ✓）
- ❌ **不得【只】改前端而不改 webhook**（★ 那样 chart_id 永远是 NULL ✗ ③ 无从判定 ✓）
- ❌ **不得信任 metadata 里的 chartId 而不校验归属**（★ 否则可关联到别人的命盘 ✗ 真实安全点 ✓）
- ❌ **不得让 ③ 绕过 `ENTITLEMENT_ENFORCE`**（★ 否则内测期【命书变真收费**✗✗）
- ❌ **不得改单号格式**（★ 用 metadata ✗ 现有通路已就绪 ✓）
- ❌ **不得把"有没有命盘"判断成查 localStorage**（★ 换设备会错 ✗ 要查 charts 表 ✓）
- ❌ **不得在【无命盘】时【弹 alert**（★ 要给【可点的下一步】✓）
- ❌ **不得顺手改 ① 之外的前端文案/布局**（★ 本任务只管这条链路 ✓）
- ❌ **不得改动 `ENTITLEMENT_ENFORCE` 的值**（★ 它【仍须为 false**✗）
- ✅ **三项【分别 commit ＋ 改完发回执**（我方要 diff 着复核 ✓）

---

# 七、验收标准

| # | 步 | 项 | 期望 |
|---|---|---|---|
| 1 | ① | 新增"取最近命盘 id"的 helper（★ 查 charts 表 ✗ 不查 localStorage ✓） | ✓ |
| 2 | ① | /pricing 命书卡：无命盘 → ★【引导去排盘**✗（不发起支付 ✓） | ✓ **贴改后交互** |
| 3 | ① | 有命盘 → 行为不变 ✓ | ✓ |
| 4 | ① | 牙口（无命盘分支改成直接购买 → 翻红） | ✓ **贴注入前后** |
| 5 | ② | checkout 收 `chartId` ✗ 走 `metadata` ✓ | ✓ |
| 6 | ② | webhook 落账写 `payments.chart_id` ✗ 含★★【归属校验**✗ | ✓ |
| 7 | ② | 断言①②③ ＋ 牙口（去归属校验 → ②翻红） | ✓ **贴注入前后** |
| 8 | ③ | 新增 `canViewFatebookForChart`（★ 双层判定 ✗ ENFORCE=false 不查库 ✓） | ✓ |
| 9 | ③ | ★★ 4 个调用点【逐个说明**改法（★ 含 paipan 那处的理由 ✓） | ✓ **贴说明** |
| 10 | ③ | ★★★★ `/api/unlock` 的【顺序调整**✗（先查/建 chart ✗ 再判权益 ✓） | ✓ |
| 11 | ③ | ★★★★ 评估【同名命盘覆盖**问题（★ 是否纳入时辰 ✗ 附结论 ✓） | ✓ **见 §4.3** |
| 12 | ③ | 断言①~④ ＋ 三条牙口 | ✓ **贴注入前后** |
| 13 | — | ENFORCE 【仍为 false**✗ · 未用 is_paid 当凭据 ✗ 未改单号格式 ✓ | ✓ |
| 14 | — | 若加索引 → 写进 schema.sql 迁移段 ＋ 注明补跑 | ✓ |
| 15 | — | `npm run verify` 全绿 ＋ `tsc --noEmit` 0 错误 | ✓ |
| 16 | — | ★ 三项分别 commit，各附 hash | ✓ |

---

# 八、一句话

> **这是一个【用户旅程问题**✗ 引出的任务 ✓：
> **「注册后不排盘 ✗ 直接买命书 ✗ 会怎样？」**
> **→ 我方追代码的答案：付款能成功 ✗ 然后到 /mingshu 被要求现场填生辰** ✓
> **流程能走通 ✗ 但有三个真问题** ✓
>
> **★★★ 三项【按序**✗：**① 购买前要求有命盘 → ② 付款时关联命盘 → ③ 按盘判定"这一份付过没"** ✓
> **② 是 ③ 的前提** ✗（不关联就无从按盘判定 ✓）
>
> **★★★★★ 而 ③ 有两个【必须想清的点**✗：
> **① 【影响面是 4 处**✗ 不是 1 处（entitlements / paipan / unlock / success ✓），
>   而你【已经在 `entitlement.ts:38` 里放好了单一事实源**✗ 所以要【加 helper ✗ 不要散写判断**✓
> **② 【必须与 `ENTITLEMENT_ENFORCE` 一致**✗ ——
>   **若 ③ 纯查 payments ✗ 【ENFORCE 就管不住命书了 ✗ 【内测期【命书会变成真收费**✗✗
>   → ★★★★ **所以做【双层判定**✗：ENFORCE 管粗粒度 ✗ chart_id 管细粒度 ✓
>
> **★★★★ 而 ② 里有一个【真实的安全点**✗：
> **metadata 里的 chartId 【必须校验【属于该 userId】✗** ——
> **否则【构造一个 metadata 【可以把付款【关联到【别人的命盘**✗✗
> **牙口：【去掉归属校验 → 断言②必须精确翻红**✓**
>
> **★★★ 以及 §4.3 那个边界请务必评估**✗：
> **`/api/unlock` 现在按 (user_id, 出生年月日) 查已有**✗
> **→ 【同年月日【不同时辰【会命中同一行**✗ 【排盘时改时辰【会覆盖**✓
> **原来无所谓 ✗ 但 ③ 之后【chart_id 是权益凭据**✗ → 覆盖会让「买了 A 变成 B 也算买过」✗✗
> **请评估【是否把时辰纳入查重键】✗ 并说明对已有命盘的影响**✓
