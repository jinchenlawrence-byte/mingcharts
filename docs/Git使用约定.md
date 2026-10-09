# Git 使用约定（MingCharts）

> **建立**：2026-10-09，与首个基线提交同日
> **★ 为什么现在才建**：项目此前【没有版本控制】——
> 所有改动直接写在文件里，**没有历史、没有副本、无法回退**，
> 而 DeepSeek 侧的复核**全程无法 diff**，只能靠"读现状 + 写探针"✗
> **本文件的目的：让那件事不再发生。**

---

# 一、基线

```
仓库：E:\ai-agent\stock1000\bazi-mvp（master）
首个提交：455fbec
  标题：基线：体检 + 日运 + 法律页 + geo AI 修复
  内容：238 files changed, 57523 insertions(+) · 7.31 MB
  author：MingCharts <hello@mingcharts.com>
```

**★ 基线是【一个提交】而不是四个** —— 因为此前无版本控制，
四批改动在内容上已混在一起（如 `entitlement` 的词表被多批引用），
时间上可分辨但无法干净拆分 ✓

---

# 二、★ 每轮任务的固定节奏

```
① 开工前：确认工作区 = 基线
     git status --short        → 应为空（或只有一个明确的未提交项）
     git log --oneline -1      → 记下起点的 hash

② 执行方改代码

③ ★★ 改完、发回执之前：先提交（或至少把改动留在工作区不动）
     让 DeepSeek 侧能 diff 着复核 ← ★ 这是本约定存在的理由

④ DeepSeek 侧用 git diff 复核（逐行看改了什么），而不是只读现状 ✗

⑤ 复核通过 → 回执归档 → 该轮结束
```

**★★ 一句话**：**"未 commit" 不再是一句无对象的声明** ✓ ——
从今天起，**它意味着真的有一批改动可以对比** ✓

---

# 三、提交信息怎么写

**★ 沿用基线那种结构**（便于日后回溯）：

```
<一行标题：本轮做了什么>

<空行>

<背景：为什么做这个 —— 尤其是"由哪个问题触发">

<逐条改动：按文件或按主题分组>

verify：<几段全 PASS> · tsc <0 错误>

★ 待办 / 已知缺口（若有）
```

**★ 中文提交信息**：用 `git commit -F 消息文件` 传，
**不要用 `-m "中文"`**（Windows 下可能乱码）✓

```powershell
# 推荐做法
Set-Content _commitmsg.txt -Value $msg -Encoding UTF8
& 'E:\Git\cmd\git.exe' commit -F _commitmsg.txt
Remove-Item _commitmsg.txt
```

---

# 四、★ 必须排除的东西（已核）

| 项 | 状态 | 说明 |
|---|---|---|
| `.env*` | ✓ 已排除 | **例外**：`!.env.example`（模板、无真实值）✓ |
| `node_modules` | ✓ 已排除 | 444 MB |
| `.next` | ✓ 已排除 | 368 MB |
| `temp/` | ✓ 已排除 | 51 MB（本轮补入） |
| `.geonames-cache/` | ✓ 已排除 | 11 MB（本轮补入） |
| `*.tsbuildinfo` | ✓ 已排除 | |
| `.vercel` | ✓ 已排除 | |
| `next-env.d.ts` | ✓ 已排除 | Next.js 标准做法 |

**★★ 每次提交前，务必确认 `.env.local` 不在暂存区**：

```powershell
& 'E:\Git\cmd\git.exe' diff --cached --name-only | Select-String '^\.env'
# 期望：只出现 .env.example（或什么都不出现）
```

---

# 五、★ Windows 下的两个坑（我方踩过）

```
① 中文文件名会导致 PowerShell 报"路径中具有非法字符"✗
   → 修法：设 UTF-8 + 关掉 git 的路径转义
     [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
     & git config core.quotepath false

② LF → CRLF 会刷出大量 warning ✓ 那是正常的（不影响内容）
   → 若想消掉：git config core.autocrlf false（但要与现有文件保持一致）
     ★ 当前未设置，warning 无害，可不管 ✓
```

---

# 六、待定项

```
★ short-texts.txt（28.6 KB / 268 行）—— 第 02 轮的人工抽检清单，
  无脚本引用，疑似"手工生成后遗留"。
  处理选项：(a) 保留（作为抽检记录）(b) 移入 docs/ (c) 加进 .gitignore
  ★ 待用户拍板。
```

---

# 七、一句话

> **建立基线之前**：所有改动只存在于当前文件里 —— 没有历史、无法回退、
> **DeepSeek 侧无法 diff，只能靠探针反推"改了什么"** ✗
>
> **建立基线之后**：每一轮都能
> `git diff 起点..终点` **逐行看改了什么** ✓ ——
> 这既让复核更可靠，也让"改坏了"有得退 ✓
>
> **★ 所以每轮的固定动作是**：
> **开工前记下起点 hash，改完先提交（或保持工作区不动），再让复核方 diff** ✓
