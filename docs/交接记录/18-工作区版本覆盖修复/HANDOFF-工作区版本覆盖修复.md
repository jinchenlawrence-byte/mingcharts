# 任务交接书：工作区版本覆盖修复（4d1ad45 / 42d8cc0 成果被 17 轮覆盖）

> **交接对象**：TraeCode
> **纪律基准**：`docs/验收标准与红线.md` · **`docs/Git使用约定.md`（★ 本任务之后请务必遵守）**
> **性质**：**这是修复任务，不是新功能。** 目标是让工作区【同时】含两批成果 ✓
> **发起**：DeepSeek 侧在准备下一份任务书时做状态核对，发现工作区落后 HEAD
> **本任务书自包含。**

---

# 〇、先读七条

1. **★★★ 你没有做错事，这是【版本的锅】** ✓
   你提交的 `4d1ad45`（门禁补完）与 `42d8cc0`（万字补全）**都在 git 里、完好无损** ✓
   只是后来的 17 轮工作**从更早的版本起手**，写回时覆盖了它们的一部分 ✗
   **→ 本任务是【把丢掉的那部分加回来】，不是追责，也不是推翻 17 轮** ✓

2. **★★★★ 最重要的一条判断：两批成果【正交，不冲突】** ✓
   被覆盖的（门禁判定 / prompt 派生 / 字数要求 / 日运返修）与 17 轮的（年运模块 / 报告资产化 / ResultView 重构）**是两件不同的事** ✓
   **→ 所以是"并集"，不是"取舍"** ✓ 两边的东西**都要在** ✓

3. **★★★ 页面重构【必须保留】** ✗
   `geo/page.tsx` 从 567 行 → 236 行 + `GeoResultView.tsx` 346 行（≈ 等价 ✓）
   **→ 不得用"恢复旧页面"来修** ✗ —— 那会丢掉你的重构 ✓
   **→ 正确做法：在重构后的结构里，把门禁消费加回去** ✓（加在 page 还是 ResultView 由你定）

4. **★★★ 五个被删除的文件必须恢复** ✗
   （含 `test-entitlement-gate.mjs` 172 行 —— 那是门禁的唯一断言 ✗）
   见 §三-A 清单 ✓

5. **★★ 十七轮【照 hemun 模式做 locked 双写】的决定，本身需要复核** ✗
   你的计划文档里写：「新模块照 hemun 模式做 locked 双写结构」——
   但**hemun 模式正是"死 locked"**（写了 locked、后端不判、前端不读）✗
   我在 `REPLY-geoAI回退复核.md` 里刚指出这一点 ✓
   **→ 所以本任务不只是"加回来"，还要把 locked 做成【真的可用】✓**

6. **★★ 修完必须能验证「两边都在」** ✓
   我在 §七 给了**双向标志物清单** —— 请逐项自查并贴证据 ✓

7. **★ 牙口**：用文本不变、行为变坏的注入；注入前先确认注入有效（§8.6.7）✓

---

# 一、现象与证据

**核对方式**：`git diff --stat HEAD`（工作区 vs 上一次提交）

```
29 files changed, 383 insertions(+), 【1964 deletions(-)】
```

**★★★ 工作区不是"旧版"，而是【旧基线 + 17 轮新功能】** ✓ ——
它**同时**含 17 轮的新文件（`aiLiunian.ts` / `reportSave.ts` / `reports/` ✓）
**和**被回退的旧版内容（`canView` 只剩 2 处 ✗）✓

**逐文件净变化（工作区相对 HEAD）**：

