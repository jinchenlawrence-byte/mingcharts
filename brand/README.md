# MingCharts 品牌标识（Logo）

> **方案**：朱砂圆角印 · 宋体「命」
> **★ 定稿日期**：2026-10-13
> **★★ 字形来源**：**思源宋体 Heavy（Source Han Serif ✗ SIL OFL 1.1 ✗ 免费商用）**
> **★★★ 交付形态**：**真正的矢量**（SVG ✗ 从字体轮廓提取 ✗ 非位图描摹）

---

## 一、为什么是矢量（★ 与"位图描摹"的区别 ✓）

```
★ 从【字体文件的轮廓数据】直接提取贝塞尔曲线 → SVG path**✗
   —— 【拿到的是【真正的数学曲线 ✗ 无限缩放不失真 ✓
   —— ★★ 【而且【不经过【位图渲染 ✗ 【没有【锯齿 ✗ 【没有【采样损失 ✓
★★ 【位图描摹（★ 放大→描边→取轮廓 ✓）会【引入【锯齿【和【节点噪声**✗ 【不【采用 ✓
→ ★★★ 【产出：`vector/mingcharts-logo.svg`（★ 1 KB ✗ 而 PNG 是 26-47 KB ✓）
```

**★ 提取方式**：`fontTools` 的 `DecomposingRecordingPen` → 结构化命令 → 采样 → Pillow 填充 ✓
（★ **不手写 SVG path 字符串解析**✗ —— 第一版那么做，在 `H`/`V` 命令上翻车了 ✓）

---

## 二、设计说明

```
形     : 圆角方印（radius = 边长 17%）
底色   : 朱砂红 #A62B1F（取自站点 tailwind 的 cinnabar ✗ 与 Nav 的「命」字同色）
字     : 「命」白字 ✗ 最长边占印面 52%
字体   : 思源宋体 Heavy（SIL OFL 1.1 ✗ 免费商用 ✓）
对齐   : 按【轮廓包围盒】居中 ✗ 视觉重心上浮 1%
坐标   : ★【字体 y 轴向上 ✗ 图像/SVG y 轴向下】**✗ 全程做 `y → -y` 翻转 ✓
```

**★★ 为什么字身是 52% 而不是 57%**✗：
```
· 思源宋的字面【几乎填满字身】**（967×950 / 1000 ✓）
· 而方正颜体只占 0.85（340×338 / 400 ✓）
· → 同样 57% ✗ 思源宋视觉上大很多 ✗ 显得挤 ✓
· 实测 49% 偏空 · 【52% 最平衡】· 55% 偏满 —— 见 `_字身比例对比.png` ✓
```

**★★ 为什么是「命」而不是「明」**✗（★ 两者都出过稿 ✗ 见 `_精修-命vs明.png` ✓）：
```
· 「命」字形有动势 ✗ 辨识度高 ✗ 与站点 Nav 的朱砂「命」字呼应 ✓
· 「明」虽贴合 MingCharts 之名 ✗ 但方正无记忆点 ✓
```

**★★ 为什么圆角而非尖角、朱砂块而非宣纸底**✗：
```
· 圆角在【圆形头像框】里不会被裁（Waffo 店铺、社交头像多是圆形 ✓）
· 朱砂块 + 白字【在深色和浅色背景上都能站住】——
  白底方案在 Waffo 的深色店铺页上会是一个突兀的白方块 ✓
```

---

## 三、★★★ 字体授权（★ 已经干净了 ✓）

```
★ 本 Logo 的字形来自【思源宋体 Source Han Serif（Adobe + Google 联合发布）】**✗
★★ 授权：【SIL Open Font License 1.1】**✗✓
   —— ★★★ 【明确允许：商用 ✓ 嵌入 ✓ 修改 ✓ 再分发 ✓
   —— 【唯一的 OFL 义务（★ 若【再分发【修改后【的【字体文件【需【改名 ✓）
     【我们【只【用它【做【图形 ✗ 【不【分发【字体【文件 ✓ 【不【触发 ✓✓
→ ★★★★ 【所以【不再有【之前的【方正字体【授权【问题 ✓✓

★★ 历史：首版用的是【方正颜真卿楷书（FZYanZQKSJF）】
   —— 【它随某些软件装到 Windows ✗ 【但【商用【需【授权**✗
   —— ★★ 【且【注意：【单纯【"把【字形【描成【曲线"【不【解决【授权问题**✗✗
     —— 【因为【著作权【保护【的【是【字形的【美术【设计 ✗ 【不是【文件格式 ✓
   —— ★★★ 【所以【正确【做法【是【换成【OFL 【字体（本案 ✓）
     【或【自行【原创【设计【一个【字形 ✓
```

**★ 本仓库不提交字体文件**（`brand/.gitignore` 已排除 ✓）——
**需要时脚本从官方 zip 重新提取** ✓

---

## 四、文件清单

### `final/` —— 正式可用

