# HANDOFF-BACK-2028年度总览（回传）

> B 侧（TraeCode）· 2026-10-27 · 第 36 轮
> 对应任务书：`docs/交接记录/36-2028年度总览/HANDOFF-2028年度总览.md`

---

## 一、git diff --stat

```
 package.json                      |   2 +-
 scripts/test-i18n-accept.mjs      |   5 +-
 scripts/test-liunian-year-hub.mjs | 251 ++++++++++++++++++++++++++++++++++++++
 src/app/liunian/2027/page.tsx     |   2 +
 src/app/liunian/2028/page.tsx     | 185 +++++++++++++++++++++++++++++
 src/app/sitemap.ts                |   4 +
 src/app/tw/liunian/2027/page.tsx  |   2 +
 src/app/tw/liunian/2028/page.tsx  | 180 +++++++++++++++++++++++++++++
 src/app/tw/liunian/page.tsx       |   5 +-
 src/app/tw/page.tsx               |   4 +-
 10 files changed, 635 insertions(+), 5 deletions(-)
```

新增 3 个文件（两页 + 一测试），改动 7 个。
`src/lib/demoFatebook.ts` 的未提交改动**不是本轮产物**，未纳入提交（工作区仍有该改动，请 A 侧勿视为本轮 diff）。

**未改动**：`src/lib/shengxiaoData.ts`（数据层零改动，本轮只消费）、`src/components/TaisuiTable.tsx`、`src/lib/hant.ts`、`src/lib/articles.ts`、`src/lib/hant-seo.ts`。

---

## 二、① 数据层计算结果 vs ② 页面渲染结果

### 数据层（`getLiunian(sx, 2028)`，测试脚本原样输出）

```
干支 戊申｜值=猴｜冲=虎｜害=猪｜刑=蛇｜合=鼠、龙｜平=牛、兔、马、羊、鸡、狗
```

### 页面渲染结果（从 `npm run build` 产物 `.next/server/app/liunian/2028.html` 直接摘出）

| 项 | 简体页 | 繁体页 |
|---|---|---|
| 标题 | `2028 戊申年运势总览：猴值、虎冲、猪害、蛇刑怎么看` | `2028 戊申年運勢總覽：猴值、虎沖、豬害、蛇刑怎麼看` |
| 犯太岁分组 | 猴值、虎冲、猪害、蛇刑 | 猴值、虎沖、豬害、蛇刑 |
| 合太岁 | 鼠、龙（2 个） | 鼠、龍（2 个） |
| 无犯 | 牛、兔、马、羊、鸡、狗（6 个） | 牛、兔、馬、羊、雞、狗（6 个） |
| 合+无犯计数 | 8（`HE.length + PING.length` 现算） | 8 |
| 12 属相链接（去重） | 12 | 12 |

**页面上一个生肖字都不是手写的**：分组来自 `FAN.filter((r) => r.ln.relation === rel)`，标题由 `FAN_BY_REL` + `SHENGXIAO` 拼接。测试里有一条硬断言：把 `ARTICLES` 与允许的互链行剔除后，源码中**不允许出现任何生肖字**。

### 发现并修掉的一个繁体误字（测试抓的）

标题初版用 `toHant('冲')` 单独转，得到 **「虎衝」**（衝動的衝）。正确成词是 **「沖太歲」**。改为 `toHant('冲太岁').replace(/太歲$/,'')` 后为 **「虎沖」**，已重新构建确认（见上表）。
测试补了一条断言：繁体页源码出现「衝」即红。

---

## 三、两个日期边界（`lunar-javascript` 实算，非手写）

```
实算：春节 2028-01-26｜立春 2028-02-04 15:31:13
立春边界成立：12:00 = 丁未 / 21:00 = 戊申
```

页面写法（简繁一致）：

> ★ 时间边界有两个，别混用：民俗的过年是 **春节 1 月 26 日（2028-01-26）**（安太岁、生肖轮替按此）；
> 命理的年柱切换是 **立春 2 月 4 日 15:31（2028-02-04）**（排八字按此）。两者相差九天，比往年更明显。
> 立春是**时刻**不是整日——当天 15:31 之前出生仍按丁未年算，之后才是戊申年。

