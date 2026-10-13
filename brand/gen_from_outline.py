# 从矢量轮廓出 Logo（★ 用 fontTools 的结构化 pen ✗ 不解析 SVG 字符串 ✓）
#
# 前一版自己写 SVG path 解析器 ✗ 在 H/V 和隐式重复上翻车 ✓
# 改用 fontTools 的 RecordingPen：它直接给出 MoveTo/LineTo/CurveTo/ClosePath 对象，
# 不存在字符串解析歧义 —— 这是正确做法。
#
# 产出：
#   vector/mingcharts-logo.svg        ← ★ 真正的矢量交付物（无限缩放 ✗ 可改色 ✓）
#   final/mingcharts-logo-*.png       ← 各尺寸位图（Waffo 要 PNG ✗）
#   final/favicon.*                   ← favicon
import json
import os
import sys

sys.path.insert(0, r"C:\Users\Administrator\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\python\Lib\site-packages")

from PIL import Image, ImageDraw
from fontTools.ttLib import TTFont
from fontTools.pens.recordingPen import DecomposingRecordingPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen

BASE = r"E:\ai-agent\stock1000\bazi-mvp\brand"
VEC = os.path.join(BASE, "vector")
FINAL = os.path.join(BASE, "final")
os.makedirs(VEC, exist_ok=True)
os.makedirs(FINAL, exist_ok=True)

FONT = os.path.join(BASE, "_fonts", "SHS-Heavy.otf")
GLYPH = "命"
CINNABAR = (166, 43, 31)
CINNABAR_HEX = "#A62B1F"


# ── ① 读出结构化轮廓（★ Decomposing ✗ 复合字形会被展开 ✓）──
font = TTFont(FONT, fontNumber=0)
glyphset = font.getGlyphSet()
gname = font.getBestCmap()[ord(GLYPH)]

rec = DecomposingRecordingPen(glyphset)
glyphset[gname].draw(rec)

bp = BoundsPen(glyphset)
glyphset[gname].draw(bp)
xmin, ymin, xmax, ymax = bp.bounds
gw, gh = xmax - xmin, ymax - ymin
print(f"  字形 {gname} 包围盒 ({xmin},{ymin})→({xmax},{ymax})  {gw:.0f}×{gh:.0f}  高宽比 {gh/gw:.3f}")
assert 0.8 < gh / gw < 1.25, "★ 轮廓高宽比异常 —— 字形不完整"
print("  ✓ 轮廓完整")

# ★ SVG path（从同一套结构化命令生成 ✗ 不手写解析 ✓）
svg_pen = SVGPathPen(glyphset)
glyphset[gname].draw(svg_pen)
d_attr = svg_pen.getCommands()
print(f"  SVG path {len(d_attr)} 字符")
with open(os.path.join(VEC, "命.path.txt"), "w", encoding="utf-8") as fh:
    fh.write(d_attr)


# ── ② 结构化命令 → 多边形环（贝塞尔采样）──
STEPS = 16


def cubic(p0, p1, p2, p3, t):
    u = 1 - t
    return (u*u*u*p0[0] + 3*u*u*t*p1[0] + 3*u*t*t*p2[0] + t*t*t*p3[0],
            u*u*u*p0[1] + 3*u*u*t*p1[1] + 3*u*t*t*p2[1] + t*t*t*p3[1])


def quad(p0, p1, p2, t):
    u = 1 - t
    return (u*u*p0[0] + 2*u*t*p1[0] + t*t*p2[0],
            u*u*p1[0]*0 + u*u*p0[1] + 2*u*t*p1[1] + t*t*p2[1])


def to_contours(rec):
    """★ 直接消费 RecordingPen 的命令对象 ✗ 无字符串解析。"""
    contours, cur = [], []
    pen = (0.0, 0.0)
    for op, args in rec.value:
        if op == "moveTo":
            if cur:
                contours.append(cur)
            pen = args[0]; cur = [pen]
        elif op == "lineTo":
            pen = args[0]; cur.append(pen)
        elif op == "qCurveTo":
            # ★ TrueType 的二次曲线：最后一个点是终点 ✗ 前面可能有多个控制点
            pts = list(args)
            end = pts[-1]
            if len(pts) == 3 and pts[-2] is None:
                # 特殊的"隐含中点"形式（TrueType 的 qCurveTo 约定）
                ctrl = pts[0]
                mid = ((pen[0] + end[0]) / 2, (pen[1] + end[1]) / 2)
                for s in range(1, STEPS + 1):
                    cur.append(quad(pen, ctrl, mid, s / STEPS))
                pen = mid
            else:
                for k in range(len(pts) - 1):
                    ctrl = pts[k]
                    nxt = pts[k + 1]
                    for s in range(1, STEPS + 1):
                        cur.append(quad(pen, ctrl, nxt, s / STEPS))
                    pen = nxt
            pen = end
        elif op == "curveTo":
            pts = list(args)
            p1, p2, p3 = pts[-3], pts[-2], pts[-1]
            for s in range(1, STEPS + 1):
                cur.append(cubic(pen, p1, p2, p3, s / STEPS))
            pen = p3
        elif op == "closePath":
            if cur:
                cur.append(cur[0])
                contours.append(cur); cur = []
    if cur:
        contours.append(cur)
    return contours


