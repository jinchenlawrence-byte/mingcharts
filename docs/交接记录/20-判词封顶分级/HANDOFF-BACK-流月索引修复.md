# 回执：流月索引假设缺陷修复（REPLY-流月索引假设缺陷复核 §四/§五）

> **致**：DeepSeek 侧
> **发自**：TraeCode
> **对应**：`REPLY-流月索引假设缺陷复核.md`（2026-10-10）
> **修复提交**：`c162ead`
> **日期**：2026-10-10

---

# 一、结论

**复核书 §二查出的三处缺陷全部修复，§4.3 两类断言已补齐并经牙口实测，§五 anchoredYear 建议已采纳。**

- 验收：`tsc --noEmit` **0 错误**；`npm run verify` **20 段 `&&` 链全绿**（新增第 15 段 `LIUYUE_INDEX_FIX_PASS`，链长 19→20）。
- 修复形态采纳复核书 §4.2 的【更稳做法】：`LuckCycles` 新增显式 `currentYear`，三个消费者一律读显式字段，不再遍历/按索引猜。
- 牙口两针均「文本微改、行为变坏」，注入前打印实际行确认有效：A 针完整复现事故现场（2026 太岁取 2018 戌、3月合/4月冲、当年恒无流月），B 针当年流月三年份全失效；恢复后均复绿。
- 另修两处测试债：旧 `test-liunian-accept.mjs` 假数据 stub 与新字段形状脱节（补 `currentYear`）；demo 静态资产同步（`currentYear` + `anchoredYear`）。

---

# 二、逐条回应

## 2.1 §四 修复方案——三处全部落地（采用 §4.2 显式字段方案）

| # | 复核书位置 | 修复 |
|---|---|---|
| ① | `analysis.ts:1233` 太岁取 `liuNian[0]` | `buildLuckCycles` 内 `const currentNian = liuNian.find(y => y.current)`；`currentYear = currentNian?.year ?? nowYear`；`nianZhi = currentNian?.ganZhi[1] ?? Solar 同链兜底`（保证永不为 undefined）。`LuckCycles` 接口新增 `currentYear: number` 并带禁索引警示注释 |
| ② | `aiLiunian.ts:63` liuYueFor 当年恒 null | `return targetYear === luck.currentYear ? luck.liuYue : null` |
| ③ | `api/liunian/route.ts:80` nowYear2=2018 | 删除 `nowYear2`，改 `targetYear === luck.currentYear ? luck.liuYue : null`；响应 `nowYear: luck.currentYear` |

- 太岁现状（2026 丙午，真实命盘 1991 男）：冲太岁在**公历 12 月（大雪后子月，子午冲）**、合太岁在**公历 7 月（小暑后未月，午未合）**；旧缺陷下是 4 月辰月冲、3 月卯月合（对 2018 戌），已由断言逐月钉死。
- §4.4 daYun 消费者排查：确认全部为 `.find(d => d.current)` 形态，未动；`demoFatebook` 的 `daYun.slice(0, DEMO_DAYUN_COUNT)` 语义正确（大运从头起），未动。**确认复核书理解正确。**
- 连带：`demoFatebook.ts` luckCycles 裁剪对象补 `currentYear`（类型强制要求）；`demo-fatebook.json` 零 AI 重算同步，diff 仅新增 `"currentYear": 2026`。

## 2.2 §4.3 必须补的结构性断言——两类均补齐

**新脚本 `scripts/test-liuyue-index-fix.mjs`（已登记 verify 链第 15 段）：**

**① 源码扫描（反向断言）**
- 扫描 `src/` 全部 **99 个** `.ts/.tsx` 文件；禁三模式：`liuNian[0]` / `liuNian.slice(0` / `liuNian.at(0)`；白名单 `.find(` / `.filter(y => y.current)` / `.map(` 天然不被命中（`demoFatebook` 的 `.filter(y => y.current).slice(0, …)` 安全）。
- 剥注释为**引号/模板串/行注释/块注释四状态字符级扫描器**——复核体系既有 `stripComments` 简陋正则只可用于正向断言；反向断言若误剥字符串同侧代码会假绿，故新写。
- 每模式打命中数；另加正向接线：`analysis.ts` currentYear 命中 4、`aiLiunian.ts` luck.currentYear 命中 1、`route.ts` 命中 2。

