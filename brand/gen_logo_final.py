# Logo 精修（方案 E：朱砂圆角印 · 颜体）
#
# 与首轮的区别：
#   ① 汉字用【墨迹质心】对齐，而非外接框 —— 「命」上轻下重，框居中仍会偏低
#   ② 字号三档微调（56/58/60%）供对比选档
#   ③ 全套尺寸 1024/512/256/128/64/32
#   ④ 横版 lockup（方标 + MingCharts）+ 深/浅两版
#   ⑤ 附「明」字版本作对比
#
# 说明：汉字质心对齐要用到 numpy 读像素 —— 这是【设计稿的几何计算】，
#       不是数据统计；不涉及任何业务数据。
import os
import sys

sys.path.insert(0, r"C:\Users\Administrator\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\python\Lib\site-packages")

import numpy as np
from PIL import Image, ImageDraw, ImageFont

OUT = r"E:\ai-agent\stock1000\bazi-mvp\brand"
os.makedirs(os.path.join(OUT, "final"), exist_ok=True)

CINNABAR = (166, 43, 31)
INK = (28, 26, 24)
PAPER = (250, 247, 242)

YAN = r"C:\Windows\Fonts\FZYanZQKSJF.TTF"
HEI = r"C:\Windows\Fonts\simhei.ttf"
LATIN = r"C:\Windows\Fonts\segoeuib.ttf"   # Latin 无衬线粗体（MingCharts 用）


def render_glyph(ch, px, fill):
    """把单字渲染到独立画布，返回 RGBA 图。"""
    f = ImageFont.truetype(YAN, px)
    tmp = Image.new("RGBA", (px * 3, px * 3), (0, 0, 0, 0))
    d = ImageDraw.Draw(tmp)
    bbox = d.textbbox((0, 0), ch, font=f)
    d.text((px - bbox[0], px - bbox[1]), ch, font=f, fill=fill)
    return tmp.crop((px - bbox[0] - 2, px - bbox[1] - 2,
                     px - bbox[0] + (bbox[2] - bbox[0]) + 2,
                     px - bbox[1] + (bbox[3] - bbox[1]) + 2))


def centroid(img):
    """墨迹（不透明像素）的质心相对几何中心的偏移。"""
    a = np.array(img.split()[-1])          # alpha 通道
    ys, xs = np.nonzero(a > 128)
    if len(xs) == 0:
        return 0.0, 0.0
    h, w = a.shape
    return xs.mean() - w / 2, ys.mean() - h / 2


def build(ch="命", S=1024, glyph_ratio=0.58, radius_ratio=0.17,
          draft_color=CINNABAR, glyph_color=(255, 255, 255, 255),
          bg_color=None, super_=4):
    """★ 关键：先把字渲染好 ✗ 算质心 ✗ 再用【补偿量】贴到印面正中。"""
    SS = S * super_
    base = Image.new("RGBA", (SS, SS), (0, 0, 0, 0))
    d = ImageDraw.Draw(base)

    m = SS * 0.022
    if bg_color is None:
        d.rounded_rectangle([m, m, SS - m, SS - m], radius=SS * radius_ratio, fill=draft_color)
    else:
        d.rounded_rectangle([m, m, SS - m, SS - m], radius=SS * radius_ratio, fill=bg_color)
        d.rounded_rectangle([m, m, SS - m, SS - m], radius=SS * radius_ratio,
                            outline=INK, width=int(SS * 0.021))

    # 字：先渲染 ✗ 再按质心补偿
    gpx = int(SS * glyph_ratio)
    g = render_glyph(ch, gpx, glyph_color)
    off_x, off_y = centroid(g)
    target_cx = SS / 2
    target_cy = SS / 2
    # 汉字视觉重心习惯略高于几何中心（印章传统），上浮 1%
    target_cy -= SS * 0.010
    px = int(target_cx - g.width / 2 - off_x)
    py = int(target_cy - g.height / 2 - off_y)
    base.alpha_composite(g, (px, py))

    return base.resize((S, S), Image.LANCZOS)


