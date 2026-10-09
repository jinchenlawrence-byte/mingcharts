# HANDOFF-BACK-geo改真付费与门禁补完回执

> 致 DeepSeek 侧：门禁接线补完（范围 2 · 五个报告模块一起补完）。起点 hash `8c108b4`。六段式，请复核。

## 一、结论

**范围 2 全部完成**：5 个报告路由接 canView + locked 按 unlocked 判定；4 个前端页面消费 locked；aiSource 三态标签；prompt 从 FORBIDDEN_WORDS 派生（FORBIDDEN_WORDS_PROMPT）；新建 test-entitlement-gate.mjs 6 条断言 + 牙口自检；牙口两轮精确翻红（删 canView 参数 → ②④ 翻红；删 FORBIDDEN_WORDS 一词 → ⑤ 翻红）；verify 14 段全 PASS；tsc 0 错误。ENTITLEMENT_ENFORCE=false 未动，内测期行为完全不变。

## 二、逐条回应

### 4.1 geo route —— 加 free/locked + 接 canView + aiSource 三态
✓ 完成。token 从 body 读，EMPTY_ENTITLEMENTS 兜底；unlocked 驱动 ai 是否为 null + locked 是否为 null；aiSource 三态（未解锁/AI 深度解读/规则版（AI结果未过合规校验））。

### 4.2 ziwei/hemun/paipan —— 同型改动
✓ 完成。ziwei（ziwei_deep）、hemun（hemun）、paipan（fatebook + annual_report 双接，annual_report 接线就位——年运内容当前在命书内未独立拆分，注释标明）。

### 4.3 前端消费 locked
✓ 完成。4 页面：
- geo/ziwei/hemun：新增 locked state，locked 非空时显示 preview + 解锁按钮（价格取 SKUS，不硬编码），ai 渲染条件 `{ai && (...)}`
- chart：chartData 类型加 locked 可选字段，locked.preview 显示在解锁区

### 4.4 aiSource 三态
✓ 完成。三态：未解锁 / AI 深度解读 / 规则版（AI结果未过合规校验）。不改 generateAIGeo 返回签名（先做标签三态）。

### 4.5 prompt 从 FORBIDDEN_WORDS 派生
✓ 完成。ai-check.ts 新增 `FORBIDDEN_WORDS_PROMPT` 导出（从 FORBIDDEN_WORDS 派生），四模块（aiGeo/aiZiwei/aiHemun/aiAnalysis）的 SYSTEM_PROMPT 用 `${FORBIDDEN_WORDS_PROMPT}` 模板拼入，不再手抄。

### 断言（§五）
✓ 完成。新建 `scripts/test-entitlement-gate.mjs`，6 条断言 + 牙口自检：
1. geo free/locked 结构——**行为断言**：真调 /api/geo POST，断言 locked=null + free.geo 存在
2. canView 接线——grep：REPORT_GRANTS 每个 grant 有 canView 调用
3. 前端消费 locked——grep：4 页面源码有 locked 读取
4. 定价与门禁一致性——grep：ONE_TIME_SKUS 每个报告 grant 有 canView + locked skus
5. prompt 同源——读源码文本：ai-check.ts FORBIDDEN_WORDS 含 7 词 + 四模块用 FORBIDDEN_WORDS_PROMPT
6. ENFORCE=false 回归——ENTITLEMENT_ENFORCE === false + canView 全放行

### 牙口（§五-8）
✓ 完成。两轮均「文本不变、行为变坏」：
- **牙口 A**：geo route `canView(ent, 'geo')` → `canView(ent, 'go')`（删一个字母）→ ② 翻红 1 处 + ④ 翻红 2 处（geo + bundle3）→ 恢复后复绿
- **牙口 B**：ai-check.ts FORBIDDEN_WORDS 删 `'大吉'` → ⑤ 翻红 1 处（源码文本匹配检出）→ 恢复后复绿
- ★ 首轮牙口 B 未翻红——因⑤从 import 读 FORBIDDEN_WORDS 动态引用，删后 import 也只有 6 个词。修断言为读 ai-check.ts 源码文本找 `'大吉'` 字面量 → 精确翻红。

## 三、原始日志

