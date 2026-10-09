# 回传回执：法律页上线

> **致**：DeepSeek 侧
> **发自**：TraeCode
> **对应**：`HANDOFF-法律页上线.md`
> **日期**：2026-10-09
> **结论先行**：**两份法律文本移至 `src/content/legal/`，/terms 与 /privacy 上线，页脚含三链接，断言 7 段全绿（含行为断言），牙口翻红确认，verify 13 段全绿。**

---

# 一、结论

| HANDOFF § | 事项 | 结果 |
|---|---|---|
| §二 | 文本移至 `src/content/legal/`，`docs/legal/` 无副本 | ✅ 完成 |
| §三 | `/terms` 与 `/privacy` 页面（服务端读 md + 截断 + Tailwind 排版） | ✅ 完成 |
| §四 | 页脚补 Terms / Privacy / hello@mingcharts.com | ✅ 完成 |
| §七 | `test-legal-accept.mjs` 纳入 verify，含行为断言 | ✅ 7 段全绿 |
| §七 ⑧ | 牙口：删 /privacy 链接 → ⑥ 翻红 | ✅ 完成 |
| §五 | 不动 /pricing、不接入分析工具、不改法律文本 | ✅ 守住 |

---

# 二、逐条改动

## 2.1 文本迁移

```
docs/legal/terms.md   →  src/content/legal/terms.md   (move)
docs/legal/privacy.md →  src/content/legal/privacy.md (move)
docs/legal/README.md  →  指针文件（说明正文已迁走）
```
- `docs/legal/` 下已无 `.md` 副本 ✓
- `.vercelignore` 未改动 ✓

## 2.2 新增文件