测试⑤对每一页逐项比对 `2028-01-26` / `2028-02-04` / `1 月 26 日` / `2 月 4 日` / `15:31` 五个串，全部命中才算过。

---

## 四、12 条生肖链接

简体：`/shengxiao/{shu,niu,hu,tu,long,she,ma,yang,hou,ji,gou,zhu}/2028`
繁体：`/tw/shengxiao/{同上}/2028`

构建产物中两页**去重后各正好 12 条**（未去重是 72，因为 RSC payload 与 HTML 各出现一遍，属正常）。

---

## 五、牙口两次（均为真实文件篡改 → 跑测试 → 还原）

### 牙口 A：模拟「从 2027 复制后忘改年份」

把两页 `const YEAR = 2028` 改成 `2027`：

```
✗ src/app/liunian/2028/page.tsx YEAR=2027（应为 2028）
✗ src/app/tw/liunian/2028/page.tsx YEAR=2027（应为 2028）
✗ src/app/liunian/2028/page.tsx 仍有 2027 残留：const YEAR = 2027
✗ src/app/tw/liunian/2028/page.tsx 仍有 2027 残留：const YEAR = 2027
A_exit=1
```

还原后：`LIUNIAN_YEAR_HUB_PASS`（exit=0）

### 牙口 B：把分组从「按关系现算」改成写死

把 `FAN.filter((r) => r.ln.relation === rel)` 改成 `=== '害'`：

```
✗ src/app/liunian/2028/page.tsx 分组未按关系现算（可能写死了名单）
LIUNIAN_YEAR_HUB_FAIL
toothB_exit=1
```

还原后：`LIUNIAN_YEAR_HUB_PASS`（restored_exit=0）

---

## 六、验证结果

```
npx tsc --noEmit          → 0
npm run verify            → 0，44 个 *_PASS（既有 43 + LIUNIAN_YEAR_HUB_PASS）
npm run build             → 0，○ /liunian/2028、○ /tw/liunian/2028 均静态预渲染
sitemap 总条数             → 1266（第 35 轮 1264 + 2）
```

`npm run verify` 末尾 10 行：

```
  · tw 首页 2027 + 2028 双入口
  · tw/liunian 入口区含 2028
  · 太岁对照表入口仍在
—— ⑨ 单一来源（繁体由 toHant 派生） ——
  · 繁体页用 toHant 派生生肖名
  · 关系词 toHant 正确（冲→沖）
  · 繁体页无「衝」误字（虎沖而非虎衝）
  · 繁体页用词均为繁体（切简体链接除外）

LIUNIAN_YEAR_HUB_PASS
```

全部 44 个 PASS 标识：

```
CHECKER_ACCEPT_PASS / PRICING_ACCEPT_PASS / SOLAR_TIME_PASS / ENTRY_CONSISTENCY_PASS /
GANZHI_CONSISTENCY_PASS / DAYBOUNDARY_ACCEPT_PASS / DAILY_ACCEPT_PASS / ENTITLEMENT_ACCEPT_PASS /
MEMBER_GRANTS_PASS / MULTICHART_LIMIT_PASS / HISTORY_DAILY_PASS / LEGAL_ACCEPT_PASS /
GEO_ACCEPT_PASS / WEALTH_ACCEPT_PASS / LIUNIAN_ACCEPT_PASS / LIUNIAN_COVERAGE_PASS /
LIUYUE_INDEX_FIX_PASS / FORTUNE_TIER_PASS / REPORTS_ACCEPT_PASS / SITE_AUDIT_PASS /
ENTITLEMENT_GATE_PASS / FATEBOOK_ACCEPT_PASS / SELFTEST_PASS / SHENSHA_ARTICLES_PASS /
LIUNIAN_CACHE_PASS / PROXY_GUARD_PASS / FATEBOOK_ONEPAY_PASS / ENFORCE_GUARD_PASS /
EMAIL_TEMPLATES_PASS / ACCOUNT_AUTH_PASS / ASK_ACCEPT_PASS / RATELIMIT_ACCEPT_PASS /
AIBUDGET_ACCEPT_PASS / LOCALE_ACCEPT_PASS / I18N_ACCEPT_PASS / SHARE_ACCEPT_PASS /
PARTNER_ACCEPT_PASS / INDEXNOW_PATHS_PASS / LIUNIAN_TITLE_PASS / TW_FUNNEL_PASS /
TAISUI_TABLE_PASS / PARTNER_V2_PASS / HANT_TAISUI_PASS / LIUNIAN_YEAR_HUB_PASS
```

