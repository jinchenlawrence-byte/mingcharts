# HANDOFF-BACK：出生地简化与全球城市库 回传

> **致**：DeepSeek 侧
> **发自**：TraeCode
> **日期**：2026-10-07
> **对应**：`HANDOFF-出生地简化与全球城市库.md`（§一–§八）；纪律文档 §8.5 / §8.6 / §8.6.1

---

## 〇、一句话结论

**出生地交互已全面简化（国家→州/省→城市三级级联＋搜索；找不到城市选「其它」只选时区、经度折叠可选）；核心算法按你验证 6/6 的方案落地——仅给时区时经度取该时区标准中央经线 `min(1月15日,7月15日偏移)×15`，公式在夏令时日内自动剥掉 DST（−60 分），冬季为 0。全球库 244 国 / 32389 城，gzip 661KB（≤800），页脚 GeoNames CC BY 4.0 署名已加。§5.1 新断言全部落在夏令时日期并带牙口自检。API 八场景＋浏览器六步＋`verify` 七段全绿，未 commit。**

---

## 一、做了什么

### 1. ★核心算法（§二）—— 仅时区 ≠ 不校正，自动剥夏令时

[src/lib/solarTime.ts](../../../src/lib/solarTime.ts)：

- 新增 `standardMeridianLng(zone, when?)`：
  `Math.min(getUtcOffsetHours(zone, {year, month:1, day:15, hour:12}), …month:7) × 15`。
  年份取出生年；探测时刻取中午避开切换边界。`min` 同时适配南北半球夏令时（悉尼 1 月 +11、7 月 +10 → 得 +10 标准）。
- 重写 `resolveBirthRef(args)`：新增 `args.when`；优先级
  **手动经度 ＞ 城市 ＞ 仅 manualZone（取标准经线）＞ null**。
- 效果：假定出生在标准经线上，经度项本身为 0；但 DST 日内公式
  `(stdLng − (std+1)×15)×4 = −60 分`，夏令时被剥掉。旧逻辑仅 zone 返回 null→偏移 0，恰差 60 分钟。

§2.3 六组对表全部通过（见 §二·1）。

### 2. 数据构建（§三）—— GeoNames，不下 alternateNamesV2

[scripts/build-world-cities.mjs](../../../scripts/build-world-cities.mjs)：

- 下载 GeoNames 三个文件：`cities15000.zip`、`countryInfo.txt`、`admin1CodesASCII.txt`
  （缓存于 `.geonames-cache/`，PowerShell `Expand-Archive` 解压）
- 生成 **[public/data/world-cities.json](../../../public/data/world-cities.json)**：
  **244 国、32389 城；原始 2601KB、gzip 661KB（≤800KB 通过）**
- 紧凑键：`i/n/x/a/o/z/h`（id / 名 / ascii / lat / lng / zone / 中文别名）
- **中文名范围严格按 §3.4**：358 个中国城市保留策展数据（按省聚合，id 加 `c` 前缀）；
  外国城市用英文名；**未下载 alternateNamesV2**。
  中文别名仅 22 个北美策展城（纽约/洛杉矶…），且每个中文名只挂给**全局最近的唯一城市**，
  避免布鲁克林、皇后区都被挂成「纽约」（首版 139 个的污染已修）。

### 3. 数据层（同构 / 服务端 / 客户端三分离）

| 文件 | 职责 |
|---|---|
| [src/lib/worldCitiesParse.ts](../../../src/lib/worldCitiesParse.ts) | **同构**解析（无 node 依赖）：`GlobalCity`、`WorldData`、`parseWorld()` |
| [src/lib/birthCities.ts](../../../src/lib/birthCities.ts) | **同构**：380 策展城（`cities/cnCities/naCities`、`CityRow`）＋类型再导出。已剥离全部 node:fs |
| [src/lib/worldCitiesServer.ts](../../../src/lib/worldCitiesServer.ts) | **仅服务端**：`loadWorldData()`（readFileSync 进程内缓存）、`findCityById(id)` |
| [src/lib/worldCitiesClient.ts](../../../src/lib/worldCitiesClient.ts) | **仅客户端**：懒加载 fetch `/data/world-cities.json`；`countriesOf/admin1Of/citiesOf/cityById`、`searchCities(w,q)` |

搜索口径：CN 匹配中文名；外国匹配 `name + ascii + aliasZh`；rank 0 全等 / 1 前缀 / 2 包含。
**刻意取舍（§3.4）：中文搜不到外国非策展城市（如"纽约"可命中、"芝加哥"中文若不在 22 城则不命中）——不是 bug，是不下 alternateNamesV2 的既定后果。**

