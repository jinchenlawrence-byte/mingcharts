# HANDOFF-BACK-上线前全站体检回执

> 致 DeepSeek 侧：本回执对应 `HANDOFF-上线前全站体检.md`，按项目交接惯例（六段式＋文件清单）回传。请复核。

## 一、结论

**任务③ 上线前全站体检已完成。六类扫描全部执行，每类给出命中数+扫描模式；明确问题已修，拿不准的列待定并说明理由；`scripts/test-site-audit.mjs` 纳入 verify，含 4 条断言（含行为断言）；牙口注入确认有效（删 export 关键字 → ① 精确翻红，恢复后复绿）；verify 13 段全绿、tsc 0 错误。**

- 未动法律文本 / 价格表 / 业务逻辑 / 视觉 ✓
- 未与另两份任务书改同一个文件 ✓（① 改 layout/terms/privacy；② 改 daily/branchRelations；③ 改 shengxiaoData/ai-*/bazi page/test-site-audit，无重叠）
- 未 commit，等待用户指令

## 二、逐条回应（六类扫描）

### 2.1 metadata 齊全性

**扫描模式**：遍历 `src/app/**/page.tsx`，正则 `/export const metadata|export async function generateMetadata|export function generateMetadata/`

**命中数**：25 个 page.tsx，18 个含 metadata/generateMetadata，7 个缺（全为 'use client' 页面，白名单待定）。

**处置**：
- **已修 4 个**：bazi/page.tsx 补 `export const metadata`；bazi/[year]、[year]/[month]、[year]/[month]/[day] 补 `generateMetadata`（动态路由标准做法，从 params 生成 title/description）
- **待定 7 个**：'use client' 页面（page/chart/charts/hemun/ziwei/geo/auth）—— 不能直接 `export const metadata`，需建 `layout.tsx` 包装（结构调整，接近视觉/架构决策）

### 2.2 ★ 红线词与依据分级

**判据复用**：`src/lib/ai-check.ts` 的 `FORBIDDEN_WORDS = ['大吉','大凶','积极进取','突破性进展','必','一定','注定']` + `findForbidden(text, strictBi=false)`

**扫描模式**：Grep 用户可见文案（shengxiaoData/jieqiData 等）

**命中数**：5 行命中"必"字（2 真违规+3 注释/prompt 禁词清单）

**处置**：
- **已修 2 处**（用户可见，"务必"含"必"字，按 aiHemun.ts:43 范例"务必注意→宜注意"）：
  - `shengxiaoData.ts:66` "务必做好风险储备" → "宜做好风险储备"
  - `shengxiaoData.ts:281` "合同账目务必看清" → "合同账目宜看清"
- **不修 3 处**（注释/prompt 禁词清单，非用户可见）：ai-check.ts:4 定义本身；aiAnalysis.ts:282-283、aiHemun.ts:42-43、aiZiwei.ts:35-36 prompt 注释
- **"切忌"**：jieqiData.ts:104、shengxiaoData.ts:40/66 出现，但"切忌"不在 FORBIDDEN_WORDS 判据里（劝诫词非绝对化凶吉断言），不命中

### 2.3 ★★ 占位符 / TODO / 调试残留

**扫描模式**：
- ① 占位符与待办：`TODO|FIXME|XXX|待补|待定|placeholder|Lorem|TBD`（排除注释行）
- ② 调试残留：`console\.(log|debug|warn)|debugger|alert\(`
- ③ 假数据 / 模拟值：`MOCK_|mock|dummy|fake|测试用|example\.com`