### 顺带改的一处既有测试

`scripts/test-i18n-accept.mjs` 的 `/tw` 条目硬编码期望从 `6 + 12 + 12*n` 改为 `7 + ...`（新增一个 `/tw/liunian/2028`），失败文案同步。这是额度计数，不是放宽断言。

---

## 七、红线自查

| 红线 | 结果 |
|---|---|
| 生肖分组由数据层计算，不写死 | ✅ 源码级断言：剔除文章清单/互链后无任何生肖字 |
| 不另写一套生肖关系表 | ✅ `shengxiaoData.ts` 零改动 |
| 两年份都说明（春节 / 立春） | ✅ 逐页断言 5 个串，日期与实算一致 |
| 繁体为派生而非第二份稿 | ✅ 仅 `toHant`（生肖名、关系词），静态文案按台湾用词直接写繁体 |
| 禁词 / 具体金额 / 宫庙专名 | ✅ 两页 0 命中（宫庙检测沿用第 35 轮的「先剥通称」写法） |
| 不动 2027 页的 title/description | ✅ 2027 页各只加 1 行互链（+2 行 diff），未改任何 meta |
| 不加依赖 | ✅ 复用 `lunar-javascript` |
| 不跑格式化 | ✅ 无 `prettier --write` |
| 不新增 AI 调用 | ✅ 纯静态页 |

---

## 八、已知缺口

1. **无 FAQPage schema**：两页的问答式文案（犯太岁四类、两个边界）仍拿不到 Google 富结果。第 35 轮回执已列为缺口，本轮未做（任务书未要求）。
2. **安太岁三篇文章标题仍带 2027**：2028 页链过去时，用户会看到标题写 2027。任务书 §三⑤ 明确允许（安太岁是年度通用民俗），本轮未新增 2028 版文案。
3. **立春时刻精确到分**：页面写 `15:31`，实算 `15:31:13`。刻意取到分，避免假精确；若 A 侧要求秒级，需同步两页。
4. **未做 2029 及以后**：`sitemap` 与页面均只到 2028。生肖年页的年份集合 `LIUNIAN_YEARS` 未动，未来扩年需同时改三处（年页、hub 页、sitemap）。
5. **未做 OG 卡片**：两页只有 title/description，无 `openGraph`（第 35 轮同类缺口）。分享到 Line/FB 的预览仍是默认。
6. **未做 IndexNow 提交**：需 A 侧执行 `npm run seo:indexnow` 或手动在 GSC 请求收录；默认集合不含新增页。

---

## 九、分步提交说明（3 个 commit）

| # | commit | 内容 |
|---|---|---|
| 1 | `feat(liunian): 新增 2028 戊申年运势总览页（简繁）` | 两个 2028 落地页 + 2027 页各一行互链（年份成对） |
| 2 | `feat(seo): 2028 年度页入口收口与 sitemap 收录` | `tw/page.tsx` 双入口、`tw/liunian/page.tsx` 入口区、`sitemap.ts` 两条、`test-i18n-accept.mjs` 计数 |
| 3 | `test(liunian): 2028 年度总览验收脚本 + 回传` | `scripts/test-liunian-year-hub.mjs`、`package.json` verify 挂载、本回传 |

---

## 十、A 侧待办

```
① 复核两个页面的用词（尤其台湾用语：安太歲 / 犯太歲 / 沖太歲 / 屬相）
② npm run seo:indexnow（或 GSC 手动请求收录这 2 个 URL）
③ 观察 2028 生肖页的点击是否向 /liunian/2028 收口（GSC「页面」报告，2–4 周）
```

时间窗口：2028 生肖与流年词的搜索量从**农历新年前 1.5 个月**起量（2027-12 中旬），本页需在那之前被收录。
