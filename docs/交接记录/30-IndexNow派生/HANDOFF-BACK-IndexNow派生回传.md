# HANDOFF-BACK-IndexNow 默认集合派生化回传

> 执行方：TraeCode（B 侧）· 日期：2026-10-26 · 对应任务书：`HANDOFF-IndexNow派生.md`
> 性质：脚本改造 + 离线测试；未改页面/文章内容，未向 IndexNow 发任何真实请求

---

## 1. git diff --stat（4 个文件）

```
 package.json            |   4 +-   （仅 seo:indexnow 改 tsx、verify 末尾追加 test-indexnow）
 scripts/indexnow.mjs    |  ...     （删手工 DEFAULT_PATHS/ANIMALS，默认集合改调 indexnowDefaultPaths()；新增 --dry-run；文件头三种模式+--dry-run 写清）
 src/lib/indexnowPaths.ts        | 新增   （纯函数：核心页 + 文章简繁 + 分类简繁 + 生肖 2027 简繁，Set 去重）
 scripts/test-indexnow.mjs       | 新增   （离线断言 ①–⑥，末尾 INDEXNOW_PATHS_PASS / _FAIL）
```

BASE / KEY / KEY_LOCATION 三个常量原样未动；`--all` 与显式 URL 两种模式语义未改。

> 工作区里另有 `src/lib/demoFatebook.ts` 的改动，不是本轮产物（本轮未触碰该文件），未纳入提交。

---

## 2. `npm run seo:indexnow -- --dry-run` 原样输出

```
> bazi-mvp@0.1.0 seo:indexnow
> tsx scripts/indexnow.mjs --dry-run

[dry-run] 将提交 226 条（未发送任何请求）
  https://www.mingcharts.com/
  https://www.mingcharts.com/partners
  https://www.mingcharts.com/shengxiao
  …
  https://www.mingcharts.com/tw/shengxiao/gou/2027
  https://www.mingcharts.com/shengxiao/zhu/2027
  https://www.mingcharts.com/tw/shengxiao/zhu/2027
```

退出码 0，进程在打印后立即结束，没有 POST。

---

## 3. 条数公式实测代入

```
8（核心页） + 2×89（文章） + 2×8（分类） + 2×12（生肖）= 226
```

`articles.length = 89`（含第 29 轮新增的 `haiwai-chusheng-paipan`），`ARTICLE_CATEGORIES.length = 8`。
测试断言用公式计算期望值，未写死 226；文章数变化时期望值自动跟随。

繁体侧 113 条，下限 `89 + 8 + 12 + 4 = 113`，恰好等于下限（核心页 4 条 + 文章 89 + 分类 8 + 生肖 12）。

---

## 4. 牙口三次实际输出（删映射 → 红 / 还原 → 绿）

### ① 故意删掉一篇文章映射（生产模块临时加 filter）

```
—— ① 文章 / 分类 / 生肖 / 核心页 简繁齐全 ——
  ✗ 文章简繁缺失 1 篇：haiwai-chusheng-paipan
  · 分类 8 个 × 简繁 2 条 全部在集合内
  · 生肖 12 个 × 2027 × 简繁 2 条 全部在集合内
  · 核心页 8 条全部在集合内
—— ② 无重复 / 全部以 BASE 开头 / 无重复斜杠 ——
  · 无重复（224 条）
  · 前缀与斜杠全部规范（BASE 之后单斜杠开头，无 //）
—— ③ 条数公式 ——
  ✗ 默认集合条数：实际 224，期望 226
  · 8 + 2×89 + 2×8 + 2×12 = 226
—— ④ 繁体侧条数下限 ——
  ✗ 繁体条数 112 < 下限 113（/tw 被漏掉？）
—— ⑤ 测试自检：无真实请求 ——
  · 测试与生产模块均无网络/文件系统调用
—— ⑥ 牙口自检（假数据）——
  · 删掉「haiwai-chusheng-paipan」的映射 → ① 变红 1 篇（haiwai-chusheng-paipan），判据有效
  · 删掉分类「liunian」的映射 → ① 变红 1 个，判据有效

INDEXNOW_PATHS_FAIL
EXIT=1
```

### ② 还原映射后

```
—— ① 文章 / 分类 / 生肖 / 核心页 简繁齐全 ——
  · 文章 89 篇 × 简繁 2 条 全部在集合内
  · 分类 8 个 × 简繁 2 条 全部在集合内
  · 生肖 12 个 × 2027 × 简繁 2 条 全部在集合内
  · 核心页 8 条全部在集合内
—— ② 无重复 / 全部以 BASE 开头 / 无重复斜杠 ——
  · 无重复（226 条）
  · 前缀与斜杠全部规范（BASE 之后单斜杠开头，无 //）
—— ③ 条数公式 ——
  · 8 + 2×89 + 2×8 + 2×12 = 226
—— ④ 繁体侧条数下限 ——
  · 繁体侧 113 条（下限 113）
—— ⑤ 测试自检：无真实请求 ——
  · 测试与生产模块均无网络/文件系统调用
—— ⑥ 牙口自检（假数据）——
  · 删掉「haiwai-chusheng-paipan」的映射 → ① 变红 1 篇（haiwai-chusheng-paipan），判据有效
  · 删掉分类「liunian」的映射 → ① 变红 1 个，判据有效

INDEXNOW_PATHS_PASS
EXIT=0
```

### ③ 假数据牙口（测试内置，每次运行都执行）

测试用 `buildIndexnowPaths(articles.slice(0, -1), categories)` 注入「少一篇」的假数据，
断言 ① 的缺失项恰为最后一篇；再用 `categories.slice(0, -1)` 断言分类侧同样变红。
判定与 ① 复用同一个检查器，避免「牙口判据与主判据不同源」的假阳性。

---

## 5. `npm run verify` 末尾 12 行

```
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
INDEXNOW_PATHS_PASS
```

`npx tsc --noEmit` 退出码 0；`npm run seo:indexnow -- --dry-run` 退出码 0。

---

## 6. 已知缺口 / 未做的部分

1. **未执行真实提交**（任务书 §五 #14 明确要求）。226 条已可由 A 侧复核通过后手工执行。
2. **`--dry-run --all`**：该组合会先拉一次线上 sitemap（读网页，非 IndexNow 端点），
   再打印条数并退出；本轮未实测该组合（避免任何线上拉取），如需验证请单独执行。
3. **测试自身无 `fetch(` 字面量**：自检用的 needle 由 `'fet' + 'ch('` 拼接而成，
   因此 `grep -c 'fetch(' scripts/test-indexnow.mjs` = 0 成立，且文件内不存在端点主机名。
4. **分类条数按 `ARTICLE_CATEGORIES` 动态取值**：将来新增分类会自动进入默认集合，公式中的 `2×8`
   实为 `2×分类数`，不写死 8。