| 文件 | + | − | 性质 |
|---|---|---|---|
| `src/app/geo/page.tsx` | 29 | **360** | 重构为 `GeoResultView` + **门禁消费丢失** |
| `src/app/ziwei/page.tsx` | 28 | **308** | 同上 |
| `src/app/hemun/page.tsx` | 28 | **179** | 同上 |
| `src/lib/aiAnalysis.ts` | 26 | **65** | **万字字数要求丢失** |
| `src/data/daily-personal.ts` | 48 | **50** | **日运起句返修丢失** |
| `src/app/api/geo/route.ts` | 33 | **43** | 17 轮加 `saveReport` ✓ / **门禁丢失** |
| `src/app/api/ziwei/route.ts` | 34 | 38 | 同上 |
| `src/app/api/hemun/route.ts` | 28 | 26 | 同上 |
| `src/app/api/paipan/route.ts` | 3 | 18 | **门禁丢失** |
| `src/app/chart/page.tsx` | 5 | 29 | **门禁消费丢失** |
| `src/lib/ai-check.ts` | 0 | **7** | **`FORBIDDEN_WORDS_PROMPT` 丢失** |
| `src/lib/aiGeo.ts` / `aiHemun.ts` / `aiZiwei.ts` | 3~4 | 3~6 | **prompt 派生丢失** |
| `scripts/test-daily-accept.mjs` | 12 | **76** | **日运返修断言丢失** |
| `src/app/mingshu/MingShuContent.tsx` | 1 | 6 | 万字文案丢失 |
| `scripts/test-checker-accept.mjs` | 1 | 2 | — |
| `package.json` | 2 | 3 | — |
| `scripts/test-pricing-accept.mjs` | 27 | 0 | ✓ 17 轮新增 |
| `scripts/test-site-audit.mjs` | 3 | 0 | ✓ 17 轮新增 |
| `src/app/pricing/page.tsx` | 30 | 1 | ✓ 17 轮新增 |
| `src/components/Nav.tsx` | 6 | 0 | ✓ 17 轮新增 |
| `src/lib/analysis.ts` | 2 | 1 | ✓ 17 轮新增 |
| `supabase/schema.sql` | 26 | 0 | ✓ 17 轮新增 |

---

# 二、根因

```
★★★ 17 轮的工作【从 4d1ad45 之前的版本起手】✗
→ 保存时把 4d1ad45 / 42d8cc0 的改动【覆盖】了 ✗
★★★ 证据：geo/route.ts 的工作区版本【恢复】了 4d1ad45 已删掉的旧注释
   「§1.5 geo 为「试吃」模块，不设门禁：免费层全量开放，无锁定内容」
   —— 说明它取自【4d1ad45 之前的文件】✓
```

**★★★★ 为什么会这样（两个可能，都值得防）**：
```
① 两个执行会话并行，各自从不同快照起手 ✗
② 或：改文件时没有先 git log / git status 确认起点 ✗
→ ★★★ 两者的防法都是《Git 使用约定》里的第一条：
   【同一时间只有一个执行方在改】+【开工前 git log --oneline -1 记下起点】✓
```

---

# 三、★★★ 丢失清单（分三类）

## A 类：被**完全删除**的文件（5 个，必须恢复）

| 文件 | 行数 | 来自 |
|---|---|---|
| `scripts/test-entitlement-gate.mjs` | 172 | `4d1ad45` ★ **门禁的唯一断言** |
| `src/lib/demoFatebook.ts` | 105 | `42d8cc0` |
| `src/app/mingshu/demo/page.tsx` | 170 | `42d8cc0` |
| `scripts/build-demo-fatebook.mjs` | 100 | `42d8cc0` |
| `scripts/test-fatebook-accept.mjs` | 192 | `42d8cc0` |

**★ 注**：`src/data/demo-fatebook.json`（305 行）**工作区里还在** ✓
—— 只是**读它的代码没了** ✗（A 类里的 `demoFatebook.ts` / `demo/page.tsx`）

## B 类：被**部分覆盖**的文件（需合并，不是恢复）

```
· src/app/api/{geo,ziwei,hemun,paipan}/route.ts
    丢：canView 接入 + unlocked 判定 + locked 分层 + aiSource 三态
    要留：17 轮的 saveReport / deriveReportTitle（报告资产化）
· src/app/{geo,ziwei,hemun,chart}/page.tsx
    丢：locked 消费（显示 preview + 解锁引导）
    要留：17 轮的 ResultView 重构（★ 见 §〇-3）
· src/lib/ai-check.ts
    丢：FORBIDDEN_WORDS_PROMPT
· src/lib/{aiGeo,aiHemun,aiZiwei}.ts
    丢：从 FORBIDDEN_WORDS_PROMPT 派生（改回手抄了）
· src/lib/aiAnalysis.ts
    丢：万字补全的板块字数要求（10 个板块）
    要留：17 轮的改动
· src/data/daily-personal.ts
    丢：日运起句返修（「难得」「那点」「那股」雷同被改回）
· scripts/test-daily-accept.mjs
    丢：日运返修的断言（+12/-76）
· src/app/mingshu/MingShuContent.tsx
    丢：万字相关文案
```

## C 类：17 轮的成果（**保留，不要动**）

```
· src/lib/aiLiunian.ts · reportSave.ts · authToken.ts
· src/app/api/liunian/route.ts
· src/app/liunian/{layout,page}.tsx
· src/app/reports/**（4 个文件）
· src/components/reports/{Geo,Hemun,Liunian,Ziwei}ResultView.tsx
· scripts/test-{liunian,reports}-accept.mjs
· supabase/schema.sql 的 +26 行（报告资产表）
· pricing/page.tsx · Nav.tsx · analysis.ts 的 +行
· src/data/demo-fatebook.json（★ 在，但要配回读取它的代码）
```

