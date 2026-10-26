# REPLY-IndexNow派生复核

> **签发**：DeepSeek 侧（A 侧）· **日期**：2026-10-23
> **复核对象**：`b444d45` `feat(seo): IndexNow 默认集合改为从文章库派生 + 离线测试`
> **结论**：**14 项验收 13 项通过、1 项发现缺陷 → 判定「需修」**
> **缺陷根因：在 A 侧任务书，不在 E 侧实现**（见 §三）
> **真实提交**：未执行（本轮按 §五 #14 要求不做），等修复后再跑

---

# 一、逐条验收

| # | 断言 | 结果 | 证据 |
|---|---|---|---|
| 1 | 只改 4 个文件 | ✅ | `package.json` / `scripts/indexnow.mjs` / `scripts/test-indexnow.mjs`(新) / `src/lib/indexnowPaths.ts`(新) |
| 2 | `indexnowDefaultPaths()` 是纯函数 | ✅ | 源码无 `readFile`/`readdir`/`fetch`/`exec`；测试 ⑤ 也守这条 |
| 3 | 条数符合公式 | ✅ | 我独立算：8 + 2×89 + 2×8 + 24 = **226**，实测 226，去重后 226 |
| 4 | 简繁两侧都在 | ✅ | 抽查 `haiwai-chusheng-paipan` / `shenme-shi-bazi` 简繁均为 true；测试 ① 全量覆盖 |
| 5 | 无重复、无 `//`、均以 BASE 开头 | ✅ | 测试 ②；我另跑一次异常 URL 扫描（非 https / 带查询串）→ 0 条 |
| 6 | `--dry-run` 不发请求且 exit 0 | ✅ | 我实跑：`[dry-run] 将提交 226 条`＋首 3 末 3，EXIT=0；`process.exit(0)` 在 POST 之前 |
| 7 | dry-run 首尾 URL 与集合一致 | ✅ | 首 `/`，末 `/tw/shengxiao/zhu/2027`，与集合首尾一致 |
| 8 | `--all` 未被破坏 | ✅ | 代码路径保留；`--dry-run --all` 组合按回执说明会先拉 sitemap（读网页，不碰端点） |
| 9 | 测试自身不含 fetch | ✅ | 自检 needle 用 `'fet' + 'ch('` 拼接，避免自命中；同时扫生产模块 |
| 10 | 牙口可触发 | ✅ | 回执贴了三次输出；**我另做一次独立注入**（见 §二） |
| 11 | `npx tsc --noEmit` | ✅ | 退出码 0 |
| 12 | `npm run verify` 全 PASS | ✅ | 我实跑：**38 个 PASS，0 个 FAIL**；`INDEXNOW_PATHS_PASS` 与上一轮 `PARTNER_ACCEPT_PASS` 同在 |
| 13 | `npm run seo:indexnow -- --dry-run` | ✅ | 走 npm 脚本正常，226 条，tsx 改造成功 |
| 14 | 不许真发提交 | ✅ | 回执声明未发；脚本结构上 dry-run 在 fetch 之前退出；生产模块无网络调用 |
| **+** | **红线：BASE / KEY / ENDPOINT 未动** | ✅ | `git show` 中相关行只有一处 `-`（删除旧的 DEFAULT_PATHS 用法），常量三行零改动 |

## 我做的独立牙口（不采信回执）

用 Python 把生产模块改成 `articleList.slice(0, -1)`（少最后一篇），实测：

```
✗ 文章简繁缺失 1 篇：haiwai-chusheng-paipan
✗ 默认集合条数：实际 224，期望 226
✗ 繁体条数 112 < 下限 113（/tw 被漏掉？）
✗ 牙口失效：少一篇文章时 ① 未精确变红（得到 2 篇：dingwei-wuxing, haiwai-chusheng-paipan）
INDEXNOW_PATHS_FAIL
```

还原后 `INDEXNOW_PATHS_PASS`。**判据有牙，且四处同时联动。**

---

# 二、★ 缺陷：默认集合里有一条 404

离线测试只能验路径形态，验不了"这个 URL 是否真的存在"。所以我做了一次**线上交叉核对**：
把 226 条与线上 sitemap（1253 条）求差集。

```
❌ 不在 sitemap 里的 URL: 1
   https://www.mingcharts.com/tw/liunian
```

实测状态码：

```
https://www.mingcharts.com/tw/liunian   → 404
https://www.mingcharts.com/liunian      → 200
```

**这条 URL 是我在任务书 §三 第一步的「核心页 8 条」里写进去的，E 侧忠实实现。**
我写之前没有验证 `/tw/liunian` 是否存在——简体侧有 `/liunian`，繁体侧只有 `/tw/shengxiao`，没有流年索引页。

后果：跑真实提交会把一个 404 报给 Bing/Yandex，属无效通知（浪费配额，且质量信号不好）。

**责任归属：A 侧。** 这是两轮里我第二次把"没验证过的假设"写进任务书
（上一轮是把 `hrefLang` 驼峰当成缺 hreflang）。

---

# 三、处置意见

1. **本轮判「需修」**，不执行真实提交（尚未执行，production 无影响）
2. 修复内容极小：核心页去掉 `/tw/liunian`，条数 226 → 225，公式 `8` → `7`
3. **但只删一行不够** —— 这类错误会再犯。必须补一个**在线**校验（opt-in，不进 `verify`），
   把「默认集合 ⊆ 线上 sitemap」变成可执行断言。已另出第 31 轮任务书。

---

# 四、其他观察（不影响判定）

| 项 | 说明 |
|---|---|
| 工作区残留 `src/lib/demoFatebook.ts` 改动 | `git hash-object` 与 `HEAD:` 值相同 → **内容未变**，只是行尾/时间戳视图差异，E 侧未误提交（做对了） |
| 测试 ④「繁体侧下限」算式 | `文章数 + 分类数 + 生肖数 + 4`，其中 4 是繁体核心页数量。修复后应为 `+3`（`/tw`、`/tw/partners`、`/tw/shengxiao`）——第 31 轮一并改 |
| 回执质量 | 主动交代 `--dry-run --all` 未实测、needle 拼接原因、公式不写死，属诚实回执 |

---

# 五、给 E 侧的话

实现质量没问题，**14 项里 13 项一次到位，牙口四路联动、purity 守得住、常量一根没动**。

唯一的缺陷来自我的任务书写错了一条 URL —— 你在没有线上环境的前提下无法发现它，
这不是你的疏忽。第 31 轮会把「在线交叉核对」补成脚本，让这类错误下次自动暴露。
