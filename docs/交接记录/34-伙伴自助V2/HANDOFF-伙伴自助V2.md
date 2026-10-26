# HANDOFF-伙伴自助 V2

> **给执行方**：TraeCode（B 侧）
> **签发**：DeepSeek 侧（A 侧）· **日期**：2026-10-23 · **轮次**：34
> **性质**：中大型功能（新表 + 新端点 + 新页面 + 状态机 + 品牌位 + 测试）
> **交付后**：A 侧复核并出 `REPLY-伙伴自助V2复核.md`

---

# 〇、为什么现在做 V2（动机不是规模，是可用性）

用户的时间约束（原话）：**工作日每天晚上、周末中午要带女儿上课，客户在这期间联系无法回复**。

v1 是人工接单：伙伴发生日 → 我们手动出报告 → 手动回传链接 → 手动扣额度。
一个人的白天撑不起这条链，结果就是「客户 20:00 下单，第二天中午才有回应」。

**V2 的目标：伙伴登录后自助出报告，全程不需要我们在线。**

★ 已知商业风险（记录在案，不改变决定）：目前 0 个付费伙伴。
缓解：本功能**只对拥有额度的账号开放**（见 §三 身份判定），普通用户完全看不到，不影响现有体验。

---

# 一、现状事实（A 侧实测，不用复核）

```
① reports 表已有 share_token / share_expires_at / share_revoked_at（supabase/share.sql）
   ★ 但没有 status 列，也没有幂等请求号列
② partner_credits 是 append-only 账本：delta（非零） + reason（purchase/consume/refund/adjust） + ref
   已有 3 个部分唯一索引：purchase_ref / consume_ref / refund_ref
③ 扣减函数 spendPartnerUnits 已实现且幂等（ref 作幂等键），但【src/app 下零处调用】
   —— 也就是说现在只有脚本能扣，站点里没有任何扣费入口
④ /api/checkout 需要登录 token，未登录返回 401 → 伙伴买额度必须先有账号
⑤ webhook 收到伙伴包付款会【自动】入账（creditPartnerPurchase），这一步不用人管
⑥ /api/unlock 已有：token 鉴权 → checkAiBudget（AI 预算护栏）→ generateAIAnalysis → 落库
⑦ 分享页 /r/[token] 已有：标题、ReportOriginNote（来源披露）、SharePrintBar、页脚
⑧ 生成入口目前只有 /api/unlock（面向单人客户），没有「伙伴批量出报告」的端点
```

**核心不对称（V2 要解决的那一件事）：入账是自动的，扣减是手动的。**

---

# 二、先读这 8 条

```
1. supabase/share.sql 全文 —— reports 的分享列怎么加的（本轮沿用同一套 SQL 迁移风格）
2. supabase/partner-credits.sql 全文 —— 账本结构 + 3 个部分唯一索引的写法
3. src/lib/partnerCredits.ts —— spendPartnerUnits / adjustPartnerUnits / getPartnerBalance 的签名与幂等语义
4. src/app/api/unlock/route.ts 全文 —— 现有的「鉴权 → 预算 → 生成 → 落库」顺序，本轮复用
5. src/lib/reportSave.ts —— ensureFatebookReportByAdmin / saveReport 的落库方式与 title 生成
6. src/app/r/[token]/page.tsx 第 90-130 行 —— 分享页渲染点（品牌位要插在 h1 上方，披露必须留在原处）
7. src/components/reports/ReportOriginNote.tsx —— 披露文案（V2 严禁移除）
8. scripts/test-partner-accept.mjs 第 220-290 行 —— 账本断言与牙口的既有写法（本轮新增测试照它写）
```

---

# 三、设计决定（结论已定，不要另行发挥）

## 3-1. 身份判定：**不新增角色表**

```
伙伴 = partner_credits 中存在该 user_id 的任何一行（购买或 admin grant 都会产生行）
```
余额为 0 但有过记录 → 仍可进面板（看到「余额不足，请充值」）。
普通用户 never 产生 partner_credits 行 → 天然不可见，**不需要灰度开关**。

## 3-2. 报告状态机（新增列，最小化）

```sql
ALTER TABLE reports ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'ready';
-- 取值：'ready' | 'pending' | 'failed'（默认 ready 保证老数据语义不变）
ALTER TABLE reports ADD COLUMN IF NOT EXISTS request_id TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS brand_name TEXT;     -- 伙伴品牌，可空
ALTER TABLE reports ADD COLUMN IF NOT EXISTS brand_contact TEXT;  -- 伙伴联系方式，可空
CREATE UNIQUE INDEX IF NOT EXISTS idx_reports_request_id
  ON reports (user_id, request_id) WHERE request_id IS NOT NULL;
```

