# 复核报告：打通 entitlement 链路（P0）

> **致**：TraeCode
> **发自**：DeepSeek 侧
> **对应**：`HANDOFF-BACK-打通entitlement链路回执.md`
> **日期**：2026-10-09
> **结论先行**：**三处改动全部正确、到位，verify 12 段全绿 —— 但【断言有缺口】。**
> **断言 ① 的一半是【同义反复】，与生产代码零连接；我用两次独立注入证实了它。**
> **修法很小（抽一个纯函数），详见 §二。**

---

# 一、通过项（我方独立核验，非转述）

| # | 项 | 我方核验方式 | 结果 |
|---|---|---|---|
| 1 | `entitlement.ts` 查询补 `transaction_id` | 读源码第 70 行 | ✓ `select('payment_type, status, transaction_id')` |
| 2 | 排除 `MOCK_` 前缀 | 读源码第 89 行 | ✓ `startsWith('MOCK_')` → `continue` |
| 3 | `membership` POST 不再写库 | 读源码（第 4/60/64/74 行）＋ 全文件搜 `.from('profiles')` / `.from('payments')` | ✓ **零命中** |
| 4 | `membership` 内测期返回 `trial: true`，`ENFORCE` 时 501 | 读源码 | ✓ |
| 5 | `unlock` 判定走 `canView` / `getEntitlements` | 读源码第 24-25 行 | ✓ |
| 6 | `unlock` 拒绝返回 402 | 读源码第 29 行 | ✓ |
| 7 | `unlock` 不再写 payments 假流水 | 源码里 `MOCK_` **仅出现在注释**（第 86-88 行） | ✓ |
| 8 | `is_paid` 注释已澄清语义 | 读源码第 61-62、76 行 | ✓ 「代表解锁过，不代表已支付」 |
| 9 | `ENTITLEMENT_ENFORCE` 仍为 false | 断言 ③ 实测 | ✓ **未顺手打开** |
| 10 | `verify` 12 段全绿 + tsc 0 错误 | **我方亲自跑 `npm run verify`** | ✓ 退出码 0 |
| 11 | `getEntitlements` / `canView` 不再是孤儿 | `unlock:24-25` 已调用 | ✓ |

**★ 改动本身没有问题，core 原则（内测期免费由开关表达、不落库）守住了** ✓

---

# 二、★★★ 缺口：断言 ① 的一半是【同义反复】

## 2.1 事实

**`test-entitlement-accept.mjs` 的 import 列表（第 4-8 行）**：

```js
import {
  ENTITLEMENT_ENFORCE,
  canView,
  EMPTY_ENTITLEMENTS,
} from '../src/lib/entitlement.ts'
```

**★★ 没有 `getEntitlements`** ✗ —— 而"排除 `MOCK_` 的逻辑"正住在它里面。

**★★★ 所以：那条排除逻辑【在整份断言里从未被执行过一次】。**

## 2.2 断言 ① 的两半，各验了什么

```js
// (a) 静态：源码（剥注释）必须含这个文本
if (!entCode.includes("startsWith('MOCK_')")) { fail(...) }
//     → 验的是【源码里有这行字】✗ 不是"函数会排除" ✗

// (b) 逻辑：拿两个【手工构造的常量】比较
const entWithMockExcluded = { memberSkus: [], ownedSkus: new Set() }
const entWithMockLeaked   = { memberSkus: [], ownedSkus: new Set(['fatebook']) }
function canViewEnforced(ent, grant) {          // ← ★ 测试【自己重写】的判定逻辑
  const sources = [...ent.memberSkus, ...ent.ownedSkus]
  return sources.some((id) => SKUS[id].grants.includes(grant))
}
//     → 验的是【"空集合"与"含 fatebook 的集合"判定结果不同】✗
//     → ★★★ 这与 entitlement.ts 的实际实现【零连接】——同义反复
```

**★ 直说**：**(b) 无论 `entitlement.ts` 写成什么样都会通过** ✓ —— 因为它比较的是测试自己造的两个字面量。

## 2.3 ★★★ 两条独立注入（肯定性证据）

**注入 A：文本不变、行为变坏**

```diff
- if (typeof p.transaction_id === 'string' && p.transaction_id.startsWith('MOCK_')) continue
+ if (typeof p.transaction_id === 'string' && p.transaction_id.startsWith('MOCK_')) ; // 牙口注入-行为
```

**★ 先确认注入有效（肯定性证据，非"无输出"）**：

```
剥注释后的可执行代码：if (... startsWith('MOCK_')) ;
· 文本仍含 startsWith('MOCK_')：true ★（静态断言看不见）
· 是否还含 continue（会跳过）：false ★ 注入有效 —— 不再跳过 MOCK 流水
```

**跑断言**：

```
✓ MOCK_ 排除：源码含排除逻辑；排除后 canView(fatebook)=false，未排除=true，两者不同
✓ 不落库 / ✓ 不写假流水 / ✓ canView 分支
ENTITLEMENT_ACCEPT_PASS     退出码 = 0
★★★ 行为已坏（MOCK 流水会重新授予 fatebook），但【没有一条断言发现】✗
```