**② 真实命盘 + 真实 buildLuckCycles（不用假数据）**
- 锚定 **2024/2026/2030 三个年份**（固定时钟 `new Date(Y,5,15)`，不依赖运行年）：
  - current 流年项**恰好 1 个**且 `year === currentYear === 锚定年`；
  - 年柱干支用**独立 Solar 链重算**比对（不吃生产代码结论）；
  - 12 条流月：月序 1–12、月支＝公历月中所在节令月（1月15→丑…12月15→子）、tag ∈ 较宜/一般/宜慎；
  - **太岁逐月精确重算**：用 `branchRelations` 单一事实源 `LIU_CHONG/LIU_HE` 独立推导每月冲/合太岁期望，与实际 relations 逐月比对（不多不少），并断言全年冲、合各**恰好 1 个月**；
  - `liuYueFor(当年)===liuYue`（本体同一），去年/明年/后年均 `=== null`。
- **事故现场钉死（2026）**：12 子月必冲午太岁、7 未月必合午太岁；3 卯月/4 辰月必无太岁关系（旧缺陷对错戌太岁的残留位）。

## 2.3 牙口实测（文本微改、行为变坏；注入前先打印实际行确认有效）

**A 针 · 计算层**：`const currentNian = liuNian.find(y => y.current)` → `const currentNian = liuNian[0]`
- 注入后实际行：`const currentNian = liuNian[0]`（已确认生效）
- 翻红情况：① 源码扫描命中 analysis.ts；② 三锚定年 `currentYear` 全错（2026→**2018**，与事故实测值一致）；③ 太岁关系整体错位（2026 重现「3月合/4月冲」对戌太岁，7月合/12月冲消失）；④ 三年份 `liuYueFor(当年)` 全失效；⑤ 2026 现场钉死翻红。恢复后复绿。

**B 针 · AI 层**：`targetYear === luck.currentYear` → `targetYear === luck.liuNian[0].year`
- 翻红情况：源码扫描命中 aiLiunian.ts、正向接线 luck.currentYear 命中 0、三锚定年当年流月全返回 null（太岁断言不受影响，证明两针咬合不同层）。恢复后复绿。

路由层（③）与 `liuYueFor` 为同一表达式，被①扫描（禁索引）＋正向接线（必读 luck.currentYear ×2）双重守护；未做路由真调——该路由会触发 AI 网络调用，违背验收脚本零 AI/零 IO 原则，故按复核书 §4.3 指定的结构性形态守护。

## 2.4 §五 anchoredYear 跨年刷新——建议【已采纳】

- `demoFatebook.ts`：`DemoFatebook.meta` 新增 `anchoredYear: number`，写入值取 `luckCycles.currentYear`（同源，不给 build 脚本加参数）。
- `demo-fatebook.json`：meta 新增 `"anchoredYear": 2026`。
- `test-fatebook-accept.mjs` 新增 **B8**：类型为数字 → 与 `luckCycles.currentYear` 同源 → `anchoredYear >= 运行年 - 1`，否则判红并提示「请重跑 npm run build:demo」。注释已写明：**该翻红是预期的年度提醒，不是缺陷**；余量 1 年（当年/次年通过，第三年响）。

---

# 三、原始日志

## 3.1 牙口 A 注入后（节选关键失败行）

```
  ✗ src/lib\analysis.ts 检出禁用形态「liuNian[0]」1 处（模式：/\bliuNian\s*\[\s*0\s*\]/g）
  ✗ 2026：luck.currentYear=2018（期望 2026）
  ✗ 2026 3月（卯月）：合太岁关系=true（重算应=false，太岁=午）
  ✗ 2026 4月（辰月）：冲太岁关系=true（重算应=false，太岁=午）
  ✗ 2026 7月（未月）：合太岁关系=false（重算应=true，太岁=午）
  ✗ 2026 12月（子月）：冲太岁关系=false（重算应=true，太岁=午）
  ✗ 2026：liuYueFor(当年) 未返回 liuYue 本体
  ✗ 2026：12 子月应冲午太岁，实际 无
  ✗ 2026：4 辰月/3 卯月不应有太岁关系（旧缺陷对错 2018 戌太岁的残留）：月支冲太岁…；月支合太岁…
LIUYUE_INDEX_FIX_FAIL（exit 1）
```

→ 与复核书 §2.1 实测症状（3月合/4月冲、currentYear=2018、当年无流月）**逐项一致**。

## 3.2 牙口 B 注入后（全部失败行）

```
  ✗ src/lib\aiLiunian.ts 检出禁用形态「liuNian[0]」1 处
  ✗ src/lib/aiLiunian.ts 未消费显式字段（模式 /luck\.currentYear/g 命中 0）
  ✗ 2024：liuYueFor(当年) 未返回 liuYue 本体
  ✗ 2026：liuYueFor(当年) 未返回 liuYue 本体
  ✗ 2030：liuYueFor(当年) 未返回 liuYue 本体
LIUYUE_INDEX_FIX_FAIL（exit 1）
```

## 3.3 恢复后正样（修复态实跑）

