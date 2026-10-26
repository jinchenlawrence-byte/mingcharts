# HANDOFF-流年页标题退化修复

> **给执行方**：TraeCode（B 侧）
> **签发**：DeepSeek 侧（A 侧）· **日期**：2026-10-23 · **轮次**：32
> **性质**：缺陷修复 + 单一来源收敛（消灭简繁两份手写映射）
> **交付后**：A 侧复核并出 `REPLY-流年页标题退化复核.md`
> **上线后**：A 侧执行 `npm run seo:indexnow` 通知这 90 个页面的标题变更

---

# 〇、缺陷是什么（GSC 实测发现）

24 小时 GSC 数据里，繁体页第一次拿到点击，其中一条是 `/tw/shengxiao/ma/2029`。
点开它的 SERP 标题一看：

```
2029年屬馬運勢詳解：運勢，事業財運感情健康全解
              ↑↑↑↑ 冒号后面本该是「合太歲 / 害太歲」这类判断，退成了一个空词
```

根因（两处，**一模一样的错**）：

```ts
// src/app/shengxiao/[animal]/[year]/page.tsx:23          简体
const taiSuiWord = { '值':'本命年值太岁', '冲':'冲太岁', '害':'害太岁', '刑':'刑太岁', '合':'合太岁', '平':'运势' }[ln.relation]

// src/app/tw/shengxiao/[animal]/[year]/page.tsx:42       繁体（手写的第二份）
const taiSuiWord = { '值':'本命年值太歲', '冲':'沖太歲', '害':'害太歲', '刑':'刑太歲', '合':'合太歲', '平':'運勢' }[ln.relation]
```

`'平'`（该生肖与流年太岁无 值/冲/害/刑/合）这条分支的词，被写成了「运势」本身。

**影响面（A 侧已算）：**

```
年份 2024–2031 × 12 生肖 = 96 页/单语
其中 relation === '平' 的 45 页 = 47%
简繁合计 90 个页面在卖坏标题
```

★ 这些正是当前最有流量的页面类型（2028/2029 未来年份在吃点击），所以修它性价比最高。

**连带问题**：`keywords` 里拼的是 `${year}年${taiSuiWord}`，`'平'` 页会生成
`2029年运势` 这种废词。

---

# 一、先读这 5 条

```
1. src/app/shengxiao/[animal]/[year]/page.tsx 第 18-40 行（generateMetadata + 那份简体映射）
2. src/app/tw/shengxiao/[animal]/[year]/page.tsx 第 36-56 行（同逻辑的繁体手写副本）
3. src/lib/hant.ts 第 85-100 行（HANT_TAISUI / hantTaiSui —— 项目已有的「关系→繁体」单一来源）
4. src/lib/shengxiaoData.ts 的 getLiunian —— ln.relation 的取值只有 值/冲/害/刑/合/平 六种
5. scripts/test-shensha-articles.mjs —— 抄一个"遍历全量数据做断言"的测试结构
```

---

# 二、第一步：把映射收敛成单一来源

**问题不只是词写错了，更严重的是简繁两份手写映射各写一遍**——
本次缺陷在两边同时存在，正是这种重复的必然结果。

在 `src/lib/shengxiaoData.ts` 里新增（**只加导出，不动任何既有数据**）：

```ts
/** 太岁关系 → 简体标题用词（唯一来源；繁体由 hantTaiSui/toHant 派生，不许手写第二份） */
export const TAISUI_TITLE_WORD: Record<string, string> = {
  '值': '本命年值太岁',
  '冲': '冲太岁',
  '害': '害太岁',
  '刑': '刑太岁',
  '合': '合太岁',
  '平': '平顺之年',   // ★ 本轮修复：原为 '运势'（退化成「运势详解：运势」）
}

/** 太岁关系 → keywords 用词（与标题词分开：'平顺之年' 不适合当关键词） */
export const TAISUI_KEYWORD_WORD: Record<string, string> = {
  ...TAISUI_TITLE_WORD,
  '平': '流年运势',
}
```

**两个路由页面改成从这里取**：

```
简体页：const taiSuiWord = TAISUI_TITLE_WORD[ln.relation]
繁体页：const taiSuiWord = toHant(TAISUI_TITLE_WORD[ln.relation])   // 或复用 hantTaiSui 的结果
```

★ 繁体侧**禁止再写一份繁体字面量映射**。若 `toHant('平顺之年')` 得到 `平順之年`（预期如此），就用它；
若转换有偏差，改 `lib/hant.ts` 的 `PROTECTED_TERMS` / 后处理，**不许在页面里手写例外**。

**keywords 同步**：

```
旧：`${year}年${taiSuiWord}`
新：`${year}年${TAISUI_KEYWORD_WORD[ln.relation]}`（关系为平时得「2029年流年运势」）
```

---

# 三、第二步：确认标题长度不超限

修改前：`2029年属马运势详解：运势，事业财运感情健康全解`（24 字）
修改后：`2029年属马运势详解：平顺之年，事业财运感情健康全解`（26 字）

