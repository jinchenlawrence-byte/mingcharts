# Lockup 修正：自动裁到内容边界 + 文字用质心与方标几何中心对齐
#
# 首版两个问题：
#   ① 画布写死 1600×512 → 右侧留白过多
#   ② 文字垂直位置靠 textbbox 定位 → 视觉上略低（Latin 的 bbox 含降部空隙）
# 修正：两者都改成【按内容实测】再定尺寸/位置。
import os
import sys

sys.path.insert(0, r"C:\Users\Administrator\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\python\Lib\site-packages")

import numpy as np
from PIL import Image, ImageDraw, ImageFont

OUT = r"E:\ai-agent\stock1000\bazi-mvp\brand"
FINAL = os.path.join(OUT, "final")
os.makedirs(FINAL, exist_ok=True)

CINNABAR = (166, 43, 31)
INK = (28, 26, 24)
PAPER = (250, 247, 242)
YAN = r"C:\Windows\Fonts\FZYanZQKSJF.TTF"
LATIN = r"C:\Windows\Fonts\segoeuib.ttf"


def render_glyph(ch, px, fill, fontpath=YAN):
    f = ImageFont.truetype(fontpath, px)
    tmp = Image.new("RGBA", (px * 4, px * 4), (0, 0, 0, 0))
    d = ImageDraw.Draw(tmp)
    bbox = d.textbbox((0, 0), ch, font=f)
    d.text((px - bbox[0], px - bbox[1]), ch, font=f, fill=fill)
    return tmp.crop((px - bbox[0] - 2, px - bbox[1] - 2,
                     px - bbox[0] + (bbox[2] - bbox[0]) + 2,
                     px - bbox[1] + (bbox[3] - bbox[1]) + 2))


def centroid_y(img):
    a = np.array(img.split()[-1])
    ys, xs = np.nonzero(a > 128)
    return (ys.mean() if len(ys) else img.height / 2), (xs.mean() if len(xs) else img.width / 2)


def build_mark(S, glyph_ratio=0.57, radius_ratio=0.17, fill=CINNABAR, glyph=(255, 255, 255, 255)):
    SS = S * 4
    base = Image.new("RGBA", (SS, SS), (0, 0, 0, 0))
    d = ImageDraw.Draw(base)
    m = SS * 0.022
    d.rounded_rectangle([m, m, SS - m, SS - m], radius=SS * radius_ratio, fill=fill)
    g = render_glyph("命", int(SS * glyph_ratio), glyph)
    cy, cx = centroid_y(g)
    tcx, tcy = SS / 2, SS / 2 - SS * 0.010
    base.alpha_composite(g, (int(tcx - g.width / 2 - (cx - g.width / 2)),
                             int(tcy - g.height / 2 - (cy - g.height / 2))))
    return base.resize((S, S), Image.LANCZOS)


# ── 横版 lockup：先各画各的 ✗ 量出实际边界 ✗ 再拼 ──
MARK_H = 320
mark = build_mark(640).resize((MARK_H, MARK_H), Image.LANCZOS)

f_latin = ImageFont.truetype(LATIN, 190)
probe = Image.new("RGBA", (2400, 600), (0, 0, 0, 0))
pd = ImageDraw.Draw(probe)
# ★★★ 必须显式传 fill：RGBA 图上 draw.text 不传 fill 会【静默什么都不画】
pd.text((0, 0), "MingCharts", font=f_latin, fill=(255, 255, 255, 255))
tb = pd.textbbox((0, 0), "MingCharts", font=f_latin)
word = probe.crop((tb[0] - 4, tb[1] - 4, tb[2] + 4, tb[3] + 4))
# ★★ 牙口：文字渲染为空就直接报错（防止再出现"静默不画"）
_ink = int((np.array(word)[..., 3] > 128).sum())
assert _ink > 0, "★ 文字渲染为空 —— draw.text 的 fill 没生效"
print(f"  （自检：MingCharts 墨迹像素 {_ink}）")
wy, wx = centroid_y(word)

GAP = 78                     # 方标与文字间距
PADX, PADY = 56, 56          # 画布内边距

W = PADX * 2 + mark.width + GAP + word.width
H = PADY * 2 + max(mark.height, word.height)

for theme, fg, bg in (("light", INK, PAPER), ("dark", (245, 242, 238), (18, 17, 16))):
    canvas = Image.new("RGB", (W, H), bg)
    # 方标：垂直居中
    my = (H - mark.height) // 2
    canvas.paste(mark, (PADX, my), mark)
    # ★ 文字：左边缘贴齐（不减质心偏移 ✗ paste 原点就是左上角）
    #   垂直：让【墨迹质心】落在画布中线，与方标的几何中心同高
    tx_pos = PADX + mark.width + GAP
    ty_pos = int(H / 2 - wy)
    # ★★ 牙口：文字不得压到方标上
    assert tx_pos >= PADX + mark.width, "★ 文字左边缘压到方标了"
    solid = Image.new("RGBA", word.size, fg + (255,))
    solid.putalpha(word.split()[-1])
    canvas.paste(solid, (tx_pos, ty_pos), solid)
    canvas.save(os.path.join(FINAL, f"mingcharts-lockup-{theme}.png"))
    print(f"  ✓ lockup-{theme}  {W}×{H}")

# ── 透明底版本（可叠到任意背景 ✗ 给网站/邮件用）──
for name, fill, glyph in (
    ("mark-transparent-cinnabar", CINNABAR, (255, 255, 255, 255)),
    ("mark-transparent-white", (255, 255, 255, 255), CINNABAR),
):
    im = build_mark(1024, fill=fill, glyph=glyph)
    im.save(os.path.join(FINAL, f"mingcharts-{name}-1024.png"))
    print(f"  ✓ {name}-1024")

# ── favicon 用的 32/48 ──
master = build_mark(512)
for s in (16, 32, 48):
    master.resize((s, s), Image.LANCZOS).save(os.path.join(FINAL, f"favicon-{s}.png"))
master.resize((256, 256), Image.LANCZOS).save(
    os.path.join(FINAL, "favicon.ico"), sizes=[(16, 16), (32, 32), (48, 48)])
print("  ✓ favicon 16/32/48 + favicon.ico")

print("\n  完成。")
