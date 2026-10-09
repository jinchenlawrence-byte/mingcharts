# HANDOFF-BACK-geoAI合规回退诊断与修复

> 致 DeepSeek 侧：本档记录上线前体检收尾阶段、用户实测 `/geo` 页时发现的「方位解析显示规则版（AI暂不可用）」问题的诊断与修复。属体检交接文档（HANDOFF-BACK-上线前全站体检-交接文档.md）之后的增量事件。六段式，请复核。

## 一、结论

**现象非故障，是红线保护按设计工作**：AI 真实调用成功（耗时 17 秒），但两次生成均检出禁用词，合规层放弃 AI 结果、回退规则版且兜底可见。**根因是 aiGeo 的 SYSTEM_PROMPT 缺禁词清单**（四个 AI 模块中唯一没有的，接线不对称），已按 aiZiwei/aiHemun 既有格式补齐；并升级违规日志带命中词。修复后 tsc 0 错误、verify 13 段全 PASS。标签「AI暂不可用」语义误导一项**待拍板**，未擅自改。

## 二、现象与根因链

### 2.1 现象（用户实测）
用户在 `/geo` 点击「开始城市解析」，结果显示「深度解读·规则版（AI暂不可用）」。

### 2.2 日志证据（dev server output.log）
```
[aiGeo] 重试后仍不合规（检出禁用词），放弃 AI 结果，回退规则版
POST /api/geo 200 in 17.0s (next.js: 35ms, application-code: 17.0s)
```
17 秒为真实 AI API 调用耗时——**AI 链路本身可用**，且 withComplianceRetry 的「首次不合规→重试一次→仍不合规→放弃」流程走完。

### 2.3 三层根因
1. **直接原因**：AI 输出含禁用词（大吉/大凶/必/一定/注定之一，当时日志未记具体词）→ 合规校验拦截，重试仍中 → 放弃回退。此为 `findForbidden` + `withComplianceRetry` 红线保护的设计行为，兜底可见不静默，行为正确。
2. **真正缺口**：`aiGeo.ts` SYSTEM_PROMPT **没有禁用词清单**——对比 aiZiwei.ts:35-36、aiHemun.ts:42-43 均有明确禁词+逐字替换范例，aiGeo 第 3 条只写「断语留余地」，模型不知道禁区边界，temperature 0.8 下两次生成撞同一表达习惯即全军覆没。四个 AI 模块接线不对称（此类不对称历史上曾以「可接受现状」漏过，教训在案）。
3. **标签误导**：`api/geo/route.ts:93` `aiSource = aiReport ? 'AI 深度解读' : '规则版（AI暂不可用）'`——把「合规拒绝」与「AI 真不可用（未配置 KEY/网络失败）」合并为同一标签，本次实为前者。

## 三、修复明细（2 处）

### 3.1 aiGeo SYSTEM_PROMPT 补禁词清单（对齐其他三模块）
`src/lib/aiGeo.ts` 第 3 条末尾追加（**并入既有条目、不新增条号**——避免破坏 aiGeo.ts 内两处「SYSTEM_PROMPT 第4条/第6条」的条号引用）：
```
   以下词语一律禁用：大吉、大凶、必（含务必/必然/必定）、一定、注定。
   逐字替换范例：务必→宜；必然/注定→往往；必定→多半；一定→往往；大吉→较为有利。
```

### 3.2 违规日志带命中词（可观测性）
`src/lib/aiGeo.ts` validate 回调（原笼统返回 `'检出禁用词'`）：
```ts
const hits = findForbidden(t).hits
// 命中词进日志，便于诊断模型高频违规点（w=禁用词，s=命中句）
if (hits.length) return `检出禁用词：${hits.map(h => h.w).join('、')}（首句：${hits[0].s.slice(0, 40)}…）`
```
下次再被拦，日志可直接看出是哪个词、哪句话，不必盲猜。

### 3.3 验收
```
npx tsc --noEmit   # 0 错误
npm run verify     # CHECKER/PRICING/SOLAR_TIME/ENTRY/GANZHI/DAYBOUNDARY/DAILY/
                   # ENTITLEMENT/LEGAL/GEO/WEALTH/SITE_AUDIT/SELFTEST 全 PASS
```
注：修复效果（AI 通过率提升）需实测验证——prompt 生效于下一次真实调用，用户尚未复测。

## 四、原始日志（关键段）

```
50- [Omitted long context line]
51- GET /ziwei 200 in 15ms
52- GET /geo 200 in 66ms
53- [aiGeo] 重试后仍不合规（检出禁用词），放弃 AI 结果，回退规则版
54- POST /api/geo 200 in 17.0s (next.js: 35ms, application-code: 17.0s)
```
（.env.local 含 AI_API_KEY/AI_BASE_URL/AI_MODEL，KEY 未泄露；排除了「未配置 KEY」假设）

## 五、承认缺项与待拍板

### 待拍板
1. **aiSource 标签区分**：建议「合规拒绝」与「AI 不可用」分开标注（如「规则版（AI结果未过合规校验）」）。**不动的原因**：需改 aiGeo 返回签名（null → { report, reason }），涉及 route.ts 与页面展示两处接线，且标签文案属产品措辞——等拍板再动。
2. **其余三个模块的命中词日志未同步**：aiZiwei/aiHemun/aiAnalysis 的 validate 仍返回笼统 `'检出禁用词'`。本轮只改 aiGeo（问题现场），未扩散改动；三处改法同型（一行），可按需统一。

### 缺项
1. 修复后的实际通过率未统计（需多次实测；模型非确定性，单次通过≠稳定通过）。
2. 本次违规的具体禁用词与句子未留存（改动前的日志无此信息），无法回溯分析高频违规点——3.2 的日志升级即为补此缺口。

## 六、文件清单

### 修改（2）
- `src/lib/aiGeo.ts` —— ① SYSTEM_PROMPT 第 3 条补禁词清单+替换范例（不新增条号）② validate 返回串带命中词与首句
- 本档

### 关联文档
- `HANDOFF-BACK-上线前全站体检-交接文档.md` —— 体检全周期总档（本事件为其后增量）
- `HANDOFF-上线前全站体检.md` / `HANDOFF-BACK-上线前全站体检回执.md` —— 任务书与首轮回执

未 commit，等待指令。
