# 横版 lockup（方标 + MingCharts）—— 用同一套矢量轮廓 ✗ 与方标严格一致
import os
import sys

sys.path.insert(0, r"C:\Users\Administrator\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\python\Lib\site-packages")

import numpy as np
from PIL import Image, ImageDraw, ImageFont
from fontTools.ttLib import TTFont
from fontTools.pens.recordingPen import DecomposingRecordingPen
from fontTools.pens.boundsPen import BoundsPen

BASE = r"E:\ai-agent\stock1000\bazi-mvp\brand"
FINAL = os.path.join(BASE, "final")
FONT = os.path.join(BASE, "_fonts", "SHS-Heavy.otf")
CINNABAR = (166, 43, 31)
INK = (28, 26, 24)
PAPER = (250, 247, 242)
LATIN = r"C:\Windows\Fonts\segoeuib.ttf"
GLYPH_RATIO = 0.52
RADIUS = 0.17
STEPS = 16

font = TTFont(FONT, fontNumber=0)
gs = font.getGlyphSet()
gname = font.getBestCmap()[ord("命")]
rec = DecomposingRecordingPen(gs)
gs[gname].draw(rec)
bp = BoundsPen(gs)
gs[gname].draw(bp)
xmin, ymin, xmax, ymax = bp.bounds
gw, gh = xmax - xmin, ymax - ymin


def cubic(p0, p1, p2, p3, t):
    u = 1 - t
    return (u*u*u*p0[0] + 3*u*u*t*p1[0] + 3*u*t*t*p2[0] + t*t*t*p3[0],
            u*u*u*p0[1] + 3*u*u*t*p1[1] + 3*u*t*t*p2[1] + t*t*t*p3[1])


def to_contours(rec):
    contours, cur, pen = [], [], (0.0, 0.0)
    for op, args in rec.value:
        if op == "moveTo":
            if cur: contours.append(cur)
            pen = args[0]; cur = [pen]
        elif op == "lineTo":
            pen = args[0]; cur.append(pen)
        elif op == "curveTo":
            p1, p2, p3 = args[-3], args[-2], args[-1]
            for s in range(1, STEPS + 1):
                cur.append(cubic(pen, p1, p2, p3, s / STEPS))
            pen = p3
        elif op == "closePath":
            if cur:
                cur.append(cur[0]); contours.append(cur); cur = []
    if cur: contours.append(cur)
    return contours


contours = to_contours(rec)


def mark(S):
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    m = S * 0.022
    d.rounded_rectangle([m, m, S - m, S - m], radius=S * RADIUS, fill=CINNABAR + (255,))
    k = (S * GLYPH_RATIO) / max(gw, gh)
    ox = S / 2 - (xmin + gw / 2) * k
    oy = (S / 2 - S * 0.010) + (ymin + gh / 2) * k
    for c in contours:
        d.polygon([(ox + x * k, oy - y * k) for x, y in c], fill=(255, 255, 255, 255))
    return img


def ink_centroid_y(img):
    a = np.array(img)[..., 3]
    ys, _ = np.nonzero(a > 128)
    return ys.mean() if len(ys) else img.height / 2


MARK_H = 320
mk = mark(1280).resize((MARK_H, MARK_H), Image.LANCZOS)

# Latin 字标
f = ImageFont.truetype(LATIN, 190)
probe = Image.new("RGBA", (2400, 600), (0, 0, 0, 0))
pd = ImageDraw.Draw(probe)
pd.text((0, 0), "MingCharts", font=f, fill=(255, 255, 255, 255))   # ★ 必须显式 fill
tb = pd.textbbox((0, 0), "MingCharts", font=f)
word = probe.crop((tb[0] - 4, tb[1] - 4, tb[2] + 4, tb[3] + 4))
assert int((np.array(word)[..., 3] > 128).sum()) > 0, "★ 字标渲染为空"
wy = ink_centroid_y(word)

GAP, PADX, PADY = 78, 56, 56
W = PADX * 2 + mk.width + GAP + word.width
H = PADY * 2 + max(mk.height, word.height)

for theme, fg, bg in (("light", INK, PAPER), ("dark", (245, 242, 238), (18, 17, 16))):
    canvas = Image.new("RGB", (W, H), bg)
    canvas.paste(mk, (PADX, (H - mk.height) // 2), mk)
    tx = PADX + mk.width + GAP
    ty = int(H / 2 - wy)
    assert tx >= PADX + mk.width, "★ 字标压到方标"
    solid = Image.new("RGBA", word.size, fg + (255,))
    solid.putalpha(word.split()[-1])
    canvas.paste(solid, (tx, ty), solid)
    canvas.save(os.path.join(FINAL, f"mingcharts-lockup-{theme}.png"))
    print(f"  ✓ lockup-{theme}  {W}×{H}")