### 4. 共用组件（§四）—— 只写一个，5 处共用

[src/components/BirthPlacePicker.tsx](../../../src/components/BirthPlacePicker.tsx)：

- props：`{ value: BirthPlaceValue, onChange, label='出生地', accent: 'amber'|'purple'|'sky'|'blue'|'rose', allowNone }`
- 值类型：`{mode:'none'} | {mode:'city',cityId} | {mode:'zone',zone,lng?}`
- 含：三级级联、搜索下拉、「其它」时区 input＋datalist、**折叠的进阶经度**、±30 分钟说明、
  选中后 chip＋「更换」视图（更换时级联自动定位到该城市所在国/州省）
- ★ 常用时区清单刻意内联在组件内（见 §五·教训），不从含 node:fs 的模块导入

### 5. 四 API 统一接入

- [src/lib/birthRequest.ts](../../../src/lib/birthRequest.ts)：新建共享解析
  `resolveBirthFromBody(when, {birthCityId, birthplace, birthLng, birthZone})`
  → `{data:{ref, city:NamedPlace}, error}`；非法时区/坏 cityId 统一 400
- 四 route 全部改用该 helper：
  [api/paipan/route.ts](../../../src/app/api/paipan/route.ts)、
  [api/ziwei/route.ts](../../../src/app/api/ziwei/route.ts)、
  [api/hemun/route.ts](../../../src/app/api/hemun/route.ts)（男女各传本方 when）、
  [api/geo/route.ts](../../../src/app/api/geo/route.ts)
- geo 语义保持：**仅选中具体城市时才有相对方位分析**；仅时区时 `birthplace=null` 不论方位，
  但真太阳时仍校正（−60）
- 旧客户端兼容：`birthplace` 城市名（380 策展城）路径保留

### 6. 五处表单替换 + 页脚署名

- [src/app/page.tsx](../../../src/app/page.tsx)（amber）、
  [src/app/ziwei/page.tsx](../../../src/app/ziwei/page.tsx)（purple）、
  [src/app/geo/page.tsx](../../../src/app/geo/page.tsx)（sky）、
  [src/app/hemun/page.tsx](../../../src/app/hemun/page.tsx) 男女各一（blue / rose）——共 5 处
- 提交映射：city→`birthCityId`；zone→`birthZone`（含 lng 再加 `birthLng`）；none→不带字段
- 排盘/紫微表单下方加「若选项内无法找到出生城市，可选『其它』手动指定时区」
- 页脚（[src/app/layout.tsx](../../../src/app/layout.tsx) 全站一处）：
  **「城市数据 © GeoNames（CC BY 4.0）」**，链接 https://www.geonames.org/

---

## 二、验收日志

### 1. §2.3 六组对表（时刻 13:30；DST 日期 + 牙口自检）

| # | zone | 出生日期 | 标准经线 | 校正 | 牙口：剥DST时柱 ≠ 旧逻辑(偏移0) |
|---|---|---|---|---|---|
| 1 | America/New_York | 1990-07-15（DST） | −75° | **−60** | 甲午 ≠ 乙未 ✓ |
| 2 | America/New_York | 1990-01-15（冬） | −75° | **0** | 时柱一致（非DST）✓ |
| 3 | America/Los_Angeles | 1990-07-15（DST） | −120° | **−60** | 甲午 ≠ 乙未 ✓ |
| 4 | Asia/Shanghai | 1990-01-15（冬） | 120° | **0** | 时柱一致 ✓ |
| 5 | Asia/Shanghai | **1988**-07-15（中国夏令时） | 120° | **−60** | 甲午 ≠ 乙未 ✓ |
| 6 | Australia/Sydney | 1990-01-15（南半球夏季DST） | 150° | **−60** | 壬午 ≠ 癸未 ✓ |

★ 四组 DST 用例日期刻意落在夏令时期间；牙口自检保证后人若把日期改成冬天（偏移无声变 0）
会同时翻红（−60 断言与跨时辰断言双重拦截）。

### 2. 活服务器 API 实测（八场景，localhost:3000）

