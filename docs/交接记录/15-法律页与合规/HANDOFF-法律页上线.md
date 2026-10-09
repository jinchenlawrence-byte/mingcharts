# 任务交接书：法律页上线（/terms 与 /privacy）＋ 页脚联系方式

> **交接对象**：TraeCode
> **纪律基准**：`docs/验收标准与红线.md`（**先读 §8.5.1 / §8.6 / §8.6.7**）
> **前置**：无（可独立开工）
> **本任务书自包含。**

---

# 〇、先读六条

1. **★★★ 两份法律文本【已定稿】，你不要改内容。**
   如需改，回来问 —— 因为每一条都对应 Waffo 官方清单的一条要求（见 §一）。
   你要做的是**把它们变成页面**。

2. **★★ 本轮【不撤】`/pricing` 的「即将推出」。**
   路线已定为 B（先做完个性化日运与取消流程，会员一起上）。
   ★「coming soon 占位」的问题**只在提交审核那一刻才存在** —— 那时会员已可售，占位自然消失。
   **所以本轮不要动 `/pricing`。**

3. **★★★ 本轮的硬目标**：让 Waffo 的 Business Details 能填、且过它的审核清单第 4 条 ——
   > ☐ **Privacy Policy & Terms of Service** — Both legal pages **exist and are reachable on your website without logging in**.

4. **★★ 文本是英文的，页面不要机翻、不要加中文改写。**
   法律文本目前只有英文版（理由见 `privacy.md` 末尾附录）。

5. **★ 纯 markdown 之外不要引入新的排版体系**（Tailwind v4 已有，用它）。

6. **★★ 一件事必须现在决定**：法律文本**目前放在 `docs/legal/`** ✗ ——
   **而 `.vercelignore` 排除 `docs/`** ✗ → **部署后页面读不到文本** ✗
   **→ 详见 §二，文本要移到 `src/content/legal/`，且【只能有一份】。**

---

# 一、依据：Waffo 三份官方清单（我方已取全文）

