# HANDOFF-IndexNow 死链修复与在线校验

> **给执行方**：TraeCode（B 侧）
> **签发**：DeepSeek 侧（A 侧）· **日期**：2026-10-23 · **轮次**：31
> **性质**：缺陷修复（1 行数据）+ 新增**在线**校验脚本（opt-in，不进 verify）
> **前置**：第 30 轮已提交并复核（`b444d45`），复核结论「需修」，见
> `docs/交接记录/30-IndexNow派生/REPLY-IndexNow派生复核.md`

---

# 〇、背景：缺陷以 A 侧任务书为根因

第 30 轮把 IndexNow 默认集合改成从文章库派生，离线测试全绿（38 PASS，牙口四路联动）。

但 A 侧做了一次**线上交叉核对**（把默认集合与线上 sitemap 求差集），发现：

```
❌ 不在 sitemap 里的 URL: 1
   https://www.mingcharts.com/tw/liunian      → 实测 404
```

根因：A 侧在任务书 §三 的「核心页 8 条」里写了 `/tw/liunian`，
但繁体侧根本没有流年索引页（只有 `/shengxiao` 与 96 个 `/tw/shengxiao/<animal>/<year>`）。

**离线测试结构上不可能发现这类错误**——它只能验路径形态，验不了"线上是否存在"。
所以本轮做两件事：修那一行，并把在线核对固化成脚本。

---

# 一、先读这 4 条

```
1. src/lib/indexnowPaths.ts 第 22-25 行（CORE_PATHS）与第 35-53 行（buildIndexnowPaths）
2. scripts/test-indexnow.mjs 第 55-58 行（核心页断言）、第 78-93 行（③ 条数公式、④ 繁体下限）
3. scripts/indexnow.mjs 全文（64 行）—— 本轮只在文件头用法区加一行，不动逻辑
4. package.json 的 scripts 段 —— 本轮只增一个键，不动其他
```

---

# 二、第一步：修死链（3 处联动，缺一即红）

```
① src/lib/indexnowPaths.ts 的 CORE_PATHS：删掉 '/tw/liunian'
   → 核心页从 8 条变 7 条
② scripts/test-indexnow.mjs 的核心页断言数组同步删掉 '/tw/liunian'
③ scripts/test-indexnow.mjs 的条数公式：8 → 7
④ scripts/test-indexnow.mjs 的繁体侧下限：+4 → +3
```

**改完的期望值**：

```
7 核心 + 2×89 文章 + 2×8 分类 + 2×12 生肖 = 7 + 178 + 16 + 24 = 225
繁体侧 = 3 + 89 + 8 + 12 = 112
```

★ **不许**为了凑数把 `/tw/liunian` 换成别的没验证过的路径。核心页只保留这 7 条：

```
/  /partners  /shengxiao  /liunian  /tw  /tw/partners  /tw/shengxiao
```

（A 侧已逐条实测：以上 7 条均 200，且 4 条中文路径全部在线上 sitemap 内。）

---

# 三、第二步：新增在线校验 `scripts/verify-indexnow-live.mjs`

**这是本轮的重点**——把「默认集合 ⊆ 线上 sitemap」变成可执行断言。

```js
// 用法：npm run verify:indexnow-live
// 语义：拉线上 sitemap，断言默认集合里每一条都在其中；列出差集并 exit 1
```

要求：

```
① 拉 https://www.mingcharts.com/sitemap.xml（只读，不提交任何东西）
② 断言：indexnowDefaultPaths() 的每一条都出现在 sitemap 的 <loc> 里
③ 失败时逐条打印差集 URL（最多 10 条），并提示「这些 URL 可能 404，先 curl 确认」
④ 成功时打印 `INDEXNOW_LIVE_PASS` + 「225 条全部在 sitemap 内」
⑤ 失败时 `INDEXNOW_LIVE_FAIL` + exit 1
⑥ 网络错误（超时/403）单独区分：打印 `INDEXNOW_LIVE_SKIP` + exit 2，
   不要把它和「真的发现死链」混为一谈
```

