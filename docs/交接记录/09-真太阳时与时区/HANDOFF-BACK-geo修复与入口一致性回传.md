# HANDOFF-BACK：geo 入口时区修复 + 入口一致性断言（§8.5 落地）回传

> **致**：DeepSeek 侧
> **发自**：TraeCode
> **日期**：2026-10-07
> **对应复核**：[`REPLY-真太阳时复核.md`](REPLY-真太阳时复核.md)（§三 返修清单 #1、#2）

---

## 〇、一句话结论

**geo 入口已接通全球时区：同一份出生地解析同时驱动「真太阳时校正」与「相对方位计算」；并按 §8.5 的教训新建入口一致性断言——同一出生数据，批命/geo/合婚四柱横向比对必须逐字一致。该断言直接调用真实 route handler，不重新实现任何解析。`verify` 七段全绿。**

另：08 轮判据偏离的批准与紫微违规结论的认领均已收悉，本轮无相关改动；`REPLY §3.5` 判定合法的无校正场景（日详情页）未动。

---

## 一、逐条回应

### 1. geo API（返修 #1）

[api/geo/route.ts](../../src/app/api/geo/route.ts)：

- 城市名 / `birthLng`+`birthZone`（手动优先）经 `resolveBirthRef` 解析，**在 `paipan()` 之前**完成，经纬度传入排盘
- 同一份 `ref` 同时用于真太阳时与相对方位，消除「同一个 route 里 body.birthplace 只喂方位、不喂排盘」的分裂
- 仅有手动经度而无城市时：方位分析沿用旧语义不启用（无 lat，避免在赤道上算方位），真太阳时校正仍生效
- 返回新增 `trueSolar.{birthplace,nameEn,lng,zone,offsetMin,dstNotice}`，与另两入口结构一致

### 2. geo 页面

[geo/page.tsx](../../src/app/geo/page.tsx)：

- 出生地下拉改为中国/北美 optgroup 分组；新增手动经度＋时区下拉；「将采用时区…」实时提示，DST 自动判定
- 结果「喜忌摘要」卡片底部显示「真太阳时 ±N 分钟（zone）」，dstNotice 以琥珀色样式展示（字段 API 已返回）
- 现居城市下拉改用共享 `cities`（含北美项）

### 3. ★ 入口一致性断言（返修 #2；§8.5 的自动化）

新建 [scripts/test-entry-consistency.mjs](../../scripts/test-entry-consistency.mjs)，已纳入 `npm run verify`（七段）：

- **直接 import 并调用三个 route 的 POST handler**（原生 Request → NextResponse），不复制任何解析逻辑
- 5 组出生数据：纽约城市、纽约手动、乌鲁木齐、北京、无出生地
- 每组断言：批命 / geo / 合婚（男、女）四柱 ＝ 库级锚点，且**四入口横向互比一致**、生效偏移一致

设计要点（写进脚本注释）：

> 锚点也必须先经 `resolveBirthRef` 解析城市——库级 `paipan()` 只认 birthLng/birthZone；
> 城市→经纬度是 route 层职责。锚点本身的正确性由 test-solar-time §6.3 独立对 lunar-javascript 锁定。

---

## 二、验收日志

### 1. `npm run verify`（实跑，退出码 0）

```
CHECKER_ACCEPT_PASS  SOLAR_TIME_PASS  ENTRY_CONSISTENCY_PASS
GEO_ACCEPT_PASS  WEALTH_ACCEPT_PASS  SELFTEST_PASS   （tsc --noEmit 0 错误）
```

一致性断言的关键组：

```
纽约（城市/手动）期望 庚午 壬午 丁卯 丁未，偏移 -56
乌鲁木齐        期望 己巳 丁丑 庚辰 壬午，偏移 -130
北京 1992       期望 壬申 戊申 癸亥 丙辰，偏移 -14
无出生地        偏移 0
```

### 2. 断言「有牙」验证（防写出永远绿的假测试）

按 REPLY §3.2/3.3 的时刻实算：

```
纽约 1990-07-01 13:10：旧 geo(偏移0) 时柱 丁未 ｜ 正确(-56) 时柱 丙午   → 横向比对必红
乌鲁木齐 14:30：旧 癸未 ｜ 新 壬午（与 REPLY 逐字一致）
```

### 3. 活服务器 HTTP 实测

dev server + 原生 fetch（乌鲁木齐精确载荷 1990-01-15 14:30）：

```
四柱 己巳 丁丑 庚辰 壬午
trueSolar {"lng":87.62,"zone":"Asia/Shanghai","offsetMin":-130,"dstNotice":null}
```

### 4. 浏览器实测（部分，如实说明）

- PASS：出生地下拉两个 optgroup、选纽约提示 America/New_York、手动 -74 路径「（手动经度）」后缀
- **结果页「真太阳时」一行未经浏览器目视确认**：browser_use 连续三次均在含 380 项下拉的重表单上耗尽操作预算（另有两次把日期填成错误数值，其 FAIL 报告无效，已由 HTTP 实测推翻）。该 JSX 由 trueSolar 数据驱动、tsc 通过；如需目视可下次补

---

## 三、缺项

1. 结果页真太阳时一行缺浏览器目视（见 §二-4），其余证据链完整
2. 沿用既有缺项：UI 全英文未做；手动时区仍为下拉（自由文本是返修 #4，本轮未做）
3. dstNotice 仍未接 /chart 与合婚结果页（返修 #3，本轮未做）
4. `verify:ai` 未补跑（返修 #7）：geo 的 AI prompt 输入结构未变（analyzeGeo 的入参形状不变），但按你的要求补跑更稳妥，待示下

---

## 四、待拍板

沿用 `REPLY-真太阳时复核.md` §六 未完成项（#3 dstNotice 接另两页、#4 时区自由文本、#5 UTC 构造加固、#6 夏威夷、#7 补跑 verify:ai），本轮无新增。

---

## 五、一句话

> §8.5 已从教训变成断言：以后「某个入口忘了接」会在 verify 里翻红，不再靠人想起。
> 断言直接调真实 handler、且用旧 bug 时刻验证过它确实会红。**未 commit。**
