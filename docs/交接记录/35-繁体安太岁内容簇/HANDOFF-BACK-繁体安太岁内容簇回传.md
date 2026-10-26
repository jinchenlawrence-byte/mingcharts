# HANDOFF-BACK · 第 35 轮 繁体「安太岁」内容簇

> 执行方：TraeCode（B 侧）　签发：DeepSeek 侧（A 侧）　完成：2026-10-27
> 回执对应任务书：`HANDOFF-繁体安太岁内容簇.md`

---

## 一、git diff --stat（3 个提交，`1302fe6..a258adf`）

```
 package.json                                  |   2 +-
 scripts/test-hant-taisui-accept.mjs           | 271 ++++++++++++++++++++++++++
 scripts/test-i18n-accept.mjs                  |   5 +-
 src/app/liunian/2027/page.tsx                 | 167 ++++++++++++++++
 src/app/liunian/taisui-biao/page.tsx          |   3 +
 src/app/shengxiao/[animal]/[year]/page.tsx    |   5 +
 src/app/sitemap.ts                            |   4 +
 src/app/tw/article/[slug]/page.tsx            |   2 +-
 src/app/tw/liunian/2027/page.tsx              | 161 +++++++++++++++
 src/app/tw/liunian/taisui-biao/page.tsx       |   3 +
 src/app/tw/shengxiao/[animal]/[year]/page.tsx |   7 +
 src/components/TaisuiTable.tsx                |   6 +-
 src/lib/articles.ts                           | 223 +++++++++++++++++++++
 src/lib/relatedArticles.ts                    |   4 +
 14 files changed, 857 insertions(+), 6 deletions(-)
```

**全部在白名单内**（articles.ts / 两个 2027 页 / TaisuiTable / relatedArticles / sitemap /
新测试 / package.json / test-i18n 期望值 / 四处内链页）。

`src/lib/demoFatebook.ts` 的改动是工作区既有未提交内容，**不是本轮产物，未纳入提交**。

### 分步提交（A 侧可分步复核）

| commit | 内容 |
|---|---|
| `28b568c` | 三篇文章入 `articles.ts` + `cta.hantHref` 字段 + `LIUNIAN_ARTICLE_SLUGS` 收录 |
| `f35de39` | 两个 2027 落地页 + `TaisuiTable.focusYear` + 四处内链 + sitemap + i18n 期望值 |
| `a258adf` | `test-hant-taisui-accept.mjs` + 挂进 verify |

---

## 二、三篇的标题、字数、各段字数

| slug | 标题 | 总字数 | 段数 | 段长范围 |
|---|---|---|---|---|
| `2027-an-taisui-zenme-zuo` | 2027 安太岁怎么做：时间、流程、供品与常见误解 | **1692** | 22 | 68–80 |
| `2027-fan-taisui-shengxiao` | 2027 犯太岁生肖一次看：羊值、牛冲、鼠害、狗刑 | **1828** | 27 | 60–81 |
| `an-taisui-yao-zhunbei-shenme` | 安太岁要准备什么：一份可照着做的清单 | **1675** | 25 | 60–72 |

各段逐段字数（按正文段落顺序）：

```
2027-an-taisui-zenme-zuo
  80,74,68,77,78,75,74,75,75,75,77,74,70,74,71,74,77,77,71,77,74,68

2027-fan-taisui-shengxiao
  64,66,71,81,65,72,74,63,62,64,60,62,65,65,65,67,61,70,70,60,61,68,61,63,72,65,62

an-taisui-yao-zhunbei-shenme
  65,66,63,64,63,64,65,61,66,63,68,72,68,61,69,64,62,66,64,62,69,60,65,67,62
```

★ 三篇均为**简体正文**入库，繁体由 `toHant` 派生（`articles.ts` 内无任何繁体专有字，
测试 ⑩ 有断言）。分类均为 `liunian`。

---

## 三、2027 生肖点名的核对表（文中写 × 数据层输出）

数据源：`getLiunian(sx, 2027).relation`（唯一事实源，落地页不另写一套关系表）

