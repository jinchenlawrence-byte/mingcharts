# 说明：这是设计稿生成脚本，用 Python + Pillow 画矢量感的印章式 Logo。
# 输出：6 个方案 × 512/1024 PNG + 一张对比预览图（含小尺寸清晰度验证）。
import sys, os

sys.path.insert(0, r"C:\Users\Administrator\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\python\Lib\site-packages")

from PIL import Image, ImageDraw, ImageFont

OUT = r"E:\ai-agent\stock1000\bazi-mvp\brand"
os.makedirs(OUT, exist_ok=True)

# ── 品牌色（取自站点 tailwind 配置 ✗ 与 Nav 的朱砂「命」字一致）──
CINNABAR = (166, 43, 31)      # 朱砂红  #A62B1F
CINNABAR_D = (140, 32, 24)    # 深朱砂（描边用）
INK = (28, 26, 24)            # 墨
PAPER = (250, 247, 242)       # 宣纸米白
GOLD = (196, 160, 92)         # 金

FONTS = {
    "kaiti":  r"C:\Windows\Fonts\simkai.ttf",
    "song":   r"C:\Windows\Fonts\simsun.ttc",
    "hei":    r"C:\Windows\Fonts\simhei.ttf",
    "fangsong": r"C:\Windows\Fonts\simfang.ttf",
    "yan":    r"C:\Windows\Fonts\FZYanZQKSJF.TTF",
    "ming":   r"C:\Windows\Fonts\mingliub.ttc",
}

def font(key, size):
    return ImageFont.truetype(FONTS[key], size)


def draw_glyph_centered(draw, canvas_size, ch, fnt, fill, cx=None, cy=None, scale=1.0):
    """把单字以【字形实际边界】光学居中（汉字的字形边界 ≠ 字号边界）。"""
    cx = canvas_size / 2 if cx is None else cx
    cy = canvas_size / 2 if cy is None else cy
    bbox = draw.textbbox((0, 0), ch, font=fnt)
    w, h = bbox[2] - bbox[0], bbox[3] - bbox[1]
    x = cx - (bbox[0] + bbox[2]) / 2
    y = cy - (bbox[1] + bbox[3]) / 2
    # 视觉微调：汉字字身重心略高于几何中心，下移一点点更稳
    y += h * 0.015
    draw.text((x, y), ch, font=fnt, fill=fill)


def make(kind, ch="命", size=1024, bg=None):
    S = size
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    SS = S * 4  # 先在 4 倍画布画再缩小 → 抗锯齿更干净

    big = Image.new("RGBA", (SS, SS), (0, 0, 0, 0))
    bd = ImageDraw.Draw(big)
    m = SS * 0.02                       # 外留白

    if kind == "A":  # 朱砂圆角印 · 白字
        bd.rounded_rectangle([m, m, SS - m, SS - m], radius=SS * 0.16, fill=CINNABAR)
        bd.rounded_rectangle([SS*0.075, SS*0.075, SS-SS*0.075, SS-SS*0.075],
                             radius=SS*0.115, outline=(255,255,255,110), width=int(SS*0.008))
        draw_glyph_centered(bd, SS, ch, font("kaiti", int(SS * 0.60)), (255, 255, 255, 255))

    elif kind == "B":  # 朱砂方印（尖角，更传统）
        bd.rectangle([m, m, SS - m, SS - m], fill=CINNABAR)
        bd.rectangle([SS*0.07, SS*0.07, SS-SS*0.07, SS-SS*0.07],
                     outline=(255,255,255,110), width=int(SS*0.008))
        draw_glyph_centered(bd, SS, ch, font("song", int(SS * 0.62)), (255, 255, 255, 255))

    elif kind == "C":  # 宣纸底 · 朱砂字 · 墨边（轻量现代）
        bd.rounded_rectangle([m, m, SS - m, SS - m], radius=SS * 0.18, fill=PAPER)
        bd.rounded_rectangle([m, m, SS - m, SS - m], radius=SS * 0.18,
                             outline=INK, width=int(SS * 0.022))
        draw_glyph_centered(bd, SS, ch, font("kaiti", int(SS * 0.58)), CINNABAR)

    elif kind == "D":  # 金边朱砂印（更贵气）
        bd.rounded_rectangle([m, m, SS - m, SS - m], radius=SS * 0.14, fill=CINNABAR)
        bd.rounded_rectangle([SS*0.055, SS*0.055, SS-SS*0.055, SS-SS*0.055],
                             outline=GOLD, width=int(SS*0.014))
        draw_glyph_centered(bd, SS, ch, font("yan", int(SS * 0.60)), (255, 255, 255, 255))

    elif kind == "E":  # 颜体 · 圆角印（试颜真卿楷书）
        bd.rounded_rectangle([m, m, SS - m, SS - m], radius=SS * 0.16, fill=CINNABAR)
        draw_glyph_centered(bd, SS, ch, font("yan", int(SS * 0.62)), (255, 255, 255, 255))

    elif kind == "F":  # 仿宋 · 圆角印（书卷气）
        bd.rounded_rectangle([m, m, SS - m, SS - m], radius=SS * 0.16, fill=CINNABAR)
        draw_glyph_centered(bd, SS, ch, font("fangsong", int(SS * 0.62)), (255, 255, 255, 255))

    img = big.resize((S, S), Image.LANCZOS)
    return img


VARIANTS = {
    "A-朱砂圆角印-楷体": ("A", "命"),
    "B-朱砂方印-宋体":   ("B", "命"),
    "C-宣纸底-朱砂字":   ("C", "命"),
    "D-金边朱砂印-颜体": ("D", "命"),
    "E-朱砂圆角印-颜体": ("E", "命"),
    "F-朱砂圆角印-仿宋": ("F", "命"),
}

made = {}
for name, (kind, ch) in VARIANTS.items():
    im = make(kind, ch, 1024)
    im.save(os.path.join(OUT, f"{name}.png"))
    im.resize((512, 512), Image.LANCZOS).save(os.path.join(OUT, f"{name}-512.png"))
    made[name] = im
    print(f"  ✓ {name}")

# ── 对比预览：大图一排 + 小尺寸（32/48/64）验证清晰度 ──
PAD, BIG = 48, 320
cols = 3
rows = (len(made) + cols - 1) // cols
W = PAD + cols * (BIG + PAD)
H = PAD + rows * (BIG + 150 + PAD)
sheet = Image.new("RGB", (W, H), (245, 243, 240))
sd = ImageDraw.Draw(sheet)
label_f = ImageFont.truetype(FONTS["hei"], 22)

for i, (name, im) in enumerate(made.items()):
    r, c = divmod(i, cols)
    x = PAD + c * (BIG + PAD)
    y = PAD + r * (BIG + 150 + PAD)
    sheet.paste(im.resize((BIG, BIG), Image.LANCZOS), (x, y), im.resize((BIG, BIG), Image.LANCZOS))
    sd.text((x, y + BIG + 10), name, font=label_f, fill=(40, 38, 36))
    # 小尺寸预览：把 64px 的结果放大 2 倍贴出来（看清小图是否可辨）
    for j, small in enumerate((32, 48, 64)):
        s = im.resize((small, small), Image.LANCZOS)
        sheet.paste(s, (x + j * 84, y + BIG + 44), s)

sheet.save(os.path.join(OUT, "_预览-全方案.png"))
print(f"\n  预览图：{os.path.join(OUT, '_预览-全方案.png')}")
