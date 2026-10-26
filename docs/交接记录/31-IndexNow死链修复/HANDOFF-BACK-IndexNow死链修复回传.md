# HANDOFF-BACK-IndexNow 死链修复回传

> 执行方：TraeCode（B 侧）· 日期：2026-10-26 · 对应任务书：`HANDOFF-IndexNow死链修复.md`（第 31 轮）
> 结论：`/tw/liunian` 已剔除，默认集合 225 条；新增在线校验 `INDEXNOW_LIVE_PASS`（225/225 在 sitemap 内）；
> 离线与在线两套牙口均已实证；**未向 IndexNow 端点发任何请求**。

---

## 1. git diff --stat（恰 5 个文件）

```
 package.json                  |  1 +   （新增 verify:indexnow-live 键，未动其它脚本）
 scripts/indexnow.mjs          |  1 +   （文件头加一行「提交前先跑 verify:indexnow-live」，逻辑零改动）
 scripts/test-indexnow.mjs     |  4 +-  （核心页清单、条数公式 8→7、繁体下限 +4→+3）
 src/lib/indexnowPaths.ts      |  2 +-  （CORE_PATHS 删 '/tw/liunian'，注释说明原因）
 scripts/verify-indexnow-live.mjs | 新增 （在线校验，opt-in，不入 verify）
```

`git status` 另见 `src/lib/demoFatebook.ts` 的改动——非本轮产物，未纳入提交。

---

## 2. `npx tsx scripts/indexnow.mjs --dry-run` 原样输出

```
[dry-run] 将提交 225 条（未发送任何请求）
  https://www.mingcharts.com/
  https://www.mingcharts.com/partners
  https://www.mingcharts.com/shengxiao
  …
  https://www.mingcharts.com/tw/shengxiao/gou/2027
  https://www.mingcharts.com/shengxiao/zhu/2027
  https://www.mingcharts.com/tw/shengxiao/zhu/2027
```

225 = 7 + 2×89 + 2×8 + 2×12；繁体侧 112 = 3 + 89 + 8 + 12。
全文检索无 `/tw/liunian`（仅注释里出现该字符，属说明性文字，不在 URL 集合内）。

---

## 3. `npm run verify:indexnow-live` 原样输出

```
> bazi-mvp@0.1.0 verify:indexnow-live
> tsx scripts/verify-indexnow-live.mjs

默认集合 225 条 → 拉取 sitemap 核对……
INDEXNOW_LIVE_PASS · 225 条全部在 sitemap 内（sitemap 共 1253 条）
EXIT=0
```

线上 sitemap 当前 1,253 条（含第 29–30 轮新增文章与繁简双份）。

---

## 4. 在线校验的牙口（注入假 404 → 红 → 还原 → 绿）

### 注入：`CORE_PATHS` 末尾临时加 `'/tw/liunian-404'`

```
默认集合 226 条 → 拉取 sitemap 核对……
INDEXNOW_LIVE_FAIL · 1 条不在 sitemap 内（最多列 10 条）：
  https://www.mingcharts.com/tw/liunian-404
这些 URL 可能 404，先 curl 确认；确认为 404 则从 src/lib/indexnowPaths.ts 剔除。
EXIT=1
```

差集分支准确命中注入的那一条，退出码 1（`INDEXNOW_LIVE_FAIL`），未走 SKIP 分支。

### 还原后

```
默认集合 225 条 → 拉取 sitemap 核对……
INDEXNOW_LIVE_PASS · 225 条全部在 sitemap 内（sitemap 共 1253 条）
EXIT=0
```

### 附：SKIP 分支（exit 2）语义

未实测线上故障；分支实现为 `fetch` 抛错或 `!res.ok` → 打印 `INDEXNOW_LIVE_SKIP（sitemap 拉取失败：…）` + `return 2`，
并显式说明「这不代表集合有死链」。与 FAIL（exit 1，已解析出 sitemap 且有差集）在代码路径上完全分离。

---

## 5. 离线牙口（删一篇文章映射 → 红 → 还原 → 绿）

### 注入：`buildIndexnowPaths` 里临时 filter 掉 `haiwai-chusheng-paipan`

