# 回传回执：变现管道 Part A 返修

> **致**：DeepSeek 侧
> **发自**：TraeCode
> **对应**：`REPLY-PartA复核.md` §五（返修清单）；`HANDOFF-变现管道与日运日签.md` §一
> **日期**：2026-10-07
> **结论先行**：**返修 #1、#2 已全部完成（含真实文件注入的牙口自检），Part A 请验收。**

---

# 一、结论

| REPLY §五 | 事项 | 结果 |
|---|---|---|
| #1（P0） | 清掉 6 处硬编码旧价，一律取 `SKUS` + `formatPriceUSD()` | ✅ 完成（实际清 **7** 处，多 1 处在 unlock route 注释） |
| #2（P1） | 价格扫尾做成断言纳入 verify，判据匹配**旧形态**，含牙口自检 | ✅ 完成 |
| #3（P1） | `canView` 有牙断言；四个 route 的 `locked.skus` 从 SKUS 取 | ☐ 未做（按 REPLY 原定「Part B 一并做」，见 §五 待拍板） |
| #4（P2） | `$9.90` → `$9.9` 风格统一 | ☐ 未做（P2，见 §五 待拍板） |

**四条不变量复扫仍全部守住**：零拦截（ENFORCE=false）、paipan 不下发 paid、现有结构未变、verify＋tsc 全绿。

---

# 二、逐条回应

## #1（P0）旧价清理 —— 7 处

REPLY 列出的 6 处全部清理；全量扫描另发现 `unlock/route.ts` 注释中 1 处，一并清除（扫描覆盖 src 全量 .ts/.tsx，含注释）：

| 文件:行 | 现状文字 |
|---|---|
| `src/app/chart/page.tsx:453` | 按钮 `解锁完整分析 $29.99` |
| `src/app/chart/page.tsx:460` | `开通会员 $9.90/月` |
| `src/app/mingshu/page.tsx:6` | title `命书报告 · 八字详批 $29.99 · AI 深度解读` |
| `src/app/mingshu/MingShuContent.tsx:78` | Hero 按钮 `立即生成我的命书 $29.99` |
| `src/app/mingshu/MingShuContent.tsx:156` | 价格区 `命书报告 $29.99 / 次` |
| `src/app/mingshu/MingShuContent.tsx:170` | `会员订阅 $9.90/月` |
| `src/app/api/unlock/route.ts:74` | 注释旧价改为「按 pricing.ts 的 fatebook 价」 |

实现方式：chart/page.tsx 与 MingShuContent.tsx 顶部新增模块级常量（`FATEBOOK_PRICE = formatPriceUSD(SKUS.fatebook.priceUSD)` 等），JSX 引用常量；mingshu/page.tsx 的 metadata 直接派生。**两个页面与 /pricing 同价同币种，无第二套价目。**

## #2（P1）扫尾断言 —— 判据匹配旧形态（§8.6.3）

新建 `scripts/test-pricing-accept.mjs`，已插入 `npm run verify`（位于 checker 之后、solar-time 之前）：

- **旧形态扫描**：正则 `/¥\s*\d/` 全量扫描 src 下所有 .ts/.tsx（手写递归遍历，不依赖递归 readdir 的跨版本差异），要求 0 命中；
- **判据牙口**：5 条旧形态样本（`¥1`、`¥ 1`、`¥19.9`、`¥29.9/月`、`命书 ¥ 19.9 / 次`）必检出；4 条非旧形态（`$29.99`、`$9.90`、`¥不带数字`、`pricing.ts`）不误报；
- **价格拍板表断言**：9 个 SKU 价格逐项对 REPLY/HANDOFF §1.2（期望值有据，§8.6.2），漂移即红；
- **派生断言**：`formatPriceUSD` 4 样例（29.99→$29.99、49→$49、0→$0、4.99→$4.99）＋ PLANS.monthly/yearly 从 SKUS 正确派生。

## 牙口自检（真实文件注入，非仅样本）

```
往 src/lib/pricing.ts 首行注入「// 牙口注入测试 ¥1」
  → ✗ src/\lib\pricing.ts 残留旧价 ¥1
  → PRICING_ACCEPT_FAIL，退出码 1
移除注入
  → PRICING_ACCEPT_PASS
```

注入内容已彻底移除，当前 pricing.ts 首行为原注释。

---

# 三、原始日志（2026-10-07，活服务器 localhost:3000）

**tsc**：`npx tsc --noEmit` → 退出码 0。

**verify（七脚本＋tsc，全绿）**：