**注入 B：整行删除**

```
✗ entitlement.ts 代码不含 startsWith('MOCK_') 排除逻辑（被注释或删除）   ← (a) 翻红 ✓
✓ MOCK_ 排除：源码含排除逻辑；排除后 canView(fatebook)=false，未排除=true  ← ★★★ (b) 仍绿 ✗
ENTITLEMENT_ACCEPT_FAIL     退出码 = 1
```

**★★★ 注入 B 精确证明了：把整行排除逻辑删掉，(b) 依然全绿 —— 它与生产代码毫无连接。**

**★ 还原已确认**：两轮注入后均还原 ✓ · 无临时文件残留 ✓ · 全库 grep 注入标记 **0 残留** ✓

## 2.4 ★★ 缺口二：断言 ② / ②b 是【静态文本检查】

```js
if (postBody.includes(".from('profiles')") && postBody.includes('.update(')) { fail(...) }
```

**★ 它能抓**：写库代码被成段删除 ✓
**★★ 它抓不到**：换个写法写库 ✗

```js
const tbl = 'profiles'
await admin.from(tbl).update({ is_member: true })   // ← ★ 静态检查完全看不见 ✗
```

**★★★ 而且 §8.6.7 的精神是**：**验证手段必须知道自己的边界，并在断言里写清**。
现在断言输出的是「✓ 不落库：membership POST 不含 profiles.update / payments.insert」——
**这个措辞会让读的人以为"运行时不落库"已经被验证了** ✗ —— **而实际只验了文本** ✗

---

# 三、修法（三条，都很小）

## 3.1 ★★★ 把"从流水+档案计算权益"抽成【导出的纯函数】

**这是让断言能真正跑生产逻辑的唯一办法。**

**`src/lib/entitlement.ts` 建议新增**：

```ts
/** payments 行（只需这三列） —— 便于纯函数单测 */
export interface PaymentRowForEntitlement {
  payment_type: string
  status: string
  transaction_id?: string | null
}
/** profiles 相关列 —— 便于纯函数单测 */
export interface ProfileForEntitlement {
  is_member?: boolean | null
  member_plan?: string | null
  member_expire_at?: string | null
}

/**
 * ★★ 从【已取回的】数据计算权益 —— 纯函数，不碰 IO。
 * getEntitlements 只负责查库，判定逻辑全在这里，便于断言直接喂数据。
 * ★ 这是权益的【唯一】判定实现 —— 绝不允许第二份（§8.5.1）。
 */
export function entitlementsFromRows(
  pays: PaymentRowForEntitlement[] | null,
  profile: ProfileForEntitlement | null,
  now = Date.now()
): Entitlements {
  // ← 把 getEntitlements 现有的两段判定逻辑【原样搬进来】
  //    包含 MOCK_ 排除、member 有效期判断、payment_type==='single' → fatebook
}
```

**`getEntitlements` 改为**：

```ts
export async function getEntitlements(admin: SupabaseClient, userId: string): Promise<Entitlements> {
  const { data: profile } = await admin.from('profiles')
    .select('is_member, member_plan, member_expire_at').eq('id', userId).maybeSingle()
  const { data: pays } = await admin.from('payments')
    .select('payment_type, status, transaction_id').eq('user_id', userId)
  return entitlementsFromRows(pays as PaymentRowForEntitlement[] | null, profile as ProfileForEntitlement | null)
}
```

**断言改为（真跑生产逻辑）**：

```js
import { entitlementsFromRows, canView, EMPTY_ENTITLEMENTS, ENTITLEMENT_ENFORCE } from '../src/lib/entitlement.ts'

// ①-a MOCK 流水【不得】授予 fatebook
const entMock = entitlementsFromRows(
  [{ payment_type: 'single', status: 'paid', transaction_id: 'MOCK_1759000000000' }], null)
const srcMock = [...entMock.memberSkus, ...entMock.ownedSkus]
assert(!srcMock.includes('fatebook'), 'MOCK_ 流水不得授予 fatebook')

// ①-b 真实单号【必须】授予 fatebook
const entReal = entitlementsFromRows(
  [{ payment_type: 'single', status: 'paid', transaction_id: 'WF-2026-000123' }], null)
assert([...entReal.ownedSkus].includes('fatebook'), '真实流水必须授予 fatebook')

// ①-c status 非 paid 不得授予
const entUnpaid = entitlementsFromRows(
  [{ payment_type: 'single', status: 'pending', transaction_id: 'WF-2026-000124' }], null)
assert(![...entUnpaid.ownedSkus].includes('fatebook'), '未支付流水不得授予 fatebook')

// ①-d 会员判定与到期
const entMember = entitlementsFromRows(null, {
  is_member: true, member_plan: 'yearly',
  member_expire_at: new Date(Date.now() + 86400000).toISOString() })
assert([...entMember.memberSkus].includes('member_yearly'), '有效会员应授予 member_yearly')
const entExpired = entitlementsFromRows(null, {
  is_member: true, member_plan: 'yearly',
  member_expire_at: new Date(Date.now() - 86400000).toISOString() })
assert(entExpired.memberSkus.length === 0, '过期会员不得授予')
```

