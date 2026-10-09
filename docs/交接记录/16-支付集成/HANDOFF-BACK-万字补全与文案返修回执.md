# 回执：万字补全 ＋ 日运起句返修 ＋ 公开示例命书

> **回执对象**：DeepSeek 侧
> **任务书**：`HANDOFF-万字补全与文案返修.md`（起点 hash `8c108b4`）
> **代码 commit**：`42d8cc0`（feat: 万字补全+日运起句返修+公开示例命书，14 文件 +1075/−92）
> **验收**：`npm run verify` 15 段全绿（含 tsc 0 错误、FATEBOOK_ACCEPT_PASS）

---

## 一、结论

三部分全部完成并已 commit。

- **万字补全**：实测完整报告 **11464 字 ≥ 10000** ✓（十板块 7449 ＋ luckCycles 3022 ＋ 命例 993）。
  但任务书「提高要求即可」的前提**只部分成立**——单/双批调用两轮实测均不达标（2964/3821 字，
  达成率 52%/66%），最终靠**架构改动（逐板块 10 路并行调用）**才达标。**这是本轮回最大的偏差项，详见 §四-1。**
- **日运起句**：48 条改写完成，断言收紧为四条并纳入 verify，牙口 7 已加（w2，此前已汇报 PASS）。
- **公开示例命书**：静态 JSON ＋ `/mingshu/demo` 页（零 AI、零 IO、零登录），`/mingshu` 已加入口；
  虚构八字「庚午 壬午 辛亥 癸巳」≠ 用户八字；验收断言 6 组全部进 verify。

## 二、逐条回应（验收标准 15 条）

| # | 项 | 结果 |
|---|---|---|
| 1 | 十板块字数要求合计 ≥ 5600 | ✓ 中值合计 **5750**（A1 断言从 SECTION_SPECS 解析，未重抄；下限合计 5200） |
| 2 | 每板块同时补内容要点 | ✓ A2 断言：「须含以下要点」10/10、「不少于 X 字」硬下限句 10/10 |
| 3 | 字数表从生产代码导出 | ✓ `SECTION_SPECS` 已 export；断言正则 `/(\d+)-(\d+)字/` 解析区间 |
| 4 | ★★ 实测一份，逐板块打印，总计 ≥ 10000 | ✓ **11464 字**（逐板块实测输出见 §三-3）。**前提是接受了 §四-1 的架构改动** |
| 5 | AI_TIMEOUT_MS = 120000 | ✓ 四处统一（aiAnalysis/aiZiwei/aiHemun/aiGeo 默认值）；前端 fetch 无显式超时（全 src 无 AbortController），不会先于 AI 断开，无需改动 |
| 6 | 日运：「难得」6 条＋「那点」6 条＋变体[1] 重复组 ≤20% | ✓ w2 完成（48 条改写；变体[1][2] 前两字种数 36/38→60；半句零重复；同十神零同起句） |
| 7 | 日运断言收紧四条 | ✓ test-daily-accept.mjs #15（种数≥50／半句<3／同十神<2／保留原两条辅助） |
| 8 | 牙口：「难得」改回雷同 → 半句断言翻红 | ✓ w2 已验证（4 条同后半句注入 → 断言②精确翻红） |
| 9 | 示例命书静态 JSON，页面零 AI | ✓ C1 扫描：页面源码 AI/IO/登录模式 0 命中；页面只 import 静态 JSON（板块名已存入 JSON 的 `sectionList`，页面不再 import aiAnalysis） |
| 10 | 示例八字 ≠ 用户八字，虚构无真实姓名 | ✓ B4 断言：「庚午 壬午 辛亥 癸巳」≠「辛未 壬辰 壬子 壬寅」；`meta.fictional=true`；名字为「示例 · 甲先生」 |
| 11 | 前 3 完整／后 7 摘要／大运前 2 步／命例 1 条 | ✓ B2/B3 断言全过（完整板块均 ≥ 下限：574/592/736；摘要均 ≤200 字且带「完整内容约 X 字」截断提示） |
| 12 | 示例页无需登录可达；/mingshu 有入口 | ✓ C2（无 middleware）＋ C3（真调 `Page()` 返回 JSX）＋ C4（入口链接 1 命中） |
| 13 | verify 全绿 ＋ tsc 0 错误 | ✓ 15 段全 PASS（见 §三-5） |
| 14 | 未动价格表/entitlement.ts/ENFORCE/通用日签 180 条 | ✓ git diff 中无 pricing.ts、entitlement.ts、daily-signs.ts；ENFORCE 未动 |
| 15 | 改完已 commit（附 hash） | ✓ `42d8cc0` |

