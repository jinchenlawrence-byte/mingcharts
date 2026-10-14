# H6 验收 runbook：自定义 SMTP（Resend）与 QQ/163 投递

> **致**：项目方（本人操作 ✗ 10–20 分钟）
> **发自**：DeepSeek 侧（A 侧）
> **日期**：2026-10-14
> **依据**：`docs/上线检查清单.md` H6 · 27 号回执（H6 的由来）
> **★★ 本文只做一件事**：把「SMTP 已切到 Resend」从**配置完成**变成**验收通过** ✓
>
> ## 结论先行（★ 先看我核过什么、没核过什么 ✓）
> ```
> ✅ 已核实（A 侧查公共 DNS ✗ 2026-10-14 ✗ 客观事实）：
>    · 发信侧：send.mingcharts.com → send.forge.rmta.net
>              rsend.mingcharts.com → rsend-apne1.forge.rmta.net
>      （Resend「自定义 Return-Path」模式 ✗ 且已分区域 apne1 ✓）
>    · 收信侧：mx / mx2 / mx3.zoho.com 三条 MX 【原样未动】**✓
>    · 根域 SPF：v=spf1 include:zohomail.com ~all 【原样未动】**✓
>    ⇒ ★★★★★ 【收信与发信互不干扰**✓ —— 这是本次切换最容易出事的一点 ✓ 已排除 ✓
>
> ❓ 未核实（★ 只能在 Resend / Supabase 后台看 ✗ 本文第 1–4 步带你逐条确认 ✓）：
>    · Supabase SMTP 四项是否填对  · Sender 域用的是哪个域
>    · Resend 是否仍在 Sandbox    · 发信配额     · 真实投递（尤其 QQ/163）
> ```

---

# 〇、先理解一件事：为什么这次切换**不会**把域名邮箱搞坏

```
★★★ 很多人担心"接了 Resend 会不会影响 Zoho 收信"✗ —— 【不会**✓ 原因是分工不同 ✓：

  【收信】MX → Zoho         ← 谁来信、进哪个邮箱 ✓ 【与 Resend 无关】✓
  【发信】两条路并存（✗）：
     · 你本人 / Waffo 商务邮件 → 【Zoho SMTP】✗ From = hello@mingcharts.com
       ★ 这条【保持不动**（它已通过 SPF/DKIM/DMARC 三条实测 ✓ 见 14 号文档 §四 ✓）
     · 产品自动邮件（注册确认 / 密码重置）→ 【Resend SMTP】✗ From = 你要在 Supabase 里设的那个
       ★ 你这次加的两条 CNAME 【只服务这条路】✓

  ★★ 关键：Return-Path 用了【send 子域】（send.mingcharts.com ✓
     ⇒ 根域的 SPF（include:zohomail.com）【不需要】再加 Resend ✗ 【也不需要改**✓
     ⇒ ★★★★★ 【两条发信通道各自认证 ✗ 互不污染**✓✓
        （★★ 反例：若把 Resend 的 SPF include 直接塞进根域那条 SPF ✗
          【两条 SPF 记录会同时存在 ⇒ SPF 永久失败**✗ 域名的信全进垃圾箱 ✓
          —— 我方已实测根域【只有一条 SPF】✗ 且【没有】Resend 字样 ✓ 你没踩这个坑 ✓）
```

---

# 一、第 1 步：核 Supabase 的 SMTP 四项（★ 最容易错的是密码 ✓）

**位置**：Supabase Dashboard → 项目 `zvqjimyhusioyulhjjz` → **Authentication** → **Emails**（Notifications 分组）→ **SMTP Settings**

**Resend 官方给的值**（来源：https://resend.com/docs/send-with-supabase-smtp ✓）：

| 字段 | 必须填 | 常见错误 |
|---|---|---|
| **Host** | `smtp.resend.com` | 填成 `smtp.resend.dev` ✗ |
| **Port** | `465` | ★ 465 是 **SSL/TLS 隐式加密** ✗ 若后台另有 SSL 开关要选对 ✓ |
| **Username** | `resend` | ★ 填成你的 Resend 登录邮箱 ✗✗ |
| **Password** | **Resend 的 API Key**（`re_` 开头） | ★★★★★ **填成 Resend 账号登录密码** ✗ —— 这是本步第一大坑 ✗ 会直接认证失败 ✓ |
| **Sender email** | 见第 3 步的判断 | ★ 域选错会导致 DMARC 不对齐 ✓ |
| **Sender name** | 建议 `MingCharts` | 用户收件箱里显示的发件人名 ✓ |