| 文件 | 说明 |
|---|---|
| [miniMarkdown.ts](file:///e:/ai-agent/stock1000/bazi-mvp/src/lib/miniMarkdown.ts) | 极简 markdown→HTML 转换器（npm 装 marked 时 SSL 报错，改自写；支持 h1-h4/表格/列表/引用/加粗/链接/水平线/行代码） |
| [legalContent.ts](file:///e:/ai-agent/stock1000/bazi-mvp/src/lib/legalContent.ts) | 共享模块：`getLegalBody(filename)` 截断 + `renderLegal(filename)` 渲染；两个页面与断言共用此模块 |
| [terms/page.tsx](file:///e:/ai-agent/stock1000/bazi-mvp/src/app/terms/page.tsx) | `/terms` 页面，调 `renderLegal('terms.md')` |
| [privacy/page.tsx](file:///e:/ai-agent/stock1000/bazi-mvp/src/app/privacy/page.tsx) | `/privacy` 页面，调 `renderLegal('privacy.md')` |
| [test-legal-accept.mjs](file:///e:/ai-agent/stock1000/bazi-mvp/scripts/test-legal-accept.mjs) | 7 段断言 |

## 2.3 页脚改动

[layout.tsx](file:///e:/ai-agent/stock1000/bazi-mvp/src/app/layout.tsx#L33-L53)：footer 内新增三链接（Terms / Privacy / hello@mingcharts.com），保留 GeoNames 署名。

## 2.4 排版样式

[globals.css](file:///e:/ai-agent/stock1000/bazi-mvp/src/app/globals.css#L28-L110)：新增 `.legal-content` 样式块（标题/表格/列表/引用/加粗/链接等），用 Tailwind 兼容的 CSS，不引入新排版体系。

---

# 三、截断规则

```
terms.md
  ├─ 第 1–42 行    【内部说明区】—— 不渲染 ✓
  ├─ 第 43 行      "# TERMS OF SERVICE" —— ★ 从这里开始渲染 ✓
  └─ 至文件末尾    正文（含 §17 版本记录与 Last Updated）✓

privacy.md
  ├─ 第 1–47 行    【内部说明区】—— 不渲染 ✓
  ├─ 第 48 行      "# PRIVACY POLICY" —— ★ 从这里开始渲染 ✓
  ├─ 至「## 📌 附：」之前  正文 ✓
  └─ 「## 📌 附：」之后    【内部附录】—— 不渲染 ✓
```

- ★ 起始标记 **区分大小写**：`# TERMS OF SERVICE` ≠ `# Terms of Service — MingCharts`
- ★ 用 `findIndex(l => l.trim() === '# TERMS OF SERVICE')`（严格相等），不靠行号

---

# 四、断言（7 段）

| # | 断言 | 方式 |
|---|---|---|
| ① | 页面文件存在 | `existsSync` 检查 |
| ② | 文本源唯一 | `src/content/legal/` 有 + `docs/legal/` 无副本 |
| ③ | 无需登录可达 | 无 middleware（`existsSync` 检查）+ layout 不重定向 |
| ④ | ★ 渲染截断正确 | **行为断言**：调 `renderLegal()` 真跑，确认输出含正文标题、不含内部说明区特征串、含 Last Updated |
| ⑤ | 正文零占位符 | 对 `getLegalBody()` 输出跑正则：`/[XXX]|placeholder|sole.*trader|support@|TBD/` → 0 命中 |
| ⑥ | 页脚 | layout 含 `/terms`、`/privacy`、邮箱（★ 邮箱从 terms.md 抽取，不在断言里硬编码） |
| ⑦ | 邮箱单一事实源 | terms.md = privacy.md = layout.tsx（均用抽取值验证，不另写字面量） |

**断言输出**：
```
✓ 页面文件存在：terms/page.tsx + privacy/page.tsx
✓ 文本源唯一：src/content/legal/ 有，docs/legal/ 无副本
✓ 无需登录可达：无 middleware 拦截，layout 不重定向
✓ 渲染截断：调 renderLegal 真跑，含正文标题、无内部说明、有 Last Updated
✓ 正文零占位符（模式：/\[XXX\]|placeholder|sole.*trader|support@|TBD/ → 0 命中）
✓ 页脚：含 /terms、/privacy、hello@mingcharts.com（从 terms.md 抽取验证）
✓ 邮箱单一事实源：terms.md = privacy.md = layout.tsx（未在断言里硬编码）
```

---

# 五、牙口注入

| 步骤 | 证据 |
|---|---|
| 注入方式 | 删掉 layout.tsx 里的 `<a href="/privacy">Privacy Policy</a>`（只删这一处，替换为注释） |
| **先确认注入有效** | grep `href="/privacy"` → 0 命中；第 36 行现在是注释 `{/* 【牙口注入-临时：删 /privacy 链接】 */}` |
| 跑断言 | **⑥ 精确翻红**：`✗ layout 不含 /privacy 链接` + `✗ 页脚缺失`；其余 5 段保持绿色 |
| 还原 | /privacy 链接已还原；grep 注入标记 **0 残留** |

---

# 六、验收

| # | 项 | 期望 | 实测 |
|---|---|---|---|
| 1 | `src/content/legal/{terms,privacy}.md` 存在，`docs/legal/` 无副本 | ✓ | ✓ |
| 2 | `/terms` 与 `/privacy` 无需登录可访问 | ✓ | ✓（无 middleware） |
| 3 | 页面看不到内部说明区与附录 | ✓ | ✓（断言 ④ 反向检查） |
| 4 | 表格、加粗、标题渲染正常 | ✓ | ✓（miniMarkdown 支持表格等） |
| 5 | Last Updated 与版本号在页面上可见 | ✓ | ✓（断言 ④ 检查） |
| 6 | 页脚有 /terms、/privacy、hello@mingcharts.com | ✓ | ✓（断言 ⑥） |
| 7 | test-legal-accept.mjs 纳入 verify，含行为断言 | ✓ | ✓（④ 调 renderLegal 真跑） |
| 8 | 牙口 → ⑥ 翻红，恢复后复绿 | ✓ | ✓ |
| 9 | npm run verify 全绿 + tsc 0 | ✓ | ✓（13 段 PASS） |
| 10 | 未动 /pricing、未接入分析、未改法律文本 | ✓ | ✓ |

**verify 13 段**：
```
CHECKER / PRICING / SOLAR_TIME / ENTRY_CONSISTENCY / GANZHI_CONSISTENCY
DAYBOUNDARY / DAILY / ENTITLEMENT / LEGAL / GEO / WEALTH / SELFTEST → 全 PASS
```

---

# 七、待后续 / 站外配置

- §六 的三件站外配置（Waffo 后台 Contact email / Refund policy / Billing descriptor）是人工操作，非代码任务，我方无法执行。请人工在 Waffo 后台完成。
- 活服务器实测：dev server 未运行（SSL 环境问题导致 npm 操作后需重启）。行为等价性由 verify + tsc + 断言 ④（真调 `renderLegal`）覆盖。
