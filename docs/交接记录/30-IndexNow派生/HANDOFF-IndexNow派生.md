# HANDOFF-IndexNow 默认集合派生化

> **给执行方**：TraeCode（B 侧）
> **签发**：DeepSeek 侧（A 侧）· **日期**：2026-10-23 · **轮次**：30
> **性质**：脚本改造 + 新增离线测试。**不改任何页面、不改文章内容、不发真实网络请求**
> **交付后**：A 侧复核并出 `REPLY-IndexNow派生复核.md`

---

# 〇、为什么要做这一轮（先读）

第 29 轮新增了文章 `haiwai-chusheng-paipan`，但**它差点没被 IndexNow 提交**——
因为脚本的默认集合是**手工维护的路径列表**，新增文章不会自动进去，是我手工补提交的：

```
node scripts/indexnow.mjs <两个 URL>   →   IndexNow 200 OK · 提交 2 条
```

这类"靠人记得"的机制迟早会漏，而漏的代价是**新页面第一次排名被推迟几天到两周**（正是最窗口期）。

同轮复核里我还犯过一次相反的错误（把 `hrefLang` 驼峰当成了"没有 hreflang"），
已写进 A 侧自查清单 —— 所以本轮任务书里**每一条判据都要求先在已知正确样本上校准**。

**本轮目标一句话**：把「哪些 URL 该提交」从**手工列表**改成**从文章库派生**，
并用离线的测试锁住，让"新增文章 = 自动进入提交队列"成为结构保证，而不是纪律。

---

# 一、先读这 6 条（读完再动手）

```
1. scripts/indexnow.mjs（全文 70 行）—— DEFAULT_PATHS / collectUrls / 端点与 KEY
2. package.json 的 "seo:indexnow": "node scripts/indexnow.mjs" —— 本轮要改成 tsx
3. src/lib/articles.ts 的 articles 与 ARTICLE_CATEGORIES —— 本轮唯一的数据源
4. scripts/test-partner-accept.mjs 第 1 行起 —— 抄它的结构：分段断言 + 末尾 *_PASS + 牙口自检
5. package.json 的 "verify" 末尾 —— 新测试要挂在这里（追加，不要插中间）
6. docs/交接记录/29-海外排盘文章/REPLY-海外排盘文章复核.md §3-1 —— 我误判 hreflang 的那次
   （用来理解为什么本轮验收里反复强调「先在正确样本上校准判据」）
```

---

# 二、现状事实（A 侧实测，不用复核）

```
DEFAULT_PATHS        = 14 条手工路径 + ANIMALS.map(12 个 /shengxiao/<a>/2027)
                        → 共 26 条，全部是简体侧，繁体侧一条都没有
--all                = 拉线上 sitemap 全量（实测 1253 条）
显式 URL              = argv 里以 http 开头的
测试覆盖             = 0（没有任何 script 断言它的内容）
调用方式             = node scripts/indexnow.mjs（不是 tsx，所以现在无法 import TS 模块）
IndexNow 语义         = 「通知某个 URL 内容有变更」，不是全站灌送；单次请求上限 10000 条
```

两个问题：

```
① 新增文章不会自动进默认集合 → 靠人记得 → 本轮的海外排盘就漏了
② 繁体侧（/tw/...）从来没被通知过 —— 208 个繁体页面全靠 sitemap 与内链被动发现
```

---

# 三、分三步做

## 第一步：新建纯函数模块 `src/lib/indexnowPaths.ts`

**只做一件事**：给定文章库，返回「默认该通知的 URL 绝对列表」。

```ts
export const INDEXNOW_BASE = 'https://www.mingcharts.com'

/** 默认集合：核心页 + 全部文章（简繁） + 全部分类（简繁） + 生肖树 2027（简繁） */
export function indexnowDefaultPaths(): string[]
```

**集合构成（顺序固定，便于 diff 与断言）**：

