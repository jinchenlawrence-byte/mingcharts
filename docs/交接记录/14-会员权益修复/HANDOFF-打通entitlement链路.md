# 任务交接书：打通 entitlement 链路（P0）

> **交接对象**：TraeCode
> **纪律基准**：`docs/验收标准与红线.md`（**先读 §8.5.1 / §8.6 / §8.6.7**）
> **前置**：`HANDOFF-剩余4项.md`（grants 表已落地）· `P0-会员权益与单次报告冲突.md`
> **本任务书自包含。**

---

# 〇、先读五条

1. **本轮的产出不是"修一个 bug"，是【让设计落地】。**
   `entitlement.ts` 那套 `canView` / `getEntitlements` / `grants` 是我们上一批建的，
   **但它现在是零调用的孤儿** ✗ —— 两个入口各写各的，根本没走它。

2. **★★★ 核心原则（本轮的灵魂，见 §二）**：
   **内测期的"免费"，必须通过 `ENTITLEMENT_ENFORCE = false` 这个【开关】实现；
   绝不能通过【写入真实数据结构】实现。**
   否则"免费"会变成数据里的既成事实，接入真实支付时**无法回收** ✗

3. **★★ 问题的严重性在于时间点**：
   现在**没有被利用**（因为 `canView` 零调用、`charts.is_paid` 无人读）；
   **但接入支付那天会集体出错** —— 所有内测期点过「开通会员」的用户，
   `profiles` 里已经是 `is_member = true` ✗

4. **★ 好消息**：会员卡的 CTA 已改成「即将推出」，
   **`MembershipButton` 现在不会被渲染** ✓ → `membership` 路由可以放心重构，不会破坏前端 ✓

5. **行为等价是硬要求**：`ENFORCE = false` 时，**内测期的用户体验必须与现在完全一样**
   （照样能解锁命书、照样能"开通"会员）✓ —— 变的只是**不再落库** ✓

---

# 一、问题全貌（含证据行号）

## 1.1 ★★ "权"只有两个来源，而两个入口都在污染它们

```
来源 ① profiles   —— getEntitlements 读 is_member / member_plan / member_expire_at
来源 ② payments   —— getEntitlements 读 payment_type / status

污染点 ① app/api/membership/route.ts:52-61
   直接 update profiles（is_member: true, member_plan, member_expire_at）✗
   → ★★★ 这是【真实数据】不是 mock —— 登录即可把自己写成会员 ✗

污染点 ② app/api/membership/route.ts:66-75
   写 payments 假流水（transaction_id: 'MOCK_' + Date.now(), status: 'paid'）✗

污染点 ③ app/api/unlock/route.ts:77-87
   写 payments 假流水（payment_type: 'single', MOCK_）✗
   → getEntitlements 见到 payment_type === 'single' 就 ownedSkus.add('fatebook') ✗

污染点 ④ app/api/unlock/route.ts:54, 66
   写 charts.is_paid = true（★ 该列【只写不读】，见 1.3）
```

## 1.2 `getEntitlements` 的现有实现（`lib/entitlement.ts`）

```ts
// 读 profiles（68-75 行）
if (profile?.is_member === true && expireMs > Date.now()) {
  memberSkus.push(profile.member_plan === 'yearly' ? 'member_yearly' : 'member_monthly')
}
// 读 payments（77-81 行）
for (const p of pays ?? []) {
  if (p.status !== 'paid') continue
  if (p.payment_type === 'single') ownedSkus.add('fatebook')
}
```

**★ 它【没有排除 MOCK_ 流水】** ✗ —— 所以现有的假流水一旦被读到，就是真权益 ✗

## 1.3 `charts.is_paid` 是【只写不读】的死列

**我方实测（全库搜索）**：

```
写入：app/api/unlock/route.ts:54, 66
读取：★ 零处
      · app/charts/page.tsx 用 select('*') 取回，但【不用它做任何判断】
      · 其余 route 一律 isPaid: false
```

**→ 所以 it 目前无害 ✓ 但它语义混乱（见 §3.4）**

## 1.4 为什么现在没出事

```
· canView / getEntitlements 【零调用】✗ —— 设计好了但没接上
· charts.is_paid 无人读 ✓
· 前端 isPaid 只影响本页显示 ✓（app/chart/page.tsx:353, 430）
→ 问题被"孤儿状态"掩盖着

★★★ 一旦接入支付、把 ENFORCE 打开：
   · getEntitlements 开始工作 ✓
   · profiles 里那些 is_member = true 的 → 【立即成为真会员】✗
   · payments 里那些 MOCK_ 流水 → 【立即成为真购买】✗
   · 而我们【无法区分"内测白拿的"与"真买的"】✗
```

