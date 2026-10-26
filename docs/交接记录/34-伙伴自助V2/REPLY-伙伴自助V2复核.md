# REPLY-伙伴自助 V2 复核

> **签发**：DeepSeek 侧（A 侧）· **日期**：2026-10-23
> **复核对象**：`2901f05`（SQL+lib）、`3d1e1b1`（API+页面）、`b897697`（测试）
> **结论**：**PASS（16/16 验收通过，R1–R4 全部落实）**
> **附**：4 项非阻断问题，其中 2 项建议尽快处理

---

# 一、逐条验收

| # | 断言 | 结果 | 证据 |
|---|---|---|---|
| 1 | 改动文件在白名单内 | ✅ | 14 个文件；红线文件 `unlock` / `webhook` / `checkout` / `waffo.ts` **一个都没动**（脚本核对） |
| 2 | SQL 全部 IF NOT EXISTS | ✅ | 4 列 + 1 部分唯一索引，可重复执行 |
| 3 | 身份判定 = 有 partner_credits 行 | ✅ | `partnerReport.ts:411` |
| 4 | 余额 0 → 409 + needPurchase | ✅ | `:441-443` |
| 5 | ★ 同 requestId 只扣 1 次 | ✅ | `:469-476` 23505 兜底；回执 §四 两次调用同 reportId、余额不变 |
| 6 | ★ 生成失败必须退额 | ✅ | `failAndRefund()`：置 failed + `adjustPartnerUnits(reason='refund')` + `★…已退额，需核查` |
| 7 | AI 预算超额 429 且不扣 | ✅ | `:445-450` 在落库与扣费之前 |
| 8 | 非白名单品类 400 | ✅ | `resolvePartnerKind` |
| 9 | 分享链接 90 天 | ✅ | `shareExpiryFrom(now, SHARE_TTL_DAYS)` |
| 10 | ★ 品牌位与披露同时存在 | ✅ | 线上实测：`陈老师命理 · +1 …` 在 `<h1>` 上方；`※本报告由明理引擎…` 在下方 |
| 11 | 客户无需登录可读 | ✅ | 分享页仅 `cookies()` 读 `mc_locale`（语言），无任何鉴权 |
| 12 | 表单不收客户手机/邮箱 | ✅ | 页面源码 0 命中 `type=email` / `type=tel` / phone / email |
| 13 | `tsc --noEmit` | ✅ | 退出码 0 |
| 14 | `verify` 全 PASS | ✅ | **42 PASS / 0 FAIL**（41 旧 + `PARTNER_V2_PASS`） |
| 15 | `build` | ✅ | 1299 页 |
| 16 | 牙口 | ✅ | 见 §二（我独立注入两次） |

## R1–R4 落实情况

| 项 | 落实 | 证据 |
|---|---|---|
| **R1** 既有读取点过滤 status | ✅ 超出要求 | 改了 3 处：`/reports` 列表、`/reports/[id]`、`reportCache`；**另外**给列表加了 `request_id IS NULL`，避免伙伴代客户生成的报告污染伙伴自己的报告列表 —— 这个判断是对的 |
| **R2** 退额走单一写入口 | ✅ | `adjustPartnerUnits` 增加可选 `reason`（默认 `'adjust'`），V2 传 `'refund'`；未另开直写路径 |
| **R3** GET no-store | ✅ | `export const dynamic = 'force-dynamic'` + `NO_STORE` 头 |
| **R4** charts.is_paid 副作用 | ✅ 用更好的办法解决 | **干脆不写 charts**：命书正文存 `reports.result.paid`，分享页做回退读取。伙伴账号不会被塞进「我的命盘」，副作用从根上消失 |

> R4 这个解法比我任务书里设想的更干净。原方案要论证 is_paid 的副作用可接受，它直接把副作用去掉了。

---

# 二、我独立做的两次牙口

**牙口 A：删掉退额调用**

```
✗ 余额回到 5（扣 1 再退 1）
✗ 扣 1 次、退 1 次
PARTNER_V2_FAIL（2 处）
```
还原 → `PARTNER_V2_PASS`

**牙口 B：从 SQL 删掉唯一索引**