要求：**标题主体（不含「 | 明理」后缀）≤ 30 字**。逐页断言，超限即判红。
若确实超限，把 `'平'` 换成 4 字以内的备选（`太岁无犯`），但必须仍能表达"无刑冲害合"的意思，
且**不要用「平稳」「平常」这类没有信息量的词**。

---

# 四、第三步：新增离线测试 `scripts/test-liunian-title.mjs` 并挂进 verify

断言（全部离线，只看数据与标题生成规则）：

```
① 遍历 96 页 × (简/繁)：标题不含退化串
   简体禁止出现：「运势详解：运势」
   繁体禁止出现：「運勢詳解：運勢」
② 45 个 relation==='平' 的页：标题冒号后必须是 TAISUI_TITLE_WORD['平']（简）/ 其繁体（繁）
③ keywords：45 个 '平' 页不得出现 `${year}年运势` / `${year}年運勢` 这种废词
④ 长度：所有 96 页标题主体 ≤ 30 字（简繁分别算）
⑤ 回归：非 '平' 关系（值/冲/害/刑/合）的标题用词与修复前逐字一致
   （做法：把期望词表在测试里写死为「值→本命年值太岁 …」，逐页比对）
⑥ 单一来源：两个路由页面源码里**不许**再出现 `'平': '运势'` / `'平': '運勢'` 字面量
   （正则扫两个 page.tsx，命中即红）
⑦ 简繁一致：繁体侧标题必须等于 toHant(简体侧标题)（逐页比对，防手工漂移）
```

末尾 `LIUNIAN_TITLE_PASS` / `LIUNIAN_TITLE_FAIL`，挂到 `package.json` 的 `verify` **末尾追加**。

---

# 五、必须避免（红线）

```
✗ 不许改 shengxiaoData.ts 里已有的 LiunianAnalysis 数据（只许新增两个导出常量）
✗ 不许在繁体路由里手写第二份繁体映射（这是本次缺陷的成因）
✗ 不许改 description 的生成逻辑（它用 ln.relationText，本来就是对的）
✗ 不许改页面正文、不许改样式、不许改路由
✗ 不许用「平稳」「平常」「无特别」这类没有信息量的词替代
✗ 不许改标题模板的其余部分（「运势详解：」「，事业财运感情健康全解」保持原样）
✗ 不许把测试挂进 verify 以外的位置，也不许放进 verify 中间
✗ 不许跑格式化工具
```

---

# 六、验收标准（A 侧逐条复核）

| # | 断言 | 判定方式 |
|---|---|---|
| 1 | 改动文件恰好 5 个 | `src/lib/shengxiaoData.ts`、`src/app/shengxiao/[animal]/[year]/page.tsx`、`src/app/tw/shengxiao/[animal]/[year]/page.tsx`、`scripts/test-liunian-title.mjs`（新）、`package.json` |
| 2 | 简繁两份手写映射已消失 | 两个 page.tsx 内 `'平': '运势'` / `'平': '運勢'` 均搜不到 |
| 3 | 导出两个常量 | `TAISUI_TITLE_WORD['平'] === '平顺之年'`；`TAISUI_KEYWORD_WORD['平'] === '流年运势'` |
| 4 | **90 个页面标题全部修好** | 离线遍历断言 + 线上抽样 |
| 5 | 非「平」页标题零变化 | 测试 ⑤ 逐页比对 |
| 6 | 标题主体 ≤ 30 字（简繁） | 测试 ④ |
| 7 | 繁体标题 == toHant(简体标题) | 测试 ⑦ |
| 8 | 测试挂进 verify 且全 PASS | `npm run verify` 出现 `LIUNIAN_TITLE_PASS`，且原有 38 个 `*_PASS` 一个不少 |
| 9 | `npx tsc --noEmit` | 退出码 0（**同时看 `$LASTEXITCODE`**，别只看输出） |
| 10 | 线上抽样 4 页标题正确 | `/tw/shengxiao/ma/2029`（原坏页）等，实测应为「平順之年」 |
| 11 | 牙口 | 回执贴「把 '平顺之年' 改回 '运势' → 测试红 → 还原 → 绿」的实际输出 |

---

# 七、回执要求

```
文件：docs/交接记录/32-流年页标题退化/HANDOFF-BACK-流年页标题退化回传.md
1. git diff --stat（5 个文件）
2. 修复前后标题对照（至少 3 个 relation==='平' 的页，简繁各一）
3. 90 页的断言结果（测试输出的汇总行）
4. 非「平」页零变化的证明（测试 ⑤ 输出）
5. 牙口三次输出（改回坏词 → 红 / 还原 → 绿）
6. npm run verify 末尾 6 行 + tsc 退出码
7. 线上抽样 4 页实际 title（部署后轮询，最多 5 次）
8. 已知缺口
```

---

# 八、上线之后（A 侧动作）

部署完成后由 A 侧执行：

```
npm run seo:indexnow            # 默认集合含这 90 页，通知标题变更
```

**你不需要发提交请求。**