| 生肖 | 文中写的 | getLiunian 输出 | 一致 |
|---|---|---|---|
| 羊 | 值太岁（本命年） | 值 | ✅ |
| 牛 | 冲太岁 | 冲 | ✅ |
| 鼠 | 害太岁 | 害 | ✅ |
| 狗 | 刑太岁 | 刑 | ✅ |
| 马 | 合（与未六合） | 合 | ✅ |
| 兔 | 合（亥卯未三合） | 合 | ✅ |
| 猪 | 合（亥卯未三合） | 合 | ✅ |
| 虎 / 龙 / 蛇 / 猴 / 鸡 | 无犯（平稳） | 平 | ✅ |

犯太岁总数 = 4（值/冲/害/刑 各一），合 = 3，平 = 5。测试 ② 逐只比对，**错一只即红**。

★ 落地页的四类分组、合/无犯分组，全部由 `SHENGXIAO.map(...getLiunian)` 现算，
不存在「页面写死一份、数据层另一份」的双份维护。

---

## 四、红线扫描输出

```
—— ⑤b 三篇红线扫描 ——
  · 2027-an-taisui-zenme-zuo 红线 0 命中（分类/免责/禁词/金额/宫庙）
  · 2027-fan-taisui-shengxiao 红线 0 命中（分类/免责/禁词/金额/宫庙）
  · an-taisui-yao-zhunbei-shenme 红线 0 命中（分类/免责/禁词/金额/宫庙）
```

| 项 | 判定 | 结果 |
|---|---|---|
| 分类 | `category === 'liunian'` | 3/3 |
| 免责 | 含「民俗」+「仅供参考」 | 3/3 |
| 禁词 | 「一定 / 必然 / 注定 / 必得」 | 0 命中 |
| 金额 | `\d+\s*(元\|块\|塊\|NT\$\|台幣)` | 0 命中 |
| 宫庙 | 剔除通称后仍出现「宫/庙/廟/寺」 | 0 命中 |

★ 宫庙判据的实现说明：先用通称白名单（庙宇/宫庙/庙方/寺庙/原庙/庙请示…）剥离，
剩下的「宫/庙/廟/寺」字才可能是专名。初版直接正则匹配误判了「庙宇在…」「回原庙请示」
两次，改为「剥离通称后按字符判定」后稳定。这个判据宁可误报通称（已被白名单覆盖，
会显性报错），也不会漏掉真正的专名。

三篇文末免责原文（简体）：
`以上为民俗做法整理，仅供参考，不构成任何决策依据。各庙规定与年份安排不同，……`

---

## 五、内链清单（双向都列）

**文章 → 落地页**
- 三篇文末 CTA 均指向 `/liunian/2027`，并带 `cta.hantHref = '/tw/liunian/2027'`
- 繁体文章页 `/tw/article/[slug]` 按 `hantHref` 跳转（缺省沿用 `href`，既有文章行为不变）

**落地页 → 文章**
- `/liunian/2027` 与 `/tw/liunian/2027` 各列出三篇（简体 → `/article/<slug>`，繁体 → `/tw/article/<slug>`）

**落地页 ↔ 12 个生肖年页**
- 落地页两份都逐只列出 12 个属相的 2027 页（统一由 `SHENGXIAO.map` 渲染，不是手写 12 行）
- 反向：`shengxiao/[animal]/[year]` 与 `tw/shengxiao/[animal]/[year]` 在 `yearNum === 2027` 时
  增加落地页入口（其余 7 个年份的 title/description 与内链**未改动**）

**太岁对照表 → 落地页**
- `/liunian/taisui-biao` 与 `/tw/liunian/taisui-biao` 各新增一行 2027 落地页入口

**延伸阅读池**
- `LIUNIAN_ARTICLE_SLUGS` 增收三篇（流年页的「延伸閱讀」可推荐到它们）

---

## 六、sitemap 新增 8 条实际 URL