**命中数**：
- placeholder 31 处：全在 `<input placeholder="...">`，正常输入框提示，非"待补"占位符 — 不修 ✓
- "待定" 1 处：`api/daily/route.ts:40` **注释**里（内部说明，非用户可见）— 不修 ✓
- MOCK_ 4 处：都在 entitlement 链路的"模拟流水排除逻辑"，是必要代码 — 不修 ✓
- console.log 8 处、console.warn 7 处、alert( 7 处、debugger 0
- example.com 0、debugger 0

**处置**：
- **已修 8 处 console.log**（调试输出，按 §2.3 判据删；保留 console.error/warn 必要运行时日志）：
  - ai-check.ts:105（重试日志）、aiAnalysis.ts:269/298（成功+替换日志）、aiGeo.ts:207（成功日志）、aiHemun.ts:140/170（成功+替换日志）、aiZiwei.ts:195（成功日志）、supabase.ts:35（配置日志）
  - console.warn 7 处保留：都是"未配置 AI_API_KEY 回退规则版"等必要运行时警告
- **待定 7 处 alert(**（用户可见交互反馈，替换需 UI 设计决策 toast/inline/Modal，接近视觉设计禁区，加白名单待定）：charts/page.tsx:62、geo/page.tsx:313/316、page.tsx:53/56、ziwei/page.tsx:134/137

### 2.4 ★★★「承诺了却不存在」的功能描述（本任务重点）

**扫描模式**：Grep `你可以|支持|随时|在账户|在设置|订阅管理|取消订阅|账户设置|个人中心|管理订阅|不限次数` + 逐条读关键页面（pricing/mingshu/chart/page/daily/auth/charts）核对文案与代码

**命中数**：4 处"承诺了却不存在"或语义不清

**处置**（按 §三"明显与实际不符的文案 → 报告 + 给两种修法，不自行选"）：

| 位置 | 文案 | 兑现点 | 处置 |
|---|---|---|---|
| `chart/page.tsx:457` | "✓ 会员已生效，命书不限次数" | SUBSCRIPTION_GRANTS 不含 fatebook grant；会员不含报告（pricing.ts:96 + pricing/page.tsx:130 FAQ 明确） | **待定**：(a) 删"命书不限次数"改"会员已生效"（诚实）；(b) 给会员加 fatebook grant（若要会员含命书） |
| `chart/page.tsx:460` | "或 开通会员 {MEMBER_MONTHLY_PRICE}/月 不限次数" | 同上 | **待定**：同上两种修法 |
| `MingShuContent.tsx:170` | "高频用户可选 会员订阅 /月（不限次数）" | 同上 | **待定**：同上两种修法 |
| `pricing/page.tsx:115` | 会员卡片 cta "开通会员" href="/pricing" | 按钮承诺"开通会员"却指回当前页 /pricing（到了该卡片看到的是"即将推出"灰按钮） | **待定**：(a) 改文案为"了解会员"（诚实）；(b) 改 href 指向真实开通入口（若存在） |

**典型案例核对**（交接书 §2.4 给的样板"在账户设置里取消订阅"）：
- 已扫 `账户设置|订阅管理|取消订阅` 等：src 全量 0 命中（terms.md 已由 ① 任务修为"仅邮件取消"）
- 已扫"在……里可以"模式：pricing FAQ/MingShuContent FAQ 逐条核对，"购买后可反复查看"有 charts 页面兑现 ✓、"30 秒生成"有 AI 链路兑现 ✓、"自动回退规则引擎"有 withComplianceRetry 兑现 ✓

### 2.5 死链 / CTA 可达性

**扫描模式**：
- 静态：抓 `href="/[^"]*"` 与 `src/app/**/page.tsx` 实际路由对照
- 行为：import 4 个服务端 page.tsx（terms/privacy/daily/bazi）调 default 验证返回 JSX

**命中数**：
- 静态：16 个唯一站内 href，0 死链 ✓
- 行为：4 个服务端 page.tsx import 调用全部返回 JSX，0 抛错 ✓

**处置**：无死链，无需修

### 2.6 页面文案与 SKUS 的一致性

**扫描模式**：
- 价格：复用 test-pricing-accept.mjs（裸数字金额 `amount:/price:` + 旧形态 `¥\d`）
- 非价格数字：Grep `万字|十大板块|每月.*次|180.*条|六大权益|不限次数`

**命中数**：
- 价格：test-pricing-accept 已覆盖 src 全量，0 命中 ✓
- "十大板块"：MingShuContent.tsx:12-22 与 pricing/page.tsx:42-52 SECTIONS 均 10 项；aiAnalysis.ts:19 也是 10 板块 — 一致 ✓
- "180 条"：daily-personal.ts/daily-signs.ts 注释 180 条，测试已验证（10×6×3 / 60×3）— 一致 ✓
- "不限次数" 3 处：已识别为 2.4 "承诺了却不存在"问题
- "万字"：多处出现（MingShuContent/pricing/layout/paipan route）

**处置**：
- "不限次数" 3 处：见 2.4 待定
- **"万字"待定**：AI 解读每板块≥50字×10板块≥500字，加岁运/相似命例，"万字"是营销文学化表达。实际报告字数与"万字"宣传是否一致需统计，属产品文案决策

## 三、原始日志（关键段）

### verify 末段（13 段全 PASS）
```
CHECKER_ACCEPT_PASS
PRICING_ACCEPT_PASS
SOLAR_TIME_PASS
ENTRY_CONSISTENCY_PASS
GANZHI_CONSISTENCY_PASS
DAYBOUNDARY_ACCEPT_PASS
DAILY_ACCEPT_PASS
ENTITLEMENT_ACCEPT_PASS
LEGAL_ACCEPT_PASS
GEO_ACCEPT_PASS
WEALTH_ACCEPT_PASS
SITE_AUDIT_PASS   ← 本轮新增
SELFTEST_PASS
```

### test-site-audit.mjs 输出
```
—— ① metadata 齊全 ——
✓ metadata 齊全：18 个 page.tsx 含 metadata/generateMetadata；7 个 use client 白名单（待定建 layout.tsx）
—— ② 无调试残留（console.log/debugger/alert(）——
✓ 无调试残留：console.log 0、debugger 0、alert( 0 命中（7 处白名单待定）
—— ③ 无用户可见占位符（TODO/FIXME/Lorem/TBD，不扫 input 的 placeholder 属性）——
✓ 无用户可见占位符：扫描 77 个 .ts/.tsx 字符串字面量，TODO/FIXME/Lorem/TBD/待补/待定 0 命中
—— ④ 站内链接可达 ——
✓ 静态：16 个唯一站内 href 全部可达（对照 src/app 下 page.tsx）
✓ 行为：import 4 个服务端 page.tsx 调 default 全部返回 JSX（不抛错）
—— 牙口自检（守护扫描器）——
✓ 牙口自检：console.log/debugger/alert(/TODO 判据样本均能检出
SITE_AUDIT_PASS
```

### 牙口注入确认（§六 #6）
- 注入方式：bazi/page.tsx line 3 `export const metadata = {` → `const metadata = {`（删 export 关键字，文本几乎不变、行为变坏——metadata 不再导出，Next.js 不识别，① 断言抓不到 `export const metadata`）
- **先确认注入有效**：grep `export const metadata` 在 bazi/page.tsx → 0 命中；line 3 现在是 `const metadata = {  // 【牙口注入-临时：删 export 关键字】`
- 跑断言：**① 精确翻红** `✗ 缺 metadata：src/app/bazi/page.tsx` + `✗ metadata 缺失 1 处`；其余 ③④ 保持绿色
- 还原：`export const metadata` 已还原；grep 注入标记 **0 残留**
- 复绿：SITE_AUDIT_PASS

### tsc
```
$ npx tsc --noEmit
（无输出，0 错误）
```

## 四、承认缺项

1. **2.4 "承诺了却不存在" 扫描覆盖度**：我扫了 pricing/mingshu/chart/page/daily/auth/charts 等主要面向用户页面，以及 Grep `你可以|支持|随时|不限次数|账户设置` 等承诺性词汇。但未穷举所有内容页（bazi/[year] 等动态路由、shengxiao/[animal]、jieqi/[name]、jieri/[slug]、article/[slug]）。这些动态路由由数据驱动，承诺性文案风险低，但未逐条核对。**未发现不一致，但未加专门断言**——列待定。

2. **2.5 行为断言覆盖度**：④ 行为断言只 import 了 4 个服务端 page.tsx（terms/privacy/daily/bazi）。'use client' 页面（chart/charts/hemun/ziwei/geo/auth/page）未做行为断言（import 会触发 hooks，不能直接调 default）。这些页面的可达性只靠静态检查（路由文件存在性）覆盖，未"真的取一次"。**风险**：'use client' 页面可能存在"文件存在但 import 抛错"的缺陷，本断言抓不到。列待定是否要启动 dev server HTTP GET 补行为断言。

3. **2.6 "万字"未实测**：未真实生成一份命书报告统计字数，"万字"是否名副其实只是按 aiAnalysis.ts 每板块≥50字×10 推算。属产品文案决策，未自修。

## 五、待拍板

| 项 | 问题 | 我的倾向 |
|---|---|---|
| 1 | 会员"不限次数"3 处（chart/page.tsx:457/460、MingShuContent.tsx:170）承诺会员可不限次数解锁命书，但 SUBSCRIPTION_GRANTS 不含 fatebook grant | 倾向 (a) 删"命书不限次数"改"会员已生效"（诚实，与权益表对齐）。理由：会员设计本就不含报告，改文案比改权益表风险低。 |
| 2 | pricing/page.tsx:115 会员卡片 cta "开通会员" href="/pricing"（指回当前页） | 倾向 (a) 改文案为"了解会员"（诚实）。理由：会员功能"即将推出"，按钮该指向信息而非假开通入口。 |
| 3 | "万字"营销表达是否要改为更精确的"深度详批" | 倾向不改。"万字"是文学化表达，实际报告确实有深度（10 板块×50字+岁运+命例），不构成虚假宣传。但若法务认为风险，可改"深度详批"。 |
| 4 | 7 处 alert( 替换方案 | 倾向改内联错误提示（复用已有 setPayError/setMessage state），但不引入新 UI 组件。需用户确认是否接受这种改法，还是要统一 toast 方案。 |
| 5 | 7 个 'use client' 页面补 metadata 是否要建 layout.tsx | 倾向建。每个 'use client' 页面同目录建 layout.tsx（服务端组件）放 metadata，不改视觉。但会新增 7 个文件，需用户确认是否值得。 |
| 6 | 2.4/2.5 行为断言是否要补动态路由页面 + 'use client' 页面 | 倾向增量补。动态路由可用 generateStaticParams 取一个样本参数调 default；'use client' 可启动 dev server HTTP GET。但会增加测试复杂度与运行时间。 |

## 六、文件清单

### 新建
- `scripts/test-site-audit.mjs` —— 4 条断言（① metadata 齊全/② 无调试残留/③ 无用户可见占位符/④ 站内链接可达含行为断言）+ 牙口自检
- `docs/交接记录/15-法律页与合规/HANDOFF-BACK-上线前全站体检回执.md` —— 本回执

### 修改
- `src/lib/shengxiaoData.ts` —— 2 处"务必"→"宜"（line 66/281，红线词判据）
- `src/lib/ai-check.ts` —— 删 line 105 console.log（重试日志）
- `src/lib/aiAnalysis.ts` —— 删 line 269/298 console.log（成功+替换日志）
- `src/lib/aiGeo.ts` —— 删 line 207 console.log（成功日志）
- `src/lib/aiHemun.ts` —— 删 line 140/170 console.log（成功+替换日志）
- `src/lib/aiZiwei.ts` —— 删 line 195 console.log（成功日志）
- `src/lib/supabase.ts` —— 删 line 35 console.log（配置日志）
- `src/app/bazi/page.tsx` —— 补 `export const metadata`（title+description）
- `src/app/bazi/[year]/page.tsx` —— 补 `generateMetadata`（按 year+ganZhi+zodiac 生成）
- `src/app/bazi/[year]/[month]/page.tsx` —— 补 `generateMetadata`（按 year+month+ganZhi+zodiac 生成）
- `src/app/bazi/[year]/[month]/[day]/page.tsx` —— 补 `generateMetadata`（按 year+month+day 生成）
- `package.json` —— verify 脚本新增 `tsx scripts/test-site-audit.mjs`（在 test-wealth-accept 后、test-regression 前）

### 验收命令
```
npm run verify   # 13 段全 PASS（含 SITE_AUDIT_PASS）
npx tsc --noEmit # 0 错误
```

未 commit，等待指令。

---

# 七、拍板执行（回执补充 · 2026-10-09）

> 用户复核后回复「6项同意你的倾向」，以下为按拍板结果执行的记录。扫描判据与命中数见上文第二~四段，此处只记增量改动与验收。

## 7.1 逐项执行

### 拍板1：会员"不限次数"3 处（原 2.6 发现）✓ 已修
| 位置 | 改前 | 改后 |
|---|---|---|
| chart/page.tsx:457 | ✓ 会员已生效，命书不限次数 | ✓ 会员已生效 |
| chart/page.tsx:460 | 开通会员 {价}/月 不限次数 | 开通会员 {价}/月（删"不限次数"） |
| mingshu/MingShuContent.tsx:170 | 会员订阅 {价}/月（不限次数） | 会员订阅 {价}/月（订阅权益见价目页） |

理由：SUBSCRIPTION_GRANTS 不含 fatebook，订阅不含命书报告（pricing FAQ 明示）；三处均与权益表矛盾，属「承诺了却不存在」。

### 拍板2：pricing 会员卡 cta（原 2.6 发现）✓ 已修
- pricing/page.tsx:115 `cta.text: '开通会员'` → `'了解会员'`。
- 复核发现：membership 卡实际渲染的是「即将推出」灰块（pricing/page.tsx:232-236），cta 配置当前**不渲染**——此改动为纯配置修正，零行为影响。

### 拍板3："万字"营销表达 ✓ 不改（维持倾向）

### 拍板4：7 处 alert( → 内联错误提示 ✓ 已修
全部复用各页已有/新增 error state（与 chart 页 payError 同型）：
| 文件 | 处数 | 方式 |
|---|---|---|
| src/app/page.tsx | 2 | 新增 `error` state；提交时 `setError('')`；表单内按钮下方红字提示 |
| src/app/charts/page.tsx | 1 | 新增 `error` state；删除成功时清错；列表头部红字横幅 |
| src/app/geo/page.tsx | 2 | 新增 `error` state；提交时清错；表单按钮下方红字提示 |
| src/app/ziwei/page.tsx | 2 | 同上 |

alert( 全站现 0 命中（原 7 处白名单已删除）。

### 拍板5：'use client' 页 metadata ✓ 已修（6 个 layout.tsx，首页无须建）
- **新建 6 个**：chart/charts/hemun/ziwei/geo/auth 各建 `layout.tsx`（服务端组件，`export const metadata` + `return children`），title/description 按各页功能撰写。
- **首页 src/app/page.tsx 不建文件**：根 `src/app/layout.tsx` 已有 `metadata.title.default`（"八字命理 - 免费八字排盘与命书详批"），首页自然继承——为首页单独包装需引入路由组（route group），属过度调整，故不建。
- 断言①已改写：页自身无 metadata 时，检查**同级 layout.tsx**（`page.tsx`→`layout.tsx` 同目录替换，首页命中根 layout 的同一规则）；现输出"18 自带 + 7 经 layout 提供，0 缺失"。

### 拍板6：行为断言增量补 ✓ 已补
- **动态路由 3 个**：`/bazi/1990`、`/bazi/1990/05`、`/bazi/1990/05/08` —— 真实调用 default，`params: Promise.resolve({...})`（Next 15+ 约定），验证返回 JSX。
- **use client 7 页**：import 验证模块可加载、default 为函数（hooks 不可在组件渲染外调用，不执行组件体）；7 页全部通过（tsx 解析 `@/` 路径别名正常）。

## 7.2 断言更新（test-site-audit.mjs）
- ①：白名单删除 → 改为「自身 metadata 或同级 layout.tsx」判定，0 白名单。
- ②：ALERT_WHITELIST 删除 → 严格 0 alert(。
- ④：行为断言扩为「7 服务端页（含 3 动态路由）真实调用 + 7 use client 页 import 检查」。
- 文件头注释同步更新（去掉"待定"字样）。

## 7.3 牙口注入（两轮，均为「文本不变、行为变坏」式，注入前确认有效）
| 注入 | 改法 | 结果 |
|---|---|---|
| A | chart/layout.tsx 删 `export` 关键字（metadata 不再导出） | ① 精确翻红：`✗ 缺 metadata（自身与同级 layout.tsx 均无）：src/app/chart/page.tsx` → 恢复复绿 |
| B | ziwei/page.tsx `setError('网络错误')` 改回 `alert('网络错误')` | ② 精确翻红：`✗ src/app/ziwei/page.tsx:139 alert( 调试残留` → 恢复复绿 |

## 7.4 验收证据
```
npx tsx scripts/test-site-audit.mjs
  ① metadata 齊全：18 自带 + 7 经 layout，0 缺失
  ② console.log 0、debugger 0、alert( 0 命中（0 白名单）
  ③ 占位符扫描 83 个 .ts/.tsx，0 命中
  ④ 静态：16 个站内 href 全可达；行为：7 服务端页（含 3 动态路由）+ 7 client 页全过
  牙口自检：判据样本均能检出
  SITE_AUDIT_PASS

npm run verify   # 14 段 && 链全通过（含 tsc --noEmit 0 错误，末段 regression SELFTEST_PASS）
```

## 7.5 文件清单（拍板执行增量）
**修改**：src/app/chart/page.tsx、src/app/mingshu/MingShuContent.tsx、src/app/pricing/page.tsx、src/app/page.tsx、src/app/charts/page.tsx、src/app/geo/page.tsx、src/app/ziwei/page.tsx、scripts/test-site-audit.mjs
**新建**：src/app/chart/layout.tsx、src/app/charts/layout.tsx、src/app/hemun/layout.tsx、src/app/ziwei/layout.tsx、src/app/geo/layout.tsx、src/app/auth/layout.tsx
**回执补充**：本文件第七段

未 commit，等待指令。
