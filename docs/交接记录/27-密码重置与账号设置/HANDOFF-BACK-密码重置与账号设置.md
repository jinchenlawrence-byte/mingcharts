# 回执：密码重置与账号设置（27 号）

> **对应任务书**：`HANDOFF-密码重置与账号设置.md`（2026-10-13）
> **纪律基准**：`docs/验收标准与红线.md` §8.5.1 / §8.6.2 / §8.6.7 已读并执行
> **★★ 人工验收：已通过（用户实测，2026-10-13）——真发邮件→收信→点链接→设新密码→新密码登录，全链闭环 ✓

---

## 一、结论

**四个步骤全部完成，验收表 12 条全部通过（含人工验收）。**

- `npm run verify` 28 段全绿（含 tsc --noEmit 0 错误，新增尾段 `test-account-auth.mjs` 24 条断言）
- 牙口：按任务书验收 9 注释 `resetPasswordForEmail(` 调用行 → **仅「接线」断言精确翻红**（其余 23 条仍绿）→ 还原复绿
- 前置配置（用户已在 Supabase 后台完成）：Site URL `https://www.mingcharts.com`；Redirect URLs 登记 2 条：`https://www.mingcharts.com/reset-password` 与 `http://localhost:3000/reset-password`

## 二、逐条回应（对照任务书验收表）

