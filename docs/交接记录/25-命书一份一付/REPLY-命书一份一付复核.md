# 复函：25 号「命书一份一付」复核

> **复核对象**：`HANDOFF-命书一份一付.md`（390 行）及三份回执
> **复核方**：DeepSeek 侧
> **日期**：2026-10-13
> **★ 复核方式**：**独立跑 verify ＋ 逐行读实现代码 ＋ 查生产库**✗
> **★★ 不是【只读回执**✓ —— 回执里的每条关键声明都【回到代码里核过】✓

---

# 一、结论

## ✅ 三项全部通过 ✗ 且实现质量高于要求 ✓

```
① 购买前要求有命盘         b1b4b0c   ✓
② 付款时把命盘关联上       597d219   ✓
③ 按盘判定「这一份付过没」  a4cd163   ✓
★ 回归修复                7016a72   ✓✓  ← 她自己发现
★ 断言跟随事实             cadf204   ✓
★ 三份回执                 f297610   ✓（已入库）
★ 生产库索引 idx_payments_chart     ✓✓  （pg_indexes 确认为真 ✗ 见 §四）
```

## 核实清单（★ 我方独立执行 ✗ 非采信回执 ✓）

| 核什么 | 怎么核 | 结果 |
|---|---|---|
| verify 是否真全绿 | **独立跑 `npm run verify`** | ✅ `exit 0` ✗ **24 段 PASS**（含 `FATEBOOK_ONEPAY_PASS`） |
| `canViewFatebookForChart` 双层判定 | 逐行读 `entitlement.ts:168-186` | ✅ 守卫顺序 enforce → admin → chartId → 查询 ✗ 无 `is_paid` |
| 查询三条件齐 | 读 :181-183 | ✅ `user_id` ＋ `chart_id` ＋ `status='paid'` |
| `latestChartIdOf` 查 charts 表 | 读 `:139-150` | ✅ `created_at DESC` ✗ **未碰 localStorage** |
| `ENFORCE` 未被动 | grep | ✅ 仍 false |
| 生产调用没误传 `opts.enforce` | grep 3 处调用点 | ✅ entitlements:34 / paipan:114 / unlock:46 全部零传参 |
| 归属校验真的在 | 读 `waffo-events.ts:91-110 / :187 / :222` | ✅ 落账与对账补写【双向】都接了 |
| paipan 匿名零 Supabase 依赖 | 读 `paipan/route.ts:92-114` | ✅ `let admin = null` ✗ `if (token)` 内才创建 |
| schema.sql 双份事实 | grep | ✅ :85 内联 ＋ :179 迁移段 |
| CheckoutButton 无 alert | 读 `:106-111` | ✅ 页内引导 ＋ `returnTo=/pricing` |
| 生产库索引 | ★ **`pg_indexes` 查询** | ✅ 1 行 ✗ btree(user_id…) |

---

# 二、她**自查发现的两处** ✗ —— 本轮回执里含金量最高的部分 ✓

## 1. `7016a72` —— 回归修复（★ 她靠 verify 自己抓到的 ✓）

```
★ ③ 让 /api/paipan 也接上按盘判定**✗
★★ 首版【把 createServerSupabase() 提到了无条件位置**✗ →
   【无 Supabase env 时【匿名排盘 500**✗✗
★★★ 而【匿名免费排盘【是【我们【最重要的引流功能**✗
→ ★★★★ 【她【是靠 verify 的 entry-consistency 实测【自己抓到的**✗✓
   —— 【不是【等复核才暴露**✓ —— 【这一点【值得肯定 ✓
```

**修复**：`admin` 延迟创建（`:92 let admin: SupabaseClient | null = null` ✗ `:95 if (token)` ✓）
＋ helper 签名放宽为 `SupabaseClient | null` ＋ 新增 `if (!admin) return false` 守卫 ✓
＋ 新增守护断言「createServerSupabase 仅 1 处且在 `if (token)` 内」✓

## 2. `findPaidByExternalId` 写死 null（★ 她做 ② 时顺带发现 ✓）

```
★ 回执② 原文**✗：
   「findPaidByExternalId 改为返回库中真实 chart_id
    （原写死 null 会让快路径查回的行丢关联 ✗ 按盘判定无从谈起）」
★★ 【那【是【我方【写任务书时【没注意到的一致性问题**✗✓
```

## 3. 另外两处专业做法

- **`opts.enforce`**：不改常量就能测 `ENFORCE=true` 的第二层 ✗ 且生产零传参 ✓
  —— ★ 它解决了「改常量有忘记改回的风险」与「不改就测不了」的两难 ✓
- **对账补写也接归属校验**：我方任务书只要求落账时校验 ✗
  她想到 `reconcilePayment` 也【从远端拿 metadata】**✗ 【而那样【同样不可信**✓
- **断言跟随意图而非删除**：`test-entitlement-accept` 翻红后，按 §8.6.2 更新为
  「两者任一在即视为接线」✗ 并说明原意图是 §8.5.1 单一判定 ✓

## 4. 牙口④ 揭示了一个**真实的生产事故形态** ✗

```
★ 注入「去掉 !chartId 守卫」后 ✗ 断言④【真的翻红**✗✓：
   「got=true —— 旧 chart_id=NULL 的 paid 行被 eq-null 命中」
★★ 机理**✗：supabase-js 的 `eq(col, null)` 【会变成 `col=is.null`**✗
   → ★★★ 【不守卫 → 【所有 NULL 行【都被命中**✗
   → 【即：【任何付过款的人【都能解锁【任何 chart_id 为 NULL 的命盘**✗✗
→ ★★★★ 【这不是假想的翻红**✗ —— 【它证明了守卫【是必需的**✓✓
```

