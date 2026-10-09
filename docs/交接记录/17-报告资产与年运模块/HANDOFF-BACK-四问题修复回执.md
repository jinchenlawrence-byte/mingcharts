# HANDOFF-BACK-四问题修复回执（报告资产化 + 年运模块 + CTA 去误导）

> 对应任务：用户以游客身份实测报 4 问题（CTA 误导 / 无年运模块 / 权益表年运行空挂 / 付费结果应资产化）
> 日期：2026-10-09　状态：**代码全部落地，verify 16 段全绿，tsc 0 错误；未 commit，等用户实测确认**
> ⚠️ 需先在 Supabase SQL Editor 执行 `reports` 表迁移（见附录 SQL），否则登录用户保存静默降级（不影响生成）

---

## 一、结论

4 个问题全部修复，四项拍板全部按用户选择落地：

| # | 问题 | 状态 |
|---|------|------|
| 1 | 排盘页「解锁 29.99 或 开通会员 9.9/月」误导（会员不含报告） | ✅ 删除会员分支，按钮改「解锁完整分析（内测期免费体验）」，小字披露「正式开放后 $29.99/次（会员不含报告）」 |
| 2 | 无年运报告模块、无付费入口 | ✅ 新建完整模块：`/liunian` 页 + `/api/liunian` + `aiLiunian.ts` + `LiunianResultView` + Nav「年运报告」 |
| 3 | 权益表年运行三列全 — | ✅ 年运行标注「单项购买 $19.99」+ 脚注说明 + 定价页单项卡「去体验 →」直达 `/liunian` |
| 4 | 付费模块结果应作为账户资产可反复查看 | ✅ 新 `reports` 表（RLS）+ 四 route 生成即自动保存 + `/reports` 列表 + `/reports/[id]` 回看 + Nav「我的报告」 |

**验收**：`npm run verify` 16 段全绿（含新增 2 段）；`npx tsc --noEmit` 0 错误；ENTITLEMENT_ENFORCE 保持 false 未动；牙口注入 2 发均精确翻红、还原无残留。

---

## 二、逐条回应（含四项拍板执行情况）