```
★★ 核对方式（不打印密钥值 ✗ 遵守项目 §2-5）：
   · API Key 只报【前缀 + 长度】（如 re_ 开头 ✗ 共 N 位 ✓）
   · ★★ 若不确定当前填的是 Key 还是登录密码 ✗ 【直接重新生成一把新 Key 换上】✓
     （Resend → API Keys → Create ✗ 权限选 Sending access 即可 ✓ 用完可随时吊销 ✓）
```

- [ ] 1-1 Host / Port / Username 三项与上表一致
- [ ] 1-2 Password 是 **API Key**（`re_` 开头），不是登录密码
- [ ] 1-3 点 **Save** 后页面无报错

---

# 二、第 2 步：核 Resend 侧的域名状态与「是否仍在沙箱」

**位置**：Resend Dashboard → **Domains** ✗ 点开 `mingcharts.com`

- [ ] 2-1 域名状态是 **Verified**（不是 Pending / Not Started）
- [ ] 2-2 记录里能看到 `send` 与 `rsend` 两条且均为 ✅
- [ ] 2-3 ★★★ **账号是否已获生产权限（未在 Sandbox）**

```
★★★★★ 为什么这一条是【上架前最危险的静默项**✗：
   · Resend 在未获 production 权限时处于【Sandbox】态 ✗
     此态下【只能给你的账号自己的邮箱发信】**✗
   · ⇒ 用户注册 / 找回密码时 ✗ 邮件【发不出去】✗ 而站点【不报错**✗
   · ⇒ 表现是"用户说没收到邮件"✗ 你查 Resend 日志会看到被拒 ✓
★ 判断方式（任选其一 ✗ 以 Dashboard 实际显示为准 ✓）：
   · Resend 首页 / Domains 页有"Sandbox"或"Request production access"字样 ⇒ 仍在沙箱 ✗
   · Logs 里对非本账号邮箱的发送显示被拒绝 ⇒ 仍在沙箱 ✗
★★ 若仍在沙箱 ✗ 【先请求生产权限】（通常要求域名已验证 ✗ 你已完成 ✓）再往下走 ✓
```

- [ ] 2-4 记下 Resend 免费层配额实际显示值：日 ____ 封 / 月 ____ 封
      （★ 以 Dashboard 为准 ✗ 我方不引文档数字 ✓ 对照 Supabase 内置的 ~2 封/小时 ✗ 说明改善幅度 ✓）

---

# 三、第 3 步：定下 Sender 用哪个域（★ 决定第 5 步怎么判读 ✓）

```
★★★ 两种都可行 ✗ 但【必须先知道是哪种**✗ 否则出问题无从归因 ✓

【甲】Sender email = no-reply@**send**.mingcharts.com
   · 与 Return-Path 同域 ⇒ SPF 与 DKIM【都严格对齐】⇒ DMARC 稳 ✓
   · ★ 代价：用户看到的发件人地址带 send. 子域（可接受 ✗ 很多产品如此 ✓）
   · ★ 注意：`no-reply@send.mingcharts.com` 【不需要】真的存在邮箱 ✗ 只是发件标识 ✓
     （但【用户回信会 bounce】✗ 所以正文里务必给出 hello@mingcharts.com ✓ 现有模板已给 ✓）

【乙】Sender email = no-reply@mingcharts.com（根域）
   · 根域 SPF 【不含 Resend**（这正是我们没动它的原因 ✓
     ⇒ SPF 检查会【fail】（Return-Path 是 send 子域 ✗
     ⇒ 此时【只能靠 DKIM 签名**能否对齐来救 DMARC ✓
       · ★ 若 Resend 用【根域 mingcharts.com】签 DKIM ⇒ d=mingcharts.com ⇒ 与 From 对齐 ⇒ **DMARC 仍 PASS**✓
       · ★★ 若签名域是 `send.mingcharts.com` ⇒ d=send… ✗ 与 From(根域) 不严格对齐 ✗
         但 DMARC relaxed 模式下组织域相同（都 mingcharts.com）⇒ 【通常仍 PASS**✓
         —— ★★★ 而根域 DMARC 现为 `p=none`（只监测不处置 ✓ ⇒ 【即使不对齐也不会退信**✓
           （★ 代价：将来若把 DMARC 收紧到 quarantine/reject ✗ 【这条就会成为隐患**✓）
```

- [ ] 3-1 记录当前 Sender email 是【甲】还是【乙】：____________
- [ ] 3-2 若选【甲】✗ 确认 `send.mingcharts.com` 在 Resend 里是该域名的 Return-Path 子域（第 2 步已核 ✓）
- [ ] 3-3 ★ 若选【乙】✗ 在第 5 步务必重点看 **DKIM 的 d= 是哪个域**（见 §五 判读表 ✓）

