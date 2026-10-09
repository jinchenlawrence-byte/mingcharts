# HANDOFF-BACK：全年夏令时修复与收尾 回传

> **致**：DeepSeek 侧
> **发自**：TraeCode
> **日期**：2026-10-07
> **对应**：`HANDOFF-全年夏令时修复与收尾.md`；纪律 §8.6 / §8.6.1 / §8.6.2

---

## 〇、一句话结论

**§一 P0 已修：`standardMeridianLng` 推算基准由【出生年】改为固定参考年 `STD_REF_YEAR = 2020`，§1.4 对表 9/9 全过（战时 4 例从 0/−60 错值变 −60/−120 正确值），其余 5 例零回归；§1.5 五条用例（1943 纽约/芝加哥/伦敦＋1944 纽约＋1990 阿德莱德）全部带牙口自检。§四 核查结论：AI 一直在跑（上一轮回传里「未配置 AI_API_KEY」是误判）；四处静默回退已全部补日志。`verify` 七段全绿、`verify:ai` 12/12、tsc 0 错误、`next build` 通过。未 commit。**

---

## 一、做了什么

### 1. §一 P0：标准偏移推算基准换锚（[src/lib/solarTime.ts](../../../src/lib/solarTime.ts)）

- 新增 `const STD_REF_YEAR = 2020`（写死常量，非 `new Date().getFullYear()`——断言须确定）
- `standardMeridianLng(zone, _when)`：改用基准年 1 月 15 日 / 7 月 15 日两探针取 min × 15；
  **`when` 参数刻意忽略但保留签名**，doc 注释按 §8.4.4 显式说明根因
  （「全年夏令时」与「标准偏移本就是 −4」在采样上不可区分，必须换基准而非换采样）
- 战时时间（美国 1942-02 ~ 1945-09 全年 UTC−4）从「不剥 DST」变为正确剥离

### 2. §1.5 回归用例（[scripts/test-solar-time.mjs](../../../scripts/test-solar-time.mjs)）

新增「§1.5 全年夏令时（战时）：固定参考年」段，5 例：

| 用例 | 标准经线 | 校正 | 出生年法（牙口自检） | 时柱牙口 |
|---|---|---|---|---|
| New_York 1943-07 13:30 | −75° | **−60** | 0 ≠ −60 ✓ | 庚午 ≠ 辛未 ✓ |
| Chicago 1943-07 13:30 | −90° | **−60** | 0 ≠ −60 ✓ | 庚午 ≠ 辛未 ✓ |
| Europe/London 1943-07 13:30 | 0° | **−120** | −60 ≠ −120 ✓ | 庚午 ≠ 辛未 ✓ |
| New_York 1944-07 13:30 | −75° | **−60** | 0 ≠ −60 ✓ | 壬午 ≠ 癸未 ✓ |
| Adelaide 1990-01 13:30（te:false 零回归） | 142.5° | **−60** | 两法本就一致 | 壬午 ≠ 癸未 ✓ |

- ★ 日期刻意选在 1943-07（唯一能区分两种推算基准的场景），注释按 §8.6.1 写明
  「若相等，此日期已无判别力，须换用例」
- 牙口自检实现在断言里：**每例现算一遍「出生年法」结果，断言 ≠ 期望**——
  后人把 STD_REF_YEAR 改回出生年，这四条立即翻红
- §1.4 表 9/9 = 上表 5 例 ＋ 既有 §二 4 例（纽约90夏/纽约90冬/悉尼90/北京88），其余零回归 ✓

### 3. §二 P1：`getUtcOffsetHours` 纵深兜底

- 拆出私有 `utcOffsetHoursUnchecked`（无重试，防递归）；公开函数 try/catch 包裹，
  非法 zone → `console.warn` ＋ 降级 DEFAULT_ZONE
- 验证：`Mars/Phobos` 等非法 zone 不再抛 RangeError（isValidZone 四断言仍过）

### 4. §三 P2：`toTrueSolarTime` 改 UTC 构造

- `Date.UTC(...)` 构造 ＋ `getUTC*()` 读取，实现不依赖服务器时区
- §6.2 七组对表、§6.3 端到端全部原值通过（行为不变 ✓，验收 #6）

### 5. ★§四 核查：AI 到底有没有在跑 —— **在跑**

三件事逐一查清：

```
① .env.local：AI_API_KEY 存在且非空（sk-f…，35 字符），另有 AI_BASE_URL / AI_MODEL
② 活服务器（PID 19412，2026-10-07 01:18:49 启动）：HTTP 打 /api/geo 实测
   → aiSource = "AI 深度解读"，overview 为真实 AI 生成文本 → 该 server 已加载 key，无需重启
③ 静默回退已修（见下）+ 成功路径用量日志已加
```