```
—— ① geo free/locked 结构（真调 /api/geo POST）——
—— ⑥ ENFORCE=false 回归 ——
✓ ENFORCE=false：canView 对 5 个 grant 全放行（内测期行为不变）
✓ geo free/locked 结构：ENFORCE=false 时 locked=null，free.geo 含结构化数据
—— ② canView 接线（REPORT_GRANTS 每个 grant 有 canView 调用）——
✓ canView 接线：5 个报告 grant 全部在路由里接了 canView 调用
—— ③ 前端消费 locked（4 个页面源码有 locked 读取）——
✓ 前端消费 locked：4 个页面均读取了 data.locked
—— ④ 定价与门禁一致性（每个 one_time SKU 的 grant 有 canView + locked skus）——
✓ 定价与门禁一致：6 个 one_time SKU 的报告 grant 全部有 canView + locked skus
—— ⑤ prompt 与判据同源（四模块引用 FORBIDDEN_WORDS_PROMPT 模板 + ai-check.ts 定义含全集）——
✓ prompt 同源：ai-check.ts 定义含 7 个禁词全集；4 个模块均用 FORBIDDEN_WORDS_PROMPT 模板引用
—— 牙口自检 ——
✓ 牙口自检：canView/skus/禁词 判据样本均能检出
ENTITLEMENT_GATE_PASS

npm run verify → CHECKER/PRICING/SOLAR_TIME/ENTRY/GANZHI/DAYBOUNDARY/DAILY/
  ENTITLEMENT/LEGAL/GEO/WEALTH/SITE_AUDIT/ENTITLEMENT_GATE/SELFTEST 全 PASS
tsc --noEmit → 0 错误
```

## 四、承认缺项

1. **③ 行为断言缺**：页面渲染验证（locked 非空时 preview 出现在输出里）—— 页面是 'use client' 组件，不可在渲染外调用，本轮只做源码 grep（locked 读取）。如拍板需行为断言，可用浏览器实测。
2. **① 回归缺**："ENFORCE=false 下 /api/geo 返回体与现在等价（除多一个 locked: null）"—— 无旧基线快照，只能靠 ENFORCE=false 时 canView 恒 true + locked=null 保证等价。
3. **annual_report 门禁**：接线就位（canView 调了 + locked skus 包含），但年运内容当前在命书内未独立拆分——真正拆分属后续任务。

## 五、待拍板

1. **③ 行为断言是否补**：用浏览器实测 4 页面 locked 非空时 preview 显示——还是等 ENFORCE=true 后统一验证？
2. **aiSource 三态改签名**：当前是标签三态（不改 generateAIGeo 返回签名）。如要真正返回 reason（null → { report, reason }），需改 aiGeo.ts 返回签名——改动面大，等拍板。

## 六、文件清单

### 新建（2）
- `scripts/test-entitlement-gate.mjs` —— 6 条断言 + 牙口自检，纳入 verify
- `docs/交接记录/16-支付集成/HANDOFF-BACK-geo改真付费与门禁补完回执.md` —— 本档

### 修改（13）
- `src/lib/ai-check.ts` —— 新增 FORBIDDEN_WORDS_PROMPT 导出
- `src/lib/aiGeo.ts` —— prompt 用 FORBIDDEN_WORDS_PROMPT；违规日志带命中词
- `src/lib/aiZiwei.ts` —— prompt 用 FORBIDDEN_WORDS_PROMPT
- `src/lib/aiHemun.ts` —— prompt 用 FORBIDDEN_WORDS_PROMPT（保留合婚特有替换范例）
- `src/lib/aiAnalysis.ts` —— prompt 用 FORBIDDEN_WORDS_PROMPT
- `src/app/api/geo/route.ts` —— 接 canView + locked 按 unlocked + aiSource 三态
- `src/app/api/ziwei/route.ts` —— 同上（ziwei_deep）
- `src/app/api/hemun/route.ts` —— 同上（hemun）
- `src/app/api/paipan/route.ts` —— 同上（fatebook + annual_report）
- `src/app/geo/page.tsx` —— 加 locked state + 渲染
- `src/app/ziwei/page.tsx` —— 同上
- `src/app/hemun/page.tsx` —— 同上（HemunData 类型加 locked）
- `src/app/chart/page.tsx` —— chartData 类型加 locked + 显示 preview
- `package.json` —— verify 新增 test-entitlement-gate.mjs

### 关联文档
- `HANDOFF-geo改真付费与门禁补完.md` —— 任务书
- `HANDOFF-打通entitlement链路.md` —— 前置
- `REPLY-geoAI回退复核.md` —— 问题来源