```
https://www.mingcharts.com/liunian/2027
https://www.mingcharts.com/tw/liunian/2027
https://www.mingcharts.com/article/2027-an-taisui-zenme-zuo
https://www.mingcharts.com/tw/article/2027-an-taisui-zenme-zuo
https://www.mingcharts.com/article/2027-fan-taisui-shengxiao
https://www.mingcharts.com/tw/article/2027-fan-taisui-shengxiao
https://www.mingcharts.com/article/an-taisui-yao-zhunbei-shenme
https://www.mingcharts.com/tw/article/an-taisui-yao-zhunbei-shenme
```

落地页 2 条写在 `sitemap.ts` 里（priority 0.9 / monthly）；文章 6 条由既有「遍历 articles」
逻辑自动纳入，未手写。sitemap 总条数 1264，8 条逐条验证命中。

**hreflang**：两版落地页都调 `hantAlternates('/liunian/2027')`，互指同一组 hreflang；
canonical 各指自身（简 `/liunian/2027`、繁 `/tw/liunian/2027`）。

---

## 七、verify 末尾 8 行 + tsc + build

```
—— ⑩ 单一来源（不写第二份繁体正文） ——
  · 繁体文章正文由 toHant 派生
  · articles.ts 只存简体正文
—— ⑪ 牙口自检（狗刑→狗害 必须判红） ——
  · 真数据（狗刑）判绿
  · 篡改（狗害）判红 —— 判据有效

HANT_TAISUI_PASS
```

- `npx tsc --noEmit` → `TSC_EXIT=0`
- `npm run verify` → `VERIFY_EXIT=0`，**43 个 `*_PASS`**（既有 42 + `HANT_TAISUI_PASS`），
  末尾依次为 `LIUNIAN_TITLE_PASS` / `TW_FUNNEL_PASS` / `TAISUI_TABLE_PASS` / `PARTNER_V2_PASS` / `HANT_TAISUI_PASS`
- `npm run build` → `BUILD_EXIT=0`，`/liunian/2027` 与 `/tw/liunian/2027` 均静态预渲染

---

## 八、牙口红绿输出

**改动点**：`src/lib/shengxiaoData.ts` 第 282 行 `relation = '刑'` → `'害'`（把「狗刑」写成「狗害」）

红色（篡改后）：
```
—— ② 2027 太岁关系（事实源） ——
  ✗ 关系不符：gou 应 刑 实 害
  ✗ 牙口失效：真数据未被判为「刑」
HANT_TAISUI_FAIL
EXIT=1
```

绿色（还原后）：
```
HANT_TAISUI_PASS
EXIT=0
```

★ 两次牙口都同时命中「数据层断言」与「脚本自身牙口自检」，说明这条断言不是靠
比对字符串通过，而是真的从 `getLiunian` 现算。

---

## 九、已知缺口

1. **12 个生肖年页的 2027 文案没做台湾用词本地化**——本轮按红线只加内链、不动 title/description；
   那 96 个页面的用词仍是简体口径（经 toHant 转字，但不是台湾语感）。
2. **关键词覆盖有限**：三篇覆盖「安太岁怎么做 / 犯太岁生肖 / 要准备什么」，
   未做「安太歲費用」「點光明燈」「謝太歲」等独立长尾页。
3. **无 FAQPage 结构化数据**。落地页的问答式内容没有标成 schema，Google 富结果暂拿不到。
4. **宫庙判据是启发式**：通称白名单需要随文案增长维护，出现新的通称写法会误报（会显性报错，不会静默通过）。
5. **`cta.hantHref` 只影响本轮三篇**，历史文章的繁体 CTA 仍可能落到简体页（既有行为，未改）。
6. **线上未验证**：本轮只做本地 tsc/verify/build，尚未跑 IndexNow 与 GSC。

---

## 十、上线后建议（对应任务书 §九）

```
① npm run seo:indexnow（默认集合不含新页，需显式提交这 8 条）
② GSC 网址检查 8 个 URL
③ 11/15 前完成，11/20 看一次曝光；若仍无曝光，改标题不加页面
```

★ 硬截止 11/15 —— 台湾「安太歲」搜索高峰从 12 月中起，内容必须先被收录。
