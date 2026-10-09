# HANDOFF-BACK-个性化日运回执

> 致 DeepSeek 侧：本回执对应 `HANDOFF-个性化日运.md`，按项目交接惯例（五段式＋文件清单）回传。请复核。

## 一、结论

**任务② 个性化日运已完成，verify 全绿、tsc 0 错误、牙口测试 6 种注入确认有效。**

- 交接书 §九 断言要求逐条落地到 `scripts/test-daily-accept.mjs` 的 #12–#18 七段，全部 PASS。
- `DAILY_ACCEPT_PASS` 与其余 11 段（CHECKER/PRICING/SOLAR_TIME/ENTRY_CONSISTENCY/GANZHI/DAYBOUNDARY/ENTITLEMENT/LEGAL/GEO/WEALTH/SELFTEST）同时绿。
- 未 commit，等待用户指令。

## 二、逐条回应（对照交接书 §九 断言清单）

| 交接书条目 | 落地位置 | 结果 |
|---|---|---|
| §9.1 覆盖性（10×6=60 键≡十神全集×六关系，180 条无重复） | test-daily-accept.mjs #12 | ✓ |
| §9.2 文风（12–28 码点，无问号、无连续感叹号） | #13 | ✓ |
| §9.3 合规（findForbidden strictBi＋专属禁词＋追加负面词＋密度≤1＋决策指导，0 命中） | #14 | ✓ |
| §9.4 §8.6.8 两层（词级：变体[2]「心」开头≤6；属性兜底：逐变体单一前两字≤6；同十神内<3 同起句） | #15 | ✓ |
| §9.5 事实表穷举（冲/合/害/刑 144×4＋十神 100，期望值独立生成不从实现反推） | #16 | ✓ |
| §9.6 跨模块归日一致（dailyFor 一次归日→general.liuRi≡personal 今日干支） | #17 | ✓ |
| §9.7 牙口（6 种注入：大吉/不宜出行/密度/7同起句/自算归日/寅巳改害，注入前先确认有效） | #18 | ✓ |

### 关键实现点

1. **单一事实源（§二）**：新建 `src/lib/branchRelations.ts`，收拢六冲/六合/六害/相刑/三刑组为唯一事实源，导出 `dayBranchRelation`（巳申既合又刑→看局取主导；寅巳既刑又害→取刑）。`aiAnalysis.ts`/`analysis.ts`/`hemun.ts`/`shengxiaoData.ts` 4 处旧表改为 import 别名（hemun 保留 ZI_MAO/ZI_XING 本地 Set 以免误报三刑半刑，行为不变）。

2. **十神判定复用（§3.1）**：`paipan.ts` 导出 `shiShenOf`/`SHI_SHEN`/`SHI_SHEN_NAMES`/`ShiShen` 类型；`analysis.ts` 删重复表改 import。测试用独立五行生成器 `expectShiShen`（不从实现反推）。

3. **归日同源（§五 P0）**：`daily.ts` 新增 `dailyFor(zone, chart, now)` 一次归日算两段；`personalDailyFor(liuRi, dayNumber, chart)` 只接收已算好的 liuRi，绝不自己算归日。牙口5（自算归日用民用日 0:00 不接 23:00 换日）确认 `good.general.date !== bad.general.date`，断言翻红。

4. **权益接入（§六）**：`api/daily/route.ts` 重写，GET 返回 `{general, personal, locked, authState}`；`canView(ent,'daily')` 判定，`ENTITLEMENT_ENFORCE=false` 内测期 `locked=false`；locked 时不下发 personal 文案。取最近命盘 chartFactsFrom。

5. **静态资产（§四）**：`src/data/daily-personal.ts` 180 条，3 变体分工 [0]意象型/[1]处事型/[2]心绪型。刑=明面摩擦→把话说开；害=暗处磨损→留意没说出口的消耗，两者可辨。文案全过 strictBi（禁「必」），所有「不必」改为「无须」。

## 三、原始日志（关键段）

### verify 末段（DAILY_ACCEPT_PASS）
```
✓ 日运覆盖：10×6=60 键，共 180 条；键集 ≡ 十神全集×六关系；全库无重复
✓ 日运文风：180 条长度均 12–28 码点，无问号、无连续感叹号
✓ 日运合规：180 条过 findForbidden(strictBi)＋专属禁词＋追加负面词＋密度(≤1)＋决策指导，0 命中
✓ 日运句式：变体[2]「心」开头 0/60（≤6）；逐变体前两字≤6；同十神内<3 同起句
✓ 事实表穷举：冲/合/害/刑 144×4 全对；十神 100 全对（独立五行生成器）；dayBranchRelation 无并见/巳申按局(得合·刑)/寅巳 全对
✓ 跨模块归日一致：dailyFor 一次归日 → general.liuRi ≡ personal 今日干支；选片同源
✓ 牙口：6 种注入（大吉/不宜出行/密度/7同起句/自算归日/寅巳改害）均确认有效且断言翻红
DAILY_ACCEPT_PASS
```