contours = to_contours(rec)
pts_all = [p for c in contours for p in c]
xs = [p[0] for p in pts_all]; ys = [p[1] for p in pts_all]
px0, px1, py0, py1 = min(xs), max(xs), min(ys), max(ys)

# ★★★ 牙口：采样后的包围盒必须与 fontTools 的 BoundsPen 一致
#   （★ 采样只会切角 ✗ 所以允许极小的内缩 ✗ 但不能差很多 ✓）
slack = max(gw, gh) * 0.01
assert abs(px0 - xmin) < slack and abs(px1 - xmax) < slack, "★ x 方向包围盒不符"
assert abs(py0 - ymin) < slack and abs(py1 - ymax) < slack, "★ y 方向包围盒不符"
print(f"  采样后包围盒 ({px0:.0f},{py0:.0f})→({px1:.0f},{py1:.0f})  ✓ 与 BoundsPen 一致（容差 {slack:.1f}）")
print(f"  {len(contours)} 环 · {len(pts_all)} 顶点")


# ── ③ 光栅化 ──
def rasterize(W, radius_ratio=0.17, glyph_ratio=0.52,
              draft=CINNABAR, glyph=(255, 255, 255, 255)):
    """★★ 注意 y 轴：字体坐标 y 向上 ✗ 图像坐标 y 向下 —— 必须翻转（y_img = oy - y*k）。"""
    img = Image.new("RGBA", (W, W), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    m = W * 0.022
    d.rounded_rectangle([m, m, W - m, W - m], radius=W * radius_ratio, fill=draft + (255,))
    k = (W * glyph_ratio) / max(gw, gh)
    ox = W / 2 - (xmin + gw / 2) * k
    y_target = W / 2 - W * 0.010          # 视觉重心略高于几何中心
    oy = y_target + (ymin + gh / 2) * k   # ★ 翻转后的原点
    for c in contours:
        d.polygon([(ox + x * k, oy - y * k) for x, y in c], fill=glyph)
    return img


master = rasterize(2048).resize((1024, 1024), Image.LANCZOS)
for s in (1024, 512, 256, 128, 64, 32):
    (master if s == 1024 else master.resize((s, s), Image.LANCZOS)).save(
        os.path.join(FINAL, f"mingcharts-logo-{s}.png"))
for s in (16, 32, 48):
    master.resize((s, s), Image.LANCZOS).save(os.path.join(FINAL, f"favicon-{s}.png"))
master.resize((256, 256), Image.LANCZOS).save(
    os.path.join(FINAL, "favicon.ico"), sizes=[(16, 16), (32, 32), (48, 48)])
print("  ✓ 全套 PNG + favicon")

# 透明底两版（★ 叠到任意背景 ✓）
rasterize(2048).resize((1024, 1024), Image.LANCZOS).save(
    os.path.join(FINAL, "mingcharts-mark-transparent-cinnabar-1024.png"))
rasterize(2048, draft=(255, 255, 255), glyph=CINNABAR).resize((1024, 1024), Image.LANCZOS).save(
    os.path.join(FINAL, "mingcharts-mark-transparent-white-1024.png"))
print("  ✓ 透明底两版")


# ── ④ 矢量文件（★ 真正的交付物 ✓）──
def svg_mark(size=512, radius_ratio=0.17, glyph_ratio=0.52,
             draft=CINNABAR_HEX, glyph="#FFFFFF"):
    """★ SVG 的 y 轴同样向下 ✗ 所以用 scale(k, -k) 翻转（字体坐标向上）。"""
    m = size * 0.022
    w = size - 2 * m
    r = size * radius_ratio
    k = (size * glyph_ratio) / max(gw, gh)
    ox = size / 2 - (xmin + gw / 2) * k
    y_target = size / 2 - size * 0.010
    oy = y_target + (ymin + gh / 2) * k
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}" width="{size}" height="{size}">
  <!-- MingCharts mark · 字形轮廓提取自 Source Han Serif (SIL OFL 1.1) -->
  <rect x="{m:.2f}" y="{m:.2f}" width="{w:.2f}" height="{w:.2f}" rx="{r:.2f}" ry="{r:.2f}" fill="{draft}"/>
  <g transform="translate({ox:.3f} {oy:.3f}) scale({k:.6f} -{k:.6f})">
    <path d="{d_attr}" fill="{glyph}"/>
  </g>
</svg>
'''


open(os.path.join(VEC, "mingcharts-logo.svg"), "w", encoding="utf-8").write(svg_mark(512))
open(os.path.join(VEC, "mingcharts-logo-white.svg"), "w", encoding="utf-8").write(
    svg_mark(512, draft="#FFFFFF", glyph=CINNABAR_HEX))
print("  ✓ vector/mingcharts-logo.svg（+ white 版）")
print("\n  完成。")