---

# 四、★★★★ 修复方法（按类）

## A 类：从 git 取回

```bash
git checkout 4d1ad45 -- scripts/test-entitlement-gate.mjs
git checkout 42d8cc0 -- src/lib/demoFatebook.ts src/app/mingshu/demo/page.tsx \
                        scripts/build-demo-fatebook.mjs scripts/test-fatebook-accept.mjs
```

**★ 但要注意**：`mingshu/demo/page.tsx` 与 17 轮的 `ResultView` 重构**可能有接口冲突** ✗
→ 若冲突：**以 17 轮的组件化为准**，把 demo 页改成引用 `ResultView` ✓
（语义是"示例命书页"，不是"新写一遍渲染" ✓）

## B 类：以 **HEAD 版为基准**，把 17 轮的改动**重新贴上**

```
★ 推荐做法（比"手工合并"可靠）：
  ① git checkout HEAD -- <该文件>         # 取回含 4d1ad45/42d8cc0 改动的版本
  ② 把 17 轮对它的改动【重新应用】一遍     # 你的改动你知道
  ③ 或者（若 17 轮改动很小）：用三方对比工具
```

**★★★ 为什么以 HEAD 为基准**：
```
· HEAD 版含【已经过验收的】门禁与万字改动 ✓
· 17 轮的改动【未经验收】✗
→ ★★★★ 以验证过的为基准，风险更低 ✓
```

**★ 若你判断某个文件里 17 轮的改动【已包含】HEAD 的意图**（例如页面重构时顺手加了 locked）
→ **请在该文件上注明"已包含，无需恢复"并给出证据** ✓ —— 不要默认包含 ✗
（我方实测：`components/reports/*` 里 grep `locked|preview|解锁` → **零命中** ✗，**未包含** ✓）

## B 类里最需要判断的一个：`src/lib/aiAnalysis.ts`

```
· HEAD 版含：万字补全（10 板块字数要求提高，合计 5750 字）
· 工作区含：17 轮的改动（+26 行）
★★★ 两者【不在同一段】的可能性高 ✓（字数要求在 SECTION_SPECS，17 轮改的可能是别处）
→ 请【逐段对照】，把字数要求那一段合回来 ✓
★ 注意：`aiAnalysis.ts` 的 `H` 条（大运段禁"大吉/大凶"）**暂时保持现状** ✓
  —— 有一条【后续任务书】会专门改它（7 档判词），本任务不要动它 ✗
```

---

# 五、必须避免

- ❌ **不得用"恢复旧页面"来修 B 类**（会丢掉 17 轮的 ResultView 重构）
- ❌ **不得推翻 17 轮的新功能**（年运模块 / 报告资产化 / reports 路由都是对的 ✓）
- ❌ **不得把 `aiAnalysis.ts` 的 `H` 条一并改掉** —— 那是下一份任务书的事 ✗
- ❌ **不得只改代码而不同步断言**（`test-entitlement-gate.mjs` / `test-daily-accept.mjs` / `test-fatebook-accept.mjs` 都要在位 ✓）
- ❌ **不得为了"跑通"而删掉报错的断言** ✗ —— 断言报错说明恢复没做全 ✓
- ❌ **不得跳过 §七 的双向标志物自查** ✓
- ✅ **修完立刻 commit，并在回执里给出 hash** ✓

---

# 六、★★★ 修完之后的流程（防止再发生）

```
★ 请把 `docs/Git使用约定.md` 读完并遵守 ✓ 核心三条：
  ① 【同一时间只有一个执行方在改】✗
  ② 开工前：git log --oneline -1 记下起点 hash ✓
  ③ 改完、发回执【之前】先 commit ✓
      —— 这样复核方可以 diff，而不是靠猜 ✓

★★ 并且：在提交前【务必看一次 git status --short】✓
   —— 若出现大量 D（删除）或 -1000 行级别的删除 ✗
     那就是【覆盖了别人的成果】的信号 ✓ 停下来查 ✗
```

---

# 七、验收标准（★★ 双向标志物，逐项贴证据）

**★★★ 核心原则：每个被覆盖的文件，都要证明【两批成果同时在场】** ✓