---

# 四、第 4 步：核 redirectTo 与 allowlist 逐字一致（★ 静默失败项 ✓）

```
★★★ 重置密码邮件里的链接指向【Supabase 的 Redirect URL**✗ 而不是代码里的值 ✓
   ⇒ 两边不一致时 ✗ 用户点链接会落到错误地址（或失效页 ✓ 【但站点不报错**✗

★ 我方已核代码（`src/app/auth/page.tsx:18` ✗ 2026-10-14）：
   redirectTo = `${NEXT_PUBLIC_APP_URL}/reset-password`
   注释写明生产为 **https://www.mingcharts.com/reset-password**（★ 带 www ✓）
```

- [ ] 4-1 Supabase → **Authentication → URL Configuration** → Redirect URLs 里
      **逐字**存在 `https://www.mingcharts.com/reset-password`（协议 ✗ www ✗ 路径全对 ✓）
- [ ] 4-2 **Site URL** 是否也指向 `https://www.mingcharts.com`（不是 apex 根域 ✗ 不是 vercel.app ✓）
- [ ] 4-3 顺手确认 Vercel 生产环境 `NEXT_PUBLIC_APP_URL` 与上面一致
      （★ 参考资料里两种写法都出现过：上线检查清单 B1 写 apex ✗ 代码注释写带 www ✗
        ★★ 【以「邮件链接真的能打开」为准】✗ 第 5 步会替你验到 ✓）

---

# 五、第 5 步：★★★★★ 真实投递测试（本 runbook 的核心）

```
★★★ 发 4 封真实的【忘记密码】邮件 ✗ 分别到 4 个不同邮箱服务：
     Gmail · Outlook(或 Hotmail) · 【QQ】· 【163】
   ★ 做法：站点 /auth → 忘记密码 → 填目标邮箱 → 发信 → 到该邮箱查看
   ★★ 为什么必须含 QQ / 163：这正是【当初换掉 Supabase 内置服务的理由**✓
     —— 若 QQ/163 进垃圾箱 ✗ 【上架前必须解决**✗ 别等用户投诉 ✓
   ★ 每封邮件【只发一次】✗ 避免同时触发 Resend 频率限制而误判 ✓
```

| # | 邮箱 | 到没到（收件箱/垃圾箱/没到） | 链接能打开吗 | 备注 |
|---|---|---|---|---|
| 5-1 | Gmail | ☐ 收件箱 ☐ 垃圾箱 ☐ 没到 | ☐ 能 ☐ 否 | ★ 这封要做 §五-b 头部检查 |
| 5-2 | Outlook / Hotmail | ☐ 收件箱 ☐ 垃圾箱 ☐ 没到 | ☐ 能 ☐ 否 | |
| 5-3 | **QQ 邮箱** | ☐ 收件箱 ☐ 垃圾箱 ☐ 没到 | ☐ 能 ☐ 否 | ★★ 重点 |
| 5-4 | **163 邮箱** | ☐ 收件箱 ☐ 垃圾箱 ☐ 没到 | ☐ 能 ☐ 否 | ★★ 重点 |

## 5-b ★★ Gmail 那封必须做「认证三行」检查（§8.6.7：判据要能证伪）

```
① Gmail 打开该邮件 → 右上「⋮」→「显示原始邮件 / Show original」
② 看顶部摘要三行（或下方 Authentication-Results 一行）：
```

| 检查项 | 期望 | 含义 |
|---|---|---|
| **SPF** | `PASS`（【甲】方案）／`FAIL`（【乙】方案且域名不匹配） | Return-Path 的域是否被授权发信 |
| **DKIM** | `PASS` ✗ 且 `d=` 记下来：__________ | 签名域 ⇒ 决定与 From 是否对齐 |
| **DMARC** | ★★★★★ `PASS` | 前两者【至少一个对齐】⇒ 最终结论 ✓ |

```
★★★ 判读规则（★ 先看 From 的域 ✗ 再看 d= ✗ 别只看 PASS/FAIL 三个字 ✓）：
   · DMARC PASS ⇒ 可放行 ✓（即使 SPF fail ✗ 只要 DKIM 对齐 ✓）
   · DMARC FAIL ⇒ ★ 必须处理 ✗ 否则 Gmail/Outlook 迟早进垃圾箱 ✓
        → 首选改法：【把 Sender email 改成甲方案（send 子域）】✗ 最小改动 ✓
   · ★ 顺带看一眼 `Return-Path / envelope-from` 是不是 `…@send.mingcharts.com`
     ⇒ 是 ⇒ 说明你加的那两条 CNAME 真的在生效 ✓
```