---

# 二、★★★ 核心原则（本轮的灵魂）

> ## **内测期的"免费"，只能通过【开关】实现，不能通过【写数据】实现。**

```
✗ 错误做法（现在的做法）：
   用户点"开通" → update profiles.is_member = true
   → "免费"变成了数据里的【既成事实】
   → 接入支付时无法回收，且无法与真实购买区分

✓ 正确做法：
   用户点"开通" → 什么都不写 → 由 ENFORCE = false 让 canView 恒返回 true
   → "免费"是【运行时行为】，不是数据
   → 接入支付时把 ENFORCE 打开 → 内测期的"免费"自动消失 ✓
   → 真实权益只由【支付回调】写入 ✓
```

**★ 这条原则可以直接推广**：
> **临时状态不要写进持久层，要用可开关的运行时条件表达。**
> 否则"临时"会变成"永久"，且无法与真实状态区分。

**★★ 本轮修复的全部改动，都是这一条的具体化。**

---

# 三、修法（逐文件）

## 3.1 `lib/entitlement.ts` —— 查 payments 时排除 MOCK_ 流水

**① 查询里补上 `transaction_id` 字段**

**原文**（约 63-65 行）：

```ts
    admin
      .from('payments')
      .select('payment_type, status')
      .eq('user_id', userId)
```

**替换为**：

```ts
    admin
      .from('payments')
      .select('payment_type, status, transaction_id')
      .eq('user_id', userId)
```

**② 循环里排除模拟流水**

**原文**（约 77-81 行）：

```ts
  const ownedSkus = new Set<SkuId>()
  for (const p of pays ?? []) {
    if (p.status !== 'paid') continue
    if (p.payment_type === 'single') ownedSkus.add('fatebook')
  }
```

**替换为**：

```ts
  const ownedSkus = new Set<SkuId>()
  for (const p of pays ?? []) {
    if (p.status !== 'paid') continue
    // ★★ 排除模拟流水：'MOCK_' 前缀的流水是接入支付前的占位数据，
    //    【不是真实购买】，绝不能据此授予权益（否则内测期用户会永久白拿）。
    //    真实流水由支付平台（Waffo）回调写入，transaction_id 为其真实单号。
    if (typeof p.transaction_id === 'string' && p.transaction_id.startsWith('MOCK_')) continue
    if (p.payment_type === 'single') ownedSkus.add('fatebook')
  }
```

**③ 并在文件或函数注释里补一句（§8.4.4 把刻意的选择写下来）**：

```ts
 * ★ 权益的【唯一】来源是：
 *   · profiles 的会员状态（由支付回调维护）
 *   · payments 的【真实】已支付流水（transaction_id 非 MOCK_ 前缀）
 *   ✗ 绝不接受"内测期临时开通"写入的数据 —— 内测期的免费由
 *     ENTITLEMENT_ENFORCE = false 表达（见该常量注释）
```

## 3.2 `app/api/membership/route.ts`（POST）—— ★★★ 不再写任何库

**这是本轮最要紧的一处。** 现在的 52-78 行做了两件都错的事：

**原文**（**第 49–83 行**，已按仓库核对；下同）：

```ts
      // 续费叠加：仍在有效期内则从原到期日续期
      const current = await getMembership(admin, user.id)
      const expiresAt = computeExpiry(current, plan)

      // 更新会员状态
      const { error: updError } = await admin
        .from('profiles')
        .update({
          is_member: true,
          member_plan: plan.id,
          member_expire_at: expiresAt.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)
      if (updError) throw updError

      // 记录支付流水（MVP 模拟，接入真实支付时替换 transaction_id 与回调校验）
      const { error: payError } = await admin.from('payments').insert({
        user_id: user.id,
        amount: plan.price,
        payment_type: plan.id,
        payment_method: 'alipay',
        status: 'paid',
        transaction_id: 'MOCK_' + Date.now(),
        paid_at: new Date().toISOString(),
      })
      if (payError) {
        console.error('记录会员支付流水失败:', payError)
      }

      return NextResponse.json({
        success: true,
        data: { active: true, plan: plan.id, expiresAt: expiresAt.toISOString() },
      })
```

**★ 精确行号（我方已核对）**：`.from('profiles')` 在第 55 行 ·
`is_member: true` 第 57 行 · `.from('payments')` 第 66 行 ·
`transaction_id: 'MOCK_'` 第 72 行 ✓

**替换为**：

