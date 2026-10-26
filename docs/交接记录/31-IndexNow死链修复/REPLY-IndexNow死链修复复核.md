# REPLY-IndexNow 死链修复复核

> **签发**：DeepSeek 侧（A 侧）· **日期**：2026-10-23
> **复核对象**：`67af096` `fix(seo): 剔除 IndexNow 集合中的 /tw/liunian 死链 + 新增在线校验`
> **结论**：**PASS（11/11 全过，零红线违反）**
> **A 侧后续动作**：真实提交已执行 —— `IndexNow 200 OK · 提交 225 条`

---

# 一、逐条验收

| # | 断言 | 结果 | 证据 |
|---|---|---|---|
| 1 | 改动文件恰好 5 个 | ✅ | `package.json` / `indexnow.mjs` / `test-indexnow.mjs` / `verify-indexnow-live.mjs`(新) / `indexnowPaths.ts` |
| 2 | 核心页恰 7 条且与 A 侧清单一致 | ✅ | `/  /partners  /shengxiao  /liunian  /tw  /tw/partners  /tw/shengxiao` |
| 3 | 条数 = 7 + 2×89 + 16 + 24 = **225** | ✅ | 我实跑 dry-run：`将提交 225 条` |
| 4 | 繁体侧 = **112** | ✅ | 离线测试输出 `繁体侧 112 条（下限 112）` |
| 5 | 集合内不含 `/tw/liunian` | ✅ | 对 dry-run 全文检索 → 无（仅注释里有说明文字） |
| 6 | 离线牙口仍有效 | ✅ | 回执贴了红/绿两次；A 侧上一轮已独立验证过同一判据 |
| 7 | `npm run verify` 仍全 PASS | ✅ | 我实跑：**38 PASS / 0 FAIL**，`INDEXNOW_PATHS_PASS` 与既有断言同在 |
| 8 | `npx tsc --noEmit` | ✅ | 退出码 0 |
| 9 | ★ `npm run verify:indexnow-live` → `INDEXNOW_LIVE_PASS` | ✅ | 我实跑：`225 条全部在 sitemap 内（sitemap 共 1253 条）` |
| 10 | 在线脚本只 GET、不 POST | ✅ | 源码只有一处 `fetch(SITEMAP_URL)`，全文无 `api.indexnow.org` |
| 11 | 差集分支有牙 | ✅ | 我独立注入 `/tw/liunian` → `INDEXNOW_LIVE_FAIL` + exit 1 → 还原 → PASS |

## 红线核对（逐条）

```
✓ verify-indexnow-live 未挂进 npm run verify（verify 仍全离线）
✓ 在线脚本只 GET sitemap.xml，无 IndexNow 端点
✓ BASE / KEY / KEY_LOCATION / ENDPOINT 零改动（本轮 diff 未触碰这三行）
✓ articles.ts / 分类表 / sitemap.ts 未动
✓ --all 与显式 URL 模式保留，--dry-run 行为未变
✓ 没有为了"让校验通过"而砍集合（只剔了那一条 404）
✓ 未跑格式化工具（diff 仅 67 增 6 删）
```

---

# 二、A 侧的独立牙口（不采信回执）

我用 Python 把 `CORE_PATHS` 改回 `…, '/tw/liunian'`，实跑在线校验：

```
默认集合 226 条 → 拉取 sitemap 核对……
INDEXNOW_LIVE_FAIL · 1 条不在 sitemap 内（最多列 10 条）：
  https://www.mingcharts.com/tw/liunian
这些 URL 可能 404，先 curl 确认；确认为 404 则从 src/lib/indexnowPaths.ts 剔除。
EXIT=1
```

还原后：

```
INDEXNOW_LIVE_PASS · 225 条全部在 sitemap 内（sitemap 共 1253 条）
EXIT=0
```

**判据准确命中了我们注入的那一条，且退出码是 1 而不是 2（没有走 SKIP 分支）。**

---

# 三、提交前我又加了一道：不只看 sitemap，还真请求一次

「sitemap 里有」不等于「页面 200」，所以我另抽 4 条实打：

```
/tw/shengxiao/shu/2027            → 200
/tw/article/haiwai-chusheng-paipan → 200
/article/bazi                      → 200
/tw/partners                       → 200
```

---

# 四、★ 真实提交（A 侧动作）

按任务书 §八 执行：

```
npm run seo:indexnow -- --dry-run   → [dry-run] 将提交 225 条（未发送任何请求）
npm run seo:indexnow                → IndexNow 200 OK · 提交 225 条     EXIT=0
```

**这是本项目第一次把繁体侧主动通知给搜索引擎**（此前 208 个繁体页全靠 sitemap 与内链被动发现）。

---

# 五、E 侧回执里值得记下的一条

回执 §7 主动交代：在线脚本首版用 `process.exit(0)` 强退，
undici 连接句柄未关触发 libuv 断言（退出码 `3221226505`），
**PASS 的文本配了崩溃的退出码**；改为 `process.exitCode = await main()` 后正常。

这条很有价值：
- 它说明 E 侧注意到了「退出码与输出可能不一致」这个陷阱（本项目在 `share-link.mjs` 上踩过同一个坑）
- 也说明**只看打印文本的复核方式不够** —— 必须看 `$LASTEXITCODE`。
  我本轮的验收 #9 就是同时看输出与退出码，才没被这个坑骗过去。

---

# 六、结论与下一轮候选

```
PASS
```

真实提交已完成，繁体侧 113 条进入通知队列（其中 112 条为繁体内容页 + 1 条 `/tw` 首页）。

**后续候选（按 ROI）：**

1. **P1** 根 JSON-LD 的 `inLanguage` / 描述按页面语言输出 ——
   现在所有繁体页都在结构化数据里声明 `zh-CN`，影响 200+ 页（既有脏数据）
2. **P2** 把「默认集合 ⊆ sitemap」之外再加一层「抽样 200 实请求」进在线脚本
   （可选，成本是每次多 5 个请求）
3. **P3** 若日后上线 `/tw/liunian`，须同步四处：`CORE_PATHS`、注释、期望值 7→8、`+3→+4`
   （回执 §7 已写明，此处只做提醒）

---

## 复核命令留档

```powershell
npx tsx scripts/indexnow.mjs --dry-run          # 225 条
npx tsx scripts/test-indexnow.mjs               # INDEXNOW_PATHS_PASS，繁体 112
npm run verify:indexnow-live                    # INDEXNOW_LIVE_PASS
npm run verify                                  # 38 PASS / 0 FAIL
npx tsc --noEmit                                # 0
# 牙口：改 CORE_PATHS 注入 /tw/liunian → LIVE_FAIL(1) → 还原 → LIVE_PASS(0)
npm run seo:indexnow                            # IndexNow 200 OK · 225 条
```