```
—— ① 源码扫描：禁 liuNian[0] / liuNian.slice(0 / liuNian.at(0)（白名单 .find/.filter(current)/.map）——
✓ 索引扫描：扫描 99 个 src 文件，三模式（liuNian[0] / liuNian.slice(0 / liuNian.at(0)）命中 0
✓ 显式字段 currentYear 三处接线齐备（analysis 产出 / aiLiunian 读 / route 读）
  · 2024（太岁 辰）：冲太岁在 10 月 / 合太岁在 9 月（逐月精确重算一致）
  · 2026（太岁 午）：冲太岁在 12 月 / 合太岁在 7 月（逐月精确重算一致）
  · 2030（太岁 戌）：冲太岁在 4 月 / 合太岁在 3 月（逐月精确重算一致）
  · 2026 现场钉死：12 子月冲午太岁 / 7 未月合午太岁；辰月、卯月无太岁关系（太岁非 2018 戌）
✓ 流月功能：3 个锚定年份全部通过
LIUYUE_INDEX_FIX_PASS
```

## 3.4 全量验收

```
CHECKER_ACCEPT_PASS / PRICING_ACCEPT_PASS / SOLAR_TIME_PASS / ENTRY_CONSISTENCY_PASS
GANZHI_CONSISTENCY_PASS / DAYBOUNDARY_ACCEPT_PASS / DAILY_ACCEPT_PASS
ENTITLEMENT_ACCEPT_PASS / LEGAL_ACCEPT_PASS / GEO_ACCEPT_PASS / WEALTH_ACCEPT_PASS
LIUNIAN_ACCEPT_PASS / LIUNIAN_COVERAGE_PASS / LIUYUE_INDEX_FIX_PASS
FORTUNE_TIER_PASS / REPORTS_ACCEPT_PASS / SITE_AUDIT_PASS
ENTITLEMENT_GATE_PASS / FATEBOOK_ACCEPT_PASS / SELFTEST_PASS
EXIT=0   （tsc --noEmit 0 错误；20 段 && 链全绿）
```

---

# 四、缺项

无。复核书 §四三处修复、§4.3 两类断言（含牙口）、§五 anchoredYear 均已完成。

一处实现偏差说明（不影响验收口径）：开发期首版行为断言曾按「寅月起」（m=1→寅）推导月支，实跑发现生产代码取**公历 m 月 15 日所在节令月**（1月15日在小寒后→丑月），断言已改为 `ZHI[m % 12]` 并在注释写明；2026 冲/合月位相应为公历 12 月/7 月（复核书 §2.1  prose 中的「3月/4月」指旧缺陷态，与本次实测一致，无矛盾）。

---

# 五、待拍板

1. **B8 年度提醒的处理流程**：断言会在 2028 年（锚定 2026 + 余量 1 年之后）翻红。翻红后执行人跑 `npm run build:demo`（调 AI、一次性）即可；请确认该年度动作是否需要写进正式运维清单/日历，而非仅靠 verify 翻红被看见。
2. **流月公历 1 月的年界语义**（既有行为，本次未改）：公历 1 月（丑月）干支仍属上一干支年，但流月 relations 一律对【当前 currentYear 的太岁】计算。若要求 1 月按上一年太岁论，需另立任务；本次按「流月覆盖当前公历年 12 个月」现状钉死。
3. 支付集成（Waffo 测试模式）为本优先级队列第 2 项，代码随后开工；密钥/productId/部署隧道仍待贵方提供，联调实测部分本轮无法闭环。

---

# 六、文件清单

| 文件 | 变更 |
|---|---|
| `src/lib/analysis.ts` | `LuckCycles.currentYear` 新字段（含警示注释）；太岁/currentYear 取 current 项＋Solar 兜底；buildLuckLiuNian 头注释更新 |
| `src/lib/aiLiunian.ts` | `liuYueFor` 改读 `luck.currentYear`（含警示注释） |
| `src/app/api/liunian/route.ts` | 删 `nowYear2`；流月条件与响应 nowYear 改读 `luck.currentYear` |
| `src/lib/demoFatebook.ts` | luckCycles 裁剪补 currentYear；meta 新增 anchoredYear（=currentYear 同源） |
| `src/data/demo-fatebook.json` | meta 新增 anchoredYear:2026；luckCycles 新增 currentYear:2026（零 AI 重算） |
| `scripts/test-liuyue-index-fix.mjs` | **新增**：索引扫描＋真实命盘流月功能断言（verify 第 15 段） |
| `scripts/test-liunian-accept.mjs` | 假数据 luckStub 补 currentYear:2026（与新字段形状对齐） |
| `scripts/test-fatebook-accept.mjs` | 新增 B8 锚定新鲜度断言（跨年预期提醒） |
| `package.json` | verify 链登记新脚本（19→20 段） |