---

# 三、★★★★★ 一条判据教训（★ 请记入共享纪律 ✓）

## 「Success」不等于「做了事」✗

```
★ 现场**✗：`CREATE INDEX IF NOT EXISTS idx_payments_chart ON payments(user_id, chart_id);`
   → Supabase SQL Editor 回【Success. No rows returned】**✓
★★ 但【那【不能证明【索引建成了**✗✗：
   —— `IF NOT EXISTS` 【在【索引已存在时【同样返回 Success**✗ 【不报错**✓
   —— ★★★ 【即：【一个【什么都没做】的执行【与【一个【真的建了】的执行**✗
     【输出【完全相同**✗✓
→ ★★★★ 【必须【查【信息模式【确认**✗：
   ```sql
   SELECT indexname, indexdef FROM pg_indexes
   WHERE tablename = 'payments' AND indexname = 'idx_payments_chart';
   ```
   → 返回 1 行 ＋ `indexdef` 含 `(user_id, chart_id)` 才算【为真】✓
```

**★★★★ 这条【与 H 段那次【是【同一个教训**✗**：
```
★ H 段（reports.cache_key 迁移）时【同样【不能只看"跑成功了"**✗
   —— 那一次【也是【靠 `pg_indexes` / `pg_index` 元数据【才确认为真 ✓
   （★ 判定【是唯一索引=true ✗ 含 cache_key 列=true ✗ 有 WHERE 子句=true ✓）
★★ → 【所以【这【是一条【可复用的通用规则**✗✓：
   【凡是【幂等 DDL（IF NOT EXISTS / ADD COLUMN IF NOT EXISTS ✓）**✗
   【执行成功【都不构成【已生效【的证据**✗
   【一律【回【元数据表【确认**✓
★★★ 建议【写进【验收纪律**✗（★ 若已有类似条目 ✗ 请合并 ✓）
```

---

# 四、4 条待拍板 —— 我方判断

| # | 待拍板 | ★ 我方判断 |
|---|---|---|
| 1 | 查重键再扩 `gender` / `birth_place`？ | ★ **只扩 `gender`** ✓（同八字不同性别【大运顺逆不同 ✗ 确为不同商品 ✓）<br>`birth_place` **先不扩** ✗ —— 它影响真太阳时 ✗ 属更大口径问题 ✓ |
| 2 | 分钟粒度 vs 时辰粒度？ | ★★ **暂不改** ✓。当前口径「完整出生时间 = 命书身份」自洽 ✓<br>副作用（14:30→14:05 需重买）**记为已知** ✓ |
| 3 | `returnTo` 闭环未消费？ | ★★★ **采纳她的方案** ✗：**在 `/chart` 结果页加「去购买命书」CTA** ✓<br>—— 比首页按 returnTo 直跳 pricing 更好（直跳会跳过结果页 ✗ 反而不利转化 ✓） |
| 4 | 生产库迁移 | ★★★★★ **已完成** ✓（`pg_indexes` 确认为真 ✗ 见 §一表末行 ✓） |

**★ 1/2/3 我方建议【打包成 26 号或并入下次**✗ 【不必单独立项 ✓**

---

# 五、归档与写回

```
✓ 25 号目录完整**✗：
   HANDOFF-命书一份一付.md（390 行 ✗ 任务书 ✓）
   HANDOFF-BACK-一份一付①购买前要求有命盘.md
   HANDOFF-BACK-一份一付②付款时把命盘关联上.md
   HANDOFF-BACK-一份一付③按盘判定.md
   REPLY-命书一份一付复核.md（本文件 ✓）
✓ 三份回执入库 f297610 ✓（★ 她那 5 个提交此前未推送 ✗ 已一并推送 ✓）
```

**★★ 关于【是否写回总纲 §十一 事故档案**✗**：
```
★ 我方判断：【不写入事故档案**✗
   —— 【它不是【事故**✗ 【是【一次【功能补全（★ 用户提的产品问题 ✓）
   —— ★★ 唯一的"事故形态"是【她自己发现并当场修掉的回归**✗
     【而【它【没进过生产（★ 在 verify 阶段就暴露 ✓）✓
★★ 但【§三 那条判据教训【建议【登记**✗（★ 它是可复用的纪律 ✓）
→ ★★★ 【即：【归档交接记录 ＋ 登记纪律条目**✗ 【不进事故档案 ✓
```

---

# 六、下一步

```
★ 未决（均非阻塞 ✗）：
   · 26 号候选：①查重键扩 gender ②/chart 加「去购买命书」CTA
   · 上架前必补（清单 H 段）：密码重置 ＋ 账号设置页
   · ENFORCE 开启前的未解锁端到端验证（★ 见下 ★★★★）
```

**★★★★★ 最后一条【要特别提**✗：
```
★ 本轮 ③ 让「按盘判定」具备了【真实的付费墙能力**✗
★★ 但【它【仍被 `ENTITLEMENT_ENFORCE = false` 【完全旁路**✗
   —— 【即：【现在【谁都不会被挡**✓
★★★ 【而【联调第 4 步（verify-payment 兜底）【也【因此【无法验证**✗（★ 已在上轮说明 ✓）
→ ★★★★ 【开 ENFORCE 前【必须补**✗：
   ① 未解锁用户的端到端验证（ai 全文拿不到 ✗ 不触发 AI 调用 ✓）
   ② verify-payment 兜底路径的真实验证
   —— 【这两项【建议【合成【一个【独立的【"付费墙启用前验收"**✗
     【而【不是【在【联调轮里【顺带做 ✓
```