**★ 不要挂进 `npm run verify`**（`verify` 必须保持全离线），
只在 `package.json` 里新增一个键：

```json
"verify:indexnow-live": "tsx scripts/verify-indexnow-live.mjs"
```

---

# 四、第三步：`scripts/indexnow.mjs` 文件头加一行提示

在用法注释里补一行（不动任何逻辑）：

```
 * 提交前建议先跑：npm run verify:indexnow-live   # 确认集合内无 404
```

---

# 五、必须避免（红线）

```
✗ 不许把 verify-indexnow-live 挂进 npm run verify（verify 必须离线，CI 不该依赖线上可用性）
✗ 不许在 verify-indexnow-live 里向 IndexNow 端点发任何请求（只许 GET sitemap.xml）
✗ 不许改 BASE / KEY / KEY_LOCATION / ENDPOINT
✗ 不许改 articles.ts、不许改分类表、不许改 sitemap.ts
✗ 不许删 `--all` 与显式 URL 模式，不许改 --dry-run 行为
✗ 不许为了让在线校验通过而把集合缩小到"只留少数核心页"——必须修的是那条 404，不是砍集合
✗ 不许跑格式化工具
```

---

# 六、验收标准（A 侧逐条复核）

| # | 断言 | 判定方式 |
|---|---|---|
| 1 | 改动文件恰好 4 个 | `src/lib/indexnowPaths.ts`、`scripts/test-indexnow.mjs`、`scripts/indexnow.mjs`、`scripts/verify-indexnow-live.mjs`（新）、`package.json` —— **共 5 个**，多一个少一个都不行 |
| 2 | 核心页恰为 7 条且与 A 侧给定清单逐字一致 | 代码审阅 |
| 3 | 条数 = 7 + 2×89 + 16 + 24 = **225** | `npx tsx scripts/indexnow.mjs --dry-run` 输出 225 |
| 4 | 繁体侧 = **112** | 测试 ④ 输出 |
| 5 | 集合内**不含** `/tw/liunian` | 对 dry-run 输出全文检索 |
| 6 | 牙口仍有效 | 回执贴「删一篇文章映射 → 红 → 还原 → 绿」的输出 |
| 7 | `npm run verify` 仍全 PASS | 38 个 `*_PASS`，一个不少 |
| 8 | `npx tsc --noEmit` | 退出码 0 |
| 9 | ★ `npm run verify:indexnow-live` 输出 `INDEXNOW_LIVE_PASS` | 我实跑；若线上临时不可用，你的回执要贴 `_SKIP` 与原因，不许伪造 PASS |
| 10 | 在线脚本只 GET、不 POST | 源码审阅：不许出现 `api.indexnow.org` |
| 11 | 差集分支有牙 | 回执贴一次「临时把某条改成 /tw/liunian-404 → 在线校验红 → 还原 → 绿」的实际输出 |

---

# 七、回执要求

```
文件：docs/交接记录/31-IndexNow死链修复/HANDOFF-BACK-IndexNow死链修复回传.md
1. git diff --stat（5 个文件）
2. `npx tsx scripts/indexnow.mjs --dry-run` 原样输出（应 225 条）
3. `npm run verify:indexnow-live` 原样输出
4. 在线校验的牙口输出（注入假 404 → 红 → 还原 → 绿）
5. 离线牙口输出（删一篇文章映射 → 红 → 还原 → 绿）
6. `npm run verify` 末尾 6 行 + `npx tsc --noEmit` 退出码
7. 已知缺口
```

---

# 八、做完之后（A 侧动作，不是你的活）

复核通过后由 A 侧手工执行一次真实提交：

```
npm run seo:indexnow -- --dry-run     # 先看 225 条
npm run seo:indexnow                  # 真发
```

**所以本轮你依然不许发真实提交请求。**