### tsc
```
$ npx tsc --noEmit
（无输出，0 错误）
```

### 牙口注入确认（#18 段，6 种注入逐条打出"注入有效"证据）
- 牙口1 大吉：注入后 dailyTags 含「大吉」→断言翻红
- 牙口2 不宜出行：注入决策指导正则命中→翻红
- 牙口3 密度：注入同条含≥2个 DENSITY_WORDS→翻红
- 牙口4 7同起句：注入7条同前两字→#15 属性兜底翻红（patched≥7 且 max≥7）
- 牙口5 自算归日：badDailyFor 用民用日0:00不接23:00→good.general.date≠bad.general.date 确认注入有效→断言翻红
- 牙口6 寅巳改害：badRel 把寅巳返回'害'→got==='害'且!=='刑'确认注入有效→断言翻红

## 四、承认缺项

1. **页面端到端测试未做**：`PersonalDailySection.tsx` 的 4 状态（guest/noChart/hasChart/locked）只在 tsx 层面通过 tsc，未做浏览器渲染验证。理由：交接书 §九 断言要求落在 test-daily-accept.mjs 的函数级行为，未要求浏览器端到端；且上一轮浏览器测试因 380 项重表单耗尽预算。**待用户决定是否补浏览器测试**。

2. **变体[2]「心」开头计数=0**：测试输出显示「变体[2]「心」开头 0/60（≤6）」。原 §8.6.8 词级断言约束为「≤6」，0 通过。但通用日签的对应断言是「≤15 且鼓励15左右」——个性化日运是否也应保持非零的"心"开头占比以维持心绪型风味，**待拍板**。当前 180 条无一条变体[2]以"心"起句，风味靠"心头/胸中/眉间"等身位词起兴。

3. **真太阳时校正与日运的边界**：`dailyFor` 的 zone 走 `dailyDateInZone`（晚子时23:00换日），但个性化日运的 `chart.allZhi`（全四支）来自用户保存的命盘，该命盘在 paipan 时已做过真太阳时校正。两处校正链路独立、无横向断言直接比对（横向比对由 ENTRY_CONSISTENCY 段覆盖批命/geo/合婚，未含 daily/personal 的 chartFacts）。**未发现不一致，但未加专门断言**——列待定。

## 五、待拍板

| 项 | 问题 | 我的倾向 |
|---|---|---|
| 1 | 变体[2]「心」开头是否应维持非零占比（如 ≤6 且 ≥3）以保留心绪型风味？ | 不改。当前用"心头/胸中/眉间/脑里"等身位词起兴，仍属心绪型内在观照，未失风味。 |
| 2 | daily/personal 的 chartFacts 与批命四柱是否需加横向归一断言？ | 倾向加，但属增量。当前 ENTRY_CONSISTENCY 已覆盖四入口，daily 的 chart 来自数据库读取已校正的命盘，风险低。 |

## 六、文件清单

### 新建
- `src/lib/branchRelations.ts` —— 冲/合/刑/害单一事实源＋`dayBranchRelation`
- `src/data/daily-personal.ts` —— 180 条静态资产
- `src/components/PersonalDailySection.tsx` —— 客户端组件（4 状态）
- `docs/交接记录/13-日运日签/HANDOFF-BACK-个性化日运回执.md` —— 本回执

### 修改
- `src/lib/paipan.ts` —— 导出 `shiShenOf`/`SHI_SHEN`/`SHI_SHEN_NAMES`/`ShiShen`
- `src/lib/analysis.ts` —— 删重复 SHI_SHEN 表改 import；`buildMarriage` 用 `LIU_CHONG`
- `src/lib/aiAnalysis.ts` —— 3 个本地表改 import 别名＋`Zhi` cast
- `src/lib/hemun.ts` —— 3 个表改别名（保留 ZI_MAO/ZI_XING Set，行为不变）
- `src/lib/shengxiaoData.ts` —— CHONG/HAI/XING 改别名
- `src/lib/daily.ts` —— 抽出 `pickVariant`；新增 `personalDailyFor`/`dailyFor`/`DailyChartFacts`/`PersonalDailyView`/SHI_SHEN_BASIS/RELATION_BASIS/relationBasisLevel
- `src/app/api/daily/route.ts` —— 重写 GET（登录态+personal+locked，归日一次算）
- `src/app/daily/page.tsx` —— 引入 PersonalDailySection
- `scripts/test-daily-accept.mjs` —— 新增 #12-#18 七段断言＋顶部 imports

### 验收命令
```
npm run verify   # 12 段全 PASS
npx tsc --noEmit # 0 错误
```

未 commit，等待指令。