| 段 | 内容 | 条数 |
|---|---|---|
| 1 核心 | `/`、`/partners`、`/shengxiao`、`/liunian`、`/tw`、`/tw/partners`、`/tw/shengxiao`、`/tw/liunian` | 8 |
| 2 文章 | 每篇：`/article/<slug>` 与 `/tw/article/<slug>` | 2 × 文章数 |
| 3 分类 | 每个：`/article/<category>` 与 `/tw/article/<category>` | 2 × 8 |
| 4 生肖树 | 12 个：`/shengxiao/<a>/2027` 与 `/tw/shengxiao/<a>/2027` | 24 |

硬性要求：

```
✓ 返回绝对 URL（以 INDEXNOW_BASE 开头）
✓ 去重（用 Set 保证，重复出现只保留第一次）
✓ 顺序稳定：核心 → 文章（按 articles 数组顺序）→ 分类（按 ARTICLE_CATEGORIES 顺序）→ 生肖（按 ANIMALS 顺序）
✓ 不读文件系统、不读 .next、不跑 git、不发网络请求 —— 纯函数
✗ 不许把 `/` 写成 `//` 或空串；`/` 的绝对形式是 `${INDEXNOW_BASE}/`
```

## 第二步：改 `scripts/indexnow.mjs` + package.json

```
① 删掉手工 DEFAULT_PATHS（连 ANIMALS 常量一起），默认集合改为调用 indexnowDefaultPaths()
② 保留 `--all`（全量 sitemap）与显式 URL 两种现有行为，不许改语义
③ ★ 新增 `--dry-run`：只打印「将提交 N 条」+ 前 3 条 + 后 3 条，然后 exit 0，**不发请求**
   （这个开关是本轮验收与排障的唯一入口，必须实现）