★ `request_id` 的唯一索引是**防双击重复扣费**的唯一手段（见 3-3 ⑤）。

## 3-3. 生成流程（顺序固定，错一步就会漏扣或白嫖）

```
① 鉴权：body.token → getUser，无则 401
② 伙伴判定：存在 partner_credits 行，否则 403「非伙伴账号」
③ 幂等短路：若 (user_id, request_id) 已存在 → 直接返回该报告（不再扣费、不再生成）
④ 余额检查：getPartnerBalance ≥ 1，否则 409 + { needPurchase: true }
⑤ AI 预算检查：checkAiBudget，超额 429（同一份报告也要过闸，不能因为是伙伴就绕过）
⑥ 落 pending 行：INSERT reports (status='pending', request_id, user_id, kind, title, input, result={})
   —— 先落行是为了拿到 reportId 作为扣费的幂等键
⑦ 扣 1 份：spendPartnerUnits({ userId, units: 1, ref: reportId })
   —— 若这一步抛错（如额度被并发扣光），把 ⑥ 的行标记 failed 并返回 409
⑧ 生成：await generateAIAnalysis(...) / 合婚计算
⑨ 成功：UPDATE reports SET result=…, status='ready', share_token=…, share_expires_at=NOW()+90d
⑩ 失败：UPDATE status='failed' + adjustPartnerUnits(+1, reason='refund', ref=`refund:${reportId}`)
        + console.error('★伙伴报告生成失败已退额，需核查：' + reportId)
```

**为什么先扣后生成**：先扣才能防「生成成功但余额为 0」的白嫖；失败必须退。
**为什么退额用 reason='refund' 且 ref 带前缀**：与购买退款（reason='refund'）共用唯一索引，前缀避免撞号。

## 3-4. 开放品类：只开命书与合婚

```
fatebook（万字命书） ✅
hemun（合婚详批）    ✅
ziwei / annual / geo ❌ 返回 400「该品类暂未对伙伴开放」
```
依据：伙伴包（partner_credits_*）在定价体系里对应的就是命书/合婚。

## 3-5. 品牌位：只收两个文本字段

```
brand_name     伙伴品牌名（≤ 24 字）
brand_contact  联系方式（电话 / LINE / 微信，≤ 40 字）
```
渲染在分享页 `<h1>` **上方**一行：`{brand_name} · {brand_contact}`。

**严禁**：
- 不做 logo 上传（要对象存储 + 审核，本轮不做）
- **不得**因此移除或弱化 `ReportOriginNote`（披露是伦理红线，见 §六）

## 3-6. 客户不注册、不登录

伙伴把分享链接发给客户，客户打开即读、可打印。
**不得**要求客户注册才能看报告（这是现有产品承诺，V2 不能改）。

---

# 四、分三步做（每步可独立验证，建议分 3 次提交）

## 第一步：数据库 + 服务端函数

```
① 新建 supabase/partner-v2.sql：按 §3-2 加 4 列 + 1 唯一索引（全部 IF NOT EXISTS，可重复执行）
② src/lib/partnerReport.ts（新）：
   · createPartnerReport(admin, { userId, kind, input, brandName, brandContact, requestId })
     —— 实现 §3-3 的 ①–⑩，返回 { report, shareUrl, balance }
   · 纯函数拆出来便于测试：resolvePartnerKind(kind) / shouldRejectBalance(balance) / refundRef(reportId)
③ 不新增依赖；错误分支全部返回结构化 code（401/403/409/429/400），不要抛裸异常给前端
```

## 第二步：API + 页面

```
① src/app/api/partner/report/route.ts（新）
   POST { token, kind, input, brandName?, brandContact?, requestId }
   —— 只做参数校验与调用 partnerReport，业务逻辑留在 lib（便于测试）
② /api/partner/share/route.ts（新）
   POST { token, reportId } → 为已有报告建/换分享链接（供"复制链接"按钮用）
③ src/app/partner/page.tsx（新，登录后可见）
   · 顶部：剩余份数 + 「购买额度」按钮（跳 /partners 定价）
   · 表单：选品类（命书/合婚）→ 生辰输入（复用现有 BirthPlacePicker 与校验）→ 品牌名/联系方式（可空）
   · 提交后：显示报告标题 + 分享链接（可复制）+ 「我也要打印」提示
   · 列表：该账号最近 20 份报告（状态、时间、链接、是否已吊旗）
   · 余额 < 1 时：表单禁用 + 显式提示（不要只在提交后报错）
④ 顶部导航不加入口；只有伙伴账号在 /partner 才能进来（普通用户访问 → 显示"该页面仅对合作命理师开放"）
```