| 来源 | 与本任务相关的条款 |
|---|---|
| [Account Reviews 总清单](https://docs.waffo.ai/mor/account-reviews) | 🔴 两个法律页**存在且无需登录可达**；🔴 **Customer support email 显示在网站上**，且**与提交审核的邮箱一致** |
| [ToS Template](https://docs.waffo.ai/mor/account-reviews/tos) | 🔴 Terms 须可从站上访问；## 与 checkout 的关系 |
| [Privacy Template](https://docs.waffo.ai/mor/account-reviews/privacy-policy) | 🔴 政策须**从结账页链接**，并被 Terms 引用 |

**★ 我方已完成的对照**（你不必重做，只需实现）：
`terms.md` 改了 11 处、`privacy.md` 改了 12 处，**逐条对应上述清单**，
每份文件开头的「v0.1 → v0.2 改了什么」表列出了依据。

---

# 二、★★★ 文本源：移到 `src/content/legal/`，且只保留一份

## 2.1 为什么要移

```
现状：docs/legal/terms.md · docs/legal/privacy.md
★★ 而 .vercelignore 里有 docs/  ✗  → 部署产物里没有这两个文件 ✗
→ 若页面用 fs 读它们，生产环境会读不到 ✗
```

## 2.2 怎么做

```powershell
# 在项目根目录执行（★ 用 move，不要 copy —— 只保留一份）
New-Item -ItemType Directory -Force -Path src\content\legal | Out-Null
Move-Item docs\legal\terms.md   src\content\legal\terms.md   -Force
Move-Item docs\legal\privacy.md src\content\legal\privacy.md -Force

# docs\legal\ 若空了就删掉；并在 docs\ 下留一个指针文件说明正文已迁走
```

**★ 并在 `docs/legal/README.md` 写一行指针**（免得以后有人去 docs 找）：

```markdown
# 法律文本已迁至 src/content/legal/

正文（会被部署、由页面渲染）在：
- src/content/legal/terms.md
- src/content/legal/privacy.md

迁走原因：`.vercelignore` 排除 `docs/`，页面在服务端读文件时读不到。
★ 请勿在 docs/ 下再放一份副本 —— 法律文本只能有一个源。
```

## 2.3 ★ 明确禁止

- ❌ **不得在 `docs/legal/` 与 `src/content/legal/` 同时留两份**（会产生第二事实源）
- ❌ **不得把文本复制进 `.tsx`**（除非用 §三 的方式【读取】，而不是粘贴）
- ❌ **不得改动 `.vercelignore` 去把 `docs/` 放行** —— 那会把交接记录与方案一起部署

---

# 三、页面实现

## 3.1 两个路由

```
src/app/terms/page.tsx     →  /terms
src/app/privacy/page.tsx   →  /privacy
```

**要求**：

| # | 要求 |
|---|---|
| 1 | ★★ **无需登录即可访问** —— 检查 `middleware.ts`（若有）与 `layout.tsx`，确认不拦截这两条路径 |
| 2 | 在**服务端**读 `src/content/legal/{terms,privacy}.md`（不要在客户端 fetch） |
| 3 | **★ 只渲染【正文部分】**—— 见 §3.2 的截断规则 |
| 4 | 用现有 Tailwind 排版：标题层级、表格（法律文本里有多个表格）、加粗、引用块、有序/无序列表 |
| 5 | 加 `metadata`（`title` / `description`），与站内其他页面风格一致 |
| 6 | **★ 页面上要能看到 `Last Updated` 与版本号**（文本末尾已有，确保不被截断掉） |
| 7 | 移动端可读（表格需可横向滚动或自适应） |

## 3.2 ★★★ 截断规则（关键：正文里不能混进内部说明）

两份文件都有**非发布内容**，页面**必须**排除它们：

```
terms.md
  ├─ 第 1–42 行    【内部说明区】—— ⚠️ 不渲染
  ├─ 第 43 行起    「# TERMS OF SERVICE」—— ★ 从这里开始渲染
  └─ 至文件末尾    正文（含 §17 版本记录）

privacy.md
  ├─ 第 1–47 行    【内部说明区】—— ⚠️ 不渲染
  ├─ 第 48 行起    「# PRIVACY POLICY」—— ★ 从这里开始渲染
  ├─ 至「## 📌 附：」之前   正文
  └─ 「## 📌 附：」之后      【内部附录】—— ⚠️ 不渲染
```

**★ 实现建议（不要靠硬编码行号 —— 行号会漂移）**：

```
terms   起始标记：行首严格等于 "# TERMS OF SERVICE"（★ 区分大小写）
privacy 起始标记：行首严格等于 "# PRIVACY POLICY"（★ 区分大小写）
privacy 结束标记：行首以 "## 📌 附" 开头
```

**★★ 注意一个真实的坑**：两份文件的**第 1 行**分别是
`# Terms of Service — MingCharts` 与 `# Privacy Policy — MingCharts` ——
**大小写与起始标记不同**，所以**必须区分大小写**，否则会把内部说明区一起渲染 ✗
（★ 我方在核验时就踩过这个坑，用不分大小写的匹配定位错了正文起点。）

---

# 四、页脚（`src/app/layout.tsx`，现有 footer 在第 33–44 行）

**在现有 footer 内补三样**：

| 元素 | 内容 |
|---|---|
| 链接 1 | **Terms of Service** → `/terms` |
| 链接 2 | **Privacy Policy** → `/privacy` |
| ★★ 邮箱 | **hello@mingcharts.com** —— 必须是**可见文字 + `mailto:` 链接** |

**★★ 为什么邮箱必须可见**：审核清单原文 ——
> ☐ Customer support email — **shown on your website**, and it **matches the contact email you submit for review**.

**★ 所以这个邮箱字面上要与 §六 里你在 Waffo 后台填的一致。**

---

# 五、★★ 明确不进本轮（不要顺手做）

- ❌ 不动 `/pricing`（「即将推出」保留，见 §〇-2）
- ❌ 不做会员取消流程
- ❌ 不接入任何分析工具（隐私政策 §4 已如实写"无"；**接入就要同步改法律文本** ✗）
- ❌ 不把 `docs/` 放行到部署里
- ❌ 不改法律文本内容

---

# 六、★ 站外配置（**这是你要在 Waffo 后台做的，不是代码**）

交付这个任务时，**同时**把这三件做掉 —— 它们与法律页是一组：

| # | 在 Waffo 后台 | 填什么 | 依据 |
|---|---|---|---|
| 1 | **Contact email** | `hello@mingcharts.com` | 审核清单 🔴「matches the contact email you submit for review」 |
| 2 | **Refund policy**（存在店设置里） | 与 `terms.md` §7 **一致**的退款政策 | ToS 清单 🔴「Refund policy filled in **and shown at checkout**」；Waffo 注：结账页会自动读取，不必维护两份 |
| 3 | **Billing descriptor** | 让客户能认出这笔扣款 | ToS 清单 🟡「the #1 chargeback cause is "I don't recognize this charge"」；`terms.md` §8 已据此写了"账单可能显示含 Waffo 的描述符" |

---

# 七、断言（纳入 `verify`）

**新建 `scripts/test-legal-accept.mjs`**。

```
① 两个页面文件存在
   · src/app/terms/page.tsx · src/app/privacy/page.tsx

② ★★ 文本源唯一
   · src/content/legal/terms.md 与 privacy.md 存在
   · ★ docs/legal/ 下【不得】再存在同名 .md（防止第二事实源）

③ ★★ 无需登录可达（静态检查）
   · 读 middleware.ts（若存在），断言其 matcher【不覆盖】/terms 与 /privacy
   · ★ 若无 middleware，断言 layout.tsx 不含对这两个路径的重定向

④ ★★★ 渲染截断正确（用特征串，不用行号）
   · 断言页面实现里【区分大小写】地匹配 "# TERMS OF SERVICE" / "# PRIVACY POLICY"
   · ★ 反向断言：页面不得包含内部说明区的特征串，例如
     "v0.1 → v0.2 改了什么"（terms/privacy 各一处）
   · ★ 且 privacy 页面不得包含 "📌 附："

⑤ ★ 正文零占位符
   · 对 src/content/legal/*.md 的【正文部分】跑正则：
     不得出现 [XXX] 形式的占位符、不得出现 "sole trader"、"support@mingcharts"、"TBD"

⑥ ★★ 页脚
   · layout.tsx 含 /terms 与 /privacy 两个链接
   · layout.tsx 含 hello@mingcharts.com

⑦ ★★ 邮箱单一事实源
   · 站上出现的支持邮箱，与法律文本里的邮箱【必须是同一个值】
   · 实现：从 src/content/legal/terms.md 抽出邮箱，断言 layout.tsx 里出现的是同一个
     （★ 不得在断言里【再写一遍】那个邮箱字面量 —— 那就成了第三份）

⑧ ★★ 牙口（必须做，且用【文本不变、行为变坏】的注入）
   · 注入：从 layout.tsx 里删掉 /privacy 链接（只删这一处）
   · 预期：⑥ 精确翻红
   · ★ 注入前【先确认注入有效】（打出改动后的实际行内容），确认失败即中止
   · ★ 恢复后断言必须复绿
```

**⚠️ 断言写法的两条硬要求（来自 `docs/验收标准与红线.md` §8.6.7）**：

```
★ 一、⑥⑦ 是【静态文本检查】，它能抓"删掉链接"，抓不到"链接写错指向"✗
     → 所以【必须】再补一条行为断言：把 /terms 与 /privacy 作为路由真的取一次
        （Next 的 dev server 或直接 import 页面模块），断言返回正常、不是 404
     → 静态检查只作为辅助，不得替代行为断言

★ 二、凡断言对象是"某个函数的行为"，就必须真的调用它
     —— 不得只检查源码里有没有某行字（我方在 entitlement 那轮正是这样被抓出缺口的）
```

---

# 八、验收标准

| # | 项 | 期望 |
|---|---|---|
| 1 | `src/content/legal/{terms,privacy}.md` 存在，`docs/legal/` 下无同名副本 | ✓ |
| 2 | `/terms` 与 `/privacy` 可访问，且**未登录也能打开** | ✓ **贴实测（curl 或浏览器无痕）** |
| 3 | 页面上**看不到**内部说明区与附录 | ✓ 贴截图或断言输出 |
| 4 | 表格、加粗、标题渲染正常 | ✓ 贴截图 |
| 5 | `Last Updated` 与版本号在页面上可见 | ✓ |
| 6 | 页脚有 `/terms`、`/privacy`、`hello@mingcharts.com` | ✓ 贴截图 |
| 7 | ★ `test-legal-accept.mjs` 纳入 `verify`，含**行为断言**（真的取一次路由） | ✓ |
| 8 | ★ 牙口注入 → ⑥ 翻红，恢复后复绿 | ✓ **贴注入前后的实际值** |
| 9 | `npm run verify` 全绿 ＋ `tsc --noEmit` 0 错误 | ✓ |
| 10 | 未动 `/pricing`、未接入分析工具、未改法律文本 | ✓ |

---

# 九、一句话

> **两份法律文本【已定稿】，依据是 Waffo 的 Account Reviews / ToS / Privacy / AIGC 四份官方清单** ——
> 你**不要改内容**，把它们变成页面即可。
>
> **三件事是本轮的实质**：
> ① **文本要移到 `src/content/legal/`** —— 因为 `.vercelignore` 排除 `docs/`，
>    留在原处**部署后读不到** ✗；且**只能有一份**（不得双份维护）
> ② **页面必须【无需登录可达】**，这是审核清单第 4 条的原文要求
> ③ **页脚要显示 `hello@mingcharts.com`** —— 审核清单要求它"shown on your website"
>    且**与你在 Waffo 后台填的联系邮箱一致**
>
> **★ 明确不做**：不动 `/pricing` 的「即将推出」（路线 B，见 §〇-2）。
> 那条占位的问题**只在提交审核那一刻才存在**，而那时会员已经可售了。
>
> **★ 另有三件站外配置要你做**（§六）：Waffo 后台的 Contact email、退款政策、账单描述符。
