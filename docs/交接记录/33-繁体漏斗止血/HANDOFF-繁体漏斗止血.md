# HANDOFF-繁体漏斗止血

> **给执行方**：TraeCode（B 侧）
> **签发**：DeepSeek 侧（A 侧）· **日期**：2026-10-23 · **轮次**：33
> **性质**：转化链路修复 + 新增一个繁体落地页（**不做**繁体结果页镜像，见 §七 范围边界）
> **交付后**：A 侧复核并出 `REPLY-繁体漏斗止血复核.md`

---

# 〇、问题：繁体侧的漏斗在第一步就断了

GSC 24 小时数据：5 个点击里 **4 个落在繁体页**，位置 12.1。但 A 侧实测发现：

```
/tw 首页            input 数 = 0（没有排盘表单）
「免費排八字 →」     → /bazi        ← 简体路径
「排盤」导航         → /bazi        ← 同上
/bazi               HTTP 200，但【没有排盘表单】（它是出生年份索引页）
```

**繁体访客从任何入口点"免費排八字"，都落到一个不能排盘的简体页面。**

同一个漏洞出现 6 处（全部指向 `/bazi`）：

| 文件 | 那行 |
|---|---|
| `src/app/tw/layout.tsx` | `<Link href="/bazi">排盤</Link>`（导航） |
| `src/app/tw/page.tsx` | `<Link href="/bazi" className="hw-c-btnBig">免費排八字 →</Link>` |
| `src/app/tw/article/page.tsx` | `<Link href="/bazi" className="hw-c-btnBig">立即免費排盤 →</Link>` |
| `src/app/tw/shengxiao/page.tsx` | `<Link href="/bazi" className="hw-c-btnBig">免費排盤 →</Link>` |
| `src/app/tw/shengxiao/[animal]/page.tsx` | `<Link href="/bazi" className="hw-c-btnBig">免費排盤 →</Link>` |
| `src/app/tw/shengxiao/[animal]/[year]/page.tsx` | `<Link href="/bazi" className="hw-c-btnBig">輸入時辰，排我的八字 →</Link>` |

另外两个连带缺陷：

```
① 繁体流年页的 $19.99 次级 CTA 是【纯文本，不是链接】
   简体：<a href="/liunian">或直接生成 2027 年年运报告（$19.99…）→</a>
   繁体：<p>或直接生成 2028 年年運報告（$19.99…）</p>      ← 点不动
   根因：/tw/liunian 是 404（第 31 轮只把它从 IndexNow 集合剔除，页面本身没做）

② /tw 页的「简体」切换器指向 /shengxiao（应为 /）
```

---

# 一、先读这 5 条

```
1. 上面表格里那 6 个文件的那 6 行（先全部找出来看清楚）
2. src/app/liunian/page.tsx 第 100-210 行 —— 简体年运报告页的结构（本轮只做"轻量入口"，不照搬表单）
3. src/app/tw/layout.tsx 全文 —— 繁体根布局提供 lang="zh-Hant" 与 LocaleSync，本轮的 /tw/liunian 直接复用
4. src/lib/pricing.ts 的 SKUS.annual_report —— 价格唯一来源，禁止写死
5. src/lib/indexnowPaths.ts 第 22-25 行 CORE_PATHS —— 本轮要把 /tw/liunian 加回去（页面有了）
```

---

# 二、第一步：6 处 CTA 全部纠偏到 `/`，并在按钮旁标明语言

**把 `href="/bazi"` 全部改成 `href="/"`**（`/` 是简体首页，也是唯一真正有排盘表单的地方）。

同时在**每个按钮旁边**补一行小字提示（繁简用词照下面写死）：

```
排盤頁目前為簡體版
```

要求：

```
✓ 提示文字用小字（沿用 text-xs text-ink-light/60 这类既有样式），不要做成广告位
✓ 6 处都要有，不许漏（测试会逐文件断言）
✓ 导航那处（layout.tsx）也要改指向，但提示放在正文 CTA 处即可，不要在导航栏塞小字
✗ 不许把提示写成「暂不支持繁体」这类否定表述 —— 事实是"排盘页现在是简体"，不是"不支持"
```

---

# 三、第二步：新建 `/tw/liunian` 轻量入口页

**路径**：`src/app/tw/liunian/page.tsx`（服务端组件即可，**不复制** `liunian/page.tsx` 的表单与结果视图）

必须包含：

```
① metadata
   · title：繁体，含「年運報告」与「流年詳批」字样，≤ 30 字主体
   · description：繁体
   · alternates.canonical = '/tw/liunian'
   · alternates.languages = hantAlternates('/liunian')   ← 与简体双向互指
② 正文（服务端静态，不需要 client 组件）
   · 一句话说明年运报告是什么（覆盖今年／明年／後年三年，各含流月節奏）
   · 价格：{formatPriceUSD(SKUS.annual_report.priceUSD)}/次（★ 从 SKUS 取，禁止写死数字）
   · 主按钮：「前往排盤 →」 href="/"
   · 按钮旁小字：「排盤頁目前為簡體版」
   · 一个返回链接：「‹ 回首頁」 href="/tw"
③ 免责声明：与站内既有口径一致（传统命理民俗内容，仅供参考娱乐）
```

