# HANDOFF-BACK：真太阳时全球时区修复（北美上线前置）回传

> **对应任务书**：根目录 [`HANDOFF-真太阳时与时区.md`](../../../HANDOFF-真太阳时与时区.md)
> **回传日期**：2026-10-06
> **回传人**：TraeCode

---

## 〇、一句话结论

**任务全部完成。纽约命盘从旧算法的丑时（01:34）修正为未时（13:34），端到端四柱断言通过——且经 API 实测与浏览器实测双重确认修复真的接进了 `paipan()`，不是只改了偏移函数。**
**§2.2 符号陷阱按 §6.1 自检：实现为 `(asUTC − utcGuess)`，Asia/Shanghai 得 +8、纽约得 −4，符号未反。**
**离线 verify 六段全绿（tsc 零错误）；中国非夏令时日期五城偏移与旧算法逐值一致；1986–1991 夏令时的修正如期生效。**

---

## 一、逐条回应

### 1. 核心算法（§2.1/§2.2，零依赖 Intl 方案 A）

[solarTime.ts](../../../src/lib/solarTime.ts) 重写：

- `getUtcOffsetHours(zone, when)`：Intl + tzdata 取历史时刻实际偏移；返回 `(asUTC − utcGuess)`，符号与任务书一致
- `trueSolarOffsetMinutes(lng, zone, when)`：`Math.round((lng − utcOffsetHours × 15) × 4)`，基准不再写死 120°E
- `toTrueSolarTime(zone, lng, when)`：签名改为 (时区, 经度, 时刻)
- 向后兼容：未提供 zone 时默认 `Asia/Shanghai`；未提供任何出生地时偏移为 0（旧行为）

### 2. 接入排盘链路（§三；§6.3 的防护对象）

偏移计算放在排盘函数内部，杜绝「改了函数但没接进调用」：

- [paipan.ts](../../../src/lib/paipan.ts)：`PaipanInput` 新增 `birthLng?` / `birthZone?`；显式 `timezoneOffset` 优先级最高，否则由经度+时区计算；结果新增 `timezoneOffsetApplied`（实际生效值）
- [ziwei.ts](../../../src/lib/ziwei.ts)：`paipanZiwei` 同样改造；`ZwChart` 新增 `timezoneOffsetApplied?`
- 两个 API route（[paipan](../../../src/app/api/paipan/route.ts)、[ziwei](../../../src/app/api/ziwei/route.ts)）支持：城市名（带 zone）、手动 `birthLng`+`birthZone`（手动优先）、旧版显式 offset（仍兼容）；返回 `trueSolar.{lng,zone,offsetMin,dstNotice}`

### 3. 城市数据（§四）

[birth-cities.json](../../../src/data/birth-cities.json)：

- 358 个中国城市全部补 `zone: 'Asia/Shanghai'`
- 新增 **22 个北美城市**（美西 6、美东 6、中部 5、加拿大 5），每城含 `name / nameEn / province / lat / lng / zone`
- 合计 **380 城**

### 4. UI（§五）

批命页与紫微页：

- 城市下拉按 `中国城市 / 北美城市 North America` 分组（optgroup），北美项显示「中文名 English」
- 常驻「找不到？手动输入」：经度框 ＋ 时区下拉（11 个常用 IANA 项）；填经度即优先于城市
- **默认时区显式可见**：「将采用时区：…」随选择实时变化；并注明「夏令时按出生日期自动判定，无需手动选择」——不问用户标准时/夏令时
- 紫微盘中宫显示「真太阳时 ±N 分钟（zone）」

### 5. 夏令时切换点（§5.3）

`solarTime.ts` 新增 `checkDSTTransition(zone, when)`：检测「不存在时刻（gap）」与「重复时刻（ambiguous）」，route 把提示文案放进 `dstNotice`，紫微页以琥珀色显示。

---

## 二、验收日志

### 1. `scripts/test-solar-time.mjs`（已纳入 verify）→ SOLAR_TIME_PASS

**6.1 符号自检 6/6**：

```
Asia/Shanghai 1990-01-15 → +8     Asia/Shanghai 1988-07-01 → +9（中国夏令时）
America/New_York 1990-01-15 → -5  America/New_York 1990-07-01 → -4
America/Los_Angeles 1990-07-01 → -7
America/Vancouver 1990-01-15 → -8
```

**6.2 真太阳时对表 7/7**（与任务书 §2.3 全部一致）：纽约两例 13:34/14:34、洛杉矶 13:37、温哥华 08:18（辰时）、北京 14:16、上海 14:36、北京 1988 13:16。

**6.3 ★端到端四柱**（纽约 1990-07-01 14:30 男，完整 paipan 链路）：

```
实际生效偏移 -56 分
时柱 丁未 ＝ 独立路径 13:34 未时推算值
时柱 丁未 ≠ 旧bug 01:34 丑时值 辛丑
日柱 丁卯（日期未变）
```

6.3b 紫微·温哥华：生效偏移 −12 分，命宫主星随时辰改变（修复「廉贞、破军」≠ 旧 −972 分版本）。

中国 5 城零回归：北京/上海/乌鲁木齐/广州/哈尔滨在非夏令时日期，新算法 ＝ 旧公式 (lng−120)×4（-14/+6/-130/-27/+26）。

DST 检测：纽约 2021-03-14 02:30 → gap；2021-11-07 01:30 → ambiguous。

### 2. API 实测（dev server + 原生 fetch）

