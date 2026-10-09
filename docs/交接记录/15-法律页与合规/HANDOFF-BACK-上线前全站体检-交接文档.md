# HANDOFF-BACK-上线前全站体检-交接文档

> 致 DeepSeek 侧：本档为「上线前全站体检」**全周期交接总档**，合并「首轮体检」与「拍板执行」两轮内容，作为本任务唯一权威交接档。过程性历史档见文末「十、关联文档」。
> 执行日期：2026-10-09。未 commit，等待用户指令。

## 一、结论

**审计型任务全流程完成**：六类扫描全部执行（每类给出判据+命中数）；首轮修明确项（2 处红线词、8 处 console.log、4 个 bazi metadata）；6 项待定经用户拍板（「6项同意你的倾向」）后全部执行完毕；扫描断言升级为 0 白名单；三轮牙口注入均为「文本不变、行为变坏」式且注入前确认有效、精确翻红、恢复复绿；`npm run verify` && 链全通过（tsc + 13 个测试脚本，含本任务新增 SITE_AUDIT_PASS），tsc 0 错误。

- 未动法律文本 / 价格表 / 业务逻辑 / 视觉 ✓
- 未与任务①（法律页：layout/terms/privacy）任务②（日运：daily/branchRelations）改同一个文件 ✓
- 全部改动未 commit ✓

## 二、任务背景与范围

| 项 | 内容 |
|---|---|
| 任务书 | `HANDOFF-上线前全站体检.md`（审计型：先报告 → 修明确无疑的 → 有疑列待定不修） |
| 执行轮次 | 首轮体检（六类扫描+修明确项+断言）→ 用户复核拍板 → 拍板执行轮 |
| 硬要求遵守 | ① 每轮独立回执不攒批 ② 牙口注入用「文本不变、行为变坏」改法且注入前确认有效 ③ 行为断言真调用函数（动态路由真传 params Promise）④ 每条扫描打出命中数+模式 ⑤ 拿不准列待定（本轮 6 项待定全部经用户拍板后才动手） |

## 三、六类扫描执行记录（判据 + 命中数 + 终态）

### 3.1 metadata 齊全性
- **判据**：遍历 `src/app/**/page.tsx`，正则 `/export const metadata|export async function generateMetadata|export function generateMetadata/`（拍板后升级：自身无则查同级 layout.tsx）
- **命中**：25 个 page.tsx，首轮 18 自带 + 7 缺（全为 'use client' 页）
- **终态**：bazi 4 页补自身 metadata/generateMetadata；6 个 'use client' 页建 layout.tsx（拍板5）；首页由根 layout `title.default` 覆盖。**0 缺失（18 自带 + 7 经 layout）**

### 3.2 ★ 红线词与依据分级
- **判据**：复用 `ai-check.ts` FORBIDDEN_WORDS（大吉/大凶/积极进取/突破性进展/必/一定/注定）+ findForbidden(strictBi=false)
- **命中**：5 行命中"必"字
- **终态**：修 2 处用户可见"务必"→"宜"（shengxiaoData.ts:66/281）；3 处不修（prompt 禁词清单/注释，非用户可见）

