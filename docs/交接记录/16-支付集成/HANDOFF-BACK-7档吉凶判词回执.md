# HANDOFF-BACK：7 档吉凶判词与禁用词拆表 —— 回执

> **回执对象**：DeepSeek 侧
> **任务书**：`docs/交接记录/16-支付集成/HANDOFF-7档吉凶判词与禁用词拆表.md`（v2，2026-10-09）
> **代码提交**：`d11b99f` —— feat: 7档吉凶判词启用 + 禁用词拆三类（17 文件，+335/−76）
> **日期**：2026-10-09

---

# 一、结论

任务书全部条款已落地：**A 类判词启用 7 档（专供大运/流年），B/C 类保留禁用，LuckTag/DomainTendency/DAILY_TAGS/流月三档/价格表/ENFORCE 均未动**。`npm run verify` 18 段全绿（链首 tsc 0 错误），牙口五条全部「先确认有效 → 精确翻红 → 还原复绿」。

**7 档真实分布（624 盘 × 大运 5616 步 + 流年 1872 步 = 7488 样本）**：

| 档位 | 大运 | 流年 | 合计 | 占比 |
|---|---|---|---|---|
| 大吉 | 0 | 8 | 8 | 0.11% |
| 吉 | 45 | 71 | 116 | 1.55% |
| 小吉 | 384 | 299 | 683 | 9.12% |
| 平 | 3261 | 678 | 3939 | 52.60% |
| 小凶 | 854 | 239 | 1093 | 14.60% |
| 凶 | 754 | 404 | 1158 | 15.46% |
| 大凶 | 318 | 173 | 491 | 6.56% |

极端档（大吉+大凶）6.66%（阈值 ≤12%）；正向 10.78% vs 负向 36.62%，差 25.84%（阈值 ≤30%）。分布形态：以「平」为峰、两侧渐薄，「大吉」最稀有——符合「只有无结构病且多个喜用同现才够小吉以上」的设计意图。**负向高于正向的结构性原因**（扣分项多于加分项 + 0/1 合并归平）已如实记录，列入待拍板③，未调阈值掩盖。

---

# 二、逐条回应（验收 §十 16 项）

