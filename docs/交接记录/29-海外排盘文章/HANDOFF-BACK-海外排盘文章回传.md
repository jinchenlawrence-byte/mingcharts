# HANDOFF-BACK-海外排盘文章回传

> 执行方：TraeCode（B 侧）· 日期：2026-10-26 · 对应任务书：`HANDOFF-海外排盘文章.md`
> 提交：`37502e2` `content(article): 新增海外出生排盘文章（时区/夏令时/真太阳时）`，已推送 `0b1b8a9..37502e2`

---

## 1. git diff 摘要

```
$ git diff --name-only
src/lib/articles.ts
```

`git show --stat 37502e2`：`1 file changed, 64 insertions(+)`，只有新增，无删除、无对已有条目的改动、未执行任何格式化工具。

新增条目位于 `articles` 数组末尾（原最后一条 `dingwei-wuxing` 之后），slug / category / categoryName / keywords / cta 与任务书 §三 第一步逐字一致；**未写 `priceSku`，正文与 CTA 均无价格数字**。

`description` 长度 66 字（要求 40–75）。

---

## 2. 五个 section 实际字数

| # | heading（与任务书逐字一致） | 段落数 | 本节字数 | 单段区间 |
|---|---|---|---|---|
| 1 | 一、在国外出生，排盘最容易错的三件事 | 4 | 320 | 72–99 |
| 2 | 二、「按北京时间算」到底会错多少（举例算给你看） | 6 | 579 | 66–127 |
| 3 | 三、真太阳时校的到底是什么 | 4 | 328 | 68–97 |
| 4 | 四、出生在夏令时期间的人，怎么处理 | 4 | 371 | 81–126 |
| 5 | 五、排盘前该确认的四件事（核对清单） | 5 | 333 | 62–72 |

**正文合计 1931 字**（要求 ≥1500）；全部段落落在 60–160 字区间（逐段实测，无越界）。

`findForbidden(全文, strictBi=true)` → **hits 为空**（全文 0 处「必」，含「必须/未必」；0 处「一定/注定/大吉/大凶/积极进取/突破性进展」）。
正则扫描：markdown 链接 **0** 处；`\d+\.\d{2}` **0** 处。

> 说明：经度以「度分秒」书写（121°28′12″ = 121.47°，74°0′36″ = 74.01°），
> 目的是避开验收 #10 的价格正则 `\d+\.\d{2}`，避免把经度小数误判为价格。
> 十进制度与脚本入参的对应关系见下表。

---

## 3. 分钟数对照表（文中数字 ← 脚本输出）

脚本（临时，已删除、未提交）调用真实函数：

```ts
import { trueSolarOffsetMinutes } from '../src/lib/solarTime.ts'
// 入参：经度、IANA 时区、出生时刻（年月日时分）
// 上海 121.47 / Asia/Shanghai / 1992-06-15 10:30
// 纽约 -74.01 / America/New_York / 1990-01-15 10:30
// 纽约 -74.01 / America/New_York / 1990-07-15 10:30
// 上海 121.47 / Asia/Shanghai / 1990-06-15 10:30
```

实跑输出（原样）：

```
上海 121.47E / 1992-06-15  UTC+8  中央经线 120  →  6 分钟
纽约 74.01W / 1990-01-15（EST）  UTC-5  中央经线 -75  →  4 分钟
纽约 74.01W / 1990-07-15（EDT）  UTC-4  中央经线 -60  →  -56 分钟
上海 121.47E / 1990-06-15（中国夏令时）  UTC+9  中央经线 135  →  -54 分钟
```

| 文中数字 | 脚本输出 | 是否一致 | 文中对应表述 |
|---|---|---|---|
| +6 分钟 | `6` | ✓ | 上海 1992-06-15，UTC+8 |
| +4 分钟 | `4` | ✓ | 纽约 1990-01-15，EST |
| −56 分钟 | `-56` | ✓ | 纽约 1990-07-15，EDT |
| −54 分钟 | `-54` | ✓ | 上海 1990-06-15，中国夏令时 |