- [ ] 5-5 记录三行结果：SPF=____ · DKIM=____（d=____）· DMARC=____
- [ ] 5-6 ★ 点开链接 → 能进入重置页 → 设新密码 → 用新密码登录成功
      （★ 这一步同时把 **27 号那次欠的人工验收** 一起补掉了 ✓）

---

# 六、失败时的排查树（★ 按症状定位 ✗ 不要乱试 ✓）

```
【症状 A】Supabase 报 SMTP 认证失败 / 535 / Invalid login
   → 第 1 步：Password 必须是 Resend【API Key】✗ 不是登录密码 ✓
   → Host 必须 smtp.resend.com ✗ Username 必须就是 resend ✓

【症状 B】Supabase 显示发送成功 ✗ 但用户没收到
   → Resend Dashboard → Logs ✗ 查这一封的状态 ✓
       · Status=delivered 但收件人没看到 ⇒ 【对方垃圾箱 / 被对方拦截**✗ 不是你的配置错 ✓
       · Status=bounced ⇒ 收件地址无效 ⇒ 换邮箱重试 ✓
       · 【没有这条日志】⇒ 请求根本没到 Resend ⇒ Supabase 侧配置问题（回 A ✓）
       · 日志显示被拒 + 提到 sandbox/own email ⇒ ★ 第 2 步 2-3 【仍在沙箱**✓

【症状 C】Gmail 里 DMARC=FAIL
   → 先记 DKIM 的 d= 是什么：
       · d=mingcharts.com ⇒ 说明签名域与 From 一致 ✗ 那 DMARC 应为 PASS ⇒ 复查是否看错邮件 ✓
       · d=send.mingcharts.com 且 From=根域 ⇒ 改为【甲方案】（Sender 用 send 子域 ✓
   → ★ 不要在根域 SPF 里加 Resend ✗ 那会造成【两条 SPF】⇒ 全线失败 ✓✓

【症状 D】QQ / 163 收不到或进垃圾箱 ✗ 但 Gmail 正常
   → ★ 这属于【新域名的发信信誉】**问题 ✗ 不是配置错 ✓
   → 可做的事：① 先确保 DMARC=PASS（第 5-b 步 ✓）
                ② 邮件正文避免全链接、避免"验证码"等高压词（现有模板可先照用 ✓
                ③ ★★ 若上架前仍不达标 ⇒ 【考虑"注册不强制验证邮箱"**或客服人工兜底 ✓
                   —— ★ 这是产品决策 ✗ 【请拍板**✗ 不要默认它自己会好 ✓

【症状 E】链接点开是 404 / 跳到首页 / 报 "invalid or expired"
   → 第 4 步：Redirect URLs 与 Site URL 与代码里的 URL 【逐字比对**✓
   → ★ 另注意：重置链接【单次有效且有时效】**✗ 先点最新那封 ✓
```

---

# 七、临时记录区（★ 本项所需数据 ✗ 供回写 H6 用 ✓）

```
核对时间：____________
Resend：域名状态 ______ ｜ 是否沙箱 ______ ｜ 配额 日____ / 月____
Supabase SMTP：Host ______ Port ____ User ______ Password=API Key? 是/否
Sender email：__________________（方案 甲 / 乙）
DNS 三行（Gmail）：SPF ______ ｜ DKIM ______（d=____________）｜ DMARC ______
投递结果：Gmail ____ ｜ Outlook ____ ｜ QQ ____ ｜ 163 ____
★ 遗留问题：______________________________________________
```

---

# 八、一句话

> **★★★★★ 你这次切换【选对了做法**✓：用 send 子域做 Return-Path ✗ **根域 Zoho 的 MX/SPF 一行没动**✓
> **—— 于是「产品自动发信（Resend）」与「你对外的商务邮箱（Zoho）」各走各的认证 ✗ 互不污染 ✓**
>
> **★★★ 而剩下的都不是"配置"问题 ✗ 是【验收**✗ 只有三件必须真做 ✓：**
> **① SMTP 密码填的是 API Key（不是登录密码）**
> **② Resend 不在 Sandbox（否则用户的信【静默发不出去】✓**
> **③ 真发 4 封 ✗ 亲眼看 QQ / 163 到没到 ✗ 并确认 DMARC=PASS**✓
>
> **★ 这三件做完 ✗ H6 才算关闭 ✗ 上架前只剩【路径②】那一件 ✓**