| # | 项 | 回应 |
|---|---|---|
| 1 | FORBIDDEN_WORDS 拆三类 | ✓ [ai-check.ts](file:///e:/ai-agent/stock1000/bazi-mvp/src/lib/ai-check.ts)：`ENABLED_JUDGMENT_WORDS`（A 类 7 档）/ `FORBIDDEN_CERTAINTY_WORDS`（必/一定/注定）/ `FORBIDDEN_ACTION_WORDS`（积极进取/突破性进展）；`FORBIDDEN_WORDS = B + C`。strictBi 语义未动 |
| 2 | FORBIDDEN_WORDS_PROMPT 内容更新 | ✓ 派生源改为 B+C 五词，删「大吉→较为有利」范例；替换范例改从三表派生（务必→宜、必然/注定→往往、必定→多半、一定→倾向于、积极进取→稳中求进、突破性进展→阶段性的进展）；收编「否定请用无须、推断请用往往/多半/倾向于」指引（原 aiLiunian 手抄内容，五模块共同受益） |
| 3 | aiLiunian 改引用派生 | ✓ SYSTEM_PROMPT rule 6 改为 `6. ${FORBIDDEN_WORDS_PROMPT}`，手抄清零（test-liunian-accept 有「亦严禁」残留反向断言守护） |
| 4 | 流月限制措辞改明确（保持手写） | ✓ D 条：「【流月】以节气换月（若提供），标签只用 较宜/一般/宜慎 三档，不得使用大运/流年的 7 档判词（大吉/吉/小吉/平/小凶/凶/大凶）。」 |
| 5 | aiAnalysis H 条按 §4.3 重写 | ✓ 含「7 档判词 + 必须按结构病点明喜用是否真正有效 + 分维度 + 判词非承诺 + 禁行动指令 + 流月只用三档」；SECTION_SPECS daYunAnalysis requirement 同步 |
| 6 | 新建 FortuneTier，LuckTag 不动 | ✓ [analysis.ts](file:///e:/ai-agent/stock1000/bazi-mvp/src/lib/analysis.ts)：`FortuneTier` 专供 `LuckDaYunItem.tag`/`LuckLiuNianItem.tag`；`LuckTag` 原样保留（注释标明「保留给日运与流月」）；`LuckLiuYueItem.tag` 不变 |
| 7 | cap 三级 + 事故 18 注释 | ✓ `fortuneTierOf`：无病 4 / 1 个 2 / ≥2 个 0；注释标明「事故 18 纪律，不得删除」；反向不设 floor；0 与 1 合并归平 |
| 8 | 7 句判词 + 前端配色 | ✓ `FORTUNE_ADVICE` 按 §3.3 原文；chart 页 `FORTUNE_BADGE`/`FORTUNE_BORDER`（大吉/吉/小吉 emerald 深→浅、平 amber、小凶/凶/大凶 red 浅→深，文字即判词不靠颜色）；`TAG_*` 保留给流月；LiunianResultView `TAG_STYLE` 扩 12 键兼容旧快照 |
| 9 | 7 句判词 findForbidden → 0 命中 | ✓ 元断言实测输出：`✓ 判词语合规：7 句逐句过 findForbidden，命中数 0`（test-fortune-tier ⑤） |
| 10 | 分布断言三条 + 真实分布表 | ✓ 见 §一分布表与 §三原始日志；阈值按实测标定留余量（EXTREME_MAX=12%≈1.8×、BIAS_MAX=30%），注释记标定依据 |
| 11 | 三条牙口注入 | ✓ 见 §三——**注入 A/C 的实际翻红位置与任务书 §5.2 预期不完全一致，已如实报告**（§四-1） |
| 12 | /terms 补判词免责 + MingShuContent 一致 | ✓ terms.md §12.2 增「Fortune-tier labels」段（倾向性描述/非行动建议/不预测具体事件/大凶非灾祸预言）；privacy.md §2.1 同步一句；MingShuContent「克制不吓唬」卡改为「吉凶判词分七档、只描述时段倾向并标注结构依据；不作确定性承诺，不给行动指令，拒绝恐吓式营销。」 |
| 13 | §八三条并入 | ✓ ①断言③收紧+活树牙口（修正过程中发现并修复了收紧正则误伤解构形态的问题，§四-2）；②`liuYueFor` 纯函数+真调断言+牙口；③stripComments「仅可用于正向断言」标注（test-liunian-accept/test-reports-accept/test-entitlement-gate 三处） |
| 14 | verify 全绿 + tsc 0 | ✓ 18 段全 PASS（含链首 tsc --noEmit） |
| 15 | 未动边界 | ✓ LuckTag/DomainTendency/DAILY_TAGS/流月三档/价格表/ENTITLEMENT_ENFORCE 均未动（分布断言④边界守护实测流月零越界） |
| 16 | 独立 commit | ✓ `d11b99f` |

---

# 三、原始日志

## 3.1 verify 全量输出（收尾轮）

```
CHECKER_ACCEPT_PASS / PRICING_ACCEPT_PASS / SOLAR_TIME_PASS / ENTRY_CONSISTENCY_PASS
GANZHI_CONSISTENCY_PASS / DAYBOUNDARY_ACCEPT_PASS / DAILY_ACCEPT_PASS / ENTITLEMENT_ACCEPT_PASS
LEGAL_ACCEPT_PASS / GEO_ACCEPT_PASS / WEALTH_ACCEPT_PASS / LIUNIAN_ACCEPT_PASS
FORTUNE_TIER_PASS / REPORTS_ACCEPT_PASS / SITE_AUDIT_PASS / ENTITLEMENT_GATE_PASS
FATEBOOK_ACCEPT_PASS / SELFTEST_PASS
```
（链首 `tsc --noEmit` 0 错误）

## 3.2 test-fortune-tier 输出（基线）

```
=== 7 档真实分布（624 盘 × 大运5616步 + 流年1872步 = 7488 个样本）===
（分布表见 §一）
✓ 死档检测：7 档全部出现（最少档位 8 条）
✓ 滥用检测：极端档 6.66% ≤ 12%
✓ 偏向检测：正负向占比差 25.84% ≤ 30%
✓ 边界守护：大运/流年 tag 全在 7 档集合内；流月全用 较宜/一般/宜慎 三档
✓ 判词语合规：7 句逐句过 findForbidden，命中数 0
✓ 逐点映射：13 个边界点全中（含 cap 三级与反向无 floor）
FORTUNE_TIER_PASS
```

## 3.3 牙口五条（每条均先确认注入有效，贴注入前后实际值）

**注入 A（§5.2-1，cap 恒为 4）**
- 注入前：`fortuneTierOf(4, [2个结构病]) = 平`；注入后：`= 大吉` ✓ 有效
- 翻红位置：⑥ 逐点映射 2 条（`fortuneTierOf(4,1个结构病)=大吉≠小吉`、`fortuneTierOf(4,2个结构病)=大吉≠平`）→ `FORTUNE_TIER_FAIL`
- **分布三条仍绿**（大吉 8→18 条、极端档 6.80% 仍 ≤12%）→ 任务书预期「①死档翻红」与实际不符，详见 §四-1
- 还原后复绿 ✓

**注入 B（§5.2-2，下界 s>=-1 一律平）**
- 注入前：`fortuneTierOf(-1) = 小凶`；注入后：`= 平` ✓ 有效
- 翻红位置：① 死档「小凶 0 次」+ ⑥ 逐点 1 条 → `FORTUNE_TIER_FAIL`；还原后复绿 ✓

**注入 C（§5.2-3，s>=0 一律吉）**
- 注入前：`fortuneTierOf(0)/(1) = 平`；注入后：`= 吉` ✓ 有效
- 翻红位置：① 死档「平 0 次」+ ⑥ 逐点 3 条 → `FORTUNE_TIER_FAIL`
- **② 滥用仍绿**（极端档 6.66% 不变）→ 与任务书预期「②翻红」不符，详见 §四-1
- 还原后复绿 ✓

**注入 D（§八-① 活树牙口，chart 页真消费删为 `{/* locked */}`）**
- 翻红位置：test-entitlement-gate ③ 精确报 `src/app/chart/page.tsx 未消费 locked`（其余 4 页仍绿）→ `ENTITLEMENT_GATE_FAIL`；还原后 `ENTITLEMENT_GATE_PASS` ✓

**注入 E（§八-② 牙口，liuYueFor 改恒返回 `luck.liuYue`）**
- 注入前：`liuYueFor(2027) = null`；注入后：`= [{month:3,...}]` ✓ 有效
- 翻红位置：test-liunian-accept ②-b「明年/去年应返回 null」2 条 → `LIUNIAN_ACCEPT_FAIL`；还原后复绿 ✓

---

# 四、承认缺项

1. **任务书 §5.2 对注入 A/C 的预期翻红位置与实际不符**（任务书写于实现前，属预测偏差而非实现错误）：
   - 注入 A「cap 恒 4」→ 任务书预期「①死档（大凶永不出现）翻红」。实际上 cap 只封上限不封下限，大凶照常出现；且大吉仅从 8→18 条（0.24%），三条分布断言全绿。**真正抓到它的是 ⑥ 逐点映射**——为此我在 §五断言组中增补了 ⑥（fortuneTierOf 13 个边界点真调，含 cap 三级与反向无 floor），否则拆 cap 在分布层面不可见。这是分布断言的固有局限（统计阈值必留余量），已用逐点断言补足。
   - 注入 C「s>=0 一律吉」→ 任务书预期「②滥用翻红」。实际上极端档定义只含大吉+大凶，「平」涌入「吉」不动极端档；抓到它的是 ①死档（平 0 次）+ ⑥。
2. **§八-① 收紧正则时一度误伤解构形态**：我把 `/locked/` 收紧为 `/\.locked\s*(\?\.|&&)/` 后，GeoResultView/ZiweiResultView 的解构消费（`const { …, locked } = data` 后 `{locked && (…)}`）不落 `.locked` 形态，基线即 2 处误红。已修正为 `/(\.|(?<![.\w?]))locked\s*(\?\.|&&)/`（覆盖成员访问与解构裸用；类型声明 `locked?:` 与解构声明不匹配），并在牙口自检补「解构形态命中 / 注释不命中」正反探针。最终活树牙口（注入 D）证明：chart 页真消费删除后③精确翻红，其余 4 页不受影响。
3. **日签牙口 1 的检出路径随 A 类启用迁移**：原设计靠「大吉」在通用拦截表被 findForbidden 检出；A 类启用后该词已移出通用表。因日签定位「今日一省、非吉凶判决」，吉凶判词在日签语境仍是禁词——故将「大吉/大凶」收入日签专属禁词表（`SIGN_FORBIDDEN`/`P_FORBIDDEN`），牙口 1 改走专属表检出，180 条扫描语义不变（日签文案仍零判词）。
4. **mingli-cases.json 未用作分布样本**：该库 2403 例只有四柱干支、无出生时间/性别，无法驱动 paipan。按任务书允许的「固定测试集」路径，改用确定性出生网格（13 年 × 12 月 × 2 时辰 × 2 性别 = 624 盘）。

---

# 五、待拍板

1. **DomainTendency 是否升 7 档**——我方与任务书倾向一致：**维持三档**（分维度是「四个方面各自如何」，三档足够，避免信息量压垮阅读）。现状未动。
2. **流年 7 档已按任务书「是」实施**——若用户想只给大运 7 档，把 `LuckLiuNianItem.tag` 改回 `LuckTag` 即可（改一处 + 前端配色回退）。
3. **负向占比 36.62% 显著高于正向 10.78%**——结构性原因：score 规则扣分项（冲夫妻宫/冲提纲/天克地冲）多于加分项（合/半合喜用），且 0/1 合并归平压低正向。是否调权重属「提高准确率」范畴（需命理层面判断扣分项是否过重），超出本任务，未动。
4. **demo 快照未重新生成**——`demo-fatebook.json` 仍是旧五档标签快照（「较宜/平顺」等），页面 `Record<string,string>` + `?? ''` 回退不破；若希望示例页展示 7 档新标签，需重跑 `npm run build:demo`（调 AI，约 10 路并行）。请拍板是否重生成。

---

# 六、文件清单（commit `d11b99f`，17 文件，+335/−76）

**生产代码（9）**
- `src/lib/ai-check.ts` —— 三表拆分；FORBIDDEN_WORDS_PROMPT 派生源更新
- `src/lib/analysis.ts` —— FortuneTier 新建；fortuneTierOf（cap 三级）；FORTUNE_ADVICE 7 句；大运/流年接线
- `src/lib/aiAnalysis.ts` —— H 条按 §4.3 重写；daYunAnalysis requirement 同步
- `src/lib/aiLiunian.ts` —— 收掉手抄改派生；流月措辞改明确；新增 liuYueFor 纯函数
- `src/app/chart/page.tsx` —— FORTUNE_BADGE/FORTUNE_BORDER 7 档配色（大运/流年），TAG_* 保留给流月
- `src/components/reports/LiunianResultView.tsx` —— TAG_STYLE 扩 12 键兼容
- `src/app/mingshu/MingShuContent.tsx` —— 「克制不吓唬」卡表述与新政对齐
- `src/content/legal/terms.md` —— §12.2 增 Fortune-tier labels 免责段
- `src/content/legal/privacy.md` —— §2.1 补判词倾向性说明

**测试与配置（8）**
- `scripts/test-fortune-tier.mjs` —— ★ 新建（§五最重要产出：分布三条 + 边界守护 + 判词元断言 + 逐点映射）
- `scripts/test-regression.mjs` —— 硬门槛改 7 档集合；己丑运断言改「不得进正向三档」新形态；流月精确三档
- `scripts/test-wealth-accept.mjs` —— 无「大吉」断言 → 无「积极进取/突破性进展」
- `scripts/test-liunian-accept.mjs` —— 禁词派生断言 + 新 D 条措辞 + ②-b liuYueFor 真调 + stripComments 标注
- `scripts/test-entitlement-gate.mjs` —— ③ locked 消费正则收紧（含解构形态修正）+ 牙口探针；⑤ B+C 五词精确等值 + A 类放行/B 类拦截行为探针
- `scripts/test-daily-accept.mjs` —— 大吉/大凶收入日签专属禁词表；牙口 1 改走专属表检出
- `scripts/test-reports-accept.mjs` —— stripComments 标注
- `package.json` —— verify 链插入 test-fortune-tier（liunian 之后、reports 之前）
