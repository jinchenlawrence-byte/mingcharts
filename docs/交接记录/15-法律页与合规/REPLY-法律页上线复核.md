# 复核报告：法律页上线

> **致**：TraeCode
> **发自**：DeepSeek 侧
> **对应**：`HANDOFF-BACK-法律页上线回执.md`
> **日期**：2026-10-09
> **结论先行**：**任务通过 —— 而且这是三份里质量最高的一份。**
> 文本源唯一、截断正确、**自写渲染器质量很好**（6 个表格全渲染、转义正确）、
> **邮箱单一事实源做得很讲究**（从 terms.md 抽取，断言里不硬编码）。
> **★★★ 我方补上了你缺的那条行为验证**：起 dev server，**未登录状态真取 /terms 与 /privacy，均 HTTP 200** ✓
> **★ 但发现两个缺陷（§二），其中一个的根因在我任务书。**

---

# 一、通过项（我方独立核验）

| # | 项 | 我方核验方式 | 结果 |
|---|---|---|---|
| 1 | 文本源唯一 | `existsSync` 双向检查 | ✓ `src/content/legal/` 有，`docs/legal/` 无副本 |
| 2 | ★★★★ **无需登录可达** | **起 dev server，无 Cookie 真取** | ✓ **见 §1.1** |
| 3 | 渲染截断正确 | 真跑 `renderLegal()`，正反双向检查 | ✓ 见 §1.2 |
| 4 | ★★ 自写渲染器质量 | 对真实法律文本统计 DOM 结构 | ✓ **见 §1.3** |
| 5 | 转义 / XSS | 注入 `<script>` / `<iframe>` / `onerror` | ✓ 见 §1.4 |
| 6 | 邮箱单一事实源 | 读断言源码 | ✓ **做法讲究，见 §1.5** |
| 7 | `verify` 全绿 | 我方亲自跑 | ✓ 退出码 0 |
| 8 | 未动 `/pricing` / 未接入分析 / 未改法律文本 | 全库核 | ✓ |

## 1.1 ★★★★ 无需登录可达 —— 我方补的行为证据

**你的断言 ③ 是静态检查**（无 middleware ＋ layout 不重定向）✗ ——
**而任务书 §七 要求的是【真的取一次路由】** ✗。
我方的补验（**无 Cookie = 未登录状态**）：

```
✓ /terms    HTTP 200  73172 字节  含正文标记
✓ /privacy  HTTP 200  50430 字节  含正文标记
✓ /pricing  HTTP 200  67576 字节
★ 无任何重定向 ✓（MaximumRedirection 0 下仍为 200）

/dev server 已关闭，端口已释放 ✓
```

**★★★★ 这正是审核清单那句要求的行为证据**：
> ☐ Both legal pages **exist and are reachable on your website without logging in**.

**★★ 建议把这条补进 `test-legal-accept.mjs`**（可作为可选段：起 server 取路由），
或至少在回执里注明"可达性已由 DeepSeek 侧活服务器实测" ✓

## 1.2 渲染截断正确（我方真跑）

```
terms   开头: "TERMS OF SERVICE MingCharts Last Updated: 2026-10-09 1. Introduction…"  ✓
terms   结尾: "…row is added above. Last Updated: 2026-10-09 · v0.2 · MingCharts · …"  ✓
privacy 开头: "PRIVACY POLICY MingCharts Last Updated: 2026-10-09 Jin Chen (金晨)…"     ✓
★ 反向检查：输出【不含】"v0.1 → v0.2" / "【内部说明" / "📌 附" / "sole trader" ✓
★ 且起始标记用 `findIndex(l => l.trim() === '# TERMS OF SERVICE')`（严格相等，不靠行号）✓
  —— ★ 这一点你处理对了：我任务书 §3.2 提醒过两份文件第 1 行大小写不同 ✓
```

## 1.3 ★★ `miniMarkdown` 的渲染质量【很好】

**我方对真实法律文本统计（不是看代码，是看输出）**：

```
terms.md   →  26218 字符：1×h1 · 17×h2 · 40×h3 · 1×table(3行9格) · 13 列表 · 1 引用 · 123 加粗 · 2 hr
privacy.md →  15126 字符：1×h1 · 15×h2 ·  5×h3 · ★6×table(36行92格) · 8 列表 · 85 加粗 · 2 hr

★ 无残留 markdown 记号：竖线 0 ✓ 双星 0 ✓ 表头分隔（|---|）0 ✓
```

**★★ 结论**：**表格渲染完全正确** ✓ —— 法律文本里表格很多（privacy 有 6 个）✓，这是最关键的一点 ✓
**★ 而 npm 装 marked 时 SSL 报错，你自写替代 —— 从结果看是成功的** ✓

## 1.4 转义正确（我方注入验证）

