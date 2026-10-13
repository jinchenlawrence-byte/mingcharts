# MingCharts 品牌标识（Logo）

> **方案**：E —— 朱砂圆角印 · 颜体「命」
> **定稿日期**：2026-10-13
> **生成脚本**：`brand/gen_logo.py`（首轮六方案）· `brand/gen_logo_final.py`（精修）· `brand/gen_lockup_fix.py`（横版修正）

---

## 一、设计说明

```
形     : 圆角方印（radius = 边长 17%）
底色   : 朱砂红 #A62B1F（取自站点 tailwind 的 cinnabar ✗ 与 Nav 的「命」字同色）
字     : 「命」白字 ✗ 占印面 57%
字体   : 方正颜真卿楷书（FZYanZQKSJF）—— ★ 授权见 §四
对齐   : 汉字按【墨迹质心】居中（不是外接框）——
          「命」字上轻下重，外接框居中会导致视觉偏低 ✓
```

**★★ 为什么是「命」而不是「明」**✗（★ 两者都出过稿 ✗ 见 `_精修-命vs明.png` ✓）：
```
· 「命」字形有动势（撇捺舒展）✗ 辨识度高 ✓
· 与站点 Nav 里那个朱砂「命」字呼应 ✗ 品牌一致 ✓
· 语义直接指向业务（命理）✓
· 「明」虽贴合 MingCharts 之名 ✗ 但方正无记忆点 ✗ 且在 Charts 语境下不直接 ✓
```

**★★ 为什么是圆角印而不是尖角印 / 宣纸底**✗：
```
· 圆角在【圆形头像框】里不会被裁（Waffo 店铺、社交头像多是圆形）✓
· 朱砂方块 + 白字【在深色和浅色背景上都能站住】——
  宣纸底方案（白底红字）在深色背景上会是一个突兀的白方块 ✗
```

---

## 二、文件清单

### `final/` —— 正式可用

| 文件 | 尺寸 | 用在哪 |
|---|---|---|
| `mingcharts-logo-1024.png` | 1024² | ★ 主文件（存档 / 印刷 / 需要大图时） |
| `mingcharts-logo-512.png` | 512² | ★★ **Waffo 店铺 Logo（上传这个）** |
| `mingcharts-logo-256.png` | 256² | 网站 og:image / 应用图标 |
| `mingcharts-logo-128.png` | 128² | 列表头像 |
| `mingcharts-logo-64.png` | 64² | 导航栏图标 |
| `mingcharts-logo-32.png` | 32² | 小尺寸（★ 已验证仍可辨 ✓） |
| `mingcharts-lockup-light.png` | 1556×432 | ★ 浅色底横版（方标 + MingCharts）—— 网站页眉 / 邮件签名 |
| `mingcharts-lockup-dark.png` | 1556×432 | ★ 深色底横版（同内容 ✗ 深色背景用） |
| `mingcharts-mark-transparent-cinnabar-1024.png` | 1024² | 透明底 · 朱砂印（叠到任意浅色背景） |
| `mingcharts-mark-transparent-white-1024.png` | 1024² | 透明底 · 白印朱砂字（叠到任意深色背景） |
| `favicon.ico` | 16/32/48 | ★ 网站 favicon（多尺寸 ICO） |
| `favicon-16/32/48.png` | 16/32/48² | favicon 的各尺寸源文件 |
| `mingcharts-logo-ming-1024.png` | 1024² | 「明」字备选稿（未采用 ✗ 留档） |

### `brand/` —— 过程稿

| 文件 | 说明 |
|---|---|
| `_预览-全方案.png` | 首轮六方案对比（A 楷体 / B 方印 / C 宣纸底 / D 金边 / E 颜体 / F 仿宋） |
| `_精修-字号对比.png` | 字身 55% / 57% / 61% 三档对比（含 32/48px 小尺寸验证） |
| `_精修-命vs明.png` | 「命」与「明」对比 |
| `gen_logo.py` / `gen_logo_final.py` / `gen_lockup_fix.py` | 生成脚本（可改参数重出 ✗ 见 §五） |

---

## 三、色彩规范

```
朱砂红  #A62B1F   rgb(166, 43, 31)    ← 主色（印面）
墨      #1C1A18   rgb(28, 26, 24)     ← 横版浅色底的字色 / 描边
宣纸    #FAF7F2   rgb(250, 247, 242)  ← 浅色底 / 印面留白
金      #C4A05C   rgb(196, 160, 92)   ← 点缀（本站 UI 已在用）
```

**★ 与站点一致**：这四色与 `src` 里 tailwind 的 `cinnabar` / `ink` / `paper` / `gold` 同名同值 ✓

---

## 四、★★★★ 字体授权（★ 商用前必读 ✓）

```
★ 本 Logo 的「命」字用的是【方正颜真卿楷书（FZYanZQKSJF.TTF）】
   —— 它随某些软件安装到 Windows ✗ 但【这不等于可以商用】✗✗
★★ 【设计稿 / 内部使用】没问题 ✓
★★★ 【正式商用（收费产品）】前【必须二选一】✗：
   ① 向方正购买该字体的商用授权
   ② 换成【免费可商用】字体重新出稿：
      · 思源宋体 Heavy（Source Han Serif ✗ SIL OFL ✗ 免费商用 ✓）
      · 霞鹜文楷 LXGW WenKai（★ OFL ✗ 免费商用 ✓ 但笔画偏细 ✗ 小尺寸会弱）
      · 站酷系列（★ 免费商用 ✓）
   ③ ★★ 或【把这一个「命」字【矢量化成我们自己的图形】✗
      —— 【那样【字形【不再受【字体授权【约束 ✓✓（我方推荐 ✓）
→ ★★★★ 【请【在上架【收费前【确认这一条**✗ —— 它【不影响【现在【传 Logo 做审核 ✓
```

---

## 五、怎么改参数重出

```powershell
# 生成全套（会覆盖 final/ 下的文件）
& "<python.exe>" brand\gen_lockup_fix.py
```

**脚本里可调的参数**：
- `glyph_ratio`（默认 0.57）—— 字身占印面比例
- `radius_ratio`（默认 0.17）—— 圆角半径占边长比例
- `CINNABAR` / `INK` / `PAPER` —— 配色
- `ch`（`build_mark` 的第一个参数）—— 换成别的字

**★ 两个坑（脚本里已加断言守护）**：
```
① RGBA 图上 `draw.text` 【不传 fill 会【静默什么都不画】**✗ 必须显式传 fill ✓
   → 脚本里已有断言：墨迹像素为 0 就直接报错
② `paste` 的原点是【左上角】**✗ 不是质心
   → 若要质心对齐 ✗ 只对【垂直】做补偿 ✗ 水平【用左边缘 ✗
```

---

## 六、待办

- [ ] ★★★ 上传 `final/mingcharts-logo-512.png` 到 **Waffo → 设置 → 通用 → 店铺 Logo**
- [ ] ★★ 上架收费前确认 §四 的字体授权
- [ ] ★ 可选：把 favicon 换进站点（`src/app/favicon.ico` 或 `icon.png`）
- [ ] ★ 可选：网站 Nav 换成横版 lockup
