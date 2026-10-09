# HANDOFF-BACK：收尾轮（四项小改 + AI 合规抽验）回传

> **对应任务书**：根目录 [`HANDOFF-收尾轮-AI合规抽验.md`](../../../HANDOFF-收尾轮-AI合规抽验.md)
> **回传日期**：2026-10-06
> **回传人**：TraeCode

---

## 〇、一句话结论

**§一 四项小改全部完成、§三 endpoint 已统一；§二 AI 合规抽验实跑两轮——首轮 4/4 模块全 FAIL（证明「prompt 写对 ≠ 模型照做」的担忧成立），按「先改 prompt」修正后第二轮 4/4 模块全 PASS。tsc 零错误，verify 离线三件套全绿。**

---

## 一、§一 四项小改

| # | 要求 | 处理 |
|---|---|---|
| 1.1 | tsx 入 devDependencies（^4.19.0）；verify 去 `npx`；tsc 纳入 verify | 已完成并 `npm install`，verify 现为 `tsc --noEmit && tsx …` |
| 1.2 | 文档化「84°/24° + 门控卦位分离」 | [geo.ts](../../../src/lib/geo.ts) 头部新增 6 行方位体系说明（卦位/门控用途、土仅 24° 的原因、占比不作判据），引用 §8.4.4 |
| 1.3 | 上海 notice 始终可见、非错误样式 | 已自查：CategorySection 无折叠/tab/展开；notice 在候选不足与全局去重后两处生成；样式为琥珀色（amber-50/700/200），渲染条件 `cat.cities.length < 6` |
| 1.4 | test-mychart.mjs（无 2）处置 | 判定为一次性个人复盘脚本（依赖本地 dev server、用例已被 test-regression 覆盖），已删除 |

**§三 endpoint 一致性**：aiGeo、aiZiwei 已改为 `${AI_BASE_URL}/v1/chat/completions`，四模块统一。

---

## 二、★ AI 合规抽验（本轮核心）

### 2.1 首轮真实调用：AI_COMPLIANCE_FAIL（0/4）

这是本轮最有价值的发现——**四个模块的 prompt 前几轮都改了，但模型实测全部不合规**：

| 模块 | 检查结果（首轮） |
|---|---|
| aiAnalysis 批命 | ✗ 免责声明缺失；✗ 「甲午、乙未、戊戌、庚子」干支未溯源 |
| aiHemun 合婚 | ✗ 禁用词「必」；✗ 免责声明缺失；✗ 「甲申、甲辰」干支未溯源 |
| aiGeo 地理 | ✗ 免责声明缺失；✗ 依据分级 0 类 |
| aiZiwei 紫微 | ✗ 免责声明缺失 |

### 2.2 误报甄别（未把测试脚本的错算到模型头上）

在修复前我逐条核对了 prompt 实际给出的事实集，发现 6 个「编造」干支全部是**我的事实集不全导致的误报**：

- 批命甲午/乙未/戊戌/庚子 = **2026 丙午年流月干支**，prompt【流月节奏】已给，脚本事实集漏了流月
- 合婚甲申/甲辰 = **男（2019–2028）、女（2025–2034）当前大运**，prompt「当前大运」已给，脚本事实集漏了大运

已修正脚本事实集后重跑，避免用「模型编造」的错误结论污染评审。**真实违规因此收敛为三项**：① 四模块均缺固定免责短语；② 合婚出现「必」；③ 地理未出现依据分级词。

### 2.3 修复手段（严格按任务书 §2.4「先改 prompt」，未加任何后置过滤）

| 违规 | prompt 修改 |
|---|---|
| 免责缺失 | 四个模块 SYSTEM_PROMPT 各增一条：**overview 板块必须以固定免责语原文收尾**——「以上为命理倾向性分析，仅供参考，非确定性结论，不构成任何…决策依据」（合婚/地理各有专句）。用「必须原文照写」约束模型，而非再泛泛要求「留余地」 |
| 合婚「必」 | aiHemun 新增第 9 条：**全文不得出现「必」字**（含不必/未必，否定用「无须」、推断用「往往、多半」）；并列禁「一定、注定」 |
| 地理依据分级 | aiGeo 第 4 条强化：行文须明确出现「**民俗（方位）**」与「**产品设定（地气）**」字样 |