## 三、原始日志

### 1. 实测对照（同一虚构命盘 1990-06-15 10:30 男 上海，三轮真实 AI 调用）

```
一轮·单次调用（任务书架构）：
  十板块合计 2964 字（要求 5750，达成 52%）✗
  overview 309 / personality 331 / yongShen 308 / geJu 302 / tiaoHou 273
  daYun 575 / career 250 / marriage 180 / children 179 / health 257

二轮·两批各 5 板块并行：
  十板块合计 3821 字（达成 66%）✗
  （daYunAnalysis 878 达标，其余板块仍 250–430，模型按"一次响应"预算分配字数）

三轮·逐板块 10 路并行（本轮采用）：
  overview       实际 574 字（要求 400-500）
  personality    实际 592 字（要求 500-600）
  yongShen       实际 736 字（要求 500-600）
  geJuAnalysis   实际 706 字（要求 600-700）
  tiaoHou        实际 838 字（要求 600-700）
  daYunAnalysis  实际 1019 字（要求 800-1000）
  career         实际 854 字（要求 500-600）
  marriage       实际 944 字（要求 500-600）
  children       实际 714 字（要求 400-500）
  health         实际 472 字（要求 400-500）
  ────────────────────────────
  十板块合计 7449 字 · luckCycles 3022 汉字（CJK 口径）· similarCases 993（页面渲染口径）
  ★ 总计 11464 字 —— ≥ 10000 ✓ 万字达成
  token：prompt=20583 completion=17786 total=38369
```

### 2. 字数口径说明（诚实披露）

- 十板块：正文全字符（与任务书 2335/3186 的实测口径一致）。
- luckCycles：结构含英文字段名与 JSON 语法符号，按 **CJK 汉字**计（对齐任务书「3583 字」的正文口径；本盘 3022）。
- similarCases：按**页面实际渲染形态**计（readings 多于一条时逐条渲染 readings，否则渲染代表断语；本盘 993）。
- 若按任务书估算式（5750＋3583＋819＝10152），本盘实测 11464，结论一致成立 ✓

### 3. 牙口注入（均先确认注入有效，再验翻红，已还原无残留）

```
牙口①（A1 字数阈值）：daYunAnalysis「800-1000字」→「400-500字」
  → A1 翻红「中值合计 5300 < 5600」；A2 同步翻红「缺硬下限句 不少于 400 字」→ 已还原
牙口②（B2 摘要边界）：demo-fatebook.json 的 health 摘要 165 字 → 264 字
  → B2 翻红「摘要板块 health 实际 264 字 > 上限 200」→ 已从 .bak 还原
牙口③（断言内置自检）：daYunAnalysis 归零重算中值 4850 < 5600（阈值非恒绿）✓ 每次 verify 自动执行
```

### 4. verify 输出（15 段）

```
CHECKER_ACCEPT_PASS / PRICING_ACCEPT_PASS / SOLAR_TIME_PASS / ENTRY_CONSISTENCY_PASS /
GANZHI_CONSISTENCY_PASS / DAYBOUNDARY_ACCEPT_PASS / DAILY_ACCEPT_PASS / ENTITLEMENT_ACCEPT_PASS /
LEGAL_ACCEPT_PASS / GEO_ACCEPT_PASS / WEALTH_ACCEPT_PASS / SITE_AUDIT_PASS /
ENTITLEMENT_GATE_PASS / FATEBOOK_ACCEPT_PASS / SELFTEST_PASS
（tsc --noEmit 0 错误，为 verify 首段）
```

## 四、承认缺项与偏差

1. **★★ 架构偏差（最大项）**：任务书设想「单次调用＋提高字数要求」即可达标，两轮实测证伪
   （2964/3821 字）。改为 **逐板块 10 路并行调用**（`SECTION_BATCHES = SECTION_SPECS.map(s => [s.key])`）。
   代价：prompt token ×10（单份报告 input 约 20k tokens）；合规重试时 10 路整体重跑一次。
   墙钟耗时≈单次（并行），DeepSeek 单价下成本可接受。**若你方不同意此架构，请拍板（§五-1）。**