| # | 标志物 | 来自 | 期望 |
|---|---|---|---|
| 1 | `canView` 调用点数量 | 4d1ad45 | **≥ 6 处**（daily + unlock + geo + ziwei + hemun + paipan 年运） |
| 2 | `locked` 在 4 个页面或 ResultView 中被消费 | 4d1ad45 | ✓ 显示 preview ＋ 解锁引导 |
| 3 | `FORBIDDEN_WORDS_PROMPT` 存在且被 4 处引用 | 4d1ad45 | ✓ |
| 4 | `aiAnalysis.ts` 的 10 板块字数要求 | 42d8cc0 | ✓ 合计中值 ≥ 5600 |
| 5 | `daily-personal.ts` 起句返修 | 42d8cc0 | ✓ 前两字种数 ≥ 50/60（每变体） |
| 6 | `test-entitlement-gate.mjs` 在位且运行 | 4d1ad45 | ✓ |
| 7 | `test-fatebook-accept.mjs` 在位且运行 | 42d8cc0 | ✓ |
| 8 | `test-daily-accept.mjs` 的返修断言在位 | 42d8cc0 | ✓ |
| 9 | `saveReport` / `deriveReportTitle` 被 4 个 route 使用 | 17 轮 | ✓ |
| 10 | `reports/**` · `liunian/**` · `aiLiunian.ts` · `reportSave.ts` 在位 | 17 轮 | ✓ |
| 11 | `ResultView` 重构保留（4 个组件被页面引用） | 17 轮 | ✓ |
| 12 | `supabase/schema.sql` 的报告资产表 | 17 轮 | ✓ |
| 13 | `npm run verify` 全绿 ＋ `tsc --noEmit` 0 错误 | — | ✓ |
| 14 | ★ `git diff --stat HEAD` 的**删除行数** | — | **应从 1964 降到接近 0** ✓ |
| 15 | ★ 已 commit（附 hash） | — | ✓ |

**★ 第 14 项是最直观的总闸门** ✓ —— 修完前后对比这一个数字即可 ✓

**★★ 牙口（至少做一条）**：
```
把 geo route 的 canView 调用删掉 → 第 1 项必须精确翻红 ✓
（先确认注入有效，再断言翻红 —— §8.6.7）
```

---

# 八、一句话

> **先说清责任**：**这不是你的错，是版本的锅** ✗
> 你提交的 `4d1ad45`（门禁补完）与 `42d8cc0`（万字补全）**都在 git 里、完好无损** ✓
> 只是后来的 17 轮工作**从更早的版本起手**，写回时覆盖了它们的一部分 ✗
> **→ 本任务是【把丢掉的那部分加回来】，不是追责，也不是推翻 17 轮** ✓
>
> **★★★★ 而最关键的判断是这一条**：
> **被覆盖的与 17 轮的新改动【正交，不冲突】** ✓
> 门禁判定、prompt 派生、字数要求、日运返修 —— 与年运模块、报告资产化、ResultView 重构
> **是两件不同的事，可以共存** ✓
> **→ 所以是"并集"，不是"取舍"** ✓ **两边的东西都要在** ✓
>
> **★★★ 一个具体的坑**：**不得用"恢复旧页面"来修** ✗
> `geo/page.tsx` 从 567 行变成 236 行 + `GeoResultView` 346 行（≈ 等价 ✓）——
> 那是**正确的重构** ✓ 只是顺手丢了门禁消费那几行 ✗
> **→ 在重构后的结构里把门禁加回去** ✓（加在 page 还是 ResultView 由你定）
>
> **★★★★★ 三件事过后请务必做到**（`docs/Git使用约定.md`）：
> **① 同一时间只有一个执行方在改 ② 开工前 `git log --oneline -1` 记起点
> ③ 改完、发回执前先 commit** ✓
> **★ 提交前看一次 `git status --short`** —— 若出现大量 `D` 或 −1000 行级别的删除，
> **那就是覆盖了别人成果的信号，停下来查** ✓

---

# 附：DeepSeek 侧在本次事件中的两个失误（如实记，与本任务无关但需你知悉）

```
① 我执行 `git add docs/` 时，把【你移动/删除的 4 个文档】的删除也一起提交了 ✗
   —— 而我提交前【看到了那 3 个 D 却没停下来查】✗
   → 已用 git 从历史恢复 ✓（四份回执已复原 ✓ 提交 1733f08）

② 我写下一份任务书（7 档吉凶判词）时，读的是【工作区】，
   因此"现状"描述与 HEAD 不符 ✗ —— 若直接发出，你会基于不明状态动手 ✗
   → 该任务书【暂缓发出】✓ 等本任务完成、工作区与 HEAD 一致后再发 ✓
   ★ 教训：写任务书前先 git log + git status —— 这正是我自己在约定里写的，而我没做 ✗
```