### 2.4 第二轮真实调用：AI_COMPLIANCE_PASS（4/4）

```
① aiAnalysis 批命（2473 字）:
  ✓ 禁用词 0 命中                ✓ 免责立场（留余地＋免责声明）
  ✓ 大运段分维度 4：事业财运健康六亲
  ✓ 结构病词：被化、孤立、印化、比劫
  ✓ 干支可溯源：戊子 丙午 丁未 戊申 己丑 甲午 乙未 戊戌 庚子 丁亥 丙戌 壬寅
② aiHemun 合婚（1748 字）:
  ✓ 禁用词 0 命中（「必」已消除）  ✓ 免责立场
  ✓ 依据分级 4 类：典籍 古法 民俗 产品设定
  ✓ 无依据混淆                    ✓ 干支可溯源：甲申 甲辰
③ aiGeo 地理（1209 字）:
  ✓ 禁用词 0 命中                  ✓ 免责立场
  ✓ 依据分级 2 类：民俗 产品设定
  ✓ 无依据混淆                    ✓ 无干支
④ aiZiwei 紫微（1737 字）:
  ✓ 禁用词 0 命中                  ✓ 免责立场
  ✓ 干支可溯源：戊戌 丙午 庚子

AI_COMPLIANCE_PASS
```

> 两轮共 8 次真实 API 调用；抽验脚本固定随机抽样的用例（任务书指定命例），未按结果换用例。

---

## 三、最终验收总览

```
npx tsc --noEmit                        → tsc_exit=0
npm run verify（离线）:
  test-geo-accept.mjs                   → GEO_ACCEPT_PASS
  test-wealth-accept.mjs                → WEALTH_ACCEPT_PASS
  test-regression.mjs                   → SELFTEST_PASS
npm run verify:ai（需网络＋额度）:
  test-ai-compliance.mjs                → AI_COMPLIANCE_PASS
```

脚本目录现状：保留 build-geo-cities / build-birth-cities / build-mingli-cases 三个构建脚本，test-geo-accept / test-wealth-accept / test-regression / test-ai-compliance 四个验收脚本，以及 test-apis 与 selftest-hemun 两个更早的既有脚本（本轮未动）。

---

## 四、主动承认的缺项

1. **固定免责语只在 overview 板块**：若用户只读 AI 的「事业财运」等中段板块，仍可能看不到免责声明。没有每段都加，是为避免文案重复；如需每段都带请明示
2. **紫微模块检查项 3/4（依据分级、依据混淆）未对其执行**：紫微 prompt 体系内无典籍/民俗分级设置，脚本按空 opts 跳过；如紫微也需分级，是新增需求
3. test-apis.mjs、selftest-hemun.ts 等更早脚本未纳入 verify，状态未核验
4. AI 输出未做人工通读，本轮结论仅基于 7 项程序化检查（符合任务书要求）

---

## 五、改动文件清单

| 文件 | 改动 |
|---|---|
| `package.json` | tsx 入 devDependencies；verify 串 tsc、去 npx；新增 verify:ai |
| `src/lib/geo.ts` | 头部方位体系说明 6 行 |
| `src/lib/aiAnalysis.ts` | SYSTEM_PROMPT 新增固定免责语规则 |
| `src/lib/aiHemun.ts` | 新增禁「必」规则、固定免责语规则 |
| `src/lib/aiGeo.ts` | endpoint 补 `/v1`；第4条强化民俗/产品设定义样；新增固定免责语规则 |
| `src/lib/aiZiwei.ts` | endpoint 补 `/v1`；新增固定免责语规则 |
| `scripts/test-ai-compliance.mjs` | 新建：4 模块真实调用 + 7 项程序化检查 |
| 删除：`scripts/test-mychart.mjs` | 一次性调试脚本 |