### 3.3 占位符 / TODO / 调试残留
- **判据**：① 占位符 `TODO|FIXME|XXX|待补|待定|placeholder|Lorem|TBD`（排除注释）② 调试 `console.(log|debug|warn)|debugger|alert(` ③ 假数据 `MOCK_|mock|dummy|fake|测试用|example.com`
- **命中与终态**：
  - placeholder 31 处 → input 输入提示，非占位符，不修
  - "待定" 1 处 → daily/route.ts:40 注释内，不修
  - MOCK_ 4 处 → entitlement 排除逻辑必要代码，不修
  - console.log 8 处 → **已删**（ai-check/aiAnalysis×2/aiGeo/aiHemun×2/aiZiwei/supabase）；console.warn 7 处保留（必要运行时警告）
  - alert( 7 处 → 拍板4 **全部改为 setError 内联提示**，现 0 命中
  - debugger / example.com → 0

### 3.4 ★★★「承诺了却不存在」（本任务重点）
- **判据**：Grep `你可以|支持|随时|在账户|在设置|订阅管理|取消订阅|不限次数` 等 + 逐页核对 pricing/mingshu/chart/page/daily/auth/charts
- **命中**：4 处
- **终态**（拍板1/2 全部执行）：

| 位置 | 改前 | 改后 |
|---|---|---|
| chart/page.tsx:457 | ✓ 会员已生效，命书不限次数 | ✓ 会员已生效 |
| chart/page.tsx:460 | 开通会员 {价}/月 不限次数 | 开通会员 {价}/月 |
| MingShuContent.tsx:170 | 会员订阅 {价}/月（不限次数） | 会员订阅 {价}/月（订阅权益见价目页） |
| pricing/page.tsx:115 | cta "开通会员" | cta "了解会员"（复核发现该卡渲染「即将推出」灰块，cta 本不渲染，纯配置修正） |

### 3.5 死链 / CTA 可达性
- **判据**：静态抓 `href="/..."` 对照路由；行为断言 import page.tsx 真调用 default
- **命中**：16 个唯一站内 href，0 死链。**无需修**

### 3.6 页面文案与 SKU 一致性
- **判据**：复用 test-pricing-accept.mjs（裸数字金额+旧形态 `¥\d`）；Grep `万字|十大板块|每月.*次|180.*条|六大权益|不限次数`
- **命中与终态**：价格 0 命中；"十大板块" 3 处均 10 项一致；"180 条" 与测试一致；"不限次数" 3 处 → 拍板1 修复；"万字" → 拍板3 **不改**（文学化表达，报告确有深度，不构成虚假宣传）

## 四、修复明细（两轮合并）

### 4.1 首轮（体检明确项）
1. shengxiaoData.ts 2 处"务必"→"宜"（按 aiHemun.ts:43 范例）
2. 删 8 处 console.log（保留 warn/error）
3. bazi/page.tsx 补 `export const metadata`；bazi/[year]、[year]/[month]、[year]/[month]/[day] 补 `generateMetadata`

### 4.2 拍板执行轮（6 项，用户「6项同意你的倾向」）
1. **不限次数 3 处** → 见 3.4 表（理由：SUBSCRIPTION_GRANTS 不含 fatebook，订阅不含命书报告，pricing FAQ 明示）
2. **pricing cta** → "了解会员"（见 3.4）
3. **"万字"** → 不改
4. **7 处 alert → 内联**：page/charts/geo/ziwei 四页新增 `error` state（与 chart 页 payError 同型），提交时 `setError('')`，表单内/列表头红字提示；删除成功时清错
5. **6 个 layout.tsx**：chart/charts/hemun/ziwei/geo/auth 各建（服务端组件 `export const metadata` + `return children`，title/description 按页功能撰写）。**首页不建**：根 layout 已有 `title.default`，单独包装需引入路由组，属过度调整
6. **行为断言增量**：动态路由 3 个（/bazi/1990、/bazi/1990/05、/bazi/1990/05/08）真实调用 default 并传 `params: Promise.resolve({...})`（Next 15+ 约定）；7 个 'use client' 页 import 验证模块可加载、default 为函数（hooks 不可在渲染外调用，不执行组件体）

## 五、断言资产（scripts/test-site-audit.mjs 终态）

已纳入 package.json verify（test-wealth-accept 后、test-regression 前）。**0 白名单**：

| 断言 | 内容 | 终态输出 |
|---|---|---|
| ① metadata | 自身或同级 layout.tsx 提供 | 18 自带 + 7 经 layout，0 缺失 |
| ② 调试残留 | console.log / debugger / alert( | 三项全 0（alert 7 处白名单已删） |
| ③ 占位符 | 83 个 .ts/.tsx 字符串字面量 | 0 命中 |
| ④ 链接可达 | 静态 href 对照 + 行为断言 | 16 href 全可达；7 服务端页（含 3 动态路由真传 params）+ 7 client 页 import 全过 |
| 牙口自检 | 判据样本能检出 | ✓ |

## 六、牙口与验收证据

### 牙口注入（三轮，均「文本不变、行为变坏」、注入前先确认有效、精确翻红、恢复复绿）
| 轮次 | 注入改法 | 结果 |
|---|---|---|
| 首轮 | bazi/page.tsx 删 `export`（metadata 不再导出） | ① 精确翻红 `✗ 缺 metadata：src/app/bazi/page.tsx` |
| 执行轮 A | chart/layout.tsx 删 `export` | ① 精确翻红 `✗ 缺 metadata（自身与同级 layout.tsx 均无）：src/app/chart/page.tsx` |
| 执行轮 B | ziwei/page.tsx `setError('网络错误')` 改回 `alert('网络错误')` | ② 精确翻红 `✗ src/app/ziwei/page.tsx:139 alert( 调试残留` |

三轮注入还原后 grep 注入标记 0 残留，SITE_AUDIT_PASS 复绿。

### 验收命令
```
npx tsx scripts/test-site-audit.mjs   # SITE_AUDIT_PASS（终态输出见第五节）
npm run verify                        # && 链全通过：tsc 0 错误 + 13 个测试脚本
                                      # CHECKER/PRICING/SOLAR_TIME/ENTRY/GANZHI/DAYBOUNDARY/
                                      # DAILY/ENTITLEMENT/LEGAL/GEO/WEALTH/SITE_AUDIT/SELFTEST 全 PASS
```

## 七、承认缺项（终态复核）

1. **内容型动态页文案未逐条核对**（shengxiao/[animal]、jieqi/[name]、article/[slug]、jieri/[slug]）：数据驱动、承诺性文案风险低；bazi 3 条动态路由已补行为断言，但其余内容页仍未逐条核对，无专门断言。**维持缺项**。
2. ~~'use client' 页面无行为断言~~ → **已收口**（拍板6：7 页 import 行为断言全过）。
3. **"万字"未实测**：未真实生成命书统计字数，仅按 aiAnalysis 每板块≥50字×10 推算；拍板3 决定不改，属产品文案决策。**维持缺项**。

## 八、遗留与待办

1. **commit**：全部改动未提交，等待用户指令（建议按「体检首轮 + 拍板执行」一或两个 commit 组织）。
2. 上线前剩余事项不在本任务范围：支付集成（16-支付集成）、会员订阅开通入口（现「即将推出」）。

## 九、文件清单（全量）

### 新建（8）
- `scripts/test-site-audit.mjs` —— 4 断言 + 牙口自检，纳入 verify
- `src/app/chart/layout.tsx` / `charts/layout.tsx` / `hemun/layout.tsx` / `ziwei/layout.tsx` / `geo/layout.tsx` / `auth/layout.tsx` —— 'use client' 页 metadata 包装
- `docs/交接记录/15-法律页与合规/HANDOFF-BACK-上线前全站体检-交接文档.md` —— 本档

### 修改（16）
- `src/lib/shengxiaoData.ts` —— 2 处"务必"→"宜"
- `src/lib/ai-check.ts` / `aiAnalysis.ts` / `aiGeo.ts` / `aiHemun.ts` / `aiZiwei.ts` / `supabase.ts` —— 删 8 处 console.log
- `src/app/bazi/page.tsx` + `bazi/[year]/page.tsx` + `[year]/[month]/page.tsx` + `[year]/[month]/[day]/page.tsx` —— 补 metadata/generateMetadata
- `src/app/chart/page.tsx` —— 删 2 处"不限次数"
- `src/app/mingshu/MingShuContent.tsx` —— 删"（不限次数）"
- `src/app/pricing/page.tsx` —— cta "了解会员"
- `src/app/page.tsx` / `charts/page.tsx` / `geo/page.tsx` / `ziwei/page.tsx` —— alert → setError 内联提示
- `package.json` —— verify 新增 test-site-audit.mjs

### 关联文档
- `HANDOFF-上线前全站体检.md` —— 任务书（首轮）
- `HANDOFF-BACK-上线前全站体检回执.md` —— 首轮六段式回执（含第七段拍板执行记录，与本档内容一致、按轮次组织）

未 commit，等待指令。