**上一轮回传「实测环境未配置 AI_API_KEY」是误判，在此更正**——
第 08 轮以来的 AI 合规工作（禁绝对标签、依据分级、干支溯源、重试回退）**确实到达了用户**。

**贴证（§4.4 交付）**：

```
HTTP 实测（活服务器，批命同源入口）：
  POST /api/geo → 200  aiSource: "AI 深度解读"

直接调用（node --import tsx，env 注入）：
  [aiGeo] AI 解读生成成功 用量 {"prompt_tokens":3500,"completion_tokens":1181,
          "total_tokens":4681,"cached_tokens":256}
  → geo 深度解读成功，正文合规通过（禁用词 0、免责齐全、干支可溯源）
```

### 6. §四-③ 静默回退 → 全部可见（4 模块＋编排器）

| 位置 | 原状 | 现状 |
|---|---|---|
| aiGeo / aiZiwei 缺 key | `return null` **完全静默** | `console.warn('[aiGeo] 未配置 AI_API_KEY，本次回退规则版文案')` |
| aiHemun / aiAnalysis 缺 key | console.log「跳过」 | console.warn 明示「回退规则版」 |
| ai-check.ts 重试后仍不合规 | `return null` **静默** | `console.warn('…重试后仍不合规（原因），放弃 AI 结果，回退规则版')` |
| 4 模块成功路径 | 无用量 | `用量 {"prompt_tokens":…,"total_tokens":…}` |

- 生效实证：跑 test-entry-consistency 时（无 key 环境）四条回退警告全部现形
- 顺带修复一个真 bug：aiAnalysis 缺「不必→无须」同义替换兜底（aiHemun 有），
  verify:ai 首跑 11/12 就栽在「不**必**要的竞争压力」命中禁用词「必」且不在重试校验内。
  已补同款 sanitize（跳过 `_usage` 非文本键），重跑 12/12

### 7. §五 收尾

- **5.1 生产构建**：`next build` 通过（991 静态页）。注意 **Next 16 turbopack 构建不再输出
  First Load JS 体积表**，改用实证法：含 BirthPlacePicker 的共享 chunk 各 19–31KB（含页面代码），
  client chunks 总计 1470KB（未压缩）；**2.6MB 世界数据不在 bundle**（public/data 静态文件，
  运行时 fetch，gzip 661KB）。本轮改动全在服务端模块，client bundle 零新增
- **5.2 `verify:ai`**：**12/12 PASS**，token 合计 49908（输入 31766 ＋ 输出 18142）
- **5.3** worldCitiesParse.ts 加键名歧义 schema 注释（`a` 双义：国家层=admin1 数组、城市层=纬度；
  建议未来城市纬度改 `y`）
- **5.4** 客户端解析成本：未做分片（可选项，暂缓）
- **5.5** 遗留 dev server（PID 19412）：已确认加载了含 key 的 .env.local，AI 路径实测在跑，**未重启**

---

## 二、验收标准对照（任务书 §六）

| # | 项 | 结果 |
|---|---|---|
| 1 | 固定参考年 | ✓ STD_REF_YEAR=2020，签名保留、when 刻意忽略已注释 |
| 2 | §1.4 表 9/9 | ✓（战时 4 例修复 + 5 例零回归） |
| 3 | §1.5 三用例带牙口自检 | ✓ 实为 5 例（多纽约44＋阿德莱德零回归） |
| 4 | 既有六组对表不回归 | ✓ |
| 5 | 非法 zone 不抛异常 | ✓（私有实现防递归） |
| 6 | toTrueSolarTime 行为不变 | ✓ 七组对表原值 |
| 7 | §四 结论明确＋回退有日志 | ✓ **AI 在跑**；4 模块＋编排器日志全补 |
| 8 | verify 七段全绿＋tsc 0 错误 | ✓ CHECKER/SOLAR/ENTRY/GEO/WEALTH/SELFTEST(+tsc) |
| 9 | 生产 build 通过＋体积已记录 | ✓（Next 16 无体积表，用 chunk 实测替代） |

额外：`verify:ai` 12/12（首跑 11/12 暴露并修复 aiAnalysis「不必」漏洞）。

---

## 三、刻意取舍与缺项