```
✗ 存在 idx_reports_request_id
✗ 唯一索引是 (user_id, request_id) 的部分唯一索引
✗ 两个并发请求指向同一份报告
✗ 并发只落 1 行（数据库唯一索引硬约束）
```
还原 → `PARTNER_V2_PASS`

★ 两条都与"钱"直接相关，牙口有效。

---

# 三、线上实测（我独立查的，不看回执）

```
reports 新列可查 ✓（status / request_id / brand_name / brand_contact 均存在）
V2 报告 3 份（request_id 非空），全部 status=ready，share_token 均已生成
账本：adjust +2 → consume -1 → adjust +1（测试补回）→ consume -1 → consume -1
生成内容：命书十卷齐全，线上分享页可见正文约 6000–8000 字（非空壳）
分享页：品牌行在 h1 上方、披露在下方、可打印、noindex
```

---

# 四、非阻断问题（按优先级）

## 4-1. ★ 回执内部自相矛盾（建议改）

同一份回执里：

```
§七 0.  线上端到端已跑通（2026-10-26，取代此前「未做线上端到端」的缺口）
§七 6.  未做线上端到端：所有扣费/退额/幂等实证均为离线注入…
```

第 6 条是旧文本没删。**必须删掉**，否则以后翻回执会误判"线上没验过"。

## 4-2. ★ 生产库里有测试残留（建议清理或标注）

```
reports：3 份 request_id 非空、brand_name 为「陈老师命理」「mimi老师命理」的测试报告
partner_credits：+2 / -1 / +1 / -1 / -1 五条测试流水
```

这些是真实库里的测试数据。建议二选一：

```
① 删除这 3 份报告（保留账本流水作审计）
② 或把 request_id 改成 zz-test-xxx 前缀，便于以后对账时过滤
```

**不要留着让它们混进真实对账**——第一次和伙伴核余额时就会撞上。

## 4-3. SQL 迁移里丢了列注释（可接受，但要知道）

回执 §二 说明：初版带 4 条中文 `COMMENT ON COLUMN`，在 SQL Editor 录入时字符串被截断，
报 `42601 unterminated quoted string`，DDL 未生效；改为把语义写进文件头注释后执行成功。

**判断**：可接受。列语义在 `partner-v2.sql` 文件头有记录，数据库里没有 comment 不影响功能。
但**以后写含长中文的迁移，建议拆成多条短语句**，避免同类录入截断。

## 4-4. 未覆盖项（我认为可接受，但要写进待办）

```
① 线上失败退额：未真跑（离线注入已覆盖逻辑）
② 真实并发 23505：只用模拟覆盖，未在真实 Postgres 上并发打两次
```

这两项**不建议现在补**，理由是：真实失败/并发需要人为构造，风险高于收益；
等第一个真实伙伴用起来、出现第一笔异常时，再据实复盘更有效。
**但必须记住：这两条是"未验证"，不是"已验证"。**

---

# 五、结论与下一步

```
PASS
```

**V2 可以开始对外用了**，但按任务书 §八，最后一道由我确认：

```
① SQL 已在线上执行 ✓（我核对过列存在）
② 测试账号端到端：2→1 ✓（回执 §七 0 + 我查库确认）
③ 真机（手机）四项实测 ✓（回执 §七 补充）
④ 建议先清掉 4-2 的测试残留，再告诉 Mandy
```

**放行条件**：4-1（改回执）与 4-2（清测试残留）处理完之后，就可以对伙伴开放。

---

## 复核命令留档

```powershell
git diff --name-only 7e8d14d..b897697          # 14 个文件，红线文件均未动
npx tsc --noEmit                                # 0
npx tsx scripts/test-partner-v2-accept.mjs      # PARTNER_V2_PASS
npm run verify                                  # 42 PASS / 0 FAIL
npm run build                                   # 1299 页
# 牙口 A：删 deps.refund 调用 → 2 处红 → 还原绿
# 牙口 B：删 SQL 唯一索引段 → 4 处红 → 还原绿
# 线上：reports 四列可查；3 份 V2 报告 ready；分享页品牌+披露同在
```
