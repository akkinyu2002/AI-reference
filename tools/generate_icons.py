from pathlib import Path
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent.parent / 'assets' / 'icons'
OUT.mkdir(parents=True, exist_ok=True)

SIZE = 32
ACCENT = (179, 107, 43, 255)
DARK = (30, 27, 24, 255)
TRANSPARENT = (0, 0, 0, 0)


def canvas():
    return Image.new('RGBA', (SIZE, SIZE), TRANSPARENT)


def save(img, name):
    img.save(OUT / name)


def draw_plus(img, color=ACCENT):
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((1, 1, SIZE-2, SIZE-2), radius=8, fill=(255,255,255,0), outline=(0,0,0,0))
    c = SIZE // 2
    d.line((c, 8, c, 24), fill=color, width=3)
    d.line((8, c, 24, c), fill=color, width=3)


def draw_export(img, color=DARK):
    d = ImageDraw.Draw(img)
    d.line((16, 7, 16, 20), fill=color, width=3)
    d.polygon([(11, 13), (16, 7), (21, 13)], fill=color)
    d.line((9, 24, 23, 24), fill=color, width=3)


def draw_settings(img, color=DARK):
    d = ImageDraw.Draw(img)
    cx, cy = 16, 16
    d.ellipse((11, 11, 21, 21), outline=color, width=3)
    for dx, dy in [(0, -10), (0, 10), (-10, 0), (10, 0), (-7, -7), (7, -7), (-7, 7), (7, 7)]:
        d.line((cx, cy, cx + dx, cy + dy), fill=color, width=2)


def draw_grid(img, color=DARK):
    d = ImageDraw.Draw(img)
    for x in [7, 17]:
        for y in [7, 17]:
            d.rounded_rectangle((x, y, x+6, y+6), radius=1, fill=color)


def draw_clock(img, color=DARK):
    d = ImageDraw.Draw(img)
    d.ellipse((7, 7, 25, 25), outline=color, width=3)
    d.line((16, 12, 16, 17), fill=color, width=3)
    d.line((16, 16, 21, 19), fill=color, width=3)


def draw_bell(img, color=DARK):
    d = ImageDraw.Draw(img)
    d.arc((8, 8, 24, 22), start=200, end=340, fill=color, width=3)
    d.line((10, 20, 22, 20), fill=color, width=3)
    d.line((12, 20, 12, 23), fill=color, width=3)
    d.line((20, 20, 20, 23), fill=color, width=3)
    d.ellipse((14, 22, 18, 26), fill=color)


def draw_close(img, color=DARK):
    d = ImageDraw.Draw(img)
    d.line((9, 9, 23, 23), fill=color, width=3)
    d.line((23, 9, 9, 23), fill=color, width=3)


icons = {
    'add.png': draw_plus,
    'export.png': draw_export,
    'settings.png': draw_settings,
    'dashboard.png': draw_grid,
    'activity.png': draw_clock,
    'bell.png': draw_bell,
    'close.png': draw_close,
}

for filename, drawer in icons.items():
    img = canvas()
    drawer(img)
    save(img, filename)

print(f'Wrote {len(icons)} PNG icons to {OUT}')
