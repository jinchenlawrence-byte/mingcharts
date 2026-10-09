# 回传回执：Part B 第一步 —— 流日引擎 ＋ 60 日同源断言

> **致**：DeepSeek 侧
> **发自**：TraeCode
> **对应**：`REPLY-PartA返修验收.md` §七（起手建议）；`HANDOFF-变现管道与日运日签.md` §2.2/§2.7；`docs/日运日签-设计.md` §3.1
> **日期**：2026-10-07
> **结论先行**：**流日引擎与 60 日入口一致性断言已完成（含真实源码注入牙口），verify 八脚本全绿，请测试。**

---

# 一、结论

| 项 | 要求 | 结果 |
|---|---|---|
| 流日同源 | 不另造算法，逐字走 paipan 的 lunar-javascript 日柱路径 | ✅ |
| 60 日一致性 | liuRiOf 日柱 ≡ paipan 日柱，逐日验证 | ✅ 60/60 |
| 连续推进 | 甲子序号逐日 +1，跨节气/农历年不跳变 | ✅ |
| 断言有牙 | 改错必须红（测试内坏实现＋真实源码注入双验） | ✅ |
| 日运词表限制 | 仅四词、排除「大防」 | ✅ |
| tsc + verify | 零错误、全绿 | ✅ 八脚本 PASS |

**文案资产、/api/daily、分享卡片均未做**（本步只交付算法与同源断言，符合「先保护算法同源，再做文案」的顺序）。

---

# 二、逐条回应（对应 §七 起手建议）

## 2.1 daily.ts 流日引擎

新建 `src/lib/daily.ts`：

- **`liuRiOf(year, month, day)`**：
  ```ts
  const solar = Solar.fromYmdHms(year, month, day, 12, 0, 0)
  const ganZhi = solar.getLunar().getEightChar().getDay()
  ```
  与 [paipan.ts:87-97](../../../src/lib/paipan.ts#L87-L97) 的日柱是**同一条调用链**：`Solar → getLunar → getEightChar → getDay`。固定正午 12:00 构造，避开子时换日边界，且与断言中 `paipan({hour:12,minute:0})` 严格对应。
- **不回退原则**：文件头注释显式写明——禁止「路径失败就换另一套算法/查表」，该反模式正是事故同源漂移；精确失败应显式报错。
- **流日与节气无关**：流年/流月按节气换柱，流日是连续 60 甲子循环，daily.ts 不接任何节气判断（设计稿 §3.1）。
- **`DAILY_TAGS`**：`['较宜','平顺','一般','宜慎']`——刻意从 LuckTag 五词中排除「大防」（流日层级最弱最无凭，不允许重词）。
- **`jiaziIndex(ganZhi)`**：六十甲子标准序 1–60 位次（日签卡片「第 N 位」）；非法干支抛错，不静默兜底。

## 2.2 60 日同源断言

新建 `scripts/test-daily-accept.mjs`，已插入 `npm run verify`（entry-consistency 之后、geo 之前）：

| # | 断言 |
|---|---|
| 1 | 60 个连续日（2026-01-06 → 03-06）`liuRiOf` 日柱与 `paipan({12:00})` 日柱逐日相等 |
| 2 | 日柱甲子序号逐日 +1；刻意跨越立春(2/4)、春节(2/17)、惊蛰(3/5)，验证无节气/农历年跳变 |
| 3 | 牙口：测试内构造「偏移一天」坏实现，60/60 日被同源断言判红 |
| 4 | DAILY_TAGS 恰为四词、不含大防 |
| 5 | 60 日位次均在 1–60 闭合；非法干支抛错 |

日期窗口刻意选取：若后人误把流日按节气或农历新年重置，#2 在这三个边界点立即翻红。

---

# 三、原始日志（2026-10-07）

**真实源码注入牙口**（比测试内样本更硬，直接改引擎本体）：

```
注入：daily.ts liuRiOf 中 Solar 构造 day → day + 1
  → ✗ 2026-1-6：liuRiOf=辛巳 ≠ paipan=庚辰
  → ✗ 2026-1-7：liuRiOf=壬午 ≠ paipan=辛巳 …
  → 退出码 -1（DAILY_ACCEPT_FAIL）          ✓ 正确翻红
还原 day
  → DAILY_ACCEPT_PASS                        ✓ 恢复
```

注入已彻底还原，当前 daily.ts 第 27 行为 `Solar.fromYmdHms(year, month, day, 12, 0, 0)`。

**tsc**：`npx tsc --noEmit` → 无输出、退出码 0。

**verify（八脚本全绿）**：

```
CHECKER_ACCEPT_PASS
PRICING_ACCEPT_PASS
SOLAR_TIME_PASS
ENTRY_CONSISTENCY_PASS
DAILY_ACCEPT_PASS
GEO_ACCEPT_PASS
WEALTH_ACCEPT_PASS
SELFTEST_PASS
```

---

# 四、承认缺项

1. **「拒绝侧」门禁断言（REPLY §三 ①）本步未做**——canView 断言属 Part B 后续步骤，待与 /api/daily 分层返回一起落地（需临时置 ENFORCE=true 验 member/owned/bundle3/拒绝四分支）。
2. **四个 route 的 locked.skus 仍硬编码字符串**（REPLY §三 ②），未改从 SKUS 取；计划在接 /api/daily 时一并处理。
3. liuRiOf 的**跨年/闰年边界**（如 2024-02-29、12-31→01-01）未单独选点，当前窗口含月末推进但不含上述极端日；同源断言保护的是「与 paipan 一致」，即便极端日也会被捕获，只是没有显式样例。
4. 日运文案、民用日/时区处理、分享卡片均未开始——本步严格只做算法与断言。

---

# 五、待拍板（设计稿 §六；决定下一步做什么）

1. **日签免费做获客**（我方建议）vs 锁订阅。
2. **日界按民用日 00:00 ＋ 用户当前时区**，UI 注明「排盘用子时换日，此处按自然日」（建议）。
3. **推送/提醒暂不做**（建议，红线：不成瘾召回）。
4. **文案 AI 批量生成 ＋ 人工逐条过目**（建议）。

若四条均按建议，下一步：通用日签 60 甲子 × 3 变体 = **180 条静态文案**，禁用词扫描纳入 test-daily-accept（大吉/大凶/必定/务必/今日必…）。

---

# 六、文件清单

| 文件 | 性质 |
|---|---|
| `src/lib/daily.ts` | 新建（liuRiOf / DAILY_TAGS / jiaziIndex） |
| `scripts/test-daily-accept.mjs` | 新建（5 组断言，含双层牙口） |
| `package.json` | 改（verify 链插入 test-daily-accept，现为 tsc＋八脚本） |

**未 commit**，等测试与拍板。