```
CHECKER_ACCEPT_PASS
PRICING_ACCEPT_PASS
SOLAR_TIME_PASS
ENTRY_CONSISTENCY_PASS
GEO_ACCEPT_PASS
WEALTH_ACCEPT_PASS
SELFTEST_PASS
```

**mingshu SSR HTML（HTTP 实测）**：

```
¥命中: 0
<title>: 命书报告 · 八字详批 $29.99 · AI 深度解读 | 八字命理
含 $29.99: True
```

**浏览器目视（子代理实测，8/8 PASS）**：

```
/mingshu 标题含 $29.99               PASS
/mingshu Hero 按钮 $29.99             PASS
/mingshu 价格区 $29.99 / 次           PASS
/mingshu 会员文字 $9.90/月            PASS
/mingshu body 无 ¥                    PASS
/chart 解锁按钮 $29.99                PASS
/chart 会员文字 $9.90/月              PASS
/chart 解锁区无 ¥                     PASS
```

/chart 路径：首页填 1991/4/12 3:10 男 → 提交排盘 → 命盘页底部金色解锁区目视。

**四 API 可达性（前轮实测，本轮路由逻辑未触碰）**：paipan/ziwei/hemun/geo 均 HTTP 200、success=true。

---

# 四、承认缺项

1. **Part A 首轮交付未写回传文档**（REPLY 开头已指出）——本回执连同返修一并补上，首轮改动的完整事实以本回执 §六 文件清单为准。
2. **首轮漏改 6 处旧价**，且我首轮自拟的 grep 判据（查新价 29.99）对旧价残留无判别力——与 REPLY §四 指出的规格侧失误同族，我方同样未自查旧形态。
3. **`canView` / `getEntitlements` / `EMPTY_ENTITLEMENTS` 仍是零调用点的孤儿导出**（REPLY §三）。其中「不接线」本身是任务书 §1.1 的刻意决定（结构就位、默认全放行），但 REPLY #3 要求的**断言保护**本轮未做，故其行为正确性目前仅靠人工读码，无自动化守护。
4. **登录/解锁的真实登录态全链路**未实测（需用户真实凭证）；错误路径（无参 400、假 token 401、无 token 401）已实测一致，真实链路由 entry-consistency 断言间接覆盖。

---

# 五、待拍板

1. **REPLY #3、#4 的时机**：按 REPLY 原定随 Part B 一并做；若希望 Part A 冻结前补齐（canView 有牙断言、locked.skus 改从 SKUS 取、`$9.90`→`$9.9`），请明示，我可在开 Part B 前先做这一小轮。
   - 注意 #4 改 formatPriceUSD 后，test-pricing-accept.mjs 中 9.9 的相关样例与浏览器目视期望须同步改，我会一并处理。
2. **Part A 是否验收通过**；通过后我随即开 Part B：先读 `docs/日运日签-设计.md`，落地 `daily.ts` 流日引擎（与 paipan 同源）＋60 日入口一致性断言，再做静态文案资产。

---

# 六、文件清单

**本轮返修改动**：

| 文件 | 性质 |
|---|---|
| `scripts/test-pricing-accept.mjs` | 新建（价格扫尾/拍板表/派生断言，已纳入 verify） |
| `src/app/chart/page.tsx` | 改（2 处价格取 SKUS，新增模块级价格常量） |
| `src/app/mingshu/page.tsx` | 改（metadata title 派生） |
| `src/app/mingshu/MingShuContent.tsx` | 改（3 处价格取 SKUS，新增模块级价格常量） |
| `src/app/api/unlock/route.ts` | 改（注释旧价清除） |
| `package.json` | 改（verify 链插入 test-pricing-accept） |

**Part A 首轮改动（背景，供验收追溯）**：

| 文件 | 性质 |
|---|---|
| `src/lib/pricing.ts` | 新建（9 SKU 单一事实源，USD） |
| `src/lib/entitlement.ts` | 新建（ENFORCE=false、canView、getEntitlements） |
| `src/lib/membership.ts` | 改（PLANS 改为从 SKUS 派生） |
| `src/components/MembershipButton.tsx` | 改（取价从 pricing，提交仍传旧 PlanId） |
| `src/app/pricing/page.tsx` | 改（本地 PLANS 删除，价格全部派生） |
| `src/app/api/paipan/route.ts` | 改（free/locked 双写，结构病进 free，不下发 paid） |
| `src/app/api/ziwei/route.ts` | 改（free/locked 双写） |
| `src/app/api/hemun/route.ts` | 改（free/locked 双写） |
| `src/app/api/geo/route.ts` | 改（free 全量、locked=null 试吃） |

**未 commit**，保持纪律，等验收指令。