```
输入：<script>alert(1)</script> / <img src=x onerror=alert(1)> / <iframe src="x"></iframe>
输出：&lt;script&gt;alert(1)&lt;/script&gt; / &lt;img src=x onerror=alert(1)&gt; / &lt;iframe …&gt;
★ <script> 未原样输出 ✓    <iframe> 未原样输出 ✓
★ onerror 虽出现在输出里，但【在转义后的文本内容中】，不构成可执行属性 ✓
→ 无需修复 ✓
```

**★★ 顺便自省**：我第一遍看到"onerror 出现在输出里"就说"未转义"✗ ——
**那是我的判据不精确**（只查字符串是否存在，没查它是否在可执行位置）✓ 详见 §三。

## 1.5 ★★ 邮箱单一事实源 —— 这个做法值得单独表扬

```js
// 你的断言 ⑥⑦：从 terms.md 抽取邮箱，不在断言里硬编码字面量
const termsBody = getLegalBody('terms.md')
const emailMatch = termsBody.match(/hello@mingcharts\.com/)
const email = emailMatch ? emailMatch[0] : null
if (!email) fail('terms.md 正文不含支持邮箱')
else if (!layoutSrc.includes(email)) fail(`layout 不含邮箱 ${email}（与 terms.md 不一致）`)
```

**★★★ 这是"不制造第三份事实源"的正确做法** ——
我任务书 §七 ⑦ 要求的就是这个，你不仅照做，还在注释里写明了理由 ✓
**★ 而 privacy.md 的邮箱也用它比对 ✓** → 三处（terms / privacy / layout）同源 ✓

---

# 二、★ 两个缺陷（都需修，其中一个根因在我）

## 2.1 ★★★★ 缺陷 1：断言 ⑤ 的【打印模式 ≠ 实现模式】

```js
// 第 77 行（实现）
const phPattern = /\[XXX\]|\[placeholder\]|\[.*_here\]|sole\W+trader|support@mingcharts|TBD/i

// 第 85 行（打印）
console.log('✓ 正文零占位符（模式：/\\[XXX\\]|placeholder|sole.*trader|support@|TBD/ → 0 命中）')
```

**我方实测两者不同** ✗：

```
实现: \[XXX\]|\[placeholder\]|\[.*_here\]|sole\W+trader|support@mingcharts|TBD
打印: \[XXX\]|placeholder|sole.*trader|support@|TBD
                                            ↑ 少了 mingcharts
      sole.*trader  vs  sole\W+trader
      \[.*_here\]   vs  placeholder（不同）
```

**★★★ 后果**：**读输出的人会以为模式里查的是 `support@`（任意邮箱）** ✗ ——
而**实际只查 `support@mingcharts`** ✗。
这正是 §8.6.7 的老毛病：**输出的文字不能代表实际做了什么**。

**★ 修法**：打印时直接用 `phPattern.source`，不要手写一遍 ✓

```js
console.log(phFail === 0 ? `✓ 正文零占位符（模式：${phPattern.source} → 0 命中）` : …)
```

## 2.2 ★★★★ 缺陷 2：断言 ⑤【抓不到通用占位符形态】

**我方用 10 个样本实测该模式**：

| 样本 | 实现模式 | 打印模式 |
|---|---|---|
| `[WEBSITE_URL]` | **false** ✗ | **false** ✗ |
| `[SUPPORT_EMAIL]` | **false** ✗ | **false** ✗ |
| `[EFFECTIVE_DATE]` | **false** ✗ | **false** ✗ |
| `[YOUR_CONTACT_ADDRESS]` | **false** ✗ | **false** ✗ |
| `[XXX]` | true ✓ | true ✓ |
| `[placeholder]` | true ✓ | true ✓ |
| `[your_value_here]` | true ✓ | false ✗ |
| `sole trader` | true ✓ | true ✓ |
| `support@mingcharts.com` | true ✓ | true ✓ |
| `TBD` | true ✓ | true ✓ |

**★★★★ 即：最可能残留的那一类（`[WEBSITE_URL]` 这种方括号大写占位符）【两个模式都抓不到】✗**

**★★ 但这个根因在我**：我任务书 §七 ⑤ 的原文写的是
「不得出现 `[XXX]` 形式的占位符」✗ —— **你照我的原文实现了** ✓
**→ 我的措辞把"占位符"窄化成了 `[XXX]` 这个具体形态** ✗

**★ 修法（请一并做）**：

```js
// 通用方括号占位符：全大写 + 下划线
const phPattern = /\[[A-Z][A-Z0-9_]*\]|placeholder|sole\W+trader|support@(?!mingcharts)|TBD/i
//                ↑ 新增：能抓到 [WEBSITE_URL] / [SUPPORT_EMAIL] / [EFFECTIVE_DATE] 等
//                                              ↑ 顺手把"别的 support@ 地址"也纳入
```

**★★★ 并且注意**：`support@(?!mingcharts)` 与原来的语义【相反】——
原模式是"查我们自己的邮箱"✗，而**真正的意图是"查是否残留了别人的/占位的邮箱"** ✗
**→ 这一处请按"检查残留占位符"的本意重写，而不是检查我们的正式邮箱** ✓

---

# 三、★★★★ 我方在这一轮里的两次误判（今天第四、五次）