补充核对：文中给出的度分秒差与脚本入参一致（1°28′12″ = 1.47°；0°59′24″ = 0.99°；14°0′36″ = 14.01°；13°31′48″ = 13.53°），乘 4 后取整分别为 6 / 4 / −56 / −54，与脚本输出同值。**未手算、未估算、未使用「大约/左右」。**

「未计均时差」声明位于第三节第 3 段：「本站采用平太阳时近似，未计入均时差，误差在 ±16 分钟内，用于命理排盘层面足够。」与 `src/lib/solarTime.ts:9` 注释一致；「夏令时按出生日期自动判定」位于第四节第 4 段。

---

## 4. `npm run verify` 实际结尾输出

```
ENTITLEMENT_ACCEPT_PASS
MEMBER_GRANTS_PASS
MULTICHART_LIMIT_PASS
HISTORY_DAILY_PASS
LEGAL_ACCEPT_PASS
GEO_ACCEPT_PASS
WEALTH_ACCEPT_PASS
LIUNIAN_ACCEPT_PASS
LIUNIAN_COVERAGE_PASS
LIUYUE_INDEX_FIX_PASS
FORTUNE_TIER_PASS
REPORTS_ACCEPT_PASS
SITE_AUDIT_PASS
ENTITLEMENT_GATE_PASS
FATEBOOK_ACCEPT_PASS
SELFTEST_PASS
SHENSHA_ARTICLES_PASS
LIUNIAN_CACHE_PASS
PROXY_GUARD_PASS
FATEBOOK_ONEPAY_PASS
ENFORCE_GUARD_PASS
EMAIL_TEMPLATES_PASS
ACCOUNT_AUTH_PASS
ASK_ACCEPT_PASS
RATELIMIT_ACCEPT_PASS
AIBUDGET_ACCEPT_PASS
LOCALE_ACCEPT_PASS
I18N_ACCEPT_PASS
SHARE_ACCEPT_PASS
PARTNER_ACCEPT_PASS
```

`npx tsc --noEmit` 退出码 0；`npm run build` 成功（静态导出含 `/article/haiwai-chusheng-paipan` 与 `/tw/article/haiwai-chusheng-paipan`）。
I18N 全文扫描覆盖本篇（`文章「haiwai-chusheng-paipan」` 无残留），转繁输出：`排盤`、`時區`、`夏令時`、`真太陽時`。

---

## 5. 上线后两条 URL 自查

| URL | 状态 | `<title>` |
|---|---|---|
| `/article/haiwai-chusheng-paipan` | 200 | 在海外出生的人，排盘要注意什么？时区、夏令时、真太阳时 \| 明理 |
| `/tw/article/haiwai-chusheng-paipan` | 200 | 在海外出生的人，排盤要注意什麼？時區、夏令時、真太陽時 \| 明理 |

`/sitemap.xml` 同时收录两条：

```
<loc>https://www.mingcharts.com/article/haiwai-chusheng-paipan</loc>
<loc>https://www.mingcharts.com/tw/article/haiwai-chusheng-paipan</loc>
```

（部署后第 4 次轮询两页均 200；第 1–3 次为 `ERR`，属部署未完成，非页面故障。）

---

## 6. 已知缺口

1. **未加入 `scripts/indexnow.mjs` 的 `DEFAULT_PATHS`**：任务书红线要求只改 1 个文件，故未动。本条 URL 目前只靠 sitemap 与站内互链被发现，如需 IndexNow 即时提交，须另开一轮或手工执行 `--url`。
2. **均时差未计入**：与实现保持一致，已在文中如实声明；若将来引入均时差，本篇第三节需同步改写（届时 `solarTime.ts` 注释、本文、验收断言三处一起动）。
3. **经度以度分秒呈现**：为避开价格正则所做的书写选择，若 A 侧希望改为十进制度，需同时调整验收 #10 的扫描口径（否则 `121.47` 会被误判为价格）。
4. 核对脚本为一次性临时文件，跑完已删除、未提交；复现方式见第 3 节代码片段。