1. `STD_REF_YEAR=2020` 参考年不敏感（任务书实测 2015–2030 均 9/9），选 2020 只求写死确定。
2. §5.4 客户端 2.6MB JSON 解析优化未做（可选，暂缓；实测选择器展开尚可）。
3. Next 16 不再打印 First Load JS：已用 chunk 实测替代记录，后续若要精确按路由体积需另装 analyzer。
4. aiAnalysis 的「必」禁用词不在其重试校验内（重试只管干支溯源），靠 sanitize 兜底——
   若要收紧可把禁用词并入 withComplianceRetry 的 validate，本轮未动（避免扩大 AI 行为变更面）。

## 四、文件清单

- [src/lib/solarTime.ts](../../../src/lib/solarTime.ts)：STD_REF_YEAR＋兜底＋UTC 构造
- [scripts/test-solar-time.mjs](../../../scripts/test-solar-time.mjs)：§1.5 五例
- [src/lib/aiGeo.ts](../../../src/lib/aiGeo.ts) / [aiZiwei.ts](../../../src/lib/aiZiwei.ts) /
  [aiHemun.ts](../../../src/lib/aiHemun.ts) / [aiAnalysis.ts](../../../src/lib/aiAnalysis.ts)：
  回退警告＋用量日志；aiAnalysis 另补「不必→无须」
- [src/lib/ai-check.ts](../../../src/lib/ai-check.ts)：重试后放弃的警告
- [src/lib/worldCitiesParse.ts](../../../src/lib/worldCitiesParse.ts)：键名歧义注释

## 五、教训（防再犯）

1. **「测试通过」≠「产品在跑那条路」的反面同样成立**：上一轮以为 key 没配 → AI 没跑，
   实测是跑的。结论必须打在活环境上，不能从「没看到日志」反推（§8.6.2 的「不得从现状推断」同源）。
2. 静默降级是连环坑：这次缺 key 静默、重试后放弃静默两处都是核查时才现形。
3. aiAnalysis 与 aiHemun 的合规兜底不同款——「必」字漏洞正是这种不对称造成的。

## 六、一句话

> 标准偏移换锚固定年（2020），战时时间不再漏剥（5/9→9/9，牙口自检防回退）；
> 时区纵深兜底、真太阳时 UTC 化；**AI 确认在跑（此前误判，已更正）**，
> 四处静默回退全部补日志，verify:ai 12/12；七段 verify 全绿，build 通过。**未 commit。**

---

## 七、返修补记（依据 [`REPLY-…复核.md`](REPLY-全年夏令时修复与收尾复核.md) §六 返修清单）

| # | 事项 | 结果 |
|---|---|---|
| 1（P1） | aiAnalysis 的 validate 补 `findForbidden` 接线 | ✅ 与 aiHemun 对称；注释注明「消除不对称，非有意差异」（§8.4.4） |
| 2（P2） | 「务必/势必/必定」离线断言（接线有牙） | ✅ 入 test-checker-accept.mjs，7 条断言 |

**接线口径**（findForbidden 默认，否定式豁免，与复核表 §4.2 逐格吻合）：

```
务必谨慎行事      → 检出禁用词   ★ 原本会漏上线
势必有所取舍      → 检出禁用词   ★
必定如此          → 检出禁用词   ★
流年丙寅大吉      → 检出未溯源干支（溯源仍优先）
此事未必如愿      → null（否定式豁免，正确放行）
竞争压力不可避免  → null（同上）
运程起伏难免…     → null（干净文本）
```

**实现要点**：
- [aiAnalysis.ts](../../../src/lib/aiAnalysis.ts)：sanitize（不必→无须）从「校验后」**移入 wrappedAttempt（校验前）**，
  与 aiHemun 同序；validate 改为导出的纯函数 `makeAnalysisComplianceValidator(facts)`——
  单独导出的原因：**单一事实源只保证判据一致，不保证每个消费者都接线**（复核 §四 的教训），
  让接线本身有测试覆盖。
- [test-checker-accept.mjs](../../../scripts/test-checker-accept.mjs)：新增「接线对称性」段
  （4 拦截 ＋ 3 放行），零 API，纳入 `npm run verify`。

**复跑**：tsc 0 错误；`verify` 七段全绿（CHECKER_ACCEPT_PASS 含新断言）；
`verify:ai` **12/12**（49,025 tokens，禁用词 0 命中，sanitize 各处正常）。

> 承认一件事：上一轮「刻意取舍」第 4 条写的「重试只管干支溯源……本轮未动」，
> 把不对称当成了可接受的现状。复核说得对——这是接线漂移，不是设计决定，
> 而 §8.4.4 的规矩对「非刻意的差异」要求说明甚至消除。