**禁止**：把简体的 `BirthPlacePicker` / `LiunianResultView` 搬过来。
理由：那会把「繁体排盘」这件事变成半成品（表单是繁体、结果页还是简体），比现在更乱。
本轮只做**能转化的入口**，真正的繁体排盘另开一轮。

---

# 四、第三步：繁体流年页的 $19.99 死文本变成真链接

`src/app/tw/shengxiao/[animal]/[year]/page.tsx` 里那段：

```tsx
<p className="mt-4 text-sm text-ink-light/70">或直接生成 … 年年運報告（…）</p>
```

改成链接，指向本轮的 `/tw/liunian`，**文案与价格展示方式照简体页对齐**（简体页用 `<Link className="hw-c-link">…→</Link>`）。

---

# 五、第四步：把 `/tw/liunian` 加回 IndexNow 默认集合（闭环第 31 轮）

`src/lib/indexnowPaths.ts` 的 `CORE_PATHS` 里**把 `/tw/liunian` 加回去**（页面现在真的存在了），
并同步改三处期望值：

```
核心页 7 → 8
条数   225 → 226     （8 + 2×89 + 2×8 + 2×12）
繁体下限 +3 → +4
```

★ 这次加回去是对的，与第 31 轮"因 404 剔除"不矛盾——**页面存在与否是本轮改变的事实**。
`scripts/test-indexnow.mjs` 里的注释要一并更正（原注释写着"勿补回，除非该页真的上线"）。

---

# 六、第五步：修 `/tw` 的「简体」切换器

```
改前：简体 → /shengxiao
改后：简体 → /            （繁体首页 ↔ 简体首页 对应）
```

---

# 七、范围边界（本轮**不做**，别顺手做）

```
✗ 不做繁体排盘结果页镜像（/tw/bazi/... 793 页）—— 另开一轮，本轮只止血
✗ 不搬 BirthPlacePicker 到繁体页
✗ 不改简体任何页面的 CTA 目标
✗ 不改 /tw/layout.tsx 的 lang / hreflang / LocaleSync
✗ 不改价格体系、不动 SKUS 数值
```

---

# 八、必须避免（红线）

```
✗ 不许在页面里写死价格数字（一律 SKUS + formatPriceUSD）
✗ 不许新增依赖
✗ 不许把「排盤頁目前為簡體版」做成大字/弹窗/浮层
✗ 不许把 CTA 目标改成 /tw（繁体首页同样没有表单）—— 目标是 /
✗ 不许删掉现有 6 个按钮中的任何一个
✗ 不许改 /bazi 页面本身（它是合法页面，只是不该被繁体的排盘 CTA 指向）
✗ 不许跑格式化工具
```

---

# 九、验收标准（A 侧逐条复核）

| # | 断言 | 判定方式 |
|---|---|---|
| 1 | 6 处 `href="/bazi"` 全部改为 `href="/"` | 源码 grep `href="/bazi` 在 `src/app/tw` 下应为 **0 命中** |
| 2 | 6 处 CTA 旁都有「排盤頁目前為簡體版」 | 逐文件断言（导航那处只要求 href 改对） |
| 3 | `/tw/liunian` 200，标题为繁体，含「年運報告」 | 线上实抓 |
| 4 | `/tw/liunian` 价格等于 `SKUS.annual_report` 实际值 | 脚本比对（禁止写死） |
| 5 | `/tw/liunian` 主按钮指向 `/`，且旁有繁体提示 | HTML 断言 |
| 6 | `/tw/liunian` hreflang 与 `/liunian` 互指 | 抓两边 HTML 比对 |
| 7 | 繁体流年页 $19.99 那处变成可点链接（指向 /tw/liunian） | HTML 断言：`<a href="/tw/liunian"` |
| 8 | `/tw` 的「简体」切换器指向 `/` | HTML 断言 |
| 9 | sitemap 收录 `/tw/liunian`（总数 1253 → 1254） | 抓线上 sitemap |
| 10 | IndexNow 默认集合 = **226** 条且含 `/tw/liunian` | `--dry-run` |
| 11 | `npm run verify` 全 PASS | 出现 `LIUNIAN_TITLE_PASS` 与 `INDEXNOW_PATHS_PASS`，且总数 39 保持 |
| 12 | `npx tsc --noEmit` | 退出码 0（**同时看 `$LASTEXITCODE`**） |
| 13 | 牙口：把任一处 CTA 改回 `/bazi` → 测试红 → 还原 → 绿 | 回执贴实际输出 |

---

# 十、回执要求

```
文件：docs/交接记录/33-繁体漏斗止血/HANDOFF-BACK-繁体漏斗止血回传.md
1. git diff --stat
2. 6 处改动的逐文件对照（改前/改后那一行）
3. /tw/liunian 的线上 title 与价格实测
4. IndexNow dry-run 输出（226 条）
5. 牙口输出（改回 /bazi → 红 → 还原 → 绿）
6. npm run verify 末尾 6 行 + tsc 退出码
7. 已知缺口（明确写：繁体排盘与结果页仍未镜像，属下一轮）
```

---

# 十一、做完之后（A 侧动作）

```
npm run seo:indexnow      # 226 条，让新页与改过的页被通知
```
