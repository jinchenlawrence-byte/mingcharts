# HANDOFF-BACK：合婚页接入出生地（真太阳时任务补充）回传

> **致**：DeepSeek 侧
> **发自**：TraeCode
> **日期**：2026-10-07
> **关联**：[`HANDOFF-BACK-真太阳时与时区回传.md`](HANDOFF-BACK-真太阳时与时区回传.md)（主回传，其 §六 已摘要本次工作）

---

## 〇、一句话结论

**09 轮主任务只接通了批命与紫微，合婚（/hemun）此前是三个入口里唯一不支持出生地的——北美用户合婚会直接按错误时辰配对。本轮已补齐：合婚 API 与页面均支持城市名 / 手动经度+时区，三路径实测通过，`verify` 六段保持全绿。**

---

## 一、做了什么

| 文件 | 改动 |
|---|---|
| `src/lib/birthCities.ts` | **新建**：抽出三处页面原本各写一份的 `CityRow` 类型、cnCities/naCities 分组、COMMON_ZONES（11 项常用时区），单一数据源 |
| `src/app/api/hemun/route.ts` | RawBirth 增加 `birthplace / birthLng / birthZone`；`parseBirth` 内用 `resolveBirthRef` 解析（手动优先，城市次之），注入 `PaipanInput`；旧客户端不传时行为不变 |
| `src/app/hemun/page.tsx` | 男女双方卡片各加：城市分组下拉（中国/北美 optgroup）、手动经度框＋时区下拉、「将采用时区…」实时提示；注明夏令时自动判定 |
| `src/app/page.tsx`、`src/app/ziwei/page.tsx`、`api/paipan`、`api/ziwei` | 本地城市常量与 JSON 直引改为共用 `birthCities` 模块（纯去重，逻辑不变） |

偏移计算仍在 `paipan()` 内部完成，合婚没有另造一套路径——与主回传 §一-2 的防「改了没接链路」原则一致。

---

## 二、验收日志

### 1. API 原生 fetch 实测（dev server）

```
城市路径：男 纽约 1990-07-01 14:30 → 时柱 丁未，偏移 -56
          女 北京 1992-08-15 09:00 → 时柱 丙辰，偏移 -14
手动路径：男 birthLng=-74, birthZone=America/New_York → 时柱 丁未，偏移 -56（与城市路径一致）
无校正：男不传出生地 → 偏移 0（旧行为保留）
合婚总观感正常返回：「整体协调，长处在多」
```

北京取 1992-08 是为了落在非夏令时年份，偏移 -14 与旧公式 (116.4−120)×4 逐值一致。

### 2. 浏览器实测

- 第一轮 7 项检查 6 PASS：城市分组下拉、时区提示、「（手动经度）」后缀、布局均正常；唯女方时柱显示「丁巳」与预期「丙辰」不符
- **复查确认是操作误差而非代码问题**：首轮女方城市下拉未真正选中（09:00 不校正恰好正是丁巳）。第二轮在女方卡片明确选中「北京」，提示显示「将采用时区：Asia/Shanghai」，提交后男方时柱丁未、女方时柱**丙辰**，全项 PASS

### 3. 离线验收

```
npm run verify（本轮实跑两次，均退出码 0）:
  CHECKER_ACCEPT_PASS  SOLAR_TIME_PASS  GEO_ACCEPT_PASS
  WEALTH_ACCEPT_PASS   SELFTEST_PASS
tsc --noEmit：0 错误
```

---

## 三、缺项（如实列出）

1. 合婚结果页未展示 dstNotice（与批命 /chart 同一缺项；紫微页已展示）；API 字段齐全
2. 合婚页 UI 仍为中文，英文 i18n 待统一启动
3. 手动时区仍为 11 项下拉，不支持自由填写 IANA 文本

---

## 四、待拍板

沿用主回传 §四清单（英文 i18n 时机、dstNotice 是否接 /chart 与合婚结果页、时区自由文本、北美城市扩补、是否补跑 verify:ai），本轮无新增决策项。

---

## 五、一句话

> 合婚是时区修复里最后一块没接上的入口，本轮补齐并经 API＋浏览器双重验证；
> 浏览器首轮的「丁巳」虚惊经复查定位为下拉未选中，代码无问题。**未 commit。**
