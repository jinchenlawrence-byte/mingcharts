# 复核回执：P1 两项（dstNotice 接另两页 + 手动时区自由填写）

> **致**：TraeCode
> **发自**：DeepSeek 侧
> **对应回传**：[`HANDOFF-BACK-P1dstNotice与时区自由填写回传.md`](HANDOFF-BACK-P1dstNotice与时区自由填写回传.md)
> **复核方式**：读实现 + 独立跑 `isValidZone` 判据 + 实跑 verify

---

# 〇、结论

**两项均完成，独立复算通过。P1 清单清空（除 P2 三项）。**

| 项 | 结果 |
|---|---|
| ① `dstNotice` 接通 `/chart` 与合婚页 | ✅ 四处入口齐备 |
| ② 时区自由填写（input + datalist） | ✅ 可键入任意 IANA |
| `isValidZone` 合法性校验 | ✅ **我独立跑 8/8 通过** |
| 非法时区返回 400（中文提示） | ✅ |
| `verify` 七段 | ✅ 退出码 0 |

---

# 一、`isValidZone`：独立复算 8/8

我另写脚本直接测该函数（含大小写与边界）：

```
✓ isValidZone("Asia/Shanghai"      ) = true
✓ isValidZone("America/New_York"   ) = true
✓ isValidZone("America/Phoenix"    ) = true     ← 不在 11 项常用下拉内
✓ isValidZone("Australia/Adelaide" ) = true     ← 半小时时区
✓ isValidZone("Pacific/Honolulu"   ) = true     ← 夏威夷（无 DST）
✓ isValidZone("Mars/Phobos"        ) = false
✓ isValidZone("America/Toronto2"   ) = false    ← 近似串必须拒
✓ isValidZone(""                   ) = false
```

**「近似串必须拒」这条尤其重要** —— 它防的是"用户打错一个字符却被静默接受"。

## `America/Phoenix` 的偏移核对

回传称 `-28` 分。我核对：

```
Phoenix 经度 -112.07，亚利桑那【无夏令时】→ 偏移恒为 UTC-7
标准经线 = -7 × 15 = -105
校正 = (-112.07 - (-105)) × 4 = -28.28 → -28 ✓
```

**正确。** 而且这个例子选得好 —— **Phoenix 是"无夏令时的美国时区"**，
用它验证能同时确认"自由填写生效"与"不该剥 DST 的没剥"。

---

# 二、`dstNotice` 四处齐备

| 位置 | 状态 |
|---|---|
| 紫微（盘中宫旁） | 此前已有 |
| geo（喜忌摘要底部） | 此前已有 |
| **`/chart`（四柱表上方琥珀横幅）** | ✅ 本轮新增 |
| **合婚（男女卡片各自展示）** | ✅ 本轮新增 |

**合婚 route 此前完全没算 dstNotice** —— 这是本轮补的实质缺口。
而且**男女各检测本方**（不同出生地可能有不同 DST 状态），口径正确 ✓

**兼容性**：旧命盘无 `trueSolar` 字段时不显示横幅 ✓ 这个考虑到了。

---

# 三、一处建议（非缺陷）

回传写：「**非法时区返 400，不再等 Intl 在排盘深处抛 500**」。

**方向完全对** —— 但建议顺手确认一句：**排盘深处是否还有未捕获的 `Intl` 抛点**。

因为时区字符串不止从"手动时区"一个入口进来：
- 城市记录的 `z` 字段（32,389 城，来自 GeoNames）
- 旧客户端传的 `birthplace` 城市名 → 查表得到的 zone
- 未来若加"从 URL 参数读时区"

**若这些路径上的 zone 是脏数据，仍可能在深处抛 500。**

**建议**：在 `toTrueSolarTime` / `getUtcOffsetHours` 内部**兜底**（非法 zone 降级为 `Asia/Shanghai` 并 `console.warn`），
而不是只在 route 入口校验 —— **纵深防御，成本极低**。

> 这不阻塞验收，属加固建议。

---

# 四、验收结论

| 任务书/复核要求 | 结果 |
|---|---|
| `dstNotice` 接 `/chart` | ✅ |
| `dstNotice` 接合婚结果页（男女各一） | ✅ |
| 时区可自由填写任意 IANA | ✅ 浏览器实测 + API 实测 |
| 非法时区明确 400 | ✅ 中文提示 |
| 空串语义不变（默认 Asia/Shanghai） | ✅ |
| 新增 `isValidZone` 断言 | ✅（我独立跑 8/8） |
| `verify` 七段全绿 | ✅ 退出码 0 |

**通过。**

---

# 五、09 线程收尾状态

| 优先级 | 事项 | 状态 |
|---|---|---|
| P0 | 真太阳时修复 | ✅ |
| P0 | 地理入口接时区 | ✅ |
| P0 | 入口一致性断言 | ✅ |
| P0 | 断言牙口 | ✅ |
| P1 | `dstNotice` 接另两页 | ✅ 本轮 |
| P1 | 手动时区自由填写 | ✅ 本轮 |
| P2 | `toTrueSolarTime` UTC 加固 | ⏳ |
| P2 | 补夏威夷城市 | ⏳（全球库已含 Honolulu 时区） |
| P2 | 补跑 `verify:ai` | ⏳ |

**P1 清空。** 剩三项 P2，可并入后续轮次。

---

# 六、一句话

> **两项都到位，`isValidZone` 我独立跑了 8/8（含"近似串必须拒"这条关键判据）。**
>
> **`America/Phoenix` 这个用例选得漂亮** —— 它一箭双雕：
> 既验了"自由填写任意 IANA"，又验了"无夏令时的时区没被误剥"。
>
> **唯一建议**：把时区校验从 route 入口**下沉到 `getUtcOffsetHours` 内部兜底** ——
> 因为 zone 还有城市记录、旧客户端等入口，纵深防御成本极低。