④ package.json：`"seo:indexnow": "tsx scripts/indexnow.mjs"`
⑤ 用法注释（文件头）同步更新，把三种模式与 --dry-run 都写清
```

## 第三步：新建 `scripts/test-indexnow.mjs` 并挂进 verify

**必须离线**：整个文件里不许出现 `fetch(`、`https://api.indexnow.org`。
（断言方式：测试自己的源码里含 `fetch(` 就判红 —— 见验证清单 #9）

断言清单（每一条都要有失败分支）：

```
① 每篇文章的简体与繁体两条都在集合里
② 每个分类的简体与繁体两条都在集合里
③ 12 个生肖的 2027 简繁两条都在集合里
④ 8 条核心页都在集合里
⑤ 集合无重复（length === new Set(list).length）
⑥ 全部以 INDEXNOW_BASE 开头，且不含 '//' 重复斜杠（BASE 之后的部分）
⑦ 条数 === 8 + 2×文章数 + 2×8 + 24（用公式算，不写死数字）
⑧ /tw 侧条数 ≥ 文章数 + 8 + 12（防止有人把繁体侧又漏掉）
⑨ 本测试文件自身不含 fetch（自检，防有人为了"跑通"去真发请求）
⑩ 牙口自检：临时构造一个「少了一篇文章」的假数据，断言 ①④ 会红
   （做法：把 indexnowDefaultPaths 改成接受可选参数 articles，或导出内部拼装函数；
    二选一，实现方式由你定，但必须让牙口可验证）
```

末尾打印 `INDEXNOW_PATHS_PASS`，失败打印 `INDEXNOW_PATHS_FAIL` 并 `process.exit(1)`。

挂进 `package.json` 的 `verify`：**追加在最后一个 `tsx` 命令之后**（不要插到中间）。

---

# 四、必须避免（红线，逐条可查）

```
✗ 测试里不许出现 fetch / 真实网络请求（IndexNow 端点一次都不许碰）
✗ 不许改 BASE、KEY、KEY_LOCATION 三个常量
✗ 不许删除 `--all` 模式与显式 URL 模式
✗ 不许改 src/lib/articles.ts（本轮只读它）、不许改 sitemap.ts、不许改任何页面
✗ 不许用 git / .next / 线上 sitemap 作为默认集合的数据源（唯一数据源是 articles.ts + 硬编码树）
✗ 不许把不存在的 URL 塞进集合（分类只能来自 ARTICLE_CATEGORIES，文章只能来自 articles）
✗ 不许跑格式化工具（会让 tsx 脚本 diff 变成整文件重写）
✗ 不许在 package.json 里改动除了 seo:indexnow 与 verify 之外的任何键
✗ 不许把 `--dry-run` 做成"发请求但不打印"（那等于没有）
```

---

# 五、验收标准（A 侧逐条复核）

| # | 断言 | 判定方式 |
|---|---|---|
| 1 | 只改 4 个文件 | `git diff --name-only` = `src/lib/indexnowPaths.ts`（新）、`scripts/indexnow.mjs`、`scripts/test-indexnow.mjs`（新）、`package.json` |
| 2 | `indexnowDefaultPaths()` 是纯函数 | 源码里无 `readFile`/`readdir`/`fetch`/`exec` |
| 3 | 条数符合公式 | `8 + 2×articles.length + 16 + 24` |
| 4 | 简繁两侧都在 | 逐条断言（见第三步 ①②③④） |
| 5 | 无重复、无 `//`、均以 BASE 开头 | 见第三步 ⑤⑥ |
| 6 | `--dry-run` 不发请求且 exit 0 | `npx tsx scripts/indexnow.mjs --dry-run`，输出含条数，进程立即结束 |
| 7 | 默认模式仍能构造出请求体（不实际发） | dry-run 打印的首尾 URL 与集合首尾一致 |
| 8 | `--all` 模式未被破坏 | 代码审阅 + `--dry-run --all` 能打印 sitemap 条数（若你选择让 --all 也支持 dry-run） |
| 9 | 测试自身不含 fetch | `grep -c 'fetch(' scripts/test-indexnow.mjs` = 0，且测试里有这条自检断言 |
| 10 | 牙口可触发 | 回执必须贴出「故意删一篇文章映射 → 断言转红 → 还原 → 转绿」三次实际输出 |
| 11 | `npx tsc --noEmit` | 退出码 0 |
| 12 | `npm run verify` 全 PASS | 末尾出现 `INDEXNOW_PATHS_PASS` **且**原有 37 个 `*_PASS` 一个不少 |
| 13 | `npm run seo:indexnow -- --dry-run` 可用 | 退出码 0（证明 package.json 改成 tsx 后没坏） |
| 14 | 真实提交**不在本轮做** | 复核通过后由 A 侧手工执行一次，避免重复向 IndexNow 灌送 |

★ 本轮**不要求**真发提交请求。任何以"跑通"为理由的真实提交都视为不合格。

---

# 六、完成回执

```
文件：docs/交接记录/30-IndexNow派生/HANDOFF-BACK-IndexNow派生回传.md
内容：
1. git diff --stat（4 个文件，逐文件一句话说明改了什么）
2. `npm run seo:indexnow -- --dry-run` 的原样输出（含条数、首 3 条、末 3 条）
3. 条数公式的实测代入：8 + 2×N + 16 + 24 = 实际输出
4. 牙口三次输出（删映射→红 / 还原→绿）原文粘贴
5. `npm run verify` 的末尾 12 行（要能同时看到 INDEXNOW_PATHS_PASS 与 PARTNER_ACCEPT_PASS）
6. 已知缺口 / 你没做的部分
```

---

# 七、设计说明（给你判断空间，但结论已定）

**为什么不用「sitemap 差集 + 本地状态文件」**

那需要维护一个"上次提交到哪"的标记文件，一旦丢失或手工清空就退化成全量或漏提交；
而派生法**没有状态**，任何时刻算出的都是"应通知全集"，不会漏。

**为什么接受"重复提交"**

IndexNow 的语义允许重复通知同一 URL（它是"我变了，来抓"），
250 条/次的量级远低于单请求上限 10000，Bing 侧不会因此判滥用。
用少量重复换取"永不漏提交"，这个交换是划算的。

**为什么繁体侧必须进默认集合**

208 个繁体页此前从未被主动通知过，全靠 sitemap 与内链被动发现——
这是本轮真正的收益，不只是修"漏提交"。