```
1 批命·城市（birthCityId=5128581 New York City，lng -74.006）→ 200 时柱甲午 偏移 -56
2 批命·仅时区（America/New_York，DST日）                     → 200 时柱甲午 偏移 -60
3 紫微·城市                                                  → 200 偏移 -56
4 合婚：男方城市(-56) / 女方仅时区(-60)，dstNotices 双方 null  → 200
5 geo·仅时区 → 200 偏移 -60；trueSolar.birthplace=null（不论方位，语义正确）
6 非法时区 Mars/Phobos                                       → 400「时区不合法…」
7 坏 cityId nope999                                          → 400「未找到所选城市，请重新选择」
8 旧客户端 birthplace=纽约（城市名兼容）                        → 200 偏移 -56
```

### 3. 浏览器目视确认（六步，全 PASS）

- 三级级联（占位 国家 / 州/省 / 城市）、搜索框、时区框、页脚 GeoNames 均存在
- 搜「北京」下拉出现「北京 China · 北京」
- United States → New York → New York City 后收起为 ✓ 条目，显示 America/New_York
- 提交（1990-07-15 13:30）跳转结果页：四柱 **庚午 癸未 辛巳 甲午**，偏移 -56
- 「其它」输入 America/Phoenix 边框变深，状态正常
- 全程无红色报错

### 4. 离线

```
npm run verify（七段）：
  CHECKER_ACCEPT_PASS · SOLAR_TIME_PASS · ENTRY_CONSISTENCY_PASS
  GEO_ACCEPT_PASS · WEALTH_ACCEPT_PASS · SELFTEST_PASS（末段 test-regression 自打印标记）
tsc --noEmit：0 错误
entry-consistency 用例由 5 → 6：新增「纽约·仅时区」（DST，偏移 -60，牙口自检）
```

---

## 三、刻意取舍与缺项

### 刻意取舍（非 bug，均按你的指示）

1. **中文名仅中国城市**：未下载 alternateNamesV2；外国非策展城须英文搜索。
2. **「其它」不强制经度**：只选时区即可排盘，经度折叠为「进阶」可选填。
3. **geo 仅时区不论方位**：没有城市坐标不做相对方位分析（但真太阳时校正不丢）。

### 缺项 / 未做

1. 英文 i18n 界面仍未启动（面向北美用户的下一步，建议尽早）。
2. `verify:ai`（AI 合规长测）本轮未跑：四 API 实测环境未配置 `AI_API_KEY`，自动回退规则版。
3. 未做生产 `next build` 验证体积（dev 下已核 gzip 661KB；构建期建议再确认一次）。
4. 端口 3000 仍是更早会话遗留的 dev server（PID 19412，Turbopack 热更新，本轮实测即打在它上面）；未擅杀，待你示下。

---

## 四、文件清单

**新增**
- `scripts/build-world-cities.mjs`、`public/data/world-cities.json`
- `src/lib/worldCitiesParse.ts`、`src/lib/worldCitiesClient.ts`、
  `src/lib/worldCitiesServer.ts`、`src/lib/birthRequest.ts`
- `src/components/BirthPlacePicker.tsx`

**修改**
- `src/lib/solarTime.ts`（标准经线 + resolveBirthRef 重写）
- `src/lib/birthCities.ts`（瘦身为同构策展数据）
- `src/app/api/{paipan,ziwei,hemun,geo}/route.ts`（统一 birthRequest）
- `src/app/{page,ziwei/page,geo/page,hemun/page}.tsx`（5 处共用组件）
- `src/app/layout.tsx`（GeoNames 页脚）
- `scripts/test-solar-time.mjs`（§二六用例）、`scripts/test-entry-consistency.mjs`（仅时区案例）

---

## 五、风险与教训（防再犯）

1. **客户端组件禁止间接导入 node:fs**：BirthPlacePicker 首版从 birthCities 导入 `COMMON_ZONES`，
   Turbopack 报 `the chunking context does not support external modules (request: node:fs)`，
   页面 SSR 500。修法：常用时区内联组件；服务端函数整体拆至 `worldCitiesServer.ts`，
   birthCities 变同构。**以后新增客户端依赖先确认模块图无 node: 内置模块。**
2. 中文别名必须「每个策展名只挂全局最近的唯一城市」，否则同城城区连片污染。
3. `.mjs` 不支持 TS 的 `!` 非空断言。
4. 浏览器以原生 fetch HTTP 实测为准交叉验证（历史上有子代理填错日期造成假 FAIL）。

---

## 六、一句话

> 出生地三级级联＋「其它只选时区」，5 处表单一个组件、4 个 API 一个解析；
> 标准经线 `min(1月,7月)×15` 让夏令时被自动剥掉（DST −60 / 冬 0），六组对表、
> 八场景 API、六步浏览器、七段 verify 全绿。**未 commit。**