| 文件 | 尺寸 | 用在哪 |
|---|---|---|
| `mingcharts-logo-1024.png` | 1024² | 主文件（存档 / 印刷） |
| **`mingcharts-logo-512.png`** | 512² | ★★ **Waffo 店铺 Logo（上传这个）** |
| `mingcharts-logo-256.png` | 256² | 网站 og:image |
| `mingcharts-logo-128.png` | 128² | 列表头像 |
| `mingcharts-logo-64.png` | 64² | 导航栏图标 |
| `mingcharts-logo-32.png` | 32² | 小尺寸（★ 已验证仍可辨 ✓） |
| `mingcharts-lockup-light.png` | 1556×432 | ★ 浅色底横版（网站页眉 / 邮件签名） |
| `mingcharts-lockup-dark.png` | 1556×432 | ★ 深色底横版 |
| `mingcharts-mark-transparent-cinnabar-1024.png` | 1024² | 透明底 · 朱砂印（叠浅色背景） |
| `mingcharts-mark-transparent-white-1024.png` | 1024² | 透明底 · 白印朱砂字（叠深色背景） |
| `favicon.ico` / `favicon-{16,32,48}.png` | — | ★ 网站 favicon |
| `mingcharts-logo-ming-1024.png` | 1024² | 「明」字备选稿（未采用 ✗ 留档） |

### `vector/` —— ★ 矢量源文件（真正的交付物 ✓）

| 文件 | 说明 |
|---|---|
| **`mingcharts-logo.svg`** | ★★★ **矢量 Logo**（1 KB ✗ 无限缩放 ✗ 可任意改色 ✓） |
| `mingcharts-logo-white.svg` | 白底朱砂字版 |
| `命.path.txt` | 字形轮廓的 SVG path 数据（可嵌入别处） |
| `bounds.json` | 轮廓包围盒（★ 供脚本做一致性牙口 ✓） |

### `brand/` —— 过程稿与脚本

| 文件 | 说明 |
|---|---|
| `_预览-全方案.png` | 首轮六方案对比（楷体 / 方印 / 宣纸底 / 金边 / 颜体 / 仿宋） |
| `_精修-字号对比.png` | 字身 55/57/61% 对比 |
| `_精修-命vs明.png` | 「命」与「明」对比 |
| `_思源宋-字重对比.png` | 颜体 vs 思源宋 SemiBold/Bold/Heavy |
| `_字身比例对比.png` | 思源宋 49/52/55% 对比 |
| `extract_outline.py` | 从 OTF 提取轮廓 → SVG path + bounds.json |
| `gen_from_outline.py` | ★ 主脚本：轮廓 → 全套 PNG ＋ SVG |
| `gen_lockup_ofl.py` | 横版 lockup（深浅两版） |
| `gen_logo.py` / `gen_logo_final.py` / `gen_lockup_fix.py` | 首轮（颜体）脚本 ✗ 留作记录 |

---

## 五、色彩规范

```
朱砂红  #A62B1F   rgb(166, 43, 31)      ← 主色（印面）
墨      #1C1A18   rgb(28, 26, 24)       ← 横版浅色底的字色
宣纸    #FAF7F2   rgb(250, 247, 242)    ← 浅色底
金      #C4A05C   rgb(196, 160, 92)     ← 点缀（站点 UI 已在用）
```

**★ 与站点一致**：这四色与 `src` 里 tailwind 的 `cinnabar` / `ink` / `paper` / `gold` 同名同值 ✓

---

## 六、怎么重新生成

```powershell
# ① 取字体（一次性 ✗ 65 MB ✗ 不进仓库）
#    https://github.com/adobe-fonts/source-han-serif/releases/download/2.003R/14_SourceHanSerifCN.zip
#    放到 brand/_fonts/SourceHanSerifCN.zip

# ② 提取轮廓
& "<python>" brand\extract_outline.py

# ③ 出全套（PNG + SVG）
& "<python>" brand\gen_from_outline.py

# ④ 出横版
& "<python>" brand\gen_lockup_ofl.py
```

**可调参数**（`gen_from_outline.py` 里）：
- `glyph_ratio`（默认 0.52）—— 字身占印面比例
- `radius_ratio`（默认 0.17）—— 圆角半径比例
- `CINNABAR` / `CINNABAR_HEX` —— 配色

**★ 脚本里的断言（★ 都是踩过坑之后加的 ✓）**：
```
① RGBA 图上 draw.text 【不传 fill 会【静默什么都不画】**✗ → 断言墨迹像素 > 0 ✓
② paste 的原点是【左上角】**✗ 不是质心 → 只对垂直做质心补偿 ✓
③ 采样后包围盒【必须与 fontTools 的 BoundsPen 一致**✗
   —— 若 H/V 处理错 ✗ 这里会立刻暴露 ✗ 而不是等到看图才发现 ✓
④ 字体 y 轴向上 ✗ 图像/SVG y 轴向下 → 必须翻转 ✓（★ 漏了【字会【上下颠倒 ✓）
```

---

## 七、待办

- [ ] ★★★ 上传 `final/mingcharts-logo-512.png` 到 **Waffo → 设置 → 通用 → 店铺 Logo**
- [ ] ★ 可选：把 `final/favicon.ico` 换进站点（`src/app/favicon.ico`）
- [ ] ★ 可选：网站 Nav 换成横版 lockup
- [x] ★★ 字体授权问题 —— **已解决**（换成 OFL 字体 ＋ 矢量交付 ✓）