2. **facts 集合补了胎元、命宫**：逐板块调用后首轮合规失败「检出未溯源干支」，
   根因是 prompt 本就给出胎元/命宫干支但 facts 未收（事实集漏项，非模型编造——
   与此前「先甄别事实集漏项再判模型错误」的教训一致）。已补，并让校验器消息带具体命中干支/禁词。
   `test-checker-accept.mjs` 的接线断言相应从精确等值放宽为前缀匹配（拦截类别不变）。
3. **「前约 30%」文案与实际占比**：任务书按 3300/10152 估 32%；本轮实测展示占比
   约 35%（渲染口径）至 42%（脚本按 luckCycles 原始 JSON 长度计）。因完整板块字数上浮，
   前三板块本身就占了 1902 字。页面文案仍写「前约 30%」，是否改口径请拍板（§五-2）。
4. **示例 JSON 的 `sectionList` 为补丁写入**：生成后才发现页面不应 import aiAnalysis，
   板块名以 tsx 脚本从 SECTION_SPECS 补入既有 JSON（未重跑 AI；build 脚本已修正，
   下次重跑会自带该字段）。
5. **超上限不约束**：health（472/400-500）等板块实测超出区间上限——当前只守下限，
   超上限不判违规（更长的解读对用户无害）。如需上限约束请拍板。

## 五、待拍板

1. **逐板块 10 路并行调用架构是否接受？**（验收 #4 达标的实际手段；成本：input token ×10、
   合规重试 ×2；替代方案：接受 3000–4000 字的现状、或改「万字」文案——用户此前已拍板补真，
   故本轮按补真执行）
2. **示例页「前约 30%」文案**：实测 35%（渲染口径）。保留／改「约三分之一」／改「节选」？
3. **板块字数是否加上限约束**？（当前只守下限）
4. **示例命书内容定型**：demo-fatebook.json 已入库为静态资产，文风/断语即为公开展示版本。
   如需更换示例（重跑 `npm run build:demo` 即可，约 40 秒、4 万 token），请指示。

## 六、文件清单（commit `42d8cc0`）

**万字补全**
- `src/lib/aiAnalysis.ts`：SECTION_SPECS 字数 2850→5750＋要点＋硬下限句；新增 `SECTION_BATCHES`（逐板块）；
  `buildUserPrompt` 支持板块子集；`callAI`＋`attempt` 分批并行合并；facts 补胎元命宫；
  校验器消息带命中明细
- `src/lib/aiZiwei.ts` / `aiHemun.ts` / `aiGeo.ts`：AI_TIMEOUT_MS 默认 90000→120000
- `scripts/test-fatebook-accept.mjs`（新）：A1 中值≥5600／A2 要点+硬下限／B1–B5 示例 JSON／C1–C4 示例页／牙口自检
- `scripts/test-checker-accept.mjs`：接线断言放宽为前缀匹配（配合校验器消息带明细）
- `package.json`：verify 纳入 test-fatebook-accept；新增 `build:demo`

**公开示例命书**
- `src/lib/demoFatebook.ts`（新）：裁剪唯一事实源（DEMO_FULL_SECTIONS/SUMMARY_MAX/DAYUN_COUNT/CASE_COUNT、
  toSummary、buildDemoFatebook、DEMO_BIRTH 虚构资料）
- `scripts/build-demo-fatebook.mjs`（新）：一次性生成脚本（真实 AI，不纳入 verify；含完整板块下限门槛、
  逐板块实测打印、虚构红线自检）
- `src/data/demo-fatebook.json`（新）：静态示例资产（四柱「庚午 壬午 辛亥 癸巳」，身弱七杀格）
- `src/app/mingshu/demo/page.tsx`（新）：示例页（零 AI 零 IO；顶部虚构标注；前 3 完整＋后 7 摘要＋
  岁运节选＋命例 1 条＋CTA→/mingshu）
- `src/app/mingshu/MingShuContent.tsx`：hero 区加入口链接

**日运起句返修（w2，同 commit）**
- `src/data/daily-personal.ts`：48 条改写
- `scripts/test-daily-accept.mjs`：#15 断言收紧四条＋牙口 7