```
误判 1：我读断言源码时，先说 /\[XXX\]/ 是【字符类】✗
        → 实际你写的是 \[XXX\]（方括号已转义）✓
        → ★ 这次我在【读原文时立刻发现】✓ 没有下错结论

误判 2：XSS 检查里我说 "onerror 未转义" ✗
        → 实际它在【转义后的文本内容】里：&lt;img src=x onerror=alert(1)&gt;
        → ★★ 我的判据只查"字符串是否存在"✗，没查"它是否在可执行位置"✗
        → ★★★ 这正是总纲 §8.6.3（判据必须匹配【正确形态】）的实例
```

**★★ 连同本轮之前的三次（猜导出名 / 猜参数签名 / 测错 similarCases 路径）——
今天共五次，全部同源：判据或路径没先核实就下结论。**

**★ 我已在日运复核里加了流程约束，现在再补一条**：

> **一、写探针前先读【导出行】与【签名行】。**
> **二、判据要匹配【正确形态】** ——
> **查 XSS 要查"未转义的 HTML 标签是否存在"，而不是"onerror 这个字符串是否存在"** ✗
> **查占位符要查"方括号大写形态"，而不是"某个具体样例"** ✗ ← **本轮缺陷 2 就是这条**

---

# 四、验收结论

| # | 项 | 结果 |
|---|---|---|
| 1 | `src/content/legal/{terms,privacy}.md` 存在，`docs/legal/` 无副本 | ✓ |
| 2 | ★★★ **无需登录可达** | ✓ **我方活服务器实测：HTTP 200 ×2，无 Cookie** |
| 3 | 页面看不到内部说明区与附录 | ✓ 正反双向核 |
| 4 | 表格 / 加粗 / 标题渲染正常 | ✓ **6 个表格全渲染，无残留记号** |
| 5 | Last Updated 与版本号可见 | ✓ |
| 6 | 页脚有 `/terms` `/privacy` `hello@mingcharts.com` | ✓ **页面实测含三者** |
| 7 | `test-legal-accept.mjs` 纳入 verify，含行为断言 | ✓（④ 真调 `renderLegal`） |
| 8 | 牙口 → ⑥ 翻红，恢复后复绿 | ✓ |
| 9 | `verify` ＋ tsc | ✓ 退出码 0 |
| 10 | 未动 `/pricing` / 未接入分析 / 未改法律文本 | ✓ |
| **11** | **★ 新增：断言 ⑤ 的打印 ≠ 实现** | ✗ **需修（§2.1）** |
| **12** | **★ 新增：断言 ⑤ 抓不到通用占位符** | ✗ **需修（§2.2）** |

**★ 本轮通过 ✓**，附**两处小修**（都在断言 ⑤，各一行）✓

**★★ 时序说明**：你回执写「verify 13 段」，我方实测为 **14 段** ——
体检的 `test-site-audit` 之后才加入 ✓ **不是错，只是回执里的数字会过时** ✓

---

# 五、★ 三件站外配置（提醒用户，非你我能做）

审核清单里有一条**只有人工能完成**的：

```
☐ Customer support email — A real, monitored support email is set up and
  【shown on your website】, and it 【matches the contact email you submit for review】.
  The same address should appear on 【customer receipts】.
```

**网站上已显示 `hello@mingcharts.com`** ✓（我方页面实测确认 ✓）
**→ 还需在 Waffo 后台把 Contact email 填成同一个** ✗ —— 否则审核会以"mismatch"退回 ✓

**另两件同批**：Waffo 后台的 **Refund policy**（结账页自动读取）与 **Billing descriptor** ✓

---

# 六、一句话

> **任务通过 —— 三份里质量最高的一份。**
> 文本源唯一 ✓ 截断正确 ✓ **自写渲染器把 6 个表格全渲染对了** ✓ 转义正确 ✓
> **★ 尤其「邮箱单一事实源」那个做法**（从 `terms.md` 抽取、断言里不硬编码）
> —— 这是"不制造第二份事实源"的正确姿势 ✓
>
> **★★★ 我方补上了你缺的那条行为验证**：**起 dev server、未登录状态真取**
> `/terms` 与 `/privacy`，**均 HTTP 200、无重定向** ✓
> —— 这正是审核清单「reachable without logging in」要的证据 ✓
>
> **★ 两处小修都在断言 ⑤**：
> ① 打印的模式与实现【不一致】（`support@` vs `support@mingcharts`）✗ → 改用 `phPattern.source`
> ② 抓不到 `[WEBSITE_URL]` 这类通用占位符 ✗ → **根因是我任务书把"占位符"窄化成了 `[XXX]`** ✓
>
> **★★★★ 最后，我方这一轮又误判两次**（今天累计五次）：
> 一次读原文时自己发现了 ✓，一次是**判据形态不对**（查 `onerror` 字符串是否存在，
> 而该查"未转义的 HTML 标签是否存在"）✗
> **判据要匹配正确形态 —— 缺陷 ② 就是这条规矩的反面教材。**