```ts
      // ★★★ 关键：本路由【不写任何库】。
      //
      // 为什么：内测期的"免费开通"必须由 ENTITLEMENT_ENFORCE = false 表达，
      //   而不能靠 update profiles.is_member —— 那会把"临时免费"写成
      //   持久层的既成事实，接入真实支付后【无法回收、也无法与真实购买区分】。
      //
      // 接入支付后的正确做法（第 6–7 步）：
      //   本路由只负责【发起】支付（创建 Waffo checkout session），
      //   会员状态与支付流水由 Waffo 的回调 webhook 写入 —— 那才是真实权益的来源。

      if (ENTITLEMENT_ENFORCE) {
        // 尚未接入真实支付：明确返回"未开放"，不要伪造开通成功
        return NextResponse.json(
          { success: false, error: '支付通道尚未开放', code: 'PAYMENT_NOT_READY' },
          { status: 501 }
        )
      }

      // 内测期：不落库，仅告知前端"当前处于内测期免费开放"
      // ★ 必须带 trial 标志，让前端能如实显示"内测期免费"，而不是"已购买"
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

**★ 同时**：
- 顶部 import 需加 `ENTITLEMENT_ENFORCE`（来自 `@/lib/entitlement`）✓
- **`getMembership` / `computeExpiry` 若不再使用，请检查是否还有其他调用方；
  若无，删掉 import（但保留 `lib/membership.ts` 里的函数本体）** ✓
- **GET 方法保持不变** ✓（查询会员状态仍需要）

## 3.3 `app/api/unlock/route.ts`（POST）—— 判定走 canView，不再写假流水

**① 判定：走 entitlement**

在验证登录之后（原 24 行附近）插入：

```ts
    // ★★ 门禁判定统一走 entitlement —— 不得在本路由另写判断（§8.5.1）
    //    ENFORCE = false 时 canView 恒返回 true → 内测期行为与现在完全一致 ✓
    const ent = await getEntitlements(admin, user.id)
    const allowed = canView(ent, 'fatebook')
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: '尚未购买命书报告', locked: true, sku: 'fatebook' },
        { status: 402 }
      )
    }
```

**② 删除假流水写入**（原 74-87 行，整块删掉）

```ts
      // ★★★ 已删除：不再写 MOCK_ 支付流水。
      //   内测期的解锁由 ENTITLEMENT_ENFORCE = false 表达，不落任何"账"。
      //   接入支付后，真实流水由 Waffo 回调写入，届时 canView 会据此放行。
```

**③ `charts.is_paid` 保留写入，但改注释**（原 54、66 行）

```ts
      // ★ is_paid 的语义是「该命盘已被用户解锁过」，【不代表已支付】。
      //   它不参与任何权益判定（全库无人读它）；
      //   权益只由 getEntitlements 决定。
      //   保留它的用途：将来若要给内测期用户保留访问权，可据此识别。
```

**④ `isMember` 变量**：原 24 行算出来的 `isMember` 只用于被删掉的流水判断，
删除后**若不再使用请一并删掉**，避免留下未使用变量 ✓
（`isActiveMember` 的 import 同理 ✓）

## 3.4 `charts.is_paid` 的定位（写进注释即可，本轮不改 schema）

```
语义：该命盘已被用户解锁过（可能是内测期免费解锁，也可能是购买的）
★ 不代表"已支付" ✗ —— 支付与否只看 payments 里是否有真实流水
★ 不参与权益判定 ✓
保留理由：将来若要给内测期用户保留访问权，可据此识别（产品决定，待定）
```

---

# 四、断言（P0 —— 必须纳入 `verify`）

**★ 建议新建 `scripts/test-entitlement-accept.mjs`**（该链路此前完全没有断言）

```
① ★★★ getEntitlements 必须排除 MOCK_ 流水
   · 构造一条 transaction_id = 'MOCK_123', status:'paid', payment_type:'single'
     → canView(ent, 'fatebook') 在 ENFORCE=true 时【必须为 false】✓
   · 构造一条 transaction_id = '真实单号'(非 MOCK_), 同上
     → 必须为 true ✓
   · ★ 牙口：把排除逻辑注释掉 → 第一项必须翻红 ✓

② ★★★ 两个入口在 ENFORCE=false 下【不得写入任何库】
   · 这是【行为断言】，实现方式二选一（你判断哪个更稳）：
     (a) 静态断言：读源码，确认 membership POST 里不含
         `.from('profiles').update` 与 `.from('payments').insert`
         —— ★ 简单直接，但与实现耦合 ✗
     (b) 集成断言：用一个 mock 的 supabase client 记录调用，
         断言"没有任何 update / insert 被调用"
         —— ★ 更本质 ✓ 但需要可注入的 client ✗
   · ★ 我方倾向 (b)，但若成本高就用 (a) 并在注释里说明局限

