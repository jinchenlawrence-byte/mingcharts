# 部署到 Vercel（MingCharts）

> **背景**：项目【没有 git 仓库】，且本机未安装 git；
> **但 Vercel CLI 63.0.1 可用** → **可直接从本地目录部署，不需要 git** ✓
> **★★★ 而本文的重点不是部署步骤，是【如何确保密钥不被上传】** ✗

---

# 〇、★★★ 先说安全：`vercelignore` 挡不住 `.env`

**我方查证（2026-10-08）**：

> **[vercel/vercel Issue #14367]**
> 「`vercel deploy --prebuilt` **ignores `.vercelignore` and forces upload of `.env`**」

**→ 结论：不能依赖 `.vercelignore` 来保护 `.env.local`** ✗
**→ 而且 Vercel 的部署流程本来就会主动读取 `.env*` 文件**（用于配置环境变量）✗

**★★★ 我方自省**：我在这件事上写的"安全检查脚本次序"前后两轮给出了**相反结果** ✗
（一轮报"无 .env 会上传"，一轮报"`.env.local` 在列表里"）
—— **说明我的检查本身不可靠**。所以下面改用**不依赖任何 ignore 规则**的方案 ✓

---

# 一、本项目里必须保护的三个密钥

**来源：`.env.local`（键名已核实）**

```
★★★ SUPABASE_SERVICE_ROLE_KEY   —— 服务端专用，可绕过 RLS；
                                    泄漏 = 数据库完全敞开 ✗✗
★★  AI_API_KEY                   —— 会被盗刷（要花钱）
★★  ZHIPU_API_KEY                —— 同上
★   NEXT_PUBLIC_SUPABASE_ANON_KEY —— 本身就是公开的（可进浏览器），但仍不必上传
```

---

# 二、★★★ 推荐方案：从【干净副本目录】部署（源项目完全不动）

**核心思路**：**源目录的 `.env.local` 一个字都不动**；
另建一个**明确不含任何密钥**的副本，在副本里部署 ✓

## 第 1 步：复制出一个干净副本（排除依赖、缓存、临时文件与密钥）

```powershell
$src = "E:\ai-agent\stock1000\bazi-mvp"
$dst = "E:\ai-agent\stock1000\_deploy_mingcharts"

# 若目标已存在，先删（★ 确认路径无误再运行）
if (Test-Path $dst) { Remove-Item $dst -Recurse -Force }

robocopy $src $dst /E `
  /XD node_modules .next temp .geonames-cache docs scripts .trae .trae-cn out build .vercel `
  /XF .env .env.local

# robocopy 退出码 0–7 都算成功（≥8 才是失败）
"robocopy 退出码 = $LASTEXITCODE"
```

**★ 注意**：
- **不需要复制 `node_modules`** —— **Vercel 会在云端自己 `npm install`** ✓
- 所以副本只有约 **6 MB** ✓ 复制很快 ✓

## 第 2 步：★★ 部署前必须先验证副本里没有密钥（不要跳过）

**★★★ 判据只认【值的形态】，不认变量名** ✗ —— 我方在这上面连错三次，见 §六。

```powershell
$dst = "E:\ai-agent\stock1000\_deploy_mingcharts"

Write-Output "=== A. 副本里所有 .env* 文件（应【只有】 .env.example）==="
Get-ChildItem $dst -Recurse -Force -File -Filter ".env*" |
  ForEach-Object { "  {0}  ({1} 字节)" -f $_.FullName.Replace("$dst\",''), $_.Length }

Write-Output "`n=== B. ★ 按【值的形态】搜真实密钥（应全部 0 命中）==="
$valuePatterns = @(
  @('Supabase JWT (eyJhbGciOi…)', 'eyJhbGciOi[A-Za-z0-9_-]{10}'),
  @('OpenAI 风格 (sk-…)',        '\bsk-[A-Za-z0-9]{20}')
)
$leak = @()
foreach ($p in $valuePatterns) {
  # ★ 排除 package-lock.json（其 "integrity": "sha512-…" 会造成大量误报）
  $hits = Get-ChildItem $dst -Recurse -Force -File -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -ne 'package-lock.json' } |
    ForEach-Object { Select-String -Path $_.FullName -Pattern $p[1] -ErrorAction SilentlyContinue }
  "  {0,-30} {1}" -f $p[0], $(if ($hits) { "★ " + ($hits | Measure-Object).Count + " 命中" } else { "0 ✓" })
  if ($hits) { $leak += $hits }
}

