# 从字体直接提取「命」的矢量轮廓 → SVG path
#
# ★ 不走"位图描摹"：直接读字体的贝塞尔曲线（CFF/TrueType 都可以）
#   这样得到的是【真正的矢量】—— 无限缩放、可任意改色、无锯齿
import os
import sys

sys.path.insert(0, r"C:\Users\Administrator\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\python\Lib\site-packages")

from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen

OUT = r"E:\ai-agent\stock1000\bazi-mvp\brand"
HEAVY = rf"{OUT}\_fonts\SHS-Heavy.otf"
GLYPH = "命"
CMAP = ord(GLYPH)

font = TTFont(HEAVY, fontNumber=0)
upem = font["head"].unitsPerEm
print(f"  unitsPerEm = {upem}")

cmap = font.getBestCmap()
gname = cmap.get(CMAP)
print(f"  字形名 = {gname}")

glyphset = font.getGlyphSet()
pen_bounds = BoundsPen(glyphset)
glyphset[gname].draw(pen_bounds)
xmin, ymin, xmax, ymax = pen_bounds.bounds
print(f"  轮廓包围盒 = ({xmin}, {ymin}) → ({xmax}, {ymax})   宽 {xmax-xmin} 高 {ymax-ymin}")

# ★ 关键：轮廓是否完整（高度应接近宽度 ✗ 否则说明字形数据异常）
w, h = xmax - xmin, ymax - ymin
print(f"  高宽比 = {h/w:.3f}   " + ("✓ 正常" if 0.8 < h/w < 1.25 else "★ 异常"))

# 导出 SVG path（★ TrueType 是二次曲线 ✗ CFF 是三次 ✗ SVGPathPen 自动转换 ✓）
pen = SVGPathPen(glyphset)
glyphset[gname].draw(pen)
d = pen.getCommands()
print(f"  path 命令长度 = {len(d)} 字符")

os.makedirs(os.path.join(OUT, "vector"), exist_ok=True)
with open(os.path.join(OUT, "vector", "命.path.txt"), "w", encoding="utf-8") as fh:
    fh.write(d)
print(f"  ✓ 已存 vector/命.path.txt")
