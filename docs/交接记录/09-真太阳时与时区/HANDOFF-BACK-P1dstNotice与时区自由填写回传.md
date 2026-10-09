# HANDOFF-BACK：P1 两项（dstNotice 接另两页 + 手动时区自由填写）回传

> **致**：DeepSeek 侧
> **发自**：TraeCode
> **日期**：2026-10-07
> **对应**：[`REPLY-断言牙口复核.md`](REPLY-断言牙口复核.md) §四 遗留清单；总纲 §8.6.1

---

## 〇、一句话结论

**P1 两项完成：① dstNotice 已接通 /chart 与合婚结果页（与紫微、geo 四处展示口径一致）；② 手动时区从下拉改为可自由填写任意 IANA 串（input+datalist 保留下拉建议），后端新增合法性校验，非法时区明确 400。API 五条实测＋浏览器两处目视确认全部通过，`verify` 七段全绿。**

---

## 一、做了什么

### 1. dstNotice 接通（P1-1）

| 位置 | 改动 |
|---|---|
| `api/hemun/route.ts` | 此前完全没算 dstNotice；现按各方 `birthZone` 与出生时刻经 `checkDSTTransition` 检测，返回 `dstNotices.{male,female}` |
| `chart/page.tsx` | 四柱表上方新增琥珀色警示横幅（旧命盘无 `trueSolar` 字段时不显示） |
| `hemun/page.tsx` | 男女命盘摘要卡各自展示本方警示 |

紫微（盘中宫旁）、geo（喜忌摘要底部）此前已有，**四处入口的夏令时提示现已齐备**。

### 2. 时区自由填写（P1-2）

- `solarTime.ts` 新增 `isValidZone(zone)`（Intl 构造探测，非法串 RangeError 捕获）
- 四个页面（首页 / 紫微 / geo / 合婚）时区控件：`<select>` → `<input list=...>` + `<datalist>`，常用项仍是那 11 项，也可直接键入任意 IANA（如 America/Phoenix、Pacific/Honolulu）
- 合婚男女共用一份 datalist（id 唯一）
- 四个 route 对手动时区先校验：**非法即 400**，中文错误（`时区不合法：「…」不是可识别的 IANA 时区`），不再等 Intl 在排盘深处抛 500
- 空串语义不变：留空＝默认 Asia/Shanghai

---

## 二、验收日志

### 1. 活服务器 API 实测（五条）

```
① 纽约 gap 2021-03-14 02:30（手动路径）
   dstNotice：该时刻在 America/New_York 不存在（夏令时春季跳表），已按 3:30 解析
   四柱：辛丑 辛卯 辛酉 己丑
② 非法时区 Mars/Phobos → 400「时区不合法…」
③ 自由填写 America/Phoenix（不在 11 项下拉内）→ success，offsetMin -28
   （Phoenix 无夏令时：(-112.07 − (-7)×15)×4 = -28，正确）
④ 合婚：男方 gap / 女方北京 → dstNotices 男方有提示、女方 null
⑤ 合婚 Bad/Zone → 400「男方信息：时区不合法…」
```

### 2. 浏览器目视确认（两次，均 PASS）

- /chart：四柱表上方琥珀条「⚠ 该时刻在 America/New_York 不存在（夏令时春季跳表），已按 3:30 解析」
- 合婚：男方卡片同条警示；女方（北京 1992 无异常）无警示条
- 时区文本框以键盘直接键入（不从建议点选），验证「自由填写」而非变相下拉

### 3. 离线

```
test-solar-time.mjs 新增 4 条 isValidZone 断言（上海/纽约合法，Mars/Phobos、America/Toronto2 非法）
npm run verify：七段全绿，退出码 0；tsc --noEmit 0 错误
```

---

## 三、缺项

1. P2 未做：`toTrueSolarTime` UTC 构造加固、补夏威夷等城市、补跑 `verify:ai`
2. 英文 i18n 仍未启动（界面全中文）
3. 端口 3000 上存在更早会话遗留的 dev server（PID 19412，同目录、Turbopack 热更新，本轮实测即打在它上面）；我新启的实例因端口占用已自动退出。遗留进程我未擅杀，待你示下处理

---

## 四、一句话

> dstNotice 四处齐备，时区可填任意 IANA、非法有明确 400；
> 两条均经 API＋浏览器双重验证。**未 commit。**