### 问题 1：CTA 误导（拍板执行：直接删会员分支）
- [chart/page.tsx](file:///e:/ai-agent/stock1000/bazi-mvp/src/app/chart/page.tsx)：删除 `isMember` state、membership fetch、`MEMBER_MONTHLY_PRICE` 引用；按钮「解锁完整分析（内测期免费体验）」；底部小字「正式开放后 $29.99/次（会员不含报告）· 查看命书详情」。
- 文案守卫（test-pricing-accept ⑦）：chart 页 `会员免费解锁`/`开通会员` 0 命中，`内测期免费体验`/`会员不含报告` 必须存在。

### 问题 2：年运模块缺失（拍板执行：今年/明年/后年可选）
- **规则引擎零改动**：`buildLuckCycles().liuNian` 天然是「今年起三年」结构化事实（year/ganZhi/十神/score/tag/relations/note/structuralIssues/所在大运），本模块只消费。`liuYue` 仅当年 → 明年/后年不生成 monthFlow 板块（facts 对齐优先，严禁 AI 编造流月）。
- [aiLiunian.ts](file:///e:/ai-agent/stock1000/bazi-mvp/src/lib/aiLiunian.ts)：5 固定板块（annualOverview/careerFlow/wealthFlow/loveFlow/healthFlow）+ 当年条件第 6 板块（monthFlow）；SYSTEM_PROMPT 带禁词清单（大吉/大凶/必/一定/注定+逐字替换范例）与免责语原文照写要求；`generateAILiunian` 接 withComplianceRetry + 干支溯源 + findForbidden 默认口径 + 「不必→无须」sanitize；facts 集与 prompt 逐字对齐（含胎元/命宫）；失败回退 `fallbackLiunianText` 规则版。
- [/api/liunian](file:///e:/ai-agent/stock1000/bazi-mvp/src/app/api/liunian/route.ts)：出生地解析与批命/geo 同源（resolveBirthFromBody）→ paipan → getWangShuai/getGeJu → buildLuckCycles → targetYear 校验 ∈ {今,明,后}年否则中文 400 → AI/回退 → locked 双写 `['annual_report']` → saveReport(kind='annual')。
- [liunian/page.tsx](file:///e:/ai-agent/stock1000/bazi-mvp/src/app/liunian/page.tsx)：三档年份卡片（显示干支），定价小字 $19.99/次（会员不含报告）。
- analysis.ts 唯一改动：`getFavorSets` 加 export（prompt 需同一套喜忌事实，严禁另写第二份判定）。

### 问题 3：权益表年运行空挂（拍板执行：标注单项购买，不移除）
- [pricing/page.tsx](file:///e:/ai-agent/stock1000/bazi-mvp/src/app/pricing/page.tsx)：年运行 note「单项购买 $19.99」；对比表下脚注「年运/合婚/紫微/地理为单项报告，按次单独购买（会员不含报告）」；新增 `SKU_HREF` 单项卡直达入口（annual→/liunian、hemun→/hemun、ziwei→/ziwei、geo→/geo；bundle3 无模块页不设）。

### 问题 4：结果资产化（拍板执行：生成即自动保存 + 独立 /reports 页）
- **表**：[schema.sql](file:///e:/ai-agent/stock1000/bazi-mvp/supabase/schema.sql) 追加 `reports`（kind CHECK 四类、title、input/result JSONB）+ RLS + SELECT/INSERT/DELETE 三策略 + 双索引。
- **保存**：[reportSave.ts](file:///e:/ai-agent/stock1000/bazi-mvp/src/lib/reportSave.ts) 唯一保存入口（service_role 绕 RLS 写入；`deriveReportTitle` 纯函数派生标题；token 缺失/无效/写库失败一律 warn + 返回 null，**绝不阻断生成**）。hemun/ziwei/geo/liunian 四 route 生成成功即保存，返回 `reportId`；四页面 `getAuthToken()` 带token，按 reportId 显示「✓已保存到你的账户」/游客灰条提示。
- **回看**：`/reports` 列表（类型徽标+标题+时间+查看/删除，未登录引导）+ `/reports/[id]` 详情（RLS 保护，查不到显示「不存在或无权查看」，按 kind 分发）。**回看页不做 grant 再校验**（已生成=已拥有资产）。
- **防漂移**：hemun/ziwei/geo 结果区抽为 `src/components/reports/*ResultView.tsx` 共享组件，生成页与回看页共用同一渲染器；LiunianResultView 同架构新建。
- 命书（fatebook）维持 charts 表不变；「我的报告」定位为四类单项报告资产。

---

## 三、原始日志（verify 16 段全绿，节选关键行）

```
npm run verify  →  tsc --noEmit + 16 段 && 链全部通过，末段 SELFTEST_PASS
✓ 标题派生：6 用例真跑通过；REPORT_KIND_LABELS 四类齐全                    (reports-accept ①)
✓ 静默降级：saveReport(null) 真调返回 null 不抛错；3 守卫全中               (reports-accept ②)
✓ 保存接线：4 个 route 均调 saveReport+deriveReportTitle 并返回 reportId    (reports-accept ③)
✓ token 接线：4 个页面均 getAuthToken → 请求体带 token → 按 reportId 提示   (reports-accept ④)
✓ 共享渲染：4 个 ResultView 组件齐备，生成页与 /reports/[id] 共用           (reports-accept ⑤)
✓ 表结构：reports 表/RLS/三策略/双索引齐备（8 项判据全中）                  (reports-accept ⑥)
✓ 规则版真调：无流月→5板块各≥50字且无monthFlow；当年→monthFlow引用给定月份；禁用词命中 0 (liunian-accept ①)
✓ 合规接线：重试/溯源/禁词（默认口径）/不必替换/facts含胎元命宫/板块条件化 6 判据全中 (liunian-accept ②)
✓ route：目标年三档校验+中文400；流年事实取自 buildLuckCycles 同源；流月仅当年 (liunian-accept ③)
✓ CTA 文案守卫：chart 页误导词 0 命中；pricing 年运行「单项购买」+入口/liunian (pricing-accept ⑦)
✓ metadata 齊全：18 自带 + 10 经 layout，0 缺失；无调试残留 0；19 个 href 全可达
✓ 行为：10 个 use client 页模块加载通过（新增 /liunian /reports /reports/[id]）
✓ canView 分支：ENFORCE=false 恒放行（开关未动）
```

**牙口注入（文本不变、行为变坏，注入前已打出实际行内容确认）**
- 注入 A：`api/hemun/route.ts` `saveReport(token,` → `saveReport(null,` → reports-accept ③ 精确翻红「saveReport 首参不是 token」✓ 已还原
- 注入 B：`aiLiunian.ts` 删 `if (findForbidden(text).hits.length) return '检出禁用词'` 行 → liunian-accept ② 精确翻红「禁用词检查未接线」✓ 已还原

---

## 四、承认缺项

1. **reports 表迁移需人工执行**：schema.sql 只是声明，线上库尚未建表。未执行前，登录用户生成报告时 saveReport 会写库失败 → warn 静默降级 → 页面显示游客灰条（生成主流程不受影响）。
2. **AI 年运未做线上真实抽验**：本轮仅离线断言（prompt/接线/fallback 真调）。真实 AI 输出的合规率需 dev server 实测后按既有 AI 抽验流程扩样。
3. **每年 1 月 1 日起「今年」干支以立春为界的说明**：规则引擎流年干支取立春后口径（June-15 锚点推年柱），页面三档按钮的干支标签用 60 甲子序推算，两者一致；跨立春前后数日内生成立春节气前报告时，公历年与流年干支存在常规错位，属命理口径而非缺陷。
4. **报告删除为物理删除**：confirm 后不可恢复（与「我的命盘」一致）。

## 五、待拍板

1. **⚠️ 工作区混有非本轮改动**：`git status` 显示本会话之外的大量改动（删除 `mingshu/demo`、`demoFatebook.ts`、`test-fatebook-accept.mjs`、两份 15/16 目录回执文档；修改 `aiAnalysis.ts` -91 行、`ai-check.ts`、`api/paipan/route.ts`、`aiGeo/aiHemun/aiZiwei` 等），疑为并行会话产物。**本轮未触碰、未还原**。commit 前请确认这些改动是否为有意为之，或告知由哪一轮任务负责收口。
2. 年运板块字数是否要为每板块加「上限」约束（现仅下限 50 字+prompt 字数区间 150-250）。
3. 「我的报告」列表是否需要按类型筛选/搜索（现仅时间倒序）。
4. 权益表年运行保留了「—」三列 + 「单项购买 $19.99」标注（拍板选项 B）；若日后想把年运并入某套餐（如 bundle3），需同步改 GRANT_TABLE 与本守卫。

## 六、文件清单（本轮新增/修改）

**新增（12）**
| 文件 | 说明 |
|---|---|
| `src/lib/aiLiunian.ts` | 年运 AI 模块（5+1 板块、禁词清单、合规重试、fallback） |
| `src/app/api/liunian/route.ts` | 年运 API（三档校验、同源事实、保存、locked 双写） |
| `src/app/liunian/page.tsx` + `layout.tsx` | 年运页（三档年份卡片）+ metadata |
| `src/components/reports/LiunianResultView.tsx` | 年运共享渲染组件 |
| `src/lib/reportSave.ts` | 报告保存唯一入口（deriveReportTitle/saveReport） |
| `src/lib/authToken.ts` | getAuthToken 客户端工具 |
| `src/app/reports/page.tsx` + `layout.tsx` | 我的报告列表页 |
| `src/app/reports/[id]/page.tsx` + `layout.tsx` | 报告详情页（按 kind 分发） |
| `scripts/test-liunian-accept.mjs`、`scripts/test-reports-accept.mjs` | 两段新验收（已入 verify 链） |

**修改（12）**
| 文件 | 改动 |
|---|---|
| `src/app/chart/page.tsx` | CTA 去会员分支 |
| `src/app/pricing/page.tsx` | 年运行单项购买标注 + 脚注 + SKU_HREF 入口 |
| `src/app/api/hemun/route.ts`、`api/ziwei/route.ts`、`api/geo/route.ts` | 接 saveReport，返回 reportId |
| `src/app/hemun/page.tsx`、`ziwei/page.tsx`、`geo/page.tsx` | 传 token + 保存提示 + 改用共享 View |
| `src/components/reports/HemunResultView.tsx`、`ZiweiResultView.tsx`、`GeoResultView.tsx` | 自页面抽取（D3） |
| `src/components/Nav.tsx` | 加「我的报告」「年运报告」链接 |
| `src/lib/analysis.ts` | getFavorSets 加 export（唯一改动） |
| `supabase/schema.sql` | reports 表 + RLS 三策略 |
| `scripts/test-pricing-accept.mjs` | 加 ⑦ CTA 文案守卫 |
| `scripts/test-site-audit.mjs` | CLIENT_PAGES +3 页 |
| `package.json` | verify 链 +2 段（共 16 段） |

---

## 附录：Supabase 迁移 SQL（请到 SQL Editor 执行）

```sql
-- 付费报告资产表（合婚/紫微/地理/年运；命书存于 charts 表）
CREATE TABLE IF NOT EXISTS reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('hemun', 'ziwei', 'geo', 'annual')),
  title TEXT NOT NULL,
  input JSONB NOT NULL,
  result JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own reports" ON reports FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own reports" ON reports FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own reports" ON reports FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);
```

## 附录 B：建议实测清单（dev server）

1. **游客**：首页排盘 → chart 页按钮应为「解锁完整分析（内测期免费体验）」，无任何会员/开通会员字样；生成合婚/紫微/方位报告 → 灰条「登录后生成结果可保存」。
2. **登录**：`/liunian` 选今年 → 生成（AI 约 30 秒）→ 绿条「已保存」→ Nav「我的报告」可见 → 回看内容与生成页一致；选明年 → 无流月板块。
3. `/api/liunian` 传 targetYear=2020 → 400 中文错误。
4. 定价页：年运行有「单项购买 $19.99」；单项报告卡「去体验 →」可直达对应模块。
5. 未执行迁移 SQL 前实测第 2 步会显示灰条（保存静默失败），属预期降级。
