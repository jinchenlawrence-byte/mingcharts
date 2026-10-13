# 用思源宋体（Source Han Serif ✗ SIL OFL 1.1 免费商用）重出 Logo
#
# 与颜体版的差异：字体换成开源可商用字体 ✗ 彻底消除授权风险 ✓
# 出三档字重对比：SemiBold / Bold / Heavy
import os
import sys
import zipfile

sys.path.insert(0, r"C:\Users\Administrator\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\python\Lib\site-packages")

import numpy as np
from PIL import Image, ImageDraw, ImageFont

BASE = r"E:\ai-agent\stock1000\bazi-mvp\brand"
FDIR = os.path.join(BASE, "_fonts")
OUT = os.path.join(BASE, "final")
os.makedirs(FDIR, exist_ok=True)
os.makedirs(OUT, exist_ok=True)

# ── ① 从 zip 里取出需要的字重（不整包解压 ✗ 只要 3 个文件）──
ZIP = os.path.join(FDIR, "SourceHanSerifCN.zip")
WANT = {
    "SemiBold": "SubsetOTF/CN/SourceHanSerifCN-SemiBold.otf",
    "Bold": "SubsetOTF/CN/SourceHanSerifCN-Bold.otf",
    "Heavy": "SubsetOTF/CN/SourceHanSerifCN-Heavy.otf",
}
paths = {}
with zipfile.ZipFile(ZIP) as z:
    for name, member in WANT.items():
        dest = os.path.join(FDIR, f"SHS-{name}.otf")
        if not os.path.exists(dest):
            with z.open(member) as src, open(dest, "wb") as dst:
                dst.write(src.read())
        paths[name] = dest
        print(f"  ✓ 取出 {name}  {os.path.getsize(dest)/1024/1024:.1f} MB")

CINNABAR = (166, 43, 31)


def render_glyph(ch, px, fill, fontpath):
    f = ImageFont.truetype(fontpath, px)
    tmp = Image.new("RGBA", (px * 4, px * 4), (0, 0, 0, 0))
    d = ImageDraw.Draw(tmp)
    # ★ RGBA 图必须显式传 fill（否则静默不画）—— 上次踩过的坑
    bbox = d.textbbox((0, 0), ch, font=f)
    d.text((px - bbox[0], px - bbox[1]), ch, font=f, fill=fill)
    g = tmp.crop((px - bbox[0] - 2, px - bbox[1] - 2,
                  px - bbox[0] + (bbox[2] - bbox[0]) + 2,
                  px - bbox[1] + (bbox[3] - bbox[1]) + 2))
    assert int((np.array(g)[..., 3] > 128).sum()) > 0, f"★ 字形渲染为空：{fontpath}"
    return g


def centroid(g):
    a = np.array(g)[..., 3]
    ys, xs = np.nonzero(a > 128)
    return ys.mean(), xs.mean()


def build_mark(weight, S=1024, glyph_ratio=0.57, radius_ratio=0.17, ch="命"):
    SS = S * 4
    base = Image.new("RGBA", (SS, SS), (0, 0, 0, 0))
    d = ImageDraw.Draw(base)
    m = SS * 0.022
    d.rounded_rectangle([m, m, SS - m, SS - m], radius=SS * radius_ratio, fill=CINNABAR)
    g = render_glyph(ch, int(SS * glyph_ratio), (255, 255, 255, 255), paths[weight])
    cy, cx = centroid(g)
    tcx, tcy = SS / 2, SS / 2 - SS * 0.010
    base.alpha_composite(g, (int(tcx - g.width / 2 - (cx - g.width / 2)),
                             int(tcy - g.height / 2 - (cy - g.height / 2))))
    return base.resize((S, S), Image.LANCZOS)


# ── ② 三档字重 + 现用颜体 对比 ──────────────────────────────
print("\n  生成字重对比…")
YAN = r"C:\Windows\Fonts\FZYanZQKSJF.TTF"


def build_yan(S=1024, glyph_ratio=0.57):
    SS = S * 4
    base = Image.new("RGBA", (SS, SS), (0, 0, 0, 0))
    d = ImageDraw.Draw(base)
    m = SS * 0.022
    d.rounded_rectangle([m, m, SS - m, SS - m], radius=SS * 0.17, fill=CINNABAR)
    g = render_glyph("命", int(SS * glyph_ratio), (255, 255, 255, 255), YAN)
    cy, cx = centroid(g)
    base.alpha_composite(g, (int(SS/2 - g.width/2 - (cx - g.width/2)),
                             int(SS/2 - SS*0.010 - g.height/2 - (cy - g.height/2))))
    return base.resize((S, S), Image.LANCZOS)


items = [
    ("现用·方正颜体（★不可商用）", build_yan()),
    ("思源宋 Heavy", build_mark("Heavy")),
    ("思源宋 Bold", build_mark("Bold")),
    ("思源宋 SemiBold", build_mark("SemiBold")),
]

CW, CH = 300, 400
sheet = Image.new("RGB", (CW * len(items) + 60, CH + 40), (244, 242, 239))
sd = ImageDraw.Draw(sheet)
lf = ImageFont.truetype(r"C:\Windows\Fonts\simhei.ttf", 20)
for i, (label, im) in enumerate(items):
    x = 30 + i * CW
    sheet.paste(im.resize((260, 260), Image.LANCZOS), (x, 20), im.resize((260, 260), Image.LANCZOS))
    sd.text((x, 300), label, font=lf, fill=(40, 38, 36))
    for j, small in enumerate((32, 48)):
        s = im.resize((small, small), Image.LANCZOS)
        sheet.paste(s, (x + 140 + j * 62, 296), s)
sheet.save(os.path.join(BASE, "_思源宋-字重对比.png"))
print("    ✓ _思源宋-字重对比.png")

# ── ③ 先出 Heavy 全套（若你觉得过重 ✗ 我换 Bold 重出）──
print("\n  出 Heavy 全套…")
master = build_mark("Heavy", 1024)
for s in (1024, 512, 256, 128, 64, 32):
    im = master if s == 1024 else master.resize((s, s), Image.LANCZOS)
    im.save(os.path.join(OUT, f"mingcharts-logo-{s}.png"))
im = master
for s in (16, 32, 48):
    master.resize((s, s), Image.LANCZOS).save(os.path.join(OUT, f"favicon-{s}.png"))
print("    ✓ 全套尺寸已覆写（★ 字体已换为可商用 ✓）")
print("\n  完成。")