Write-Output "`n=== C. 结论 ==="
if (Test-Path "$dst\.env.local") { "  ★★★ .env.local 在副本里 —— 【不要部署】" }
elseif ($leak.Count -gt 0)       { "  ★★★ 发现疑似密钥 —— 【不要部署】"; $leak | ForEach-Object { "    {0}:{1}" -f $_.Path.Replace("$dst\",''), $_.LineNumber } }
else                              { "  ✓✓✓ .env.local 不在副本，且无任何密钥形态命中 —— 可以部署" }
```

**★★★ 只有 C 段给出"可以部署"才继续。** 这是**肯定性证据**
（打印出实际的 `.env*` 文件名 + 逐项命中数），**不是"没有报错"** ✓（§8.6.7-一）

## 第 3 步：部署

```powershell
cd $dst
npx vercel login          # 首次：浏览器授权
npx vercel                # 部署到 Preview（会问项目名、目录等）
npx vercel --prod         # 部署到 Production
```

**★ 环境变量不要靠文件带上去** —— **要单独配**（见第 4 步）✓

## 第 4 步：在 Vercel 后台配置环境变量（7 个键）

```
Vercel → 项目 → Settings → Environment Variables
逐个添加（Environment 选 Production + Preview + Development）：

  NEXT_PUBLIC_SUPABASE_URL
  NEXT_PUBLIC_SUPABASE_ANON_KEY
  SUPABASE_SERVICE_ROLE_KEY        ← ★ 只选 Production/Preview，不要暴露到客户端
  AI_API_KEY
  AI_BASE_URL
  AI_MODEL
  ZHIPU_API_KEY

★ 值从本机 .env.local 里复制（【不要】把 .env.local 上传）
★ 配完后【重新部署一次】，环境变量才生效 ✓
```

## 第 5 步：绑定域名 mingcharts.com

```
Vercel → 项目 → Settings → Domains → 添加 mingcharts.com（以及 www.mingcharts.com）

★ Vercel 会给出去向值（CNAME 或 A 记录）
★★ 域名在 Cloudflare —— 添加时【必须设为 DNS only（灰云）】✗ 不要开代理
   否则 Cloudflare 的代理会与 Vercel 的证书/回源冲突
★ 主域用 apex（mingcharts.com），因为 Waffo 的 Business Details 填的就是它 ✓
```

## 第 6 步：验证 + 清理

```
① 访问 https://mingcharts.com 确认页面正常
② ★ 回 Vercel 后台，进那次 Deployment → 查看文件列表，
   确认【没有 .env.local】✓（这是最终确认）
③ ★★ 删除副本目录：
   Remove-Item "E:\ai-agent\stock1000\_deploy_mingcharts" -Recurse -Force
④ ★ 若第 ② 步发现异常 → 立即【轮换全部密钥】（Supabase / AI / 智谱）✗
```

---

# 三、★ 备选方案（更简单但次优）

```
直接把 .env.local 改名为 .env.local.bak → 部署 → 改回
★ 优点：步骤少
★ 缺点：源项目被临时改动；若中途中断，容易忘记改回，本地开发会莫名失败 ✗
→ 我方【不推荐】，仅在副本方案不可行时使用
```

**✗ 不要用 `vercel deploy --prebuilt`** —— 已知 bug 会**强制上传 `.env`** ✗

---

# 四、★ 关于 git（这次不做，但迟早要做）

```
现状：项目【无 git 仓库】，本机【未安装 git】
影响：· 无法用 diff 做回归比对（本项目一直因此受限）
      · 无法用 Vercel 的"push 即部署"
      · 代码没有异地备份
建议：部署打通之后（本周内）再做：
      ① 安装 git
      ② git init + 首次提交（.gitignore 已正确排除 .env* ✓）
      ③ 建 GitHub 私有仓库并推送
      ④ Vercel 改为 Import Git Repository（之后 push 自动部署）
★ 而且：有了 git，我这边做回归验证会可靠得多 ✓
```

---

# 六、★★★ 我方自省：在这个安全问题上我连错三次

**"检查副本里有没有密钥"这件事，我写了三个版本的判据，三版都误报** ✗

```
① 两轮脚本的排除条件写得不一样 → 同一件事给出【相反结论】
   （一轮报"无 .env 会上传"，一轮报"`.env.local` 在列表里"）
② 把 .env.example 里的占位符 your_zhipu_api_key_here 当成真密钥
   —— 因为我的正则只要求"值长于 20 字符"
③ 把代码里的 const AI_API_KEY = process.env.AI_API_KEY || '' 当成硬编码密钥
   —— 因为我的正则匹配【变量名 AI_API_KEY】
④ 后来改用"40+ 位 Base64 串"，又命中 372 条
   —— 全部是 package-lock.json 里的 "integrity": "sha512-…"（npm 依赖哈希）
```

**★★★ 共同根因**：**我用【变量名 / 泛化的长串】去判断"这是不是密钥"** ✗
**而密钥的本质特征是【值的形态】**：

```
· Supabase service role key → JWT，形如 eyJhbGciOi…
· OpenAI 风格 key           → sk-…
· ★ 且要【排除已知会产生误报的文件】（如 package-lock.json 的哈希）
```

**★ 这与我给 TraeCode 立的 §8.6.3「判据必须匹配【正确形态】，而非相近形态」是同一条** ——
**又是"我给别人立的规矩，自己没守住"。**

**★ 结论**：**关键不是"跑一次检查"，而是"检查本身也要被验证"** ✓
本次最终能定案，靠的是**换用值与形态的判据 + 逐项打出命中数** ✓

---

# 七、一句话

> **不能依赖 `.vercelignore` 保护密钥** —— 官方仓库有已知 bug
> （`vercel deploy --prebuilt` **强制上传 `.env`**）✗
>
> **所以用【干净副本目录】部署**：
> **源项目的 `.env.local` 一个字不动**，另建一个明确不含密钥的副本（约 6 MB，
> 不需要 node_modules —— Vercel 自己会装）✓
>
> **★★ 关键在于第 2 步：判据必须认【值的形态】（`eyJhbGciOi…` / `sk-…`），
> 而不是认变量名** ✗ —— 我方在此连错三次（详见 §六）
>
> **部署后还要再看一眼 Deployment 的文件列表** —— 确认没有 `.env.local`，
> 那才是最终确认 ✓