```
—— ① 文章 / 分类 / 生肖 / 核心页 简繁齐全 ——
  ✗ 文章简繁缺失 1 篇：haiwai-chusheng-paipan
  · 分类 8 个 × 简繁 2 条 全部在集合内
  · 生肖 12 个 × 2027 × 简繁 2 条 全部在集合内
  · 核心页 7 条全部在集合内
—— ② 无重复 / 全部以 BASE 开头 / 无重复斜杠 ——
  · 无重复（223 条）
  · 前缀与斜杠全部规范（BASE 之后单斜杠开头，无 //）
—— ③ 条数公式 ——
  ✗ 默认集合条数：实际 223，期望 225
  · 7 + 2×89 + 2×8 + 2×12 = 225
—— ④ 繁体侧条数下限 ——
  ✗ 繁体条数 111 < 下限 112（/tw 被漏掉？）
—— ⑤ 测试自检：无真实请求 ——
  · 测试与生产模块均无网络/文件系统调用
—— ⑥ 牙口自检（假数据）——
  · 删掉「haiwai-chusheng-paipan」的映射 → ① 变红 1 篇（haiwai-chusheng-paipan），判据有效
  · 删掉分类「liunian」的映射 → ① 变红 1 个，判据有效

INDEXNOW_PATHS_FAIL
EXIT=1
```

### 还原后

```
—— ① 文章 / 分类 / 生肖 / 核心页 简繁齐全 ——
  · 文章 89 篇 × 简繁 2 条 全部在集合内
  · 分类 8 个 × 简繁 2 条 全部在集合内
  · 生肖 12 个 × 2027 × 简繁 2 条 全部在集合内
  · 核心页 7 条全部在集合内
—— ② 无重复 / 全部以 BASE 开头 / 无重复斜杠 ——
  · 无重复（225 条）
  · 前缀与斜杠全部规范（BASE 之后单斜杠开头，无 //）
—— ③ 条数公式 ——
  · 7 + 2×89 + 2×8 + 2×12 = 225
—— ④ 繁体侧条数下限 ——
  · 繁体侧 112 条（下限 112）
—— ⑤ 测试自检：无真实请求 ——
  · 测试与生产模块均无网络/文件系统调用
—— ⑥ 牙口自检（假数据）——
  · 删掉「haiwai-chusheng-paipan」的映射 → ① 变红 1 篇（haiwai-chusheng-paipan），判据有效
  · 删掉分类「liunian」的映射 → ① 变红 1 个，判据有效

INDEXNOW_PATHS_PASS
EXIT=0
```

---

## 6. `npm run verify` 末尾 6 行 + tsc

```
SHARE_ACCEPT_PASS
PARTNER_ACCEPT_PASS
INDEXNOW_PATHS_PASS
```

（贴的是 tail 8 中的后 3 行 `*_PASS` 段，完整末尾依次为
`RATELIMIT_ACCEPT_PASS / AIBUDGET_ACCEPT_PASS / LOCALE_ACCEPT_PASS / I18N_ACCEPT_PASS / SHARE_ACCEPT_PASS / PARTNER_ACCEPT_PASS / INDEXNOW_PATHS_PASS`，
无 `_FAIL`、无 `✗`。）

`npx tsc --noEmit` → `TSC_EXIT=0`。

---

## 7. 已知缺口 / 过程说明

1. **在线脚本首次实现踩了 Windows 退出崩溃**：用 `process.exit(0)` 强退时，
   undici 连接句柄未关触发 libuv 断言（`Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)`，
   退出码 3221226505），PASS 的文本配了崩溃的退出码。
   已改为 `process.exitCode = await main()`，让事件循环自然收尾；现输出 `INDEXNOW_LIVE_PASS` + `EXIT=0`。
   这是脚本实现细节，不影响任务书语义（⑥ 要求 exit 0/1/2）。
2. **`/tw/liunian` 只从集合剔除，页面本身未动**：任务书禁止改 sitemap/路由，故繁体流年页仍不存在。
   若日后要上线该页，须同时改 `CORE_PATHS`、本条注释与两处期望值（7→8、+3→+4），否则断言会红。
3. **在线校验不进 verify**：`npm run verify` 仍全离线；`verify:indexnow-live` 需手工触发（依赖线上可用性）。
4. **未发真实提交**：按 §八，225 条的真实 POST 留给 A 侧复核后执行。