| # | 验收项 | 结果 | 说明 |
|---|---|---|---|
| 1 | /reset-password 存在且处理两种会话状态 | ✓ | 四相状态机 `checking / form / no-session / done`：挂载 `getSession()` 分派——有会话→新密码+确认表单（`updateUser({ password })`）；无会话→「链接无效或已过期」＋「返回登录页重新获取」按钮；链接校验中与成功后也各有明确 UI，无白屏、无裸异常 |
| 2 | /auth 忘记密码入口 → resetPasswordForEmail | ✓ | 登录模式下表单下方「忘记密码？」按钮 → 切换找回视图（邮箱输入＋「发送重置邮件」）→ `handleForgot` 内调用 `resetPasswordForEmail(email, { redirectTo })`。断言锚定「调用在 handleForgot 函数体内」（大括号平衡提取 handler），非文案命中 |
| 3 | 成功/失败同一句提示（防账号枚举） | ✓ | 实际文案：**「重置邮件已发送，请查收（含垃圾邮件）」**。实现上 handler 内不 throw、不读 error（断言 `handleForgot` 内 0 命中 `throw`/`catch`/`error.message`），无论邮箱是否已注册、调用成败均给同一句 |
| 4 | 重定向地址与 Supabase Redirect URLs 一致 | ✓ | 代码：`redirectTo = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password``。实际登记的 URL（用户在 Supabase 后台完成，截图确认）：`https://www.mingcharts.com/reset-password`、`http://localhost:3000/reset-password`，Site URL 为 `https://www.mingcharts.com`。**无需用户再操作** |
| 5 | /account 页存在，改密走 updateUser({ password }) | ✓ | 最小集：只读邮箱展示＋新密码/确认表单＋成功/失败内联反馈＋页底「我的命盘/我的报告」链接。未加改邮箱/删账号/订阅管理 |
| 6 | 未登录访问 /account 明确提示去登录 | ✓ | 显示「请先登录后查看账号设置」＋「去登录」按钮（Link → /auth），无白屏 |
| 7 | Nav 有 /account 入口且移动端可点 | ✓ | 已登录区「我的报告」之后新增平铺链接「账号设置」（与「我的命盘/我的报告」同款样式，贴近现有风格）。**不带 `hidden` 类**（断言守护），窄屏同排可点；未做下拉（现有 Nav 为平铺风格，下拉反而突兀） |
| 8 | 断言覆盖路由存在＋接线（非仅文案） | ✓ | 新建 `scripts/test-account-auth.mjs` 24 条断言，纳入 verify 第 28 段。核心：①两 page.tsx 存在且真调 API（非空壳）；②`resetPasswordForEmail(` 必须在 `handleForgot` 函数体内；③`updateUser({ password` 必须在 `handleChange` 函数体内；④reset-password 两态分支齐备（`no-session`＋`/auth` 回跳入口＋`form`）；⑤Nav `href="/account"` ≥1 且不带 hidden |
| 9 | 牙口：注释 resetPasswordForEmail( → 精确翻红 | ✓ | 见 §三-3 原始日志：注入后仅「✗ resetPasswordForEmail( 在 handleForgot 提交处理函数体内」一条翻红，**统一提示文案断言仍绿**（证明断言抓的是接线而非文案），还原后 24 条复绿 |
| 10 | 人工验收（真发邮件→收信→点链接→设新密码→新密码登录） | ✓ **已通过** | 用户实测（2026-10-13）：发重置邮件→收信→点链接→设新密码→新密码登录，全链闭环 |
| 11 | verify 全绿 + tsc 0 错误 | ✓ | 28 段全 PASS（清单见 §三-4），tsc --noEmit 为 verify 首段 0 错误 |
| 12 | 未越界 | ✓ | 未改支付/权益相关代码；未加改邮箱/删账号/订阅管理（断言④守护：三个页面 `updateUserById` 0 命中、`updateUser` 非 password 字段 0 命中、0 处引用 SERVICE_ROLE） |

**实现决策三则（供复核）**：

1. **密码强度沿用 minLength=6**（§8.5.1 复用已有口径）：`/auth` 页 signUp 输入框已是 `minLength={6}`，故两新页同口径并在 UI 提示「密码至少 6 位」，不另写一套。前端不做唯一防线，Supabase 服务端策略兜底。
2. **reset-password 成功后不自动跳转**：显示「密码已重置」文案＋「返回首页」按钮——让用户明确看到成功反馈再自行离开（`updateUser` 后会话保持有效，无需强制重登）。
3. **邮件链接会话交换**：Supabase 邮件链接 URL 带 code，`supabase-js` 的 `detectSessionInUrl`（默认开启）自动交换，`getSession()` 等初始化完成后返回，挂载时读一次即可分派两态。

## 三、原始日志

**1）正向全绿（24/24）**：

```
—— ① 路由存在且真接线 ——
  ✓ 路由存在：src/app/reset-password/page.tsx 与 src/app/account/page.tsx
  ✓ reset-password 为客户端组件（非空壳）
  ✓ reset-password 页调 updateUser({ password })（设新密码真接线）
  ✓ reset-password 页读会话（getSession）——两态分派的前提
  ✓ reset-password 页含无会话分支（链接无效或已过期提示）
  ✓ reset-password 页无会话分支含重新请求入口（回 /auth）
  ✓ reset-password 页含有会话分支（设新密码表单）
  ✓ account 为客户端组件（非空壳）
  ✓ account 页调 updateUser({ password })（改密真接线）
  ✓ account 页 updateUser 调用在提交处理函数（handleChange）体内
  ✓ reset-password/layout.tsx 提供 metadata
  ✓ account/layout.tsx 提供 metadata
—— ② /auth 忘记密码接线 ——
  ✓ /auth 页含「忘记密码」入口文案
  ✓ /auth 页存在提交处理函数 handleForgot
  ✓ resetPasswordForEmail( 在 handleForgot 提交处理函数体内（接线非文案）
  ✓ handleForgot 内不 throw / 不读 error（成功失败同一句提示，防账号枚举）
  ✓ 统一提示文案存在：「重置邮件已发送，请查收（含垃圾邮件）」
  ✓ redirectTo 用 ${NEXT_PUBLIC_APP_URL}/reset-password（与 Supabase 登记地址一致）
—— ③ Nav 账号设置入口 ——
  ✓ Nav.tsx 含指向 /account 的链接（href="/account" 命中 1，要求 ≥1）
  ✓ Nav 的 /account 链接不带 hidden 类（移动端可点）
—— ④ 未越界 ——
  ✓ 不使用 Admin API（updateUserById 命中 0，要求 0——客户端不得碰管理接口）
  ✓ 不做改邮箱（updateUser 非 password 字段命中 0，要求 0）
  ✓ 三个文件均不引用 SERVICE_ROLE（客户端只用 anon key）
ACCOUNT_AUTH_PASS
```

**2）注入确认（§8.6.7 肯定性证据）**：注入后改动行实际内容（Edit 回显）：

```
26	    // await getSupabase().auth.resetPasswordForEmail(email, { redirectTo })
```

**3）注入后精确翻红**（仅 1 条红，文案断言仍绿）：

```
  ✗ resetPasswordForEmail( 在 handleForgot 提交处理函数体内（接线非文案）
  ✓ 统一提示文案存在：「重置邮件已发送，请查收（含垃圾邮件）」   ← 仍绿
ACCOUNT_AUTH_FAIL（EXIT=1）
```

还原后复绿：`ACCOUNT_AUTH_PASS（EXIT=0）`。

**4）verify 28 段 PASS 标记清单**（后台任务 exit 0）：

```
CHECKER_ACCEPT_PASS / PRICING_ACCEPT_PASS / SOLAR_TIME_PASS / ENTRY_CONSISTENCY_PASS /
GANZHI_CONSISTENCY_PASS / DAYBOUNDARY_ACCEPT_PASS / DAILY_ACCEPT_PASS / ENTITLEMENT_ACCEPT_PASS /
LEGAL_ACCEPT_PASS / GEO_ACCEPT_PASS / WEALTH_ACCEPT_PASS / LIUNIAN_ACCEPT_PASS /
LIUNIAN_COVERAGE_PASS / LIUYUE_INDEX_FIX_PASS / FORTUNE_TIER_PASS / REPORTS_ACCEPT_PASS /
SITE_AUDIT_PASS / ENTITLEMENT_GATE_PASS / FATEBOOK_ACCEPT_PASS / SELFTEST_PASS /
SHENSHA_ARTICLES_PASS / LIUNIAN_CACHE_PASS / PROXY_GUARD_PASS / FATEBOOK_ONEPAY_PASS /
ENFORCE_GUARD_PASS / ACCOUNT_AUTH_PASS
```

（日志中另 7 处「FAIL」字样均为合规用例「期望 FAIL → FAIL」的牙口自检文本，非真失败。）

## 四、缺项（如实承认）

1. ~~人工验收未做~~ → **已补：用户实测通过（2026-10-13）**，见验收表 #10。
2. **`.env.local` 曾缺失 `NEXT_PUBLIC_APP_URL`**（本轮发现并已补回）：25 号联调时加过该键，其后 .env.local 恢复事故中丢失（不在恢复快照内）。本次按 `.env.example:39` 口径补回 `NEXT_PUBLIC_APP_URL=http://localhost:3000`。**该键缺失时 `redirectTo` 会拼成 `undefined/reset-password`，被 Supabase allowlist 拒绝**——生产 Vercel 已设不受影响，但本地人工验收前必须保留此键。**修改 .env.local 后需重启 dev server 生效。**

## 五、待拍板

1. ~~人工验收执行方式~~ → **已完成**：用户实测通过（2026-10-13）。
2. ~~commit 时机~~ → **已完成**：人工验收通过后已提交（见 commit 记录）。

## 六、文件清单

| 文件 | 变更 | 说明 |
|---|---|---|
| `src/app/reset-password/page.tsx` | 新建 | 两态（无会话提示+重新请求 / 有会话设新密码），四相状态机 |
| `src/app/reset-password/layout.tsx` | 新建 | metadata（use client 页由同级 layout 提供） |
| `src/app/account/page.tsx` | 新建 | 只读邮箱＋改密表单＋未登录提示 |
| `src/app/account/layout.tsx` | 新建 | metadata |
| `src/app/auth/page.tsx` | 修改 | 加 `forgot` 状态与找回视图、`handleForgot`（resetPasswordForEmail 接线＋统一提示防枚举）、「忘记密码？」/「返回登录」按钮 |
| `src/components/Nav.tsx` | 修改 | 已登录区加「账号设置」链接（无 hidden，移动端可点） |
| `scripts/test-account-auth.mjs` | 新建 | 24 条断言（路由存在+接线+两态+防枚举+未越界） |
| `package.json` | 修改 | verify 链尾追加 `tsx scripts/test-account-auth.mjs`（27→28 段） |
| `.env.local`（gitignored） | 修改 | 补回 `NEXT_PUBLIC_APP_URL=http://localhost:3000` |