③ canView 的分支正确性
   · ENFORCE=false → 任意 grant 恒 true ✓
   · ENFORCE=true  → 按 grants 判定 ✓
     · member_monthly/member_yearly 的 grants【不含 fatebook】✓
       → 会员【不能】解锁命书 ✓（这条上一批已有，此处复核）

④ ★★ 牙口（§8.6.7-一）
   · 每次注入前【先确认注入有效】（打出改变后的实际值），
     不得以「退出码 0／无输出」代替确认；
     确认失败 ⇒ 立即中止，不跑断言
```

---

# 五、回归要求

| # | 要求 |
|---|---|
| 1 | ★ **`ENFORCE = false` 时内测行为完全不变** —— 登录用户仍能解锁命书、仍能"开通"会员 ✓ |
| 2 | **`/api/paipan` 仍不下发付费内容**（`locked` 结构不变）✓ |
| 3 | 紫微 / 合婚 / 地理 三个 API 仍 HTTP 200 ✓ |
| 4 | `/pricing` 页面：会员卡仍显示「即将推出」✓（本轮不动前端） |
| 5 | `/chart` 页面：`isPaid` 的显示逻辑不变 ✓（353 / 430 行不动） |
| 6 | `npm run verify` 全绿（含新增的 entitlement 断言）＋ `tsc` 0 错误 |
| 7 | **`getEntitlements` / `canView` 从此【不再是孤儿】** —— 至少 unlock 路由在调用 ✓ |

---

# 六、必须避免

- ❌ **不得为了"内测期免费"而写 profiles 或 payments** —— 这是本轮的核心
- ❌ **不得让 membership POST 继续写 `is_member: true`** —— 那是最严重的一处
- ❌ **不得在 unlock 里再写 `MOCK_` 流水**
- ❌ **不得在路由里另写权益判断** —— 一律走 `canView`（§8.5.1）
- ❌ **不得改变 `ENFORCE=false` 时的用户可见行为** —— 回归第 1 条
- ❌ **不得顺手把 `ENTITLEMENT_ENFORCE` 改成 true** —— 支付未接入，会让功能不可用 ✗
- ❌ **不得删除 `lib/membership.ts` 里的函数** —— 只清理本路由不再用的 import
- ❌ **注入验证前先确认注入有效**（肯定性证据）；确认失败即中止
- ✅ **`is_paid` 的语义必须在注释里写清：代表"解锁过"，不代表"已支付"**

---

# 七、验收标准

| # | 项 | 期望 |
|---|---|---|
| 1 | `getEntitlements` 查询含 `transaction_id`，且排除 `MOCK_` | ✓ |
| 2 | **`canView(ent,'fatebook')` 对 MOCK 流水返回 false（ENFORCE=true 时）** | ✓ 贴断言输出 |
| 3 | **membership POST 不再写 profiles / payments** | ✓ 贴证明（源码或调用记录） |
| 4 | **unlock POST 不再写 payments 假流水** | ✓ |
| 5 | unlock 的判定走 `canView`，拒绝时返回 **402 + locked** | ✓ |
| 6 | `is_paid` 注释已改（语义澄清） | ✓ |
| 7 | 新增 `test-entitlement-accept.mjs` 且纳入 `verify` | ✓ |
| 8 | ★ **牙口注入确认翻红**（至少"MOCK 排除"那一条） | ✓ **贴注入前后的实际值** |
| 9 | `ENFORCE=false` 下内测行为不变 | ✓ 贴实测 |
| 10 | `verify` 全绿 ＋ `tsc` 0 错误 | ✓ |

---

# 八、一句话

> **这不是"修一个 bug"，是【让上一批建好的 entitlement 设计真正落地】。**
>
> **问题的严重性不在今天，在接入支付那天**：
> `membership` 现在**登录即可把自己写成 `profiles.is_member = true`** ✗
> —— 那是**真实数据不是 mock**，而 `getEntitlements` 就是读它来判会员的 ✓
> 所以一旦打开 `ENFORCE`，**所有点过"开通会员"的内测用户会集体变成永久会员** ✗
>
> **而本轮的核心是一条原则**：
> **内测期的"免费"只能通过【开关】（`ENTITLEMENT_ENFORCE = false`）实现，
> 绝不能通过【写入真实数据结构】实现** ✗
> 否则"临时免费"会变成持久层里的既成事实，**无法回收、也无法与真实购买区分**。
>
> **修完之后的架构收益**：
> **「接入支付」= ① 打开 `ENFORCE` ＋ ② 接 Waffo 回调写真实流水**
> —— **不需要改任何路由的判定逻辑** ✓
> 这正是 `entitlement.ts` 当初存在的意义 ✓