| 用例 | 时柱 | 生效偏移 |
|---|---|---|
| 城市路径 birthplace=纽约 | 丁未 | -56（zone America/New_York） |
| 手动路径 birthLng=-74, birthZone=America/New_York | 丁未 | -56 |
| 北京 1990-07-01（**在夏令时年份内**） | 丁未 | -74 |
| 北京 1988-07-01 | 丁未 | -74 |
| 不提供出生地 | — | 0 |

> 说明：北京 1990-07 偏移 -74 是正确值——1990 属中国夏令时年份，当时 UTC+9。§2.5 的修正对整个 1986–1991 夏令时段出生者生效，不只 1988 一例。

### 3. 浏览器实测（11 项检查全部 PASS）

首页城市路径 → 结果页时柱丁未；手动经度+时区路径 → 同样丁未；两处「将采用时区：America/New_York（手动经度）」提示均如预期；紫微温哥华盘中宫显示「真太阳时 -12 分钟（America/Vancouver）」。

### 4. 离线总览

```
npm run verify（六段）:
  tsc --noEmit              0 错误
  test-checker-accept.mjs   CHECKER_ACCEPT_PASS（13/13）
  test-solar-time.mjs       SOLAR_TIME_PASS
  test-geo-accept.mjs       GEO_ACCEPT_PASS
  test-wealth-accept.mjs    WEALTH_ACCEPT_PASS
  test-regression.mjs       SELFTEST_PASS
```

**verify:ai 本轮未重跑**：其 12 个用例调用 `paipan/paipanZiwei` 时均不传经度/时区/偏移，命中默认路径（偏移 0），该路径逻辑逐字保留，且新增字段全部可选、tsc 通过。如需实跑确认请明示（约 50k API token）。

---

## 三、主动承认的缺项

1. **UI 仍为中文**：本轮按任务书只做时区链路，未做英文界面/i18n。战略转向北美后，界面语言是独立的后续任务
2. 北美城市只覆盖任务书列出的 22 个华人聚居城市；其余地区靠手动经度+时区兜底
3. 手动时区仅 11 个常用项下拉，用户无法在 UI 直接填写任意 IANA 串（选不到只能等补数据；如需自由文本输入可加）
4. 地理页（/geo）复用同一城市文件，下拉中也会出现北美城市——不报错但方位分析逻辑仍基于中国城市体系设计，北美城市选入后结果未必有意义
5. DST 的 gap/ambiguous 在批命结果页（/chart）未展示提示（紫微页已展示）；API 返回中字段齐全
6. 均时差（equation of time，±16 分钟）仍未计入，沿用平太阳时近似（任务书认可）

---

## 四、待拍板

1. 启动英文 UI/i18n 的时机与范围（全站 or 仅排盘相关页）
2. 是否要把 dstNotice 也接到批命 /chart 结果页
3. 手动时区是否改为可自由填写 IANA 字符串
4. 是否需要扩补北美城市清单（如增加夏威夷、更多加拿大城市）
5. 是否补跑 verify:ai 做实抽确认

---

## 五、改动文件清单

| 文件 | 改动 |
|---|---|
| `src/lib/solarTime.ts` | 重写：getUtcOffsetHours（tzdata 历史偏移，asUTC−utcGuess）、trueSolarOffsetMinutes（lng+zone+时刻）、toTrueSolarTime、resolveBirthRef、checkDSTTransition、DEFAULT_ZONE、相关类型 |
| `src/lib/paipan.ts` | 输入新增 birthLng/birthZone；偏移在 paipan 内解析；结果新增 timezoneOffsetApplied |
| `src/lib/ziwei.ts` | paipanZiwei 同样改造；ZwChart 新增 timezoneOffsetApplied；import solarTime |
| `src/app/api/paipan/route.ts` | 城市/手动/显式 offset 三路径；返回 zone 与 dstNotice |
| `src/app/api/ziwei/route.ts` | 同上；紫微 |
| `src/app/page.tsx` | 城市分组下拉、手动经度+时区、时区实时提示 |
| `src/app/ziwei/page.tsx` | 同上（紫色系）；盘中宫显示 zone 与 DST 提示 |
| `src/data/birth-cities.json` | 358 城补 zone；新增 22 个北美城市（含 nameEn） |
| `scripts/test-solar-time.mjs` | **新建**：6.1/6.2/6.3/6.3b＋零回归＋DST 检测 |
| `package.json` | verify 新增 test-solar-time.mjs（六段） |

---

## 六、补充：合婚页接入出生地（同一轮后续）

合婚此前完全不支持出生地，双方 `paipan()` 均走无校正路径。本轮补齐：

| 文件 | 改动 |
|---|---|
| `src/lib/birthCities.ts` | **新建**：抽出三处页面共用的 CityRow 类型、cnCities/naCities 分组、COMMON_ZONES（消除三份重复） |
| `src/app/api/hemun/route.ts` | RawBirth 增 birthplace/birthLng/birthZone；parseBirth 内用 resolveBirthRef 解析（手动优先），注入 PaipanInput |
| `src/app/hemun/page.tsx` | 男女双方卡片各加城市分组下拉＋手动经度/时区＋「将采用时区…」实时提示 |
| `src/app/page.tsx`、`src/app/ziwei/page.tsx`、两个 API route | 本地城市常量/json 直引改为共用 birthCities 模块 |

实测：

- API 三路径：男纽约 1990-07-01 14:30 → 时柱 **丁未**、偏移 **−56**；女北京 1992-08-15 09:00 → 时柱 **丙辰**、偏移 **−14**；手动经度路径与城市路径一致；无出生地偏移 0
- 浏览器实测：城市分组、时区提示、「（手动经度）」后缀、提交后双方时柱均正确（首次抽样中女方误现「丁巳」，复查确认为操作时城市下拉未选中，代码无问题）
- `npm run verify` 六段保持全绿