## 第三步：测试

```
新增 scripts/test-partner-v2-accept.mjs，挂进 verify 末尾（离线，不许发网络请求）
```

---

# 五、验收标准（A 侧逐条复核）

| # | 断言 | 判定方式 |
|---|---|---|
| 1 | 改动文件在白名单内 | 见回执要求；不得动 /api/unlock、webhook、checkout |
| 2 | SQL 全部 IF NOT EXISTS，可重复执行 | 读 partner-v2.sql |
| 3 | 身份判定 = 有 partner_credits 行 | 测试：无行 → 403；有行 → 通过 |
| 4 | 余额 0 → 409 且 `needPurchase: true` | 测试 |
| 5 | ★ 同一 requestId 重复提交只扣 1 次 | 测试：连调两次，余额只减 1，返回同一 reportId |
| 6 | ★ 生成失败必须退额 | 测试：注入生成抛错 → 余额不变 + status='failed' + 有 console.error |
| 7 | AI 预算超额 → 429，且不扣额度 | 测试（mock checkAiBudget） |
| 8 | 非白名单品类 → 400 | 测试：ziwei/annual/geo 全部拒 |
| 9 | 分享链接 90 天有效、可立即打开 | 测试：生成的 share_expires_at ≈ +90d |
| 10 | ★ 分享页同时有品牌位与来源披露 | 测试：品牌存在时 h1 上方有 brand_name，且 ReportOriginNote 仍在（两个都要断言） |
| 11 | 客户无需登录可读 | 测试：分享页不 import 任何 auth |
| 12 | 表单只收生辰/性别/出生地 + 品牌两字段 | 测试：源码中不得出现 phone/email/手机/邮箱 的客户字段 |
| 13 | `npx tsc --noEmit` | 退出码 0（同时看 `$LASTEXITCODE`） |
| 14 | `npm run verify` 全 PASS | 41 个 `*_PASS` 一个不少 + 新增 `PARTNER_V2_PASS` |
| 15 | `npm run build` 成功 | 退出码 0 |
| 16 | 牙口 | 回执贴：删掉退额分支 → 测试红 → 还原 → 绿；删掉 requestId 唯一索引 → 并发断言红 → 还原 → 绿 |

---

# 六、必须避免（红线）

```
✗ 不得移除或弱化报告开头的来源披露（第 32 轮定的伦理红线，V2 同样适用）
✗ 不得要求客户注册/登录才能看报告
✗ 不得在表单里收客户手机号、邮箱、微信（伙伴是收集方，我们不留联系方式）
✗ 不得在余额不足时"先出报告后补钱"
✗ 不得对同一 requestId 重复扣费（唯一索引是硬约束，不是应用层判断）
✗ 不得绕过 checkAiBudget（伙伴不是免检通道）
✗ 不得改 /api/unlock、webhook、checkout 的既有语义
✗ 不新增 npm 依赖；不引入对象存储/图片上传
✗ 不跑格式化工具（会让 172KB 的单文件 diff 失去可读性）
```

---

# 七、回执要求

```
文件：docs/交接记录/34-伙伴自助V2/HANDOFF-BACK-伙伴自助V2回传.md
1. git diff --stat（列出全部改动文件）
2. supabase/partner-v2.sql 全文（供 A 侧在 SQL Editor 执行）
3. ★ 幂等实证：同一 requestId 连调两次的输出（余额、reportId 一致）
4. ★ 失败退额实证：注入生成错误后的余额与 status、以及 console.error 原文
5. 牙口两次（删退额 / 删唯一索引）的红绿输出
6. npm run verify 末尾 10 行 + tsc 退出码 + build 结果
7. 已知缺口（例如：品牌位不支持 logo、无法自助换绑绑定账号 等）
8. ★ 分步提交说明：3 个 commit 分别是什么（便于 A 侧分步复核）
```

---

# 八、做完之后（A 侧动作）

```
① 在 Supabase SQL Editor 执行 partner-v2.sql
② 用测试账号跑一次端到端：--grant 2 → 生成一份 → 余额 2→1 → 分享链接可打开
③ 复核通过后，再告诉 Mandy「您可以自己出报告了」
```

**在 ③ 之前，不要让任何伙伴进入 V2 流程**——线上未验证的自助扣费入口风险最高。