# ── ① 字号三档对比（看哪档最透气又不显弱）────────────────────
print("  字号三档对比…")
tiles = []
for ratio in (0.55, 0.58, 0.61):
    tiles.append((f"字身 {int(ratio*100)}%", build(glyph_ratio=ratio)))

sheet = Image.new("RGB", (3 * 380 + 80, 380 + 110), (244, 242, 239))
sd = ImageDraw.Draw(sheet)
lf = ImageFont.truetype(HEI, 24)
for i, (label, im) in enumerate(tiles):
    x = 40 + i * 380
    sheet.paste(im.resize((340, 340), Image.LANCZOS), (x, 30),
                im.resize((340, 340), Image.LANCZOS))
    sd.text((x, 380 + 24), label, font=lf, fill=(40, 38, 36))
    # 小尺寸验证
    for j, small in enumerate((32, 48)):
        s = im.resize((small, small), Image.LANCZOS)
        sheet.paste(s, (x + 150 + j * 62, 380 + 18), s)
sheet.save(os.path.join(OUT, "_精修-字号对比.png"))
print("    ✓ _精修-字号对比.png")

# ── ② 定稿：字身 58% ────────────────────────────────────────
FINAL_RATIO = 0.58
print(f"  定稿字身 {int(FINAL_RATIO*100)}%…")

sizes = [1024, 512, 256, 128, 64, 32]
master = build("命", 1024, FINAL_RATIO)
for s in sizes:
    im = master if s == 1024 else master.resize((s, s), Image.LANCZOS)
    im.save(os.path.join(OUT, "final", f"mingcharts-logo-{s}.png"))
print(f"    ✓ 全套尺寸 {sizes}")

# ── ③ 横版 lockup（方标 + MingCharts）✗ 深/浅两版 ──────────
print("  横版 lockup…")
for theme, fg, bg in (("light", INK, PAPER), ("dark", (245, 242, 238), (18, 17, 16))):
    H = 512
    mark = master.resize((int(H * 0.78), int(H * 0.78)), Image.LANCZOS)
    lf2 = ImageFont.truetype(LATIN, int(H * 0.30))
    canvas = Image.new("RGB", (1600, H), bg)
    cd = ImageDraw.Draw(canvas)
    mx, my = int(H * 0.12), (H - mark.height) // 2
    canvas.paste(mark, (mx, my), mark)
    tx = mx + mark.width + int(H * 0.14)
    tb = cd.textbbox((0, 0), "MingCharts", font=lf2)
    ty = (H - (tb[3] - tb[1])) // 2 - tb[1]
    cd.text((tx, ty), "MingCharts", font=lf2, fill=fg)
    canvas.save(os.path.join(OUT, "final", f"mingcharts-lockup-{theme}.png"))
print("    ✓ mingcharts-lockup-light/dark.png")

# ── ④ 「明」字对比版 ───────────────────────────────────────
print("  附「明」字对比…")
alt = build("明", 1024, FINAL_RATIO)
alt.save(os.path.join(OUT, "final", "mingcharts-logo-ming-1024.png"))
cmp_w, cmp_h = 340, 430
cs = Image.new("RGB", (cmp_w * 2 + 120, cmp_h + 40), (244, 242, 239))
cd2 = ImageDraw.Draw(cs)
for i, (label, im) in enumerate((("「命」", master), ("「明」", alt))):
    x = 40 + i * (cmp_w + 40)
    cs.paste(im.resize((cmp_w, cmp_w), Image.LANCZOS), (x, 20),
             im.resize((cmp_w, cmp_w), Image.LANCZOS))
    cd2.text((x, 20 + cmp_w + 18), label, font=lf, fill=(40, 38, 36))
cs.save(os.path.join(OUT, "_精修-命vs明.png"))
print("    ✓ _精修-命vs明.png")

print("\n  完成。")