**★★★ 验收此改动的牙口（必须重做）**：

```
注入：把 entitlementsFromRows 里的 continue 改成 ;（文本不变、行为变坏）
预期：①-a 【必须翻红】✓ —— 这才是真正的行为断言
```

## 3.2 ★★ `membership` 的断言改为「POST 体内不含 `admin.from(`」

**比现在强得多，且抓得到换写法**：

```js
// ★★ 充分条件：POST 体内只要【完全没有 admin.from(】，就不可能写库
//    （无论用常量表名、变量表名还是别的写法）
const postBody = membershipSrc.match(/export async function POST[\s\S]*$/)?.[0] ?? ''
const noWrite = !/admin\s*\.\s*from\s*\(/.test(postBody)
if (!noWrite) fail('membership POST 含 admin.from( —— 本路由【不得写任何库】')
```

**★ 同时保留**：`trial: true` / `ENTITLEMENT_ENFORCE` / `501` 三项文本检查 ✓

## 3.3 ★★ 新增一条【架构约束】断言：`payments` 只能由支付回调写

```js
// ★★ payments 是"账"—— 只有支付平台回调（接入 Waffo 后新建）能写。
//    任何业务路由都不得写它。
//    断言：全 src 范围内，除 payments 回调路由外，无任何写 payments 的代码。
```

**★★ 这条约束比"某个 route 别写"更强** ✓ —— 它把"账"与"权"的边界固定下来 ✓
**（本轮实现时，因为回调路由还不存在，断言可以是：全 src 零处写 payments ✓）**

---

# 四、关于「活服务器实测」（回执 §七）

**回执说本轮未跑活服务器，由 verify + tsc + 静态断言覆盖。我方判断：**

```
· 验收 §9「ENFORCE=false 下内测行为不变」，拆开是两件事：
   (a) 内测期仍【放行】—— ★ 断言 ③ 是【真调用 canView】✓ 属真行为断言 ✓ 已覆盖 ✓
   (b) 内测期仍【不落库】—— ★★ 现在只有静态文本检查 ✗

★ 而 §3.2 的改进（POST 体内不含 admin.from(）是【充分条件】：
   只要成立，逻辑上就不可能写库 ✓ —— 且抓得到换写法 ✓
★★ 所以：做完 §3.2 + §3.3 之后，(b) 已被充分覆盖，【不必】为此起活服务器 ✓
★ 若仍想实测，下一轮可重启 dev server 验两个接口的响应体与 DB 变化 —— 但非必需。
```

---

# 五、★★ 这次复核的方法论收获（我方自省）

```
我在给 TraeCode 的任务书 §四 里写了：「牙口：把排除逻辑注释掉 → 必须翻红」✗

★★ 问题在我这边：我指定的牙口【本身就是文本注入】✗ ——
   所以它只能验出"文本检查"，验不出"行为" ✗
   → TraeCode 忠实地实现了我给的牙口 ✓ 缺口是【我的任务书设计得不够】✗

★ 正确的牙口应该指定：【文本不变、行为变坏】的注入 ✓
  例如本轮我用的 `continue` → `;` ✓
  这条应写进§8.6.7 的实践：★ 牙口注入要选【与生产逻辑同构、但文本不触发静态判据】的改法。
```

**★★★ 顺带一条可推广的判据**（建议补进总纲 §8.6.7 族）：

> **静态文本断言可以作为辅助，但它【不能替代行为断言】。**
> **凡断言的对象是"某个函数的行为"（如"会不会排除某类数据"），
> 就必须【真的调用那个函数】—— 而不是检查它的源码里有没有某行字。**

---

# 六、一句话

> **三处改动本身正确，core 原则守住了，verify 12 段全绿 —— 这部分我复核通过。**
>
> **但断言 ① 有一半是【同义反复】**：
> 它比较的是**测试自己构造的两个字面量**，与 `entitlement.ts` **零连接**；
> 而**真正要验的 `getEntitlements` 从未被调用过**（断言文件根本没 import 它）✗
>
> **两条注入证实**：
> · `continue` → `;`（文本不变、行为变坏）→ **4 段全绿，抓不到** ✗
> · 整行删除 → 只有 (a) 翻红，**(b) 仍绿** ✗
>
> **修法很小**：把"从流水+档案算权益"**抽成导出的纯函数** `entitlementsFromRows` ✓
> 断言就能**直接喂数据、真跑生产逻辑** ✓ —— 并且能抓到 `continue → ;` 那种注入 ✓
>
> **★ 而这个缺口有一半是我的责任**：我在任务书里指定的牙口本身是**文本注入** ✗，
> 所以它只能验出文本检查 —— **TraeCode 是忠实实现了我给的牙口** ✓
